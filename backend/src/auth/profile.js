const { authenticate } = require('../middleware/authenticate')

module.exports = (app) => {
    app.get('/api/profile/get', authenticate, async (req, res) => {
        res.status(200).json({
            user: req.user.profile,
        });
    });
};
