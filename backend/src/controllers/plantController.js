const storageService = require('../services/storageService');
const markerService = require('../services/markerService');

exports.getPlants = (req, res) => {
    try {
        const data = storageService.getPlants();
        res.setHeader('Content-Type', 'application/json');
        res.json(data);
    } catch (err) {
        console.error('plantController.getPlants error:', err);
        res.status(500).json({ error: 'Failed to read plants data' });
    }
};

exports.savePlants = (req, res) => {
    try {
        const updatedPlants = req.body;
        if (!updatedPlants || typeof updatedPlants !== 'object' || Array.isArray(updatedPlants) || Object.keys(updatedPlants).length === 0) {
            return res.status(400).json({ error: 'Payload must be a non-empty dictionary of plant records' });
        }

        for (const [id, plant] of Object.entries(updatedPlants)) {
            if (!plant || typeof plant !== 'object' || Array.isArray(plant) || typeof plant.name !== 'string' || !plant.name.trim()) {
                return res.status(400).json({ error: `Invalid plant record at key '${id}': missing or invalid name` });
            }
        }

        storageService.savePlants(updatedPlants);
        res.status(200).json({ success: true, message: 'Plants data updated successfully' });
    } catch (err) {
        console.error('plantController.savePlants error:', err);
        res.status(400).json({ error: err.message || 'Failed to save plants data' });
    }
};

exports.deletePlant = (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Missing plant id' });
        }

        const deleted = storageService.deletePlant(id);
        if (!deleted) {
            return res.status(404).json({ error: `Plant #${id} not found` });
        }

        // Clean up corresponding .patt and .png marker files
        markerService.removeMarkerFiles(id);

        res.status(200).json({ success: true, message: `Plant #${id} and associated markers deleted successfully` });
    } catch (err) {
        console.error('plantController.deletePlant error:', err);
        res.status(500).json({ error: 'Failed to delete plant' });
    }
};
