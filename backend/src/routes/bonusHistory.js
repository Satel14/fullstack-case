const BonusHistoryController = require('../controllers/bonusHistory');
const { authenticate } = require('../middleware/authenticate');
const { notBanned } = require('../middleware/adminOnly');
const { bonusLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/bonus/user', authenticate, BonusHistoryController.getBonusListOfUser);
    app.post('/api/bonus/activate', bonusLimiter, authenticate, notBanned, BonusHistoryController.validate('activateBonus'), BonusHistoryController.activateBonus);
};
