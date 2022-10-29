const { ExtractJwt } = require('passport-jwt');

module.exports = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'JnPpTgWWFY0ITKkhHg4STU4oUawN1gMv',
};