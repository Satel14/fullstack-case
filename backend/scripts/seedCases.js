const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Category = require('../src/models/category');
const Case = require('../src/models/case');
const sequelize = require('../src/config/db');
const { assertMigrationsApplied } = require('../src/db/migrator');
const { CATEGORIES, catalogue } = require('./lib/caseCatalog');
const { requireCasePrices } = require('./lib/casePrices');

const CASE_PRICES_FILE = path.join(__dirname, 'data', 'casePrices.json');

const readCasePrices = () => (
    fs.existsSync(CASE_PRICES_FILE) ? JSON.parse(fs.readFileSync(CASE_PRICES_FILE, 'utf8')) : {}
);

const entries = catalogue();
const caseIds = entries.map(({ id }) => id);
const categoryIds = Object.fromEntries(CATEGORIES.map(({ slug, id }) => [slug, id]));

const categoryValues = ({ id, slug, title, priority }) => ({
    category_id: id,
    category_slug: slug,
    category_title: title,
    category_priority: priority,
    category_published: 1,
});

const caseValues = (entry, casePrices) => ({
    case_id: entry.id,
    case_title: entry.title,
    case_price: casePrices[entry.id],
    case_categoryId: categoryIds[entry.category],
    case_published: 1,
    case_img: entry.image,
    case_openedCount: 0,
    case_type: 'weapon',
    case_openLimit: entry.openLimit,
});

const clearStaleSale = async (caseId, transaction) => {
    const notBelowPrice = { case_id: caseId, case_discount: { [Op.gte]: sequelize.col('price') } };
    const stale = await Case.findOne({ attributes: ['case_price', 'case_discount'], where: notBelowPrice, transaction });
    if (stale) {
        await Case.update({ case_discount: null }, { where: notBelowPrice, transaction });
    }
    return stale;
};

const seedCases = async ({ casePrices = readCasePrices(), log = console } = {}) => {
    requireCasePrices(caseIds, casePrices);
    log.log('🚀 Starting cases and categories seed...');

    await assertMigrationsApplied(sequelize);
    log.log('✓ Migrations verified for cases');

    for (const category of CATEGORIES) {
        await Category.upsert(categoryValues(category));
    }
    log.log('✓ Categories added');

    let count = 0;
    for (const entry of entries) {
        const caseId = entry.id;
        try {
            const stale = await sequelize.transaction(async (transaction) => {
                await Case.upsert(caseValues(entry, casePrices), { transaction });
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

const addNewCases = async ({ casePrices = readCasePrices(), log = console } = {}) => {
    await assertMigrationsApplied(sequelize);
    requireCasePrices(caseIds, casePrices);

    let categories = 0;
    for (const category of CATEGORIES) {
        const [, created] = await Category.findOrCreate({
            where: { category_id: category.id },
            defaults: categoryValues(category),
        });
        if (created) categories += 1;
    }

    let cases = 0;
    for (const entry of entries) {
        const [, created] = await Case.findOrCreate({
            where: { case_id: entry.id },
            defaults: caseValues(entry, casePrices),
        });
        if (created) cases += 1;
    }

    log.log(`✓ Added ${categories} categories and ${cases} cases; existing rows were left as they were`);
    return { categories, cases };
};

const repriceCases = async ({ casePrices = readCasePrices(), log = console } = {}) => {
    requireCasePrices(caseIds, casePrices);
    await assertMigrationsApplied(sequelize);

    let repriced = 0;
    for (const caseId of caseIds) {
        const stale = await sequelize.transaction(async (transaction) => {
            const [changed] = await Case.update(
                { case_price: casePrices[caseId] },
                {
                    where: {
                        case_id: caseId,
                        [Op.or]: [{ case_price: { [Op.ne]: casePrices[caseId] } }, { case_price: null }],
                    },
                    transaction,
                },
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

const PRICES_ONLY = '--prices-only';
const ADD_NEW = '--add-new';

const main = async () => {
    const args = process.argv.slice(2);
    try {
        if (args.length > 1 || args.some((arg) => ![PRICES_ONLY, ADD_NEW].includes(arg))) {
            throw new Error(
                `unknown argument ${args.join(' ')}; run it without arguments to seed, with ${PRICES_ONLY} `
                + `to re-price the cases already in the database, or with ${ADD_NEW} to add missing categories and cases`,
            );
        }
        if (args[0] === PRICES_ONLY) {
            await repriceCases();
        } else if (args[0] === ADD_NEW) {
            await addNewCases();
        } else {
            await seedCases();
        }
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

module.exports = { seedCases, repriceCases, addNewCases };
