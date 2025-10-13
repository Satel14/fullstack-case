const Item = require("../models/item");
const MESSAGE = require("../constant/responseMessages");

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