const Users = require('../models/users')

module.exports = (app) => {
    app.get('/api/user/:id', function (request, response) {
        let id = request.params.id;
        Users.findByPk(id).then((users) => {
            if (users) {
                response.json(users)
            } else {
                response.status(404).send()
            }
        })
    })
}
