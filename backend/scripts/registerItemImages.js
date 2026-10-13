const fs = require('fs');
const {
    listImages, readManifest, registerImages, serializeManifest, IMAGES_PATH, MANIFEST_PATH,
} = require('./lib/enumerateItems');

const recordNewImages = ({ imagesPath = IMAGES_PATH, manifestPath = MANIFEST_PATH, log = console } = {}) => {
    const keys = listImages(imagesPath);
    const current = readManifest(manifestPath);
    const { manifest, added } = registerImages(keys, current);

    const present = new Set(keys);
    const withoutImage = Object.keys(current).filter((key) => !present.has(key));
    if (withoutImage.length > 0) {
        log.log(`ℹ ${withoutImage.length} ids have no image any more and stay reserved: ${withoutImage.join(', ')}`);
    }

    if (added.length === 0) {
        log.log(`✓ All ${keys.length} item images already have an id; nothing to record.`);
        return added;
    }

    fs.writeFileSync(manifestPath, serializeManifest(manifest));
    added.forEach((key) => log.log(`  + ${manifest[key]}  ${key}`));
    log.log(
        `✅ Recorded ${added.length} new item ids. Commit src/constant/itemIds.json, `
        + 'then run npm run seed and the pricing pipeline so the new items get prices.',
    );
    return added;
};

if (require.main === module) {
    try {
        recordNewImages();
    } catch (error) {
        console.error('❌ registerItemImages failed:', error.message);
        process.exitCode = 1;
    }
}

module.exports = { recordNewImages };
