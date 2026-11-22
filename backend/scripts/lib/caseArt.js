const sharp = require('sharp');
const { GRADE } = require('../../src/constant/itemConfigs');

sharp.cache(false);

const GRADE_COLORS = {
    consumer: '#b0c3d9',
    industrial: '#5e98d9',
    milspec: '#4b69ff',
    restricted: '#8847ff',
    classified: '#d32ce6',
    covert: '#eb4b4b',
    contraband: '#e4ae39',
    special: '#f7c948',
};

const WEBP_OPTIONS = { quality: 85, alphaQuality: 100, effort: 6 };

const meanSaturation = async (imagePath) => {
    const { data, info } = await sharp(imagePath).toColourspace('srgb').ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
    let weighted = 0;
    let totalAlpha = 0;
    for (let i = 0; i < data.length; i += info.channels) {
        const high = Math.max(data[i], data[i + 1], data[i + 2]);
        const low = Math.min(data[i], data[i + 1], data[i + 2]);
        const alpha = data[i + 3];
        weighted += high === 0 ? 0 : ((high - low) / high) * alpha;
        totalAlpha += alpha;
    }
    return totalAlpha === 0 ? 0 : weighted / totalAlpha;
};

const coverOf = async (caseEntry, built, pool, { used = new Set(), saturationOf } = {}) => {
    const ids = new Set(built.ITEMS.map(({ id }) => id));
    const candidates = pool.filter(({ itemId, grade }) => ids.has(itemId) && !used.has(itemId)
        && (caseEntry.family !== 'knife-chance' || grade === GRADE.SPECIAL))
        .sort((a, b) => b.value - a.value || a.itemId - b.itemId)
        .slice(0, 6);
    if (candidates.length === 0) throw new Error(`${caseEntry.id}: no eligible cover item in the case`);
    const scored = await Promise.all(candidates.map(async (item) => ({
        ...item, saturation: await saturationOf(item.itemId),
    })));
    scored.sort((a, b) => b.saturation - a.saturation || b.value - a.value || a.itemId - b.itemId);
    return scored[0].itemId;
};

const coversFor = async (entries, caseDefs, pool, saturationOf) => {
    const used = new Set();
    const covers = new Map();
    const saturations = new Map();
    const cachedSaturation = (id) => {
        if (!saturations.has(id)) saturations.set(id, saturationOf(id));
        return saturations.get(id);
    };
    for (const entry of entries.filter(({ family }) => family !== 'collection')) {
        const itemId = await coverOf(entry, caseDefs[entry.id], pool, { used, saturationOf: cachedSaturation });
        covers.set(entry.id, itemId);
        used.add(itemId);
    }
    return covers;
};

const renderArt = async ({ coverPath, color, outPath }) => {
    const { data, info } = await sharp(coverPath)
        .trim()
        .resize({ width: 440, height: 330, fit: 'inside' })
        .toColourspace('srgb')
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const raw = { width, height, channels };
    const left = Math.round((512 - width) / 2);
    const top = Math.round((396 - height) / 2);
    const silhouette = Buffer.from(data);
    for (let i = 0; i < silhouette.length; i += channels) {
        silhouette[i] = 0;
        silhouette[i + 1] = 0;
        silhouette[i + 2] = 0;
        silhouette[i + 3] = Math.round(silhouette[i + 3] * 0.4);
    }
    const shadow = await sharp(silhouette, { raw })
        .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#00000000' })
        .blur(10)
        .png()
        .toBuffer();
    const halo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="396">
        <defs>
            <radialGradient id="halo">
                <stop offset="0" stop-color="${color}" stop-opacity="0.36"/>
                <stop offset="0.28" stop-color="${color}" stop-opacity="0.27"/>
                <stop offset="0.55" stop-color="${color}" stop-opacity="0.12"/>
                <stop offset="0.8" stop-color="${color}" stop-opacity="0.025"/>
                <stop offset="1" stop-color="${color}" stop-opacity="0"/>
            </radialGradient>
        </defs>
        <ellipse cx="256" cy="218" rx="230" ry="164" fill="url(#halo)"/>
    </svg>`);
    return sharp({ create: { width: 512, height: 396, channels: 4, background: '#00000000' } })
        .composite([
            { input: halo },
            { input: shadow, left: left - 20, top: top - 8 },
            { input: data, raw, left, top },
        ])
        .webp(WEBP_OPTIONS)
        .toFile(outPath);
};

module.exports = { GRADE_COLORS, WEBP_OPTIONS, meanSaturation, coverOf, coversFor, renderArt };
