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
    new JwtStategy(jwtOptions, (async (jwt_payload, next)  =>{

        const profile = await Users.findOne({
            where: { id: jwt_payload.id },
            attributes: ['user_login', 'user_id', 'user_balance', 'user_avatar', 'user_email', 'user_receiveInfo', 'user_role'],
        })
        if(profile) {
            next(null, {
                profile: profile,
            })
        } else {
            next(null, false);
        }
    })),
);
