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
    //validation run
    await Promise.all([
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal cycle id is required").run(req),
        body('employee_id').notEmpty().withMessage("Employee id is required").run(req),
        body('manager_id').notEmpty().withMessage("Manager id is required").run(req),
        body('status').notEmpty().withMessage("Status is required").isIn(['Pending', 'Self Submitted', 'Manager Reviewed', 'Finalized']).withMessage("Invalid status value").run(req),
        body('appraisalAnswerDetails').isArray({ min: 1 }).withMessage("Appraisal Answer Details must be a non-empty array").run(req),
        body('appraisalAnswerDetails.*.appraisal_question_id').notEmpty().withMessage("Appraisal question is required").isInt().run(req),
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res);
    }
    const appraisal_cycle_id = req.body.appraisal_cycle_id
    const employee_id = req.body.employee_id;
    const manager_id = req.body.manager_id;
    const status = req.body.status;
    const appraisalAnswerDetails = req.body.appraisalAnswerDetails;
    let selfCount = 0, selfValueCount = 0, selfTotal = 0;
    let managerCount = 0, managerValueCount = 0, managerTotal = 0;

    const seen = new Set();
    for (let item of appraisalAnswerDetails) {
        const key = `${item.appraisal_question_id}`;
        if (seen.has(key)) {
            return error422("Duplicate question found in request.", res);
        }
        seen.add(key);
    }

    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //is appraisal cycles employee 
        let isAppraisalCycleEmloyeeQuery = "SELECT * FROM appraisal_cycles_employees WHERE employee_id = ? AND appraisal_cycle_id = ?"
        let [isAppraisalCycleEmployeeResult] = await connection.query(isAppraisalCycleEmloyeeQuery, [employee_id, appraisal_cycle_id])
        if (isAppraisalCycleEmployeeResult.length == 0) {
            await connection.rollback();
            return error422("Appraisal cycle emloyee is not found.", res);
        }
        //get totol count of question 
        let getTotalQuestionCountQuery = "SELECT COUNT(*) AS total FROM appraisal_questions WHERE appraisal_cycle_id = ?"
        let [getTotalQuestionCountResult] = await connection.query(getTotalQuestionCountQuery, [appraisal_cycle_id]);
        let total_question = getTotalQuestionCountResult[0].total;

        for (let i = 0; i < appraisalAnswerDetails.length; i++) {
            const element = appraisalAnswerDetails[i];
            const appraisal_question_id = element.appraisal_question_id;
            const value = element.value;
            //is question 
            let isQuestionQuery = "SELECT * FROM appraisal_questions WHERE appraisal_question_id = ?"
            let [isQuestionResult] = await connection.query(isQuestionQuery, [appraisal_question_id]);
            if (isQuestionResult.length == 0) {
                await connection.rollback();
                return error422("Question Not Found", res);
            }
            if (isQuestionResult[0].section == 'self') {
                selfCount++;
                if (value && value != 0) {
                    if(value) selfTotal = selfTotal+parseInt(value)
                    selfValueCount++
                }
            }
            if (isQuestionResult[0].section == 'manager') {
                managerCount++;
                if (value && value != 0) {
                    if(value) managerTotal = managerTotal+parseInt(value)
                    managerValueCount++
                }
            }
            //is exist Appraisal Answer
            let isAppraisalAnswerQuery = "SELECT * FROM appraisal_answers WHERE appraisal_question_id = ? AND employee_id = ? ";
            let isAppraisalAnswerResult = await pool.query(isAppraisalAnswerQuery, [appraisal_question_id, employee_id]);
            if (isAppraisalAnswerResult[0].length > 0) {
                await connection.rollback();
                return error422("Appraisal Answer already exists.", res);
            }
        }
        if (status == 'Self Submitted') {
            if (selfCount != selfValueCount) {
                await connection.rollback();
                return error422("Sorry question answer of self is required.", res);
            }
        } else if (status == 'Manager Reviewed') {
            if (selfCount != selfValueCount || managerCount != managerValueCount) {
                await connection.rollback();
                return error422("Sorry question answer of manager is required.", res);
            }
        }
        const maxScore = total_question * 5;
        
        const selfPercent = (selfTotal / maxScore) * 100;
        const managerPercent = (managerTotal / maxScore) * 100;
        
        const finalScore = (selfPercent * 0.4) + (managerPercent * 0.6);
        
        console.log(selfCount,selfValueCount, selfTotal);
        console.log(managerCount,managerValueCount, managerTotal);
        console.log(finalScore)
        // Bulk insert
        const values = appraisalAnswerDetails.map(item => [item.appraisal_question_id, item.value, employee_id, manager_id]);
        await connection.query(`INSERT INTO appraisal_answers (appraisal_question_id, value, employee_id, manager_id )VALUES ?`, [values]);
        //update appraisal cycle employee update
        let updateQuery = "UPDATE appraisal_cycles_employees SET status = ? WHERE appraisal_cycles_employee_id = ?";
        await connection.query(updateQuery, [status, isAppraisalCycleEmployeeResult[0].appraisal_cycles_employee_id])
        // await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Appraisal Answer submitted successfully."
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
    let { page, perPage, key, appraisal_cycle_id } = req.query;
    let connection = await pool.getConnection();
    try {
        let getQuery = `SELECT aa.*, aq.question_text, aq.type, aq.section, aq.appraisal_cycle_id, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name 
        FROM appraisal_answers aa 
        LEFT JOIN appraisal_questions aq
        ON aq.appraisal_question_id = aa.appraisal_question_id
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = aq.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = aa.employee_id
        WHERE 1 `;
        let countQuery = `SELECT COUNT(*) AS total 
        FROM appraisal_answers aa 
        LEFT JOIN appraisal_questions aq
        ON aq.appraisal_question_id = aa.appraisal_question_id
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = aq.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = aa.employee_id
        WHERE 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(aq.question_text) LIKE '%${lowercaseKey}%' || LOWER(aa.value) LIKE '%${lowercaseKey}%' || LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' ) `;
            countQuery += ` AND (LOWER(aq.question_text) LIKE '%${lowercaseKey}%' || LOWER(aa.value) LIKE '%${lowercaseKey}%' || LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' )  `;
        }
        if (appraisal_cycle_id) {
            getQuery += ` AND aq.appraisal_cycle_id = '${appraisal_cycle_id}'`;
            countQuery += `  AND aq.appraisal_cycle_id = '${appraisal_cycle_id}'`;
        }
        getQuery += ` ORDER BY aa.created_at DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Appraisal Answers retrived successfully",
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

//Update Appraisal Answer
const updateAppraisalAnswer = async (req, res) => {
    //validation run
    await Promise.all([
        body('appraisal_cycle_id').notEmpty().withMessage("Appraisal cycle id is required").run(req),
        body('employee_id').notEmpty().withMessage("Employee id is required").run(req),
        body('manager_id').notEmpty().withMessage("Manager id is required").run(req),
        body('status').notEmpty().withMessage("Status is required").isIn(['Pending', 'Self Submitted', 'Manager Reviewed', 'Finalized']).withMessage("Invalid status value").run(req),
        body('appraisalAnswerDetails').isArray({ min: 1 }).withMessage("Appraisal Answer Details must be a non-empty array").run(req),
        body('appraisalAnswerDetails.*.appraisal_question_id').notEmpty().withMessage("Appraisal question is required").isInt().run(req),
    ])
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const appraisal_cycle_id = req.body.appraisal_cycle_id
    const employee_id = req.body.employee_id;
    const manager_id = req.body.manager_id;
    const status = req.body.status;
    const appraisalAnswerDetails = req.body.appraisalAnswerDetails;
    let selfCount = 0, selfValueCount = 0, managerCount = 0, managerValueCount = 0

    const seen = new Set();
    for (let item of appraisalAnswerDetails) {
        const key = `${item.appraisal_question_id}`;
        if (seen.has(key)) {
            return error422("Duplicate question found in request.", res);
        }
        seen.add(key);
    }

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        //is appraisal cycles employee 
        let isAppraisalCycleEmloyeeQuery = "SELECT * FROM appraisal_cycles_employees WHERE employee_id = ? AND appraisal_cycle_id = ?"
        let [isAppraisalCycleEmployeeResult] = await connection.query(isAppraisalCycleEmloyeeQuery, [employee_id, appraisal_cycle_id])
        if (isAppraisalCycleEmployeeResult.length == 0) {
            await connection.rollback();
            return error422("Appraisal cycle emloyee is not found.", res);
        }

        for (let i = 0; i < appraisalAnswerDetails.length; i++) {
            const element = appraisalAnswerDetails[i];
            const appraisal_answer_id = element.appraisal_answer_id;
            const appraisal_question_id = element.appraisal_question_id;
            const value = element.value;
            // Check if appraisal question id exist
            const [appraisalQuestions] = await connection.query(`SELECT * FROM appraisal_questions WHERE appraisal_question_id = ?`, [appraisal_question_id]);
            if (appraisalQuestions.length == 0) {
                await connection.rollback()
                return error422("Question Not Found", res);
            }
            if (appraisalQuestions[0].section == 'self') {
                selfCount++; if (value && value != 0) selfValueCount++
            }
            if (appraisalQuestions[0].section == 'manager') {
                managerCount++; if (value && value != 0) managerValueCount++
            }
            if (appraisal_answer_id) {
                //appraisal question already exist
                let isExistingQuery = `SELECT appraisal_question_id FROM appraisal_answers WHERE appraisal_question_id =? AND employee_id =? AND appraisal_answer_id !=?`
                const [existing] = await connection.query(isExistingQuery, [appraisal_question_id, employee_id, appraisal_answer_id]);
                if (existing.length > 0) {
                    await connection.rollback()
                    return error422("Appraisal Answer already exists.", res);
                }
                // Update record with new data
                const updateQuery = `
                UPDATE appraisal_answers
                SET appraisal_question_id = ?, value = ?, employee_id = ?
                WHERE appraisal_answer_id = ?
            `;
                await connection.query(updateQuery, [appraisal_question_id, value, employee_id, appraisal_answer_id]);
            } else {
                //appraisal answer already exist
                let isExistingQuery = `SELECT appraisal_answer_id FROM appraisal_answers WHERE appraisal_question_id =? AND employee_id =? `
                const [existing] = await connection.query(isExistingQuery, [appraisal_question_id, employee_id]);
                if (existing.length > 0) {
                    await connection.rollback()
                    return error422("Appraisal Answer already exists.", res);
                }
                let insertQuery = "INSERT INTO appraisal_answers (appraisal_question_id, value, employee_id, manager_id)VALUES (?, ?, ?, ?)"
                await connection.query(insertQuery, [appraisal_question_id, value, employee_id, manager_id]);
            }

        }
        if (status == 'Self Submitted') {
            if (selfCount != selfValueCount) {
                await connection.rollback();
                return error422("Sorry question answer of self is required.", res);
            }
        } else if (status == 'Manager Reviewed') {
            if (selfCount != selfValueCount || managerCount != managerValueCount) {
                await connection.rollback();
                return error422("Sorry question answer of manager is required.", res);
            }
        }
        //update appraisal cycle employee update
        let updateQuery = "UPDATE appraisal_cycles_employees SET status = ? WHERE appraisal_cycles_employee_id = ?";
        await connection.query(updateQuery, [status, isAppraisalCycleEmployeeResult[0].appraisal_cycles_employee_id])
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Appraisal Question updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//download Appraisal answer
const getAppraisalAnswerDownload = async (req, res) => {
    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getQuery = ` SELECT aa.*, aq.question_text, aq.type, aq.section, aq.appraisal_cycle_id, ac.cycle_name, ac.start_date, ac.end_date, e.first_name, e.last_name 
        FROM appraisal_answers aa 
        LEFT JOIN appraisal_questions aq
        ON aq.appraisal_question_id = aa.appraisal_question_id
        LEFT JOIN appraisal_cycles ac
        ON ac.appraisal_cycle_id = aq.appraisal_cycle_id
        LEFT JOIN employee e
        ON e.employee_id = aa.created_by
        WHERE 1  `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(aq.question_text) LIKE '%${lowercaseKey}%' || LOWER(aa.value) LIKE '%${lowercaseKey}%' || LOWER(ac.cycle_name) LIKE '%${lowercaseKey}%' ) `;
        }
        if (appraisal_cycle_id) {
            getQuery += ` AND aq.appraisal_cycle_id = '${appraisal_cycle_id}'`;
        }
        getQuery += ` ORDER BY aa.created_at DESC `;

        let result = await connection.query(getQuery);
        let appraisalQuestion = result[0];

        if (appraisalQuestion.length === 0) {
            return error422("No data found.", res);
        }

        appraisalQuestion = appraisalQuestion.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.created_at,
            "Question": item.question_text,
            "Type": item.type,
            "Section": item.section,
            "Value": item.value,
            "Answer By": item.first_name + ' ' + item.last_name,
            "Status": item.status,
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(appraisalQuestion);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "AppraisalAnswerInfo");

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
    createAppraisalAnswer,
    getAppraisalAnswers,
    updateAppraisalAnswer,
    getAppraisalAnswerDownload
}