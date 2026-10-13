const Users = require('../models/user');
const message = require('../constant/responseMessages');
const mailSender = require('../modules/mailSender');
const Encrypt = require('../modules/Encrypt');
const PasswordResetService = require('../services/passwordReset');
const { authLimiter } = require('../middleware/rateLimiters');
const { isAcceptablePassword } = require('./credentials');
const clientOrigin = require('../config/clientOrigin');

const mailResetLink = async (email) => {
    const user = await Users.findOne({ where: { user_email: email } });
    if (!user) {
        return;
    }
    const token = await PasswordResetService.issueToken(user.user_id);
    mailSender.passwordResetLink(user.user_email, {
        login: user.user_login,
        link: `${clientOrigin()}/reset-password?token=${token}`,
        minutes: PasswordResetService.TOKEN_TTL_MS / 60000,
    });
};

module.exports = (app) => {
    app.post('/api/profile/forgotpassword', authLimiter, async (req, res) => {
        const email = req.body && req.body.email;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(200).json({ message: message.AUTH.EMPTY_DATA });
        }
        if (!mailSender.isEnabled()) {
            return res.status(503).json({ message: message.AUTH.PASSWORD_RESET_UNAVAILABLE });
        }

        res.status(200).json({ message: message.AUTH.RESET_LINK_SENT, status: 'sended' });

        try {
            await mailResetLink(email.trim());
        } catch (e) {
            console.error('[forgot-password] reset link not sent after the answer:', e.message);
        }
        return res;
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
