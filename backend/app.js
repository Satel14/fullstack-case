const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const routes = require('./routes');
const clientOrigin = require('./src/config/clientOrigin');
const { parseTrustProxy } = require('./src/config/trustProxy');
const { jsonBody } = require('./src/middleware/jsonBody');
const answerUnhandled = require('./src/middleware/answerUnhandled');

const buildApp = () => {
    const app = express();
    app.set('query parser', 'simple');
    app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'none'"],
                baseUri: ["'none'"],
                formAction: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        referrerPolicy: { policy: 'strict-origin' },
        xFrameOptions: { action: 'deny' },
        strictTransportSecurity: false,
    }));
    app.use(cors({ origin: [clientOrigin()] }));
    app.use(jsonBody);
    app.use(compression());
    routes(app);
    app.use(answerUnhandled);
    return app;
};

module.exports = { buildApp };
