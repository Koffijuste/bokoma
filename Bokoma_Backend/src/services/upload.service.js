// src/services/upload.service.js
const { cloudinary } = require('../config/cloudinary');

/**
 * ✅ Extrait le public_id depuis une URL Cloudinary
 */
const extractPublicId = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  
  // Si c'est déjà un publicId
  if (!imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Regex pour extraire le publicId
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (match) {
    return match[1].replace(/\.[^.]+$/, '');
  }
  
  // Fallback
  try {
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${filename}`;
  } catch (err) {
    console.warn('⚠️ [Upload] Failed to extract publicId:', imageUrl);
    return null;
  }
};

/**
 * ✅ Supprime une image Cloudinary
 */
const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  const publicId = extractPublicId(imageUrl);
  if (!publicId) {
    console.warn('⚠️ [Upload] Could not extract publicId from:', imageUrl);
    return;
  }
  
  try {
    console.log(`🗑️ [Upload] Deleting: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ [Upload] Deleted: ${publicId} → ${result.result}`);
    return result;
  } catch (err) {
    console.error(`❌ [Upload] Failed to delete ${publicId}:`, err.message);
  }
};

/**
 * ✅ Supprime plusieurs images en parallèle
 */
const deleteImages = async (imageUrls = []) => {
  if (!imageUrls || imageUrls.length === 0) return;
  
  console.log(`🗑️ [Upload] Deleting ${imageUrls.length} image(s)...`);
  
  const results = await Promise.allSettled(
    imageUrls.map(url => deleteImage(url))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ [Upload] Complete: ${succeeded}/${imageUrls.length} succeeded`);
  
  return { succeeded, failed, total: imageUrls.length };
};

module.exports = { 
  deleteImage, 
  deleteImages,
  extractPublicId,
};