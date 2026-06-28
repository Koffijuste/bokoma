// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);
router.use(restrictTo('admin', 'manager'));

// GET /api/v1/payments/pending
router.get('/pending',      paymentController.getPendingPayments);
// GET /api/v1/payments/failed
router.get('/failed',       paymentController.getFailedPayments);
// GET /api/v1/payments/success
router.get('/success',      paymentController.getSuccessPayments);
// POST /api/v1/payments/:id/reject
router.post('/:id/reject',  paymentController.rejectPayment);

// GET  /api/v1/payments/notifications
router.get('/notifications',                  paymentController.getPaymentNotifications);
// PATCH /api/v1/payments/notifications/mark-all-read  ← avant /:id
router.patch('/notifications/mark-all-read',  paymentController.markAllNotificationsAsRead);
// PATCH /api/v1/payments/notifications/:id/read
router.patch('/notifications/:id/read',       paymentController.markNotificationAsRead);

module.exports = router;