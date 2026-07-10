// bokoma_backend/src/models/User.js
// ============================================================================
// 👤 USER MODEL - Version avec middleware Promise-based
// ============================================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');

// ============================================================================
// 🔹 ADDRESS SCHEMA
// ============================================================================
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Domicile', trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true, timestamps: true }
);

// ============================================================================
// 🔹 USER SCHEMA
// ============================================================================
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'Le prénom est requis'], trim: true },
    lastName: { type: String, required: [true, 'Le nom est requis'], trim: true },

    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email invalide']
    },

    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false,
    },

    phone: { type: String, trim: true },

    role: {
      type: String,
      enum: {
        values: ['customer', 'admin', 'manager'],
        message: 'Rôle invalide: {VALUE}'
      },
      default: 'customer',
      index: true
    },

    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date },

    addresses: [addressSchema],
    country: { type: String, trim: true },

    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],

    avatar: { type: String },

    refreshToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // ✅ OTP 6 chiffres pour la récup de mot de passe (en plus du lien)
    resetOtpCode: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },

    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // 🔔 Abonnements Web Push (PWA) — un user peut avoir plusieurs devices
    //    (mobile + desktop). On supprime automatiquement les endpoints morts
    //    (410 Gone) lors d'un send échoué.
    pushSubscriptions: [{
      endpoint:   { type: String, required: true, unique: true },
      keys: {
        p256dh: { type: String, required: true },
        auth:   { type: String, required: true },
      },
      userAgent: { type: String },
      // Quand la subscription a été créée (pour cleanup > 6 mois par ex)
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================================================
// 🔹 INDEXES
// ============================================================================
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1, isActive: 1 });

// ============================================================================
// 🔹 MIDDLEWARE: Hash password — VERSION PROMISE-BASED (sans next)
// ============================================================================
userSchema.pre('save', async function() {
  // ✅ Si le password n'a pas été modifié, on skip
  if (!this.isModified('password')) return;
  
  // ✅ Validation manuelle
  if (this.password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(this.password)) {
    throw new Error('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[0-9]/.test(this.password)) {
    throw new Error('Le mot de passe doit contenir au moins un chiffre');
  }
  
  // ✅ Hash
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================================================
// 🔹 MÉTHODE: Comparer mot de passe
// ============================================================================
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error('❌ [User.comparePassword] Error:', err.message);
    return false;
  }
};

// ============================================================================
// 🔹 MÉTHODE: Générer access token
// ============================================================================
userSchema.methods.generateAccessToken = function() {
  const payload = {
    userId: this._id.toString(),
    email: this.email?.toLowerCase(),
    role: this.role || 'customer',
    firstName: this.firstName,
    lastName: this.lastName,
  };

  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
    issuer: jwtConfig.access.issuer,
    audience: jwtConfig.access.audience,
    jwtid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    ...jwtConfig.options,
  });
};

// ============================================================================
// 🔹 MÉTHODE: Générer refresh token
// ============================================================================
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { userId: this._id.toString(), type: 'refresh' },
    jwtConfig.refresh.secret,
    {
      expiresIn: jwtConfig.refresh.expiresIn,
      issuer: jwtConfig.refresh.issuer,
      audience: jwtConfig.refresh.audience,
      jwtid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      ...jwtConfig.options,
    }
  );
};

// ============================================================================
// 🔹 MÉTHODES: Vérification des rôles
// ============================================================================
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

userSchema.methods.isManager = function() {
  return this.role === 'manager';
};

userSchema.methods.hasRole = function(...roles) {
  return roles.includes(this.role);
};

// ============================================================================
// 🔹 MÉTHODE: toJSON sécurisé
// ============================================================================
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  const { 
    password, 
    refreshToken, 
    resetPasswordToken, 
    resetPasswordExpires,
    emailVerificationToken,
    emailVerificationExpires,
    __v, 
    ...safeUser 
  } = obj;
  return safeUser;
};

// ============================================================================
// 🔹 VIRTUALS
// ============================================================================
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.virtual('defaultAddress').get(function() {
  return this.addresses?.find(addr => addr.isDefault) || this.addresses?.[0];
});

userSchema.virtual('initials').get(function() {
  return `${this.firstName?.[0] || ''}${this.lastName?.[0] || ''}`.toUpperCase();
});

// ============================================================================
// 🔹 EXPORT
// ============================================================================
module.exports = mongoose.model('User', userSchema);