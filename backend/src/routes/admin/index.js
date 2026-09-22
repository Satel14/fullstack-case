const { authenticate } = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/adminOnly');
const { adminLimiter } = require('../../middleware/rateLimiters');
const ActionsController = require('../../controllers/admin/actions');
const CasesController = require('../../controllers/admin/cases');
const UsersController = require('../../controllers/admin/users');

module.exports = (app) => {
    app.get('/api/admin/actions', adminLimiter, authenticate, adminOnly, ActionsController.list);
    app.get('/api/admin/cases', adminLimiter, authenticate, adminOnly, CasesController.list);
    app.put('/api/admin/case/:id', adminLimiter, authenticate, adminOnly, CasesController.validate('update'), CasesController.update);
    app.get('/api/admin/users', adminLimiter, authenticate, adminOnly, UsersController.list);
    app.put('/api/admin/user/:id/role', adminLimiter, authenticate, adminOnly, UsersController.validate('setRole'), UsersController.setRole);
};
