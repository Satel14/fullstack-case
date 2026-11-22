const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { serializeManifest } = require('./enumerateItems');

sharp.cache(false);

const WEBP_OPTIONS = { quality: 85, alphaQuality: 100, effort: 6 };

const pngFilesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
        const full = path.resolve(dir, entry.name);
        if (entry.isDirectory()) return pngFilesUnder(full);
        return entry.name.endsWith('.png') ? [full] : [];
    })
    .sort();

const webpPathOf = (pngPath) => `${pngPath.slice(0, -'.png'.length)}.webp`;

const convertToWebp = async (pngPath) => {
    const webpPath = webpPathOf(pngPath);
    await sharp(pngPath).webp(WEBP_OPTIONS).toFile(webpPath);
    fs.unlinkSync(pngPath);
    return webpPath;
};

const keyOf = (imagesPath, file) => path.relative(imagesPath, file).split(path.sep).join('/');

const convertItemTree = async ({ imagesPath, manifestPath, log = console }) => {
    const pngs = pngFilesUnder(imagesPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const taken = pngs.map((png) => webpPathOf(keyOf(imagesPath, png))).filter((key) => Object.hasOwn(manifest, key));
    if (taken.length > 0) {
        throw new Error(`${taken.join(', ')} already have an id; a converted PNG would give the same picture a second one`);
    }

    const renames = new Map();
    for (const png of pngs) {
        await convertToWebp(png);
        const key = keyOf(imagesPath, png);
        if (Object.hasOwn(manifest, key)) renames.set(key, webpPathOf(key));
    }

    if (renames.size > 0) {
        const next = Object.fromEntries(Object.entries(manifest).map(([key, id]) => [renames.get(key) || key, id]));
        fs.writeFileSync(manifestPath, serializeManifest(next));
    }
    log.log(`Converted ${pngs.length} PNG item images to WebP, moved ${renames.size} ids to their WebP keys.`);
    return { converted: pngs.length, renamed: renames.size };
};

module.exports = {
    WEBP_OPTIONS, pngFilesUnder, convertToWebp, convertItemTree,
};
