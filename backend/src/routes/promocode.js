const PromocodeController = require('../controllers/promocode.js');
const { authenticate } = require('../middleware/authenticate');

module.exports = (app) => {
    app.put('/api/promocode/use', authenticate, PromocodeController.validate('usePromocode'), PromocodeController.usePromocode);
};
