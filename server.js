const express = require('express');
const fs = require('fs');
const path = require('path');

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

// 5. POST /api/save-marker - Save generated marker image to /markers/ folder
app.post('/api/save-marker', (req, res) => {
    try {
        const { filename, dataUrl } = req.body;
        if (!filename || !dataUrl) {
            return res.status(400).json({ error: 'Missing filename or dataUrl' });
        }
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const markersDir = path.join(__dirname, 'markers');
        if (!fs.existsSync(markersDir)) {
            fs.mkdirSync(markersDir, { recursive: true });
        }
        const filePath = path.join(markersDir, filename);
        fs.writeFileSync(filePath, buffer);
        res.status(200).json({ success: true, message: `Marker saved to markers/${filename}` });
    } catch (err) {
        console.error('Error saving marker:', err);
        res.status(500).json({ error: 'Failed to save marker image' });
    }
});

// 6. Listen on port 3000
app.listen(PORT, () => {
    console.log(`AR Plant Doctor server running at http://localhost:${PORT}`);
});
