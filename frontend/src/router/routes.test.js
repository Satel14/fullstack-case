import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'routes.js'), 'utf8');
const paths = [...source.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

test('route paths are unique regardless of case, since react-router matches them case-insensitively', () => {
    const seen = {};
    const clashes = [];
    paths.forEach((p) => {
        const key = p.toLowerCase();
        if (seen[key]) {
            clashes.push(`${seen[key]} / ${p}`);
        }
        seen[key] = p;
    });

    expect(paths.length).toBeGreaterThan(10);
    expect(clashes).toEqual([]);
});

test('settings and promocode each have their own page', () => {
    expect(source).toMatch(/path: '\/settings',\s*exact: true,\s*layout: Layout,\s*component: Settings,/);
    expect(source).toMatch(/path: '\/promocode',\s*exact: true,\s*layout: Layout,\s*component: Promocode,/);
});
