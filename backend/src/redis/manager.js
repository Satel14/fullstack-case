const redis = require('redis');
const client = redis.createClient(6379);

const InsiderPricesService = require("./../services/insiderPrices");
const ItemService = require("./../services/item");
const ITEM_HASH = "item_hash";


const addDataHashWithKey = async (key, id, data) => {
    client.hmset(key, id, data);
}

const setDataHashWithKey = async (key, data) => {
    client.hmset(key, data);
};


const cleanDataHashWithKey = async (key) => {
    client.del(key)
};

const getAllDataHashWithKey = (key) => {
    return new Promise((resv, rej) => {
        client.hgetall(key, (err, reply) => {
            resv(reply);
        })
    })
}

async function initialRedisState() {
    // Clean
    await cleanDataHashWithKey(ITEM_HASH);
    // Load Prices to state
    const promises = [];
    const itemPricesArray = await InsiderPricesService.getAllItems();
    const items = await ItemService.getAllItems();

    for (const key in items) {
        const element = items[key];

        if (!element.item_name) {
            continue;
        }

        const findedPrice = itemPricesArray.find(
            (v) => v.name === element.item_name
        );

        if (
            !findedPrice ||
            !Object.hasOwnProperty.call(findedPrice, "pricesInCredits")
        ) {
            continue;
        }

        promises.push(
            await addDataHashWithKey(
                ITEM_HASH,
                element.item_itemId,
                JSON.stringify({
                    name: element.item_name,
                    rare: element.item_rare,
                    type: element.item_type,
                    pricesInCredits: findedPrice.pricesInCredits,
                })
            )
        );
    }

    await Promise.all(promises);
    console.log("[Redis] Items Loaded");
}

client.on("connect", async function() {
    console.log('[Redis] Redis Connected');
    await initialRedisState();
});

module.exports = {
    addDataHashWithKey,
    getAllDataHashWithKey,
    setDataHashWithKey,
    cleanDataHashWithKey,
};
