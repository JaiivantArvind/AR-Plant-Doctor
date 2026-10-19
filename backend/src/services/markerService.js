const fs = require('fs');
const path = require('path');
const config = require('../config');

let createCanvas;
try {
    createCanvas = require('canvas').createCanvas;
} catch (err) {
    // Canvas native binding not available in some serverless runtimes
}

class MarkerService {
    constructor() {
        this.size = config.MARKER_SIZE; // 512
        this.border = config.MARKER_BORDER; // 64
        this.inner = config.INNER_SIZE; // 384
        this.iconsDir = config.ICONS_DIR;
        this.markersDir = config.MARKERS_DIR;

        this.ensureDirectories();
    }

    ensureDirectories() {
        try {
            if (!fs.existsSync(this.iconsDir)) {
                fs.mkdirSync(this.iconsDir, { recursive: true });
            }
            if (!fs.existsSync(this.markersDir)) {
                fs.mkdirSync(this.markersDir, { recursive: true });
            }
        } catch (_) {}
    }

    /**
     * Generates both PNG and official 195-line BGR .patt marker files for a given plantId.
     * @param {string|number} plantId
     * @returns {Object} Paths and status
     */
    generateMarkerFiles(plantId) {
        if (!createCanvas) {
            throw new Error('Canvas marker synthesis is not available in this environment');
        }

        this.ensureDirectories();

        const canvas = createCanvas(this.size, this.size);
        const ctx = canvas.getContext('2d');

        // Black outer border
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.size, this.size);

        // White inner area
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.border, this.border, this.inner, this.inner);

        // Draw unique pattern based on plantId
        const id = parseInt(plantId, 10);
        const cx = this.size / 2;
        const cy = this.size / 2;

        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 18;

        // Always draw the plant number large and centered
        ctx.font = 'bold 160px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(id), cx, cy);

        // Draw a unique accent shape based on (id % 8)
        const accent = Math.abs(id % 8);
        if (accent === 0) {
            ctx.fillRect(this.border + 10, this.border + 10, 70, 70);
        } else if (accent === 1) {
            ctx.fillRect(this.size - this.border - 80, this.border + 10, 70, 70);
        } else if (accent === 2) {
            ctx.fillRect(this.border + 10, this.size - this.border - 80, 70, 70);
        } else if (accent === 3) {
            ctx.fillRect(this.size - this.border - 80, this.size - this.border - 80, 70, 70);
        } else if (accent === 4) {
            ctx.fillRect(this.border + 10, this.border + 10, 70, 70);
            ctx.fillRect(this.size - this.border - 80, this.size - this.border - 80, 70, 70);
        } else if (accent === 5) {
            ctx.fillRect(this.size - this.border - 80, this.border + 10, 70, 70);
            ctx.fillRect(this.border + 10, this.size - this.border - 80, 70, 70);
        } else if (accent === 6) {
            ctx.fillRect(this.border + 10, this.border + 10, 60, 60);
            ctx.fillRect(this.size - this.border - 70, this.border + 10, 60, 60);
            ctx.fillRect(this.border + 10, this.size - this.border - 70, 60, 60);
            ctx.fillRect(this.size - this.border - 70, this.size - this.border - 70, 60, 60);
        } else {
            ctx.fillRect(this.border + 10, cy - 20, this.inner - 20, 40);
        }

        // Save the PNG
        const pngBuffer = canvas.toBuffer('image/png');
        const pngPath = path.join(this.iconsDir, `marker-${plantId}.png`);
        fs.writeFileSync(pngPath, pngBuffer);

        // Generate official 195-line BGR .patt file
        const innerCanvas = createCanvas(this.inner, this.inner);
        const innerCtx = innerCanvas.getContext('2d');
        innerCtx.drawImage(canvas, this.border, this.border, this.inner, this.inner, 0, 0, this.inner, this.inner);

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

        const pattPath = path.join(this.markersDir, `marker-${plantId}.patt`);
        fs.writeFileSync(pattPath, patternFileString, 'utf8');

        return {
            success: true,
            imagePath: `/assets/icons/marker-${plantId}.png`,
            pattPath: `/markers/marker-${plantId}.patt`
        };
    }

    /**
     * Cleans up both PNG and .patt files for a deleted plantId.
     * @param {string|number} plantId
     */
    removeMarkerFiles(plantId) {
        const pngPath = path.join(this.iconsDir, `marker-${plantId}.png`);
        const pattPath = path.join(this.markersDir, `marker-${plantId}.patt`);

        if (fs.existsSync(pngPath)) {
            try { fs.unlinkSync(pngPath); } catch (_) {}
        }
        if (fs.existsSync(pattPath)) {
            try { fs.unlinkSync(pattPath); } catch (_) {}
        }
    }

    /**
     * Checks all plants in plantsData and generates missing marker files.
     * @param {Object} plantsData
     */
    reconcileMissingMarkers(plantsData) {
        if (!plantsData || typeof plantsData !== 'object') return;

        Object.keys(plantsData).forEach(plantId => {
            const pattPath = path.join(this.markersDir, `marker-${plantId}.patt`);
            const pngPath = path.join(this.iconsDir, `marker-${plantId}.png`);

            if (!fs.existsSync(pattPath) || !fs.existsSync(pngPath)) {
                console.log(`Auto-generating marker for plant ${plantId}...`);
                this.generateMarkerFiles(plantId);
            }
        });
    }
}

module.exports = new MarkerService();
