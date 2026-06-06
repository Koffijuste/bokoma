const { cloudinary } = require('../config/cloudinary');

/**
 * Supprime une image Cloudinary par son URL publique ou son public_id.
 * @param {string} imageUrl   URL complète Cloudinary
 */
const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  // Extraire le public_id depuis l'URL
  const parts    = imageUrl.split('/');
  const filename = parts[parts.length - 1].split('.')[0];
  const folder   = parts[parts.length - 2];
  const publicId = `${folder}/${filename}`;
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Supprime plusieurs images en parallèle.
 * @param {string[]} imageUrls
 */
const deleteImages = async (imageUrls = []) => {
  await Promise.allSettled(imageUrls.map(deleteImage));
};

module.exports = { deleteImage, deleteImages };