const markerService = require('../services/markerService');

exports.generateMarker = (req, res) => {
    try {
        const { plantId } = req.body;
        if (!plantId) {
            return res.status(400).json({ error: 'Missing plantId' });
        }
        const result = markerService.generateMarkerFiles(plantId);
        res.json(result);
    } catch (err) {
        console.error('markerController.generateMarker error:', err);
        res.status(500).json({ error: 'Failed to generate marker' });
    }
};
