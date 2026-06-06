// src/controllers/product.controller.js
const Product = require('../models/Product');
const Category = require('../models/Category'); // ← Import en haut pour éviter les require multiples
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');
const { generateSlug } = require('../utils/slugify');
const { deleteImages } = require('../services/upload.service');
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

// ─────────────────────────────────────────────────────────────
// GET /api/v1/products
exports.getProducts = async (req, res) => {
  try {
    // ───────── DEBUG LOGS (à retirer en prod si nécessaire) ─────────
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] getProducts query:', req.query);
    }

    // ───────── BASE FILTER ─────────
    const filter = { isActive: true };

    // ───────── CATEGORY FILTER (VERSION FLEXIBLE) ─────────
    if (req.query.category) {
      const input = String(req.query.category).toLowerCase().trim();
      let categoryDoc = null;

      // 🎯 Essai 1 : Match exact du slug
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({ slug: input, isActive: true }).select('_id');
      }

      // 🎯 Essai 2 : Regex pour gérer les suffixes (ex: "chaussures-xyz" match "chaussures")
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({
          slug: { $regex: `^${input}(-|$)`, $options: 'i' },
          isActive: true
        }).select('_id');
      }

      // 🎯 Essai 3 : Si c'est déjà un ObjectId
      if (!categoryDoc && isValidObjectId(input)) {
        categoryDoc = await Category.findOne({ _id: input, isActive: true }).select('_id');
      }

      // 🐛 Debug logs
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Category lookup:', {
          searched: input,
          found: !!categoryDoc,
          foundId: categoryDoc?._id,
        });
      }

      if (!categoryDoc) {
        // Optionnel : lister les slugs disponibles pour le debug
        const available = await Category.find({ isActive: true }).select('slug name').limit(5);
        
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Category not found. Available slugs:', available.map(c => c.slug));
        }

        return res.json({
          success: true,
          total: 0,
          results: 0,
          products: [],
          page: 1,
          pages: 0,
          limit: Number(req.query.limit) || 24,
          ...(process.env.NODE_ENV === 'development' && {
            debug: {
              searchedSlug: input,
              categoryFound: false,
              availableSlugs: available.map(c => ({ slug: c.slug, name: c.name }))
            }
          })
        });
      }

      // Appliquer le filtre
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

    // Debug final du filtre
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Final Product filter:', filter);
    }

    // ───────── COUNT QUERY ─────────
    const countQuery = new ApiFeatures(Product.find(filter), req.query).search(['name', 'brand']);
    const total = await countQuery.query.clone().countDocuments();

    // ───────── MAIN QUERY ─────────
    const features = new ApiFeatures(Product.find(filter), req.query)
      .search(['name', 'brand'])
      .sort()
      .limitFields()
      .paginate();

    const products = await features.query
      .populate('category', 'name slug')
      .lean();

    // Debug résultats
    if (process.env.NODE_ENV === 'development' && products.length > 0) {
      console.log('📦 First product sample:', {
        id: products[0]._id,
        name: products[0].name,
        category: products[0].category,
        isActive: products[0].isActive,
      });
    }

    return res.json({
      success: true,
      total,
      results: products.length,
      page: features._page,
      pages: Math.ceil(total / (features._limit || 24)),
      limit: features._limit,
      products,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          filter,
          categorySearched: req.query.category,
          totalBeforePagination: total,
        }
      })
    });

  } catch (err) {
    console.error('🔴 getProducts error:', err);
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
      .populate('reviews');
    
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
exports.createProduct = async (req, res, next) => {
  let tempFiles = req.files || [];

  try {
    // ✅ 1. LOGS STRUCTURÉS (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.group('📦 [createProduct]');
      console.log('Body:', Object.keys(req.body));
      console.log('Files:', tempFiles.length);
      console.log('User:', req.user?.userId, req.user?.role);
      console.groupEnd();
    }

    // ✅ 2. VALIDATION DES CHAMPS REQUIS
    const { name, description, category, basePrice, type } = req.body;

    if (!name?.trim()) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('Le nom du produit est requis', 400));
    }
    if (!description?.trim()) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('La description est requise', 400));
    }
    if (!category) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('La catégorie est requise', 400));
    }
    if (!basePrice || Number(basePrice) <= 0) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('Le prix de base doit être supérieur à 0', 400));
    }

    // ✅ 3. VALIDATION DU TYPE (enum)
    const validTypes = ['shoes', 'perfume', 'clothing', 'accessory'];
    if (type && !validTypes.includes(type)) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError(`Type invalide. Valeurs acceptées: ${validTypes.join(', ')}`, 400));
    }

    // ✅ 4. VÉRIFIER QUE LA CATÉGORIE EXISTE
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('Catégorie introuvable', 404));
    }

    // ✅ 5. PARSING DES VARIANTES (sécurisé)
    let variants = safeParseJSON(req.body.variants, []);
    if (!Array.isArray(variants)) variants = [];

    // ✅ 6. GÉNÉRATION DU SLUG (avec gestion race condition)
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

    // ✅ 7. CONSTRUCTION DES IMAGES
    const uploadedImages = tempFiles.map((f, i) => mapUploadedFileToImage(f, i, name.trim()));

    // Images via URLs manuelles
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

    // Fallback: req.body.images
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

    // ✅ 8. VALIDATION FINALE DES IMAGES
    const images = [...uploadedImages, ...manualImages];

    if (images.length === 0) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError('Au moins une image est requise', 400));
    }

    const invalidImage = images.findIndex(img => !img?.url);
    if (invalidImage !== -1) {
      await cleanupTempFiles(tempFiles);
      return next(new AppError(`Image ${invalidImage + 1} doit avoir une URL valide`, 400));
    }

    // ✅ 9. CRÉATION DU PRODUIT (avec normalisation)
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

    // ✅ 10. PEUPLER LA CATÉGORIE POUR LA RÉPONSE
    await product.populate('category', 'name slug');

    // ✅ 11. LOG SUCCÈS
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [createProduct] Product created:', {
        id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images.length,
      });
    }

    // ✅ 12. RÉPONSE
    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: { product },
    });

  } catch (err) {
    // ✅ NETTOYAGE DES FICHIERS TEMPORAIRES EN CAS D'ERREUR
    await cleanupTempFiles(tempFiles);

    console.error('❌ [createProduct] Error:', {
      message: err.message,
      name: err.name,
      code: err.code,
    });

    // ✅ GESTION DES ERREURS MONGODB
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new AppError(messages.join(', '), 400));
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return next(new AppError(`Un produit avec ce ${field} existe déjà`, 409));
    }

    // ✅ ERREURS DÉJÀ FORMATÉES (AppError)
    if (err instanceof AppError) {
      return next(err);
    }

    // ✅ ERREUR GÉNÉRIQUE
    next(new AppError(err.message || 'Erreur lors de la création du produit', 500));
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/products/:id [admin/manager]
exports.updateProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);

    if (req.body.name && req.body.name !== product.name) {
      req.body.slug = await generateSlug(req.body.name, Product);
    }

    if (typeof req.body.variants === 'string') {
      try { req.body.variants = JSON.parse(req.body.variants); } 
      catch (err) { throw new AppError('Format des variantes invalide', 400); }
    }

    // Gestion hybride des images
    if (req.files?.length || req.body.imageUrls) {
      const existingImages = product.images || [];
      const newUploadedImages = req.files?.map((f, i) => mapUploadedFileToImage(f, i, req.body.name || product.name)) || [];
      
      let newManualImages = [];
      if (req.body.imageUrls) {
        try {
          const parsed = JSON.parse(req.body.imageUrls);
          if (Array.isArray(parsed)) {
            newManualImages = parsed
              .filter(img => img?.url?.trim())
              .map((img, idx) => ({
                url: img.url.trim(),
                alt: img.alt || req.body.name || product.name,
                isPrimary: existingImages.length + newUploadedImages.length === 0 && idx === 0,
              }));
          }
        } catch (err) { console.warn('⚠️ Failed to parse imageUrls in update:', err); }
      }
      
      req.body.images = [...existingImages, ...newUploadedImages, ...newManualImages];
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { 
      returnDocument: 'after', runValidators: true 
    });
    
    res.json({ success: true, product: updated });

  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id [admin]
