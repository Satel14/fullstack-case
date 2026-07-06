const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Users = require('../models/user');
const jwtOptions = require('./jwtConfig');
const message = require('../constant/responseMessages');
const Encrypt = require('../modules/Encrypt');
const mailSender = require('../modules/mailSender');
const { authLimiter } = require('../middleware/rateLimiters');

module.exports = (app) => {
    app.post('/api/profile/register', authLimiter, async (req, res) => {
        try {
            const {
                login, password, email, avatar,
            } = req.body;

            if (!login || !password || !email) {
                return res.status(401).json({ message: message.AUTH.EMPTY_DATA });
            }

            const user = await Users.findOne({
                where: { [Op.or]: [{ user_login: login }, { user_email: email }] },
            });

            if (user) {
                return res.status(401).json({ message: message.AUTH.USER_IS_EXIST });
            }

            const passwordHash = await Encrypt.cryptPassword(password);

            const now = new Date();

            try {
                await Users.create({
                    user_login: login,
                    user_password: passwordHash,
                    user_email: email,
                    user_avatar: avatar,
                    user_balance: 0,
                    user_rank: 0,
                    created_at: now,
                    updated_at: now,
                });
            } catch (e) {
                if (e && e.name === 'SequelizeUniqueConstraintError') {
                    return res.status(401).json({ message: message.AUTH.USER_IS_EXIST });
                }
                return res.status(500).json({ message: e.message });
            }

            mailSender.userRegistered(email, { login });

            const profile = await Users.findOne({
                where: { user_login: login },
                attributes: ['user_id', 'user_login', 'user_balance', 'user_avatar', 'user_email', 'user_receiveInfo', 'user_role'],
            });

            const payload = { id: profile.dataValues.user_id };
            const token = jwt.sign(payload, jwtOptions.secretOrKey, jwtOptions.signOptions);
            return res.status(200).json({
                jwt: token,
                user: profile.dataValues,
            });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    })
}
