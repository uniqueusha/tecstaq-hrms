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
//create Appraisal Answer...
const createAppraisalAnswer = async (req, res) => {
    // validation run
    await Promise.all([
        body('appraisalAnswerDetails').notEmpty().withMessage("Appraisal Answer details is required").isArray({ min: 1 }).withMessage("Appraisal Answer not provided").run(req)
    ]);2
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisalAnswerDetails = req.body.appraisalAnswerDetails ? req.body.appraisalAnswerDetails : [];
    const employee_id = req.user.employee_id;

    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert Appraisal Answer
        const insertQuery = ` INSERT INTO appraisal_answers  (appraisal_question_id, start_date, end_date, created_by) VALUES (?, ?, ?, ?) `;
        // const appraisalAnswerResult = await connection.query(insertQuery, [cycle_name, start_date, end_date, employee_id]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal submitted successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get Appraisal Answers...
const getAppraisalAnswers = async (req, res) => {
    let { page, perPage, key, status } = req.query;
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
//Appraisal Answer by id
const getAppraisalAnswer = async (req, res) => {
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
        const AppraisalCycle = AppraisalCycleResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Appraisal Cycle Retrived Successfully",
            data: AppraisalCycle
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update Appraisal Answer
const updateAppraisalAnswer = async (req, res) => {
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
//download Appraisal Answer
const getAppraisalAnswerDownload = async (req, res) => {

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
//status change Appraisal Answer
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

module.exports = {
    createAppraisalAnswer,
    getAppraisalAnswers,
    getAppraisalAnswer,
    updateAppraisalAnswer,
    getAppraisalAnswerDownload,
    onStatusChange
}