const pool = require('../../db');
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
        let [isLeaveTypeResult] = await connection.query(isLeaveTypeQuery, [leave_type_id]);
        let leaveType = isLeaveTypeResult[0].leave_type_name;

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

        let nameQuery = "SELECT CONCAT(title, ' ', first_name, ' ', last_name) AS full_name, email, employee_code, reporting_manager_id FROM employee WHERE employee_id = ?";
        let [nameResult] = await connection.query(nameQuery, [employee_id])
        let full_name = nameResult[0].full_name;
        let email_id = nameResult[0].email;
        let employee_code = nameResult[0].employee_code;
        let reporting_manager_id = nameResult[0].reporting_manager_id;
        
        let reportManagerEmailQuery = `SELECT * FROM employee WHERE employee_id = ?`;
        let [reportManagerEmailValue] = await connection.query(reportManagerEmailQuery, [reporting_manager_id]);
        
        let email = reportManagerEmailValue[0].email_id;
        
        const employeeMessage  = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to HRMS</title>
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#333; line-height:1.6;">

        <div>
        <h2 style="text-transform: capitalize;">Dear ${full_name},</h2>
        </p>A new leave request has been submitted and is pending for approval.</p>
        </p><strong>Employee Details:</strong></p>
        <ul>
        <li>Employee ID : ${employee_code}</li>
        <li>Leave Type : ${leaveType}</li>
        <li>Start Date: ${start_date}</li>
        <li>End Date: ${end_date}</li>
        <li>Total Days: ${total_days}</li>
        <li>Reason: ${reason}</li>
        <li>Status: Pending</li>
        </ul>
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

        const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formattedStartDate = formatDate(start_date);
const formattedEndDate = formatDate(end_date);
        
        // const hrMessage  = `
        // <!DOCTYPE html>
        // <html lang="en">
        // <head>
        //   <meta charset="UTF-8">
        //   <title>Welcome to HRMS</title>
        //   <style>
        //       div{
        //       font-family: Arial, sans-serif; 
        //        margin: 0px;
        //         padding: 0px;
        //         color:black;
        //       }
        //   </style>
        // </head>
        // <body>
        // <div>
        // <h2 style="text-transform: capitalize;">Dear HR,</h2>
        // </p>A leave request from Employee ID <strong>${employee_code}</strong> for <strong>${start_date}</strong> to <strong>${end_date}</strong> (<strong>${total_days}</strong> days) has been submitted and is awaiting your approval.</p>
        // <p>Please review and take the necessary action.</p>
        // <p>Thank you.</p>
        // </div>
        // </body>
        // </html>`;
        
//         const hrMessageold = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Leave Request</title>
// </head>
// <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

//     <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:20px 0;">
//         <tr>
//             <td align="center">
//                 <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4; border-radius:8px; overflow:hidden;">
                    
//                     <!-- Header -->
//                     <tr>
//                         <td align="center" style="padding:20px;">
//                             <img src="http://localhost:3000/images/Empflowhr_Logo@2x.png" alt="Company Logo" width="180" />
//                         </td>
//                     </tr>

//                     <!-- Content Box -->
//                     <tr>
//                         <td align="center" style="padding:20px; background:#f4f4f4; border-radius:10px;">
//                             <table width="650px" cellpadding="0" cellspacing="0" border="0" 
//                                 style="border:3px solid #ddd; padding:20px; background:#F3F6FF; border-radius:10px; color:#fff;">
                                
//                                 <tr>
//                                     <td align="center">
//                                         <h2 style="margin:0; color:#333;">
//                                             Leave request has been received
//                                         </h2>
//                                         <p style="font-size:16px; color:#333; margin-top:10px;">
//                                             The following leave has been requested by
//                                         </p>
//                                         <p style="margin:0; color:#333">
//                                             <strong>${full_name}</strong>
//                                         </p>
//                                     </td>
//                                 </tr>

