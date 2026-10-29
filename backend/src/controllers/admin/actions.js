const AdminActionService = require('../../services/adminAction');
const MESSAGE = require('../../constant/responseMessages');
const { loggable } = require('../../helpers/failure');

module.exports.list = async (req, res) => {
    try {
        const data = await AdminActionService.list({
            limit: req.query.limit,
            offset: req.query.offset,
        });
        return res.status(200).json({ status: 200, data });
    } catch (e) {
        console.error('[admin] actions.list failed:', loggable(e));
        return res.status(400).json({ status: 400, message: MESSAGE.ADMIN.ERROR });
    }
};
