const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const parseCommand = (text) => {
    if (!text.startsWith('*')) {
        return null;
    }
    const header = text.indexOf('\r\n');
    if (header === -1) {
        return null;
    }
    const count = Number(text.slice(1, header));
    const args = [];
    let cursor = header + 2;
    for (let i = 0; i < count; i += 1) {
        const lengthEnd = text.indexOf('\r\n', cursor);
        if (lengthEnd === -1) {
            return null;
        }
        const size = Number(text.slice(cursor + 1, lengthEnd));
        const start = lengthEnd + 2;
        if (text.length < start + size + 2) {
            return null;
        }
        args.push(text.slice(start, start + size));
        cursor = start + size + 2;
    }
    return { args, consumed: cursor };
};

const startFakeRedis = (requirePass) => new Promise((resolve) => {
    const commands = [];
    const server = net.createServer((socket) => {
        let buffered = '';
        let authenticated = requirePass === null;
        socket.on('data', (chunk) => {
            buffered += chunk.toString('utf8');
            let parsed = parseCommand(buffered);
            while (parsed) {
                buffered = buffered.slice(parsed.consumed);
                const [name, ...args] = parsed.args;
                const command = name.toUpperCase();
                commands.push([command, ...args]);
                if (command === 'AUTH') {
                    if (requirePass !== null && args[args.length - 1] === requirePass) {
                        authenticated = true;
                        socket.write('+OK\r\n');
                    } else {
                        socket.write('-WRONGPASS invalid username-password pair or user is disabled.\r\n');
                    }
                } else if (!authenticated) {
                    socket.write('-NOAUTH Authentication required.\r\n');
                } else if (command === 'INFO') {
                    const info = '# Server\r\nredis_version:7.2.0\r\n';
                    socket.write(`$${Buffer.byteLength(info)}\r\n${info}\r\n`);
                } else if (command === 'HGETALL') {
                    socket.write('*0\r\n');
                } else {
                    socket.write('+OK\r\n');
                }
                parsed = parseCommand(buffered);
            }
        });
        socket.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve({ port: server.address().port, commands, server }));
});

const CHILD = `
const manager = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'redis', 'manager'))});
setTimeout(() => {
    manager.getAllDataHashWithKey('item_hash')
        .then(() => ({ outcome: 'resolved' }))
        .catch((e) => ({ outcome: 'rejected', message: e.message }))
        .then((result) => {
            console.log('RESULT ' + JSON.stringify(result));
            process.exit(0);
        });
}, 1500);
setTimeout(() => {
    console.log('RESULT ' + JSON.stringify({ outcome: 'hung' }));
    process.exit(0);
}, 6000);
`;

const runManager = async ({ requirePass, password }) => {
    const fake = await startFakeRedis(requirePass);
    const env = { ...process.env, NODE_ENV: 'development', REDIS_HOST: '127.0.0.1', REDIS_PORT: String(fake.port) };
    delete env.REDIS_PASSWORD;
    if (password !== undefined) {
        env.REDIS_PASSWORD = password;
    }
    const outcome = await new Promise((resolve) => {
        const child = spawn(process.execPath, ['-e', CHILD], { env });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('close', () => {
            const line = stdout.split('\n').find((l) => l.startsWith('RESULT '));
            resolve({ result: line ? JSON.parse(line.slice('RESULT '.length)) : null, stderr });
        });
    });
    await new Promise((resolve) => fake.server.close(resolve));
    return { ...outcome, commands: fake.commands };
};

test('the backend authenticates to a Redis that requires REDIS_PASSWORD', async () => {
    const { result, stderr, commands } = await runManager({ requirePass: 'compose-secret', password: 'compose-secret' });

    assert.ok(result, `no result was printed:\n${stderr}`);
    assert.deepStrictEqual(result, { outcome: 'resolved' }, `the command failed against a password-protected Redis:\n${stderr}`);
    assert.deepStrictEqual(commands[0], ['AUTH', 'compose-secret']);
});

test('the backend sends no AUTH when REDIS_PASSWORD is unset or empty', async () => {
    for (const password of [undefined, '']) {
        const { result, stderr, commands } = await runManager({ requirePass: null, password });

        assert.deepStrictEqual(result, { outcome: 'resolved' }, `REDIS_PASSWORD=${JSON.stringify(password)}:\n${stderr}`);
        assert.ok(
            !commands.some(([command]) => command === 'AUTH'),
            `REDIS_PASSWORD=${JSON.stringify(password)} sent AUTH: ${JSON.stringify(commands)}`,
        );
    }
});

const composeService = (name) => {
    const lines = fs.readFileSync(path.join(__dirname, '..', '..', 'docker-compose.yml'), 'utf8').split(/\r?\n/);
    const start = lines.indexOf(`  ${name}:`);
    assert.notStrictEqual(start, -1, `docker-compose.yml has no ${name} service`);
    const end = lines.findIndex((line, i) => i > start && /^ {0,2}\S/.test(line));
    return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
};

test('docker-compose publishes Redis on loopback only and hands REDIS_PASSWORD to both sides', () => {
    const redis = composeService('redis');
    const published = [...redis.matchAll(/^\s+-\s+["']?([^"'\s]+)["']?\s*$/gm)]
        .map(([, mapping]) => mapping)
        .filter((mapping) => /:6379$/.test(mapping));

    for (const mapping of published) {
        assert.match(mapping, /^127\.0\.0\.1:/, `Redis is published on every interface: ${mapping}`);
    }
    assert.match(redis, /--requirepass/, 'redis-server is never given a password');
    assert.match(redis, /REDIS_PASSWORD/, 'the Redis password does not come from REDIS_PASSWORD');

    const backend = composeService('backend');
    assert.match(backend, /^\s+REDIS_PASSWORD:/m, 'the backend is not given REDIS_PASSWORD');
});
