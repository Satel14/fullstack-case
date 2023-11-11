const { ExtractJwt } = require('passport-jwt');
require('dotenv').config()

module.exports = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'JnPpTgWWFY0ITKkhHg4STU4oUawN1gMv',
};
