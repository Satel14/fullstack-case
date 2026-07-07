// @ts-nocheck
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const { check, validationResult } = require('express-validator');
const StorageService = require('../services/storage');
const CaseService = require('../services/case');
const ItemService = require('../services/item');
const InsiderService = require('../services/insiderPrices');
const ModuleService = require('../services/module');
const UserService = require('../services/user');
const BalanceHistoryService = require('../services/balanceHistory');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;

const MESSAGE = require('../constant/responseMessages');
const sequelize = require('../config/db');

function jsonParser(blob) {
    let parsed = JSON.parse(blob);
    if (typeof parsed === 'string') parsed = jsonParser(parsed);
    return parsed;
}

module.exports.getProfileStorage = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const { status, limit, offset } = req.body;

        if (!status) {
            return res.status(200).json({ status: 200, data: [] });
        }

        const items = await StorageService.getStorageById(user_id, status, { limit, offset });

        return res.status(200).json({ status: 200, data: items });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.receiveItemByStorageId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const { id } = req.params;

        const { user_receiveInfo } = await UserService.getUserFullInfoById(user_id);

        await sequelize.transaction(async (t) => {
            const locked = await StorageService.getStorageInfoById(user_id, id, 'inventory', {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!locked) {
                const err = new Error(MESSAGE.ITEM.NOT_EXIST);
                err.code = 'NOT_RECEIVABLE';
                throw err;
            }

            await StorageService.setStorageStatusById(id, 'waitingtrade', { transaction: t });
            await StorageService.setStorageExtraDataById(id, user_receiveInfo, { transaction: t });
        });

        return res.status(200).json({ status: 200 });
    } catch (e) {
        if (e && e.code === 'NOT_RECEIVABLE') {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.sellItemByStorageId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const { id } = req.params;

        console.log('[SELL] Attempting to sell storageId:', id, 'for userId:', user_id);

        const storageItem = await StorageService.getStorageInfoById(user_id, id, 'inventory');

        if (!storageItem) {
            console.log('[SELL] Storage item not found');
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }

        console.log('[SELL] storageItem found, itemId:', storageItem.storage_itemId, 'color:', storageItem.storage_color);

        const getItemInfo = await ItemService.getItemById(storageItem.storage_itemId);

        if (!getItemInfo) {
            console.log('[SELL] Item info not found for itemId:', storageItem.storage_itemId);
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }

        console.log('[SELL] Item name:', getItemInfo.item_name);

        const prices = await InsiderService.getItemPrice(getItemInfo.item_name);

        if (!prices || !prices.pricesInCredits) {
            console.log('[SELL] No prices found for item:', getItemInfo.item_name, 'prices:', prices);
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }

        console.log('[SELL] Raw pricesInCredits:', prices.pricesInCredits);

        let price = typeof prices.pricesInCredits === 'string'
            ? jsonParser(prices.pricesInCredits)
            : prices.pricesInCredits;

        let color = storageItem.storage_color;
        color = color.toLowerCase();
        color = color.replace(' ', '');

        console.log('[SELL] Parsed prices:', price, 'color key:', color, 'price for color:', price[color]);

        price = price[color];

        if (!price) {
            console.log('[SELL] No price for color:', color);
            return res.status(422).json({ status: 422, message: 'No price for this item color' });
        }

        const currentRate = await ModuleService.getModuleById('uah-credit-rate');

        if (!currentRate) {
            console.log('[SELL] uah-credit-rate module not found');
            return res.status(422).json({ status: 422, message: 'Rate module not found' });
        }

        console.log('[SELL] Rate extraData:', currentRate.extraData);

        const actualPrice = (parseInt(price * parseFloat(currentRate.extraData) * 100, 10)) / 100;

        console.log('[SELL] actualPrice:', actualPrice);

        if (!actualPrice) {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }

        await sequelize.transaction(async (t) => {
            const locked = await StorageService.getStorageInfoById(user_id, id, 'inventory', {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!locked) {
                const err = new Error(MESSAGE.ITEM.NOT_EXIST);
                err.code = 'NOT_SELLABLE';
                throw err;
            }

            await StorageService.setStorageStatusById(id, 'money', { transaction: t });
            await UserService.incrementBalance(actualPrice, user_id, { transaction: t });
            await BalanceHistoryService.addBalanceChange(
                user_id, BalanceHistoryEnum.SELL_ITEM, actualPrice, '', { transaction: t },
            );
        });

        const actualBalance = await UserService.getBalanceByUserId(user_id);

        console.log('[SELL] Success! New balance:', actualBalance);

        return res.status(200).json({ status: 200, balance: actualBalance });
    } catch (e) {
        console.error('[SELL] ERROR:', e.message, e.stack);
        if (e && e.code === 'NOT_SELLABLE') {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getStorageItemsCountByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;

        const result = await StorageService.getStorageItemsCountByUserId(id);

        return res.status(200).json({ status: 200, data: result });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getStorageLastItems = async (req, res) => {
    try {
        const { limit } = req.params;

        const items = await StorageService.getStorageLastItems(limit);

        return res.status(200).json({ status: 200, data: items });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getStorageLastItemsWithUserInfo = async (req, res) => {
    try {
        const { limit } = req.params;
        const items = await StorageService.getStorageLastItems(limit);

        const userList = {};
        const caseList = {};


        for (const key in items) {
            const element = items[key];

            if (!userList[element.storage_userId]) {
                const userInfo = await UserService.getUserById(element.storage_userId).catch(() => null);
                userList[element.storage_userId] = userInfo;
            }
            if (!caseList[element.storage_caseId]) {
                const caseInfo = await CaseService.getCaseById(element.storage_caseId).catch(() => null);
                caseList[element.storage_caseId] = caseInfo;
            }
        }

        const promises = [];

        for (const key in userList) {
            const element = userList[key];
            promises.push(element);
        }

        await Promise.all(promises);

        return res.status(200).json({ status: 200, data: items, userList, caseList });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getStorageLastItemsByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { offset, id, limit } = req.params;

        const items = await StorageService.getStorageLastItemsByUserId(id, limit, offset);

        return res.status(200).json({ status: 200, data: items });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.getStorageTop = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { limit, offset } = req.params;
        const CAP = 50;
        const parsedOffset = Math.max(Number(offset) || 0, 0);
        const parsedLimit = Math.max(Number(limit) || 0, 0);
        // Leaderboard is capped at the top CAP users, then paginated within it.
        const effectiveLimit = parsedOffset >= CAP ? 0 : Math.min(parsedLimit, CAP - parsedOffset);

        const top = effectiveLimit > 0
            ? await StorageService.getTopUsersByItemCount(effectiveLimit, parsedOffset)
            : [];

        const data = await Promise.all(
            top.map(async (row) => ({
                userId: row.userId,
                count: row.count,
                info: await UserService.getUserById(row.userId).catch(() => null),
            })),
        );

        return res.status(200).json({ status: 200, data });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};


module.exports.getFavoriteCaseByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;

        const allItems = await StorageService.getStorageLastItemsByUserId(id, 1000, 0);

        const massiveCases = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const key in allItems) {
            massiveCases.push(allItems[key].storage_caseId);
        }


        const result = massiveCases.reduce((data, curr) => {
            data[curr] = data[curr] ? ++data[curr] : 1;
            return data;
        }, {});

        const maxUsed = { caseId: null, value: 0 };

        for (const key in result) {
            if (maxUsed.value < result[key]) {
                maxUsed.value = result[key];
                maxUsed.caseId = [key];
            }
        }
        let caseInfo = null;
        if (maxUsed.caseId) {
            caseInfo = await CaseService.getCaseById(maxUsed.caseId);
        }

        return res.status(200).json({ status: 200, data: caseInfo });
    } catch (e) {
        return res.status(500).json({ status: 500, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'getStorageLastItemsByUserId': {
            return [
                check('id').exists().isNumeric(),
                check('limit').exists().isNumeric(),
                check('offset').exists().isNumeric(),
            ];
        }
        case 'getStorageTop': {
            return [
                check('limit').exists().isNumeric(),
                check('offset').exists().isNumeric(),
            ];
        }
        case 'getStorageItemsCountByUserId': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        case 'getFavoriteCaseByUserId': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        case 'sellItemByStorageId': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        case 'receiveItemByStorageId': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        default:
            break;
    }
};
