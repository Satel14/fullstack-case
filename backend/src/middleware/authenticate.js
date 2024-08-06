const passport = require("passport")
const MESSAGE = require("./../constant/responseMessages")
const jwtOptions = require('../auth/jwtConfig');
const Users = require('../models/users');
const JwtStrategy = require('passport-jwt').Strategy;

module.exports = {
    authenticate: (req, res, next) => {
        passport.authenticate('jwt', { session: false }, (err, user) => {

            if (err) {
                res.status(err.statusCode || 401).json({ error: err.toString() });
                return;
            }

            if (!user) {
                res.status(403).json({ message: MESSAGE.AUTH.NOT_AUTHORIZED });
                return;
            }

            req.user = user;

            next();
        })(req, res, next);
    },
};

passport.use(
    new JwtStrategy(jwtOptions, (async (jwt_payload, next) => {

        const profile = await Users.findOne({
            where: { id: jwt_payload.id },
            attributes: ['user_login', 'user_id', 'user_balance', 'user_avatar', 'user_email', 'user_receiveInfo', 'user_role'],
        });

        if (profile) {
            next(null, {
                profile: profile.dataValues,
            });
        } else {
            next(null, false);
        }
    })),
);
