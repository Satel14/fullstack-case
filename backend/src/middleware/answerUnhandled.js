const MESSAGE = require('../constant/responseMessages');

const requestFaultStatus = (err) => {
    const status = err && (err.status || err.statusCode);
    return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
};

const answerUnhandled = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const status = requestFaultStatus(err);
    if (status) {
        return res.status(status).json({ status, message: MESSAGE.SERVER.BAD_REQUEST });
    }
    console.error('[http] unexpected error:', err);
    return res.status(500).json({ status: 500, message: MESSAGE.SERVER.ERROR });
};

module.exports = answerUnhandled;
