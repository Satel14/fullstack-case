const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SHELL = process.env.OPS_TEST_SHELL || 'sh';
const shellTools = spawnSync(SHELL, ['-c', 'command -v dirname sed tail chmod mv cat'], { encoding: 'utf8' });
const needsShell = { skip: shellTools.status !== 0 && 'needs a POSIX sh with dirname, sed, tail, chmod, mv and cat on PATH' };
const COMPOSE = ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml'];
const SEED = 'npm run seed && node scripts/buildPriceMap.js && node scripts/seedCases.js';
const SCRIPTS = ['server-setup.sh', 'init-env.sh', 'deploy.sh', 'first-seed.sh'];

const shellPath = (file) => process.platform === 'win32'
    ? file.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
    : file;

const stand = (t, script) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-scripts-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const bin = path.join(dir, 'bin');
    const ops = path.join(dir, 'ops');
    const caller = path.join(dir, 'caller');
    [bin, ops, caller].forEach((folder) => fs.mkdirSync(folder));
    const scriptPath = path.join(ops, script);
    fs.copyFileSync(path.join(ROOT, 'ops', script), scriptPath);
    fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(dir, '.env.example'));
    const logPath = path.join(dir, 'calls');
    fs.writeFileSync(logPath, '');

    const fake = (name, lines) => fs.writeFileSync(path.join(bin, name), [
        '#!/bin/sh',
        'set -eu',
        `printf '%s' '${name}' >> "$OPS_LOG"`,
        'printf \'\\t%s\' "$@" >> "$OPS_LOG"',
        'printf \'\\n\' >> "$OPS_LOG"',
        ...lines,
        '',
    ].join('\n'), { mode: 0o755 });

    fake('git', ['exit 0']);
    fake('docker', [
        'if [ "${1:-}" = inspect ]; then',
        '    printf \'%s\\n\' "$FAKE_HEALTH"',
        '    exit 0',
        'fi',
        'case "$*" in',
        '    "compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend node -e "*)',
        '        printf \'%s\' "$FAKE_CASES"',
        '        exit "$FAKE_CASES_STATUS"',
        '        ;;',
        '    "compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend sh -c "*)',
        '        exit "$FAKE_SEED_STATUS"',
        '        ;;',
        'esac',
        'exit 0',
    ]);
    fake('curl', ['exit "$FAKE_CURL_STATUS"']);
    fake('sleep', ['exit 0']);
    fake('id', ['printf \'%s\\n\' 1000']);
    fake('openssl', [
        'calls=0',
        'if [ -f "$OPS_OPENSSL_CALLS" ]; then calls="$(cat "$OPS_OPENSSL_CALLS")"; fi',
        'calls=$((calls + 1))',
        'printf \'%s\\n\' "$calls" > "$OPS_OPENSSL_CALLS"',
        'width=$(($3 * 2))',
        'printf "%0${width}x\\n" "$calls"',
    ]);

    const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
    const run = (args = [], extra = {}) => spawnSync(SHELL, ['-c', [
        'PATH="$OPS_FAKE_BIN:$PATH"',
        'export PATH',
        'for tool in git docker curl openssl sleep id; do',
        '    if [ "$(command -v "$tool")" != "$OPS_FAKE_BIN/$tool" ]; then',
        '        echo "test refuses to run without fake $tool: found $(command -v "$tool"), expected $OPS_FAKE_BIN/$tool" >&2',
        '        exit 99',
        '    fi',
        'done',
        'exec "$@"',
    ].join('\n'), 'ops-test', shellPath(SHELL), shellPath(scriptPath), ...args], {
        cwd: caller,
        timeout: 15000,
        encoding: 'utf8',
        env: {
            ...inherited,
            PATH: process.env.PATH,
            OPS_LOG: shellPath(logPath),
            OPS_FAKE_BIN: shellPath(bin),
            OPS_OPENSSL_CALLS: shellPath(path.join(dir, 'openssl-calls')),
            FAKE_HEALTH: 'healthy',
            FAKE_CASES: '0',
            FAKE_CASES_STATUS: '0',
            FAKE_SEED_STATUS: '0',
            FAKE_CURL_STATUS: '0',
            ...extra,
        },
    });

    const calls = () => fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => line.split('\t'));
    const envFile = path.join(dir, '.env');
    return { dir, envFile, run, calls, writeEnv: (content = 'DOMAIN=example.test\n') => fs.writeFileSync(envFile, content) };
};

