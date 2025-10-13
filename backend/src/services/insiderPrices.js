const InsiderPrices = require("../models/insiderPrices");

// todo getItemColors (user on case random)

module.exports.getAllItems = async () => {
    try {
        const itemPrices = await InsiderPrices.findAll({
            attributes: ["name", "pricesInCredits"],
        });
        const array = [];
        // eslint-disable-next-line lodash/prefer-lodash-method
        itemPrices.forEach((element) => {
            if (!array.includes(element.dataValues)) {
                array.push(element.dataValues);
            }
        });

        return array;
    } catch (e) {
        throw Error(e.message);
    }
};