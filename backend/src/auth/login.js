const Users = require('../models/users');
const jwt = require('jsonwebtoken');
const message = require('./../constant/responseMessages');
const jwtOptions = require('./jwtConfig');

module.exports = (app) => {
    app.post('/api/profile/login', async (res, req) => {
        const { login, password } = req.body;
        if (!login && !password) {
            res.status(401).json({ message: message.AUTH.EMPTY_DATA })
            return
        }
        const user = await Users.findOne({
            where: { user_login: login, user_pass: password },
            attributes: ['user_id', 'user_login'],
        }).then((user) => user)
        if (!user) {
            res.status(401).json({ message: message.AUTH.NOT_CORRECT })
            return
        }
        let payload = { id: user.user_id }
        let token = jwt.sign(payload, jwtOptions.secretOrKey)
        res.status(200).json({
            message: 'ok',
            jwt: token,
            user: user,
        })
    })
}
