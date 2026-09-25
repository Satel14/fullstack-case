const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const config = fs.readFileSync(path.join(__dirname, '..', '..', 'nginx', 'default.conf'), 'utf8');

const location = (prefix) => {
    const start = config.indexOf(`location ${prefix} {`);
    assert.ok(start !== -1, `nginx has no location ${prefix}`);
    return config.slice(start, config.indexOf('}', start));
};

test('nginx proxies Socket.IO to the backend with the WebSocket upgrade', () => {
    const block = location('/socket.io/');
    assert.match(block, /proxy_pass\s+http:\/\/backend;/);
    assert.match(block, /proxy_http_version\s+1\.1;/);
    assert.match(block, /proxy_set_header\s+Upgrade\s+\$http_upgrade;/);
    assert.match(block, /proxy_set_header\s+Connection\s+"upgrade";/);
    assert.match(block, /proxy_set_header\s+X-Forwarded-For\s+\$remote_addr;/);
});

test('nginx overwrites X-Forwarded-For on the API route, so a client cannot prepend its own', () => {
    assert.match(location('/api'), /proxy_set_header\s+X-Forwarded-For\s+\$remote_addr;/);
});
