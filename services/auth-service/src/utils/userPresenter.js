function toPlainUser(user) {
  if (!user) {
    return null;
  }

  if (typeof user.toObject === 'function') {
    return user.toObject({ virtuals: true });
  }

  return user;
}

function toSafeUser(user) {
  const plainUser = toPlainUser(user);

  if (!plainUser) {
    return null;
  }

  return {
    id: String(plainUser.id || plainUser._id),
    name: plainUser.name,
    email: plainUser.email,
    role: plainUser.role
  };
}

module.exports = { toSafeUser };
