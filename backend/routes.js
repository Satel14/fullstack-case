module.exports = (app) => {
    require("./src/auth/login")(app);
    require("./src/auth/register")(app);
    require("./src/auth/profile")(app);
    require("./src/auth/logout")(app);
    require("./src/auth/forgotPassword")(app);
    require("./src/routes/article")(app);
    require("./src/routes/user")(app);
    require("./src/routes/promocode")(app);
    require("./src/routes/case")(app);
    require("./src/routes/storage")(app);
    require("./src/routes/item")(app);
    require("./src/routes/stats")(app);
    require("./src/routes/module")(app);
    require("./src/routes/bonusHistory")(app);
  };
  