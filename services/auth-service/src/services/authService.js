const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { AppError } = require('../errors/AppError');
const { toSafeUser } = require('../utils/userPresenter');

function createAuthService({ userRepository, config }) {
  async function register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'user'
    });

    return toSafeUser(user);
  }

  async function login({ email, password }) {
    const user = await userRepository.findByEmail(email.toLowerCase());

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha inválidos.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha inválidos.');
    }

    const safeUser = toSafeUser(user);
    const token = jwt.sign(
      {
        sub: safeUser.id,
        role: safeUser.role
      },
      config.jwtSecret,
      {
        algorithm: 'HS256',
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
        expiresIn: config.jwtExpiresIn
      }
    );

    return {
      token,
      user: safeUser
    };
  }

  return { register, login };
}

module.exports = { createAuthService };
