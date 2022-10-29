const message = require('../constant/responseMessages');

module.exports = (app) => {
    app.get('/api/profile/logout', (req, res) => {
        req.logout()
        res.status(200).json({ message: message.AUTH.SUCCESS_LOGOUT })
    })
}