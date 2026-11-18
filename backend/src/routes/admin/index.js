const { authenticate } = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/adminOnly');
const { adminLimiter } = require('../../middleware/rateLimiters');
const { articleBody } = require('../../middleware/jsonBody');
const ActionsController = require('../../controllers/admin/actions');
const ArticlesController = require('../../controllers/admin/articles');
const CasesController = require('../../controllers/admin/cases');
const SaleRateController = require('../../controllers/admin/saleRate');
const UsersController = require('../../controllers/admin/users');

module.exports = (app) => {
    app.get('/api/admin/actions', adminLimiter, authenticate, adminOnly, ActionsController.list);
    app.get('/api/admin/articles', adminLimiter, authenticate, adminOnly, ArticlesController.list);
    app.put('/api/admin/article/:id', adminLimiter, authenticate, adminOnly, articleBody, ArticlesController.validate('update'), ArticlesController.update);
    app.get('/api/admin/cases', adminLimiter, authenticate, adminOnly, CasesController.list);
    app.put('/api/admin/case/:id', adminLimiter, authenticate, adminOnly, CasesController.validate('update'), CasesController.update);
    app.get('/api/admin/sale-rate', adminLimiter, authenticate, adminOnly, SaleRateController.get);
    app.put('/api/admin/sale-rate', adminLimiter, authenticate, adminOnly, SaleRateController.validate('update'), SaleRateController.update);
    app.get('/api/admin/users', adminLimiter, authenticate, adminOnly, UsersController.list);
    app.put('/api/admin/user/:id/role', adminLimiter, authenticate, adminOnly, UsersController.validate('setRole'), UsersController.setRole);
    app.post('/api/admin/user/:id/balance', adminLimiter, authenticate, adminOnly, UsersController.validate('adjustBalance'), UsersController.adjustBalance);
};