//                                 <tr>
//                                     <td style="padding-top:20px;">
//                                         <table width="100%" cellpadding="5" cellspacing="0" border="0" style="color:#333;">
//                                             <tr>
//                                                 <td width="60%" valign="top">
//                                                     <strong>Dates:</strong><br>
//                                                     ${formattedStartDate} To ${formattedEndDate}
//                                                 </td>
//                                                 <td width="50%" valign="top">
//                                                     <strong>Leave Type:</strong><br>
//                                                     ${leaveType}
//                                                 </td>
//                                             </tr>
//                                             <tr>
//                                                 <td valign="top">
//                                                     <strong>Total Days:</strong><br>
//                                                     ${total_days}
//                                                 </td>
//                                             </tr>
//                                             <tr>
//                                                 <td colspan="2" style="padding-top:10px;">
//                                                     <strong>Reason:</strong><br>
//                                                     ${reason}
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>

//                 </table>
//             </td>
//         </tr>
//     </table>

// </body>
// </html>
// `;
const hrMessage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave Request</title>
</head>
<body style="margin:0; padding:20; background-color:#f4f4f4; font-family: Arial, sans-serif; ">

    <table align="center" width="70%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:20px 0;border: 1px solid white;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4; border-radius:8px; overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding:20px;">
                            <img src="http://localhost:3000/assets/images/Empflowhr_Logo.png" alt="Company Logo" width="180" />
                        </td>
                    </tr>

                    <!-- Content Box -->
                    <tr style="background: linear-gradient(264.29deg, #00B8F1 -24.89%, #06A5E5 5.18%, #1870C5 83.72%, #1D61BC 111.84%); padding:20px;">
                        <td align="center" style="padding:30px;">
                            <h2 style="margin:0; color:#fff;">
                                Leave request has been received !
                            </h2>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h3 align="left" style="margin:0; color:#333; padding:10px 0 10px 40px;">
                                Hello,
                            </h3>
                            <p style="font-size:16px; color:#333; margin-left:80px; margin-top:0px;"> 
                                Your leave request has been successfully submitted.
                            </p>
                        </td>
                    </tr>
                   
                        <tr>
                            <td style="padding:40px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F9FF;border-radius:10px">
                                    <tr>
                                        <td align="center" width="70" style="padding:20px;">
                                             <img src="http://localhost:3000/assets/images/user_logo.png" alt="user Logo" width="50" />  
                                        </td>
                                        <td >
                                            <div style="padding:0 0 10px 10px; border-left: 1px solid #D0E3FF">
                                                <p style="font-size:14px;">Requested by</p>
                                                <p style="color:#333"><strong>${full_name}</strong></p>
                                            </div>
                                        </td>
                                        
                                    </tr>   
                                </table>
                            </td>
                        </tr>
        
                         
                        <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <h3 style="color:#333; font-size: 16px; margin-bottom: 15px;">Leave Details</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 15px; line-height: 1.8;">
                                <tr>
                                    <td width="140" style="color:#333;">Dates</td>
                                    <td style="color:#888; font-weight: 500;">${formattedStartDate} to ${formattedEndDate}</td>
                                </tr>
                                <tr>
                                    <td style="color:#333;">Leave type</td>
                                    <td style="color:#888; font-weight: 500;">${leaveType}</td>
                                </tr>
                                <tr>
                                    <td style="color:#333;">Total days</td>
                                    <td style="color:#888; font-weight: 500;">${total_days} Days</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                               
                    <tr>
                        <td style="padding:10px 40px 20px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F9FF;border-radius:10px">
                                <tr>
                                    <td width="50" style="padding: 20px;">
                                        <img src="http://localhost:3000/assets/images/cot_icon.png"" alt="user Logo" width="50"; >
                                    </td>
                                    <td>
                                        <div>
                                            <p style="font-size:14px;color:#4169E1">Reason For Leave</p>
                                            <p style="color:#333">${reason}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                        <td align="center" style="font-size:12px;">
                            <p>This is automated message,please do not reply to this email.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
