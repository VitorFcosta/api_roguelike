const request = require('supertest');
const jwt = require('jsonwebtoken');

const { createApp } = require('../src/app');

function createTestConfig() {
  return {
    port: 3000,
    authServiceUrl: 'http://auth-service:3001',
    catalogServiceUrl: 'http://catalog-service:3002',
    gameServiceUrl: 'http://game-service:3003',
    rankingServiceUrl: 'http://ranking-service:3004',
    jwtSecret: 'test_secret_for_gateway',
    jwtIssuer: 'roguelike-api',
    jwtAudience: 'roguelike-client',
    internalServiceSecret: 'test_internal_secret',
    corsOrigin: 'http://localhost:3000',
    rateLimitWindowMs: 60000,
    rateLimitMax: 100,
    upstreamTimeoutMs: 5000,
    rateLimitEnabled: false
  };
}

function signToken(config, role = 'user', subject = 'user-1') {
  return jwt.sign({ sub: subject, role }, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: '1h'
  });
}

describe('api-gateway', () => {
  test('health adds a request id when absent', async () => {
    const app = createApp({ config: createTestConfig() });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body.data.service).toBe('api-gateway');
  });

  test('users me without token returns 401', async () => {
    const app = createApp({ config: createTestConfig() });

    const response = await request(app).get('/v1/users/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('users list with regular user token returns 403', async () => {
    const config = createTestConfig();
    const app = createApp({ config });

    const response = await request(app)
      .get('/v1/users')
      .set('Authorization', `Bearer ${signToken(config, 'user', 'user-1')}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('users me forwards user headers and preserves request id', async () => {
    const config = createTestConfig();
    const forwarder = jest.fn(async ({ headers }) => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        success: true,
        data: {
          id: headers['x-user-id'],
          role: headers['x-user-role']
        }
      }
    }));
    const app = createApp({ config, forwarder });

    const response = await request(app)
      .get('/v1/users/me')
      .set('X-Request-Id', 'req-123')
      .set('Authorization', `Bearer ${signToken(config, 'user', 'user-1')}`);

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-123');
    expect(response.body.data).toEqual({ id: 'user-1', role: 'user' });
    expect(forwarder).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: config.authServiceUrl,
      path: '/users/me',
      method: 'GET',
      headers: expect.objectContaining({
        'x-request-id': 'req-123',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
        'x-internal-service-secret': config.internalServiceSecret
      }),
      timeoutMs: config.upstreamTimeoutMs
    }));
  });

  test('admin token can reach users list through auth-service', async () => {
    const config = createTestConfig();
    const forwarder = jest.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true, data: [] }
    }));
    const app = createApp({ config, forwarder });

    const response = await request(app)
      .get('/v1/users')
      .set('Authorization', `Bearer ${signToken(config, 'admin', 'admin-1')}`);

    expect(response.status).toBe(200);
    expect(forwarder).toHaveBeenCalledTimes(1);
  });

  test('catalog contract returns 503 while catalog-service is not implemented', async () => {
    const config = createTestConfig();
    const app = createApp({ config });

    const response = await request(app)
      .get('/v1/cards')
      .set('Authorization', `Bearer ${signToken(config, 'user', 'user-1')}`);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('CATALOG_SERVICE_UNAVAILABLE');
  });

  test('ranking event route is not exposed through the public gateway', async () => {
    const config = createTestConfig();
    const forwarder = jest.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true, data: {} }
    }));
    const app = createApp({ config, forwarder });

    const response = await request(app)
      .post('/v1/ranking/events/run-finished')
      .set('Authorization', `Bearer ${signToken(config, 'user', 'user-1')}`)
      .send({ userId: 'user-1', status: 'victory', floor: 6 });

    expect(response.status).toBe(404);
    expect(forwarder).not.toHaveBeenCalled();
  });
});
