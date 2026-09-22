const Users = require('../models/user');
const message = require('./../constant/responseMessages');
const { signToken, withoutVersion } = require('./token');
const Encrypt = require('../modules/Encrypt')
const { authLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.post('/api/profile/login', authLimiter, async (req, res) => {
        try {
            const { login, password } = req.body;
            if (!login || !password) {
                return res.status(401).json({ message: message.AUTH.EMPTY_DATA });
            }
            const user = await Users.findOne({
                where: { user_login: login },
                attributes: [
                    "user_id",
                    "user_login",
                    "user_balance",
                    "user_avatar",
                    "user_email",
                    "user_receiveInfo",
                    "user_role",
                    "user_password",
                    "user_tokenVersion",
                ],
            });
            if (!user) {
                return res.status(401).json({ message: message.AUTH.NOT_CORRECT });
            }

            const comparePass = await Encrypt.comparePassword(
                password,
                user.user_password
            );

            if (!comparePass) {
                return res.status(401).json({ message: message.AUTH.NOT_CORRECT });
            }

            const token = signToken(user);
            const { user_password, ...safeUser } = user.dataValues;
            return res.status(200).json({
                jwt: token,
                user: withoutVersion(safeUser),
            });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    })
}
