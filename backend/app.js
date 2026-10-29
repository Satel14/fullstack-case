const express = require('express');
const cors = require('cors');
const compression = require('compression');
const routes = require('./routes');
const { parseTrustProxy } = require('./src/config/trustProxy');
const { jsonBody } = require('./src/middleware/jsonBody');
const answerUnhandled = require('./src/middleware/answerUnhandled');

const buildApp = () => {
    const app = express();
    app.set('query parser', 'simple');
    app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
    app.use(cors());
    app.use(jsonBody);
    app.use(compression());
    routes(app);
    app.use(answerUnhandled);
    return app;
};

module.exports = { buildApp };
