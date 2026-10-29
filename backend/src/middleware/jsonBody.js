const bodyParser = require('body-parser');

const INHERITED_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

const withoutPrototypeKeys = (key, value) => (INHERITED_KEYS.has(key) ? undefined : value);

const jsonBody = bodyParser.json({ reviver: withoutPrototypeKeys });

module.exports = { jsonBody, withoutPrototypeKeys };
