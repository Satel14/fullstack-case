const express = require('express')
const router = require("./routes")
const bodyParser = require("body-parser")
// require("dotenv").config()
const config = require('./src/config/serverConfig')


console.log(process.env.NODE_ENV, 1)
const app = express()
const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

router(app);

app.listen(config.port, () => console.log(`Listening on port ${config.port}`));