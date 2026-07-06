const { ExtractJwt } = require('passport-jwt');
require('dotenv').config()

module.exports = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'insecure-dev-secret-set-JWT_SECRET-in-env',
};
