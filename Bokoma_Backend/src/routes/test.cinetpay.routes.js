// src/routes/test.cinetpay.routes.js
const express = require('express');
const router = express.Router();
const cinetpayService = require('../services/cinetpay.service');
const { protect, restrictTo } = require('../middlewares/auth');

/**
 * GET /api/v1/test/cinetpay/connection
 * Test de connexion à l'API CinetPay
 */
router.get('/connection', protect, restrictTo('admin'), async (req, res) => {
  try {
    const result = await cinetpayService.testConnection();
    res.json({
      success: true,
      ...result,
      config: {
        apiKey: cinetpayService.apiKey ? `${cinetpayService.apiKey.slice(0, 8)}...` : '❌ MANQUANT',
        apiPassword: cinetpayService.apiPassword ? '✅ CONFIGURÉ' : '❌ MANQUANT',
        baseUrl: cinetpayService.baseUrl,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/v1/test/cinetpay/verify/:transactionId
 * Vérifier une transaction spécifique
 */
router.get('/verify/:transactionId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await cinetpayService.checkTransactionStatus(transactionId);
    
    res.json({
      success: true,
      transactionId,
      result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;