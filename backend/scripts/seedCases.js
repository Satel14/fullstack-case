const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Category = require('../src/models/category');
const Case = require('../src/models/case');
const sequelize = require('../src/config/db');
const { assertMigrationsApplied } = require('../src/db/migrator');
const allCases = require('../src/constant/cases/_all');
const { requireCasePrices } = require('./lib/casePrices');

const CASE_PRICES_FILE = path.join(__dirname, 'data', 'casePrices.json');

const readCasePrices = () => (
    fs.existsSync(CASE_PRICES_FILE) ? JSON.parse(fs.readFileSync(CASE_PRICES_FILE, 'utf8')) : {}
);

const categories = [
    { id: 1, title: 'CS:GO Weapon Cases', priority: 100, published: 1 },
    { id: 2, title: 'Operation Cases', priority: 90, published: 1 },
    { id: 3, title: 'Souvenir Packages', priority: 80, published: 1 }
];

const imageMap = {
    'bomj': 'case-victory.png',
    'havoc': '12havoc.png',
    'cobblestone': '12cobble.png',
    'chop-shop': '12chop-shop.png',
    'train': '12train.png',
    'alpha': '12alpha.png',
    'nuke-op': '12nuke.png',
    'st-marc': '12st-marc.png',
    'lake': '12lake.png',
    'baggage': '12baggage.png',
    'bank': '12bank.png',
    'gods-monster': 'gods-of-monster1.png',
    'mirage-op': '12mirage.png',
    'cache': '12cache.png',
    'norse': 'norse1.png',
    'sportfield': 'SportField.png',
    'inferno-op': '12inferno.png',
    'anubis': 'anubis.png',
    'dust2-op': '12dust2.png',
    'rising-sun': '1rising-sun.png',
    'safehouse': '12safehouse.png',
    'ancient': 'anicent.png',
    'italy': '12italy.png',
    'graphic': 'graphic.png',
    'overpass': '2024OverpassCollection.png',
    'nuke': 'nuke-2.png',
    'vertigo-2021': 'vertigo2021.png',
    'control': 'control1.png',
    'dust2-2021': 'dust20211.png',
    'mirage-2021': 'mirage20211.png',
    'dust2': 'dust2.png',
    'overpass-old': 'overpass1.png',
    'inferno-old': 'inferno-old.png',
    'vertigo-old': 'vertigo-old.png',
    'velocity': 'case-velocity.png',
    'victory': 'case-victory.png',
    'vindicator': 'case-vindicator.png',
    'zephyr': 'case-zephyr.png'
};

const clearStaleSale = async (caseId, transaction) => {
    const notBelowPrice = { case_id: caseId, case_discount: { [Op.gte]: sequelize.col('price') } };
    const stale = await Case.findOne({ attributes: ['case_price', 'case_discount'], where: notBelowPrice, transaction });
    if (stale) {
        await Case.update({ case_discount: null }, { where: notBelowPrice, transaction });
    }
    return stale;
};

const seedCases = async ({ casePrices = readCasePrices(), log = console } = {}) => {
    requireCasePrices(Object.keys(allCases), casePrices);
    log.log('🚀 Starting cases and categories seed...');

    await assertMigrationsApplied(sequelize);
    log.log('✓ Migrations verified for cases');

    for (const cat of categories) {
        await Category.upsert({
            category_id: cat.id,
            category_title: cat.title,
            category_priority: cat.priority,
            category_published: cat.published
        });
    }
    log.log('✓ Categories added');

    let count = 0;
    for (const [caseId, caseConfig] of Object.entries(allCases)) {
        try {
            const imgFilename = imageMap[caseId] || `${caseId}.png`;
            const stale = await sequelize.transaction(async (transaction) => {
                await Case.upsert({
                    case_id: caseId,
                    case_title: caseConfig.name || caseId.toUpperCase(),
                    case_price: casePrices[caseId],
                    case_categoryId: caseConfig.type === 'souvenir' ? 3 : 1,
                    case_published: 1,
                    case_img: `/img/case/${imgFilename}`,
                    case_openedCount: 0,
                    case_type: caseConfig.type || 'weapon',
                    case_openLimit: 1000
                }, { transaction });
                return clearStaleSale(caseId, transaction);
            });
            if (stale) {
                log.warn(`⚠ ${caseId}: sale price ${stale.case_discount} is not below the new price ${stale.case_price}; the sale is cleared`);
            }
            count++;
        } catch (err) {
            log.error(`Error adding case ${caseId}:`, err.message);
        }
    }

    log.log(`✓ Added ${count} cases`);
    log.log('✅ Cases seeded successfully!');
};

const repriceCases = async ({ casePrices = readCasePrices(), log = console } = {}) => {
    requireCasePrices(Object.keys(allCases), casePrices);
    await assertMigrationsApplied(sequelize);

    let repriced = 0;
    for (const caseId of Object.keys(allCases)) {
        const stale = await sequelize.transaction(async (transaction) => {
            const [changed] = await Case.update(
                { case_price: casePrices[caseId] },
                { where: { case_id: caseId, case_price: { [Op.ne]: casePrices[caseId] } }, transaction },
            );
            repriced += changed;
            return clearStaleSale(caseId, transaction);
        });
        if (stale) {
            log.warn(`⚠ ${caseId}: sale price ${stale.case_discount} is not below the new price ${stale.case_price}; the sale is cleared`);
        }
    }

    log.log(`✓ Re-priced ${repriced} cases`);
    return { repriced };
};

const main = async () => {
    try {
        await (process.argv.includes('--prices-only') ? repriceCases() : seedCases());
    } catch (error) {
        console.error('❌ Error seeding cases:', error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
};

if (require.main === module) {
    main();
}

module.exports = { seedCases, repriceCases };
