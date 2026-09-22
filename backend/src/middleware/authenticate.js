const passport = require("passport")
const MESSAGE = require("./../constant/responseMessages")
const jwtOptions = require('../auth/jwtConfig');
const { sessionUser } = require('../auth/token');
const JwtStrategy = require('passport-jwt').Strategy;

module.exports = {
    authenticate: (req, res, next) => {
        console.log('[AUTH DEBUG] authenticate called for:', req.method, req.url);
        passport.authenticate('jwt', { session: false }, (err, user) => {
            console.log('[AUTH DEBUG] passport callback, err:', err, 'user:', !!user);

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
        console.log('[AUTH DEBUG] JWT strategy, payload:', jwt_payload);
        try {
            const profile = await sessionUser(jwt_payload.id, jwt_payload.ver);

            console.log('[AUTH DEBUG] DB result:', !!profile);
            if (profile) {
                next(null, {
                    profile,
                });
            } else {
                next(null, false);
            }
        } catch (e) {
            console.error('[AUTH DEBUG] Error in JWT strategy:', e);
            next(e, false);
        }
    })),
);

