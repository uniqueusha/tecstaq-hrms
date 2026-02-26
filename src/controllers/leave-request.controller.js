const pool = require('../common/db');
const fs = require('fs');
const path = require('path');
const nodemailer = require("nodemailer");
const xlsx = require("xlsx");
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

const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
        user: "support@tecstaq.com",
        pass: "HelpMe@1212#$",
    },
    tls: {
        rejectUnauthorized: false,
    },
 });
const createLeaveRequest = async (req, res) => {
    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const leave_type_id = req.body.leave_type_id ? req.body.leave_type_id : null;
    const start_date = req.body.start_date ? req.body.start_date : null;
    const end_date = req.body.end_date ? req.body.end_date : null;
    const total_days = req.body.total_days ? req.body.total_days : null;
    const reason = req.body.reason ? req.body.reason : null;
    const approver_id = req.body.approver_id ? req.body.approver_id : null;
    const leave_details = req.body.leave_details ? req.body.leave_details : [];

    if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!leave_type_id) {
        return error422("Leave type is required.", res);
    } else if (!start_date) {
        return error422("Start date is required.", res);
    } else if (!end_date) {
        return error422("End date is required.", res);
    } else if (!total_days) {
        return error422("Total days is required.", res);
    } else if (!reason) {
        return error422("Reason is required.", res);
    } else if (!approver_id) {
        return error422("approver_id is required.", res);
    } else if (!leave_details) {
        return error422("Leave Details is required.", res);
    }

    const connection = await pool.getConnection();
    try {
        //is leave type
        let isLeaveTypeQuery = "SELECT * FROM leave_type_master WHERE leave_type_master_id = ?";
        let [isLeaveTypeResult] = await connection.query(isLeaveTypeQuery, [leave_type_id])
        let leave_type = isLeaveTypeResult[0];
        if (!leave_type) {
            return error422("Leave Type not found.", res)
        }
        if (parseFloat(leave_type.number_of_days) < parseFloat(total_days)) {
            return error422("Leave limit is over.", res);
        }
        let current_year = new Date().getFullYear();
        //is leave balance
        let isLeaveBalanceQuery = "SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ? AND year = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leave_type_id, employee_id, current_year]);
        let leaveBalance = isLeaveBalanceResult[0];
        if (leaveBalance) {
            if (parseFloat(leaveBalance.remaining_days) < parseFloat(total_days)) {
                return error422("Your leave limit is over.", res);
            }
        }

        //insert into leave request
        let leaveRequestQuery = " INSERT INTO leave_request (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id) VALUES (?,?,?,?,?,?,?)";
        let leaveRequest = await connection.query(leaveRequestQuery, [employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id])
        const leave_request_id = leaveRequest[0].insertId;
        if (leave_details) {
            for (let index = 0; index < leave_details.length; index++) {
                const element = leave_details[index];
                let leave_date = element.leave_date;
                let type = element.type;
                let leaveFooterQuery = "INSERT INTO leave_request_footer (leave_request_id, leave_date, type) VALUES (?, ?, ?)";
                await connection.query(leaveFooterQuery, [leave_request_id, leave_date, type])

            }
        }
        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery, [leave_request_id, approver_id, "Pending", reason])

        await connection.commit();
        const leaveType = isLeaveTypeResult[0].leave_type;

        let nameQuery = "SELECT CONCAT(title, ' ', first_name, ' ', last_name) AS full_name, email, employee_code, reporting_manager_id FROM employee WHERE employee_id = ?";
        let [nameResult] = await connection.query(nameQuery, [employee_id])
        let full_name = nameResult[0].full_name;
        let email_id = nameResult[0].email;
        let employee_code = nameResult[0].employee_code;
        let reporting_manager_id = nameResult[0].reporting_manager_id;
        
        let reportManagerEmailQuery = `SELECT * FROM users WHERE user_id = ?`;
        let [reportManagerEmailValue] = await connection.query(reportManagerEmailQuery, [reporting_manager_id]);
        let email = reportManagerEmailValue[0].email_id;
        
        const employeeMessage  = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to HRMS</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
        <h2 style="text-transform: capitalize;">Dear ${full_name},</h2>
        </p>A new leave request has been submitted and is pending for approval.</p>
        </p>Employee Details:</p>
        <p>Employee ID : ${employee_code}</p>
        <p>Leave Type : ${leaveType}</p>
        <p>Start Date: ${start_date}</P>
        <p>End Date: ${end_date}</p>
        <p>Total Days: ${total_days}</p>
        <p>Reason: ${reason}</p>
        <p>Status: Pending</p>
        <p>Kindly review the leave request and take the necessary action at your earliest convenience.</p>
        <p>Please log in to the system to approve or reject the request.</p>
        <p>Thank you.</p>
          <p>Best regards,</p>
          <p><strong>Tecstaq HRMS</strong></p>
        </div>
        </body>
        </html>`;

        let hrQuery = `SELECT * FROM users WHERE role = "HR"`;
        let [hrResult] = await connection.query(hrQuery);
        
        const hrMessage  = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to HRMS</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
        <h2 style="text-transform: capitalize;">Dear HR,</h2>
        </p>A leave request from Employee ID ${employee_code} for ${start_date} to ${end_date} (${total_days} days) has been submitted and is awaiting your approval.</p>
        <p>Please review and take the necessary action.</p>
        <p>Thank you.</p>
        </div>
        </body>
        </html>`;

         // Prepare the email message options.
        const employeeMailOptions  = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: email_id,
            // to: [created_email_id, email_id, customer_email_id].filter(Boolean), 
            cc : reportManagerEmailValue.map(item => item.email_id),
            subject: `Leave Request created Successfully`,
            html: employeeMessage,
        };
        const hrMailOptions  = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: hrResult.map(item => item.email_id),
            // to: [created_email_id, email_id, customer_email_id].filter(Boolean), 
            // cc : technicianEmails,
            
            subject: `Leave Request created Successfully`,
            html: hrMessage,
        };

        await transporter.sendMail(employeeMailOptions);
        await transporter.sendMail(hrMailOptions);
        return res.status(200).json({
            status: 200,
            message: "Leave Request created Successfully"
        })
    } catch (error) {
        if (connection) await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) await connection.release()
    }
}
// get leave requests...
const getLeaveRequests = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id, approver_id, leave_type_id,status } = req.query;

    if (status) {
        if (status!="Pending"&&status!="Approved"&&status!="Rejected"&&status!="Cancelled") {
        return error422("Leave status is Invalid.", res);
    } 
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name,
        lt.leave_type_name 
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
            countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
        }
        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (employee_id) {
            getQuery += ` AND lq.employee_id = ${employee_id}`;
            countQuery += `  AND lq.employee_id = ${employee_id}`;
        }
        if (approver_id) {
            getQuery += ` AND lq.approver_id = ${approver_id}`;
            countQuery += `  AND lq.approver_id = ${approver_id}`;
        }
        if (leave_type_id) {
            getQuery += ` AND lq.leave_type_id = ${leave_type_id}`;
            countQuery += `  AND lq.leave_type_id = ${leave_type_id}`;
        }
        if (status) {
            getQuery += ` AND lq.status = '${status}'`;
            countQuery += `  AND lq.status = '${status}'`;
        }
        getQuery += " ORDER BY lq.applied_date DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const leaveRequests = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave Requests retrieved successfully",
            data: leaveRequests,
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
//get leave request..
const getLeaveRequest = async (req, res) => {
    const leave_request_id = parseInt(req.params.id)
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name,
        lt.leave_type_name, lt.leave_type_code 
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery, [leave_request_id]);
        let leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
        let leaveRequestFooterQuery = "SELECT * FROM leave_request_footer WHERE leave_request_id =?"
        let [leaveRequestFooterResult] = await connection.query(leaveRequestFooterQuery, [leave_request_id]);
        leaveRequest['leave_details'] = leaveRequestFooterResult
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave Request retrieved successfully",
            data: leaveRequest,
        };
        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const updateLeaveRequest = async (req, res) => {
    const leave_request_id = parseInt(req.params.id);
    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const leave_type_id = req.body.leave_type_id ? req.body.leave_type_id : null;
    const start_date = req.body.start_date ? req.body.start_date : null;
    const end_date = req.body.end_date ? req.body.end_date : null;
    const total_days = req.body.total_days ? req.body.total_days : null;
    const reason = req.body.reason ? req.body.reason : null;
    const approver_id = req.body.approver_id ? req.body.approver_id : null;
    const leave_details = req.body.leave_details ? req.body.leave_details : [];

    if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!leave_type_id) {
        return error422("Leave type is required.", res);
    } else if (!start_date) {
        return error422("Start date is required.", res);
    } else if (!end_date) {
        return error422("End date is required.", res);
    } else if (!total_days) {
        return error422("Total days is required.", res);
    } else if (!reason) {
        return error422("Reason is required.", res);
    } else if (!approver_id) {
        return error422("approver_id is required.", res);
    } else if (!leave_details) {
        return error422("Leave Details is required.", res);
    }

    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, lt.number_of_days, lt.leave_type_name FROM leave_request lq 
       LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery, [leave_request_id]);
        const leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
        if (leaveRequest.status != 'Pending') {
            return error422('Sorry! ,Leave request is not Pending.', res)
        }
        //is leave type
        let isLeaveTypeQuery = "SELECT * FROM leave_type_master WHERE leave_type_master_id = ?";
        let [isLeaveTypeResult] = await connection.query(isLeaveTypeQuery, [leave_type_id])
        let leave_type = isLeaveTypeResult[0];
        if (!leave_type) {
            return error422("Leave Type not found.", res)
        }
        if (parseFloat(leave_type.number_of_days) < parseFloat(total_days)) {
            return error422("Leave limit is over.", res);
        }
        let current_year = new Date().getFullYear();
        //is leave balance
        let isLeaveBalanceQuery = "SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ? AND year = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leave_type_id, employee_id, current_year]);
        let leaveBalance = isLeaveBalanceResult[0];
        if (leaveBalance) {
            if (parseFloat(leaveBalance.remaining_days) < parseFloat(total_days)) {
                return error422("Your leave limit is over.", res);
            }
        }

        //update leave request
        let updateLeaveRequestQuery = `UPDATE leave_request 
        SET employee_id = ?, leave_type_id = ?, start_date =?, 
        end_date = ?, total_days = ?, reason = ?, approver_id = ? 
        WHERE leave_request_id = ?`;
        let leaveRequestResult = await connection.query(updateLeaveRequestQuery, [employee_id, leave_type_id, start_date, end_date,
            total_days, reason, approver_id, leave_request_id]);
        let deleteLeaveRequestFooterQuery = 'DELETE FROM leave_request_footer WHERE leave_request_id = ?'
        await connection.query(deleteLeaveRequestFooterQuery, [leave_request_id]);
        if (leave_details) {
            for (let index = 0; index < leave_details.length; index++) {
                const element = leave_details[index];
                let leave_request_footer_id = element.leave_request_footer_id;
                let leave_date = element.leave_date; leave_request_footer_id
                let type = element.type;
                let leaveFooterQuery = "INSERT INTO leave_request_footer (leave_request_id, leave_date, type) VALUES (?, ?, ?)";
                await connection.query(leaveFooterQuery, [leave_request_id, leave_date, type])
            }
        }

        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery, [leave_request_id, leaveRequest.approver_id, "Pending", reason])

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Leave Request Updated successfully",
        });

    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const deleteLeaveRequestFooter = async (req, res) => {
    let leave_request_footer_id = parseInt(req.params.id);
    let isLeaveRequestFooterQuery = 'SELECT * FROM leave_request_footer WHERE leave_request_footer_id = ?';
    let [isLeaveRequestFooterResult] = await pool.query(isLeaveRequestFooterQuery, [leave_request_footer_id])
    if (!isLeaveRequestFooterResult.length > 0) {
        return error422("Leave request footer is Not Found", res);
    }
    let connection = await pool.getConnection()
    try {
        //delete leave request footer 
        let deleteLeaveRequestFooterQuery = 'DELETE FROM leave_request_footer WHERE leave_request_footer_id = ?'
        await connection.query(deleteLeaveRequestFooterQuery, [leave_request_footer_id]);

        connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Leave request footer delete successfully."
        })
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Approve Leave Request
const approveLeaveRequest = async (req, res) => {
    const leave_request_id = parseInt(req.params.id);
    const status = req.query.status ? req.query.status.trim() : '';
    const remarks = req.body.remarks ? req.body.remarks.trim() : "";
    // 'Pending','Approved','Rejected','Cancelled' 
    if (status != 'Pending' && status != 'Approved' && status != 'Rejected' && status != 'Cancelled') {
        return error422("Status is invalid.", res);
    }

    let connection = await pool.getConnection();
    try {
        let getQuery = `SELECT lq.*, lt.number_of_days, lt.leave_type_name FROM leave_request lq 
       LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery, [leave_request_id]);
        const leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
        if (status == leaveRequest.status) {
            return error422("This leave request is already " + status, res)
        }
        let current_year = new Date().getFullYear();
        //is leave balance
        let isLeaveBalanceQuery = "SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ? AND year = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leaveRequest.leave_type_id, leaveRequest.employee_id, current_year]);
        let leaveBalance = isLeaveBalanceResult[0];
        let used_days = 0
        if (leaveBalance) {
            used_days = leaveBalance.used_days
            if (parseFloat(leaveBalance.remaining_days) < parseFloat(leaveRequest.total_days)) {
                return error422("Your leave limit is over.", res);
            }
        }

        let allocated_days = leaveRequest.number_of_days
        used_days = parseFloat(used_days) + parseFloat(leaveRequest.total_days);
        let remaining_days = allocated_days - used_days
        if (status == 'Approved') { 
            if (leaveBalance) {
                let updateLeaveBalanceQuery = `UPDATE leave_balance 
            SET allocated_days = ?, used_days = ?, remaining_days = ? WHERE leave_balance_id = ?`
                let [updateLeaveBalanceResult] = await connection.query(updateLeaveBalanceQuery, [allocated_days, used_days, remaining_days, leaveBalance.leave_balance_id])
            } else {
                let insertLeaveBalanceQuery = "INSERT INTO leave_balance (employee_id, leave_type_id, allocated_days, used_days, remaining_days, year ) VALUES (?,?,?,?,?,?)";
                await connection.query(insertLeaveBalanceQuery, [leaveRequest.employee_id, leaveRequest.leave_type_id, allocated_days, used_days, remaining_days, current_year])
            }

        }
        let updateLeaveRequestQuery = `UPDATE leave_request
        SET status = ?, approved_date = ? WHERE leave_request_id = ?`;
        let [updateLeaveBalanceResult] = await connection.query(updateLeaveRequestQuery, [status, new Date(), leave_request_id]);

        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery, [leave_request_id, leaveRequest.approver_id, status, remarks])

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Leave Request '${status}' successfully`,
        });
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//get employee leave type list
const getEmployeeLeaveTypes = async (req, res) => {
    const employee_id = parseInt(req.params.id);
    if (!employee_id) {
        return error422("Employee id is required.", res);
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const getLeaveTypeQuery = `
      SELECT *, IFNULL(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) AS total_taken,
          (ltm.number_of_days - IFNULL(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0)) AS remaining_leaves
      FROM leave_type_master ltm
      LEFT JOIN leave_request lr 
          ON ltm.leave_type_master_id = lr.leave_type_id
          AND lr.employee_id = ?
      GROUP BY 
          ltm.leave_type_master_id, 
          ltm.policy_id, 
          ltm.company_id, 
          ltm.leave_type_name, 
          ltm.leave_type_code, 
          ltm.number_of_days, 
          ltm.description, 
          ltm.status
      ORDER BY ltm.leave_type_name;
    `;

        const [leaveTypeResult] = await connection.query(getLeaveTypeQuery, [employee_id]);
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee leave type list with remaining count retrieved successfully.",
            data: leaveTypeResult
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//get leave balances
const getLeaveBalances = async (req, res )=>{
     const { page, perPage, key, fromDate, toDate, employee_id, leave_type_id } = req.query;

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lb.*, e.first_name, e.last_name,
        lt.leave_type_name 
        FROM leave_balance lb
        LEFT JOIN employee e ON e.employee_id = lb.employee_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lb.leave_type_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM leave_balance lb
        LEFT JOIN employee e ON e.employee_id = lb.employee_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lb.leave_type_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
            countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
        }
        // from date and to date
        // if (fromDate && toDate) {
        //     getQuery += ` AND DATE(lb.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        //     countQuery += ` AND DATE(lb.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        // }

        if (employee_id) {
            getQuery += ` AND lb.employee_id = ${employee_id}`;
            countQuery += `  AND lb.employee_id = ${employee_id}`;
        }

        if (leave_type_id) {
            getQuery += ` AND lb.leave_type_id = ${leave_type_id}`;
            countQuery += `  AND lb.leave_type_id = ${leave_type_id}`;
        }

        // getQuery += " ORDER BY lb.applied_date DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const leaveRequests = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave Requests retrieved successfully",
            data: leaveRequests,
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

module.exports = {
    createLeaveRequest,
    getLeaveRequests,
    getLeaveRequest,
    updateLeaveRequest,
    approveLeaveRequest,
    deleteLeaveRequestFooter,
    getEmployeeLeaveTypes,
    getLeaveBalances
}