const AdminActionService = require('../../services/adminAction');

module.exports.list = async (req, res) => {
    try {
        const data = await AdminActionService.list({
            limit: req.query.limit,
            offset: req.query.offset,
        });
        return res.status(200).json({ status: 200, data });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};
