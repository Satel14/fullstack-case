const { ExtractJwt } = require('passport-jwt');
require('dotenv').config()

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret || 'insecure-dev-secret-set-JWT_SECRET-in-env',
    signOptions: { expiresIn: '30d' },
};
