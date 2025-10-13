function normalizeChatMessagesFromRedis(arr) {
    const sorted = [];

    for (const key in arr) {
        const element = JSON.parse(arr[key]);
        sorted.push(element);
    }
    sorted.sort((a, b) => a.time - b.time);

    return sorted;
}

module.exports = {
    normalizeChatMessagesFromRedis,
};
