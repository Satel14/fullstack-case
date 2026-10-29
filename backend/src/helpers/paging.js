const { MYSQL_INT_MAX } = require('../constant/mysql');

const MAX_OFFSET = MYSQL_INT_MAX;

const pageOffset = (raw) => Math.max(0, Math.min(parseInt(raw, 10) || 0, MAX_OFFSET));

module.exports = { MAX_OFFSET, pageOffset };
