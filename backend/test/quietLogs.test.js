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

const ROOT = path.join(__dirname, '..');

const consoleCalls = (source) => {
    const calls = [];
    const opening = /console\.\w+\(/g;
    let match = opening.exec(source);
    while (match) {
        let depth = 1;
        let quote = null;
        let i = match.index + match[0].length;
        while (i < source.length && depth > 0) {
            const ch = source[i];
            if (quote) {
                if (ch === '\\') {
                    i += 1;
                } else if (ch === quote) {
                    quote = null;
                }
            } else if (ch === '\'' || ch === '"' || ch === '`') {
                quote = ch;
            } else if (ch === '(') {
                depth += 1;
            } else if (ch === ')') {
                depth -= 1;
            }
            i += 1;
        }
        calls.push({ at: match.index, args: source.slice(match.index + match[0].length, i - 1) });
        match = opening.exec(source);
    }
    return calls;
};

const RAW_ERROR = /\b(e|err|error|ex|exception|reason|failure)\b(?!\s*\.\s*(message|code|name)\b)/;

const handsAnErrorObject = ({ args }) => RAW_ERROR.test(args
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '')
    .replace(/\bloggable\([^()]*\)/g, ''));

test('the scan for logged error objects catches the shapes that leak and passes the safe ones', () => {
    const leaks = [
        'console.error(e);',
        ".catch((err) => console.error('[mail] not sent:', err));",
        "console.error('x', e.original);",
        "console.error('x', { error: e });",
        "console.error(\n    '[x] failed:',\n    error,\n);",
        "console.warn('x', reason, 'more');",
    ];
    const safe = [
        "console.error('x', loggable(e));",
        "console.error('x', err.message);",
        'console.error(`failed: ${e}`);',
        "console.log('[DEBUG] price:', priceCase, 'balance:', balance);",
    ];
    const flagged = (line) => consoleCalls(line).some(handsAnErrorObject);

    assert.deepStrictEqual(leaks.map(flagged), leaks.map(() => true));
    assert.deepStrictEqual(safe.map(flagged), safe.map(() => false));
});

test('no log line anywhere in the backend is handed an error object, whose query parameters could carry hashes and addresses', () => {
    const files = [...jsFiles(SRC), ...['server.js', 'app.js', 'routes.js'].map((name) => path.join(ROOT, name))];

    const offenders = files.flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return consoleCalls(source)
            .filter(handsAnErrorObject)
            .map(({ at, args }) => `${path.relative(ROOT, file)}:${source.slice(0, at).split('\n').length} console(${args.replace(/\s+/g, ' ').trim()})`);
    });

    assert.deepStrictEqual(offenders, []);
});
