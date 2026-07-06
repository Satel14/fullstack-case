const Storage = require('../models/storage');
const MESSAGE = require('../constant/responseMessages');

module.exports.addItem = async (userId, itemId, itemColor, caseId, options = {}) => {
    try {
        const item = {
            storage_userId: userId,
            storage_itemId: itemId,
            storage_color: itemColor,
            storage_caseId: caseId,
            storage_status: 'inventory',
        };
        const storageId = await Storage.create(item, options).then((data) => data.dataValues.storage_id);
        return storageId;
    } catch (e) {
        throw Error(e.message);
    }
};

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
        // eslint-disable-next-line lodash/prefer-lodash-method
        storageItems.forEach((element) => {
            items.push(element.dataValues);
        });

        return items;
    } catch (e) {
        throw Error(e.message);
    }
};

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

module.exports.getStorageLastItems = async (limit) => {
    try {
        const storageItems = await Storage.findAll({
            attributes: ['storage_color', 'storage_itemId', 'storage_userId', 'storage_id', 'storage_caseId'],
            order: [['storage_id', 'DESC']],
            limit: parseInt(limit, 10),
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

module.exports.getStorageById = async (userId, status) => {
    try {
        const storageItems = await Storage.findAll({
            order: [['storage_id', 'DESC']],
            where: {
                storage_userId: userId,
                status,
            },
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

module.exports.setStorageExtraDataById = async (storage_id, storage_extraData) => {
    try {
        const storageItem = await Storage.findOne({
            where: {
                storage_id,
            },
        });

        if (!storageItem) throw new Error(MESSAGE.CASE.NOT_EXIST);

        await Storage.update({ storage_extraData }, { where: { storage_id } });

        return;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.setStorageStatusById = async (storage_id, storage_status, options = {}) => {
    try {
        const { transaction } = options;
        const storageItem = await Storage.findOne({
            where: {
                storage_id,
            },
            transaction,
        });

        if (!storageItem) throw new Error(MESSAGE.CASE.NOT_EXIST);

        await Storage.update({ storage_status }, { where: { storage_id }, transaction });

        return;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.cleanStorageUser = async (userId) => {
    try {
        await Storage.destroy({
            where: {
                storage_userId: userId
            }
        })
        return;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getStorageInfoById = async (userId, id, status, options = {}) => {
    try {
        const storageItem = await Storage.findOne({
            where: {
                storage_userId: userId,
                storage_status: status,
                storage_id: id,
            },
            ...options,
        });

        if (!storageItem) return null;

        return storageItem.dataValues;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getStorageItemsCountByUserId = async (id) => {
    try {
        const obj = {
            where: {
                storage_userId: id,
            },
        };

        const count = await Storage.count(obj);
        return count;
    } catch (e) {
        throw Error(e.message);
    }
};

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
};
