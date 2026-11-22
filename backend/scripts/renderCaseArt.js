const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { catalogue } = require('./lib/caseCatalog');
const { itemPool } = require('./lib/itemPool');
const { GRADE_COLORS, WEBP_OPTIONS, meanSaturation, coversFor, renderArt } = require('./lib/caseArt');

const IMAGE_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'img');

const renderCaseArt = async ({
    manifest = require('../src/constant/itemIds.json'),
    priceMap = require('./data/priceMap.json'),
    gradeMap = require('./data/gradeMap.json'),
    entries = catalogue(),
    caseDefs = require('../src/constant/cases/_all'),
    itemsDir = path.join(IMAGE_DIR, 'items'),
    outDir = path.join(IMAGE_DIR, 'case'),
    log = console,
} = {}) => {
    const pool = itemPool({ manifest, priceMap, gradeMap });
    const pathsById = new Map(Object.entries(manifest).map(([imagePath, id]) => [id, imagePath]));
    const itemsById = new Map(pool.map((item) => [item.itemId, item]));
    const covers = await coversFor(entries, caseDefs, pool, (id) => meanSaturation(path.join(itemsDir, pathsById.get(id))));
    await fs.mkdir(outDir, { recursive: true });

    let converted = 0;
    const files = await fs.readdir(outDir, { withFileTypes: true });
    for (const name of files.filter((file) => file.isFile() && /\.png$/i.test(file.name)).map((file) => file.name).sort()) {
        const source = path.join(outDir, name);
        const target = name.replace(/\.png$/i, '.webp');
        await sharp(source).webp(WEBP_OPTIONS).toFile(path.join(outDir, target));
        await fs.unlink(source);
        log.log(`✓ ${name} → ${target}`);
        converted += 1;
    }

    let rendered = 0;
    for (const entry of entries.filter(({ family }) => family !== 'collection')) {
        const itemId = covers.get(entry.id);
        const imagePath = pathsById.get(itemId);
        const filename = path.basename(entry.image);
        await renderArt({
            coverPath: path.join(itemsDir, imagePath),
            color: GRADE_COLORS[itemsById.get(itemId).grade],
            outPath: path.join(outDir, filename),
        });
        log.log(`✓ ${filename}: ${imagePath}`);
        rendered += 1;
    }
    return { converted, rendered };
};

if (require.main === module) {
    renderCaseArt().catch((error) => {
        console.error(`Error rendering case art: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { renderCaseArt };
