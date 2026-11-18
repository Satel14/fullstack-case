const HEALTH_TIMEOUT_MS = 1000;

const createProbe = (run, timeoutMs, signal) => {
    let pending = null;
    return () => {
        if (pending) {
            return pending;
        }
        const work = Promise.resolve().then(() => signal.aborted ? undefined : run());
        pending = new Promise((resolve) => {
            const finish = (state) => {
                clearTimeout(timer);
                signal.removeEventListener('abort', abort);
                resolve(state);
            };
            const abort = () => finish('fail');
            const timer = setTimeout(abort, timeoutMs);
            signal.addEventListener('abort', abort, { once: true });
            work.then(() => finish('ok'), () => finish('fail'));
        });
        const release = () => { pending = null; };
        work.then(release, release);
        return pending;
    };
};

const createHealth = ({ checkDb, checkRedis, timeoutMs = HEALTH_TIMEOUT_MS }) => {
    const controller = new AbortController();
    const dbProbe = createProbe(checkDb, timeoutMs, controller.signal);
    const redisProbe = createProbe(checkRedis, timeoutMs, controller.signal);
    const stopping = { statusCode: 503, body: { status: 'stopping' } };
    let checking = null;
    return {
        stop: () => controller.abort(),
        check: () => {
            if (controller.signal.aborted) {
                return Promise.resolve(stopping);
            }
            if (!checking) {
                checking = Promise.all([dbProbe(), redisProbe()]).then(([db, redis]) => {
                    if (controller.signal.aborted) {
                        return stopping;
                    }
                    return {
                        statusCode: db === 'ok' ? 200 : 503,
                        body: { status: db === 'fail' ? 'fail' : redis === 'fail' ? 'degraded' : 'ok', db, redis },
                    };
                }).finally(() => { checking = null; });
            }
            return checking;
        },
    };
};

module.exports = { createHealth, HEALTH_TIMEOUT_MS };
