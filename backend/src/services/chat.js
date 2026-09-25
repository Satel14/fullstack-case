const RedisManager = require("../redis/manager");
const { parseChatMessage } = require('../helpers/chat');

const CHAT_LIST = "chat_messages";
const LEGACY_CHAT_HASH = "chat_hash";
const MAXIMUM_SEND_MESSAGES = 26;
const MAXIMUM_STORED_MESSAGES = 500;

const adoptLegacyHistory = () => RedisManager.adoptLegacyHash(LEGACY_CHAT_HASH, CHAT_LIST, MAXIMUM_STORED_MESSAGES);

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
