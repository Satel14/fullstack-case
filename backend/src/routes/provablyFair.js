const PFController = require('../controllers/provablyFair');
const { authenticate } = require('../middleware/authenticate');
const { seedRotateLimiter, verifyLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/profile/provably-fair', authenticate, PFController.getState);
    app.put('/api/profile/provably-fair/client-seed', authenticate, PFController.validate('setClientSeed'), PFController.setClientSeed);
    app.post('/api/profile/provably-fair/rotate', seedRotateLimiter, authenticate, PFController.rotate);
    app.get('/api/profile/provably-fair/history', authenticate, PFController.getHistory);
    app.get('/api/profile/provably-fair/upgrades', authenticate, PFController.validate('getUpgradeHistory'), PFController.getUpgradeHistory);
    app.post('/api/provably-fair/verify', verifyLimiter, PFController.validate('verify'), PFController.verify);
    app.post('/api/provably-fair/verify-upgrade', verifyLimiter, PFController.validate('verifyUpgrade'), PFController.verifyUpgrade);
};
