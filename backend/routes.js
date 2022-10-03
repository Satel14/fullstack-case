module.exports= (app) =>{
    // Auth/Registration
    require('./src/auth/login')(app);
    require('./src/auth/register')(app);
    require('./src/auth/profile')(app);
    require('./src/auth/logout')(app);
    
    //Users
    require('./src/contollers/users')(app);
}