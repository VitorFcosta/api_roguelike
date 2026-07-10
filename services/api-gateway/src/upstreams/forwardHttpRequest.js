const { AppError } = require('../errors/AppError');

function getServiceName(baseUrl) {
  try {
    return new URL(baseUrl).hostname || 'upstream-service';
  } catch {
    return 'upstream-service';
  }
}

async function forwardHttpRequest({ baseUrl, path, method, headers, body, timeoutMs = 5000 }) {
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (_error) {
    const serviceName = getServiceName(baseUrl);

    if (controller.signal.aborted) {
      const code = `${serviceName.replace(/-/g, '_').toUpperCase()}_TIMEOUT`;
      throw new AppError(504, code, `${serviceName} demorou demais para responder.`);
    }

    const code = `${serviceName.replace(/-/g, '_').toUpperCase()}_UNAVAILABLE`;
    throw new AppError(503, code, `${serviceName} indisponível.`);
  } finally {
    clearTimeout(timeoutId);
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
