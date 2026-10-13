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
    const start = lines.indexOf(`  ${name}:`);
    assert.ok(start !== -1, `docker-compose has no service ${name}`);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => /^(\S|  [\w.-]+:)/.test(line) && !/^\s*#/.test(line));
    return rest.slice(0, end === -1 ? rest.length : end).join('\n');
};

test('the frontend image is built to call the API and Socket.IO on the host it is served from', () => {
    const stage = frontendDockerfile.search(/^FROM \S+ AS build$/m);
    const build = frontendDockerfile.indexOf('RUN npm run build');
    assert.ok(stage !== -1 && build > stage, 'the build stage builds the bundle');
    const buildStage = frontendDockerfile.slice(stage, build);
    assert.match(buildStage, /^ARG REACT_APP_API_URL=\/api$/m);
    assert.match(buildStage, /^ARG REACT_APP_WS_URL=\/$/m);
    assert.doesNotMatch(frontendDockerfile, /^ENV\s+REACT_APP_/m);
});

test('nginx sends the API to the backend and everything else to the frontend', () => {
    assert.match(location('/api'), /proxy_pass\s+http:\/\/backend;/);
    assert.match(location('/'), /proxy_pass\s+http:\/\/frontend;/);
    assert.match(composeService('nginx'), /ports:\s*\n\s*- "3009:3009"/);
});

test('the frontend container is reached only through nginx', () => {
    assert.doesNotMatch(composeService('frontend'), /^\s+ports:/m);
});
