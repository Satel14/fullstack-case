const UserController = require('../controllers/user');
const { authenticate } = require('../middleware/authenticate');
const { notBanned } = require('../middleware/adminOnly');
const { onlineLimiter, depositLimiter, resetLimiter, transferLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/user/:id', UserController.validate('getUserById'), UserController.getUserById);

    app.put('/api/profile/edit', authenticate, UserController.validate('editUser'), UserController.editUser);
    app.post('/api/profile/reset', resetLimiter, authenticate, notBanned, UserController.resetUser);
    app.put('/api/profile/online', onlineLimiter, authenticate, UserController.editUserRankForOnline);
    app.put('/api/profile/sendmoney', authenticate, notBanned, transferLimiter, UserController.validate('sendMoneyForUser'), UserController.sendMoneyForUserByUserId);
    app.post('/api/profile/deposit', depositLimiter, authenticate, notBanned, UserController.validate('deposit'), UserController.depositBalance);
    app.get('/api/profile/deposit/history', authenticate, UserController.getDepositHistory);
};

