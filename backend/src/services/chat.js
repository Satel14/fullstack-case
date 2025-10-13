const RedisManager = require("../redis/manager");
const {v4: uuidv4} = require('uuid');
const {normalizeChatMessagesFromRedis} = require('../helpers/chat');
const MAXIMUM_SEND_MESSAGES = 26;


module.exports.add = async (data) => {
    try {
        const id = uuidv4();

        await RedisManager.addDataHashWithKey(
            "chat_hash",
            id,
            JSON.stringify(data)
        )
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.get = async () => {
    try {
        let lastMessages = (await RedisManager.getAllDataWithKey("chat_hash")) || [];

        if (Object.keys(lastMessages).length > 1) {
            lastMessages = normalizeChatMessagesFromRedis(lastMessages);
        }

        const list = Array.isArray(lastMessages) ?
            lastMessages.slice(
                lastMessages.length - MAXIMUM_SEND_MESSAGES,
                lastMessages.length + 1
            )
            : [];

        return list;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.clean = async () => {
    try {
        const lastMessages = (await RedisManager.getAllDataWithKey("chat_hash")) || [];

        const MAXIMUM_CAN_SAVE = 500;

        if (Object.keys(lastMessages).length > MAXIMUM_CAN_SAVE) {
            await RedisManager.cleanDataHashWithKey("chat_hash")
        }
        return;
    } catch (e) {
        throw Error(e.message);
    }
}