function isAuthorized(profile) {
    if (profile.login) {
        return true;
    }

    return false;
}

module.exports = {
    isAuthorized,
};