const exited = (result, code) => {
    assert.ifError(result.error);
    assert.equal(result.status, code, `${result.stdout}${result.stderr}`);
};

test('deploy removes old nginx, rebuilds and refreshes mounted files before checking health', needsShell, (t) => {
    const { run, calls, writeEnv } = stand(t, 'deploy.sh');
    writeEnv();

    const result = run();

    exited(result, 0);
    assert.deepEqual(calls(), [
        ['git', 'pull', '--ff-only'],
        ['docker', ...COMPOSE, '--profile', 'local', 'rm', '-sf', 'nginx'],
        ['docker', ...COMPOSE, 'up', '-d', '--build', '--remove-orphans'],
        ['docker', ...COMPOSE, 'restart', 'caddy', 'mysql-backup'],
        ['docker', 'inspect', '-f', '{{.State.Health.Status}}', 'fullstack_case_backend'],
        ['curl', '-fsS', '--max-time', '5', 'https://example.test/api/health'],
    ]);
    assert.match(result.stdout, /https:\/\/example\.test is up/);
});

test('deploy --no-pull skips git and still rebuilds and checks HTTPS', needsShell, (t) => {
    const { run, calls, writeEnv } = stand(t, 'deploy.sh');
    writeEnv();

    exited(run(['--no-pull']), 0);

    assert.ok(calls().every(([command]) => command !== 'git'));
    assert.deepEqual(calls().slice(0, 3), [
        ['docker', ...COMPOSE, '--profile', 'local', 'rm', '-sf', 'nginx'],
        ['docker', ...COMPOSE, 'up', '-d', '--build', '--remove-orphans'],
        ['docker', ...COMPOSE, 'restart', 'caddy', 'mysql-backup'],
    ]);
    assert.equal(calls().at(-1)[0], 'curl');
});

for (const domain of ['localhost', 'case.localhost']) {
    test(`deploy accepts Caddy's local certificate for ${domain}`, needsShell, (t) => {
        const { run, calls, writeEnv } = stand(t, 'deploy.sh');
        writeEnv(`DOMAIN=${domain}\n`);

        exited(run(), 0);

        assert.deepEqual(calls().filter(([command]) => command === 'curl'), [
            ['curl', '-fsS', '--max-time', '5', '--insecure', `https://${domain}/api/health`],
        ]);
    });
}

for (const domain of ['example.test', 'localhost.example.test', 'notlocalhost']) {
    test(`deploy verifies the HTTPS certificate for ${domain}`, needsShell, (t) => {
        const { run, calls, writeEnv } = stand(t, 'deploy.sh');
        writeEnv(`DOMAIN=${domain}\n`);

        exited(run(), 0);

        assert.deepEqual(calls().filter(([command]) => command === 'curl'), [
            ['curl', '-fsS', '--max-time', '5', `https://${domain}/api/health`],
        ]);
    });
}

test('deploy without .env names init-env.sh and calls no external command', needsShell, (t) => {
    const { run, calls } = stand(t, 'deploy.sh');

    const result = run();

    exited(result, 1);
    assert.match(result.stderr, /init-env\.sh/);
    assert.deepEqual(calls(), []);
});

for (const [label, content] of [['empty', 'DOMAIN=\n'], ['missing', 'JWT_SECRET=test\n']]) {
    test(`deploy with ${label} DOMAIN refuses before git or Docker`, needsShell, (t) => {
        const { run, calls, writeEnv } = stand(t, 'deploy.sh');
        writeEnv(content);

        const result = run();

        exited(result, 1);
        assert.match(result.stderr, /DOMAIN is empty/);
        assert.deepEqual(calls(), []);
    });
}

test('deploy stops at the backend health deadline and points to logs', needsShell, (t) => {
    const { run, calls, writeEnv } = stand(t, 'deploy.sh');
    writeEnv();

    const result = run([], { FAKE_HEALTH: 'starting', DEPLOY_HEALTH_TIMEOUT: '10' });

    exited(result, 1);
    assert.match(result.stderr, /not healthy after 10s/);
    assert.match(result.stderr, /logs --tail 100 backend/);
    assert.equal(calls().filter(([command, operation]) => command === 'docker' && operation === 'inspect').length, 3);
    assert.deepEqual(calls().filter(([command]) => command === 'sleep'), [['sleep', '5'], ['sleep', '5']]);
    assert.ok(calls().every(([command]) => command !== 'curl'));
});

