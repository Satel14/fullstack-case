const passport = require("passport")
const MESSAGE = require("./../constant/responseMessages")
const jwtOptions = require('../auth/jwtConfig');
const { sessionUser } = require('../auth/token');
const { loggable } = require('../helpers/failure');
const JwtStrategy = require('passport-jwt').Strategy;

module.exports = {
    authenticate: (req, res, next) => {
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (err) {
                console.error('[auth] session check failed:', loggable(err));
                res.status(503).json({ message: MESSAGE.AUTH.SESSION_CHECK_FAILED });
                return;
            }

            if (!user) {
                res.status(401).json({ message: MESSAGE.AUTH.NOT_AUTHORIZED });
                return;
            }

            req.user = user;

            next();
        })(req, res, next);
    },
};

passport.use(
    new JwtStrategy(jwtOptions, (async (jwt_payload, next) => {
        try {
            const profile = await sessionUser(jwt_payload.id, jwt_payload.ver);
            if (profile) {
                next(null, {
                    profile,
                });
            } else {
                next(null, false);
            }
        } catch (e) {
            next(e, false);
        }
    })),
);

