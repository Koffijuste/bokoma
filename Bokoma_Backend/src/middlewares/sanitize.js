'use strict';

const mongoSanitize = require('express-mongo-sanitize');
const { clean } = require('xss-clean/lib/xss');

function deepClean(value) {
  if (Array.isArray(value)) {
    return value.map(deepClean);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = deepClean(value[key]);
      return sanitized;
    }, {});
  }

  if (typeof value === 'string') {
    return clean(value);
  }

  return value;
}

function sanitizeObject(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  mongoSanitize.sanitize(target);
  return deepClean(target);
}

module.exports = (req, res, next) => {
  ['body', 'params', 'headers'].forEach((key) => {
    if (req[key]) {
      req[key] = sanitizeObject(req[key]);
    }
  });
  next();
};
