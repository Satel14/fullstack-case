function buildItemHash(items, prices) {
    const priceByName = new Map();
    for (const price of prices) {
        if (!priceByName.has(price.name)) {
            priceByName.set(price.name, price);
        }
    }

    const hash = {};
    for (const element of items) {
        if (!element.item_name) {
            continue;
        }
        const price = priceByName.get(element.item_name);
        if (!price || !Object.hasOwnProperty.call(price, 'pricesInCredits')) {
            continue;
        }
        hash[element.item_itemId] = JSON.stringify({
            name: element.item_name,
            rare: element.item_rare,
            type: element.item_type,
            item_imagePath: element.item_imagePath,
            pricesInCredits: price.pricesInCredits,
        });
    }
    return hash;
}

module.exports = { buildItemHash };
