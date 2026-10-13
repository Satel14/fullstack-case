const ItemController = require('../controllers/item');

module.exports = (app) => {
    app.get('/api/item/:id', ItemController.validate('getItemById'), ItemController.getItemById);
    app.get('/api/items', ItemController.validate('getItemsByIds'), ItemController.getItemsByIds);
    app.get('/api/itemprice/:id', ItemController.validate('getItemPriceById'), ItemController.getItemPriceById);

    
    app.get('/api/itemlist', ItemController.getItemList);
};
