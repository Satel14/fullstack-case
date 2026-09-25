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

const appendToCappedList = (key, value, maxLength) => new Promise((resolve, reject) => {
    client.multi()
        .rpush(key, value)
        .ltrim(key, -maxLength, -1)
        .exec((err, replies) => (err ? reject(err) : resolve(replies)));
});

const getListRange = (key, start, stop) => new Promise((resolve, reject) => {
    client.lrange(key, start, stop, (err, reply) => (err ? reject(err) : resolve(reply)));
});

const scanHash = (key, cursor, count) => new Promise((resolve, reject) => {
    client.hscan(key, cursor, 'COUNT', count, (err, reply) => {
        if (err) return reject(err);
        const [next, flat] = reply;
        const entries = [];
        for (let i = 0; i < flat.length; i += 2) {
            entries.push([flat[i], flat[i + 1]]);
        }
        return resolve({ cursor: next, entries });
    });
});

const renameIfExists = (fromKey, toKey) => new Promise((resolve, reject) => {
    client.rename(fromKey, toKey, (err) => {
        if (!err) {
            resolve(true);
        } else if (/no such key/i.test(err.message)) {
            resolve(false);
        } else {
            reject(err);
        }
    });
});

const keyExists = (key) => new Promise((resolve, reject) => {
    client.exists(key, (err, reply) => (err ? reject(err) : resolve(Number(reply) > 0)));
});

const scanKeys = async (pattern) => {
    const keys = new Set();
    let cursor = '0';
    do {
        const reply = await new Promise((resolve, reject) => {
            client.scan(cursor, 'MATCH', pattern, 'COUNT', 500, (err, page) => (err ? reject(err) : resolve(page)));
        });
        cursor = String(reply[0]);
        reply[1].forEach((key) => keys.add(key));
    } while (cursor !== '0');
    return [...keys];
};

const moveIntoCappedList = (fromKey, listKey, values, maxLength) => new Promise((resolve, reject) => {
    const transaction = client.multi();
    if (values.length > 0) {
        transaction.lpush(listKey, ...[...values].reverse());
    }
    transaction
        .ltrim(listKey, -maxLength, -1)
        .del(fromKey)
        .exec((err, replies) => (err ? reject(err) : resolve(replies)));
});

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
    appendToCappedList,
    getListRange,
    scanHash,
    moveIntoCappedList,
    renameIfExists,
    keyExists,
    scanKeys,
    initialRedisState,
    startItemCacheSync,
    clientOptions,
};
