const { EventEmitter } = require('node:events');

const listRange = (list, start, stop) => {
    const length = list.length;
    const from = Math.max(Number(start) < 0 ? length + Number(start) : Number(start), 0);
    const to = Math.min(Number(stop) < 0 ? length + Number(stop) : Number(stop), length - 1);
    return from > to ? [] : list.slice(from, to + 1);
};

const createFakeRedis = () => {
    const store = new Map();
    const log = [];

    const hashAt = (key) => {
        if (!store.has(key)) {
            store.set(key, new Map());
        }
        return store.get(key);
    };
    const listAt = (key) => {
        if (!store.has(key)) {
            store.set(key, []);
        }
        return store.get(key);
    };

    const commands = {
        hmset(key, ...args) {
            const hash = hashAt(key);
            if (args.length === 1 && typeof args[0] === 'object') {
                Object.entries(args[0]).forEach(([field, value]) => hash.set(field, String(value)));
            } else {
                for (let i = 0; i < args.length; i += 2) {
                    hash.set(String(args[i]), String(args[i + 1]));
                }
            }
            return 'OK';
        },
        hgetall(key) {
            return store.has(key) ? Object.fromEntries(store.get(key)) : null;
        },
        hscan(key, cursor, countWord, count) {
            if (!store.has(key)) {
                return ['0', []];
            }
            const size = String(countWord).toUpperCase() === 'COUNT' ? Number(count) : 10;
            const all = [...store.get(key)];
            const from = Number(cursor);
            const next = from + size >= all.length ? '0' : String(from + size);
            return [next, all.slice(from, from + size).flat()];
        },
        del(...keys) {
            return keys.filter((key) => store.delete(key)).length;
        },
        rename(key, newKey) {
            if (!store.has(key)) {
                throw new Error('ERR no such key');
            }
            store.set(newKey, store.get(key));
            store.delete(key);
            return 'OK';
        },
        scan(cursor, ...args) {
            const matchAt = args.findIndex((a) => String(a).toUpperCase() === 'MATCH');
            const pattern = matchAt === -1 ? '*' : String(args[matchAt + 1]);
            const matches = pattern.endsWith('*')
                ? (key) => key.startsWith(pattern.slice(0, -1))
                : (key) => key === pattern;
            return ['0', [...store.keys()].filter(matches)];
        },
        exists(key) {
            return store.has(key) ? 1 : 0;
        },
        rpush(key, ...values) {
            const list = listAt(key);
            list.push(...values.map(String));
            return list.length;
        },
        lpush(key, ...values) {
            const list = listAt(key);
            values.forEach((value) => list.unshift(String(value)));
            return list.length;
        },
        ltrim(key, start, stop) {
            if (store.has(key)) {
                const kept = listRange(store.get(key), start, stop);
                if (kept.length) {
                    store.set(key, kept);
                } else {
                    store.delete(key);
                }
            }
            return 'OK';
        },
        lrange(key, start, stop) {
            return listRange(store.get(key) || [], start, stop);
        },
        llen(key) {
            return (store.get(key) || []).length;
        },
    };

    const run = (name, args) => {
        const reply = commands[name](...args);
        let size = 0;
        if (Array.isArray(reply)) {
            size = name === 'hscan' ? reply[1].length / 2 : reply.length;
        } else if (reply && typeof reply === 'object') {
            size = Object.keys(reply).length;
        }
        log.push({ name, key: args[0], size });
        return reply;
    };

    const client = new EventEmitter();
    client.ready = true;
    client.connected = true;
    Object.keys(commands).forEach((name) => {
        client[name] = (...args) => {
            const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
            let reply;
            let error = null;
            try {
                reply = run(name, args);
            } catch (e) {
                error = e;
            }
            if (callback) {
                setImmediate(() => callback(error, error ? undefined : reply));
            }
            return true;
        };
    });
    client.multi = () => {
        const queued = [];
        const chain = {
            exec(callback) {
                const replies = queued.map(([name, args]) => run(name, args));
                setImmediate(() => callback(null, replies));
            },
        };
        Object.keys(commands).forEach((name) => {
            chain[name] = (...args) => {
                queued.push([name, args]);
                return chain;
            };
        });
        return chain;
    };

    const entriesAt = (key) => {
        const value = store.get(key);
        if (!value) {
            return 0;
        }
        return Array.isArray(value) ? value.length : value.size;
    };

    return {
        client, store, log, entriesAt,
    };
};

module.exports = { createFakeRedis };
