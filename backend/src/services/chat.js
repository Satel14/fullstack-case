const RedisManager = require("../redis/manager");
const { parseChatMessage } = require('../helpers/chat');

const CHAT_LIST = "chat_messages";
const LEGACY_CHAT_HASH = "chat_hash";
const MAXIMUM_SEND_MESSAGES = 26;
const MAXIMUM_STORED_MESSAGES = 500;

const OVERSIZED_LEGACY_CHAT_HASH = "chat_hash:oversized";
const LARGEST_LEGACY_CHAT_HASH = 10000;

const adoptLegacyHistory = async () => {
    const kept = await RedisManager.adoptLegacyHash(
        LEGACY_CHAT_HASH, CHAT_LIST, OVERSIZED_LEGACY_CHAT_HASH, MAXIMUM_STORED_MESSAGES, LARGEST_LEGACY_CHAT_HASH
    );
    if (kept === -1) {
        console.warn(`[Chat] ${LEGACY_CHAT_HASH} holds more than ${LARGEST_LEGACY_CHAT_HASH} messages; set aside as ${OVERSIZED_LEGACY_CHAT_HASH} instead of carried over`);
    } else if (kept === -2) {
        console.warn(`[Chat] ${LEGACY_CHAT_HASH} holds more than ${LARGEST_LEGACY_CHAT_HASH} messages and ${OVERSIZED_LEGACY_CHAT_HASH} already exists; both left in place`);
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
