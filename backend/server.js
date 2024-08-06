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


const server = app.listen(config.port, () =>
    console.log(`Listening on port ${config.port}`)
);


if (process.env.CI) {
    console.log(`Tested success`);
    process.exit(0);
}
