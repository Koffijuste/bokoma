/**
 * ApiFeatures — chaîne de méthodes pour construire dynamiquement
 * une requête Mongoose depuis les query params Express.
 *
 * Usage :
 *   const features = new ApiFeatures(Product.find(), req.query)
 *     .filter()
 *     .search()
 *     .sort()
 *     .limitFields()
 *     .paginate();
 *   const products = await features.query;
 */
class ApiFeatures {
  constructor(query, queryString) {
    this.query       = query;
    this.queryString = queryString;
  }

  // Filtres avancés : >, >=, <, <=
  filter() {
    const queryObj = { ...this.queryString };
    const excluded = ['page', 'limit', 'sort', 'fields', 'search'];
    excluded.forEach((k) => delete queryObj[k]);

    // Conversion des opérateurs : { price: { gte: '5000' } } → { price: { $gte: 5000 } }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (m) => `$${m}`);
    const parsed = JSON.parse(queryStr);

    // Conversion des valeurs numériques
    for (const key of Object.keys(parsed)) {
      if (typeof parsed[key] === 'object') {
        for (const op of Object.keys(parsed[key])) {
          if (!isNaN(parsed[key][op])) parsed[key][op] = Number(parsed[key][op]);
        }
      }
    }

    this.query = this.query.find(parsed);
    return this;
  }

  // Recherche full-text (index text Mongoose requis sur le modèle)
  search(fields = []) {
    if (this.queryString.search) {
      const keyword = this.queryString.search;
      if (fields.length > 0) {
        const regex = new RegExp(keyword, 'i');
        this.query = this.query.find({ $or: fields.map((f) => ({ [f]: regex })) });
      } else {
        this.query = this.query.find({ $text: { $search: keyword } });
      }
    }
    return this;
  }

  // Tri : ?sort=-price,name → { price: -1, name: 1 }
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // Sélection de champs : ?fields=name,price,images
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    }
    return this;
  }

  // Pagination : ?page=2&limit=12
  paginate() {
    const page  = Math.max(parseInt(this.queryString.page,  10) || 1, 1);
    const limit = Math.min(parseInt(this.queryString.limit, 10) || 12, 100);
    const skip  = (page - 1) * limit;
    this.query  = this.query.skip(skip).limit(limit);
    this._page  = page;
    this._limit = limit;
    return this;
  }
}

module.exports = ApiFeatures;