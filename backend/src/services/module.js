const Module = require('../models/module');
const MESSAGE = require('../constant/responseMessages');

module.exports.getAllModules = async () => {
    try {
        const modules = await Module.findAll({});

        return modules;
    } catch (e) {
        throw Error(e.message);
    }
}


module.exports.findModuleById = async (moduleId) => {
    try {
        const data = await Module.findByPk(moduleId);

        return data ? data.dataValues : null;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getModuleById = async (moduleId) => {
    const data = await module.exports.findModuleById(moduleId);

    if (!data) {
        throw new Error(MESSAGE.MODULE.NOT_EXIST);
    }

    return data;
};

module.exports.setModuleValue = async (param, extraData, { transaction }) => {
    const row = await Module.findByPk(param, { transaction, lock: transaction.LOCK.UPDATE });
    const before = row ? row.extraData : null;

    if (row) {
        await row.update({ extraData }, { transaction });
    } else {
        await Module.create({ param, status: 1, extraData }, { transaction });
    }

    return before;
};
