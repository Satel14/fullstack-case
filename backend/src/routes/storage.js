const StorageController = require('../controllers/storage');
const { authenticate } = require('../middleware/authenticate');

module.exports = (app) => {
    app.get('/api/storage/list/:limit', StorageController.getStorageLastItems);
    app.get('/api/storage/list-userinfo/:limit', StorageController.getStorageLastItemsWithUserInfo);
    app.get('/api/storage/user/:id/:limit/:offset', StorageController.validate('getStorageLastItemsByUserId'), StorageController.getStorageLastItemsByUserId);
    app.get('/api/storage/count/:id', StorageController.validate('getStorageItemsCountByUserId'), StorageController.getStorageItemsCountByUserId);
    app.get('/api/storage/favorite/:id', StorageController.validate('getFavoriteCaseByUserId'), StorageController.getFavoriteCaseByUserId);

    app.get('/api/storage/sell/:id', authenticate, StorageController.validate('sellItemByStorageId'), StorageController.sellItemByStorageId);
    app.get('/api/storage/receive/:id', authenticate, StorageController.validate('receiveItemByStorageId'), StorageController.receiveItemByStorageId);

    
    app.get('/api/storage/top/:limit/:offset', StorageController.validate('getStorageTop'), StorageController.getStorageTop);

    app.post('/api/profile/storage', authenticate, StorageController.getProfileStorage);
};
