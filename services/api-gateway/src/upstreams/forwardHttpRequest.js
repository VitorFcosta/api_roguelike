const { AppError } = require('../errors/AppError');

function getServiceName(baseUrl) {
  try {
    return new URL(baseUrl).hostname || 'upstream-service';
  } catch {
    return 'upstream-service';
  }
}

async function forwardHttpRequest({ baseUrl, path, method, headers, body }) {
  const url = new URL(path, baseUrl);
  const options = {
    method,
    headers
  };

  if (!['GET', 'HEAD'].includes(method) && body !== undefined) {
    options.body = JSON.stringify(body);
    options.headers = {
      ...headers,
      'content-type': headers['content-type'] || 'application/json'
    };
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch (_error) {
    const serviceName = getServiceName(baseUrl);
    const code = `${serviceName.replace(/-/g, '_').toUpperCase()}_UNAVAILABLE`;
    throw new AppError(503, code, `${serviceName} indisponível.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    headers: {
      'content-type': contentType
    },
    body: responseBody
  };
}

module.exports = { forwardHttpRequest };
