const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');

// Automatically load local .env if present (supported natively in Node.js 20.6+)
const envPath = path.resolve(ROOT_DIR, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile(envPath);
    } catch (err) {
        console.warn('Config: Notice loading .env file:', err.message);
    }
}

const FRONTEND_DIR = process.env.FRONTEND_DIR
    ? path.resolve(__dirname, process.env.FRONTEND_DIR)
    : path.resolve(ROOT_DIR, 'Frontend');

const DATA_FILE = process.env.DATA_FILE_PATH
    ? path.resolve(__dirname, process.env.DATA_FILE_PATH)
    : path.resolve(ROOT_DIR, 'backend', 'data', 'plants.json');

const DATA_DIR = path.dirname(DATA_FILE);

const MARKERS_DIR = process.env.MARKERS_DIR
    ? path.resolve(__dirname, process.env.MARKERS_DIR)
    : path.resolve(FRONTEND_DIR, 'markers');

const ICONS_DIR = process.env.ICONS_DIR
    ? path.resolve(__dirname, process.env.ICONS_DIR)
    : path.resolve(FRONTEND_DIR, 'assets', 'icons');

module.exports = {
    PORT: process.env.PORT || 3000,
    ROOT_DIR,
    FRONTEND_DIR,
    DATA_DIR,
    DATA_FILE,
    MARKERS_DIR,
    ICONS_DIR,
    MARKER_SIZE: parseInt(process.env.MARKER_SIZE, 10) || 512,
    MARKER_BORDER: parseInt(process.env.MARKER_BORDER, 10) || 64,
    INNER_SIZE: (parseInt(process.env.MARKER_SIZE, 10) || 512) - ((parseInt(process.env.MARKER_BORDER, 10) || 64) * 2), // 384px inner area
    PATTERN_RATIO: parseFloat(process.env.PATTERN_RATIO) || 0.75
};
