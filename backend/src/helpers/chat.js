function parseChatMessage(raw) {
    try {
        const message = JSON.parse(raw);
        return message && typeof message === 'object' && !Array.isArray(message) ? message : null;
    } catch (e) {
        return null;
    }
}

function keepNewestMessages(kept, entries, limit) {
    const byField = new Map(kept);

    for (const [field, raw] of entries) {
        const message = parseChatMessage(raw);
        if (message && !byField.has(field)) {
            byField.set(field, message);
        }
    }

    return [...byField]
        .sort(([, a], [, b]) => (Number(a.time) || 0) - (Number(b.time) || 0))
        .slice(-limit);
}

module.exports = {
    parseChatMessage,
    keepNewestMessages,
};
