const express = require('express');
const { writeToFile } = require('../lib/logger');
const router = express.Router();

// POST /api/logs/frontend - Receive logs from frontend
router.post('/frontend', (req, res) => {
  try {
    const { level, message, timestamp } = req.body;
    
    if (!level || !message) {
      return res.status(400).json({
        error: 'Missing required fields: level, message'
      });
    }
    
    // Escribir el log del frontend en el archivo
    writeToFile(level, message);
    
    res.status(200).json({
      success: true,
      message: 'Log received'
    });
  } catch (error) {
    // No fallar si hay error en logging
    res.status(200).json({
      success: false,
      message: 'Error processing log'
    });
  }
});

module.exports = router;
