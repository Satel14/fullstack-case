const http = require('node:http');

const HEALTHCHECK_TIMEOUT_MS = 2000;

const checkHealth = ({ port = process.env.SERVER_PORT || 3003, timeoutMs = HEALTHCHECK_TIMEOUT_MS } = {}) => new Promise((resolve) => {
    let request;
    let finished = false;
    const finish = (healthy) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadline);
        resolve(healthy);
    };
    const deadline = setTimeout(() => {
        finish(false);
        if (request) request.destroy();
    }, timeoutMs);
    try {
        request = http.get({ host: '127.0.0.1', port, path: '/api/health', agent: false }, (response) => {
            response.resume();
            response.once('end', () => finish(response.statusCode === 200));
            response.once('error', () => finish(false));
        });
        request.once('error', () => finish(false));
    } catch (e) {
        finish(false);
    }
});

if (require.main === module) {
    checkHealth().then((healthy) => { process.exitCode = healthy ? 0 : 1; });
}

module.exports = { checkHealth, HEALTHCHECK_TIMEOUT_MS };
