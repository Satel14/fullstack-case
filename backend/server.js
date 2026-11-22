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
require('./src/models/upgrade');

const sequelize = require('./src/config/db');
const { assertMigrationsApplied } = require('./src/db/migrator');
const RedisManager = require('./src/redis/manager');
const chat = require('./src/socket/chat');
const { installShutdown, trackUpgrades } = require('./src/shutdown');
const { loggable } = require('./src/helpers/failure');

let server;
let upgraded;
let cacheSync;
let withdrawalSweep;
let emailSweep;
const lifecycle = installShutdown({
    health: app.locals.health,
    getResources: () => ({
        server, upgraded, io: chat.getIo(), sweeps: [withdrawalSweep, emailSweep], cacheSync,
    }),
    redis: RedisManager,
    sequelize,
});

assertMigrationsApplied(sequelize).then(() => {
    if (lifecycle.isStopping()) {
        return;
    }
    server = app.listen(config.port, () =>
        console.log(`Listening on port ${config.port}`)
    );
    upgraded = trackUpgrades(server);

    chat(server);

    cacheSync = RedisManager.startItemCacheSync();

    withdrawalSweep = require('./src/services/withdrawal').startSweep();
    emailSweep = require('./src/services/emailVerification').startSweep();
}).catch((err) => {
    if (lifecycle.isStopping()) {
        return;
    }
    console.error(loggable(err));
    process.exit(1);
});
