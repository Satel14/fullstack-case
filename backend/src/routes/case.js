const CaseController = require('../controllers/case');
const {authenticate} = require('../middleware/authenticate');

module.exports = (router) => {
    router.get('/api/cases', CaseController.getAllCase);
    router.get('/api/case/:id', CaseController.validate('getCaseById'), CaseController.getCaseById);

    router.post('/api/case/open', authenticate, CaseController.validate('openCaseById'), CaseController.openCaseById);
};