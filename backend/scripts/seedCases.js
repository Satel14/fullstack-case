const Category = require('../src/models/category');
const Case = require('../src/models/case');
const sequelize = require('../src/config/db');
const allCases = require('../src/constant/cases/_all');
const path = require('path');
const casePricesPath = path.join(__dirname, 'data', 'casePrices.json');
const casePrices = require('fs').existsSync(casePricesPath) ? require(casePricesPath) : {};

async function seedCases() {
    try {
        console.log('🚀 Starting cases and categories seed...');

        await sequelize.sync();
        console.log('✓ Database synced for cases');

        // Create default categories
        const categories = [
            { id: 1, title: 'CS:GO Weapon Cases', priority: 100, published: 1 },
            { id: 2, title: 'Operation Cases', priority: 90, published: 1 },
            { id: 3, title: 'Souvenir Packages', priority: 80, published: 1 }
        ];

        for (const cat of categories) {
            await Category.upsert({
                category_id: cat.id,
                category_title: cat.title,
                category_priority: cat.priority,
                category_published: cat.published
            });
        }
        console.log('✓ Categories added');

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

        // Insert all cases from config
        let count = 0;
        for (const [caseId, caseConfig] of Object.entries(allCases)) {
            let actualConfig = caseConfig;

            try {
                const imgFilename = imageMap[caseId] || `${caseId}.png`;
                await Case.upsert({
                    case_id: caseId,
                    case_title: actualConfig.name || caseId.toUpperCase(),
                    case_price: casePrices[caseId] != null ? casePrices[caseId] : (actualConfig.price || 100),
                    case_categoryId: actualConfig.type === 'souvenir' ? 3 : 1,
                    case_published: 1,
                    case_img: `/img/case/${imgFilename}`,
                    case_openedCount: 0,
                    case_type: actualConfig.type || 'weapon',
                    case_openLimit: 1000
                });
                count++;
            } catch (err) {
                console.error(`Error adding case ${caseId}:`, err.message);
            }
        }

        console.log(`✓ Added ${count} cases`);
        console.log('✅ Cases seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding cases:', error);
    } finally {
        await sequelize.close();
    }
}

seedCases();
