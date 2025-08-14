
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
// your other imports and code...
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/modules/company/company.routes');

// Middleware
app.use(bodyParser.json());
app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,PUT,DELETE,OPTIONS" 
    );
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/company', companyRoutes);


module.exports = app;
