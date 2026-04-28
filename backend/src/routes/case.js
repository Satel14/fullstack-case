const CaseController = require('../controllers/case');
const {authenticate} = require('../middleware/authenticate');

module.exports = (app) => {
    app.get('/api/cases', CaseController.getAllCase);
    app.get('/api/case/:id', CaseController.validate('getCaseById'), CaseController.getCaseById);

    app.post('/api/case/open', authenticate, CaseController.validate('openCaseById'), CaseController.openCaseById);
};