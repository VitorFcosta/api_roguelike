const client = require('prom-client');

function createMetrics(serviceName) {
  const register = new client.Registry();

  client.collectDefaultMetrics({ register, prefix: `${serviceName}_` });

  const httpRequestsTotal = new client.Counter({
    name: `${serviceName}_http_requests_total`,
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
  });

  const httpRequestDuration = new client.Histogram({
    name: `${serviceName}_http_request_duration_seconds`,
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register]
  });

  function metricsMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      const duration = (Date.now() - start) / 1000;

      httpRequestsTotal.inc({
        method: req.method,
        route,
        status: res.statusCode
      });

      httpRequestDuration.observe(
        { method: req.method, route, status: res.statusCode },
        duration
      );
    });

    next();
  }

  function metricsEndpoint(req, res) {
    res.set('Content-Type', register.contentType);
    register.metrics().then((data) => res.end(data));
  }

  return { metricsMiddleware, metricsEndpoint };
}

module.exports = { createMetrics };
