const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { GRADE_COLORS, meanSaturation, coverOf, coversFor, renderArt } = require('./caseArt');

const temporaryDirectory = async (t) => {
    const parent = path.resolve(os.tmpdir());
    const directory = await fs.mkdtemp(path.join(parent, 'case-art-'));
    t.after(async () => {
        assert.equal(path.dirname(directory), parent);
        await fs.rm(directory, { recursive: true, force: true });
    });
    return directory;
};

const createCover = (file, width = 200, height = 70) => sharp({
    create: { width, height, channels: 4, background: { r: 50, g: 204, b: 128, alpha: 1 } },
}).extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#00000000' }).toFile(file);

const pixelAt = ({ data, info }, x, y) => Array.from(data.subarray(
    (y * info.width + x) * info.channels, (y * info.width + x + 1) * info.channels,
));

test('art uses the approved CS2 grade colours', () => {
    assert.deepEqual(GRADE_COLORS, {
        consumer: '#b0c3d9', industrial: '#5e98d9', milspec: '#4b69ff', restricted: '#8847ff',
        classified: '#d32ce6', covert: '#eb4b4b', contraband: '#e4ae39', special: '#f7c948',
    });
});

test('equal saturation is resolved by value and then item id without changing the inputs', async () => {
    const pool = [
        { itemId: 8, value: 10000, grade: 'covert' },
        { itemId: 4, value: 200, grade: 'classified' },
        { itemId: 2, value: 200, grade: 'restricted' },
        { itemId: 1, value: 50, grade: 'consumer' },
    ];
    const built = { ITEMS: [{ id: 1 }, { id: 4 }, { id: 2 }] };
    const used = new Set([99]);
    const before = structuredClone({ pool, built, used });
    assert.equal(await coverOf({ id: 'weapon', family: 'weapon' }, built, pool, {
        used, saturationOf: async () => 0.5,
    }), 2);
    assert.deepEqual({ pool, built, used }, before);
});

test('only the six most valuable unused eligible items compete on saturation', async () => {
    const pool = Array.from({ length: 8 }, (_, i) => ({ itemId: i + 1, value: 1000 - i * 100, grade: 'covert' }));
    const scored = [];
    const itemId = await coverOf({ id: 'weapon', family: 'weapon' }, {
        ITEMS: pool.map((item) => ({ id: item.itemId })),
    }, pool, {
        used: new Set([1]),
        saturationOf: async (id) => {
            scored.push(id);
            return id / 10;
        },
    });
    assert.equal(itemId, 7);
    assert.deepEqual(scored.sort((a, b) => a - b), [2, 3, 4, 5, 6, 7]);
});

test('a knife-chance cover competes on saturation using only unused special items in its K set', async () => {
    const pool = [
        { itemId: 1, value: 5000, grade: 'restricted', weapon: 'Zeus x27' },
        { itemId: 2, value: 100, grade: 'special', weapon: 'Karambit' },
        { itemId: 3, value: 300, grade: 'special', weapon: 'Bayonet' },
        { itemId: 4, value: 9000, grade: 'special', weapon: 'Butterfly Knife' },
    ];
    const saturationOf = async (id) => ({ 1: 1, 2: 0.9, 3: 0.5, 4: 1 })[id];
    assert.equal(await coverOf(
        { id: 'knife-3', family: 'knife-chance' }, { ITEMS: [{ id: 1 }, { id: 2 }, { id: 3 }] }, pool,
        { saturationOf },
    ), 2);
    assert.equal(await coverOf(
        { id: 'knife-3', family: 'knife-chance' }, { ITEMS: [{ id: 1 }, { id: 2 }, { id: 3 }] }, pool,
        { used: new Set([2]), saturationOf },
    ), 3);
});

test('a case without an unused eligible cover fails with its id', async () => {
    await assert.rejects(async () => coverOf({ id: 'missing', family: 'weapon' }, { ITEMS: [] }, []), /missing: .*cover/);
    await assert.rejects(async () => coverOf(
        { id: 'knife-3', family: 'knife-chance' }, { ITEMS: [{ id: 1 }] },
        [{ itemId: 1, value: 20, grade: 'restricted' }],
    ), /knife-3: .*cover/);
    await assert.rejects(async () => coverOf(
        { id: 'used', family: 'weapon' }, { ITEMS: [{ id: 1 }] },
        [{ itemId: 1, value: 20, grade: 'covert' }], { used: new Set([1]) },
    ), /used: .*cover/);
});

