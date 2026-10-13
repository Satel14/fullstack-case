const restoreEnv = (name, value) => {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
};

module.exports = { restoreEnv };
