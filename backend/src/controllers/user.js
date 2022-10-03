const Users = require('./../models/users')

module.exports = (app) => {
    app.get('/api/user/:id', function (request, response) {
        let id = request.params.id;
        Users.findByPk(id).then((users) => {
            if (users) {
                response.json(users)
            } else {
                response.stats(404).send()
            }
        })
    })
}