const { randomUUID } = require('crypto');
const RedisManager = require("../redis/manager");
const { parseChatMessage, keepNewestMessages } = require('../helpers/chat');

const CHAT_LIST = "chat_messages";
const LEGACY_CHAT_HASH = "chat_hash";
const MAXIMUM_SEND_MESSAGES = 26;
const MAXIMUM_STORED_MESSAGES = 500;
const LEGACY_SCAN_COUNT = 500;
const ADOPTING_PREFIX = `${LEGACY_CHAT_HASH}:adopting:`;
const ABANDONED_CLAIM_MS = 10 * 60 * 1000;

let claimedKey = null;

const claimAge = (key) => Date.now() - Number(key.slice(ADOPTING_PREFIX.length).split(':')[0]);

const claimLegacyHistory = async () => {
    if (claimedKey && await RedisManager.keyExists(claimedKey)) {
        return claimedKey;
    }
    const mine = `${ADOPTING_PREFIX}${Date.now()}:${randomUUID()}`;
    if (await RedisManager.renameIfExists(LEGACY_CHAT_HASH, mine)) {
        claimedKey = mine;
        return mine;
    }
    const abandoned = (await RedisManager.scanKeys(`${ADOPTING_PREFIX}*`))
        .filter((key) => claimAge(key) > ABANDONED_CLAIM_MS);
    for (const key of abandoned) {
        if (await RedisManager.renameIfExists(key, mine)) {
            claimedKey = mine;
            return mine;
        }
    }
    return null;
};

const adoptLegacyHistory = async () => {
    const claimed = await claimLegacyHistory();
    if (!claimed) {
        return;
    }

    let cursor = '0';
    let newest = [];

    do {
        const page = await RedisManager.scanHash(claimed, cursor, LEGACY_SCAN_COUNT);
        cursor = String(page.cursor);
        newest = keepNewestMessages(newest, page.entries, MAXIMUM_STORED_MESSAGES);
    } while (cursor !== '0');

    await RedisManager.moveIntoCappedList(
        claimed,
        CHAT_LIST,
        newest.map(([, message]) => JSON.stringify(message)),
        MAXIMUM_STORED_MESSAGES
    );
};

let legacyAdoption = null;

const adoptLegacyHistoryOnce = () => {
    if (!legacyAdoption) {
        legacyAdoption = adoptLegacyHistory().catch((e) => {
            legacyAdoption = null;
            throw e;
        });
    }
    return legacyAdoption;
};

module.exports.add = async (data) => {
    await adoptLegacyHistoryOnce();
    await RedisManager.appendToCappedList(CHAT_LIST, JSON.stringify(data), MAXIMUM_STORED_MESSAGES);
}

module.exports.get = async () => {
    await adoptLegacyHistoryOnce();
    const entries = await RedisManager.getListRange(CHAT_LIST, -MAXIMUM_SEND_MESSAGES, -1);
    return (entries || []).map(parseChatMessage).filter(Boolean);
}
