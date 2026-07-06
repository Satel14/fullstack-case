const { Op } = require("sequelize");
const User = require("../models/user");
const MESSAGE = require("../constant/responseMessages");

const PUBLIC_FIELDS = [
    "user_id",
    "user_login",
    "user_avatar",
    "user_rank",
    "user_role",
];
const PRIVATE_FIELDS = ["user_balance", "user_email", "user_password"];
const EDITABLE_FOR_USER_FIELDS = [
    "user_password",
    "user_avatar",
    "user_receiveInfo",
];

module.exports.getUserById = async (id) => {
    try {
        const user = await User.findByPk(id, {
            attributes: [...PUBLIC_FIELDS, "updated_at", "created_at"],
        });

        if (!user) throw new Error(MESSAGE.USER.NOT_EXIST);

        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getUserFullInfoById = async (id) => {
    try {
        const user = await User.findByPk(id);

        if (!user) throw new Error(MESSAGE.USER.NOT_EXIST);

        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getOnlineUsers = async () => {
    try {
        const fiveMinutesAgo = new Date(
            new Date().setMinutes(new Date().getMinutes() - 5)
        );
        const users = await User.findAndCountAll({
            attributes: PUBLIC_FIELDS,
            order: [["updated_at", "DESC"]],
            where: {
                updated_at: { [Op.gt]: fiveMinutesAgo },
            },
        });

        const list = [];

        for (const key in users.rows) {
            const element = users.rows[key];
            list.push(element);
        }

        return { count: users.count, userList: list };
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.editUserPassword = async (email, newPasswordHash) => {
    try {
        const user = await User.update(
            { user_password: newPasswordHash },
            { where: { user_email: email } }
        );
        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.editUser = async (fields, id) => {
    try {
    // eslint-disable-next-line no-restricted-syntax
        for (const fieldName in fields) {
            if (!EDITABLE_FOR_USER_FIELDS.includes(fieldName)) {
                throw new Error(MESSAGE.USER.CANT_UPDATE_FIELD);
            }
        }
        const user = await User.update(fields, { where: { user_id: id } });
        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getBalanceByUserId = async (id, options = {}) => {
    try {
        const balance = await User.findByPk(id, {
            attributes: ["user_balance"],
            ...options,
        });
        return balance.dataValues.user_balance;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.incrementBalance = async (value, id, options = {}) => {
    try {
        await User.increment("user_balance", {
            by: value,
            where: { user_id: id },
            ...options,
        }).then((result) => result);
        return true;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.resetBalance = async (id) => {
    try {
        const defaultBalance = 1000;
        await User.update(
            { user_balance: defaultBalance },
            { where: { user_id: id } }
        );
        return true;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.resetRank = async (id) => {
    try {
        const defaultRank = 0;
        await User.update(
            { user_rank: defaultRank },
            { where: { user_id: id } }
        );
        return true;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.incrementRank = async (value, id, options = {}) => {
    try {
        await User.increment("user_rank", {
            by: value,
            where: { user_id: id },
            ...options,
        }).then((result) => result);
        return true;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.decrementBalance = async (value, id, options = {}) => {
    try {
        await User.decrement("user_balance", {
            by: value,
            where: { user_id: id },
            ...options,
        }).then((result) => result);
        return true;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getCountOfAllUsers = async () => {
    try {
        const count = await User.count({});
        return count;
    } catch (e) {
        throw Error(e.message);
    }
};
