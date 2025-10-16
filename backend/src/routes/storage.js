const StorageController = require('../controllers/storage');
const { authenticate } = require('../middleware/authenticate');

module.exports = (router) => {
    
    router.get('/api/storage/top/:limit/:offset', StorageController.validate('getStorageTop'), StorageController.getStorageTop);

};