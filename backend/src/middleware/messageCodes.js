const MESSAGE = require('../constant/responseMessages');

const leaves = (node, at) => (typeof node === 'string'
    ? [[at, node]]
    : Object.entries(node).flatMap(([key, child]) => leaves(child, at ? `${at}.${key}` : key)));

const CATALOGUE = leaves(MESSAGE, '');

const CODE_BY_TEXT = new Map(CATALOGUE.map(([code, text]) => [text, code]));

const isPlainObject = (body) => Boolean(body) && typeof body === 'object' && !Array.isArray(body);

const withCode = (body) => {
    if (!isPlainObject(body) || typeof body.message !== 'string' || Object.prototype.hasOwnProperty.call(body, 'code')) {
        return body;
    }
    const code = CODE_BY_TEXT.get(body.message);
    return code ? { ...body, code } : body;
};

const messageCodes = (req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => json(withCode(body));
    next();
};

module.exports = { messageCodes, CATALOGUE };
