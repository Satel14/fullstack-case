const { body, param, validationResult } = require('express-validator');
const { UniqueConstraintError } = require('sequelize');
const Promocode = require('../../models/promocode');
const AdminActionService = require('../../services/adminAction');
const MESSAGE = require('../../constant/responseMessages');
const { MYSQL_INT_MAX } = require('../../constant/mysql');
const sequelize = require('../../config/db');
const { withinChars } = require('../../helpers/charLength');
const { answerFailure } = require('../../helpers/failure');

const MUTABLE = ['active', 'limit', 'expiresAt', 'description'];
const CREATE_FIELDS = ['code', 'bonus', ...MUTABLE];

const isoDate = (value) => (value ? new Date(Math.floor(new Date(value).getTime() / 1000) * 1000).toISOString() : null);

const usedCount = (row) => {
    const raw = row.promo_used_ids;
    return (Array.isArray(raw) ? raw : JSON.parse(raw || '[]')).length;
};

const snapshot = (row) => ({
    code: row.promo_code,
    description: row.promo_description,
    bonus: Number(row.promo_bonus),
    limit: row.promo_limit,
    active: row.promo_active,
    expiresAt: isoDate(row.promo_expiresAt),
});

const publicCode = (row) => ({ ...snapshot(row), used: usedCount(row), created_at: row.created_at });

const record = (req, row, action, payload, transaction) => AdminActionService.record({
    adminId: req.user.profile.user_id,
    action: `promocode.${action}`,
    targetType: 'promocode',
    targetId: row.promo_code,
    payload,
}, { transaction });

module.exports.list = async (req, res) => {
    try {
        const rows = await Promocode.findAll({ order: [['created_at', 'DESC'], ['promo_code', 'ASC']] });
        return res.status(200).json({ status: 200, data: rows.map(publicCode) });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin promocodes.list' });
    }
};

module.exports.create = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty() || Object.keys(req.body).some((field) => !CREATE_FIELDS.includes(field))) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const saved = await sequelize.transaction(async (transaction) => {
            const now = new Date();
            let row;
            try {
                row = await Promocode.create({
                    promo_code: req.body.code,
                    promo_description: req.body.description ?? '',
                    promo_bonus: Number(req.body.bonus).toFixed(2),
                    promo_limit: Number(req.body.limit),
                    promo_used_ids: [],
                    promo_active: req.body.active ?? true,
                    promo_expiresAt: isoDate(req.body.expiresAt),
                    created_at: now,
                    updated_at: now,
                }, { transaction });
            } catch (e) {
                if (e instanceof UniqueConstraintError) {
                    throw new Error(MESSAGE.PROMOCODE.ALREADY_EXISTS);
                }
                throw e;
            }
            await record(req, row, 'create', { before: {}, after: snapshot(row) }, transaction);
            return row;
        });
        return res.status(200).json({ status: 200, data: publicCode(saved) });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin promocodes.create' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const errors = validationResult(req);
        const fields = Object.keys(req.body);
        if (!errors.isEmpty() || fields.length === 0 || fields.some((field) => !MUTABLE.includes(field))) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const saved = await sequelize.transaction(async (transaction) => {
            const row = await Promocode.findByPk(req.params.code, { transaction, lock: transaction.LOCK.UPDATE });
            if (!row) { throw new Error(MESSAGE.PROMOCODE.NOT_EXIST); }
            if (req.body.limit !== undefined && Number(req.body.limit) < usedCount(row)) {
                throw new Error(MESSAGE.PROMOCODE.LIMIT_BELOW_USED);
            }
            const current = snapshot(row);
            const next = { ...req.body };
            if (next.limit !== undefined) { next.limit = Number(next.limit); }
            if (next.expiresAt !== undefined) { next.expiresAt = isoDate(next.expiresAt); }
            const changed = fields.filter((field) => current[field] !== next[field]);
            const before = Object.fromEntries(changed.map((field) => [field, current[field]]));
            const after = Object.fromEntries(changed.map((field) => [field, next[field]]));
            if (changed.length > 0) {
                await row.update({
                    ...Object.fromEntries(changed.map((field) => [`promo_${field}`, next[field]])),
                    updated_at: new Date(),
                }, { transaction });
            }
            await record(req, row, 'update', { before, after }, transaction);
            return row;
        });
        return res.status(200).json({ status: 200, data: publicCode(saved) });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin promocodes.update' });
    }
};

const codeRule = (rule) => rule.custom(withinChars(3, 32)).bail().not().matches(/[^A-Za-z0-9_-]/);
const mutableRules = () => [
    body('active').optional().custom((value) => typeof value === 'boolean'),
    body('limit').optional().not().isArray().isInt({ min: 1, max: MYSQL_INT_MAX }),
    body('description').optional().custom(withinChars(0, 255)),
    body('expiresAt').optional({ nullable: true }).isString().bail()
        .isISO8601({ strict: true, strictSeparator: true }).bail()
        .custom((value) => /T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
            && new Date(value).getUTCFullYear() <= 9999 && new Date(isoDate(value)).getTime() > Date.now()),
];

module.exports.validate = (method) => {
    switch (method) {
        case 'create':
            return [
                codeRule(body('code')),
                body('bonus').not().isArray().bail()
                    .custom((value) => typeof value === 'number' || typeof value === 'string').bail()
                    .matches(/^\d+(\.\d{1,2})?$/).isFloat({ gt: 0, max: 100000 }),
                ...mutableRules(),
                body('limit').exists(),
                body('expiresAt').optional().custom((value) => value !== null),
            ];
        case 'update':
            return [codeRule(param('code')), ...mutableRules()];
        default:
            return [];
    }
};
