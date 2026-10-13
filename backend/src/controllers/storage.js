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
const WithdrawalService = require('../services/withdrawal');
const BalanceHistoryEnum = require('../constant/enums/balance').BalanceHistory;
const { salePayout } = require('../helpers/salePayout');
const { answerFailure } = require('../helpers/failure');

const MESSAGE = require('../constant/responseMessages');
const sequelize = require('../config/db');

const UAH_CREDIT_RATE_MODULE = 'uah-credit-rate';
const DEFAULT_UAH_CREDIT_RATE = 1;
const USER_HISTORY_MAX_LIMIT = 1000;
const MAX_OFFSET = 2147483647;

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
            return res.status(200).json({ status: 200, data: [], serverNow: new Date().toISOString() });
        }

        const items = await StorageService.getStorageById(user_id, status, { limit, offset });

        return res.status(200).json({ status: 200, data: items, serverNow: new Date().toISOString() });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'storage.profile' });
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
        const requestedAt = new Date();

        await sequelize.transaction(async (t) => {
            const { user_receiveInfo } = await UserService.getUserFullInfoById(user_id, { transaction: t });

            if (!user_receiveInfo || !String(user_receiveInfo).trim()) {
                const err = new Error(MESSAGE.ITEM.RECEIVE_INFO_REQUIRED);
                err.code = 'NO_RECEIVE_INFO';
                throw err;
            }

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

        return res.status(200).json({
            status: 200,
            completesAt: WithdrawalService.completesAt(requestedAt).toISOString(),
            serverNow: new Date().toISOString(),
        });
    } catch (e) {
        if (e && e.code === 'NOT_RECEIVABLE') {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }
        if (e && e.code === 'NO_RECEIVE_INFO') {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.RECEIVE_INFO_REQUIRED });
        }
        return answerFailure(res, e, { status: 500, where: 'storage.withdraw' });
    }
};

module.exports.cancelWithdrawalByStorageId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { user_id } = req.user.profile;
        const { id } = req.params;

        await sequelize.transaction(async (t) => {
            const pending = await StorageService.getStorageInfoById(user_id, id, 'waitingtrade', {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!pending) {
                const err = new Error(MESSAGE.ITEM.WITHDRAW_NOT_PENDING);
                err.code = 'NOT_PENDING';
                throw err;
            }

            await StorageService.setStorageStatusById(id, 'inventory', { transaction: t });
            await StorageService.setStorageExtraDataById(id, null, { transaction: t });
        });

        return res.status(200).json({ status: 200 });
    } catch (e) {
        if (e && e.code === 'NOT_PENDING') {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.WITHDRAW_NOT_PENDING });
        }
        return answerFailure(res, e, { status: 500, where: 'storage.withdraw-cancel' });
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
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NO_PRICE });
        }

        const rateModule = await ModuleService.findModuleById(UAH_CREDIT_RATE_MODULE);

        if (!rateModule) {
            console.log('[SELL] uah-credit-rate module not found, using rate', DEFAULT_UAH_CREDIT_RATE);
        }

        const rate = rateModule ? rateModule.extraData : DEFAULT_UAH_CREDIT_RATE;

        console.log('[SELL] Rate extraData:', rate);

        const actualPrice = salePayout(price, parseFloat(rate));

        console.log('[SELL] actualPrice:', actualPrice);

        if (!actualPrice) {
            return res.status(422).json({ status: 422, message: MESSAGE.ITEM.NOT_EXIST });
        }

        await sequelize.transaction(async (t) => {
            await UserService.lockUsersInIdOrder([user_id], t);
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
        return answerFailure(res, e, { status: 500, where: 'storage.sell' });
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
        const { uniqueCases, bestDrop } = await StorageService.getDropStatsByUserId(id);

        return res.status(200).json({
            status: 200, data: result, uniqueCases, bestDrop,
        });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'storage.count' });
    }
};

module.exports.getStorageLastItems = async (req, res) => {
    try {
        const { limit } = req.params;

        const items = await StorageService.getStorageLastItems(limit);

        return res.status(200).json({ status: 200, data: items });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'storage.list' });
    }
};

const listByKey = (keys, found) => Object.fromEntries(keys.map((key) => [key, found.get(String(key)) || null]));

module.exports.getStorageLastItemsWithUserInfo = async (req, res) => {
    try {
        const { limit } = req.params;
        const items = await StorageService.getStorageLastItems(limit);
        const distinct = (field) => [...new Set(items.map((item) => item[field]))];
        const itemIds = distinct('storage_itemId');
        const userIds = distinct('storage_userId');
        const caseIds = distinct('storage_caseId');

        const itemsById = itemIds.length ? await ItemService.getItemsWithPrices(itemIds) : {};
        const users = await UserService.getUsersByIds(userIds);
        const cases = await CaseService.getCasesByIds(caseIds);

        const itemList = listByKey(itemIds, new Map(Object.entries(itemsById)));
        const userList = listByKey(userIds, new Map(users.map((user) => [String(user.user_id), user])));
        const caseList = listByKey(caseIds, new Map(cases.map((caseRow) => [String(caseRow.case_id), caseRow])));

        return res.status(200).json({ status: 200, data: items, userList, caseList, itemList });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'storage.list-userinfo' });
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
        return answerFailure(res, e, { status: 500, where: 'storage.user-history' });
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
        return answerFailure(res, e, { status: 500, where: 'storage.top' });
    }
};


module.exports.getFavoriteCaseByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;

        const favoriteCaseId = await StorageService.getFavoriteCaseIdByUserId(id);
        const caseInfo = favoriteCaseId === null ? null : await CaseService.getCaseById(favoriteCaseId);

        return res.status(200).json({ status: 200, data: caseInfo });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'storage.favorite' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'getStorageLastItemsByUserId': {
            return [
                check('id').exists().isInt({ min: 1 }),
                check('limit').exists().isInt({ min: 1, max: USER_HISTORY_MAX_LIMIT }),
                check('offset').exists().isInt({ min: 0, max: MAX_OFFSET }),
            ];
        }
        case 'getStorageTop': {
            return [
                check('limit').exists().isInt({ min: 0 }),
                check('offset').exists().isInt({ min: 0 }),
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
        case 'cancelWithdrawalByStorageId': {
            return [
                check('id').exists().isInt({ min: 1 }),
            ];
        }
        default:
            break;
    }
};
