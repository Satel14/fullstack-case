const fs = require('fs');
const path = require('path');
const ITEMS = require('../../src/constant/itemConfigs');

const categoryMapping = {
    Heavy: ITEMS.TYPE.MACHINE_GUNS,
    Pistols: ITEMS.TYPE.PISTOLS,
    Rifles: ITEMS.TYPE.ASSAULT_RIFLES,
    SMGs: ITEMS.TYPE.SUBMACHINE_GUNS,
    Sniper_Rifles: ITEMS.TYPE.SNIPER_RIFLES,
    Shotguns: ITEMS.TYPE.SHOTGUNS,
    Other: ITEMS.TYPE.KNIFE,
};

const wears = Object.values(ITEMS.RARITY);

const IMAGES_PATH = path.join(__dirname, '../../../frontend/public/img/items');
const MANIFEST_PATH = path.join(__dirname, '../../src/constant/itemIds.json');
const LISTED_KEYS = 10;

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const subdirectories = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(byName);

const listImages = (basePath = IMAGES_PATH) => {
    const keys = [];
    for (const category of subdirectories(basePath)) {
        for (const weapon of subdirectories(path.join(basePath, category))) {
            const skins = fs.readdirSync(path.join(basePath, category, weapon))
                .filter((f) => f.endsWith('.png'))
                .sort(byName);
            skins.forEach((skin) => keys.push(`${category}/${weapon}/${skin}`));
        }
    }
    return keys;
};

const readManifest = (manifestPath = MANIFEST_PATH) => JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const serializeManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

const registerImages = (keys, manifest) => {
    const next = { ...manifest };
    const added = [];
    let maxId = Math.max(0, ...Object.values(manifest));
    for (const key of keys) {
        if (!Object.hasOwn(next, key)) {
            maxId += 1;
            next[key] = maxId;
            added.push(key);
        }
    }
    return { manifest: next, added };
};

const folderOf = (key) => key.slice(0, key.lastIndexOf('/'));

const slotsInFolder = (manifest) => {
    const folders = new Map();
    for (const [key, id] of Object.entries(manifest)) {
        const folder = folderOf(key);
        if (!folders.has(folder)) folders.set(folder, []);
        folders.get(folder).push([key, id]);
    }
    const slots = new Map();
    for (const entries of folders.values()) {
        entries.sort(([, a], [, b]) => a - b).forEach(([key], slot) => slots.set(key, slot));
    }
    return slots;
};

const listKeys = (keys) => {
    const shown = keys.slice(0, LISTED_KEYS).join(', ');
    return keys.length > LISTED_KEYS ? `${shown} and ${keys.length - LISTED_KEYS} more` : shown;
};

const enumerateItems = (basePath = IMAGES_PATH, manifest = readManifest()) => {
    const keys = listImages(basePath);
    const unregistered = keys.filter((key) => !Object.hasOwn(manifest, key));
    if (unregistered.length > 0) {
        throw new Error(
            `${unregistered.length} item images have no id in src/constant/itemIds.json: ${listKeys(unregistered)}. `
            + 'Run node scripts/registerItemImages.js and commit src/constant/itemIds.json before seeding.',
        );
    }

    const slots = slotsInFolder(manifest);
    return keys
        .map((key) => [key, manifest[key]])
        .sort(([, a], [, b]) => a - b)
        .map(([key, itemId]) => {
            const [category, weapon, skin] = key.split('/');
            const slot = slots.get(key);
            return {
                itemId,
                name: `${weapon} | ${skin.replace('.png', '')}`,
                rare: wears[slot % wears.length],
                type: categoryMapping[category] || 'unknown',
                colors: slot % 3 === 0 ? 'painted' : 'default',
                imagePath: `/img/items/${key}`,
                category,
                weapon,
            };
        });
};

module.exports = {
    enumerateItems,
    listImages,
    readManifest,
    registerImages,
    serializeManifest,
    categoryMapping,
    wears,
    IMAGES_PATH,
    MANIFEST_PATH,
};
