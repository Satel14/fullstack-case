const redis = require('redis');
const { loggable } = require('../helpers/failure');
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

const ping = () => new Promise((resolve, reject) => {
    client.ping((err, reply) => {
        if (err) return reject(err);
        if (reply !== 'PONG') return reject(new Error('Unexpected Redis PING response'));
        return resolve(reply);
    });
});

const quit = () => new Promise((resolve, reject) => {
    client.quit((err) => {
        client.end(true);
        if (err) return reject(err);
        return resolve();
    });
});

const InsiderPricesService = require("./../services/insiderPrices");
const ItemService = require("./../services/item");
const { buildItemHash, countUngraded } = require("./itemHash");
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

const REMOVE_LIST_MESSAGE_SCRIPT = [
    'local needle = \'"messageId":"\' .. ARGV[1] .. \'"\'',
    'for _, raw in ipairs(redis.call("LRANGE", KEYS[1], 0, -1)) do',
    '    if string.find(raw, needle, 1, true) then',
    '        redis.call("LREM", KEYS[1], 1, raw)',
    '        return raw',
    '    end',
    'end',
    'return false',
].join('\n');

const removeListMessage = (key, messageId) => new Promise((resolve, reject) => {
    client.eval(REMOVE_LIST_MESSAGE_SCRIPT, 1, key, messageId, (err, raw) => (err ? reject(err) : resolve(raw)));
});

const ADOPT_LEGACY_HASH_SCRIPT = [
    'local legacy, list, oversized = KEYS[1], KEYS[2], KEYS[3]',
    'local keep, largest = tonumber(ARGV[1]), tonumber(ARGV[2])',
    'local size = redis.call("HLEN", legacy)',
    'if size == 0 then return 0 end',
    'if size > largest then',
    '    if redis.call("RENAMENX", legacy, oversized) == 1 then return -1 end',
    '    return -2',
    'end',
    'local rows = {}',
    'for _, raw in ipairs(redis.call("HVALS", legacy)) do',
    '    local ok, message = pcall(cjson.decode, raw)',
    '    if ok and type(message) == "table" and next(message) ~= nil and message[1] == nil then',
    '        rows[#rows + 1] = { tonumber(message.time) or 0, raw }',
    '    end',
    'end',
    'if #rows == 0 then',
    '    redis.call("DEL", legacy)',
    '    return 0',
    'end',
    'table.sort(rows, function(a, b) return a[1] < b[1] end)',
    'local room = math.max(0, keep - redis.call("LLEN", list))',
    'local first = math.max(1, #rows - keep + 1)',
    'for i = #rows, first, -1 do redis.call("LPUSH", list, rows[i][2]) end',
    'redis.call("LTRIM", list, -keep, -1)',
    'redis.call("DEL", legacy)',
    'return math.min(#rows - first + 1, room)',
].join('\n');

const adoptLegacyHash = (legacyKey, listKey, oversizedKey, maxLength, largestLegacy) => new Promise((resolve, reject) => {
    client.eval(
        ADOPT_LEGACY_HASH_SCRIPT, 3, legacyKey, listKey, oversizedKey, maxLength, largestLegacy,
        (err, kept) => (err ? reject(err) : resolve(Number(kept))),
    );
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
    const ungraded = countUngraded(hash);
    if (ungraded > 0) {
        console.warn(`[Redis] ${ungraded} items have no grade and show without grade colours: run npm run seed, then restart the backend`);
    }
}

client.on("error", (err) => {
    console.error('[Redis]', loggable(err));
});

function startItemCacheSync() {
    let retryTimer = null;
    let stopped = false;
    let running = null;
    let reloadRequested = false;
    const load = () => {
        if (stopped) {
            return;
        }
        if (running) {
            reloadRequested = true;
            return;
        }
        clearTimeout(retryTimer);
        running = initialRedisState().catch((e) => {
            if (!stopped) {
                console.error(`[Redis] Items not loaded, retrying in ${CACHE_RELOAD_RETRY_MS / 1000}s:`, loggable(e));
                retryTimer = setTimeout(load, CACHE_RELOAD_RETRY_MS);
                retryTimer.unref();
            }
        }).finally(() => {
            running = null;
            if (reloadRequested && !stopped) {
                reloadRequested = false;
                load();
            }
        });
    };
    client.on("ready", load);
    if (client.ready) {
        load();
    }
    return {
        stop: () => {
            stopped = true;
            reloadRequested = false;
            clearTimeout(retryTimer);
            client.removeListener('ready', load);
            return running || Promise.resolve();
        },
    };
}

module.exports = {
    ping,
    quit,
    addDataHashWithKey,
    getAllDataHashWithKey,
    setDataHashWithKey,
    cleanDataHashWithKey,
    appendToCappedList,
    getListRange,
    removeListMessage,
    adoptLegacyHash,
    ADOPT_LEGACY_HASH_SCRIPT,
    initialRedisState,
    startItemCacheSync,
    clientOptions,
};
