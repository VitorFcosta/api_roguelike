const { User } = require('../models/User');

function createUserRepository() {
  return {
    async findByEmail(email) {
      return User.findOne({
        email: email.toLowerCase(),
        deletedAt: null
      });
    },

    async findById(id) {
      return User.findOne({
        _id: id,
        deletedAt: null
      });
    },

    async create(userData) {
      return User.create(userData);
    },

    async listActive() {
      return User.find({ deletedAt: null }).sort({ createdAt: 1 });
    },

    async upsertAdmin({ name, email, passwordHash }) {
      const normalizedEmail = email.toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        existingUser.name = name;
        existingUser.passwordHash = passwordHash;
        existingUser.role = 'admin';
        existingUser.deletedAt = null;
        return existingUser.save();
      }

      return User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
        deletedAt: null
      });
    }
  };
}

module.exports = { createUserRepository };
