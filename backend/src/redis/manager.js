const redis = require('redis');
const redisHost = process.env.REDIS_HOST || (process.env.NODE_ENV === 'production' ? 'redis' : 'localhost');
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const RETRY_MAX_DELAY_MS = 5000;
const CACHE_RELOAD_RETRY_MS = 5000;
const LARGEST_TIMER_MS = 2147483647;

const retryStrategy = ({ attempt, error }) => {
    if (attempt === 1) {
        console.error(`[Redis] ${redisHost}:${redisPort} unavailable, retrying: ${error ? error.message : 'connection lost'}`);
    }
    return Math.min(attempt * 200, RETRY_MAX_DELAY_MS);
};

const clientOptions = {
    enable_offline_queue: false,
    retry_strategy: retryStrategy,
    connect_timeout: LARGEST_TIMER_MS,
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
};

const client = redis.createClient(redisPort, redisHost, clientOptions);

const InsiderPricesService = require("./../services/insiderPrices");
const ItemService = require("./../services/item");
const { buildItemHash } = require("./itemHash");
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
    const itemPricesArray = await InsiderPricesService.getAllItems();
    const items = await ItemService.getAllItems();
    const hash = buildItemHash(items, itemPricesArray);

    const transaction = client.multi().del(ITEM_HASH);
    if (Object.keys(hash).length > 0) {
        transaction.hmset(ITEM_HASH, hash);
    }
    await new Promise((resolve, reject) => {
        transaction.exec((err, replies) => (err ? reject(err) : resolve(replies)));
    });
    console.log("[Redis] Items Loaded");
}

client.on("connect", async function () {
    console.log('[Redis] Redis Connected');
});

client.on("error", (err) => {
    console.error('[Redis]', err.message);
});

function startItemCacheSync() {
    let retryTimer = null;
    const load = () => {
        clearTimeout(retryTimer);
        initialRedisState().catch((e) => {
            console.error(`[Redis] Items not loaded, retrying in ${CACHE_RELOAD_RETRY_MS / 1000}s:`, e.message);
            retryTimer = setTimeout(load, CACHE_RELOAD_RETRY_MS);
        });
    };
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
    clientOptions,
};
