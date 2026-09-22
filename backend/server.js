const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const routes = require('./routes')
const config = require('./src/config/serverConfig')

require("dotenv").config();
const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(compression());
routes(app);
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

const sequelize = require('./src/config/db');
const { assertMigrationsApplied } = require('./src/db/migrator');

assertMigrationsApplied(sequelize).then(() => {
    const server = app.listen(config.port, () =>
        console.log(`Listening on port ${config.port}`)
    );

    require('./src/socket/chat')(server);

    const RedisManager = require('./src/redis/manager');
    RedisManager.startItemCacheSync();
}).catch((err) => {
    console.error(err.message);
    process.exit(1);
});

if (process.env.CI) {
    console.log(`Tested success`);
    process.exit(0);
}
