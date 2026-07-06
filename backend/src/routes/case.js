const CaseController = require('../controllers/case');
const {authenticate} = require('../middleware/authenticate');
const { caseOpenLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.get('/api/cases', CaseController.getAllCase);
    app.get('/api/case/:id', CaseController.validate('getCaseById'), CaseController.getCaseById);

    app.post('/api/case/open', caseOpenLimiter, authenticate, CaseController.validate('openCaseById'), CaseController.openCaseById);
};