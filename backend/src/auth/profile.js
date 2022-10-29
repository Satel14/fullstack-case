const Users = require('../models/users')
const jwtOptions = require('./jwtConfig')
const passport = require('passport')
const JwtStategy = require('passport-jwt').Strategy;
const { authenticate } = require('../middleware/authenticate')

module.exports = (app) => {
    app.post('/api/profile/get', authenticate, async (req, res) => {
        res.status(200).json({
            user: req.user.user,
        })
    })
}

passport.use(
    new JwtStategy(jwtOptions, async (jtw_payload, next)  =>{
        await Users.findOne({
            where: { id: jwt_payload.id },
            attributes: ['user_login', 'user_id'],
        }).then((profile) => {
            if (profile) {
                next(null, {
                    profile: profile.dataValues,
                    user: profile,
                })
            } else {
                next(null, false)
            }
        })
    })
)