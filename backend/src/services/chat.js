const RedisManager = require("../redis/manager");
const { parseChatMessage, keepNewestMessages } = require('../helpers/chat');

const CHAT_LIST = "chat_messages";
const LEGACY_CHAT_HASH = "chat_hash";
const MAXIMUM_SEND_MESSAGES = 26;
const MAXIMUM_STORED_MESSAGES = 500;
const LEGACY_SCAN_COUNT = 500;

const adoptLegacyHistory = async () => {
    let cursor = '0';
    let found = false;
    let newest = [];

    do {
        const page = await RedisManager.scanHash(LEGACY_CHAT_HASH, cursor, LEGACY_SCAN_COUNT);
        cursor = String(page.cursor);
        found = found || page.entries.length > 0;
        newest = keepNewestMessages(newest, page.entries, MAXIMUM_STORED_MESSAGES);
    } while (cursor !== '0');

    if (found) {
        await RedisManager.moveIntoCappedList(
            LEGACY_CHAT_HASH,
            CHAT_LIST,
            newest.map(([, message]) => JSON.stringify(message)),
            MAXIMUM_STORED_MESSAGES
        );
    }
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
