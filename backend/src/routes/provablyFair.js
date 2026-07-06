const PFController = require('../controllers/provablyFair');
const { authenticate } = require('../middleware/authenticate');

module.exports = (app) => {
    app.get('/api/profile/provably-fair', authenticate, PFController.getState);
    app.put('/api/profile/provably-fair/client-seed', authenticate, PFController.validate('setClientSeed'), PFController.setClientSeed);
    app.post('/api/profile/provably-fair/rotate', authenticate, PFController.rotate);
    app.get('/api/profile/provably-fair/history', authenticate, PFController.getHistory);
    app.post('/api/provably-fair/verify', PFController.validate('verify'), PFController.verify);
};
