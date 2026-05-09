const { sendError } = require('../utils/responses');

function errorHandler(error, _req, res, _next) {
  if (error.statusCode && error.code) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  if (error && error.code === 11000) {
    return sendError(res, 409, 'EMAIL_ALREADY_EXISTS', 'Email já cadastrado.');
  }

  return sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno inesperado.');
}

module.exports = { errorHandler };
