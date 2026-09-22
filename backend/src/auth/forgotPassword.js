const Users = require('../models/user');
const message = require('../constant/responseMessages');
const mailSender = require('../modules/mailSender');
const Encrypt = require('../modules/Encrypt');
const PasswordResetService = require('../services/passwordReset');
const { authLimiter } = require('../middleware/rateLimiters');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const isAcceptablePassword = (password) => typeof password === 'string'
    && password.length >= PASSWORD_MIN
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX;

module.exports = (app) => {
    app.post('/api/profile/forgotpassword', authLimiter, async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(200).json({ message: message.AUTH.EMPTY_DATA });
            }
            if (!mailSender.isEnabled()) {
                return res.status(503).json({ message: message.AUTH.PASSWORD_RESET_UNAVAILABLE });
            }

            const user = await Users.findOne({ where: { user_email: email } });
            if (user) {
                const token = await PasswordResetService.issueToken(user.user_id);
                mailSender.passwordResetLink(email, {
                    login: user.user_login,
                    link: `${CLIENT_ORIGIN}/reset-password?token=${token}`,
                    minutes: PasswordResetService.TOKEN_TTL_MS / 60000,
                });
            }

            return res.status(200).json({ message: message.AUTH.RESET_LINK_SENT, status: 'sended' });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    });

    app.post('/api/profile/reset-password', authLimiter, async (req, res) => {
        try {
            const { token, password } = req.body;

            if (!isAcceptablePassword(password)) {
                return res.status(422).json({ message: message.AUTH.PASSWORD_INVALID });
            }

            const passwordHash = await Encrypt.cryptPassword(password);
            const changed = await PasswordResetService.resetPassword(token, passwordHash);
            if (!changed) {
                return res.status(400).json({ message: message.AUTH.RESET_LINK_INVALID });
            }

            return res.status(200).json({ status: 200, message: message.AUTH.PASSWORD_CHANGED });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    });
};
