function buildForwardHeaders(req, config = {}) {
  const headers = {
    'x-request-id': req.requestId
  };

  const contentType = req.get('Content-Type');

  if (contentType) {
    headers['content-type'] = contentType;
  }

  if (req.user) {
    headers['x-user-id'] = req.user.id;
    headers['x-user-role'] = req.user.role;
  }

  if (config.internalServiceSecret) {
    headers['x-internal-service-secret'] = config.internalServiceSecret;
  }

  return headers;
}

module.exports = { buildForwardHeaders };
