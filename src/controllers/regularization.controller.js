const pool = require('../../db')
const { body, param, validationResult } = require('express-validator');

const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
const error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}
const createRegularizationRequest = async (req, res) => {
    //validate run 
    await Promise.all([
        body('employee_id').notEmpty().withMessage("Employee id is required.").run(req),
        body('attendance_date').notEmpty().withMessage("Attendance date is required.").run(req),
        body('requested_in_time').notEmpty().withMessage("Requested in time is required.").run(req),
        body('requested_out_time').notEmpty().withMessage("Requested out time is required.").run(req),
        body('reason').notEmpty().withMessage("Reason is required.").run(req),
    ])
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const employee_id = req.body.employee_id ? req.body.employee_id :null
    const attendance_date = req.body.attendance_date ? req.body.attendance_date.trim() : '';
    const type = req.body.type ? req.body.type.trim() : '';
    const requested_in_time = req.body.requested_in_time ? req.body.requested_in_time.trim() : '';
    const requested_out_time = req.body.requested_out_time ? req.body.requested_out_time.trim() : '';
    const actual_in_time = req.body.actual_in_time ? req.body.actual_in_time.trim() : '';
    const actual_out_time = req.body.actual_out_time ? req.body.actual_out_time.trim() : '';
    const reason = req.body.reason ? req.body.reason.trim() : ''; 

    let isExistEmployeeQuery = `SELECT employee_code, CONCAT(first_name,' ',last_name) AS employee_name, employee_id, reporting_manager_id FROM employee WHERE employee_id = '${employee_id}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery);
    if (isExistEmployeeResult[0].length == 0) {
        return error422("Employee Not Found.", res)
    }
    const reporting_manager_id = isExistEmployeeResult[0][0].reporting_manager_id;
    const employee_code = isExistEmployeeResult[0][0].employee_code;
    let isExistAttendanceQuery = `SELECT in_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery, [employee_code, attendance_date]);
    if (isExistAttendanceResult[0].length > 0) {
        return error422("Employee already checked in.", res);
    }
    let isExistRegularizationQuery = `SELECT * FROM regularization_request WHERE employee_id = ? AND attendance_date = ?`;
    let isExistRegularizationResult = await pool.query(isExistRegularizationQuery, [employee_id, attendance_date]);
    if (isExistRegularizationResult[0].length > 0) {
        return error422("Employee already regularization requested.", res);
    }
    let connection
    try {
        connection = await pool.getConnection()
        const insertQuery = `INSERT INTO regularization_request (employee_id, attendance_date, type, requested_in_time, requested_out_time, actual_in_time, actual_out_time, reason, status, approver_id) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;
        await connection.query(insertQuery, [employee_id, attendance_date, type, requested_in_time, requested_out_time, actual_in_time, actual_out_time, reason, 'Pending', reporting_manager_id]);

        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Regularization request created successfully.",
        })
    } catch (error) {
        if (connection) await connection.rollback()
        return error500(error, res)
    } finally {
        if (connection) await connection.release()
    }

}
// get regularizations...
const getRegularizationRequests = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, shift_type_header_id, employee_id, approver_id, status } = req.query;

    if (status) {
        if (status != "Pending" && status != "Approved" && status != "Rejected") {
            return error422("Regularization status is Invalid.", res);
        }
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT rq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name,
        e.departments_id, e.company_id, es.shift_type_header_id, c.name AS company_name, d.department_name, sth.shift_type_name
        FROM regularization_request rq
        LEFT JOIN employee e ON e.employee_id = rq.employee_id
        LEFT JOIN employee em ON em.employee_id = rq.approver_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN departments d ON d.departments_id = e.departments_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM regularization_request rq
        LEFT JOIN employee e ON e.employee_id = rq.employee_id
        LEFT JOIN employee em ON em.employee_id = rq.approver_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN departments d ON d.departments_id = e.departments_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' )`;
            countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' )`;
        }
        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(rq.attendance_date) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(rq.attendance_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getQuery += ` AND e.company_id = ${company_id}`;
            countQuery += `  AND e.company_id = ${company_id}`;
        }

        if (employee_id) {
            getQuery += ` AND rq.employee_id = ${employee_id}`;
            countQuery += `  AND rq.employee_id = ${employee_id}`;
        }
        if (approver_id) {
            getQuery += ` AND rq.approver_id = ${approver_id}`;
            countQuery += `  AND rq.approver_id = ${approver_id}`;
        }
        if (shift_type_header_id) {
            getQuery += ` AND es.shift_type_header_id = ${shift_type_header_id}`;
            countQuery += `  AND es.shift_type_header_id = ${shift_type_header_id}`;
        }
        if (status) {
            getQuery += ` AND rq.status = '${status}'`;
            countQuery += `  AND rq.status = '${status}'`;
        }
        getQuery += " ORDER BY rq.attendance_date DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const regularizationRequests = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Regularization Requests retrieved successfully",
            data: regularizationRequests,
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
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//get regularization request..
const getRegularizationRequest = async (req, res) => {
    const regularization_id = parseInt(req.params.id)
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT rq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name        
        FROM regularization_request rq
        LEFT JOIN employee e ON e.employee_id = rq.employee_id
        LEFT JOIN employee em ON em.employee_id = rq.approver_id
        WHERE  rq.regularization_id = ?`;
        const [result] = await connection.query(getQuery, [regularization_id]);
        let regularizationRequest = result[0];
        if (!regularizationRequest) {
            return error422('Regularization Request Not Found', res)
        }
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Regularization Request retrieved successfully",
            data: regularizationRequest,
        };
        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const updateRegularizationRequest = async (req, res) => {
    //validate run 
    await Promise.all([
        param('id').notEmpty().withMessage("Regularization id is required.").run(req),
        body('employee_id').notEmpty().withMessage("Employee id is required.").run(req),
        body('attendance_date').notEmpty().withMessage("Attendance date is required.").run(req),
        body('requested_in_time').notEmpty().withMessage("Requested in time is required.").run(req),
        body('requested_out_time').notEmpty().withMessage("Requested out time is required.").run(req),
        body('reason').notEmpty().withMessage("Reason is required.").run(req),
    ])
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const regularization_id = parseInt(req.params.id);
    const employee_id = req.body.employee_id ? req.body.employee_id :null;
    const attendance_date = req.body.attendance_date ? req.body.attendance_date.trim() : '';
    const type = req.body.type ? req.body.type.trim() : '';
    const requested_in_time = req.body.requested_in_time ? req.body.requested_in_time.trim() : '';
    const requested_out_time = req.body.requested_out_time ? req.body.requested_out_time.trim() : '';
    const actual_in_time = req.body.actual_in_time ? req.body.actual_in_time.trim() : '';
    const actual_out_time = req.body.actual_out_time ? req.body.actual_out_time.trim() : '';
    const reason = req.body.reason ? req.body.reason.trim() : '';
    // Check if regularization exists
    const regularizationQuery = "SELECT * FROM regularization_request WHERE regularization_id  = ?";
    const regularizationResult = await pool.query(regularizationQuery, [regularization_id]);
    if (regularizationResult[0].length == 0) {
        return error422("Regularization Not Found.", res);
    }
    // Check if the provided regularization exists
    const existingRegularizationQuery = "SELECT * FROM regularization_request WHERE attendance_date = ? AND regularization_id !=? ";
    const existingRegularizationResult = await pool.query(existingRegularizationQuery, [attendance_date, regularization_id]);

    if (existingRegularizationResult[0].length > 0) {
        return error422("Regularization already exists.", res);
    }
    let isExistEmployeeQuery = `SELECT employee_code, CONCAT(first_name,' ',last_name) AS employee_name, employee_id, reporting_manager_id FROM employee WHERE employee_id = '${employee_id}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery);
    if (isExistEmployeeResult[0].length == 0) {
        return error422("Employee Not Found.", res)
    }
    const reporting_manager_id = isExistEmployeeResult[0][0].reporting_manager_id;
    const employee_code = isExistEmployeeResult[0][0].employee_code;
    let isExistAttendanceQuery = `SELECT in_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery, [employee_code, attendance_date]);
    if (isExistAttendanceResult[0].length > 0) {
        return error422("Employee already checked in.", res);
    }

    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();

        //update regularization request
        let updateRegularizationRequestQuery = `UPDATE regularization_request 
        SET employee_id = ?, attendance_date = ?, type =?, 
        requested_in_time = ?, requested_out_time = ?, actual_in_time = ?, actual_out_time = ?, reason = ?, approver_id = ?
        WHERE regularization_id = ?`;
        let regularizationRequestResult = await connection.query(updateRegularizationRequestQuery, [employee_id, attendance_date, type, requested_in_time, requested_out_time, actual_in_time, actual_out_time, reason, reporting_manager_id, regularization_id]);
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Regularization Request Updated successfully",
        });

    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Approve Regularization Request
const approveRegularizationRequest = async (req, res) => {
    const regularization_id = parseInt(req.params.id);
    const status = req.query.status ? req.query.status.trim() : '';
    // 'Pending','Approved','Rejected' 
    if (status != 'Pending' && status != 'Approved' && status != 'Rejected') {
        return error422("Status is invalid.", res);
    }
    let approved_at = new Date()
    // return error422(approved_at, res)
    let connection = await pool.getConnection();
    try {
        let getQuery = `SELECT rq.* FROM regularization_request rq 
        WHERE  rq.regularization_id = ?`;
        const [result] = await connection.query(getQuery, [regularization_id]);
        const regularizationRequest = result[0];
        if (!regularizationRequest) {
            return error422('Regularization Request Not Found', res)
        }
        if (status == regularizationRequest.status) {
            return error422("This Regularization request is already " + status, res)
        }
        let updateRegularizationQuery = `UPDATE regularization_request 
            SET status = ?, approved_at = ? WHERE regularization_id = ?`
        let [updateLeaveBalanceResult] = await connection.query(updateRegularizationQuery, [status, approved_at, regularization_id])
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Regularization Request '${status}' successfully`,
        });
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createRegularizationRequest,
    getRegularizationRequests,
    getRegularizationRequest,
    updateRegularizationRequest,
    approveRegularizationRequest
}