test('deploy refuses success when the bounded HTTPS checks keep failing', needsShell, (t) => {
    const { run, calls, writeEnv } = stand(t, 'deploy.sh');
    writeEnv();

    const result = run([], { FAKE_CURL_STATUS: '7', DEPLOY_HTTPS_TRIES: '2' });

    exited(result, 1);
    assert.equal(calls().filter(([command]) => command === 'curl').length, 2);
    assert.match(result.stderr, /https:\/\/example\.test\/api\/health does not answer/);
    assert.match(result.stderr, /logs --tail 100 caddy/);
    assert.doesNotMatch(result.stdout, /is up/);
});

test('deploy parses every argument before checking .env or calling git or Docker', needsShell, (t) => {
    const { run, calls, writeEnv, envFile } = stand(t, 'deploy.sh');
    exited(run(['--bogus']), 2);
    assert.ok(!fs.existsSync(envFile));
    writeEnv();
    const before = fs.readFileSync(envFile);

    for (const args of [['--bogus'], ['--no-pull', '--bogus']]) {
        const result = run(args);
        exited(result, 2);
        assert.match(result.stderr, /unknown argument --bogus/);
    }

    assert.deepEqual(calls(), []);
    assert.deepEqual(fs.readFileSync(envFile), before);
});

test('init-env fills fresh secrets and production values and keeps every other template line', needsShell, (t) => {
    const { dir, run, calls, envFile } = stand(t, 'init-env.sh');

    const result = run(['example.test', 'admin@example.test']);

    exited(result, 0);
    const contents = fs.readFileSync(envFile, 'utf8');
    const values = Object.fromEntries(contents.split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
        const equal = line.indexOf('=');
        return [line.slice(0, equal), line.slice(equal + 1)];
    }));
    assert.match(values.JWT_SECRET, /^[0-9a-f]{64}$/);
    const passwords = [values.MYSQL_ROOT_PASSWORD, values.DB_APP_PASSWORD, values.REDIS_PASSWORD];
    passwords.forEach((password) => assert.match(password, /^[0-9a-f]{32}$/));
    assert.equal(new Set(passwords).size, 3);
    assert.equal(values.DOMAIN, 'example.test');
    assert.equal(values.ACME_EMAIL, 'admin@example.test');
    assert.equal(values.CLIENT_ORIGIN, 'https://example.test');
    const changed = new Set(['JWT_SECRET', 'MYSQL_ROOT_PASSWORD', 'DB_APP_PASSWORD', 'REDIS_PASSWORD', 'DOMAIN', 'ACME_EMAIL', 'CLIENT_ORIGIN']);
    const template = fs.readFileSync(path.join(dir, '.env.example'), 'utf8').split(/\r?\n/);
    assert.deepEqual(contents.split(/\r?\n/), template.map((line) => {
        const key = line.slice(0, line.indexOf('='));
        return changed.has(key) ? `${key}=${values[key]}` : line;
    }));
    assert.deepEqual(calls(), [
        ['openssl', 'rand', '-hex', '32'],
        ['openssl', 'rand', '-hex', '16'],
        ['openssl', 'rand', '-hex', '16'],
        ['openssl', 'rand', '-hex', '16'],
    ]);
    assert.ok(!fs.existsSync(path.join(dir, '.env.partial')));
    if (process.platform !== 'win32') assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
    assert.match(result.stdout, /RESEND_API_KEY.*RESEND_FROM.*REACT_APP_SUPPORT_EMAIL/);
});

test('init-env refuses to overwrite an existing .env and leaves it byte-identical', needsShell, (t) => {
    const { run, calls, envFile, writeEnv } = stand(t, 'init-env.sh');
    writeEnv('JWT_SECRET=keep-me\r\nDOMAIN=old.example\r\n');
    const before = fs.readFileSync(envFile);

    const result = run(['example.test', 'admin@example.test']);

    exited(result, 1);
    assert.match(result.stderr, /\.env already exists/);
    assert.deepEqual(fs.readFileSync(envFile), before);
    assert.deepEqual(calls(), []);
});

