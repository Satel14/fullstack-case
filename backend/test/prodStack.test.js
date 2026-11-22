const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').split('\r\n').join('\n');

const base = read('docker-compose.yml');
const compose = read('docker-compose.prod.yml');
const caddyfile = read('ops/caddy/Caddyfile');

const block = (source, name, indent = 0) => {
    const lines = source.split('\n');
    const start = lines.indexOf(`${' '.repeat(indent)}${name}:`);
    assert.ok(start !== -1, `missing ${name} block`);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.trim() && !/^\s*#/.test(line) && line.search(/\S/) <= indent);
    return rest.slice(0, end === -1 ? rest.length : end).join('\n');
};

const serviceNames = (source) => [...block(source, 'services').matchAll(/^ {2}([\w.-]+):$/gm)].map(([, name]) => name);
const service = (name) => block(block(compose, 'services'), name, 2);
const list = (source) => source.split('\n').map((line) => line.trim()).filter(Boolean)
    .map((line) => line.replace(/^-\s+/, '').replace(/^(['"])(.*)\1$/, '$2'));

test('the production override adds Caddy and uses exactly the existing base service names', () => {
    assert.deepStrictEqual(serviceNames(compose).sort(), [...serviceNames(base), 'caddy'].sort());
});

test('Caddy publishes HTTP and HTTPS, mounts its config and requires its domain and email', () => {
    const caddy = service('caddy');

    assert.match(caddy, /^ {4}image: caddy:2-alpine$/m);
    assert.match(caddy, /^ {4}restart: unless-stopped$/m);
    assert.deepStrictEqual(list(block(caddy, 'ports', 4)), ['80:80', '443:443', '443:443/udp']);
    assert.ok(list(block(caddy, 'volumes', 4)).includes('./ops/caddy/Caddyfile:/etc/caddy/Caddyfile:ro'));
    assert.match(caddy, /^ {6}DOMAIN: \$\{DOMAIN:\?[^}\n]+\}$/m);
    assert.match(caddy, /^ {6}ACME_EMAIL: \$\{ACME_EMAIL:\?[^}\n]+\}$/m);
});

test('Caddy joins both networks and waits for the healthy backend and started frontend', () => {
    const caddy = service('caddy');
    const dependencies = block(caddy, 'depends_on', 4);

    assert.deepStrictEqual(list(block(caddy, 'networks', 4)).sort(), ['private', 'public']);
    assert.match(dependencies, /^ {6}backend:\n {8}condition: service_healthy$/m);
    assert.match(dependencies, /^ {6}frontend:\n {8}condition: service_started$/m);
});

test('the edge nginx starts only when the local profile is selected', () => {
    assert.match(service('nginx'), /^ {4}profiles: \["local"\]$/m);
});

test('the backend uses the required HTTPS domain for CORS and mail links', () => {
    assert.match(service('backend'), /^ {6}CLIENT_ORIGIN: https:\/\/\$\{DOMAIN:\?[^}\n]+\}$/m);
});

test('no service except Caddy publishes a port in the production override', () => {
    serviceNames(compose).filter((name) => name !== 'caddy').forEach((name) => {
        assert.doesNotMatch(service(name), /^\s+ports:/m, `${name} publishes a port`);
    });
});

test('Caddy certificates and configuration persist in named volumes', () => {
    const volumes = block(compose, 'volumes');
    const mounts = list(block(service('caddy'), 'volumes', 4));

    assert.match(volumes, /^ {2}caddy-data:$/m);
    assert.match(volumes, /^ {2}caddy-config:$/m);
    assert.ok(mounts.includes('caddy-data:/data'));
    assert.ok(mounts.includes('caddy-config:/config'));
});

test('every production service rotates json-file logs at ten megabytes with three files', () => {
    const logging = compose.slice(0, compose.indexOf('services:'));

    assert.match(logging, /^x-logging: &logging$/m);
    assert.match(logging, /^ {2}driver: json-file$/m);
    assert.match(logging, /^ {2}options:\n {4}max-size: "10m"\n {4}max-file: "3"$/m);
    serviceNames(compose).forEach((name) => {
        assert.match(service(name), /^ {4}logging: \*logging$/m, `${name} must use the logging anchor`);
    });
});

test('Caddy serves the domain with HSTS and routes API, sockets and frontend directly', () => {
    assert.match(caddyfile, /^\{\s+email \{\$ACME_EMAIL\}\s+\}/);
    assert.match(caddyfile, /^\{\$DOMAIN\} \{$/m);
    assert.match(caddyfile, /^\s+encode zstd gzip$/m);
    assert.match(caddyfile, /^\s+header Strict-Transport-Security "max-age=31536000"$/m);
    assert.match(caddyfile, /handle \/api\* \{\s+reverse_proxy backend:3003\s+\}/);
    assert.match(caddyfile, /handle \/socket\.io\/\* \{\s+reverse_proxy backend:3003\s+\}/);
    assert.match(caddyfile, /handle \{\s+reverse_proxy frontend:3033\s+\}/);
    assert.doesNotMatch(caddyfile, /\btrusted_proxies\b/);
    assert.doesNotMatch(caddyfile, /^\s*log(?:\s|\{|$)/m);
    assert.doesNotMatch(caddyfile, /includeSubDomains|preload/);
});

test('the environment template lists the production domain and ACME email', () => {
    const env = read('.env.example');

    assert.match(env, /^DOMAIN=$/m);
    assert.match(env, /^ACME_EMAIL=$/m);
});
