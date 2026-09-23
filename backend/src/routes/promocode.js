const PromocodeController = require('../controllers/promocode.js');
const { authenticate } = require('../middleware/authenticate');
const { notBanned } = require('../middleware/adminOnly');
const { promocodeLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.put('/api/promocode/use', authenticate, notBanned, promocodeLimiter, PromocodeController.validate('usePromocode'), PromocodeController.usePromocode);
};
