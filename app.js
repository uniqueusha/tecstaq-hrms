
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
app.use(express.json({ limit: '100mb' }));  
const path = require('path')
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/src/uploads/", express.static(path.join(__dirname, "src/uploads")));
// your other imports and code...
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/modules/company/company.routes');
const departmentsRoutes = require('./src/modules/departments/departments.routes');
const designationRoutes = require('./src/modules/designation/designation.routes');
const work_week_pattern = require('./src/modules/work_week_pattern/workweekpatern.routes');
const holiday_calendar = require('./src/modules/holiday/holiday_calendar.routes');
const shift_type = require('./src/modules/shift_type/shift_type.routes');
const employment_type = require('./src/modules/employment_type/employment_type.routes');
const leave_type_master = require('./src/modules/leave_type_master/leave_type_master.routes');
const policyRoutes = require('./src/modules/policy/policy.routes');

const employeeRoutes = require('./src/routes/employee.routes'); 
const leaveRequestRoutes = require('./src/routes/leave-request.route');
const userRoutes = require('./src/routes/user.route');
const salaryStructureComponentsRoutes = require('./src/routes/master/salary-structure-components.route');
const salaryStructureStatutoryRulesRoute = require('./src/routes/master/salary-structure-statutory-rules.route');
const professionalTaxRuleRoute = require('./src/routes/master/professional_tax_rules.route');
const professionalTaxSlabRoute = require('./src/routes/master/professional-tax-slabs.route')
const attendanceRoutes = require('./src/routes/attendance.routes');
const settingsRoutes = require('./src/routes/settings.routes')

// master 
const gradeRoutes = require('./src/routes/master/grade.routes');
const salaryStructureRoutes = require('./src/routes/master/salary-structure.routes');
const componentTypeRoutes = require('./src/routes/master/component-type.routes');
const calculationTypeRoutes = require('./src/routes/master/calculation-type.routes');
const salaryComponentRoutes = require('./src/routes/master/salary-component.routes');
const esiRuleRoutes = require('./src/routes/master/esi-rules.routes');
const providentFundRuleRoutes = require('./src/routes/master/provident-fund-rules.route')
//Employee salary mapping
const employeeSalaryMappingRoutes = require('./src/routes/employee-salary-mapping.routes')
const payRollRoutes = require('./src/routes/pay-roll.routes')
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
app.use('/policy', policyRoutes);
app.use('/leave_type_master', leave_type_master);


app.use('/employee', employeeRoutes);
app.use('/leave-request', leaveRequestRoutes);
app.use('/user', userRoutes);
app.use('/salary-structure-components', salaryStructureComponentsRoutes);
app.use('/salary-structure-statutory-rules', salaryStructureStatutoryRulesRoute);
app.use('/professional-tax-rule', professionalTaxRuleRoute);
app.use('/professional-tax-slabs', professionalTaxSlabRoute);
app.use('/attendance', attendanceRoutes);
app.use('/settings', settingsRoutes);
// master
app.use('/grade', gradeRoutes)
app.use('/salary-structure', salaryStructureRoutes)
app.use('/component-type', componentTypeRoutes)
app.use('/calculation-type', calculationTypeRoutes)
app.use('/salary-component', salaryComponentRoutes)
app.use('/esi-rule', esiRuleRoutes)
app.use('/provident-fund-rule', providentFundRuleRoutes);
//employee salary mapping
app.use('/employee-salary-mapping', employeeSalaryMappingRoutes)
app.use('/pay-roll', payRollRoutes)

app.get('/', (req,res)=>{
    res.status(200).json({
        message:"Wel come to HRMS"
    })
})
module.exports = app;
