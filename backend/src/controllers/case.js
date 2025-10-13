const {check, validationResult, body} = require("express-validator");
const CaseService = require('../services/case');
const UserService = require('../services/user');
const MESSAGE = require('../constant/responseMessages');
const CaseOpen = require('../modules/caseOpen');
const BalanceHistoryService = require('../services/balanceHistory');
const BalanceHistoryEnum = require("../constant/enums/balance").BalanceHistory;
const StorageService = require('../services/storage');
const allCases = require('../constant/cases/_all')

module.exports.openCaseById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        const {user_id} = req.user.profile;
        const {id, count} = req.body;
        const caseById = await CaseService.getCaseById(id);

        if (!caseById) {
            return res
                .status(422)
                .json({ status: 422, message: MESSAGE.CASE.NOT_EXIST});
        }

        if (caseById.case_openLimit !== 0) {
            if (caseById.case_openedCount >= caseById.case_openLimit) {
                return res
                    .status(422)
                    .json({ status: 422, message: MESSAGE.CASE.NOT_EXIST });
            }
        }

        const priceCase = caseById.case_discount || caseById.case_price;
        const balance = await UserService.getBalanceByUserId(user_id);

        if (balance < priceCase * count) {
            return res.status(200).json({
                status: 200,
                message: MESSAGE.CASE.NOT_HAVE_MONEY,
            })
        }

        if (caseById.case_openedCount + count === caseById.case_openLimit) {
            CaseService.unpublishCase(id);
        }

        const arrResultCase = [];
        const arrPromises = [];

        for (let index = 0; index < count; index++) {
            const resultCase = await new CaseOpen().openCase(id);
            arrPromises.push([
                await CaseService.addUsedCount(id),
                await UserService.decrementBalance(priceCase, user_id),
                await BalanceHistoryService.addBalanceChange(
                    user_id,
                    BalanceHistoryEnum.OPEN_CASE,
                    -priceCase
                )
            ])

            resultCase.winner.storageId = await StorageService.addItem(
                user_id,
                resultCase.winner.item.id,
                resultCase.winner.item.color,
                resultCase.caseId
            )

            arrResultCase.push(resultCase);
        }

        await Promise.all(arrResultCase);
        await Promise.all(arrPromises);

        const actualBalance = await UserService.getBalanceByUserId(user_id);

        return res.status(200).json({
            status: 200,
            data: arrResultCase,
            balance: actualBalance,
        });
    } catch (e) {
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
        // console.log(cases)

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

        const {id} = req.params;
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
                .exists().isString,
            body('count')
                .exists()
                .isNumeric(),
        ];
    }
    default:
        break;
    }
};