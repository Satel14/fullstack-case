const express = require('express')
const router = require("./routes")
const app = express()
const port = process.env.PORT || 5000;

const caseOpen = require("./modules/caseOpen.js")
new caseOpen();
app.listen(port, () => console.log(`Listening on port ${port}`));