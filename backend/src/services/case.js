const MESSAGE = require('../constant/responseMessages');
const Case = require('../models/case')
const Category = require('../models/category');

module.exports.getCaseById = async (id) => {
    try {
        const getCase = await Case.findOne({
            where: {
                case_id: id
            }
        })

        if (!getCase) throw new Error(MESSAGE.CASE.NOT_EXIST);

        return getCase;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.addUsedCount = async (id) => {
    try {
        await Case.increment('case_openedCount', {where : {
            case_id: id
            }})
        return;
    } catch (e) {
        throw Error(e.message)
    }
}

module.exports.unpublishCase = async (id) => {
    try {
        Case.update({case_published: 0}, {where: {case_id: id}})
        return;
    } catch (e) {
        throw Error(e.message)
    }
}

module.exports.getAllCategories = async () => {
    try {
        const categories = await Category.findAll({
            order: [['category_priority', 'DESC']],
            where: {
                category_published: 1,
            },
        });

        if (!categories) throw new Error(MESSAGE.CASE.ERROR_CATEGORY);

        return categories;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getAllCases = async () => {
    try {
        const cases = await Case.findAll({
            order: [['case_price', 'DESC']],
            where: {
                case_published: 1,
            },
        });


        if (!cases) throw new Error(MESSAGE.CASE.ERROR);

        return cases;
    } catch (e) {
        throw Error(e.message);
    }
};