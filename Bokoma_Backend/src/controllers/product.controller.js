// src/controllers/product.controller.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');
const { generateSlug } = require('../utils/slugify');
const { deleteImages } = require('../services/upload.service');
const { cleanupTempFiles } = require('../middlewares/upload');
const { isValidObjectId } = require('mongoose');

// ───────── Helpers ─────────

const getUploadedFileUrl = (file) => {
  return file?.path || file?.secure_url || file?.url || file?.location || null;
};

const mapUploadedFileToImage = (file, index, altText) => {
  const url = getUploadedFileUrl(file);
  if (!url) {
    throw new AppError('Impossible de récupérer l\'URL de l\'image uploadée', 500);
  }
  return {
    url,
    alt: altText,
    isPrimary: index === 0,
  };
};

const safeParseJSON = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ safeParseJSON failed:', err.message);
    }
    return fallback;
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/products
exports.getProducts = async (req, res) => {
  try {
    const filter = { isActive: true };

    // ───────── CATEGORY FILTER ─────────
    if (req.query.category) {
      const input = String(req.query.category).toLowerCase().trim();
      let categoryDoc = null;

      // Essai 1 : Match exact du slug
      categoryDoc = await Category.findOne({ slug: input, isActive: true }).select('_id');

      // Essai 2 : Regex pour gérer les suffixes
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({
          slug: { $regex: `^${input}(-|$)`, $options: 'i' },
          isActive: true
        }).select('_id');
      }

      // Essai 3 : Si c'est déjà un ObjectId
      if (!categoryDoc && isValidObjectId(input)) {
        categoryDoc = await Category.findOne({ _id: input, isActive: true }).select('_id');
      }

      if (!categoryDoc) {
        return res.json({
          success: true,
          total: 0,
          results: 0,
          products: [],
          page: 1,
          pages: 0,
          limit: Number(req.query.limit) || 24,
        });
      }

      filter.category = categoryDoc._id;
    }

    // ───────── TAGS FILTER ─────────
    if (req.query.tags) {
      const tagsArray = String(req.query.tags)
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      
      if (tagsArray.length > 0) {
        filter.tags = { $in: tagsArray };
      }
    }

    // ───────── COUNT QUERY ─────────
    const countQuery = new ApiFeatures(Product.find(filter), req.query).search(['name', 'brand']);
    const total = await countQuery.query.clone().countDocuments();

    // ───────── MAIN QUERY ─────────
    const defaultFields = 'name,slug,images,brand,basePrice,totalStock,category';
    const requestQuery = {
      ...req.query,
      fields: req.query.fields || defaultFields,
    };

    const features = new ApiFeatures(Product.find(filter), requestQuery)
      .search(['name', 'brand'])
      .sort()
      .limitFields()
      .paginate();

    const products = await features.query
      .populate('category', 'name slug')
      .lean();

    return res.json({
      success: true,
      total,
      results: products.length,
      page: features._page,
      pages: Math.ceil(total / (features._limit || 24)),
      limit: features._limit,
      products,
    });

  } catch (err) {
    console.error('❌ getProducts error:', err);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/products/:slug
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .lean();
    
    if (!product) throw new AppError('Produit introuvable', 404);
    
    res.json({ success: true, product });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/products/featured
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .limit(8)
      .populate('category', 'name slug');
    
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/products [admin/manager]
exports.createProduct = async (req, res, _next) => {
  const sendError = (err) => {
    if (res.headersSent) return;
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Erreur lors de la création du produit',
      ...(err.errors && { errors: err.errors }),
    });
  };

  let tempFiles = req.files || [];

  try {
    // ✅ 1. VALIDATION DES CHAMPS REQUIS
    const { name, description, category, basePrice, type } = req.body;

    if (!name?.trim()) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('Le nom du produit est requis', 400));
    }
    if (!description?.trim()) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('La description est requise', 400));
    }
    if (!category) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('La catégorie est requise', 400));
    }
    if (!basePrice || Number(basePrice) <= 0) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('Le prix de base doit être supérieur à 0', 400));
    }

    // ✅ 2. VALIDATION DU TYPE
    const validTypes = ['shoes', 'perfume', 'clothing', 'accessory'];
    if (type && !validTypes.includes(type)) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError(`Type invalide. Valeurs acceptées: ${validTypes.join(', ')}`, 400));
    }

    // ✅ 3. VÉRIFIER QUE LA CATÉGORIE EXISTE
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('Catégorie introuvable', 404));
    }

    // ✅ 4. PARSING DES VARIANTES
    let variants = safeParseJSON(req.body.variants, []);
    if (!Array.isArray(variants)) variants = [];

    // ✅ 5. GÉNÉRATION DU SLUG
    let slug;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount < MAX_RETRIES) {
      try {
        slug = await generateSlug(name.trim(), Product);
        break;
      } catch (err) {
        if (err.code === 11000 && retryCount < MAX_RETRIES - 1) {
          retryCount++;
          continue;
        }
        throw err;
      }
    }

    // ✅ 6. CONSTRUCTION DES IMAGES
    const uploadedImages = tempFiles.map((f, i) => mapUploadedFileToImage(f, i, name.trim()));

    let manualImages = [];
    const imageUrls = safeParseJSON(req.body.imageUrls, []);
    if (Array.isArray(imageUrls)) {
      manualImages = imageUrls
        .filter(img => img?.url?.trim())
        .map((img, idx) => ({
          url: img.url.trim(),
          alt: img.alt?.trim() || name,
          isPrimary: uploadedImages.length === 0 && idx === 0,
        }));
    }

    if (uploadedImages.length === 0 && manualImages.length === 0) {
      const imagesField = safeParseJSON(req.body.images, []);
      if (Array.isArray(imagesField)) {
        manualImages = imagesField
          .filter(img => img?.url || img?.imageUrl)
          .map((img, idx) => ({
            url: (img.url || img.imageUrl)?.toString().trim(),
            alt: img.alt?.toString().trim() || name,
            isPrimary: idx === 0,
          }));
      }
    }

    const images = [...uploadedImages, ...manualImages];

    if (images.length === 0) {
      await cleanupTempFiles(tempFiles);
      return sendError(new AppError('Au moins une image est requise', 400));
    }

    // ✅ 7. CRÉATION DU PRODUIT
    const productData = {
      name: name.trim(),
      slug,
      description: description.trim(),
      category,
      type: type || 'shoes',
      brand: req.body.brand?.trim() || undefined,
      basePrice: Number(basePrice),
      comparePrice: req.body.comparePrice ? Number(req.body.comparePrice) : undefined,
      totalStock: Number(req.body.totalStock) || 0,
      images,
      variants,
      isActive: req.body.isActive === 'false' ? false : Boolean(req.body.isActive ?? true),
      createdBy: req.user?.userId,
    };

    const product = await Product.create(productData);
    await product.populate('category', 'name slug');

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [createProduct] Product created:', product._id);
    }

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: { product },
    });

  } catch (err) {
    await cleanupTempFiles(tempFiles);

    console.error('❌ [createProduct] Error:', err.message);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return sendError(new AppError(messages.join(', '), 400));
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return sendError(new AppError(`Un produit avec ce ${field} existe déjà`, 409));
    }

    if (err instanceof AppError) {
      return sendError(err);
    }

    return sendError(new AppError(err.message || 'Erreur lors de la création du produit', 500));
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/products/:id [admin/manager]
exports.updateProduct = async (req, res) => {
  
  console.log('📝 [updateProduct] Received:', {
    params: req.params,
    body: req.body,
    files: req.files?.length || 0,
  });
  let tempFiles = req.files || [];

  try {
    if (!isValidObjectId(req.params.id)) {
      await cleanupTempFiles(tempFiles);
      throw new AppError('ID de produit invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      await cleanupTempFiles(tempFiles);
      throw new AppError('Produit introuvable', 404);
    }

    // ✅ Générer un nouveau slug si le nom change
    if (req.body.name && req.body.name !== product.name) {
      req.body.slug = await generateSlug(req.body.name, Product);
    }

    // ✅ Parser les variantes
    if (typeof req.body.variants === 'string') {
      try { 
        req.body.variants = JSON.parse(req.body.variants); 
      } catch (err) { 
        await cleanupTempFiles(tempFiles);
        throw new AppError('Format des variantes invalide', 400); 
      }
    }

    // ✅ Gestion des images
    if (req.files?.length || req.body.imageUrls || req.body.existingImages) {
      const existingImages = product.images || [];
      
      // Parser les images existantes conservées
      let keptImages = [];
      if (req.body.existingImages) {
        const parsed = safeParseJSON(req.body.existingImages, []);
        if (Array.isArray(parsed)) {
          keptImages = parsed
            .filter(img => img?.url)
            .map(img => ({
              url: img.url,
              alt: img.alt || product.name,
              publicId: img.publicId,
              isPrimary: false,
            }));
        }
      }
      
      // Nouvelles images uploadées
      const newUploadedImages = req.files?.map((f, i) => 
        mapUploadedFileToImage(f, keptImages.length + i, req.body.name || product.name)
      ) || [];
      
      // Images manuelles via URLs
      let newManualImages = [];
      if (req.body.imageUrls) {
        const parsed = safeParseJSON(req.body.imageUrls, []);
        if (Array.isArray(parsed)) {
          newManualImages = parsed
            .filter(img => img?.url?.trim())
            .map((img, idx) => ({
              url: img.url.trim(),
              alt: img.alt || req.body.name || product.name,
              isPrimary: keptImages.length + newUploadedImages.length === 0 && idx === 0,
            }));
        }
      }
      
      // Combiner toutes les images
      req.body.images = [...keptImages, ...newUploadedImages, ...newManualImages];
      
      // Marquer la première image comme principale
      if (req.body.images.length > 0) {
        req.body.images[0].isPrimary = true;
      }
      
      // ✅ Supprimer les anciennes images non conservées
      const keptUrls = req.body.images.map(img => img.url);
      const imagesToDelete = existingImages
        .filter(img => !keptUrls.includes(img.url))
        .map(img => img.url);
      
      if (imagesToDelete.length > 0) {
        await deleteImages(imagesToDelete).catch(err => {
          console.warn('⚠️ Failed to delete old images:', err.message);
        });
      }
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { 
      returnDocument: 'after', 
      runValidators: true,
      new: true,
    });
    
    await updated.populate('category', 'name slug');

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [updateProduct] Product updated:', updated._id);
    }

    res.json({ 
      success: true, 
      message: 'Produit mis à jour avec succès',
      product: updated 
    });

  } catch (err) {
    // ✅ Cleanup des fichiers en cas d'erreur
    await cleanupTempFiles(tempFiles);

    console.error('❌ [updateProduct] Error:', err.message);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id [admin]
exports.deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('ID de produit invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Produit introuvable', 404);
    }

    // ✅ Supprimer les images de Cloudinary
    if (product.images?.length > 0) {
      const imageUrls = product.images.map(img => img.url);
      await deleteImages(imageUrls).catch(err => {
        console.warn('⚠️ Failed to delete images:', err.message);
      });
    }

    // ✅ Supprimer le produit
    await Product.findByIdAndDelete(req.params.id);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ [deleteProduct] Product deleted:', req.params.id);
    }

    res.json({ 
      success: true, 
      message: 'Produit supprimé avec succès' 
    });

  } catch (err) {
    console.error('❌ [deleteProduct] Error:', err.message);
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id/images/:imageIndex [admin]
exports.deleteProductImage = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('ID de produit invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Produit introuvable', 404);
    }

    const idx = parseInt(req.params.imageIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
      throw new AppError('Index image invalide', 400);
    }

    const [removed] = product.images.splice(idx, 1);
    
    // ✅ Supprimer l'image de Cloudinary
    if (removed.url) {
      await deleteImages([removed.url]).catch(err => {
        console.warn('⚠️ Failed to delete image:', err.message);
      });
    }
    
    // ✅ Réassigner isPrimary si nécessaire
    if (removed.isPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true;
    }
    
    await product.save();
    
    res.json({ 
      success: true, 
      message: 'Image supprimée avec succès',
      images: product.images 
    });

  } catch (err) {
    console.error('❌ [deleteProductImage] Error:', err.message);
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/products/:id/variants [admin]
exports.addVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('ID de produit invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Produit introuvable', 404);
    }
    
    product.variants.push(req.body);
    await product.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Variante ajoutée avec succès',
      variants: product.variants 
    });

  } catch (err) {
    console.error('❌ [addVariant] Error:', err.message);
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/products/:id/variants/:variantId [admin]
exports.updateVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('ID de produit invalide', 400);
    }
    if (!isValidObjectId(req.params.variantId)) {
      throw new AppError('ID de variante invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Produit introuvable', 404);
    }
    
    const variant = product.variants.id(req.params.variantId);
    if (!variant) {
      throw new AppError('Variante introuvable', 404);
    }
    
    Object.assign(variant, req.body);
    await product.save();
    
    res.json({ 
      success: true, 
      message: 'Variante mise à jour avec succès',
      variant 
    });

  } catch (err) {
    console.error('❌ [updateVariant] Error:', err.message);
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id/variants/:variantId [admin]
exports.deleteVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('ID de produit invalide', 400);
    }
    if (!isValidObjectId(req.params.variantId)) {
      throw new AppError('ID de variante invalide', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Produit introuvable', 404);
    }
    
    product.variants = product.variants.filter(
      v => v._id.toString() !== req.params.variantId
    );
    await product.save();
    
    res.json({ 
      success: true, 
      message: 'Variante supprimée avec succès' 
    });

  } catch (err) {
    console.error('❌ [deleteVariant] Error:', err.message);
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message 
    });
  }
};