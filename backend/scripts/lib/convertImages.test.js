const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { convertItemTree, convertToWebp, pngFilesUnder } = require('./convertImages');

const quiet = { log() {} };

const tree = async (t, files, manifest) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-images-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const images = path.join(dir, 'items');
    for (const file of files) {
        fs.mkdirSync(path.dirname(path.join(images, file)), { recursive: true });
        await sharp({ create: { width: 8, height: 6, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } })
            .png().toFile(path.join(images, file));
    }
    const manifestPath = path.join(dir, 'itemIds.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { images, manifestPath };
};

test('every PNG becomes a WebP of the same size and its id moves to the WebP key', async (t) => {
    const { images, manifestPath } = await tree(t, ['Rifles/AK-47/Vulcan.png', 'Rifles/AK-47/Redline.png'], {
        'Rifles/AK-47/Vulcan.png': 3,
        'Rifles/AK-47/Gone.png': 10,
        'Rifles/AK-47/Redline.png': 7,
        'Rifles/AK-47/Existing.webp': 11,
    });
    const otherFile = path.join(images, 'keep.txt');
    fs.writeFileSync(otherFile, 'keep');
    const relativeImages = path.relative(process.cwd(), images);
    assert.deepStrictEqual(pngFilesUnder(relativeImages), [
        path.join(images, 'Rifles/AK-47/Redline.png'),
        path.join(images, 'Rifles/AK-47/Vulcan.png'),
    ]);

    const result = await convertItemTree({ imagesPath: relativeImages, manifestPath, log: quiet });

    assert.deepStrictEqual(result, { converted: 2, renamed: 2 });
    assert.deepStrictEqual(pngFilesUnder(images), []);
    for (const skin of ['Redline', 'Vulcan']) {
        const meta = await sharp(path.join(images, `Rifles/AK-47/${skin}.webp`)).metadata();
        assert.deepStrictEqual([meta.format, meta.width, meta.height, meta.hasAlpha], ['webp', 8, 6, true]);
    }
    const expected = {
        'Rifles/AK-47/Vulcan.webp': 3,
        'Rifles/AK-47/Gone.png': 10,
        'Rifles/AK-47/Redline.webp': 7,
        'Rifles/AK-47/Existing.webp': 11,
    };
    assert.strictEqual(fs.readFileSync(manifestPath, 'utf8'), `${JSON.stringify(expected, null, 2)}\n`);
    assert.strictEqual(fs.readFileSync(otherFile, 'utf8'), 'keep');
});

test('a second run converts nothing and leaves the manifest file untouched', async (t) => {
    const { images, manifestPath } = await tree(t, ['Pistols/P250/Asiimov.png'], { 'Pistols/P250/Asiimov.png': 1 });
    await convertItemTree({ imagesPath: images, manifestPath, log: quiet });
    const before = fs.readFileSync(manifestPath, 'utf8');
    const oldTime = new Date('2000-01-01T00:00:00Z');
    fs.utimesSync(manifestPath, oldTime, oldTime);
    const modifiedAt = fs.statSync(manifestPath).mtimeMs;
    const imagePath = path.join(images, 'Pistols/P250/Asiimov.webp');
    const imageBefore = fs.readFileSync(imagePath);

    assert.deepStrictEqual(await convertItemTree({ imagesPath: images, manifestPath, log: quiet }), { converted: 0, renamed: 0 });
    assert.strictEqual(fs.readFileSync(manifestPath, 'utf8'), before);
    assert.strictEqual(fs.statSync(manifestPath).mtimeMs, modifiedAt);
    assert.deepStrictEqual(fs.readFileSync(imagePath), imageBefore);
});

test('a new PNG without an id is converted and left for registerItemImages to number', async (t) => {
    const { images, manifestPath } = await tree(t, ['SMGs/MP9/Hydra.png'], {});
    fs.writeFileSync(manifestPath, '{ }\n');
    const before = fs.readFileSync(manifestPath, 'utf8');

    assert.deepStrictEqual(await convertItemTree({ imagesPath: images, manifestPath, log: quiet }), { converted: 1, renamed: 0 });
    assert.ok(fs.existsSync(path.join(images, 'SMGs/MP9/Hydra.webp')));
    assert.deepStrictEqual(pngFilesUnder(images), []);
    assert.strictEqual(fs.readFileSync(manifestPath, 'utf8'), before);
});

