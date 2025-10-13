const ModuleService = require('../services/module');

module.exports.getAllModules = async (req, res) => {
    try {
        const modules = await ModuleService.getAllModules();

        return res.status(200).json({status: 200, data: modules});
    } catch (e) {
        return res.status(200).json({status: 200, message: e.message})
    }
}
