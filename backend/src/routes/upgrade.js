const UpgradeController = require('../controllers/upgrade');

module.exports = (app) => {
    app.get('/api/upgrade/targets', UpgradeController.validate('getTargets'), UpgradeController.getTargets);
};
