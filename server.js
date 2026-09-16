const express = require('express');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// 1. Serve project root static files
app.use(express.static(path.join(__dirname, '.')));

// 2. Serve dashboard/ folder at /dashboard/
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Serve markers/ folder at /markers/
app.use('/markers', express.static(path.join(__dirname, 'markers')));

// Serve assets/ folder at /assets/
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Path to plants.json file
const PLANTS_FILE = path.join(__dirname, 'plants.json');

// 3. GET /api/plants - Read and return plants.json data
app.get('/api/plants', (req, res) => {
    try {
        const data = fs.readFileSync(PLANTS_FILE, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    } catch (err) {
        console.error('Error reading plants.json:', err);
        res.status(500).json({ error: 'Failed to read plants data' });
    }
});

// 4. POST /api/plants - Receive JSON body and save back to plants.json
app.post('/api/plants', (req, res) => {
    try {
        const updatedPlants = req.body;
        fs.writeFileSync(PLANTS_FILE, JSON.stringify(updatedPlants, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'Plants data updated successfully' });
    } catch (err) {
        console.error('Error writing to plants.json:', err);
        res.status(500).json({ error: 'Failed to save plants data' });
    }
});

/**
 * Generates both PNG and official 195-line BGR .patt marker files for a given plantId.
 * @param {string|number} plantId
 * @returns {Object} Result object with paths
 */
function generateMarkerFiles(plantId) {
    const SIZE = 512;
    const BORDER = 64; // 64px border on 512x512 gives exact 0.75 patternRatio
    const INNER = SIZE - (BORDER * 2); // 384px inner area

    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    // Black outer border
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // White inner area
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(BORDER, BORDER, INNER, INNER);

    // Draw unique pattern based on plantId
    const id = parseInt(plantId, 10);
    const cx = SIZE / 2; // center x = 256
    const cy = SIZE / 2; // center y = 256

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 18;

    // Always draw the plant number large and centered
    ctx.font = 'bold 160px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(id), cx, cy);

    // Draw a unique accent shape based on (id % 8):
    const accent = id % 8;
    if (accent === 0) {
        // top-left filled square
        ctx.fillRect(BORDER + 10, BORDER + 10, 70, 70);
    } else if (accent === 1) {
        // top-right filled square  
        ctx.fillRect(SIZE - BORDER - 80, BORDER + 10, 70, 70);
    } else if (accent === 2) {
        // bottom-left filled square
        ctx.fillRect(BORDER + 10, SIZE - BORDER - 80, 70, 70);
    } else if (accent === 3) {
        // bottom-right filled square
        ctx.fillRect(SIZE - BORDER - 80, SIZE - BORDER - 80, 70, 70);
    } else if (accent === 4) {
        // top-left AND bottom-right squares
        ctx.fillRect(BORDER + 10, BORDER + 10, 70, 70);
        ctx.fillRect(SIZE - BORDER - 80, SIZE - BORDER - 80, 70, 70);
    } else if (accent === 5) {
        // top-right AND bottom-left squares
        ctx.fillRect(SIZE - BORDER - 80, BORDER + 10, 70, 70);
        ctx.fillRect(BORDER + 10, SIZE - BORDER - 80, 70, 70);
    } else if (accent === 6) {
        // all four corner squares
        ctx.fillRect(BORDER + 10, BORDER + 10, 60, 60);
        ctx.fillRect(SIZE - BORDER - 70, BORDER + 10, 60, 60);
        ctx.fillRect(BORDER + 10, SIZE - BORDER - 70, 60, 60);
        ctx.fillRect(SIZE - BORDER - 70, SIZE - BORDER - 70, 60, 60);
    } else {
        // horizontal bar through middle
        ctx.fillRect(BORDER + 10, cy - 20, INNER - 20, 40);
    }

    // Step B: Save the PNG
    const pngBuffer = canvas.toBuffer('image/png');
    const iconsDir = path.join(__dirname, 'assets', 'icons');
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
    fs.writeFileSync(path.join(iconsDir, `marker-${plantId}.png`), pngBuffer);

    // Step C: Generate official 195-line BGR .patt file
    // Extract inner area for pattern training
    const innerCanvas = createCanvas(INNER, INNER);
    const innerCtx = innerCanvas.getContext('2d');
    innerCtx.drawImage(canvas, BORDER, BORDER, INNER, INNER, 0, 0, INNER, INNER);

    // Official ARToolKit 4-orientation BGR 16x16 pattern encoder
    const sampleCanvas = createCanvas(16, 16);
    const sampleCtx = sampleCanvas.getContext('2d');
    let patternFileString = '';

    for (let orientation = 0; orientation > -2 * Math.PI; orientation -= Math.PI / 2) {
        sampleCtx.save();
        sampleCtx.clearRect(0, 0, 16, 16);
        sampleCtx.translate(8, 8);
        sampleCtx.rotate(orientation);
        sampleCtx.drawImage(innerCanvas, -8, -8, 16, 16);
        sampleCtx.restore();

        const imageData = sampleCtx.getImageData(0, 0, 16, 16);

        if (orientation !== 0) patternFileString += '\n';

        // BGR channel order (Blue = 2, Green = 1, Red = 0)
        for (let channelOffset = 2; channelOffset >= 0; channelOffset--) {
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    if (x !== 0) patternFileString += ' ';
                    const offset = (y * 16 * 4) + (x * 4) + channelOffset;
                    const value = imageData.data[offset];
                    patternFileString += String(value).padStart(3);
                }
                patternFileString += '\n';
            }
        }
    }

    const markersDir = path.join(__dirname, 'markers');
    if (!fs.existsSync(markersDir)) fs.mkdirSync(markersDir, { recursive: true });
    fs.writeFileSync(path.join(markersDir, `marker-${plantId}.patt`), patternFileString, 'utf8');

    return {
        success: true,
        imagePath: `/assets/icons/marker-${plantId}.png`,
        pattPath: `/markers/marker-${plantId}.patt`
    };
}

// 5. POST /api/generate-marker endpoint
app.post('/api/generate-marker', (req, res) => {
    try {
        const { plantId, plantName } = req.body;
        if (!plantId) {
            return res.status(400).json({ error: 'Missing plantId' });
        }
        const result = generateMarkerFiles(plantId);
        res.json(result);
    } catch (err) {
        console.error('Error generating marker:', err);
        res.status(500).json({ error: 'Failed to generate marker' });
    }
});

/**
 * Startup routine: generates missing markers for all plants in plants.json
 */
function generateMissingMarkers() {
    try {
        if (!fs.existsSync(PLANTS_FILE)) return;
        const plantsData = JSON.parse(fs.readFileSync(PLANTS_FILE, 'utf8'));
        Object.keys(plantsData).forEach(plantId => {
            const pattPath = path.join(__dirname, 'markers', `marker-${plantId}.patt`);
            if (!fs.existsSync(pattPath)) {
                console.log(`Auto-generating marker for plant ${plantId}...`);
                generateMarkerFiles(plantId);
            }
        });
    } catch (err) {
        console.error('Error in generateMissingMarkers:', err);
    }
}

// Listen on port 3000
app.listen(PORT, () => {
    generateMissingMarkers();
    console.log(`AR Plant Doctor server running at http://localhost:${PORT}`);
});
