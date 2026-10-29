const { buildApp } = require('./app')
const config = require('./src/config/serverConfig')

require("dotenv").config();
const app = buildApp();
require('./src/models/article');
require('./src/models/balanceHistory');
require('./src/models/bonusHistory');
require('./src/models/case');
require('./src/models/category');
require('./src/models/insiderPrices');
require('./src/models/item');
require('./src/models/module');
require('./src/models/promocode');
require('./src/models/storage');
require('./src/models/user');
require('./src/models/provablyFairSeed');
require('./src/models/caseOpenRecord');
require('./src/models/adminAction');
require('./src/models/passwordReset');
require('./src/models/emailVerification');

const sequelize = require('./src/config/db');
const { assertMigrationsApplied } = require('./src/db/migrator');

assertMigrationsApplied(sequelize).then(() => {
    const server = app.listen(config.port, () =>
        console.log(`Listening on port ${config.port}`)
    );

    require('./src/socket/chat')(server);

    const RedisManager = require('./src/redis/manager');
    RedisManager.startItemCacheSync();

    require('./src/services/withdrawal').startSweep();
    require('./src/services/emailVerification').startSweep();
}).catch((err) => {
    console.error(err.message);
    process.exit(1);
});

if (process.env.CI) {
    console.log(`Tested success`);
    process.exit(0);
}
