const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'ops', 'mysql-backup.sh');

const SHELL_TOOLS = spawnSync('sh', ['-c', 'command -v date mktemp sed grep sort tail stat'], { encoding: 'utf8' });
const needsShell = { skip: SHELL_TOOLS.status !== 0 && 'needs a POSIX sh with date, mktemp, sed, grep, sort, tail and stat on PATH' };

const stand = (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-backup-'));
    const bin = path.join(dir, 'bin');
    const backups = path.join(dir, 'backups');
    fs.mkdirSync(bin);
    fs.mkdirSync(backups);
    fs.writeFileSync(path.join(bin, 'mysqldump'), [
        '#!/bin/sh',
        'for argument in "$@"; do echo "$argument"; done > "$BACKUP_DIR/../arguments"',
        'cat "${1#--defaults-extra-file=}" > "$BACKUP_DIR/../options"',
        'calls=$(( $(cat "$BACKUP_DIR/../calls" 2>/dev/null || echo 0) + 1 )); echo "$calls" > "$BACKUP_DIR/../calls"',
        '[ -n "$FAIL_DUMP" ] && { echo "half a dump"; exit 2; }',
        '[ -n "$FAIL_FIRST" ] && [ "$calls" = 1 ] && { echo "half a dump"; exit 2; }',
        'echo "-- dump of case"',
    ].join('\n'), { mode: 0o755 });
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const run = (extra = {}, args = [], timeout = undefined) => spawnSync('sh', [SCRIPT, ...args], {
        timeout,
        env: {
            ...process.env,
            PATH: `${bin}${path.delimiter}${process.env.PATH}`,
            BACKUP_DIR: backups,
            BACKUP_ONCE: '1',
            BACKUP_KEEP: '3',
            MYSQL_HOST: 'mysql-db',
            MYSQL_DATABASE: 'case',
            MYSQL_ROOT_PASSWORD: 'secret pass',
            ...extra,
        },
        encoding: 'utf8',
    });
    return { dir, backups, run };
};

test('one backup run writes a complete dump of the database with a consistent snapshot, the password never on the command line', needsShell, (t) => {
    const { dir, backups, run } = stand(t);

    const result = run();

    assert.strictEqual(result.status, 0, result.stderr);
    const files = fs.readdirSync(backups);
    assert.strictEqual(files.length, 1);
    assert.match(files[0], /^case-\d{8}-\d{6}\.sql$/);
    assert.strictEqual(fs.readFileSync(path.join(backups, files[0]), 'utf8').trim(), '-- dump of case');
    const args = fs.readFileSync(path.join(dir, 'arguments'), 'utf8').trim().split('\n');
    assert.ok(args.includes('--single-transaction'));
    assert.ok(args.includes('--host=mysql-db'));
    assert.strictEqual(args[args.length - 1], 'case');
    assert.ok(!args.some((arg) => arg.includes('secret pass')));
    assert.match(fs.readFileSync(path.join(dir, 'options'), 'utf8'), /password="secret pass"/);
});

test('a dump that fails leaves no backup file behind and the run reports it', needsShell, (t) => {
    const { backups, run } = stand(t);

    const result = run({ FAIL_DUMP: '1' });

    assert.notStrictEqual(result.status, 0);
    assert.deepStrictEqual(fs.readdirSync(backups), []);
});

test('only the newest backups are kept', needsShell, (t) => {
    const { backups, run } = stand(t);
    ['case-20260101-000000.sql', 'case-20260102-000000.sql', 'case-20260103-000000.sql', 'case-20260104-000000.sql', 'notes.txt']
        .forEach((name) => fs.writeFileSync(path.join(backups, name), 'old'));

    const result = run();

    assert.strictEqual(result.status, 0, result.stderr);
    const kept = fs.readdirSync(backups).sort();
    assert.strictEqual(kept.length, 4);
    assert.deepStrictEqual(kept.slice(0, 2), ['case-20260103-000000.sql', 'case-20260104-000000.sql']);
    assert.match(kept[2], /^case-\d{8}-\d{6}\.sql$/);
    assert.strictEqual(kept[3], 'notes.txt');
});

test('a dump is readable by its owner only, and a dump left half-written by an earlier stop is cleared', needsShell, (t) => {
    const { backups, run } = stand(t);
    fs.writeFileSync(path.join(backups, '.case-20260101-000000.sql.partial'), 'half');

    const result = run();

    assert.strictEqual(result.status, 0, result.stderr || String(result.error));
    const [dump] = fs.readdirSync(backups);
    assert.match(dump, /^case-\d{8}-\d{6}\.sql$/);
    if (process.platform !== 'win32') {
        assert.strictEqual(fs.statSync(path.join(backups, dump)).mode & 0o777, 0o600);
    }
});

test('a failed dump is retried after a short pause instead of waiting a whole interval', needsShell, (t) => {
    const { dir, backups, run } = stand(t);

    run({
        BACKUP_ONCE: '', FAIL_FIRST: '1', BACKUP_RETRY_SECONDS: '0', BACKUP_INTERVAL_SECONDS: '3600',
    }, [], 4000);

    assert.strictEqual(fs.readFileSync(path.join(dir, 'calls'), 'utf8').trim(), '2');
    assert.strictEqual(fs.readdirSync(backups).filter((name) => name.startsWith('case-')).length, 1);
});

test('the health check passes only while the newest dump is younger than an interval and an hour', needsShell, (t) => {
    const { backups, run } = stand(t);
    const health = () => run({ BACKUP_INTERVAL_SECONDS: '86400' }, ['--healthy']).status;

    assert.notStrictEqual(health(), 0);
    fs.writeFileSync(path.join(backups, 'case-20260101-000000.sql'), 'old');
    const old = new Date(Date.now() - 26 * 3600 * 1000);
    fs.utimesSync(path.join(backups, 'case-20260101-000000.sql'), old, old);
    assert.notStrictEqual(health(), 0);
    fs.writeFileSync(path.join(backups, 'case-20260102-000000.sql'), 'fresh');
    assert.strictEqual(health(), 0);
});
