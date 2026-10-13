const MESSAGE = require('../constant/responseMessages');

const textsOf = (node) => (typeof node === 'string' ? [node] : Object.values(node).flatMap(textsOf));

const PLAYER_TEXTS = new Set(textsOf(MESSAGE));

const playerText = (e) => (e && PLAYER_TEXTS.has(e.message) ? e.message : null);

const answerFailure = (res, e, { status, where }) => {
    const text = playerText(e);
    if (text) {
        return res.status(status).json({ status, message: text });
    }
    console.error(`[${where}] unexpected error:`, e);
    return res.status(500).json({ status: 500, message: MESSAGE.SERVER.ERROR });
};

module.exports = { answerFailure };