exports.deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);

    await deleteImages(product.images.map((i) => i.url)).catch(() => {});
    await product.deleteOne();
    
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id/images/:imageIndex [admin]
exports.deleteProductImage = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);

    const idx = parseInt(req.params.imageIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
      throw new AppError('Index image invalide', 400);
    }

    const [removed] = product.images.splice(idx, 1);
    await deleteImages([removed.url]).catch(() => {});
    await product.save();
    
    res.json({ success: true, images: product.images });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/products/:id/variants [admin]
exports.addVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);
    
    product.variants.push(req.body);
    await product.save();
    
    res.status(201).json({ success: true, variants: product.variants });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/products/:id/variants/:variantId [admin]
exports.updateVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);
    if (!isValidObjectId(req.params.variantId)) throw new AppError('ID de variante invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);
    
    const variant = product.variants.id(req.params.variantId);
    if (!variant) throw new AppError('Variante introuvable', 404);
    
    Object.assign(variant, req.body);
    await product.save();
    
    res.json({ success: true, variant });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id/variants/:variantId [admin]
exports.deleteVariant = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new AppError('ID de produit invalide', 400);
    if (!isValidObjectId(req.params.variantId)) throw new AppError('ID de variante invalide', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Produit introuvable', 404);
    
    product.variants = product.variants.filter((v) => v._id.toString() !== req.params.variantId);
    await product.save();
    
    res.json({ success: true, message: 'Variante supprimée' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};