const request = require('supertest');
const jwt = require('jsonwebtoken');

const { createApp } = require('../src/app');

function createMemoryUserRepository() {
  const users = [];
  let nextId = 1;

  return {
    users,
    async findByEmail(email) {
      return users.find((user) => user.email === email.toLowerCase() && !user.deletedAt) || null;
    },
    async findById(id) {
      return users.find((user) => user.id === id && !user.deletedAt) || null;
    },
    async create(userData) {
      const user = {
        id: String(nextId++),
        ...userData,
        email: userData.email.toLowerCase(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.push(user);
      return user;
    },
    async listActive() {
      return users.filter((user) => !user.deletedAt);
    }
  };
}

function createTestConfig() {
  return {
    jwtSecret: 'test_secret_for_auth_service',
    jwtIssuer: 'roguelike-api',
    jwtAudience: 'roguelike-client',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4
  };
}

describe('auth-service', () => {
  let repository;
  let app;
  let config;

  beforeEach(() => {
    repository = createMemoryUserRepository();
    config = createTestConfig();
    app = createApp({ userRepository: repository, config });
  });

  test('register creates a user role and stores a password hash', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ name: 'Ana Souza', email: 'ana@email.com', password: '123456' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        name: 'Ana Souza',
        email: 'ana@email.com',
        role: 'user'
      }
    });
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(repository.users[0].passwordHash).toBeDefined();
    expect(repository.users[0].passwordHash).not.toBe('123456');
  });

  test('register rejects duplicated email with 409', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Ana Souza', email: 'ana@email.com', password: '123456' });

    const response = await request(app)
      .post('/auth/register')
      .send({ name: 'Ana Souza', email: 'ana@email.com', password: '123456' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email já cadastrado.'
      }
    });
  });

  test('login with valid password returns a signed JWT', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Ana Souza', email: 'ana@email.com', password: '123456' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@email.com', password: '123456' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.passwordHash).toBeUndefined();

    const decoded = jwt.verify(response.body.data.token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience
    });
    expect(decoded.sub).toBe('1');
    expect(decoded.role).toBe('user');
  });

  test('login with wrong password returns 401', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Ana Souza', email: 'ana@email.com', password: '123456' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@email.com', password: 'errada' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('users me returns authenticated user without passwordHash', async () => {
    await repository.create({
      name: 'Ana Souza',
      email: 'ana@email.com',
      passwordHash: 'hash-interno',
      role: 'user'
    });

    const response = await request(app)
      .get('/users/me')
      .set('X-User-Id', '1')
      .set('X-User-Role', 'user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: '1',
        name: 'Ana Souza',
        email: 'ana@email.com',
        role: 'user'
      }
    });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  test('users list rejects regular user and accepts admin', async () => {
    await repository.create({
      name: 'Ana Souza',
      email: 'ana@email.com',
      passwordHash: 'hash-user',
      role: 'user'
    });
    await repository.create({
      name: 'Admin',
      email: 'admin@email.com',
      passwordHash: 'hash-admin',
      role: 'admin'
    });

    const forbidden = await request(app)
      .get('/users')
      .set('X-User-Id', '1')
      .set('X-User-Role', 'user');

    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/users')
      .set('X-User-Id', '2')
      .set('X-User-Role', 'admin');

    expect(allowed.status).toBe(200);
    expect(allowed.body.data).toHaveLength(2);
    expect(allowed.body.data[0].passwordHash).toBeUndefined();
  });
});
