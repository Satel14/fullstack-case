const Item = require("../models/item");
const MESSAGE = require("../constant/responseMessages");
const InsiderService = require("./insiderPrices");

module.exports.getItemById = async (itemId) => {
    try {
        const data = await Item.findByPk(itemId);

        if (!data) {
            throw new Error(MESSAGE.ITEM.NOT_EXIST);
        }

        return data.dataValues;
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