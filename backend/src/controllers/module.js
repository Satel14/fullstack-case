const ModuleService = require('../services/module');
const { answerFailure } = require('../helpers/failure');

module.exports.getAllModules = async (req, res) => {
    try {
        const modules = await ModuleService.getAllModules();

        return res.status(200).json({status: 200, data: modules});
    } catch (e) {
        return answerFailure(res, e, { status: 200, where: 'module.list' });
    }
}
