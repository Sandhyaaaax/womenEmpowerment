const express = require('express');
const router = express.Router();

let activeLocations = [];

// Share Location
router.post('/share', (req, res) => {
    const { userId, lat, lng, destination, vehicle } = req.body;
    
    const index = activeLocations.findIndex(loc => loc.userId === userId);
    if(index > -1) {
        activeLocations[index] = { userId, lat, lng, destination, vehicle, timestamp: Date.now() };
    } else {
        activeLocations.push({ userId, lat, lng, destination, vehicle, timestamp: Date.now() });
    }

    res.json({ message: 'Location updated', status: 'Safe' });
});

// Get Nearby Safe Zones (Mock data)
router.get('/zones', (req, res) => {
    const { lat, lng } = req.query;
    // we would return real polygons or points, here just some mock relative points
    res.json([
        { id: 1, lat: parseFloat(lat) + 0.005, lng: parseFloat(lng) + 0.005, type: 'danger' },
        { id: 2, lat: parseFloat(lat) - 0.005, lng: parseFloat(lng) - 0.005, type: 'safe' }
    ]);
});

module.exports = router;