test('image saturation is the alpha-weighted mean HSV saturation, including black and transparent pixels', async (t) => {
    const directory = await temporaryDirectory(t);
    const imagePath = path.join(directory, 'pixels.png');
    await sharp(Buffer.from([
        255, 0, 0, 255,
        128, 128, 128, 128,
        0, 255, 0, 0,
        0, 0, 0, 255,
    ]), { raw: { width: 2, height: 2, channels: 4 } }).png().toFile(imagePath);
    assert.ok(Math.abs(await meanSaturation(imagePath) - 255 / (255 + 128 + 255)) < 1e-12);
    const transparentPath = path.join(directory, 'transparent.png');
    await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ff000000' } }).png().toFile(transparentPath);
    assert.equal(await meanSaturation(transparentPath), 0);
});

test('a red picture beats a more valuable grey picture when both are in the top six', async (t) => {
    const directory = await temporaryDirectory(t);
    const greyPath = path.join(directory, 'grey.png');
    const redPath = path.join(directory, 'red.png');
    await sharp({ create: { width: 16, height: 16, channels: 4, background: '#888888' } }).png().toFile(greyPath);
    await sharp({ create: { width: 16, height: 16, channels: 4, background: '#ff0000' } }).png().toFile(redPath);
    const pool = [
        { itemId: 1, value: 200, grade: 'covert' },
        { itemId: 2, value: 100, grade: 'covert' },
    ];
    assert.equal(await coverOf({ id: 'demo', family: 'weapon' }, { ITEMS: [{ id: 1 }, { id: 2 }] }, pool, {
        saturationOf: (id) => meanSaturation(id === 1 ? greyPath : redPath),
    }), 2);
});

test('catalogue order gives earlier new cases first choice and each selection starts with no used covers', async () => {
    const entries = [{ id: 'legacy', family: 'collection' }, { id: 'first', family: 'weapon' }, { id: 'second', family: 'grade' }];
    const built = { ITEMS: [{ id: 1 }, { id: 2 }] };
    const caseDefs = { first: built, second: built };
    const pool = [{ itemId: 1, value: 200, grade: 'covert' }, { itemId: 2, value: 100, grade: 'covert' }];
    const saturationOf = async (id) => (id === 2 ? 1 : 0);
    assert.deepEqual(await coversFor(entries, caseDefs, pool, saturationOf), new Map([['first', 2], ['second', 1]]));
    assert.deepEqual(await coversFor([...entries].reverse(), caseDefs, pool, saturationOf), new Map([['second', 2], ['first', 1]]));
});

test('all 36 committed new cases get unique eligible covers deterministically in catalogue order', async () => {
    const { catalogue } = require('./caseCatalog');
    const { itemPool } = require('./itemPool');
    const manifest = require('../../src/constant/itemIds.json');
    const priceMap = require('../data/priceMap.json');
    const gradeMap = require('../data/gradeMap.json');
    const caseDefs = require('../../src/constant/cases/_all');
    const entries = catalogue();
    const pool = itemPool({ manifest, priceMap, gradeMap });
    const pathsById = new Map(Object.entries(manifest).map(([name, id]) => [id, name]));
    const itemsDir = path.resolve(__dirname, '../../../frontend/public/img/items');
    const saturationOf = (id) => meanSaturation(path.join(itemsDir, pathsById.get(id)));

    const covers = await coversFor(entries, caseDefs, pool, saturationOf);

    assert.equal(covers.size, 36);
    assert.equal(new Set(covers.values()).size, 36);
    assert.deepEqual([...covers.keys()], entries.filter(({ family }) => family !== 'collection').map(({ id }) => id));
    for (const entry of entries.filter(({ family }) => family !== 'collection')) {
        const itemId = covers.get(entry.id);
        assert.ok(caseDefs[entry.id].ITEMS.some(({ id }) => id === itemId), entry.id);
        if (entry.family === 'knife-chance') assert.equal(gradeMap[itemId], 'special', entry.id);
    }
    assert.deepEqual(await coversFor(entries, caseDefs, [...pool].reverse(), saturationOf), covers);
});

