const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { parseTrustProxy, DEFAULT_TRUST_PROXY } = require('../src/config/trustProxy');

const clientIp = (setting, socketAddress, forwardedFor) => {
    const app = express();
    app.set('trust proxy', setting);
    const req = Object.create(app.request);
    req.app = app;
    req.headers = forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor };
    req.socket = { remoteAddress: socketAddress };
    return req.ip;
};

const serverDefault = () => parseTrustProxy(undefined);

test('a direct client on a public address cannot choose its own IP with X-Forwarded-For', () => {
    for (const socket of ['203.0.113.7', '::ffff:203.0.113.7', '2001:db8::7']) {
        assert.strictEqual(clientIp(serverDefault(), socket, '10.9.8.246'), socket, `${socket} picked its key`);
        assert.strictEqual(clientIp(serverDefault(), socket, '198.51.100.9'), socket, `${socket} filled a victim's bucket`);
        assert.strictEqual(clientIp(serverDefault(), socket, '1.1.1.1, 2.2.2.2'), socket, `${socket} spoofed a chain`);
    }
});

test('nginx on the docker network and a proxy on the same host still forward the real client address', () => {
    for (const proxy of ['172.18.0.5', '::ffff:172.18.0.5', '10.0.0.4', '192.168.1.20', '127.0.0.1', '::1']) {
        assert.strictEqual(clientIp(serverDefault(), proxy, '203.0.113.7'), '203.0.113.7', `${proxy} is not trusted`);
    }
});

test('a spoofed entry in front of the real address never becomes the client IP behind a trusted proxy', () => {
    assert.strictEqual(clientIp(serverDefault(), '172.18.0.5', '10.9.8.246, 203.0.113.7'), '203.0.113.7');
});

test('without the header the client IP is the socket address', () => {
    assert.strictEqual(clientIp(serverDefault(), '203.0.113.7'), '203.0.113.7');
    assert.strictEqual(clientIp(serverDefault(), '172.18.0.5'), '172.18.0.5');
});

test('TRUST_PROXY reads hop counts, booleans and address lists, and falls back to loopback plus private ranges', () => {
    assert.strictEqual(DEFAULT_TRUST_PROXY, 'loopback, uniquelocal');
    assert.strictEqual(parseTrustProxy(undefined), DEFAULT_TRUST_PROXY);
    assert.strictEqual(parseTrustProxy(''), DEFAULT_TRUST_PROXY);
    assert.strictEqual(parseTrustProxy('   '), DEFAULT_TRUST_PROXY);
    assert.strictEqual(parseTrustProxy('2'), 2);
    assert.strictEqual(parseTrustProxy(' 0 '), 0);
    assert.strictEqual(parseTrustProxy('true'), true);
    assert.strictEqual(parseTrustProxy('FALSE'), false);
    assert.strictEqual(parseTrustProxy('10.0.0.0/8, 127.0.0.1'), '10.0.0.0/8, 127.0.0.1');
});

test('TRUST_PROXY=false ignores the header even from a private address', () => {
    assert.strictEqual(clientIp(parseTrustProxy('false'), '172.18.0.5', '203.0.113.7'), '172.18.0.5');
});

test('TRUST_PROXY as an address list trusts only that proxy', () => {
    const setting = parseTrustProxy('172.18.0.5');
    assert.strictEqual(clientIp(setting, '172.18.0.5', '203.0.113.7'), '203.0.113.7');
    assert.strictEqual(clientIp(setting, '172.18.0.6', '203.0.113.7'), '172.18.0.6');
});

test('server.js takes trust proxy from TRUST_PROXY', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(source, /require\(['"]\.\/src\/config\/trustProxy['"]\)/);
    assert.match(source, /app\.set\(\s*['"]trust proxy['"]\s*,\s*parseTrustProxy\(\s*process\.env\.TRUST_PROXY\s*\)\s*\)/);
    assert.doesNotMatch(source, /app\.set\(\s*['"]trust proxy['"]\s*,\s*(\d+|true)\s*\)/);
});
