const redis = require('redis');
const redisHost = process.env.REDIS_HOST || (process.env.NODE_ENV === 'production' ? 'redis' : 'localhost');
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const RETRY_MAX_DELAY_MS = 5000;

const retryStrategy = ({ attempt, error }) => {
    if (attempt === 1) {
        console.error(`[Redis] ${redisHost}:${redisPort} unavailable, retrying: ${error ? error.message : 'connection lost'}`);
    }
    return Math.min(attempt * 200, RETRY_MAX_DELAY_MS);
};

const client = redis.createClient(redisPort, redisHost, {
    enable_offline_queue: false,
    retry_strategy: retryStrategy,
});

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

client.on("error", (err) => {
    console.error('[Redis]', err.message);
});

function startItemCacheSync() {
    const load = () => initialRedisState().catch((e) => console.error('[Redis] Items not loaded:', e.message));
    client.on("ready", load);
    if (client.ready) {
        load();
    }
}

module.exports = {
    addDataHashWithKey,
    getAllDataHashWithKey,
    setDataHashWithKey,
    cleanDataHashWithKey,
    initialRedisState,
    startItemCacheSync,
};
