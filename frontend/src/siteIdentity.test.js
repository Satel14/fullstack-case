import fs from 'fs';
import path from 'path';
import { SITE_NAME } from './config/publicInfo';

const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));

test('the site is called CASES.UA in its page metadata and app manifest', () => {
    expect(SITE_NAME).toBe('CASES.UA');
    expect(indexHtml).toMatch(/<title>CASES\.UA[^<]*<\/title>/);
    expect(indexHtml).toMatch(/<meta property="og:site_name" content="CASES\.UA" \/>/);
    expect(manifest.short_name).toBe('CASES.UA');
    expect(manifest.name).toMatch(/^CASES\.UA/);
    expect(`${indexHtml}${JSON.stringify(manifest)}`).not.toMatch(/Case Opening|React App|Create React App/);
});

test('the page metadata speaks Ukrainian, like the site, and sets no relative og:url', () => {
    const description = indexHtml.match(/<meta name="description" content="([^"]+)"/)[1];

    expect(description).toMatch(/[а-яіїєґ]/i);
    expect(indexHtml).not.toMatch(/og:url" content="\//);
});

const pngSize = (file) => {
    const png = fs.readFileSync(path.join(publicDir, file));
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

test('the site has its own icon in every size the browser and the manifest ask for', () => {
    expect(indexHtml).toMatch(/<link rel="icon" href="%PUBLIC_URL%\/favicon\.svg" type="image\/svg\+xml" \/>/);
    expect(fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8')).toMatch(/#4763bf[\s\S]*#00a0ff/);
    expect(pngSize('logo192.png')).toEqual([192, 192]);
    expect(pngSize('logo512.png')).toEqual([512, 512]);
    const ico = fs.readFileSync(path.join(publicDir, 'favicon.ico'));
    const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16]);
    expect(sizes).toEqual([16, 32, 48]);
});