test('rendered art has a centred cover, a fading halo, transparent corners and deterministic WebP bytes', async (t) => {
    const directory = await temporaryDirectory(t);
    const coverPath = path.join(directory, 'cover.png');
    const outPath = path.join(directory, 'art.webp');
    await createCover(coverPath);
    await renderArt({ coverPath, color: GRADE_COLORS.milspec, outPath });
    const first = await fs.readFile(outPath);
    const metadata = await sharp(first).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 396);
    assert.equal(metadata.hasAlpha, true);
    const pixels = await sharp(first).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const centre = pixelAt(pixels, 256, 198);
    [50, 204, 128].forEach((channel, i) => assert.ok(Math.abs(centre[i] - channel) < 8, centre));
    assert.equal(centre[3], 255);
    for (const [x, y] of [[0, 0], [511, 0], [0, 395], [511, 395]]) {
        assert.equal(pixelAt(pixels, x, y)[3], 0);
    }
    assert.equal(pixelAt(pixels, 40, 198)[3], 255);
    assert.equal(pixelAt(pixels, 471, 198)[3], 255);
    const halo = pixelAt(pixels, 256, 90);
    assert.ok(halo[2] > halo[0] + 50, halo);
    assert.ok(halo[3] > 0 && halo[3] < 128, halo);
    assert.ok(pixelAt(pixels, 256, 65)[3] < halo[3]);
    await renderArt({ coverPath, color: GRADE_COLORS.milspec, outPath });
    assert.deepEqual(await fs.readFile(outPath), first);
});

test('WebP covers keep their proportions and fit inside the canvas even when tall', async (t) => {
    const directory = await temporaryDirectory(t);
    const coverPath = path.join(directory, 'cover.webp');
    const outPath = path.join(directory, 'art.webp');
    await createCover(coverPath, 80, 200);
    await renderArt({ coverPath, color: GRADE_COLORS.special, outPath });
    const { data, info } = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const visible = [];
    for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
            const i = (y * info.width + x) * info.channels;
            if (data[i + 3] === 255 && data[i + 1] > data[i] + 80) visible.push([x, y]);
        }
    }
    assert.ok(visible.length > 0);
    const xs = visible.map(([x]) => x);
    const ys = visible.map(([, y]) => y);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    const height = Math.max(...ys) - Math.min(...ys) + 1;
    assert.ok(Math.abs(width / height - 80 / 200) < 0.02);
    assert.ok(height <= 330);
    assert.ok(Math.min(...ys) >= 32 && Math.max(...ys) <= 363);
});

test('the renderer follows PNG and WebP manifest keys, converts a shared collection once, and reruns identically', async (t) => {
    const { renderCaseArt } = require('../renderCaseArt');
    const directory = await temporaryDirectory(t);
    const itemsDir = path.join(directory, 'items');
    const outDir = path.join(directory, 'cases');
    await fs.mkdir(path.join(itemsDir, 'Rifles', 'Demo'), { recursive: true });
    await fs.mkdir(outDir);
    const png = 'Rifles/Demo/One.png';
    const webp = 'Rifles/Demo/Two.webp';
    await createCover(path.join(itemsDir, png));
    await createCover(path.join(itemsDir, webp));
    await fs.copyFile(path.join(itemsDir, png), path.join(outDir, 'shared.png'));
    await fs.copyFile(path.join(itemsDir, webp), path.join(outDir, 'kept.webp'));
    const kept = await fs.readFile(path.join(outDir, 'kept.webp'));
    const messages = [];
    const options = {
        manifest: { [png]: 1, [webp]: 2 },
        priceMap: { 1: { default: 10, painted: 10 }, 2: { default: 20, painted: 20 } },
        gradeMap: { 1: 'covert', 2: 'special' },
        entries: [
            { id: 'old-one', family: 'collection', image: '/img/case/shared.webp' },
            { id: 'old-two', family: 'collection', image: '/img/case/shared.webp' },
            { id: 'new-one', family: 'weapon', image: '/img/case/new-one.webp' },
            { id: 'new-two', family: 'knife', image: '/img/case/new-two.webp' },
        ],
        caseDefs: { 'new-one': { ITEMS: [{ id: 1 }] }, 'new-two': { ITEMS: [{ id: 2 }] } },
        itemsDir,
        outDir,
        log: { log: (message) => messages.push(message) },
    };
    assert.deepEqual(await renderCaseArt(options), { converted: 1, rendered: 2 });
    const names = (await fs.readdir(outDir)).sort();
    assert.deepEqual(names, ['kept.webp', 'new-one.webp', 'new-two.webp', 'shared.webp']);
    assert.deepEqual(await fs.readFile(path.join(outDir, 'kept.webp')), kept);
    const shared = await sharp(path.join(outDir, 'shared.webp')).metadata();
    assert.equal(shared.width, 240);
    assert.equal(shared.height, 110);
    assert.equal(shared.hasAlpha, true);
    const first = await Promise.all(names.map((name) => fs.readFile(path.join(outDir, name))));
    assert.deepEqual(await renderCaseArt(options), { converted: 0, rendered: 2 });
    assert.deepEqual(await Promise.all(names.map((name) => fs.readFile(path.join(outDir, name)))), first);
    assert.equal(messages.length, 5);
});
