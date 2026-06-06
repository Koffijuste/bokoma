// bokoma_backend/src/routes/user.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/upload');
const validateObjectId = require('../middlewares/validateObjectId');

// ✅ Debug : vérifier que tous les handlers existent
if (process.env.NODE_ENV === 'development') {
  const requiredHandlers = [
    'getProfile', 'updateProfile', 'updatePassword', 'updateAvatar',
    'getUserStats', 'getWishlist', 'toggleWishlist',
    'addAddress', 'updateAddress', 'deleteAddress',
    'getAllUsers', 'getUser', 'toggleUserStatus', 'updateUserRole', 'deleteUser'
  ];
  
  const missing = requiredHandlers.filter(h => typeof ctrl[h] !== 'function');
  if (missing.length > 0) {
    console.error('❌ [user.routes] Missing handlers in controller:', missing);
  } else {
    console.log('✅ [user.routes] All handlers found');
  }
}

// ✅ Protection globale
router.use(protect);

// ============================================================================
// 🔹 ROUTES PERSONNELLES
// ============================================================================

router.get('/me', ctrl.getProfile);
router.patch('/me', ctrl.updateProfile);
router.patch('/me/password', ctrl.updatePassword);  // ✅ updatePassword (pas changePassword)
router.patch('/me/avatar', uploadSingle, ctrl.updateAvatar);  // ✅ updateAvatar

// Stats
router.get('/me/stats', ctrl.getUserStats);

// Wishlist
router.get('/me/wishlist', ctrl.getWishlist);
router.post('/me/wishlist/:productId', validateObjectId('productId'), ctrl.toggleWishlist);

// Adresses
router.post('/me/addresses', ctrl.addAddress);
router.patch('/me/addresses/:addressId', validateObjectId('addressId'), ctrl.updateAddress);
router.delete('/me/addresses/:addressId', validateObjectId('addressId'), ctrl.deleteAddress);

// ============================================================================
// 🔹 ROUTES ADMIN
// ============================================================================

router.get('/', authorize('admin', 'manager'), ctrl.getAllUsers);
router.get('/:id', authorize('admin', 'manager'), validateObjectId('id'), ctrl.getUser);
router.patch('/:id/status', authorize('admin'), validateObjectId('id'), ctrl.toggleUserStatus);
router.patch('/:id/role', authorize('admin'), validateObjectId('id'), ctrl.updateUserRole);
router.delete('/:id', authorize('admin'), validateObjectId('id'), ctrl.deleteUser);

module.exports = router;