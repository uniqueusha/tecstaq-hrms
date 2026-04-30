const pool = require("../../db");
const { body, param, validationResult } = require("express-validator");
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message,
    });
};
const error500 = (error, res) => {
    console.log(error);
    
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error,
    });
};
const prInitialize = async (req, res) => {
    //run validation
    await Promise.all([
        body("pay_cycle").notEmpty().withMessage("Pay cycle is required").run(req),
        body("pay_roll_month")
            .notEmpty()
            .withMessage("Pay roll month is required.")
            .isInt()
            .withMessage("Invalid pay roll month.")
            .run(req),
        body("pay_roll_year")
            .notEmpty()
            .withMessage("Pay roll year is required.")
            .isInt()
            .withMessage("Invalid pay roll year.")
            .run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res);
    }
    const pay_cycle = req.body.pay_cycle ? req.body.pay_cycle.trim() : "";
    const pay_roll_month = req.body.pay_roll_month ? req.body.pay_roll_month : null;
    const pay_roll_year = req.body.pay_roll_year ? req.body.pay_roll_year : null;
    const remarks = req.body.remarks ? req.body.remarks : null;
    const employee_id = req.user.employee_id;
    // Month in JS is 0-based
    const startDate = new Date(pay_roll_year, pay_roll_month - 1, 2);
    const endDate = new Date(pay_roll_year, pay_roll_month, 1); // last day of month

    // Format for MySQL (YYYY-MM-DD)
    const formatDate = (date) => date.toISOString().split("T")[0];

    const fromDate = formatDate(startDate);
    const toDate = formatDate(endDate);

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        //get employee salary mapping
        const getSalaryMappingQuery = `SELECT esm.* FROM employee_salary_mapping esm `;
        const getSalaryMappingResult = await connection.query(
            getSalaryMappingQuery,
        );
        if (getSalaryMappingResult[0].length == 0) {
            return error422(" Salary Mapping Not Found", res);
        }
        const now = new Date();
        //insert into pr batch
        let prBatchQuery = `INSERT INTO pr_batches(total_employees, pr_month, pr_year, pr_status, initialized_by, initialized_at, remarks, created_by)VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        let [prBatchResult] = await connection.query(prBatchQuery, [getSalaryMappingResult[0].length, pay_roll_month, pay_roll_year, 'Draft', employee_id, now, remarks, employee_id]);
        let pr_batch_id = prBatchResult.insertId

        let payrollEmployeeData = [];
        for (let index = 0; index < getSalaryMappingResult[0].length; index++) {
            const element = getSalaryMappingResult[0][index];
            const getEmployeeQuery = `SELECT e.*, wwp.working_days FROM employee e 
            LEFT JOIN employee_work_week eww
            ON eww.employee_id = e.employee_id
            LEFT JOIN work_week_pattern wwp
            ON eww.work_week_pattern_id = wwp.work_week_pattern_id
             WHERE e.employee_id = ?`;
            const getEmployeeResult = await connection.query(getEmployeeQuery, [
                element.employee_id,
            ]);
            if (getEmployeeResult[0].length == 0) {
                return error422(element.employee_code + " Employee Not Found", res);
            }

            if (!getEmployeeResult[0][0].working_days) {
                return error422("Employee working day Not Found", res);
            }
            const working_days = getEmployeeResult[0][0].working_days;
            //get attendace
            let getAttendanceQuery = `SELECT * FROM attendance_master WHERE (attendance_date BETWEEN ? AND ?) AND employee_code = ?`;
            let getAttendanceResult = await connection.query(getAttendanceQuery, [
                fromDate,
                toDate,
                getEmployeeResult[0][0].employee_code,
            ]);
            // if (getAttendanceResult[0].length == 0) {
            //     return error422("Attendance Not Found", res)
            // }

            //salary mapping footer
            let getSalaryMappingFooterQuery = `SELECT esmf.*, ssc.salary_component_id, ssc.percentage_of, ssc.value, ssc.min_limit, ssc.max_limit, ssc.calculation_order,
            sc.salary_component_name, sc.component_type_id, sc.calculation_type_id, sc.is_statutory,
            ct.component_type, cat.calculation_type FROM employee_salary_mapping_footer esmf
            LEFT JOIN salary_structure_components ssc
            ON ssc.salary_structure_component_id = esmf.salary_structure_component_id
            LEFT JOIN salary_component sc
            ON ssc.salary_component_id = sc.salary_component_id
            LEFT JOIN component_type ct
            ON ct.component_type_id = sc.component_type_id
            LEFT JOIN calculation_type cat
            ON cat.calculation_type_id = sc.calculation_type_id
            WHERE esmf.employee_salary_id = ? ORDER BY ssc.calculation_order ASC`;
            let getSalaryMappingFooterResult = await connection.query(
                getSalaryMappingFooterQuery,
                [element.employee_salary_id],
            );
            const ctcMonthly = element.ctc_amount / 12;
            let basicSalary = 0;
            let totalEarnings = 0;
            let totalDeductions = 0;

            //calculation breakdown
            const components = getSalaryMappingFooterResult[0];
            const calculatedBreakdown = components.map((comp) => {
                let amount = 0;
                const value = parseFloat(comp.value);
                const maxLimit = parseFloat(comp.max_limit);

                // 1. Calculate Amount based on Calculation Type
                if (comp.calculation_type === "PERCENTAGE") {
                    if (comp.percentage_of === "CTC") {
                        amount = (ctcMonthly * value) / 100;
                    } else if (comp.percentage_of === "BASIC") {
                        amount = (basicSalary * value) / 100;
                    }
                } else if (comp.calculation_type === "FIXED") {
                    amount = value;
                }

                // 2. Apply Max Limit (e.g., for PF cap at 1800)
                if (maxLimit > 0 && amount > maxLimit) {
                    amount = maxLimit;
                }

                // 3. Store Basic Salary for subsequent percentage calculations (HRA/PF)
                if (comp.salary_component_name === "Basic Salary") {
                    basicSalary = amount;
                }

                // 4. Update Totals
                if (comp.component_type === "EARNING") {
                    totalEarnings += amount;
                } else if (comp.component_type === "DEDUCTION") {
                    totalDeductions += amount;
                }

                return {
                    name: comp.salary_component_name,
                    type: comp.component_type,
                    calculation_type: comp.calculation_type,
                    amount: amount.toFixed(2),
                    salary_component_id: comp.salary_component_id,
                    component_type_id: comp.component_type_id,
                    calculation_type_id: comp.calculation_type_id
                };
            });

            const netSalary = totalEarnings - totalDeductions;
            //testing
            // 1. Get total days in the month (based on fromDate/toDate)
            const start = new Date(fromDate);
            const end = new Date(toDate);
            const getWorkingDays = (startDate, endDate, workingDaysStr) => {
                const workingDaysMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
                const allowedDays = workingDaysStr.split(",").map((d) => workingDaysMap[d.trim()]);
                let count = 0;
                let current = new Date(startDate);

                while (current <= endDate) {
                    if (allowedDays.includes(current.getDay())) {
                        count++;
                    }
                    current.setDate(current.getDate() + 1);
                }
                return count;
            };
            const totalMonthDays = getWorkingDays(start, end, working_days);

            // 2. Count Present Days from attendance details
            // Assuming 'P' is Present. You can also handle 'HD' (Half Day) as 0.5
            const presentDays = getAttendanceResult[0].filter(
                (att) => att.status === "P" || att.status === "PL"
            ).length;
            // 3. Per Day Calculations (Based on Fixed CTC)
            const perDayGross = totalEarnings / totalMonthDays;
            // actual earning
            let actualNet = 0;
            actualNet = perDayGross * presentDays;
            //insert into pr employee salary components
            let prEmployeeSalaryComponentQuery = `INSERT INTO pr_employee_salary_components(pr_batch_id, employee_salary_id, employee_id, monthly_ctc, working_days_in_month, present_days, per_day_salary, gross_salary_full_month, net_salary_full_month, gross_salary_earned, net_take_home_salary)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            let [prEmployeeSalaryComponentResult] = await connection.query(prEmployeeSalaryComponentQuery, [pr_batch_id, element.employee_salary_id, element.employee_id, ctcMonthly.toFixed(2), totalMonthDays, presentDays, perDayGross.toFixed(2), totalEarnings.toFixed(2), netSalary.toFixed(2), actualNet.toFixed(2), (actualNet - totalDeductions).toFixed(2)])
            let pr_employee_salary_component_id = prEmployeeSalaryComponentResult.insertId
            // 5. add actual amount component
            const calculatedActualBreakdown = [];
            for (const comp of calculatedBreakdown) {
                const fullAmount = parseFloat(comp.amount);

                const perDay = fullAmount / totalMonthDays;
                let actualAmount = perDay * presentDays;

                // FIXED components (PF/PT etc.)
                if (comp.calculation_type === "FIXED") {
                    actualAmount = fullAmount;
                }

                // insert query
                let insertQuery = `
                    INSERT INTO pr_employee_salary_component_details 
                    (pr_employee_salary_component_id, salary_component_id, component_type_id, calculation_type_id, expected_amount, actual_amount) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                await connection.query(insertQuery, [pr_employee_salary_component_id,comp.salary_component_id,comp.component_type_id,comp.calculation_type_id,fullAmount.toFixed(2),actualAmount.toFixed(2)]);
                calculatedActualBreakdown.push({
                    name: comp.name,
                    type: comp.type,
                    amount: fullAmount.toFixed(2),
                    actualAmount: actualAmount.toFixed(2)
                });
            }

            // Update your payrollData object
            let payrollData = {
                monthly_ctc: ctcMonthly.toFixed(2),
                working_days_in_month: totalMonthDays,
                present_days: presentDays,
                per_day_salary: perDayGross.toFixed(2), // Net per day
                // Original Potentials (Full Month)
                gross_salary_full_month: totalEarnings.toFixed(2),
                net_salary_full_month: netSalary.toFixed(2),

                // Actual Payout (Based on Attendance)
                gross_salary_earned: actualNet.toFixed(2),
                net_take_home_salary: (actualNet - totalDeductions).toFixed(2),

                // breakdown: calculatedBreakdown,
                breakdown: calculatedActualBreakdown,
                attendanceDetails: getAttendanceResult[0],
            };
            payrollEmployeeData.push(payrollData);
        }
        // await connection.rollback();
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Pay roll initialize successfully.",
            data: payrollEmployeeData,
        });
    } catch (error) {
        console.log(error);
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) await connection.release();
    }
};
//get pay roll batch list
const getPrBatches= async (req, res) => {
    let { page, perPage, key, status } = req.query;
    if (status) {
        if (status != "Draft" && status != "Approved" && status != "Finalized" && status !="Paid") {
            return error422("Pay roll batch status is Invalid.", res);
        }
    }
    let connection = await pool.getConnection();
    try {
        let getQuery = ` SELECT pr.*, CONCAT(ie.first_name,' ',ie.last_name) AS initialized_name,  CONCAT(ae.first_name,' ',ae.last_name) AS approved_name, CONCAT(fe.first_name,' ',fe.last_name) AS finalized_name 
        FROM pr_batches pr
        LEFT JOIN employee ie
        ON ie.employee_id = pr.initialized_by
        LEFT JOIN employee ae
        ON ae.employee_id = pr.approved_by 
        LEFT JOIN employee fe
        ON fe.employee_id = pr.finalized_by
        WHERE 1 `;
        let countQuery = ` SELECT COUNT(*) AS total FROM pr_batches pr
        LEFT JOIN employee ie
        ON ie.employee_id = pr.initialized_by
        LEFT JOIN employee ae
        ON ae.employee_id = pr.approved_by 
        LEFT JOIN employee fe
        ON fe.employee_id = pr.finalized_by
        WHERE 1 `;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getQuery += ` AND pr.status = 1`;
                countQuery += ` AND pr.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getQuery += ` AND pr.status = 0`;
                countQuery += ` AND pr.status = 0`;
            } else {
                getQuery += ` AND (LOWER(CONCAT(ie.first_name,' ',ie.last_name)) LIKE '%${lowercaseKey}%' || LOWER(CONCAT(ie.first_name,' ',ie.last_name)) LIKE '%${lowercaseKey}%' )`;
                countQuery += ` AND (LOWER(CONCAT(ie.first_name,' ',ie.last_name)) LIKE '%${lowercaseKey}%' || LOWER(CONCAT(ie.first_name,' ',ie.last_name)) LIKE '%${lowercaseKey}%' )`;
            }
        }
        if (status) {
            getQuery += ` AND pr.pr_status = '${status}'`;
            countQuery += `  AND pr.pr_status = '${status}'`;
        }

        getQuery += " ORDER BY pr.created_at DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const prBatches = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Pay roll batch retrieved successfully",
            data: prBatches,
        };
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage),
            };
        }

        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//get pr batch by id
