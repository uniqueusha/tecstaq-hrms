const pool = require('../common/db')
const { body, param, validationResult } = require('express-validator')
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
const error500 = (error, res) => {
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}
// pay roll initialize
const payRollInitialize = async (req, res) => {
    //run validation
    await Promise.all([
        body('pay_cycle').notEmpty().withMessage("Pay cycle is required").run(req),
        body('pay_roll_month').notEmpty().withMessage("Pay roll month is required.").isInt().withMessage("Invalid pay roll month.").run(req),
        body('pay_roll_year').notEmpty().withMessage("Pay roll year is required.").isInt().withMessage("Invalid pay roll year.").run(req),
    ])
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const pay_cycle = req.body.pay_cycle ? req.body.pay_cycle.trim():'';
    const pay_roll_month = req.body.pay_roll_month ?  req.body.pay_roll_month :null;
    const pay_roll_year = req.body.pay_roll_year ? req.body.pay_roll_year:null
    
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction()
        //get attendace
        let getAttendanceQuery = `SELECT * FROM attendance_upload WHERE attendance_date = ?`
        let getAttendanceResult = await connection.query(getAttendanceQuery,[])
        
        return error422("Employee is required.", res);
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Employee salary component created successfully."
        })
    } catch (error) {
        await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) await connection.release();
    }
}
//get employee salary component list
const getEmployeeSalaryComponent = async (req, res) => {
    const { perPage, page, key } = req.query;
    let connection = await pool.getConnection();
    try {
        let getEmployeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE 1 `
        let countQuery = ` SELECT COUNT(*) AS total FROM employee_salary_mapping sm 
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE 1 `
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getEmployeeSalaryMappingQuery += ` AND sm.status = 1`;
                countQuery += ` AND sm.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getEmployeeSalaryMappingQuery += ` AND sm.status = 0`;
                countQuery += ` AND sm.status = 0`;
            } else {
                getEmployeeSalaryMappingQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' )`;
                countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' )`;
            }
        }
        getEmployeeSalaryMappingQuery += " ORDER BY sm.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getEmployeeSalaryMappingQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getEmployeeSalaryMappingQuery);
        const employeeSalaryMapping = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employee salary component retrieved successfully",
            data: employeeSalaryMapping,
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
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//get employee salary component by id
const getEmployeeSalaryComponentById = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const employeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE employee_salary_id = ? `;
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);

        if (employeeSalaryMappingResult[0].length == 0) {
            return error422("Employee salary component Not Found.", res);
        }
        const employeeSalaryMapping = employeeSalaryMappingResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Employee salary component Retrived Successfully",
            data: employeeSalaryMapping
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update employee salary component 
const updateEmployeeSalaryComponent = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);
    let employee_id = req.body.employee_id ? req.body.employee_id : null;
    let salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : null;
    let grade_id = req.body.grade_id ? req.body.grade_id : null;
    let ctc_amount = req.body.ctc_amount ? req.body.ctc_amount : null;
    let basic_override = req.body.basic_override ? req.body.basic_override : null;
    let effective_from = req.body.effective_from ? req.body.effective_from : null;
    let effective_to = req.body.effective_to ? req.body.effective_to : null;
    let user_id = 1

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
    let isSalaryStructureQuery = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    let isSalaryStructureResult = await pool.query(isSalaryStructureQuery, [salary_structure_id]);
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
    const employeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_salary_id  = ?";
    const employeeSalaryMappingResult = await pool.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);
    if (employeeSalaryMappingResult[0].length == 0) {
        return error422("Employee Salary Mapping Not Found.", res);
    }
    // Check if the provided salary component  exists
    const existingEmployeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_id = ? AND employee_salary_id !=? ";
    const existingEmployeeSalaryMappingResult = await pool.query(existingEmployeeSalaryMappingQuery, [employee_id, employeeSalaryMappingId]);
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
        await connection.query(updateQuery, [employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, user_id, employeeSalaryMappingId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee Salary Mapping updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
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
        const employeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_salary_id = ? ";
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);

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
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
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
        if (connection) connection.release()
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
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery);
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
        if (connection) connection.release()
    }

}

module.exports = {
    payRollInitialize,
    getEmployeeSalaryComponent,
    getEmployeeSalaryComponentById,
    updateEmployeeSalaryComponent,
    onStatusChange,
    getEmployeeSalaryComponentWma
}