function buildForwardHeaders(req) {
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

  return headers;
}

module.exports = { buildForwardHeaders };
