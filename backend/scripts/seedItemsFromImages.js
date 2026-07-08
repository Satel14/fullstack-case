const Item = require('../src/models/item');
const sequelize = require('../src/config/db');
const { enumerateItems } = require('./lib/enumerateItems');

async function seedDatabase() {
    try {
        console.log('🚀 Seeding items from images...\n');
        const items = enumerateItems();
        console.log(`✓ Found ${items.length} items`);

        await sequelize.sync();
        console.log('✓ Database synced');

        let successCount = 0;
        for (const item of items) {
            try {
                await Item.upsert({
                    item_itemId: item.itemId,
                    item_name: item.name,
                    item_rare: item.rare,
                    item_colors: item.colors,
                    item_type: item.type,
                    item_imagePath: item.imagePath,
                });
                successCount++;
                if (successCount % 200 === 0) {
                    console.log(`  ✓ ${successCount}/${items.length} items...`);
                }
            } catch (error) {
                console.error(`  ✗ ${item.name}:`, error.message);
            }
        }

        console.log(`\n✅ Seeded ${successCount}/${items.length} items. Prices come from buildPriceMap.js.`);
    } catch (error) {
        console.error('\n❌ Error seeding items:', error);
    } finally {
        await sequelize.close();
    }
}

seedDatabase();
