const UserController = require('../controllers/user');
const { authenticate } = require('../middleware/authenticate');
const { onlineLimiter, depositLimiter, resetLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/user/:id', UserController.validate('getUserById'), UserController.getUserById);

    app.put('/api/profile/edit', authenticate, UserController.validate('editUser'), UserController.editUser);
    app.post('/api/profile/reset', resetLimiter, authenticate, UserController.resetUser);
    app.put('/api/profile/online', onlineLimiter, authenticate, UserController.editUserRankForOnline);
    app.put('/api/profile/sendmoney', authenticate, UserController.validate('sendMoneyForUser'), UserController.sendMoneyForUserByUserId);
    app.post('/api/profile/deposit', depositLimiter, authenticate, UserController.validate('deposit'), UserController.depositBalance);
    app.get('/api/profile/deposit/history', authenticate, UserController.getDepositHistory);
};

