const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const REQUEST_CODE = ['controllers', 'services', 'socket', 'middleware', 'auth', 'helpers', 'modules', 'routes'];
const CASE_OPEN = path.join('controllers', 'case.js');

const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        return jsFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
});

test('code that handles requests writes no informational log lines, apart from the case open\'s [DEBUG] lines', () => {
    const offenders = REQUEST_CODE
        .flatMap((dir) => jsFiles(path.join(SRC, dir)))
        .flatMap((file) => fs.readFileSync(file, 'utf8').split('\n')
            .map((line, index) => ({ file: path.relative(SRC, file), line: index + 1, text: line.trim() })))
        .filter(({ text }) => /console\.(log|info|debug|trace|dir|table)\(/.test(text))
        .filter(({ file, text }) => !(file === CASE_OPEN && text.includes("'[DEBUG]")))
        .map(({ file, line, text }) => `${file}:${line} ${text}`);

    assert.deepStrictEqual(offenders, []);
});

test('no log line prints a raw error object, whose database parameters could carry hashes and addresses', () => {
    const offenders = REQUEST_CODE
        .flatMap((dir) => jsFiles(path.join(SRC, dir)))
        .flatMap((file) => fs.readFileSync(file, 'utf8').split('\n')
            .map((line, index) => ({ file: path.relative(SRC, file), line: index + 1, text: line.trim() })))
        .filter(({ text }) => /console\.(error|warn|log|info|debug|trace)\(.*,\s*(e|err|error|failure)\s*\);?$/.test(text))
        .map(({ file, line, text }) => `${file}:${line} ${text}`);

    assert.deepStrictEqual(offenders, []);
});
