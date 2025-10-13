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


module.exports.getModuleById = async (moduleId) => {
    try {
        const data = await Module.findByPk(moduleId);

        if (!data) {
            throw new Error(MESSAGE.MODULE.NOT_EXIST);
        }

        return data.dataValues;
    } catch (e) {
        throw Error(e.message);
    }
};
