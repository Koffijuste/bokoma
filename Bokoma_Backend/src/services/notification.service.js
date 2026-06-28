// src/services/notification.service.js
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * Crée une ou plusieurs notifications
   */
  static async create({ userIds = [], type, title, message, data = {}, priority = 'normal', relatedOrder = null }) {
    try {
      if (userIds.length === 0) return [];

      const notifications = userIds.map(userId => ({
        user: userId,
        type,
        title,
        message,
        data,
        priority,
        relatedOrder,
        isRead: false,
      }));

      const created = await Notification.insertMany(notifications);
      console.log(`✅ [NotificationService] ${created.length} notification(s) créée(s) - Type: ${type}`);
      return created;
    } catch (err) {
      console.error('❌ [NotificationService] Erreur création:', err.message);
      return [];
    }
  }

  /**
   * Notifie tous les admins et managers
   */
  static async notifyAdmins({ type, title, message, data = {}, priority = 'high', relatedOrder = null }) {
    try {
      const admins = await User.find({
        role: { $in: ['admin', 'manager'] },
        isActive: { $ne: false },
      }).select('_id');

      if (admins.length === 0) {
        console.warn('⚠️ [NotificationService] Aucun admin trouvé');
        return [];
      }

      return await this.create({
        userIds: admins.map(a => a._id),
        type,
        title,
        message,
        data,
        priority,
        relatedOrder,
      });
    } catch (err) {
      console.error('❌ [NotificationService] notifyAdmins error:', err.message);
      return [];
    }
  }

  /**
   * Notifie un client spécifique
   */
  static async notifyCustomer({ userId, type, title, message, data = {}, priority = 'normal', relatedOrder = null }) {
    if (!userId) {
      console.warn('⚠️ [NotificationService] userId manquant pour notifyCustomer');
      return [];
    }
    
    return await this.create({
      userIds: [userId],
      type,
      title,
      message,
      data,
      priority,
      relatedOrder,
    });
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  static async getUserNotifications(userId, options = {}) {
    const { limit = 20, unreadOnly = false, type } = options;
    
    const query = { user: userId };
    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  static async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Compte les notifications non lues
   */
  static async countUnread(userId) {
    return await Notification.countDocuments({ user: userId, isRead: false });
  }
}

module.exports = NotificationService;