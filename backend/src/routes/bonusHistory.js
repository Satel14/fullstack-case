const BonusHistoryController = require('../controllers/bonusHistory');
const { authenticate } = require('../middleware/authenticate');

module.exports = (app) => {
    app.get('/api/bonus/user', authenticate, BonusHistoryController.getBonusListOfUser);
    app.post('/api/bonus/activate', authenticate, BonusHistoryController.validate('activateBonus'), BonusHistoryController.activateBonus);
};
