const { authenticate } = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/adminOnly');
const { adminLimiter } = require('../../middleware/rateLimiters');
const ActionsController = require('../../controllers/admin/actions');
const CasesController = require('../../controllers/admin/cases');

module.exports = (app) => {
    app.get('/api/admin/actions', adminLimiter, authenticate, adminOnly, ActionsController.list);
    app.get('/api/admin/cases', adminLimiter, authenticate, adminOnly, CasesController.list);
    app.put('/api/admin/case/:id', adminLimiter, authenticate, adminOnly, CasesController.validate('update'), CasesController.update);
};
