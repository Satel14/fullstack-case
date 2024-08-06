const jwt = require('jsonwebtoken');
const Users = require('../models/users');
const jwtOptions = require('./jwtConfig');
const message = require('../constant/responseMessages');
const Encrypt = require('../modules/Encrypt');
const mailSender = require('../modules/mailSender');

module.exports = (app) => {
    app.post('/api/profile/register', async (req, res) => {
        const {
            login, password, email, avatar,
        } = req.body;

        if (!login && !password && !email && !avatar) {
            res.status(401).json({ message: message.AUTH.EMPTY_DATA });
            return;
        }

        const user = await Users.findOne({
            where: { $or: [{user_login: login}, {user_email: email}] },
        }).then((user) => user);

        if (user) {
            res.status(401).json({ message: message.AUTH.USER_IS_EXIST });
            return
        }

        const passwordHash = await Encrypt.cryptPassword(password);

        await Users.create({
            user_login: login, user_password: passwordHash, user_email: email, user_avatar: avatar,
        });

        mailSender.userRegistered(email, { login, password });


        const profile = await Users.findOne({
            where: { user_login: login },
            attributes: ['user_id', 'user_login', 'user_balance', 'user_avatar', 'user_email', 'user_receiveInfo', 'user_role'],
        }).then((user) => user);

        const payload = { id: profile.dataValues.user_id }
        const token = jwt.sign(payload, jwtOptions.secretOrKey)
        res.status(200).json({
            jwt: token,
            user: profile.dataValues,
        })
    })
}
