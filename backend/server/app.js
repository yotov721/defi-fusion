const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

const tokenRoutes = require('./routes/token');
const contractRoutes = require('./routes/contract');

app.use(tokenRoutes);
app.use(contractRoutes);

module.exports = app;
