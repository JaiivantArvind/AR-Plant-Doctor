const express = require('express');
const router = express.Router();

const plantController = require('../controllers/plantController');
const markerController = require('../controllers/markerController');

// Plant data routes
router.get('/plants', plantController.getPlants);
router.post('/plants', plantController.savePlants);
router.delete('/plants/:id', plantController.deletePlant);

// Marker generation route
router.post('/generate-marker', markerController.generateMarker);

module.exports = router;
