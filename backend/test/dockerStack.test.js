const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').split('\r\n').join('\n');

const nginx = read('nginx/default.conf');
const frontendDockerfile = read('frontend/Dockerfile');
const compose = read('docker-compose.yml');

const location = (prefix) => {
    const start = nginx.indexOf(`location ${prefix} {`);
    assert.ok(start !== -1, `nginx has no location ${prefix}`);
    return nginx.slice(start, nginx.indexOf('}', start));
};

const composeService = (name) => {
    const lines = compose.split('\n');
    const services = lines.indexOf('services:');
    assert.ok(services !== -1, 'docker-compose has a services section');
    const start = lines.indexOf(`  ${name}:`, services);
    assert.ok(start !== -1, `docker-compose has no service ${name}`);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => /^(\S|  [\w.-]+:)/.test(line) && !/^\s*#/.test(line));
    return rest.slice(0, end === -1 ? rest.length : end).join('\n');
};

test('the frontend image is built to call the API and Socket.IO on the host it is served from', () => {
    const stage = frontendDockerfile.search(/^FROM \S+ AS build$/m);
    const build = frontendDockerfile.search(/^RUN npm run build$/m);
    assert.ok(stage !== -1 && build > stage, 'the build stage builds the bundle');
    const buildStage = frontendDockerfile.slice(stage, build);
    assert.doesNotMatch(buildStage.slice(1), /^FROM /im, 'the bundle is built in the stage that declares the URLs');
    assert.deepStrictEqual(frontendDockerfile.match(/--from=\S+/g), ['--from=build'], 'the image ships the bundle of that stage');
    assert.deepStrictEqual(
        frontendDockerfile.split('\n').filter((line) => /REACT_APP_(API|WS)_URL/.test(line)),
        ['ARG REACT_APP_API_URL=/api', 'ARG REACT_APP_WS_URL=/'],
        'nothing else in the Dockerfile sets the URLs',
    );
    assert.match(buildStage, /^ARG REACT_APP_API_URL=\/api$/m);
    assert.match(buildStage, /^ARG REACT_APP_WS_URL=\/$/m);
    assert.doesNotMatch(compose, /REACT_APP_(API|WS)_URL/, 'docker-compose does not override the URLs');
});

test('nginx sends the API to the backend and everything else to the frontend', () => {
    assert.match(location('/api'), /proxy_pass\s+http:\/\/backend;/);
    assert.match(location('/'), /proxy_pass\s+http:\/\/frontend;/);
    assert.match(composeService('nginx'), /ports:\s*\n\s*- "3009:3009"/);
});

test('the site address used in password-reset links can be set to the one players open', () => {
    assert.match(composeService('backend'), /^ {6}CLIENT_ORIGIN: \$\{CLIENT_ORIGIN:-http:\/\/localhost:3009\}$/m);
});

test('the frontend container is reached only through nginx', () => {
    assert.doesNotMatch(composeService('frontend'), /^\s+ports:/m);
});

test('the backend refuses to start without a real JWT secret', () => {
    assert.match(composeService('backend'), /^ {6}JWT_SECRET: \$\{JWT_SECRET:\?[^}]+\}$/m);
    assert.doesNotMatch(compose, /^\s*JWT_SECRET:\s*(?!\$\{)\S/m, 'no secret-looking literal should be assigned to JWT_SECRET');
});

test('every published port binds to loopback, except nginx\'s public port', () => {
    const portLines = [...compose.matchAll(/^\s*- "([^"]+)"\s*$/gm)]
        .map((m) => m[1])
        .filter((p) => /^[0-9.]*:?\d+:\d+$/.test(p));
    assert.ok(portLines.length > 0, 'the compose file should publish at least one port');
    portLines.forEach((p) => {
        if (p === '3009:3009') {
            return;
        }
        assert.match(p, /^127\.0\.0\.1:/, `${p} should be bound to 127.0.0.1`);
    });
});

test('the backend and the mysql app user read the same password variable', () => {
    const dbAnchor = compose.slice(0, compose.indexOf('services:'));
    const appPasswordMatch = dbAnchor.match(/^\s*MYSQL_PASSWORD:\s*(\$\{\w+(?::-[^}]*)?\})\s*$/m);
    assert.ok(appPasswordMatch, 'the x-database anchor should read MYSQL_PASSWORD from a variable');
    const prodDbPass = composeService('backend').match(/^\s*PROD_DB_PASS:\s*(\$\{\w+(?::-[^}]*)?\})\s*$/m);
    assert.ok(prodDbPass, 'backend should read PROD_DB_PASS from a variable');
    assert.strictEqual(prodDbPass[1], appPasswordMatch[1], 'backend and mysql should reference the same variable');
});

test('the mysql root password is overridable from the environment with the current default', () => {
    assert.match(composeService('mysql-db'), /^\s*MYSQL_ROOT_PASSWORD: \$\{MYSQL_ROOT_PASSWORD:-root\}$/m);
});
