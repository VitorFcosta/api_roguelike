const mongoose = require('mongoose');
const { AppError } = require('../errors/AppError');

function validateObjectId(req, _res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError(400, 'INVALID_ID', 'ID inválido.'));
  }

  return next();
}

module.exports = { validateObjectId };
