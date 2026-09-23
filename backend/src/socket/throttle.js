function createRateLimiter({ burst, refillMs, now = Date.now }) {
    const buckets = new Map();
    let lastPrune = now();

    const tokensAt = (bucket, at) => Math.min(burst, bucket.tokens + (at - bucket.at) / refillMs);

    const prune = (at) => {
        for (const [key, bucket] of buckets) {
            if (tokensAt(bucket, at) >= burst) {
                buckets.delete(key);
            }
        }
        lastPrune = at;
    };

    const take = (key) => {
        const at = now();
        if (at - lastPrune >= burst * refillMs) {
            prune(at);
        }
        const bucket = buckets.get(key);
        const tokens = bucket ? tokensAt(bucket, at) : burst;
        if (tokens < 1) {
            return false;
        }
        buckets.set(key, { tokens: tokens - 1, at });
        return true;
    };

    return { take, size: () => buckets.size };
}

module.exports = { createRateLimiter };
