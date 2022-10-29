const express = require('express')
const router = require('./routes')
const bodyParser = require('body-parser')
const config = require('./src/config/serverConfig')


const app = express()

// require('dotenv').config()

const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

router(app);

app.listen(config.port, () => console.log(`Listening on port ${config.port}`));