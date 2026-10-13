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
