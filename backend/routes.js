module.exports = (app) => {
    // Auth/Registration
    require('./src/auth/login')(app);
    require('./src/auth/register')(app);
    require('./src/auth/profile')(app);
    require('./src/auth/logout')(app);
    require("./src/auth/forgotPassword")(app);
    require("./src/routes/case")(app);
    require("./src/routes/module")(app);

    //Users
    require('./src/controllers/user')(app);
}
