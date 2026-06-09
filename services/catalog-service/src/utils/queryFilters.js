const MAX_NAME_FILTER_LENGTH = 80;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNameRegexFilter(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().slice(0, MAX_NAME_FILTER_LENGTH);

  if (!trimmed) {
    return null;
  }

  return { $regex: escapeRegex(trimmed), $options: 'i' };
}

module.exports = { buildNameRegexFilter };
