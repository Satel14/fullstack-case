const UserController = require('../controllers/user');
const { authenticate } = require('../middleware/authenticate');

module.exports = (app) => {
    app.get('/api/user/:id', UserController.validate('getUserById'), UserController.getUserById);

    // Profile - Only With Authenticate
    app.put('/api/profile/edit', authenticate, UserController.validate('editUser'), UserController.editUser);
    app.get('/api/profile/reset', authenticate, UserController.resetUser);
    app.put('/api/profile/online', authenticate, UserController.editUserRankForOnline);
    app.put('/api/profile/sendmoney', authenticate, UserController.validate('sendMoneyForUser'), UserController.sendMoneyForUserByUserId);
};

