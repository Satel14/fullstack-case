const Storage = require('../models/storage');
const { sequelize } = require('../config/db');
const Users = require('../models/users');

module.exports.addItem = async (userId, itemId, itemColor, caseId) => {
    try {
        const item = {
            storage_userId: userId,
            storage_itemId: itemId,
            storage_itemColor: itemColor,
            storage_caseId: caseId,
        };

        const storageId = await Storage.create(item).then((data) => data.dataValues.storage_id);
        return storageId;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getCountOpenedCases = async (status = null) => {
    try {
        let obj = {};

        if (status) {
            obj = {
                where: {
                    storage_status: status,
                },
            };
        }

        const count = await Storage.count(obj);
        return count;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getStorageLastItemsByUserId = async (id, limit, offset) => {
    try {
        const storageItems = await Storage.findAll({
            order: [['storage_id', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            where: {
                storage_userId: id,
            },
        });

        if (!storageItems) throw new Error(MESSAGE.CASE.NOT_EXIST);

        const items = [];

        storageItems.forEach((element) => {
            items.push(element.dataValues);
        })

        return items;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getStorageAllItems = async () => {
    try {
        const storageItems = await Storage.findAll({
            attributes: ['storage_color', 'storage_itemId', 'storage_userId', 'storage_id', 'storage_caseId'],
        });

        if (!storageItems) throw new Error(MESSAGE.CASE.NOT_EXIST);

        const items = [];
        // eslint-disable-next-line lodash/prefer-lodash-method
        storageItems.forEach((element) => {
            items.push(element.dataValues);
        });

        return items;
    } catch (e) {
        throw Error(e.message);
    }
};