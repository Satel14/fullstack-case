const Storage = require('../models/storage');
const {check, validationResult} = require('express-validator');
const StorageService = require('../services/storage');
const CaseService = require('../services/case')

module.exports.getFavoriteCaseByUserId = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({status: 422, message: MESSAGE.VALIDATOR.ERROR})
        }

        const {id} = req.params;

        const allItems = await StorageService.getStorageLastItemsByUserId(id, 1000, 0);

        const massiveCases = [];

        for (const key in allItems) {
            massiveCases.push(allItems[key].storage_caseId);
        }

        const result = massiveCases.reduce((data, curr) => {
            data[curr] = data[curr] ? ++data[curr] : 1;
            return data;
        }, {})

        const maxUsed = { caseId: null, value: 0};

        for (const key in result) {
            if (maxUsed.value < result[key]) {
                maxUsed.value = result[key];
                maxUsed.caseId = [key];
            }
        }

        let caseInfo = null;
        if (maxUsed.caseId) {
            caseInfo = await CaseService.getCaseById(maxUsed.caseId);
        }

        return res.status(200).json({status: 200, data: caseInfo})


    } catch (e) {
        return res.status(200).json({status: 200, message: e.message});
    }
}

module.exports.validate = (method) => {
    switch (method) {
    case 'getFavoriteCaseByUserId': {
        return [
            check('id')
                .exists()
                .isNumeric()
        ];
    }
    default:
        break;
    }
};