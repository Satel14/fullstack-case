const { body, param, validationResult } = require('express-validator');
const CaseService = require('../../services/case');
const AdminActionService = require('../../services/adminAction');
const MESSAGE = require('../../constant/responseMessages');
const sequelize = require('../../config/db');

const snapshot = (row) => ({
    price: row.case_price,
    discount: row.case_discount,
    published: row.case_published,
    openLimit: row.case_openLimit,
    title: row.case_title,
});

module.exports.list = async (req, res) => {
    try {
        const cases = await CaseService.getAllCases(true);
        return res.status(200).json({ status: 200, data: cases });
    } catch (e) {
        console.error('[admin] cases.list failed:', e);
        return res.status(400).json({ status: 400, message: MESSAGE.ADMIN.ERROR });
    }
};

module.exports.update = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;
        const existing = await CaseService.getCaseById(id).catch(() => null);
        if (!existing) {
            return res.status(422).json({ status: 422, message: MESSAGE.CASE.NOT_EXIST });
        }

        const before = snapshot(existing);
        let updated = null;

        await sequelize.transaction(async (t) => {
            updated = await CaseService.updateCaseFields(id, req.body, { transaction: t });

            await AdminActionService.record(
                {
                    adminId: req.user.profile.user_id,
                    action: 'case.update',
                    targetType: 'case',
                    targetId: id,
                    payload: { before, after: snapshot(updated) },
                    reason: req.body.reason,
                },
                { transaction: t },
            );
        });

        return res.status(200).json({ status: 200, data: updated });
    } catch (e) {
        console.error('[admin] cases.update failed:', e);
        return res.status(400).json({ status: 400, message: MESSAGE.ADMIN.ERROR });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'update': {
            return [
                param('id').exists().isString(),
                body('case_price').optional().isInt({ min: 0 }),
                body('case_discount').optional().isInt({ min: 0 }),
                body('case_published').optional().isInt({ min: 0, max: 1 }),
                body('case_openLimit').optional().isInt({ min: -1 }),
                body('case_title').optional().isString().isLength({ max: 255 }),
                body('reason').optional().isString().isLength({ max: 255 }),
            ];
        }
        default:
            return [];
    }
};
