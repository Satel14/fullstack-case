const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'ops', 'mysql-backup.sh');

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
        '[ -n "$FAIL_DUMP" ] && { echo "half a dump"; exit 2; }',
        'echo "-- dump of case"',
    ].join('\n'), { mode: 0o755 });
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const run = (extra = {}) => spawnSync('sh', [SCRIPT], {
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

test('one backup run writes a complete dump of the database with a consistent snapshot, the password never on the command line', (t) => {
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

test('a dump that fails leaves no backup file behind and the run reports it', (t) => {
    const { backups, run } = stand(t);

    const result = run({ FAIL_DUMP: '1' });

    assert.notStrictEqual(result.status, 0);
    assert.deepStrictEqual(fs.readdirSync(backups), []);
});

test('only the newest backups are kept', (t) => {
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
