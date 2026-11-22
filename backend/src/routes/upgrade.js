const UpgradeController = require('../controllers/upgrade');
const { authenticate } = require('../middleware/authenticate');
const { notBanned } = require('../middleware/adminOnly');
const { upgradeLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/upgrade/targets', UpgradeController.validate('getTargets'), UpgradeController.getTargets);
    app.post('/api/upgrade', authenticate, notBanned, upgradeLimiter, UpgradeController.validate('upgrade'), UpgradeController.upgrade);
};
