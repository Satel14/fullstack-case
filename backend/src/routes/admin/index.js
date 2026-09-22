const { authenticate } = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/adminOnly');
const { adminLimiter } = require('../../middleware/rateLimiters');
const ActionsController = require('../../controllers/admin/actions');

module.exports = (app) => {
    app.get('/api/admin/actions', adminLimiter, authenticate, adminOnly, ActionsController.list);
};