test('a PNG whose WebP key already has an id stops the run before any file changes', async (t) => {
    const files = ['Rifles/AK-47/Redline.png', 'Rifles/M4A4/Howl.png'];
    const { images, manifestPath } = await tree(t, files, {
        'Rifles/AK-47/Redline.png': 7,
        'Rifles/M4A4/Howl.png': 5,
        'Rifles/M4A4/Howl.webp': 6,
    });
    const before = fs.readFileSync(manifestPath, 'utf8');
    const originals = files.map((file) => fs.readFileSync(path.join(images, file)));

    await assert.rejects(convertItemTree({ imagesPath: images, manifestPath, log: quiet }), /Rifles\/M4A4\/Howl\.webp/);

    assert.strictEqual(fs.readFileSync(manifestPath, 'utf8'), before);
    files.forEach((file, index) => {
        assert.deepStrictEqual(fs.readFileSync(path.join(images, file)), originals[index]);
        assert.ok(!fs.existsSync(path.join(images, file.replace(/\.png$/, '.webp'))));
    });
});

test('an interrupted run recovers converted ids in place and keeps missing image ids reserved', async (t) => {
    const { images, manifestPath } = await tree(t, ['Rifles/AK-47/Redline.png', 'Rifles/AK-47/Vulcan.png'], {
        'Rifles/AK-47/Vulcan.png': 3,
        'Rifles/AK-47/Gone.png': 10,
        'Rifles/AK-47/Redline.png': 7,
    });
    const convertedPath = await convertToWebp(path.join(images, 'Rifles/AK-47/Redline.png'));
    const convertedBefore = fs.readFileSync(convertedPath);

    assert.deepStrictEqual(await convertItemTree({ imagesPath: images, manifestPath, log: quiet }), { converted: 1, renamed: 2 });
    assert.deepStrictEqual(Object.entries(JSON.parse(fs.readFileSync(manifestPath, 'utf8'))), [
        ['Rifles/AK-47/Vulcan.webp', 3],
        ['Rifles/AK-47/Gone.png', 10],
        ['Rifles/AK-47/Redline.webp', 7],
    ]);
    assert.deepStrictEqual(fs.readFileSync(convertedPath), convertedBefore);
    assert.deepStrictEqual(pngFilesUnder(images), []);
    assert.ok(!fs.existsSync(path.join(images, 'Rifles/AK-47/Gone.png')));
    assert.ok(!fs.existsSync(path.join(images, 'Rifles/AK-47/Gone.webp')));
});

test('a run interrupted after every conversion repairs the manifest without any PNGs left', async (t) => {
    const { images, manifestPath } = await tree(t, ['Pistols/P250/Asiimov.png'], { 'Pistols/P250/Asiimov.png': 1 });
    await convertToWebp(path.join(images, 'Pistols/P250/Asiimov.png'));

    assert.deepStrictEqual(await convertItemTree({ imagesPath: images, manifestPath, log: quiet }), { converted: 0, renamed: 1 });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), { 'Pistols/P250/Asiimov.webp': 1 });
});

test('a recovered WebP key with an existing id stops the run before other images change', async (t) => {
    const { images, manifestPath } = await tree(t, ['Rifles/AK-47/Redline.png', 'Rifles/M4A4/Howl.png'], {
        'Rifles/AK-47/Redline.png': 7,
        'Rifles/M4A4/Howl.png': 5,
        'Rifles/M4A4/Howl.webp': 6,
    });
    const recoveredPath = await convertToWebp(path.join(images, 'Rifles/M4A4/Howl.png'));
    const before = fs.readFileSync(manifestPath, 'utf8');
    const pendingPath = path.join(images, 'Rifles/AK-47/Redline.png');
    const pendingBefore = fs.readFileSync(pendingPath);
    const recoveredBefore = fs.readFileSync(recoveredPath);

    await assert.rejects(convertItemTree({ imagesPath: images, manifestPath, log: quiet }), /Rifles\/M4A4\/Howl\.webp/);

    assert.strictEqual(fs.readFileSync(manifestPath, 'utf8'), before);
    assert.deepStrictEqual(fs.readFileSync(pendingPath), pendingBefore);
    assert.deepStrictEqual(fs.readFileSync(recoveredPath), recoveredBefore);
    assert.ok(!fs.existsSync(path.join(images, 'Rifles/AK-47/Redline.webp')));
});
