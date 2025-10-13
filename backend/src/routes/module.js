const ModuleController = require('../controllers/module');

module.exports = (router) => {
    router.get('/api/module/all', ModuleController.getAllModules);
};
