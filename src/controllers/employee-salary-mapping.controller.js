const pool = require('../common/db')
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
// create employee salary mapping
const createEmployeeSalaryMapping = async (req, res) => {
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
    //is employee already exist
    let isEmployeeExistQuery = "SELECT * FROM employee_salary_mapping WHERE employee_id = ?";
    let isEmployeeExistResult = await pool.query(isEmployeeExistQuery, [employee_id]);
    if (isEmployeeExistResult[0].length > 0) {
        return error422("The employee already has a salary mapped.", res);
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction()
        //create employee salary mapping
        let employeeSalaryMappingQuery = `INSERT INTO employee_salary_mapping (employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, created_by) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?)`
        await connection.query(employeeSalaryMappingQuery, [employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, user_id]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Employee salary mapping created successfully."
        })
    } catch (error) {
        await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) await connection.release();
    }
}
//get employee salary mapping list
const getEmployeeSalaryMapping = async (req, res) => {
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
            message: "Employee salary mapping retrieved successfully",
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
//get employee salary mapping by id
const employeeSalaryMappingById = async (req, res) =>{
    let connection = await pool.getConnection();
    try {
        let getEmployeeSalaryMappingQuery = `SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE employee_salary_mapping_id = ? `
        
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
module.exports = {
    createEmployeeSalaryMapping,
    getEmployeeSalaryMapping
}