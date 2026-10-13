const Users = require('../models/user');
const message = require('../constant/responseMessages');
const { signToken, withoutVersion, SESSION_FIELDS } = require('./token');
const mailSender = require('../modules/mailSender');
const EmailVerificationService = require('../services/emailVerification');
const { authLimiter } = require('../middleware/rateLimiters');

const REFUSALS = {
    invalid: message.AUTH.CONFIRM_LINK_INVALID,
    'login-taken': message.AUTH.CONFIRM_LOGIN_TAKEN,
    'email-taken': message.AUTH.CONFIRM_EMAIL_TAKEN,
};

module.exports = (app) => {
    app.post('/api/profile/confirm-email', authLimiter, async (req, res) => {
        try {
            const result = await EmailVerificationService.confirm(req.body && req.body.token);
            if (result.outcome !== 'created') {
                return res.status(422).json({ message: REFUSALS[result.outcome] });
            }

            const profile = await Users.findByPk(result.userId, { attributes: SESSION_FIELDS });
            mailSender.userRegistered(profile.user_email, { login: profile.user_login });

            return res.status(200).json({
                jwt: signToken(profile),
                user: withoutVersion(profile.dataValues),
            });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    });
};
