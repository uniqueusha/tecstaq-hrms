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
//create Appraisal Question...
const createAppraisalQuestion = async (req, res) => {
    //validation run
    await Promise.all([
        body('appraisalQuestionDetails').isArray({ min: 1 }).withMessage("Appraisal Question Details must be a non-empty array").run(req),
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal Cycle ID is required").isInt().run(req),
        body('appraisalQuestionDetails.*.question_text').notEmpty().withMessage("Question text is required").run(req),
        body('appraisalQuestionDetails.*.type').notEmpty().withMessage("Type is required").isIn(['text', 'rating', 'boolean']).withMessage("Type is invalid").run(req),
        body('appraisalQuestionDetails.*.section').notEmpty().withMessage("Section is required").isIn(['self', 'manager']).withMessage("Section is invalid").run(req),
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res);
    }
    const appraisal_cycle_id = req.body.appraisal_cycle_id
    const appraisalQuestionDetails = req.body.appraisalQuestionDetails;
    const employee_id = req.user.employee_id;
    const seen = new Set();
    for (let item of appraisalQuestionDetails) {
        const key = `${appraisal_cycle_id}-${item.section}-${item.question_text.trim().toLowerCase()}`;
        if (seen.has(key)) {
            return error422("Duplicate question found in request.", res);
        }
        seen.add(key);
    }
    // Check if cycle id exist
    const [cycles] = await pool.query(`SELECT appraisal_cycle_id FROM appraisal_cycles WHERE appraisal_cycle_id = ?`, [appraisal_cycle_id]);
    if (cycles.length == 0) {
        return error422("Invalid appraisal_cycle_id provided.", res);
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (let i = 0; i < appraisalQuestionDetails.length; i++) {
            const element = appraisalQuestionDetails[i];
            let isExistingQuery = `SELECT appraisal_cycle_id, question_text FROM appraisal_questions WHERE appraisal_cycle_id = ? AND question_text = ? AND section = ? AND status != 0`
            const [existing] = await connection.query(isExistingQuery, [appraisal_cycle_id, element.question_text, element.section]);
            if (existing.length > 0) {
                await connection.rollback();
                return error422("Some appraisal questions already exist.", res);
            }
        }

        // Bulk insert
        const values = appraisalQuestionDetails.map(item => [appraisal_cycle_id, item.question_text.trim(), item.type.trim(), item.section.trim(), employee_id]);
        await connection.query(`INSERT INTO appraisal_questions (appraisal_cycle_id, question_text, type, section, created_by)VALUES ?`, [values]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal Questions created successfully."
        });

    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
// get Appraisal Questions...
const getAppraisalQuestions = async (req, res) => {
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

        let [result] = await connection.query(getAppraisalCycleQuery)

        for (let i = 0; i < result.length; i++) {
            const element = result[i];
            let getQuestionQuery = `SELECT * FROM appraisal_questions WHERE appraisal_cycle_id = ? AND status = 1`;
            let [resultQuestion] = await connection.query(getQuestionQuery, [element.appraisal_cycle_id])
            result[i]['appraisalQuestionDetails'] = resultQuestion
        }

        //commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Appraisal Cycle With Question retrived successfully",
            data: result
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
//Update Appraisal question
const updateAppraisalQuestion = async (req, res) => {
    //validation run
    await Promise.all([
        body('appraisalQuestionDetails').isArray({ min: 1 }).withMessage("Appraisal Question Details must be a non-empty array").run(req),
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal Cycle ID is required").isInt().run(req),
        body('appraisalQuestionDetails.*.question_text').notEmpty().withMessage("Question text is required").run(req),
        body('appraisalQuestionDetails.*.type').notEmpty().withMessage("Type is required").isIn(['text', 'rating', 'boolean']).withMessage("Type is invalid").run(req),
        body('appraisalQuestionDetails.*.section').notEmpty().withMessage("Section is required").isIn(['self', 'manager']).withMessage("Section is invalid").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisal_cycle_id = req.body.appraisal_cycle_id;
    const appraisalQuestionDetails = req.body.appraisalQuestionDetails;
    const employee_id = req.user.employee_id;
    const seen = new Set();
    for (let item of appraisalQuestionDetails) {
        const key = `${appraisal_cycle_id}-${item.section}-${item.question_text.trim().toLowerCase()}`;
        if (seen.has(key)) {
            return error422("Duplicate question found in request.", res);
        }
        seen.add(key);
    }
    // Check if cycle id exist
    const [cycles] = await pool.query(`SELECT appraisal_cycle_id FROM appraisal_cycles WHERE appraisal_cycle_id = ?`, [appraisal_cycle_id]);
    if (cycles.length == 0) {
        return error422("Invalid appraisal_cycle_id provided.", res);
    }
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        for (let i = 0; i < appraisalQuestionDetails.length; i++) {
            const element = appraisalQuestionDetails[i];

            if (element.appraisal_question_id) {
                // Check if appraisal question id exist
                const [appraisalQuestions] = await connection.query(`SELECT appraisal_question_id FROM appraisal_questions WHERE appraisal_question_id = ?`, [element.appraisal_question_id]);
                if (appraisalQuestions.length == 0) {
                    await connection.rollback()
                    return error422("Invalid appraisal_question_id provided.", res);
                }
                //appraisal question already exist
                let isExistingQuery = `SELECT appraisal_cycle_id, question_text FROM appraisal_questions WHERE appraisal_cycle_id =? AND question_text =?  AND section =?  AND appraisal_question_id !=?  AND status != 0`
                const [existing] = await connection.query(isExistingQuery, [appraisal_cycle_id, element.question_text, element.section, element.appraisal_question_id]);
                if (existing.length > 0) {
                    await connection.rollback()
                    return error422("Appraisal Question already exists.", res);
                }
                // Update record with new data
                const updateQuery = `
                UPDATE appraisal_questions
                SET appraisal_cycle_id = ?, question_text = ?, type = ?, section = ?, created_by = ?
                WHERE appraisal_question_id = ?
            `;
                await connection.query(updateQuery, [appraisal_cycle_id, element.question_text, element.type, element.section, employee_id, element.appraisal_question_id]);
            } else {
                //appraisal question already exist
                let isExistingQuery = `SELECT appraisal_cycle_id, question_text FROM appraisal_questions WHERE appraisal_cycle_id =? AND question_text =? AND section =? AND status != 0`
                const [existing] = await connection.query(isExistingQuery, [appraisal_cycle_id, element.question_text, element.section]);
                if (existing.length > 0) {
                    await connection.rollback()
                    return error422("Appraisal Question already exists.", res);
                }
                let insertQuery = "INSERT INTO appraisal_questions (appraisal_cycle_id, question_text, type, section, created_by)VALUES (?, ?, ?, ?, ?)"
                await connection.query(insertQuery, [appraisal_cycle_id, element.question_text, element.type, element.section, employee_id]);
            }

        }

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Appraisal Question updated successfully.",
        });
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//download Appraisal Question
const getAppraisalQuestionDownload = async (req, res) => {
    let { key, appraisal_cycle_id } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getQuery = `SELECT aq.*, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name 
        FROM appraisal_questions aq 
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = aq.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = aq.created_by
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(aq.question_text) LIKE '%${lowercaseKey}%') `;
        }
        if (appraisal_cycle_id) {
            getQuery += ` AND aq.appraisal_cycle_id = '${appraisal_cycle_id}'`;
            countQuery += `  AND aq.appraisal_cycle_id = '${appraisal_cycle_id}'`;
        }
        getQuery += ` ORDER BY aq.created_at DESC `;

        let result = await connection.query(getQuery);
        let appraisalQuestion = result[0];

        if (appraisalQuestion.length === 0) {
            return error422("No data found.", res);
        }

        appraisalQuestion = appraisalQuestion.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.created_at,
            "Appraisal Cycle": item.cycle_name,
            "Question": item.question_text,
            "Type": item.type,
            "Section": item.section,
            "Status": item.status,
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(appraisalQuestion);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "AppraisalQuestionInfo");

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
//status change Appraisal Question
const onStatusChange = async (req, res) => {
    const appraisal_question_id = parseInt(req.params.id);
    const status = parseInt(req.query.status);
    // Validate the status parameter
    if (status !== 0 && status !== 1) {
        return res.status(400).json({
            status: 400,
            message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
        });
    }
    const statusMessage = status === 1 ? "activated" : "deactivated";
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let getQuery = `SELECT * FROM appraisal_questions 
        WHERE appraisal_question_id = ?`;
        const [result] = await connection.query(getQuery, [appraisal_question_id]);
        const appraisalQuestionResult = result[0];
        if (!appraisalQuestionResult) {
            return error422('Appraisal Question Not Found', res)
        }
        let updateQuery = `UPDATE appraisal_questions 
            SET status = ? WHERE appraisal_question_id = ?`
        await connection.query(updateQuery, [status, appraisal_question_id]);
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Appraisal Question '${statusMessage}' successfully`,
        });
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//get appraisal question by appraisal cycle id 
const getAppraisalQuestionsByAppraisalCycleId = async (req, res) => {
    const appraisal_cycle_id = parseInt(req.params.id);
    if (!appraisal_cycle_id) {
        return error422("Appraisal cycle id is required.", res)
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let getQuery = 'SELECT * FROM appraisal_cycles WHERE appraisal_cycle_id = ?';
        let [result] = await connection.query(getQuery,[appraisal_cycle_id])
        let getQuestionQuery = ` SELECT aq.*
        FROM appraisal_questions aq 
        WHERE aq.appraisal_cycle_id = ${appraisal_cycle_id} AND status = 1 ORDER BY appraisal_question_id ASC`
        let [resultQuestion] = await connection.query(getQuestionQuery)
        result[0]['appraisalQuestionDetails'] = resultQuestion
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal questions retrived successfully.",
            data: result[0]
        })
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createAppraisalQuestion,
    getAppraisalQuestions,
    updateAppraisalQuestion,
    getAppraisalQuestionDownload,
    onStatusChange,
    getAppraisalQuestionsByAppraisalCycleId
}