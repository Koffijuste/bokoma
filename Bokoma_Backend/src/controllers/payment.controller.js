// src/controllers/payment.controller.js
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notification.service');

/**
 * GET /api/v1/orders/payments/pending
 * Liste les paiements en attente (admin)
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const orders = await Order.find({
      'payment.status': 'pending',
    })
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = orders.map(o => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Client inconnu',
      customerEmail: o.user?.email || 'N/A',
      customerPhone: o.user?.phone || 'N/A',
      total: o.total,
      paymentStatus: o.payment.status,
      paymentMethod: o.payment.method,
      createdAt: o.createdAt,
      expiresAt: o.paymentExpiresAt,
      timeRemainingMs: Math.max(0, new Date(o.paymentExpiresAt) - new Date()),
    }));

    res.json({
      success: true,
      count: formatted.length,
      orders: formatted,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements en attente',
    });
  }
};

/**
 * GET /api/v1/orders/payments/failed
 * Liste les paiements échoués/expirés récents (admin)
 */
exports.getFailedPayments = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const orders = await Order.find({
      'payment.status': { $in: ['failed', 'expired'] },
      'payment.failedAt': { $gte: since },
    })
      .populate('user', 'firstName lastName email phone')
      .sort({ 'payment.failedAt': -1 })
      .limit(50);

    const formatted = orders.map(o => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Client inconnu',
      customerEmail: o.user?.email || 'N/A',
      total: o.total,
      paymentStatus: o.payment.status,
      paymentMethod: o.payment.method,
      failedAt: o.payment.failedAt || o.payment.expiredAt,
      createdAt: o.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      orders: formatted,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements échoués',
    });
  }
};

/**
 * GET /api/v1/orders/payments/success
 * Liste les paiements réussis récents (admin)
 */
exports.getSuccessPayments = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const orders = await Order.find({
      'payment.status': { $in: ['paid', 'partial'] },
      'payment.paidAt': { $gte: since },
    })
      .populate('user', 'firstName lastName email phone')
      .sort({ 'payment.paidAt': -1 })
      .limit(50);

    const formatted = orders.map(o => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Client inconnu',
      customerEmail: o.user?.email || 'N/A',
      total: o.total,
      paymentStatus: o.payment.status,
      paymentMethod: o.payment.method,
      amountPaid: o.payment.amountPaid || o.total,
      paidAt: o.payment.paidAt,
      createdAt: o.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      orders: formatted,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements réussis',
    });
  }
};

/**
 * POST /api/v1/orders/:id/payment/reject
 * Rejette manuellement un paiement en attente (admin)
 */
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?._id;

    const order = await Order.findById(id).populate('user', 'firstName lastName email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }

    if (order.payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Le paiement n'est pas en attente (statut actuel: ${order.payment.status})`,
      });
    }

    // Rejet du paiement
    order.rejectPayment(reason, adminId);
    await order.save();

    // Notification au client
    if (order.user) {
      await NotificationService.notifyCustomer({
        userId: order.user._id,
        type: 'payment_failed',
        title: 'Paiement rejeté',
        message: `Votre commande #${order.orderNumber} a été annulée. ${order.payment.rejectionReason}`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.total,
        },
        relatedOrder: order._id,
      });
    }

    res.json({
      success: true,
      message: 'Paiement rejeté et client notifié',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet du paiement',
    });
  }
};

/**
 * GET /api/v1/notifications/payments
 * Liste les notifications de paiement (admin)
 */
exports.getPaymentNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    const query = {
      type: {
        $in: [
          'payment_pending',
          'payment_success',
          'payment_failed',
          'payment_expired',
          'payment_reminder',
        ],
      },
      user: req.user._id,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
    });
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await NotificationService.markAsRead(id, req.user._id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification introuvable' });
    }

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

/**
 * PATCH /api/v1/notifications/mark-all-read
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marquée(s) comme lue(s)`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};