for (const [label, args] of [
    ['a domain with a space', ['bad domain.test', 'admin@example.test']],
    ['a domain with a pipe', ['bad|domain.test', 'admin@example.test']],
    ['an email with a space', ['example.test', 'admin name@example.test']],
    ['missing arguments', []],
    ['extra arguments', ['example.test', 'admin@example.test', 'extra']],
]) {
    test(`init-env rejects ${label} before writing files or generating secrets`, needsShell, (t) => {
        const { dir, run, calls, envFile } = stand(t, 'init-env.sh');

        exited(run(args), 2);

        assert.ok(!fs.existsSync(envFile));
        assert.ok(!fs.existsSync(path.join(dir, '.env.partial')));
        assert.deepEqual(calls(), []);
    });
}

test('first-seed seeds an empty database inside the backend and then restarts it', needsShell, (t) => {
    const { run, calls } = stand(t, 'first-seed.sh');

    exited(run(), 0);

    const recorded = calls();
    assert.equal(recorded.length, 3);
    assert.deepEqual(recorded[0].slice(0, -1), ['docker', ...COMPOSE, 'exec', '-T', 'backend', 'node', '-e']);
    assert.match(recorded[0].at(-1), /SELECT COUNT\(\*\) AS n FROM cases/);
    assert.deepEqual(recorded[1], ['docker', ...COMPOSE, 'exec', '-T', 'backend', 'sh', '-c', SEED]);
    assert.deepEqual(recorded[2], ['docker', ...COMPOSE, 'restart', 'backend']);
});

test('first-seed refuses an existing case catalogue without seeding or restarting', needsShell, (t) => {
    const { run, calls } = stand(t, 'first-seed.sh');

    const result = run([], { FAKE_CASES: '38' });

    exited(result, 1);
    assert.match(result.stderr, /already holds 38 cases/);
    assert.equal(calls().length, 1);
});

for (const [label, extra] of [
    ['a failed query even when it prints zero', { FAKE_CASES_STATUS: '1', FAKE_CASES: '0' }],
    ['an empty query response', { FAKE_CASES: '' }],
    ['a nonnumeric query response', { FAKE_CASES: 'unavailable' }],
]) {
    test(`first-seed clearly refuses ${label}`, needsShell, (t) => {
        const { run, calls } = stand(t, 'first-seed.sh');

        const result = run([], extra);

        exited(result, 1);
        assert.match(result.stderr, /could not read.*case count/);
        assert.doesNotMatch(result.stderr, /already holds/);
        assert.equal(calls().length, 1);
    });
}

test('first-seed does not restart or report success after a failed seed', needsShell, (t) => {
    const { run, calls } = stand(t, 'first-seed.sh');

    const result = run([], { FAKE_SEED_STATUS: '2' });

    exited(result, 2);
    assert.equal(calls().length, 2);
    assert.doesNotMatch(result.stdout, /restarted/);
});

test('server-setup refuses a non-root user before changing the system', needsShell, (t) => {
    const { run, calls } = stand(t, 'server-setup.sh');

    const result = run();

    exited(result, 1);
    assert.match(result.stderr, /run it with sudo/);
    assert.deepEqual(calls(), [['id', '-u']]);
});

test('server-setup includes Compose, swap and all SSH ports before enabling the firewall', () => {
    const source = fs.readFileSync(path.join(ROOT, 'ops', 'server-setup.sh'), 'utf8');
    const beforeEnable = source.split('ufw --force enable')[0];

    assert.match(source, /docker-compose-plugin/);
    assert.match(source, /ufw --force enable/);
    assert.match(beforeEnable, /ufw allow OpenSSH/);
    assert.match(beforeEnable, /sshd -T/);
    assert.match(beforeEnable, /sed -n 's\/\^port /);
    assert.match(beforeEnable, /for ssh_port in \$ssh_ports; do\s+ufw allow "\$ssh_port\/tcp"\s+done/);
    assert.match(beforeEnable, /ufw allow 443\/udp/);
    assert.match(source, /swapon/);
});

for (const script of SCRIPTS) {
    test(`${script} passes sh -n and uses LF endings and strict POSIX shell settings`, needsShell, () => {
        const file = path.join(ROOT, 'ops', script);
        const source = fs.readFileSync(file, 'utf8');

        assert.match(source, /^#!\/bin\/sh\nset -eu\n/);
        assert.doesNotMatch(source, /\r/);
        exited(spawnSync(SHELL, ['-n', shellPath(file)], { encoding: 'utf8' }), 0);
    });
}
