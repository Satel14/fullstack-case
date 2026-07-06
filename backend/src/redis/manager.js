const redis = require('redis');
const redisHost = process.env.REDIS_HOST || (process.env.NODE_ENV === 'production' ? 'redis' : 'localhost');
const client = redis.createClient(6379, redisHost);

const InsiderPricesService = require("./../services/insiderPrices");
const ItemService = require("./../services/item");
const ITEM_HASH = "item_hash";


const addDataHashWithKey = (key, id, data) => new Promise((resolve, reject) => {
    client.hmset(key, id, data, (err, reply) => (err ? reject(err) : resolve(reply)));
});

const setDataHashWithKey = async (key, data) => {
    client.hmset(key, data);
};


const cleanDataHashWithKey = async (key) => {
    client.del(key)
};

const getAllDataHashWithKey = (key) => {
    return new Promise((resv, rej) => {
        client.hgetall(key, (err, reply) => {
            if (err) return rej(err);
            return resv(reply);
        })
    })
}

async function initialRedisState() {
    await cleanDataHashWithKey(ITEM_HASH);
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
            addDataHashWithKey(
                ITEM_HASH,
                element.item_itemId,
                JSON.stringify({
                    name: element.item_name,
                    rare: element.item_rare,
                    type: element.item_type,
                    item_imagePath: element.item_imagePath,
                    pricesInCredits: findedPrice.pricesInCredits,
                })
            )
        );
    }

    await Promise.all(promises);
    console.log("[Redis] Items Loaded");
}

client.on("connect", async function () {
    console.log('[Redis] Redis Connected');
});

module.exports = {
    addDataHashWithKey,
    getAllDataHashWithKey,
    setDataHashWithKey,
    cleanDataHashWithKey,
    initialRedisState,
};
