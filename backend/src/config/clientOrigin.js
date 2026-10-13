module.exports = () => (process.env.CLIENT_ORIGIN || 'http://localhost:3000').replace(/\/+$/, '');
