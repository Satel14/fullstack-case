const { body, query, validationResult } = require('express-validator');
const ItemService = require('../services/item');
const UpgradeService = require('../services/upgrade');
const MESSAGE = require('../constant/responseMessages');
const { COLORS } = require('../constant/itemConfigs');
const { MYSQL_INT_MAX } = require('../constant/mysql');
const { withinChars } = require('../helpers/charLength');
const { answerFailure } = require('../helpers/failure');
const { toKop, MAX_STAKE_ITEMS, ROLL_SCALE } = require('../modules/upgradeFair');

const TARGET_COLORS = [COLORS.DEFAULT, COLORS.PAINTED];
const QUERY_FIELDS = ['minPrice', 'maxPrice', 'search', 'limit', 'offset'];
const DECIMAL_PRICE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

const priceBoundKop = (price, roundUp) => {
    const [whole, fraction = ''] = price.split('.');
    const kopiyky = BigInt(whole || '0') * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
    return kopiyky + (roundUp && /[1-9]/.test(fraction.slice(2)) ? 1n : 0n);
};

const pricedKop = (price) => {
    try {
        return toKop(price);
    } catch {
        return 0;
    }
};

module.exports.getTargets = async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const minKop = req.query.minPrice === undefined ? 0n : priceBoundKop(req.query.minPrice, true);
        const maxKop = req.query.maxPrice === undefined ? null : priceBoundKop(req.query.maxPrice, false);
        const search = (req.query.search || '').toLowerCase();
        const limit = Number(req.query.limit ?? 60);
        const offset = Number(req.query.offset ?? 0);
        const items = await ItemService.getAllItemsWithPrices();
        const targets = [];

        for (const item of items) {
            if (!(item.item_name || '').toLowerCase().includes(search)) {
                continue;
            }
            for (const color of TARGET_COLORS) {
                const priceKop = pricedKop(item.pricesInCredits?.[color]);
                if (priceKop <= 0 || BigInt(priceKop) < minKop || (maxKop !== null && BigInt(priceKop) > maxKop)) {
                    continue;
                }
                targets.push({
                    itemId: item.item_itemId, color, name: item.item_name,
                    grade: item.item_grade, imagePath: item.item_imagePath, priceKop,
                });
            }
        }

        targets.sort((a, b) => a.priceKop - b.priceKop || a.itemId - b.itemId
            || TARGET_COLORS.indexOf(a.color) - TARGET_COLORS.indexOf(b.color));
        const page = targets.slice(offset, offset + limit).map(({ priceKop, ...item }) => ({ ...item, price: priceKop / 100 }));
        return res.status(200).json({ status: 200, data: { items: page, total: targets.length } });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'upgrade.targets' });
    }
};

module.exports.upgrade = async (req, res) => {
    try {
        if (!validationResult(req).isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const { storageIds, targetItemId, targetColor, expectedThreshold } = req.body;
        const data = await UpgradeService.performUpgrade({
            userId: req.user.profile.user_id, storageIds, targetItemId: Number(targetItemId),
            targetColor, expectedThreshold: Number(expectedThreshold),
        });
        return res.status(200).json({ status: 200, data });
    } catch (e) {
        if (e && e.code === 'CHANCE_CHANGED') {
            return res.status(409).json({ status: 409, message: MESSAGE.UPGRADE.CHANCE_CHANGED, threshold: e.threshold });
        }
        return answerFailure(res, e, { status: 422, where: 'upgrade.perform' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'getTargets':
            return [
                query().custom((fields) => Object.keys(fields).every((field) => QUERY_FIELDS.includes(field))),
                query('minPrice').optional().isString().bail().custom((value) => value === value.trim() && DECIMAL_PRICE.test(value)),
                query('maxPrice').optional().isString().bail().custom((value) => value === value.trim() && DECIMAL_PRICE.test(value)),
                query('search').optional().isString().bail().trim().custom(withinChars(0, 64)),
                query('limit').optional().isString().bail().isInt({ min: 1, max: 100 }),
                query('offset').optional().isString().bail().isInt({ min: 0, max: MYSQL_INT_MAX }),
            ];
        case 'upgrade':
            return [
                body('storageIds').isArray({ min: 1, max: MAX_STAKE_ITEMS }).bail()
                    .custom((ids) => ids.every((id) => Number.isInteger(id) && id >= 1 && id <= MYSQL_INT_MAX)
                        && new Set(ids).size === ids.length),
                body('targetItemId').not().isArray().isInt({ min: 1, max: MYSQL_INT_MAX }),
                body('targetColor').not().isArray().isString().isIn(TARGET_COLORS),
                body('expectedThreshold').not().isArray().isInt({ min: 0, max: ROLL_SCALE }),
            ];
        default:
            return [];
    }
};
