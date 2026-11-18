const { query, validationResult } = require('express-validator');
const StatsService = require('../../services/adminStats');
const MESSAGE = require('../../constant/responseMessages');
const { answerFailure } = require('../../helpers/failure');

const DAY = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;

module.exports.get = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new Error(MESSAGE.VALIDATOR.ERROR);
        }
        const to = req.query.to === undefined ? new Date() : new Date(req.query.to);
        const from = req.query.from === undefined ? new Date(to.getTime() - 30 * DAY) : new Date(req.query.from);
        const duration = to - from;
        if (!Number.isFinite(duration) || duration <= 0 || duration > 365 * DAY) {
            throw new Error(MESSAGE.VALIDATOR.ERROR);
        }
        const result = await StatsService.get({ from: from.toISOString(), to: to.toISOString() });
        return res.status(200).json({ status: 200, data: result });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin stats.get' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'get':
            return ['from', 'to'].map((field) => query(field).optional().isString().bail()
                .matches(ISO_DATE).bail().isISO8601({ strict: true, strictSeparator: true }).bail()
                .custom((value) => new Date(value).getUTCFullYear() >= 1000 && new Date(value).getUTCFullYear() <= 9999));
        default:
            return [];
    }
};
