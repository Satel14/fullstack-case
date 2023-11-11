const bcrypt = require("bcrypt");

module.exports = {
    cryptPassword: (password) => {
        const hashPassword = bcrypt
            .genSalt(10)
            .then((salt) => bcrypt.hash(password, salt))
            .then((hash) => {
                return hash;
            });

        return hashPassword;
    },
    comparePassword: (password, hashPassword) => {
        const resultPassword = bcrypt
            .compare(password, hashPassword)
            .then((resp) => {
                return resp;
            });
        return resultPassword;
    },
};
