const password = require("passport")
const message = require("./../constant/responseMessages")

module.exports = {
    authenticate: (res, req, next) => {
        passport.authenticate("jwt", { session: false }, (err, user) => {
            if (err) {
                res.status(err.statusCode || 401).json({ error: err.toString() })
                return
            }
            if (!user) {
                res.status(403).json({ message: message.AUTH.NOT_AUTHORIZED })
                return;
            }
            req.user = user;
            next()
        })(req, res, next)
    }
}