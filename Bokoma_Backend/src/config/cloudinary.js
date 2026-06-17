// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;

// ✅ Configuration via CLOUDINARY_URL (recommandé)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true,
  });
  
  const match = process.env.CLOUDINARY_URL.match(/@(.+)$/);
  const cloudName = match ? match[1] : 'unknown';
  
  console.log('✅ [Cloudinary] Configured via CLOUDINARY_URL:', {
    cloud_name: cloudName,
    secure: true,
  });
} 
// ✅ Fallback : variables séparées
else if (process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  
  console.log('✅ [Cloudinary] Configured via separate variables:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    secure: true,
  });
} 
// ⚠️ Pas de configuration - mode dégradé
else {
  console.warn('⚠️ [Cloudinary] No configuration found - uploads will fail!');
  console.warn('   Set CLOUDINARY_URL in .env');
}

module.exports = { cloudinary };