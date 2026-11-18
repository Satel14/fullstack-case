const { loggable } = require('./helpers/failure');

const SHUTDOWN_TIMEOUT_MS = 10000;
const REPEATED_SIGNAL_MS = 1000;
const UPGRADE_GRACE_MS = 1000;

const close = (target) => new Promise((resolve, reject) => {
    if (!target) {
        return resolve();
    }
    const complete = (error) => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve();
    try {
        const closing = target.close(complete);
        if (closing && typeof closing.catch === 'function') {
            closing.catch(complete);
        }
    } catch (e) {
        complete(e);
    }
});

const trackUpgrades = (server) => {
    const sockets = new Set();
    server.on('upgrade', (req, socket) => {
        sockets.add(socket);
        socket.once('close', () => sockets.delete(socket));
    });
    return sockets;
};

const installShutdown = ({
    health, getResources, redis, sequelize, processRef = process,
    deadlineMs = SHUTDOWN_TIMEOUT_MS, log = (line) => console.warn(line), timers = globalThis, now = () => Date.now(),
}) => {
    let stopping = false;
    let startedAt = 0;
    let exited = false;
    let deadline;
    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const signals = ['SIGTERM', 'SIGINT'];
    const handlers = new Map();
    const safeError = (e) => loggable(e).replace(/[\r\n]+/g, ' ');

    const finish = (code, reason) => {
        if (exited) {
            return;
        }
        exited = true;
        timers.clearTimeout(deadline);
        handlers.forEach((handler, signal) => processRef.removeListener(signal, handler));
        log(code === 0 ? '[shutdown] complete' : `[shutdown] forced: ${reason}`);
        resolveFinished(code);
        processRef.exit(code);
    };

    const cleanup = async () => {
        const errors = [];
        const attempt = async (name, run) => {
            if (exited) {
                return;
            }
            try {
                await run();
            } catch (e) {
                errors.push(`${name}: ${safeError(e)}`);
            }
        };
        const {
            server, io, sweeps = [], cacheSync, upgraded,
        } = getResources();
        const drained = attempt('HTTP', () => close(server));
        const cutStragglers = upgraded
            ? timers.setTimeout(() => upgraded.forEach((socket) => socket.destroy()), UPGRADE_GRACE_MS)
            : null;
        await attempt('Socket.IO', () => close(io));
        await drained;
        timers.clearTimeout(cutStragglers);
        await Promise.all(sweeps.filter(Boolean).map((sweep) => attempt('sweep', () => sweep.stop())));
        await attempt('item cache', () => cacheSync && cacheSync.stop());
        await attempt('Redis', () => redis.quit());
        await attempt('MySQL', () => sequelize.close());
        finish(errors.length ? 1 : 0, errors.join('; '));
    };

    const shutdown = (signal = 'manual') => {
        if (stopping) {
            if (now() - startedAt >= REPEATED_SIGNAL_MS) {
                finish(1, `second signal ${signal}`);
            }
            return finished;
        }
        stopping = true;
        startedAt = now();
        health.stop();
        log(`[shutdown] starting: ${signal}`);
        deadline = timers.setTimeout(() => finish(1, 'deadline exceeded'), deadlineMs);
        cleanup().catch((e) => finish(1, safeError(e)));
        return finished;
    };

    signals.forEach((signal) => {
        const handler = () => shutdown(signal);
        handlers.set(signal, handler);
        processRef.on(signal, handler);
    });

    return { shutdown, finished, isStopping: () => stopping };
};

module.exports = { installShutdown, trackUpgrades, SHUTDOWN_TIMEOUT_MS };
