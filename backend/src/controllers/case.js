const { check, validationResult, body } = require("express-validator");
const CaseService = require('../services/case');
const UserService = require('../services/user');
const MESSAGE = require('../constant/responseMessages');
const CaseOpen = require('../modules/caseOpen');
const BalanceHistoryService = require('../services/balanceHistory');
const BalanceHistoryEnum = require("../constant/enums/balance").BalanceHistory;
const StorageService = require('../services/storage');
const allCases = require('../constant/cases/_all')
const { getIo } = require('../socket/chat');
const sequelize = require('../config/db');
const PFService = require('../services/provablyFair');
const { buildDrawTable, deriveFromTable } = require('../modules/provablyFair');
const RedisManager = require('../redis/manager');
const ITEM_HASH = 'item_hash';

const refusal = (code, message) => {
    const err = new Error(message);
    err.code = code;
    return err;
};

module.exports.openCaseById = async (req, res) => {
    try {
        console.log('[DEBUG] openCaseById called');
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const { user_id } = req.user.profile;
        const { id } = req.body;
        const count = parseInt(req.body.count, 10);
        console.log('[DEBUG] user_id:', user_id, 'case_id:', id, 'count:', count);
        const caseById = await CaseService.getCaseById(id);

        if (!caseById) {
            console.log('[DEBUG] Case not found');
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.CASE.NOT_EXIST });
        }
        console.log('[DEBUG] Case found:', caseById.case_id);

        if (Number(caseById.case_published) !== 1) {
            console.log('[DEBUG] Case is not published');
            return res.status(422).json({
                status: 422,
                message: MESSAGE.CASE.NOT_PUBLISHED,
            });
        }

        if (caseById.case_openLimit !== -1) {
            const openedCount = Number(caseById.case_openedCount || 0);
            const maxLimit = Number(caseById.case_openLimit || 0);
            const remaining = maxLimit - openedCount;

            if (remaining <= 0) {
                return res.status(422).json({
                    status: 422,
                    message: MESSAGE.CASE.LIMIT_EXCEEDED,
                });
            }

            if (remaining < count) {
                return res.status(422).json({
                    status: 422,
                    message: MESSAGE.CASE.LIMIT_EXCEEDED,
                });
            }
        }

        const priceCase = caseById.case_discount || caseById.case_price;
        const balance = await UserService.getBalanceByUserId(user_id);
        console.log('[DEBUG] price:', priceCase, 'balance:', balance);

        if (balance < priceCase * count) {
            return res.status(200).json({
                status: 200,
                message: MESSAGE.CASE.NOT_HAVE_MONEY,
            })
        }

        const arrResultCase = [];

        const caseDef = allCases[id];
        const itemHash = await RedisManager.getAllDataHashWithKey(ITEM_HASH);
        const drawTable = buildDrawTable(caseDef, itemHash);
        const drawTableJson = JSON.stringify(drawTable);

        const preparedSeed = await PFService.ensureActiveSeed(user_id);

        await sequelize.transaction(async (t) => {
            const lockedBalance = await UserService.getBalanceByUserId(user_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const seed = await PFService.lockActiveSeed(user_id, t, preparedSeed.pf_id);
            let nonce = seed.pf_nonce;

            const lockedCase = await CaseService.getCaseById(id, { transaction: t, lock: t.LOCK.UPDATE });
            const lockedLimit = Number(lockedCase.case_openLimit);
            const lockedOpened = Number(lockedCase.case_openedCount || 0);
            console.log('[DEBUG] Locked case:', id, 'published:', lockedCase.case_published, 'opened:', lockedOpened, 'limit:', lockedLimit);

            if (Number(lockedCase.case_published) !== 1) {
                console.log('[DEBUG] Case was unpublished before the open got its lock');
                throw refusal('NOT_PUBLISHED', MESSAGE.CASE.NOT_PUBLISHED);
            }
            if (lockedLimit !== -1 && lockedOpened + count > lockedLimit) {
                console.log('[DEBUG] Open limit reached before the open got its lock');
                throw refusal('LIMIT_EXCEEDED', MESSAGE.CASE.LIMIT_EXCEEDED);
            }

            const lockedPrice = lockedCase.case_discount || lockedCase.case_price;
            console.log('[DEBUG] Locked price:', lockedPrice, 'locked balance:', lockedBalance);
            if (lockedBalance < lockedPrice * count) {
                throw refusal('NOT_HAVE_MONEY', MESSAGE.CASE.NOT_HAVE_MONEY);
            }

            for (let index = 0; index < count; index++) {
                console.log('[DEBUG] Opening case iteration', index);
                const winner = deriveFromTable(seed.pf_serverSeed, seed.pf_clientSeed, nonce, drawTable);
                const resultCase = await new CaseOpen().openCase(id, winner);
                console.log('[DEBUG] Case opened, winner:', resultCase?.winner?.item?.name);

                await UserService.decrementBalance(lockedPrice, user_id, { transaction: t });
                await BalanceHistoryService.addBalanceChange(
                    user_id,
                    BalanceHistoryEnum.OPEN_CASE,
                    -lockedPrice,
                    '',
                    { transaction: t },
                );

                const storageId = await StorageService.addItem(
                    user_id,
                    resultCase.winner.item.id,
                    resultCase.winner.item.color,
                    resultCase.caseId,
                    { transaction: t },
                );

                await PFService.recordOpen(
                    {
                        userId: user_id,
                        caseId: id,
                        seedId: seed.pf_id,
                        storageId,
                        serverSeedHash: seed.pf_serverSeedHash,
                        clientSeed: seed.pf_clientSeed,
                        nonce,
                        resultItemId: resultCase.winner.item.id,
                        resultColor: resultCase.winner.item.color,
                        drawTable: drawTableJson,
                    },
                    { transaction: t },
                );

                nonce += 1;
                resultCase.winner.storageId = storageId;
                arrResultCase.push(resultCase);
            }

            await PFService.bumpNonce(seed.pf_id, nonce, { transaction: t });
            await CaseService.addUsedCount(id, count, { transaction: t });

            if (lockedLimit !== -1 && lockedOpened + count >= lockedLimit) {
                console.log('[DEBUG] Open limit reached, unpublishing case', id);
                await CaseService.unpublishCase(id, { transaction: t });
            }
        });

        const io = getIo();
        if (io) {
            arrResultCase.forEach((resultCase) => {
                io.emit('new-drop', {
                    storage_id: resultCase.winner.storageId,
                    storage_itemId: resultCase.winner.item.id,
                    storage_userId: user_id,
                    storage_caseId: resultCase.caseId,
                    storage_color: resultCase.winner.item.color,
                });
            });
        }

        console.log('[DEBUG] All done, getting updated balance');

        const actualBalance = await UserService.getBalanceByUserId(user_id);
        console.log('[DEBUG] Returning response, balance:', actualBalance);

        return res.status(200).json({
            status: 200,
            data: arrResultCase,
            balance: actualBalance,
        });
    } catch (e) {
        console.error('[DEBUG] openCaseById error:', e);
        if (e && e.code === 'NOT_HAVE_MONEY') {
            return res.status(200).json({
                status: 200, message: MESSAGE.CASE.NOT_HAVE_MONEY,
            })
        }
        if (e && (e.code === 'NOT_PUBLISHED' || e.code === 'LIMIT_EXCEEDED')) {
            return res.status(422).json({ status: 422, message: e.message });
        }
        return res.status(400).json({
            status: 400, message: e.message
        })
    }
}

module.exports.getAllCase = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const cases = await CaseService.getAllCases();

        const categoryArray = [];
        // eslint-disable-next-line guard-for-in
        for (const key in cases) {
            const categoryId = cases[key].case_categoryId;

            if (!categoryArray.includes(categoryId)) {
                categoryArray.push(categoryId);
            }
        }

        const categories = await CaseService.getAllCategories();

        const filtredCategories = categories.filter((item) =>
            categoryArray.includes(item.category_id)
        );

        return res
            .status(200)
            .json({ status: 200, data: cases, categories: filtredCategories });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};


module.exports.getCaseById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR })
        }

        const { id } = req.params;
        const caseById = await CaseService.getCaseById(id);
        const caseCollection = allCases[id];

        return res.status(200).json({
            status: 200,
            data: caseById.dataValues,
            caseCollection
        });

    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message })
    }
}

module.exports.validate = (method) => {
    switch (method) {
        case 'getCaseById': {
            return [check('id')
                .exists()
                .isString()];
        }
        case 'openCaseById': {
            return [
                body('id')
                    .exists().isString(),
                body('count')
                    .exists()
                    .isInt({ min: 1, max: 100 }),
            ];
        }
        default:
            break;
    }
};