const getPrBatchById = async (req, res) => {
    const prBatchId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const getQuery = ` SELECT pr.*, CONCAT(ie.first_name,' ',ie.last_name) AS initialized_name,  CONCAT(ae.first_name,' ',ae.last_name) AS approved_name, CONCAT(fe.first_name,' ',fe.last_name) AS finalized_name 
        FROM pr_batches pr
        LEFT JOIN employee ie
        ON ie.employee_id = pr.initialized_by
        LEFT JOIN employee ae
        ON ae.employee_id = pr.approved_by 
        LEFT JOIN employee fe
        ON fe.employee_id = pr.finalized_by
        WHERE pr.pr_batch_id = ? `;
        const [result] = await connection.query( getQuery,[prBatchId]);
        if ([result].length == 0) {
            return error422("Pay Roll Batch Not Found.", res);
        }
        let prBatch = result[0];
        //get pr employee salary components
        let getPrEmployeeSalaryComponentQuery = `SELECT * FROM pr_employee_salary_components WHERE pr_batch_id = ?`;
        let [prEmployeeSalaryComponentResult] = await connection.query(getPrEmployeeSalaryComponentQuery,[prBatchId])
        prBatch['employeeDetails'] = prEmployeeSalaryComponentResult[0];

        for (let i = 0; i < prEmployeeSalaryComponentResult.length; i++) {
            const element = prEmployeeSalaryComponentResult[i];
            let pr_employee_salary_component_id = element.pr_employee_salary_component_id;
            let getSalaryComponentQuery = `SELECT sd.*, sc.salary_component_name, ct.component_type, clt.calculation_type 
            FROM pr_employee_salary_component_details sd
            LEFT JOIN salary_component sc
            ON sc.salary_component_id = sd.salary_component_id 
            LEFT JOIN component_type ct
            ON ct.component_type_id = sd.component_type_id
            LEFT JOIN calculation_type clt
            ON clt.calculation_type_id = sd.calculation_type_id
            WHERE sd.pr_employee_salary_component_id = ?`;
            let [salaryComponentResult]  = await connection.query(getSalaryComponentQuery, [pr_employee_salary_component_id])
            prBatch['employeeDetails']['salaryDetails'] = salaryComponentResult
        }
        return res.status(200).json({
            status: 200,
            message: "Pay Roll Batch Retrived Successfully",
            data: prBatch,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//Update employee salary component
const updateEmployeeSalaryComponent = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);
    let employee_id = req.body.employee_id ? req.body.employee_id : null;
    let salary_structure_id = req.body.salary_structure_id
        ? req.body.salary_structure_id
        : null;
    let grade_id = req.body.grade_id ? req.body.grade_id : null;
    let ctc_amount = req.body.ctc_amount ? req.body.ctc_amount : null;
    let basic_override = req.body.basic_override ? req.body.basic_override : null;
    let effective_from = req.body.effective_from ? req.body.effective_from : null;
    let effective_to = req.body.effective_to ? req.body.effective_to : null;
    let user_id = 1;

    if (!employee_id) {
        return error422("Employee is required.", res);
    } else if (!salary_structure_id) {
        return error422("Salary structure is required.", res);
    } else if (!grade_id) {
        return error422("Grade is required.", res);
    } else if (!ctc_amount) {
        return error422("CTC amount is required.", res);
    } else if (!basic_override) {
        return error422("Basic override is required.", res);
    } else if (!effective_from) {
        return error422("Effective from is required.", res);
    } else if (!effective_to) {
        return error422("Effective to is required.", res);
    }

    //is employee exist
    let isEmployeeQuery = "SELECT * FROM employee WHERE employee_id = ?";
    let isEmployeeResult = await pool.query(isEmployeeQuery, [employee_id]);
    if (isEmployeeResult[0].length == 0) {
        return error422("Employee Not Found", res);
    }
    //is salary structure
    let isSalaryStructureQuery =
        "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    let isSalaryStructureResult = await pool.query(isSalaryStructureQuery, [
        salary_structure_id,
    ]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found", res);
    }
    //is grade
    let isGradeQuery = "SELECT * FROM grades WHERE grade_id = ?";
    let isGradeResult = await pool.query(isGradeQuery, [grade_id]);
    if (isGradeResult[0].length == 0) {
        return error422("Grade Not Found", res);
    }

    // Check if employee salary component  exists
    const employeeSalaryMappingQuery =
        "SELECT * FROM employee_salary_mapping WHERE employee_salary_id  = ?";
    const employeeSalaryMappingResult = await pool.query(
        employeeSalaryMappingQuery,
        [employeeSalaryMappingId],
    );
    if (employeeSalaryMappingResult[0].length == 0) {
        return error422("Employee Salary Mapping Not Found.", res);
    }
    // Check if the provided salary component  exists
    const existingEmployeeSalaryMappingQuery =
        "SELECT * FROM employee_salary_mapping WHERE employee_id = ? AND employee_salary_id !=? ";
    const existingEmployeeSalaryMappingResult = await pool.query(
        existingEmployeeSalaryMappingQuery,
        [employee_id, employeeSalaryMappingId],
    );
    if (existingEmployeeSalaryMappingResult[0].length > 0) {
        return error422("The employee already has a salary mapped.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the employee salary component record with new data
        const updateQuery = `
            UPDATE employee_salary_mapping
            SET employee_id = ?, salary_structure_id = ?, grade_id = ?, ctc_amount = ?, basic_override = ?, effective_from = ?, effective_to = ?, created_by = ?
            WHERE employee_salary_id = ?
        `;
        await connection.query(updateQuery, [
            employee_id,
            salary_structure_id,
            grade_id,
            ctc_amount,
            basic_override,
            effective_from,
            effective_to,
            user_id,
            employeeSalaryMappingId,
        ]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee Salary Mapping updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//status change of employee salary component...
const onStatusChange = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the employee salary component exists
        const employeeSalaryMappingQuery =
            "SELECT * FROM employee_salary_mapping WHERE employee_salary_id = ? ";
        const employeeSalaryMappingResult = await connection.query(
            employeeSalaryMappingQuery,
            [employeeSalaryMappingId],
        );

        if (employeeSalaryMappingResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Employee Salary Mapping not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message:
                    "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the employee salary component status
        const updateQuery = `
            UPDATE employee_salary_mapping
            SET status = ?
            WHERE employee_salary_id = ?`;
        await connection.query(updateQuery, [status, employeeSalaryMappingId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Employee Salary Mapping ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//get employee salary component active...
const getEmployeeSalaryComponentWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let employeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE sm.status = 1  `;
        // gradeQuery +=" ORDER BY grade_code"
        const employeeSalaryMappingResult = await connection.query(
            employeeSalaryMappingQuery,
        );
        const employeeSalaryMapping = employeeSalaryMappingResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee Salary Mapping retrieved successfully.",
            data: employeeSalaryMapping,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    prInitialize,
    getPrBatches,
    getPrBatchById,
    updateEmployeeSalaryComponent,
    onStatusChange,
    getEmployeeSalaryComponentWma,
};
// i have CTC amount  then
// Basic Salary(component_type=EARNING/DEDUCTION, calculation_type=PERCENTAGE/FIXED, value=40, calculation_order=1),
// House Rent Allowance(component_type=EARNING/DEDUCTION, calculation_type=PERCENTAGE/FIXED, value=40, calculation_order=2),
// Special Allowance(component_type=EARNING/DEDUCTION, calculation_type=PERCENTAGE/FIXED, value=40, calculation_order=3),
// Provident Fund(component_type=EARNING/DEDUCTION, calculation_type=PERCENTAGE/FIXED, value=12, calculation_order=4),
// Professional Tax(component_type=EARNING/DEDUCTION, calculation_type=PERCENTAGE/FIXED, value=200, calculation_order=5)
