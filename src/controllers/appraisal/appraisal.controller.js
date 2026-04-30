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
//create Appraisal...
const createAppraisal = async (req, res) => {
    // validation run
    await Promise.all([
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal Cycle name is required.").run(req),
        body('employee_id').notEmpty().withMessage("Employee is required").run(req),
        body('self_score_total').notEmpty().withMessage("Self score total is required").isDecimal().withMessage("Self score is invalid").run(req),
        body('manager_score_total').notEmpty().withMessage("Manager score total is required").isDecimal().withMessage("Manager score is invalid").run(req),
        body('final_score').notEmpty().withMessage("Final score is required").isDecimal().withMessage("Final score is invalid").run(req),
        body('final_outcome').notEmpty().withMessage("Final outcome is required").run(req)
        
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisal_cycle_id = req.body.appraisal_cycle_id ? req.body.appraisal_cycle_id : null;
    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const self_score_total = req.body.self_score_total ? req.body.self_score_total : null;
    const manager_score_total = req.body.manager_score_total ? req.body.manager_score_total : null;
    const final_score = req.body.final_score ? req.body.final_score : null;
    const final_outcome = req.body.final_outcome ? req.body.final_outcome : null;

    //is exist Appraisal
    let isAppraisalQuery = "SELECT * FROM appraisals WHERE appraisal_cycle_id = ? AND  employee_id = ?";
    let isAppraisalResult = await pool.query(isAppraisalQuery, [appraisal_cycle_id, employee_id]);
    if (isAppraisalResult[0].length > 0) {
        return error422("Appraisal already exists.", res);
    }

    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert Appraisals
        const insertQuery = ` INSERT INTO appraisals  (appraisal_cycle_id, employee_id, self_score_total, manager_score_total, final_score, final_outcome) VALUES (?, ?, ?, ?, ?, ?) `;
        const appraisalCycleResult = await connection.query(insertQuery, [appraisal_cycle_id, employee_id, self_score_total, manager_score_total, final_score, final_outcome]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get Appraisal...
const getAppraisals = async (req, res) => {
    let { page, perPage, key, status } = req.query;
    if (status) {
        if (status != "Draft" && status != "Active" && status != "Closed") {
            return error422("Appraisal cycle status is Invalid.", res);
        }
    }
    let connection = await pool.getConnection();
    try {
        let getAppraisalQuery = " SELECT * FROM appraisals WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM appraisals WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%' ) `;
            countQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%' ) `;
        }
        if (status) {
            getAppraisalQuery += ` AND status = '${status}'`;
            countQuery += `  AND status = '${status}'`;
        }
        getAppraisalQuery += ` ORDER BY created_at DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getAppraisalQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getAppraisalQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Appraisals retrived successfully",
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
//Appraisal by id
const getAppraisal = async (req, res) => {
    const appraisalId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const AppraisalQuery = `SELECT * FROM appraisals
        WHERE appraisal_id = ? `;
        const AppraisalResult = await connection.query(AppraisalQuery, [appraisalId]);

        if (AppraisalResult[0].length == 0) {
            return error422("Appraisal Not Found.", res);
        }
        const Appraisal = AppraisalResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Appraisal Retrived Successfully",
            data: Appraisal
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update Appraisal
const updateAppraisal = async (req, res) => {
    // validation run
    await Promise.all([
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal Cycle name is required.").run(req),
        body('employee_id').notEmpty().withMessage("Employee is required").run(req),
        body('self_score_total').notEmpty().withMessage("Self score total is required").isDecimal().withMessage("Self score is invalid").run(req),
        body('manager_score_total').notEmpty().withMessage("Manager score total is required").isDecimal().withMessage("Manager score is invalid").run(req),
        body('final_score').notEmpty().withMessage("Final score is required").isDecimal().withMessage("Final score is invalid").run(req),
        body('final_outcome').notEmpty().withMessage("Final outcome is required").run(req)
        
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisalId = parseInt(req.params.id);
    const appraisal_cycle_id = req.body.appraisal_cycle_id ? req.body.appraisal_cycle_id : null;
    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const self_score_total = req.body.self_score_total ? req.body.self_score_total : null;
    const manager_score_total = req.body.manager_score_total ? req.body.manager_score_total : null;
    const final_score = req.body.final_score ? req.body.final_score : null;
    const final_outcome = req.body.final_outcome ? req.body.final_outcome : null;

    // Check if Appraisal exists
    const appraisalQuery = "SELECT * FROM appraisals WHERE appraisal_id  = ?";
    const appraisalResult = await pool.query(appraisalQuery, [appraisalId]);
    if (appraisalResult[0].length == 0) {
        return error422("Appraisal Not Found.", res);
    }
    // Check if the provided Appraisal exists
    const existingAppraisalQuery = "SELECT * FROM appraisals WHERE (appraisal_cycle_id = ? AND employee_id = ?) AND appraisal_id !=? ";
    const existingAppraisalResult = await pool.query(existingAppraisalQuery, [appraisal_cycle_id, employee_id, appraisalId]);
    if (existingAppraisalResult[0].length > 0) {
        return error422("Appraisal already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the  record with new data
        const updateQuery = `
            UPDATE appraisal_cycles
            SET appraisal_cycle_id = ?, employee_id = ?, self_score_total = ?, manager_score_total = ?, final_score = ?, final_outcome = ?
            WHERE appraisal_id = ?
        `;
        await connection.query(updateQuery, [appraisal_cycle_id, employee_id, self_score_total, manager_score_total, final_score, final_outcome, appraisalId]);
       // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//download Appraisal
const getAppraisalDownload = async (req, res) => {

    let { key } = req.query;
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getAppraisalQuery = " SELECT * FROM appraisals WHERE 1  ";

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getAppraisalQuery += ` AND (LOWER(cycle_name) LIKE '%${lowercaseKey}%') `;
        }
        getAppraisalQuery += ` ORDER BY created_at DESC `;

        let result = await connection.query(getAppraisalQuery);
        let Appraisal = result[0];

        if (Appraisal.length === 0) {
            return error422("No data found.", res);
        }

        Appraisal= Appraisal.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.created_at,
            "Name": item.appraisal_cycle_id,
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
//status change Appraisal 
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
    createAppraisal,
    getAppraisals,
    getAppraisal,
    updateAppraisal,
    getAppraisalDownload,
    onStatusChange
}