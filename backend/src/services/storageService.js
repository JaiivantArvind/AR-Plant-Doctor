const fs = require('fs');
const path = require('path');
const config = require('../config');

class StorageService {
    constructor() {
        this.filePath = config.DATA_FILE;
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Reads and parses plants.json.
     * Returns an empty object if the file doesn't exist or is empty.
     */
    getPlants() {
        try {
            if (!fs.existsSync(this.filePath)) {
                return {};
            }
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('StorageService: Error reading plants data:', err);
            throw new Error('Failed to read plants data');
        }
    }

    /**
     * Atomically writes updated plants object to plants.json.
     * Writes to a temporary file first, then renames to prevent corruption.
     * @param {Object} plantsData
     */
    savePlants(plantsData) {
        if (!plantsData || typeof plantsData !== 'object' || Array.isArray(plantsData) || Object.keys(plantsData).length === 0) {
            throw new Error('Invalid plants data payload: must be a non-empty JSON object');
        }

        for (const [key, plant] of Object.entries(plantsData)) {
            if (!plant || typeof plant !== 'object' || Array.isArray(plant) || typeof plant.name !== 'string' || !plant.name.trim()) {
                throw new Error(`Invalid plant record at key "${key}": missing or invalid name`);
            }
        }

        this.ensureDataDirectory();
        const tmpPath = `${this.filePath}.tmp`;
        const content = JSON.stringify(plantsData, null, 2);

        try {
            fs.writeFileSync(tmpPath, content, 'utf8');
            fs.renameSync(tmpPath, this.filePath);
            return true;
        } catch (err) {
            console.error('StorageService: Error saving plants data:', err);
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
            }
            throw new Error('Failed to save plants data');
        }
    }

    /**
     * Deletes a plant by ID.
     * @param {string|number} plantId
     */
    deletePlant(plantId) {
        const plants = this.getPlants();
        const key = String(plantId);
        if (!plants[key]) {
            return false;
        }
        delete plants[key];
        this.savePlants(plants);
        return true;
    }
}

module.exports = new StorageService();
