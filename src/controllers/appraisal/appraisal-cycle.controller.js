const pool = require('../../../db');
const xlsx = require("xlsx");
const fs = require("fs");
const { body, param, validationResult } = require('express-validator');
// error handle 422
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}
// error handle 500
const error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}
//create Appraisal Cycle...
const createAppraisalCycle = async (req, res) => {
    // validation run
    await Promise.all([
        body('cycle_name').notEmpty().withMessage("Cycle name is required.").run(req),
        body('employeeDetails').notEmpty().withMessage("Employee details is required").isArray({ min: 1 }).run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const cycle_name = req.body.cycle_name ? req.body.cycle_name.trim() : null;
    const start_date = req.body.start_date ? req.body.start_date.trim() : null;
    const end_date = req.body.end_date ? req.body.end_date.trim() : null;
    const employeeDetails = req.body.employeeDetails ? req.body.employeeDetails : [];
    const employee_id = req.user.employee_id

    //check duplicate employee id
    const duplicates = employeeDetails.reduce((acc, item, index) => {
        const { employee_id } = item;
        const foundIndex = employeeDetails.findIndex((d, i) => i !== index && d.employee_id === employee_id);
        if (foundIndex !== -1 && !acc.some((entry) => entry.index === foundIndex)) {
            acc.push({ index, foundIndex });
        }
        return acc;
    }, []);

    if (duplicates.length > 0) {
        return error422("Duplicate employee found in employee Details array.", res);
    }
    //is exist Appraisal Cycle
    let isAppraisalCycleQuery = "SELECT * FROM appraisal_cycles WHERE cycle_name = ? ";
    let isAppraisalCycleResult = await pool.query(isAppraisalCycleQuery, [cycle_name]);
    if (isAppraisalCycleResult[0].length > 0) {
        return error422("Appraisal Cycle already exists.", res);
    }

    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert Appraisal Cycle
        const insertQuery = ` INSERT INTO appraisal_cycles  (cycle_name, start_date, end_date, created_by) VALUES (?, ?, ?, ?) `;
        const appraisalCycleResult = await connection.query(insertQuery, [cycle_name, start_date, end_date, employee_id]);
        const appraisal_cycle_id = appraisalCycleResult[0].insertId;
        //insert appraisal cycles employees
        for (let i = 0; i < employeeDetails.length; i++) {
            const element = employeeDetails[i];
            if (!element.employee_id) {
                await connection.rollback()
                return error422("Employee id is required.", res)
            }

            // Check if employee exists
            const employeeQuery = "SELECT * FROM employee WHERE employee_id  = ?";
            const employeeResult = await connection.query(employeeQuery, [element.employee_id]);
            if (employeeResult[0].length == 0) {
                await connection.rollback();
                return error422("Employee Not Found.", res);
            }
            let employee = employeeResult[0][0];
            // Check if check appraisal cycle employee exists
            const isCycleEmployeeQuery = "SELECT * FROM appraisal_cycles_employees WHERE employee_id  = ? AND appraisal_cycle_id = ?";
            const cycleEmployeeResult = await connection.query(isCycleEmployeeQuery, [element.employee_id, appraisal_cycle_id]);
            if (cycleEmployeeResult[0].length > 0) {
                await connection.rollback();
                return error422("Appraisal cycle is not assigned to the employee.", res);
            }
            let insertAppraisalCycleEmployeeQuery = "INSERT INTO appraisal_cycles_employees ( appraisal_cycle_id, department_id, employee_id, reporting_manager_id ) VALUES (?, ?, ?, ?)";
            await connection.query(insertAppraisalCycleEmployeeQuery, [appraisal_cycle_id, employee.departments_id, element.employee_id, employee.reporting_manager_id])
        }

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal Cycle created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get Appraisal Cycle...
const getAppraisalCycles = async (req, res) => {
    let { status, key, page, perPage } = req.query;
    if (status) {
        if (status != "Draft" && status != "Active" && status != "Closed") {
            return error422("Appraisal cycle status is Invalid.", res);
        }
    }
    let connection = await pool.getConnection();
    try {
        let getAppraisalCycleQuery = " SELECT * FROM appraisal_cycles WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM appraisal_cycles WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalCycleQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%' ) `;
            countQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%' ) `;
        }
        if (status) {
            getAppraisalCycleQuery += ` AND status = '${status}'`;
            countQuery += `  AND status = '${status}'`;
        }
        getAppraisalCycleQuery += ` ORDER BY created_at DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getAppraisalCycleQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getAppraisalCycleQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Appraisal Cycle retrived successfully",
            data: result[0]
        }
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage)
            };
        }
        return res.status(200).json(data)
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
}
//Appraisal Cycle by id
const getAppraisalCycle = async (req, res) => {
    const appraisalCycleId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const AppraisalCycleQuery = `SELECT * FROM appraisal_cycles
        WHERE appraisal_cycle_id = ? `;
        const AppraisalCycleResult = await connection.query(AppraisalCycleQuery, [appraisalCycleId]);

        if (AppraisalCycleResult[0].length == 0) {
            return error422("Appraisal Cycle Not Found.", res);
        }
        let appraisalCycle = AppraisalCycleResult[0][0];
        let getEmployeeDetailsQuery = `SELECT ace.*, e.first_name, e.last_name, d.department_name, ee.first_name AS reporting_manager_first_name, ee.last_name AS reporting_manager_last_name FROM appraisal_cycles_employees ace 
        LEFT JOIN employee e
        ON e.employee_id = ace.employee_id
        LEFT JOIN departments d
        ON e.departments_id = d.departments_id
        LEFT JOIN employee ee
        ON e.reporting_manager_id = ee.employee_id
        WHERE appraisal_cycle_id = ?`;
        let [resultEmployeeDetails] = await connection.query(getEmployeeDetailsQuery, [appraisalCycleId])
        appraisalCycle['employeeDetails'] = resultEmployeeDetails
        return res.status(200).json({
            status: 200,
            message: "Appraisal Cycle Retrived Successfully",
            data: appraisalCycle
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update Appraisal Cycle
const updateAppraisalCycle = async (req, res) => {
    // validation run
    await Promise.all([
        body('cycle_name').notEmpty().withMessage("Cycle name is required.").run(req),
        body('employeeDetails').notEmpty().withMessage("Employee details is required").isArray({ min: 1 }).run(req),
        param('id').notEmpty().withMessage("Appraisal cycle is required.").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisalCycleId = parseInt(req.params.id);
    const cycle_name = req.body.cycle_name ? req.body.cycle_name.trim() : null;
    const start_date = req.body.start_date ? req.body.start_date.trim() : null;
    const end_date = req.body.end_date ? req.body.end_date.trim() : null;
    const employeeDetails = req.body.employeeDetails ? req.body.employeeDetails : [];
    const employee_id = req.user.employee_id;

    //check duplicate employee id
    const duplicates = employeeDetails.reduce((acc, item, index) => {
        const { employee_id } = item;
        const foundIndex = employeeDetails.findIndex((d, i) => i !== index && d.employee_id === employee_id);
        if (foundIndex !== -1 && !acc.some((entry) => entry.index === foundIndex)) {
            acc.push({ index, foundIndex });
        }
        return acc;
    }, []);

    if (duplicates.length > 0) {
        return error422("Duplicate employee found in employee Details array.", res);
    }
    // Check if Appraisal Cycle exists
    const appraisalCycleQuery = "SELECT * FROM appraisal_cycles WHERE appraisal_cycle_id  = ?";
    const appraisalCycleResult = await pool.query(appraisalCycleQuery, [appraisalCycleId]);
    if (appraisalCycleResult[0].length == 0) {
        return error422("Appraisal Cycle Not Found.", res);
    }
    // Check if the provided Appraisal Cycle exists
    const existingAppraisalCycleQuery = "SELECT * FROM appraisal_cycles WHERE cycle_name = ? AND appraisal_cycle_id !=? ";
    const existingAppraisalCycleResult = await pool.query(existingAppraisalCycleQuery, [cycle_name, appraisalCycleId]);
    if (existingAppraisalCycleResult[0].length > 0) {
        return error422("Appraisal Cycle already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the grade record with new data
        const updateQuery = `
            UPDATE appraisal_cycles
            SET cycle_name = ?, start_date = ?, end_date = ?, created_by = ?
            WHERE appraisal_cycle_id = ?
        `;
        await connection.query(updateQuery, [cycle_name, start_date, end_date, employee_id, appraisalCycleId]);
        // delete old mappings
        await connection.query("DELETE FROM appraisal_cycles_employees WHERE appraisal_cycle_id = ?", [appraisalCycleId]);
        //insert appraisal cycles employees
        for (let i = 0; i < employeeDetails.length; i++) {
            const element = employeeDetails[i];
            if (!element.employee_id) {
                await connection.rollback()
                return error422("Employee id is required.", res)
            }

            // Check if employee exists
            const employeeQuery = "SELECT * FROM employee WHERE employee_id  = ?";
            const employeeResult = await connection.query(employeeQuery, [element.employee_id]);
            if (employeeResult[0].length == 0) {
                await connection.rollback();
                return error422("Employee Not Found.", res);
            }
            let employee = employeeResult[0][0];
            // Check if check appraisal cycle employee exists
            const isCycleEmployeeQuery = "SELECT * FROM appraisal_cycles_employees WHERE employee_id  = ? AND appraisal_cycle_id = ?";
            const cycleEmployeeResult = await connection.query(isCycleEmployeeQuery, [element.employee_id, appraisalCycleId]);
            if (cycleEmployeeResult[0].length > 0) {
                await connection.rollback();
                return error422("Appraisal cycle is aleady assigned to the employee.", res);
            }
            let insertAppraisalCycleEmployeeQuery = "INSERT INTO appraisal_cycles_employees ( appraisal_cycle_id, department_id, employee_id, reporting_manager_id ) VALUES (?, ?, ?, ?)";
            await connection.query(insertAppraisalCycleEmployeeQuery, [appraisalCycleId, employee.departments_id, element.employee_id, employee.reporting_manager_id])
        }
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Appraisal Cycle updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//download Appraisal Cycle
const getAppraisalCycleDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getAppraisalCycleQuery = " SELECT * FROM appraisal_cycles WHERE 1  ";

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalCycleQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%') `;
        }
        getAppraisalCycleQuery += ` ORDER BY created_at DESC `;

        let result = await connection.query(getAppraisalCycleQuery);
        let AppraisalCycle = result[0];

        if (AppraisalCycle.length === 0) {
            return error422("No data found.", res);
        }

        AppraisalCycle = AppraisalCycle.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.created_at,
            "Name": item.cycle_name,
            "Start": item.start_date,
            "End": item.end_date,
            "Status": item.status,
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(AppraisalCycle);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "AppraisalCycleInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//status change Appraisal cycle
const onStatusChange = async (req, res) => {
    const appraisal_cycle_id = parseInt(req.params.id);
    const status = req.query.status ? req.query.status.trim() : '';
    // 'Draft','Active','Closed' 
    if (status != 'Draft' && status != 'Active' && status != 'Closed') {
        return error422("Status is invalid.", res);
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let getQuery = `SELECT * FROM appraisal_cycles 
        WHERE appraisal_cycle_id = ?`;
        const [result] = await connection.query(getQuery, [appraisal_cycle_id]);
        const appraisalCycleResult = result[0];
        if (!appraisalCycleResult) {
            return error422('Appraisal Cycle Not Found', res)
        }
        if (status == appraisalCycleResult.status) {
            return error422("This Appraisal Cycle is already " + status, res)
        }
        let updateQuery = `UPDATE appraisal_cycles 
            SET status = ? WHERE appraisal_cycle_id = ?`
        await connection.query(updateQuery, [status, appraisal_cycle_id]);
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Appraisal cycle '${status}' successfully`,
        });
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//get appraisal cycle by appraisal cycle employee id
const getAppraisalCycleByAppraisalCycleEmployeeId = async (req, res) => {
    const appraisal_cycles_employee_id = parseInt(req.params.id);
    if (!appraisal_cycles_employee_id) {
        return error422("Appraisal cycle employee id is required.", res);
    }
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //get appraisal cycles employee query
        let getQuery = `SELECT ace.*, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name
        FROM appraisal_cycles_employees ace 
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = ace.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = ace.employee_id
        WHERE ace.appraisal_cycles_employee_id = ${appraisal_cycles_employee_id} `;
        let [result] = await connection.query(getQuery)
        let appraisal = result[0]
        if (result.length == 0) {
            await connection.rollback();
            return error422("Appraisal cycle is not assigned to the employee.", res)
        }
        //get appraisal questions query
        let getAppraisalQuestionQuery = `SELECT aq.*, aa.value, aa.appraisal_answer_id FROM appraisal_cycles_employees ace
        LEFT JOIN appraisal_questions aq
        ON aq.appraisal_cycle_id = ace.appraisal_cycle_id
        LEFT JOIN appraisal_answers aa
        ON aa.appraisal_question_id = aq.appraisal_question_id AND aa.employee_id = ace.employee_id
        WHERE ace.appraisal_cycle_id =${appraisal.appraisal_cycle_id} AND ace.employee_id = ${appraisal.employee_id} AND aq.status = 1 ORDER BY aq.appraisal_question_id ASC;`
        let [appraisalQuestionResult] = await connection.query(getAppraisalQuestionQuery)
        appraisal['appraisalQuestionDetails'] = appraisalQuestionResult;

        //get appraisal analytics
        let getAppraisalQuery =` SELECT a.* FROM appraisals a WHERE a.appraisal_cycle_id = ${appraisal.appraisal_cycle_id} AND a.employee_id = ${appraisal.employee_id}`;
        let [getAppraisalResult] = await connection.query(getAppraisalQuery);
        appraisal['appraisalAnalyticDetails'] = getAppraisalResult[0];

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal cycle retrived successfully.",
            data: appraisal
        })
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//get appraisal cycles employees
const getAppraisalCycleEmployees = async (req, res) => {
    let { employee_id, reporting_manager_id, status, key, page, perPage } = req.query;
    if (status) {
        if (status != "Draft" && status != "Active" && status != "Closed") {
            return error422("Appraisal cycle status is Invalid.", res);
        }
    }
    let connection = await pool.getConnection();
    try {
        let getAppraisalCycleQuery = `SELECT ace.*, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name, ee.first_name AS reporting_manager_first_name, ee.last_name AS reporting_manager_last_name,
        a.self_score_total, a.self_score_per, a.manager_score_total, a.manager_score_per, a.final_score, a.final_outcome, a.is_finalized 
        FROM appraisal_cycles_employees ace
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = ace.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = ace.employee_id
        LEFT JOIN employee ee
        ON ee.employee_id = ace.reporting_manager_id
        LEFT JOIN appraisals a
        ON a.employee_id = ace.employee_id AND a.appraisal_cycle_id = ace.appraisal_cycle_id
         WHERE 1 `;
        let countQuery = `SELECT COUNT(*) AS total 
        FROM appraisal_cycles_employees ace 
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = ace.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = ace.employee_id
        LEFT JOIN appraisals a
        ON a.employee_id = ace.employee_id AND a.appraisal_cycle_id = ace.appraisal_cycle_id
        WHERE 1 `
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalCycleQuery += ` AND (LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' ) `;
            countQuery += ` AND (LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' ) `;
        }
        if (status) {
            getAppraisalCycleQuery += ` AND ac.status = '${status}'`;
            countQuery += `  AND ac.status = '${status}'`;
        }
        if (employee_id) {
            getAppraisalCycleQuery += ` AND ace.employee_id = '${employee_id}'`;
            countQuery += `  AND ace.employee_id = '${employee_id}'`;
        }
        if (reporting_manager_id) {
            getAppraisalCycleQuery += ` AND ace.reporting_manager_id = '${reporting_manager_id}'`;
            countQuery += `  AND ace.reporting_manager_id = '${reporting_manager_id}'`;
        }
        getAppraisalCycleQuery += ` ORDER BY ac.created_at DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getAppraisalCycleQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getAppraisalCycleQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Appraisal Cycle employees retrived successfully",
            data: result[0]
        }
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage)
            };
        }
        return res.status(200).json(data)
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
}
//download Appraisal Cycle employee
const getAppraisalCycleEmployeeDownload = async (req, res) => {
    let { employee_id, reporting_manager_id, status, key } = req.query;
    if (status) {
        if (status != "Draft" && status != "Active" && status != "Closed") {
            return error422("Appraisal cycle status is Invalid.", res);
        }
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getAppraisalCycleQuery = `SELECT ace.*, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name, ee.first_name AS reporting_manager_first_name, ee.last_name AS reporting_manager_last_name,
        a.self_score_total, a.self_score_per, a.manager_score_total, a.manager_score_per, a.final_score, a.final_outcome, a.is_finalized  
        FROM appraisal_cycles_employees ace
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = ace.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = ace.employee_id
        LEFT JOIN appraisals a
        ON a.employee_id = ace.employee_id AND a.appraisal_cycle_id = ace.appraisal_cycle_id
         WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalCycleQuery += ` AND (LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' ) `;
        }
        if (status) {
            getAppraisalCycleQuery += ` AND ac.status = '${status}'`;
        }
        if (employee_id) {
            getAppraisalCycleQuery += ` AND ace.employee_id = '${employee_id}'`;
        }
        if (reporting_manager_id) {
            getAppraisalCycleQuery += ` AND ace.reporting_manager_id = '${reporting_manager_id}'`;
        }
        getAppraisalCycleQuery += ` ORDER BY ac.created_at DESC `;

        let result = await connection.query(getAppraisalCycleQuery);
        let AppraisalCycle = result[0];

        if (AppraisalCycle.length === 0) {
            return error422("No data found.", res);
        }

        AppraisalCycle = AppraisalCycle.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.created_at,
            "Name": item.cycle_name,
            "Start": item.start_date,
            "End": item.end_date,
            "Status": item.status,
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(AppraisalCycle);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "AppraisalCycleEmployeeInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
module.exports = {
    createAppraisalCycle,
    getAppraisalCycles,
    getAppraisalCycle,
    updateAppraisalCycle,
    getAppraisalCycleDownload,
    onStatusChange,
    getAppraisalCycleByAppraisalCycleEmployeeId,
    getAppraisalCycleEmployees,
    getAppraisalCycleEmployeeDownload
}