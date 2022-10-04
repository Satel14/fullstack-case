const express = require('express')
const router = require("./routes")
const bodyParser = require("body-parser")
require("dotenv").config()

const app = express()
const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

router(app);

app.listen(port, () => console.log(`Listening on port ${port}`));