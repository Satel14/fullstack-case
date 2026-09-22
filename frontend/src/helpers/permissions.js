import roles from '../enum/role';

export const isAdmin = (user) => {
    if (!user || user.role === undefined || user.role === null) {
        return false;
    }
    const role = Number(user.role);
    return Number.isInteger(role) && role === roles.ADMINISTRATOR;
};

export default { isAdmin };
