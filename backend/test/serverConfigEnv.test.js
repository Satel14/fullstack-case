const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SERVER_CONFIG_PATH = path.join(__dirname, '..', 'src', 'config', 'serverConfig.js');

test('NODE_ENV set only in a .env file selects the matching config block', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serverconfig-env-'));
    try {
        fs.writeFileSync(path.join(tmpDir, '.env'), [
            'NODE_ENV=production',
            'PROD_DB_NAME=env_file_db',
            'PROD_DB_USER=env_file_user',
            'PROD_DB_PASS=env_file_pass',
            'MYSQL_HOST_IP=env-file-host',
            'DB_PORT=9999',
            'SERVER_PORT=9191',
            '',
        ].join('\n'));

        const script = `console.log(JSON.stringify(require(${JSON.stringify(SERVER_CONFIG_PATH)})));`;
        const result = spawnSync(process.execPath, ['-e', script], {
            cwd: tmpDir,
            encoding: 'utf8',
            env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
        });

        assert.strictEqual(result.status, 0, result.stderr);
        const config = JSON.parse(result.stdout.trim());
        assert.strictEqual(config.database.database, 'env_file_db');
        assert.strictEqual(config.database.username, 'env_file_user');
        assert.strictEqual(config.database.password, 'env_file_pass');
        assert.strictEqual(config.database.host, 'env-file-host');
        assert.strictEqual(config.database.db_port, '9999');
        assert.strictEqual(config.port, '9191');
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
