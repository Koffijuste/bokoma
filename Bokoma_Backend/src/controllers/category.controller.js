// src/controllers/category.controller.js
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const { isValidObjectId } = require('mongoose');
const { generateSlug } = require('../utils/slugify');

// GET /api/v1/categories ✅ PUBLIC
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate({ 
        path: 'children', 
        match: { isActive: true },
        select: 'name slug order isActive'
      })
      .sort('order');
    
    const roots = categories.filter((c) => !c.parent);
    
    res.json({ 
      success: true, 
      categories: roots,
      count: roots.length 
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/categories/:slug ✅ PUBLIC
exports.getCategory = async (req, res, next) => {
  try {
    // ✅ Valider le format du slug
    if (!req.params.slug || req.params.slug.includes('/')) {
      return next(new AppError('Slug invalide', 400));
    }
    
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('children');
    
    if (!category) {
      return next(new AppError('Catégorie introuvable', 404));
    }
    
    res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/categories [admin] ✅ AVEC GESTION DE RACE CONDITION
exports.createCategory = async (req, res, next) => {
  try {
    const { name, ...rest } = req.body;
    
    if (!name?.trim()) {
      return next(new AppError('Le nom de la catégorie est requis', 400));
    }

    // ✅ Générer un slug UNIQUE (avec parent si fourni)
    const additionalQuery = rest.parent ? { parent: rest.parent } : {};
    const slug = await generateSlug(name.trim(), Category, additionalQuery);

    // ✅ Créer la catégorie avec gestion des conflits MongoDB
    let category;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        category = await Category.create({ 
          name: name.trim(), 
          slug, 
          ...rest 
        });
        break; // Succès
      } catch (createErr) {
        // ✅ Gestion de l'erreur de clé unique MongoDB (code 11000)
        if (createErr.code === 11000 && createErr.keyPattern?.slug && retryCount < MAX_RETRIES - 1) {
          // Race condition détectée : régénérer le slug et réessayer
          retryCount++;
          const newSlug = await generateSlug(name.trim(), Category, additionalQuery);
          if (newSlug !== slug) {
            slug = newSlug;
            continue;
          }
        }
        throw createErr; // Autre erreur ou max retries atteint
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Catégorie créée avec succès',
      category 
    });
  } catch (err) {
    // ✅ Message utilisateur-friendly pour les conflits de slug
    if (err.code === 11000 && err.keyPattern?.slug) {
      return next(new AppError(`Une catégorie avec ce nom existe déjà`, 409));
    }
    next(err);
  }
};

// PATCH /api/v1/categories/:id [admin]
exports.updateCategory = async (req, res, next) => {
  try {
    // ✅ Validation ObjectId
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID de catégorie invalide', 400));
    }
    
    // ✅ Générer nouveau slug si le nom change
    if (req.body.name) {
      const additionalQuery = req.body.parent ? { parent: req.body.parent } : {};
      req.body.slug = await generateSlug(req.body.name, Category, additionalQuery);
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!category) {
      return next(new AppError('Catégorie introuvable', 404));
    }
    
    res.json({ success: true, category });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.slug) {
      return next(new AppError(`Le slug "${err.keyValue.slug}" est déjà utilisé`, 409));
    }
    next(err);
  }
};

// DELETE /api/v1/categories/:id [admin]
exports.deleteCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('ID de catégorie invalide', 400));
    }
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Catégorie introuvable', 404));
    }
    
    // Soft delete
    category.isActive = false;
    await category.save();
    
    res.json({ success: true, message: 'Catégorie désactivée' });
  } catch (err) {
    next(err);
  }
};