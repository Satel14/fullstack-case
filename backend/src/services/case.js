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

module.exports.addUsedCount = async (id, options = {}) => {
    try {
        await Case.increment('case_openedCount', {
            where: {
                case_id: id
            },
            ...options,
        })
        return;
    } catch (e) {
        throw Error(e.message)
    }
}

module.exports.decrementLimit = async (id, count = 1) => {
    try {
        await Case.decrement('case_openLimit', {
            by: count,
            where: {
                case_id: id
            }
        })
        return;
    } catch (e) {
        throw Error(e.message)
    }
}

module.exports.unpublishCase = async (id) => {
    try {
        await Case.update({case_published: 0}, {where: {case_id: id}})
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

module.exports.getAllCases = async (includeUnpublished = false) => {
    try {
        const cases = await Case.findAll({
            order: [['case_price', 'DESC']],
            ...(includeUnpublished ? {} : { where: { case_published: 1 } }),
        });

        if (!cases) throw new Error(MESSAGE.CASE.ERROR);

        return cases;
    } catch (e) {
        throw Error(e.message);
    }
};

const EDITABLE_CASE_FIELDS = ['case_price', 'case_discount', 'case_published', 'case_openLimit', 'case_title'];

module.exports.updateCaseFields = async (id, fields, options = {}) => {
    const payload = {};
    for (const key of EDITABLE_CASE_FIELDS) {
        if (fields[key] !== undefined) {
            payload[key] = fields[key];
        }
    }
    if (Object.keys(payload).length === 0) {
        return Case.findOne({ where: { case_id: id }, ...options });
    }
    await Case.update(payload, { where: { case_id: id }, ...options });
    return Case.findOne({ where: { case_id: id }, ...options });
};

module.exports.EDITABLE_CASE_FIELDS = EDITABLE_CASE_FIELDS;