// src/controllers/health.controller.js
const mongoose = require('mongoose');

// GET /api/v1/health
exports.getHealth = async (req, res) => {
  try {
    // Vérifier la connexion MongoDB (ultra-rapide)
    const dbState = mongoose.connection.readyState;
    
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const isDbConnected = dbState === 1;
    
    res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: isDbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'error',
      message: 'Service unavailable',
      error: err.message,
    });
  }
};