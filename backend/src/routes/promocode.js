const PromocodeController = require('../controllers/promocode.js');
const { authenticate } = require('../middleware/authenticate');
const { notBanned } = require('../middleware/adminOnly');

module.exports = (app) => {
    app.put('/api/promocode/use', authenticate, notBanned, PromocodeController.validate('usePromocode'), PromocodeController.usePromocode);
};
