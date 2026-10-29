const Item = require("../models/item");
const sequelize = require("../config/db");
const MESSAGE = require("../constant/responseMessages");
const InsiderService = require("./insiderPrices");

module.exports.findItemById = async (itemId) => {
    const data = await Item.findByPk(itemId);
    return data ? data.dataValues : null;
};

module.exports.getItemById = async (itemId) => {
    try {
        const data = await module.exports.findItemById(itemId);

        if (!data) {
            throw new Error(MESSAGE.ITEM.NOT_EXIST);
        }

        return data;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getItemWithPrices = async (itemId) => {
    const itemInfo = await module.exports.getItemById(itemId);

    let pricesInCredits = null;
    const prices = await InsiderService.getItemPrice(itemInfo.item_name);
    if (prices && prices.pricesInCredits) {
        pricesInCredits = JSON.parse(prices.pricesInCredits);
    }

    return { ...itemInfo, pricesInCredits };
};

const parsePrices = (raw) => {
    if (!raw) {
        return null;
    }
    if (typeof raw !== "string") {
        return raw;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
};

module.exports.getItemsWithPrices = async (itemIds) => {
    const items = await Item.findAll({ where: { item_itemId: itemIds } });

    if (!items.length) {
        return {};
    }

    const [prices] = await sequelize.query(
        "SELECT items.itemId, insider_prices.pricesInCredits FROM items "
        + "JOIN insider_prices ON insider_prices.name = items.name WHERE items.itemId IN (?)",
        { replacements: [itemIds] },
    );
    const pricesById = new Map(prices.map((row) => [row.itemId, row.pricesInCredits]));

    return Object.fromEntries(items.map((item) => [
        item.item_itemId,
        { ...item.dataValues, pricesInCredits: parsePrices(pricesById.get(item.item_itemId)) },
    ]));
};

module.exports.getAllItems = async () => {
    try {
        const items = await Item.findAll({});
        const array = [];
        // eslint-disable-next-line lodash/prefer-lodash-method
        items.forEach((element) => {
            if (!array.includes(element.dataValues)) {
                array.push(element.dataValues);
            }
        });

        return array;
    } catch (e) {
        throw Error(e.message);
    }
};