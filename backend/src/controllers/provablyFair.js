const { body, check, validationResult } = require('express-validator');
const PFService = require('../services/provablyFair');
const { deriveWinner } = require('../modules/provablyFair');
const RedisManager = require('../redis/manager');
const allCases = require('../constant/cases/_all');
const MESSAGE = require('../constant/responseMessages');

const ITEM_HASH = 'item_hash';

module.exports.getState = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const state = await PFService.getState(user_id);
        return res.status(200).json({ status: 200, data: state });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.setClientSeed = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.PROVABLY_FAIR.CLIENT_SEED_INVALID });
        }
        const { user_id } = req.user.profile;
        const { clientSeed } = req.body;
        const data = await PFService.setClientSeed(user_id, clientSeed);
        return res.status(200).json({ status: 200, message: MESSAGE.PROVABLY_FAIR.SEED_UPDATED, data });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.rotate = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const data = await PFService.rotateSeed(user_id);
        return res.status(200).json({ status: 200, message: MESSAGE.PROVABLY_FAIR.ROTATED, data });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.getHistory = async (req, res) => {
    try {
        const { user_id } = req.user.profile;
        const { limit, offset } = req.query;
        const data = await PFService.getHistory(user_id, limit, offset);
        return res.status(200).json({ status: 200, data });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.verify = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const { serverSeed, clientSeed, nonce, caseId } = req.body;
        const caseDef = allCases[caseId];
        if (!caseDef) {
            return res.status(422).json({ status: 422, message: MESSAGE.CASE.NOT_EXIST });
        }
        const itemHash = await RedisManager.getAllDataHashWithKey(ITEM_HASH);
        const result = deriveWinner(serverSeed, clientSeed, parseInt(nonce, 10), caseDef, itemHash);
        return res.status(200).json({ status: 200, data: result });
    } catch (e) {
        return res.status(400).json({ status: 400, message: MESSAGE.PROVABLY_FAIR.VERIFY_ERROR });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'setClientSeed':
            return [body('clientSeed').exists().isString().isLength({ min: 1, max: 64 })];
        case 'verify':
            return [
                body('serverSeed').exists().isString().isLength({ min: 1, max: 128 }),
                body('clientSeed').exists().isString().isLength({ min: 1, max: 64 }),
                body('nonce').exists().isInt({ min: 0 }),
                body('caseId').exists().isString(),
            ];
        default:
            return [];
    }
};
