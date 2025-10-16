const Storage = require('../models/storage');
const {check, validationResult} = require('express-validator');
const StorageService = require('../services/storage');
const CaseService = require('../services/case');
const UserService = require('../services/user');
const _ = require('lodash');
const MESSAGE = require('../constant/responseMessages');

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

module.exports.getStorageTop = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { limit, offset } = req.params;

        const storages = await StorageService.getStorageAllItems();

        let all = [];

        for(const key in storages){
            const userId = storages[key].storage_userId;
            const userObj = all.find((item)=> item.userId === userId);
            if(!userObj){
                const info = await UserService.getUserById(userId);
                if (info) {
                    all.push({ userId: userId, count: 1, info });
                }
            } else {
                userObj.count = userObj.count + 1;
            }        
        }     

        all = _.orderBy(all, ['count'],['desc']);

        const allWithLimitAndOffest = [];

        const offsetNum = parseInt(offset, 10);
        const limitNum = parseInt(limit, 10);
        
        for (let index = 0; index < all.length; index++) {
            const element = all[index];
            if(index >= offsetNum && allWithLimitAndOffest.length < limitNum && index < 50){        
                allWithLimitAndOffest.push(element);
            }               
        }
   

        return res.status(200).json({ status: 200, data: allWithLimitAndOffest });
    } catch (e) {
        return res.status(200).json({ status: 200, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
    case 'getFavoriteCaseByUserId': {
        return [
            check('id')
                .exists()
                .isNumeric()
        ];
    }
    case 'getStorageTop': {
        return [
            check('limit')
                .exists()
                .isNumeric(),
            check('offset')
                .exists()
                .isNumeric()
        ];
    }
    default:
        break;
    }
};