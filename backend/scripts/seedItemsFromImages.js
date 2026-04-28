const fs = require('fs');
const path = require('path');
const Item = require('../src/models/item');
const InsiderPrices = require('../src/models/insiderPrices');
const sequelize = require('../src/config/db');
const ITEMS = require('../src/constant/itemConfigs');

// Mapping categories to item types
const categoryMapping = {
    'Heavy': ITEMS.TYPE.MACHINE_GUNS,
    'Pistols': ITEMS.TYPE.PISTOLS,
    'Rifles': ITEMS.TYPE.ASSAULT_RIFLES,
    'SMGs': ITEMS.TYPE.SUBMACHINE_GUNS,
    'Sniper_Rifles': ITEMS.TYPE.SNIPER_RIFLES,
    'Shotguns': ITEMS.TYPE.SHOTGUNS,
    'Other': ITEMS.TYPE.KNIFE
};

// Grades for distribution
const grades = [
    ITEMS.GRADE.CONSUMER_GRADE,    // 80%
    ITEMS.GRADE.INDUSTRIAL_GRADE,  // 16%
    ITEMS.GRADE.MIL_SPEC,          // 3.2%
    ITEMS.GRADE.RESTRICTED,        // 0.64%
    ITEMS.GRADE.CLASSIFIED,        // 0.32%
    ITEMS.GRADE.COVERT,            // 0.26%
    ITEMS.GRADE.CONTRABAND         // 0.001%
];

// Function to get grade based on index (distributed by rarity)
const getGrade = (index, total) => {
    const ratio = index / total;
    if (ratio < 0.60) return ITEMS.GRADE.CONSUMER_GRADE;
    if (ratio < 0.80) return ITEMS.GRADE.INDUSTRIAL_GRADE;
    if (ratio < 0.90) return ITEMS.GRADE.MIL_SPEC;
    if (ratio < 0.95) return ITEMS.GRADE.RESTRICTED;
    if (ratio < 0.98) return ITEMS.GRADE.CLASSIFIED;
    if (ratio < 0.999) return ITEMS.GRADE.COVERT;
    return ITEMS.GRADE.CONTRABAND;
};

// Qualities/wear
const wears = Object.values(ITEMS.RARITY);

// Function to get wear based on position
const getWear = (index) => {
    return wears[index % wears.length];
};

// Function to get random price based on grade
const getPriceByGrade = (grade) => {
    const priceRanges = {
        [ITEMS.GRADE.CONSUMER_GRADE]: [50, 200],
        [ITEMS.GRADE.INDUSTRIAL_GRADE]: [100, 500],
        [ITEMS.GRADE.MIL_SPEC]: [300, 1000],
        [ITEMS.GRADE.RESTRICTED]: [800, 3000],
        [ITEMS.GRADE.CLASSIFIED]: [2000, 8000],
        [ITEMS.GRADE.COVERT]: [5000, 20000],
        [ITEMS.GRADE.CONTRABAND]: [50000, 500000]
    };
    
    const range = priceRanges[grade] || [100, 1000];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
};

// Function to recursively get all weapon images
const getAllWeaponImages = (basePath) => {
    const items = [];
    let itemId = 1;

    const categories = fs.readdirSync(basePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

    for (const category of categories) {
        const categoryPath = path.join(basePath, category.name);
        const weaponTypes = fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());

        for (const weaponType of weaponTypes) {
            const weaponPath = path.join(categoryPath, weaponType.name);
            const skins = fs.readdirSync(weaponPath)
                .filter(file => file.endsWith('.png'));

            const totalSkins = skins.length;

            for (let i = 0; i < skins.length; i++) {
                const skin = skins[i];
                const skinName = skin.replace('.png', '');
                const imagePath = `/img/items/${category.name}/${weaponType.name}/${skin}`;
                const grade = getGrade(i, totalSkins);
                
                items.push({
                    itemId: itemId,
                    name: `${weaponType.name} | ${skinName}`,
                    rare: getWear(i),
                    grade: grade,
                    colors: i % 3 === 0 ? 'painted' : 'default',
                    type: categoryMapping[category.name] || 'unknown',
                    imagePath: imagePath,
                    category: category.name,
                    weapon: weaponType.name
                });
                
                itemId++;
            }
        }
    }

    return items;
};

async function seedDatabase() {
    try {
        console.log('🚀 Starting database seed from images...\n');

        // Path to items folder
        const imagesPath = path.join(__dirname, '../../frontend/public/img/items');
        
        if (!fs.existsSync(imagesPath)) {
            console.error('❌ Images folder not found:', imagesPath);
            return;
        }

        // Get all items from images
        console.log('📂 Scanning images folder...');
        const items = getAllWeaponImages(imagesPath);
        console.log(`✓ Found ${items.length} items\n`);

        // Sync database
        await sequelize.sync();
        console.log('✓ Database synced\n');

        // Insert items
        console.log('💾 Adding items to database...');
        let successCount = 0;
        const gradeStats = {};
        
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

                // Count by grade
                gradeStats[item.grade] = (gradeStats[item.grade] || 0) + 1;

                // Add prices based on grade
                const basePrice = getPriceByGrade(item.grade);
                const prices = {
                    default: basePrice,
                    painted: Math.floor(basePrice * 1.3),
                };

                await InsiderPrices.upsert({
                    name: item.name,
                    pricesInCredits: JSON.stringify(prices),
                });

                successCount++;
                if (successCount % 100 === 0) {
                    console.log(`  ✓ ${successCount}/${items.length} items added...`);
                }
            } catch (error) {
                console.error(`  ✗ Error adding ${item.name}:`, error.message);
            }
        }

        console.log(`\n✅ Database seeded successfully!`);
        console.log(`\n📊 Statistics:`);
        console.log(`   - Total items: ${items.length}`);
        console.log(`   - Successfully added: ${successCount}`);
        console.log(`   - Failed: ${items.length - successCount}`);
        
        console.log(`\n🎨 Items by Grade:`);
        Object.entries(gradeStats).forEach(([grade, count]) => {
            const color = ITEMS.GRADE_COLORS[grade] || '#FFFFFF';
            console.log(`   ${grade}: ${count} items (${color})`);
        });
        
        console.log(`\n📋 Sample items (first 10):`);
        items.slice(0, 10).forEach(item => {
            console.log(`   ${item.itemId}. ${item.name}`);
            console.log(`      Grade: ${item.grade}, Wear: ${item.rare}, Type: ${item.type}`);
        });
        
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the seed
seedDatabase();

