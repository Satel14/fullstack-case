const Users = require('../models/users')
const jwt = require('jsonwebtoken')
const jwtOptions = require('./jwtConfig')

module.exports = (app) => {
    app.post('/api/profile/register', async (req, res) => {
        const { login, password, email, avatar } = req.body;
        if (!login && !password && !email && !avatar) return;
        const user = await Users.findOne({
            where: { login: login },
        }).then((user) => user)
        if (user) {
            res.status(401).json({ message: 'Такой користувач вже існує' })
            return
        }

        await User.create({ login, password, email, avatar })

        const profile = await Users.findOne({
            where: { login },
            attributes: ['login', 'id'],
        }).then((user) => user)

        const payload = { id: profile.id }
        const token = jwt.sign(payload, jwtOptions.secretOrKey)
        res.status(200).json({
            message: 'ok',
            jwt: token,
            user: profile,
        })
    })
}