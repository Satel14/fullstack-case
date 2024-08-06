const Users = require('../models/users');
const jwt = require('jsonwebtoken');
const message = require('./../constant/responseMessages');
const jwtOptions = require('./jwtConfig');
const Encrypt = require('../modules/Encrypt')

module.exports = (app) => {
    app.post('/api/profile/login', async (req, res) => {
        const { login, password } = req.body;
        if (!login && !password) {
            res.status(401).json({ message: message.AUTH.EMPTY_DATA })
            return
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
            ],
        }).then((user) => user)
        if (!user) {
            res.status(401).json({ message: message.AUTH.NOT_CORRECT })
            return
        }

        const comparePass = await Encrypt.comparePassword(
            password,
            user.user_password
        );

        if (!comparePass) {
            res.status(401).json({ message: message.AUTH.NOT_CORRECT})
        }

        const payload = { id: user.user_id }
        const token = jwt.sign(payload, jwtOptions.secretOrKey)
        res.status(200).json({
            message: 'ok',
            jwt: token,
            user,
        })
    })
}