`;

      

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
        return res.status(200).send(hrMessage);
        // await transporter.sendMail(employeeMailOptions);
        // await transporter.sendMail(hrMailOptions);
        // return res.status(200).json({
        //     status: 200,
        //     message: "Leave Request created Successfully"
        // })
    } catch (error) {
        console.log(error);
        
        if (connection) await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) await connection.release()
    }
}
// get leave requests...
const getLeaveRequests = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, shift_type_header_id, employee_id, approver_id, leave_type_id, departments_id, status } = req.query;

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
        lt.leave_type_name, e.departments_id, e.company_id, es.shift_type_header_id, c.name AS company_name, d.department_name, sth.shift_type_name
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN departments d ON d.departments_id = e.departments_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN departments d ON d.departments_id = e.departments_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id

        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.total_days) LIKE '%${lowercaseKey}%') )`;
            countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.total_days) LIKE '%${lowercaseKey}%') )`;
        }
        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (departments_id) {
            getQuery += ` AND e.departments_id = ${departments_id}`;
            countQuery += `  AND e.departments_id = ${departments_id}`;
        }

        if (company_id) {
            getQuery += ` AND e.company_id = ${company_id}`;
            countQuery += `  AND e.company_id = ${company_id}`;
        }

        if (employee_id) {
            getQuery += ` AND lq.employee_id = ${employee_id}`;
            countQuery += `  AND lq.employee_id = ${employee_id}`;
        }
        if (approver_id) {
            getQuery += ` AND lq.approver_id = ${approver_id}`;
            countQuery += `  AND lq.approver_id = ${approver_id}`;
        }
        if (shift_type_header_id) {
            getQuery += ` AND es.shift_type_header_id = ${shift_type_header_id}`;
            countQuery += `  AND es.shift_type_header_id = ${shift_type_header_id}`;
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
        let leaveType = isLeaveTypeResult[0].leave_type_name;

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
            cc : reportManagerEmailValue.map(item => item.email_id),
            subject: `Leave Request created Successfully`,
            html: employeeMessage,
        };
        const hrMailOptions  = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: hrResult.map(item => item.email_id),
            subject: `Leave Request created Successfully`,
            html: hrMessage,
        };
        
        await transporter.sendMail(employeeMailOptions);
        await transporter.sendMail(hrMailOptions);
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

//download leave requests
const getLeaveRequestsDownload = async (req, res) => {

    let { key, fromDate, toDate, company_id,  shift_type_header_id, employee_id, approver_id, leave_type_id, departments_id, status } = req.query;

    if (status) {
        if (status!="Pending"&&status!="Approved"&&status!="Rejected"&&status!="Cancelled") {
        return error422("Leave status is Invalid.", res);
    } 
    }

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name,
        lt.leave_type_name, e.departments_id, e.company_id, es.shift_type_header_id, c.name AS company_name, d.department_name, sth.shift_type_name
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN departments d ON d.departments_id = e.departments_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id
        WHERE 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.total_days) LIKE '%${lowercaseKey}%') )`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }
        if (departments_id) {
            getQuery += ` AND e.departments_id = ${departments_id}`;
        }
        if (company_id) {
            getQuery += ` AND e.company_id = ${company_id}`;
        }
        if (employee_id) {
            getQuery += ` AND lq.employee_id = ${employee_id}`;
        }
        if (shift_type_header_id) {
            getQuery += ` AND es.shift_type_header_id = ${shift_type_header_id}`;
        }
        if (approver_id) {
            getQuery += ` AND lq.approver_id = ${approver_id}`;
        }
        if (leave_type_id) {
            getQuery += ` AND lq.leave_type_id = ${leave_type_id}`;
        }
        if (status) {
            getQuery += ` AND lq.status = '${status}'`;
        }
        getQuery += " ORDER BY lq.applied_date DESC";

        let result = await connection.query(getQuery);
        let leaveRequests = result[0];

        if (leaveRequests.length === 0) {
            return error422("No data found.", res);
        }

        leaveRequests = leaveRequests.map((item, index) => {
            if (employee_id) {
                return {
                    "Sr No": index + 1,
                    "Leave Type": item.leave_type_name,
                    "Start Date": item.start_date,
                    "End Date": item.end_date,
                    "Days": item.total_days,
                    "Approver": `${item.approver_first_name} ${item.approver_last_name}`,
                    "Status": item.status
                };
            }
            return {
            "Sr No": index + 1,
            "Name": `${item.first_name} ${item.last_name}`,
            "Leave Type": item.leave_type_name,
            "Start Date": item.start_date,
            "End Date": item.end_date,
            "Days": item.total_days,
            "Status": item.status,
            };   
        });

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(leaveRequests);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "leaveRequestsInfo");

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
    createLeaveRequest,
    getLeaveRequests,
    getLeaveRequest,
    updateLeaveRequest,
    approveLeaveRequest,
    deleteLeaveRequestFooter,
    getEmployeeLeaveTypes,
    getLeaveBalances,
    getLeaveRequestsDownload
}