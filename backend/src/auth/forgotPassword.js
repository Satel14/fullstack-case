const Users = require('../models/user');
const message = require('../constant/responseMessages')
const mailSender = require('../modules/mailSender')
const Encrypt = require('../modules/Encrypt')
const {editUserPassword} = require('../services/user')
const { authLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.post("/api/profile/forgotpassword", authLimiter, async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(200).json({ message: message.AUTH.EMPTY_DATA });
            }
            const user = await Users.findOne({
                where: {user_email: email},
            });
            if (user) {
                const generatedPassword = Math.random().toString(36).slice(-8);
                const passwordHash = await Encrypt.cryptPassword(generatedPassword);

                await editUserPassword(email, passwordHash);

                mailSender.forgotPassword(email, {
                    login: user.user_login,
                    password: generatedPassword
                });
            }

            return res.status(200).json({ message: message.AUTH.SUCCESS_PASSWORD_SEND, status: "sended" });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    })
}