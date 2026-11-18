const { body, validationResult } = require('express-validator');
const ModuleService = require('../../services/module');
const AdminActionService = require('../../services/adminAction');
const MESSAGE = require('../../constant/responseMessages');
const sequelize = require('../../config/db');
const { SALE_RATE_MODULE, DEFAULT_SALE_RATE } = require('../../constant/saleRate');
const { withinChars } = require('../../helpers/charLength');
const { answerFailure } = require('../../helpers/failure');

const AT_MOST_FOUR_DECIMALS = /^\d+(?:\.\d{1,4})?$/;

const rateOrNull = (value) => (value === null || value === undefined ? null : Number(value));

module.exports.get = async (req, res) => {
    try {
        const row = await ModuleService.findModuleById(SALE_RATE_MODULE);
        const rate = row ? rateOrNull(row.extraData) : DEFAULT_SALE_RATE;
        return res.status(200).json({ status: 200, data: { rate } });
    } catch (e) {
        return answerFailure(res, e, { status: 400, where: 'admin saleRate.get' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const rate = Number(req.body.rate);

        await sequelize.transaction(async (t) => {
            const before = await ModuleService.setModuleValue(SALE_RATE_MODULE, rate, { transaction: t });
            await AdminActionService.record(
                {
                    adminId: req.user.profile.user_id,
                    action: 'module.update',
                    targetType: 'module',
                    targetId: SALE_RATE_MODULE,
                    payload: { before: { rate: rateOrNull(before) }, after: { rate } },
                    reason: req.body.reason,
                },
                { transaction: t },
            );
        });

        return res.status(200).json({ status: 200, data: { rate } });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin saleRate.update' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'update': {
            return [
                body('rate').exists({ checkNull: true }).not().isArray().isFloat({ gt: 0, max: 1 })
                    .bail()
                    .custom((value) => AT_MOST_FOUR_DECIMALS.test(String(value))),
                body('reason').optional().custom(withinChars(0, 255)),
            ];
        }
        default:
            return [];
    }
};
