const { check, validationResult } = require("express-validator");
const MESSAGE = require('../constant/responseMessages');
const ItemService = require('../services/item');
const InsiderService = require('../services/insiderPrices');
const RedisManager = require('../redis/manager');

const ITEM_HASH = "item_hash";

module.exports.getItemById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;
        const itemInfo = await ItemService.getItemById(id);

        return res.status(200).json({
            status: 200,
            data: itemInfo,
        });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.getItemPriceById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;

        const itemInfo = await ItemService.getItemById(id);
        let prices = await InsiderService.getItemPrice(itemInfo.item_name);

        if (prices) {
            if (prices.pricesInCredits) {
                prices = JSON.parse(prices.pricesInCredits);
            }
        }

        return res.status(200).json({
            status: 200,
            prices,
        });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.getItemList = async (req, res) => {
    try {
        const allItems = await RedisManager.getAllDataHashWithKey(ITEM_HASH);
        const newItemList = [];

        for (const key in allItems) {
            const element = JSON.parse(allItems[key]);
            newItemList.push({
                ...element,
                id: parseInt(key, 10),
                pricesInCredits: normalizeColors(
                    JSON.parse(element.pricesInCredits)
                ),
            });
        }

        return res.status(200).json({
            status: 200,
            data: newItemList,
        });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case "getItemById": {
            return [check("id").exists()];
        }
        case "getItemPriceById": {
            return [check("id").exists()];
        }
        default:
            break;
    }
};

function normalizeColors(colors) {
    for (const color in colors) {
        const colorPrice = colors[color];

        if (!colorPrice) {
            delete colors[color];
        }
    }

    return colors;
}