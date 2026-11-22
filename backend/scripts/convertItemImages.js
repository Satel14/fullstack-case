const { convertItemTree } = require('./lib/convertImages');
const { IMAGES_PATH, MANIFEST_PATH } = require('./lib/enumerateItems');

if (require.main === module) {
    convertItemTree({ imagesPath: IMAGES_PATH, manifestPath: MANIFEST_PATH }).catch((error) => {
        console.error('❌ convertItemImages failed:', error.message);
        process.exitCode = 1;
    });
}
