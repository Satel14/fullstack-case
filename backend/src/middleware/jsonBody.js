const bodyParser = require('body-parser');

const INHERITED_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

const withoutPrototypeKeys = (key, value) => (INHERITED_KEYS.has(key) ? undefined : value);

const jsonUpTo = (limit) => bodyParser.json({ limit, reviver: withoutPrototypeKeys });

const ARTICLE_SAVE = /^\/api\/admin\/article\/[^/]+\/?$/i;

const readsItsOwnBody = (req) => req.method === 'PUT' && ARTICLE_SAVE.test(req.path);

const smallJsonBody = jsonUpTo('16kb');

const jsonBody = (req, res, next) => (readsItsOwnBody(req) ? next() : smallJsonBody(req, res, next));

const articleBody = jsonUpTo('256kb');

module.exports = { jsonBody, articleBody, withoutPrototypeKeys };
