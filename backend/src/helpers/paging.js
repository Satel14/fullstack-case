const MAX_OFFSET = 2147483647;

const pageOffset = (raw) => Math.max(0, Math.min(parseInt(raw, 10) || 0, MAX_OFFSET));

module.exports = { MAX_OFFSET, pageOffset };
