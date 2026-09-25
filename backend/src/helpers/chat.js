function parseChatMessage(raw) {
    try {
        const message = JSON.parse(raw);
        return message && typeof message === 'object' && !Array.isArray(message) ? message : null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    parseChatMessage,
};
