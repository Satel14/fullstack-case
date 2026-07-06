const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const routes = require('./routes')
const config = require('./src/config/serverConfig')

require("dotenv").config();
const app = express();
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

const sequelize = require('./src/config/db');

sequelize.sync().then(() => {
    console.log('Database synchronized');
    const server = app.listen(config.port, () =>
        console.log(`Listening on port ${config.port}`)
    );

    require('./src/socket/chat')(server);

    const RedisManager = require('./src/redis/manager');
    RedisManager.initialRedisState().catch(console.error);
}).catch(err => {
    console.error('Failed to sync database:', err);
});

if (process.env.CI) {
    console.log(`Tested success`);
    process.exit(0);
}
