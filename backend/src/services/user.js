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

module.exports.getUserFullInfoById = async (id, options = {}) => {
    try {
        const user = await User.findByPk(id, options);

        if (!user) throw new Error(MESSAGE.USER.NOT_EXIST);

        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.getOnlineUsers = async (userIds) => {
    if (!userIds.length) {
        return [];
    }
    return User.findAll({
        attributes: PUBLIC_FIELDS,
        where: { user_id: userIds },
        order: [["user_login", "ASC"]],
    });
};

module.exports.editUser = async (fields, id) => {
    try {
    // eslint-disable-next-line no-restricted-syntax
        for (const fieldName in fields) {
            if (!EDITABLE_FOR_USER_FIELDS.includes(fieldName)) {
                throw new Error(MESSAGE.USER.CANT_UPDATE_FIELD);
            }
        }
        const user = await User.update({ ...fields }, { where: { user_id: id } });
        return user;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.lockUsersInIdOrder = (ids, transaction) => User.findAll({
    attributes: ['user_id'],
    where: { user_id: ids },
    order: [['user_id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
});

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
        const defaultBalance = 0;
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

const ADMIN_LIST_ATTRIBUTES = ["user_id", "user_login", "user_email", "user_balance", "user_rank", "user_role", "user_avatar", "created_at"];

module.exports.getUsersPaged = async ({ search, limit, offset } = {}) => {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const where = search
        ? { [Op.or]: [{ user_login: { [Op.like]: `%${search}%` } }, { user_email: { [Op.like]: `%${search}%` } }] }
        : undefined;

    const result = await User.findAndCountAll({
        where,
        attributes: ADMIN_LIST_ATTRIBUTES,
        order: [["user_id", "DESC"]],
        limit: safeLimit,
        offset: safeOffset,
    });

    return { rows: result.rows.map((r) => r.dataValues), count: result.count };
};

module.exports.setRole = async (id, role, options = {}) => {
    await User.update({ user_role: role }, { where: { user_id: id }, ...options });
};
