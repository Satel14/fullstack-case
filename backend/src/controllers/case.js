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

module.exports.openCaseById = async (req, res) => {
    try {
        console.log('[DEBUG] openCaseById called');
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const { user_id } = req.user.profile;
        const { id, count } = req.body;
        console.log('[DEBUG] user_id:', user_id, 'case_id:', id, 'count:', count);
        const caseById = await CaseService.getCaseById(id);

        if (!caseById) {
            console.log('[DEBUG] Case not found');
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.CASE.NOT_EXIST });
        }
        console.log('[DEBUG] Case found:', caseById.case_id);

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

        await sequelize.transaction(async (t) => {
            const lockedBalance = await UserService.getBalanceByUserId(user_id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (lockedBalance < priceCase * count) {
                const err = new Error(MESSAGE.CASE.NOT_HAVE_MONEY);
                err.code = 'NOT_HAVE_MONEY';
                throw err;
            }

            for (let index = 0; index < count; index++) {
                console.log('[DEBUG] Opening case iteration', index);
                const resultCase = await new CaseOpen().openCase(id);
                console.log('[DEBUG] Case opened, winner:', resultCase?.winner?.item?.name);

                await CaseService.addUsedCount(id, { transaction: t });
                await UserService.decrementBalance(priceCase, user_id, { transaction: t });
                await BalanceHistoryService.addBalanceChange(
                    user_id,
                    BalanceHistoryEnum.OPEN_CASE,
                    -priceCase,
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

                resultCase.winner.storageId = storageId;
                arrResultCase.push(resultCase);
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

        console.log('[DEBUG] All done, getting updated case and balance');

        const updatedCase = await CaseService.getCaseById(id);
        if (updatedCase.case_openLimit !== -1 && updatedCase.case_openedCount >= updatedCase.case_openLimit) {
            await CaseService.unpublishCase(id);
        }

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
                    .isNumeric(),
            ];
        }
        default:
            break;
    }
};
