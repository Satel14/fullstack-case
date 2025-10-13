const User = require('../models/users');

const PUBLIC_FIELDS = [
    "user_id",
    "user_login",
    "user_avatar",
    "user_rank",
    "user_role",
];

module.exports.editUserPassword = async(email, newPasswordHash) => {
    try {
        const user = await User.update(
            {user_password: newPasswordHash},
            {where: {user_email: email}}
        );
        return user;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getBalanceByUserId = async (id) => {
    try {
        const balance = await User.findByPk(id, {
            attributes: ["user_balance"],
        });
        return balance.dataValues.user_balance;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getOnlineUsers = async () => {
    try {
        const fiveMinutesAgo = new Date(
            new Date().setMinutes(new Date().getMinutes() - 5)
        );
        const users = await User.findAndCountAll({
            attributes: PUBLIC_FIELDS,
            order: [["updated_at", "DESC"]],
            where: {
                updated_at: { $gt: fiveMinutesAgo},
            },
        });

        const list = [];

        for (const key in user.rows) {
            const element = users.rows[key];
            list.push(element);
        }

        return {count: users.count, userList: list}
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.getCountOfAllUsers = async () => {
    try {
        const count = await User.count({});
        return count;
    } catch (e) {
        throw Error(e.message);
    }
}

module.exports.decrementBalance = async (value, id) => {
    try {
        await User.decrement("user_balance", {
            by: value,
            where: {
                user_id: id
            }
        }).then((result) => result);
        return true;
    } catch (e) {
        throw Error(e.message);
    }
}