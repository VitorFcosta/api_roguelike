const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  const currentRequestId = req.get('X-Request-Id') || randomUUID();

  req.requestId = currentRequestId;
  res.set('X-Request-Id', currentRequestId);

  return next();
}

module.exports = { requestId };
