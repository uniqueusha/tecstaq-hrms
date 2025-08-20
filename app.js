
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
// your other imports and code...
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/modules/company/company.routes');
const departmentsRoutes = require('./src/modules/departments/departments.routes');
const designationRoutes = require('./src/modules/designation/designation.routes');
const work_week_pattern = require('./src/modules/work_week_pattern/workweekpatern.routes');
const holiday_calendar = require('./src/modules/holiday/holiday_calendar.routes');
const shift_type = require('./src/modules/shift_type/shift_type.routes');
const employment_type = require('./src/modules/employment_type/employment_type.routes');

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
app.use('/departments', departmentsRoutes);
app.use('/designation', designationRoutes);
app.use('/work_week_pattern', work_week_pattern);
app.use('/holiday_calendar', holiday_calendar);
app.use('/shift_type',shift_type);
app.use('/employment_type', employment_type);

module.exports = app;
