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

module.exports.getItemPrice = async (name) => {
    try {
        const itemData = await InsiderPrices.findByPk(name);
        if (!itemData) {
            console.log(`Item ${name} doesn't have on database.`);
            return null;
        }

        return itemData.dataValues;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.addItem = async (name, pricesInCredits) => {
    try {
        const item = {
            name,
            pricesInCredits: JSON.stringify(pricesInCredits),
        };

        const itemData = await InsiderPrices.findByPk(name);

        if (!itemData) {
            await InsiderPrices.create(item);
            return;
        }

        await InsiderPrices.update(
            {
                pricesInCredits: JSON.stringify(pricesInCredits),
            },
            { where: { name } }
        );

        return;
    } catch (e) {
        throw Error(e.message);
    }
};
