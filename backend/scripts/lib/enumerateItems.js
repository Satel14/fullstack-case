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

const enumerateItems = (basePath = IMAGES_PATH) => {
    const items = [];
    let itemId = 1;

    const categories = fs.readdirSync(basePath, { withFileTypes: true })
        .filter((d) => d.isDirectory());

    for (const category of categories) {
        const categoryPath = path.join(basePath, category.name);
        const weaponTypes = fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter((d) => d.isDirectory());

        for (const weaponType of weaponTypes) {
            const weaponPath = path.join(categoryPath, weaponType.name);
            const skins = fs.readdirSync(weaponPath).filter((f) => f.endsWith('.png'));

            for (let i = 0; i < skins.length; i++) {
                const skinName = skins[i].replace('.png', '');
                items.push({
                    itemId,
                    name: `${weaponType.name} | ${skinName}`,
                    rare: wears[i % wears.length],
                    type: categoryMapping[category.name] || 'unknown',
                    colors: i % 3 === 0 ? 'painted' : 'default',
                    imagePath: `/img/items/${category.name}/${weaponType.name}/${skins[i]}`,
                    category: category.name,
                    weapon: weaponType.name,
                });
                itemId++;
            }
        }
    }

    return items;
};

module.exports = {
    enumerateItems, categoryMapping, wears, IMAGES_PATH,
};
