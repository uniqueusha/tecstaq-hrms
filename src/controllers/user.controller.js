const pool = require('../../db');
const bcrypt = require("bcrypt");
const xlsx = require("xlsx");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { body, param, validationResult } = require("express-validator");


const path = require('path');

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
//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}

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
const createUser = async (req, res) => {
    const employee_id = req.body.employee_id ? req.body.employee_id : '';
    const role = req.body.role ? req.body.role.trim() : '';
    const password = req.body.password ? req.body.password : '';

    if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    } else if (!password) {
        return error422("Password is required.", res);
    }

    // Check if employee exists
    const checkEmployeeQuery = "SELECT * FROM employee WHERE employee_id = ? ";
    const [checkEmployeeResult] = await pool.query(checkEmployeeQuery, [employee_id]);
    if (!checkEmployeeResult[0]) {
        return error422('Employee Not Found.', res);
    }
    let employee = checkEmployeeResult[0]
    // Check if employee in user exists
    const checkEmployeeUserQuery = "SELECT * FROM users WHERE employee_id = ? ";
    const checkEmployeeUserResult = await pool.query(checkEmployeeUserQuery, [employee_id]);
    if (checkEmployeeUserResult[0].length > 0) {
        return error422('Employee is already exists.', res);
    }
    // Attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //insert into users
        const insertUserQuery = `INSERT INTO users (first_name, last_name, email_id, mobile_number, role, employee_id) VALUES (?, ?, ?, ?, ?, ?)`;
        const insertUserValues = [employee.first_name, employee.last_name, employee.email, employee.mobile_number, role, employee_id];
        const insertUserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertUserResult[0].insertId;

        const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        //insert into Untitled
        const insertUntitledQuery = "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        const insertUntitledValues = [user_id, hash];
        const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)
        // Update the employee record with new data
        const updateQuery = `
            UPDATE employee
            SET employee_status = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateQuery, ['Active', employee_id]);

        //commit the transation
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Created User Successfully.",
        })
    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get users
const getUsers = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id } = req.query;

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT u.*, e.title, e.employee_code, c.name AS company_name
        FROM users u
        LEFT JOIN employee e ON e.employee_id = u.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        WHERE 1 AND u.role !="Management" `;

        let countQuery = `SELECT COUNT(*) AS total 
        FROM users u
        LEFT JOIN employee e ON e.employee_id = u.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        WHERE 1 AND u.role !="Management" `;


        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(u.mobile_number) LIKE '%${lowercaseKey}%')`;
            countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(u.mobile_number) LIKE '%${lowercaseKey}%')`;
        }
        //from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(u.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(u.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        // if (employee_id) {
        //     getQuery += ` AND lq.employee_id = ${employee_id}`;
        //     countQuery += `  AND lq.employee_id = ${employee_id}`;
        // }
        // if (approver_id) {
        //     getQuery += ` AND lq.approver_id = ${approver_id}`;
        //     countQuery += `  AND lq.approver_id = ${approver_id}`;
        // }
        // if (leave_type_id) {
        //     getQuery += ` AND lq.leave_type_id = ${leave_type_id}`;
        //     countQuery += `  AND lq.leave_type_id = ${leave_type_id}`;
        // }

        // getQuery += " ORDER BY lq.applied_date DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const users = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Users retrieved successfully",
            data: users,
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
// get user
const getUser = async (req, res) => {
    let user_id = parseInt(req.params.id)
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT u.*
        FROM users u
        WHERE user_id = ${user_id}`;

        const [result] = await connection.query(getQuery);
        const users = result[0];
        if (!users) {
            return error422("User Not Found", res);
        }

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "User retrieved successfully",
            data: users,
        };

        return res.status(200).json(data);
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update user
const updateUser = async (req, res) => {
    const user_id = parseInt(req.params.id);
    const employee_id = req.body.employee_id ? req.body.employee_id : '';
    const role = req.body.role ? req.body.role : '';

    if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    } else if (!user_id) {
        return error422("User id is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if user exists
        const userQuery = "SELECT * FROM users WHERE user_id  = ?";
        const userResult = await connection.query(userQuery, [user_id]);
        if (userResult[0].length == 0) {
            return error422("User Not Found.", res);
        }
        // Check if employee exists
        const checkEmployeeQuery = "SELECT * FROM employee WHERE employee_id = ? ";
        const [checkEmployeeResult] = await pool.query(checkEmployeeQuery, [employee_id]);
        if (!checkEmployeeResult[0]) {
            return error422('Employee Not Found.', res);
        }
        let employee = checkEmployeeResult[0]
        // Check if the provided employee exists
        const existingEmployeeQuery = "SELECT * FROM users WHERE employee_id = ? AND user_id !=? ";
        const existingEmployeeResult = await connection.query(existingEmployeeQuery, [employee_id, user_id]);
        if (existingEmployeeResult[0].length > 0) {
            return error422("Employee already exists.", res);
        }

        // Update the user record with new data
        const updateQuery = `
            UPDATE users
            SET first_name = ?, last_name = ?, email_id =?, mobile_number = ?, employee_id = ?, role = ?
            WHERE user_id = ?
        `;
        await connection.query(updateQuery, [employee.first_name, employee.last_name, employee.email, employee.mobile_number, employee_id, role, user_id]);
       
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "User updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//download list
const getUserDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getUserQuery = `SELECT u.*, e.title, e.employee_code, c.name
        FROM users u
        LEFT JOIN employee e ON e.employee_id = u.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        WHERE 1 AND u.role !="Management" `;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getUserQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(u.mobile_number) LIKE '%${lowercaseKey}%')`;
        }
        getUserQuery += " ORDER BY u.cts DESC";

        let result = await connection.query(getUserQuery);
        let user = result[0];
        console.log(user);
        


        if (user.length === 0) {
            return error422("No data found.", res);
        }

        user = user.map((item, index) => ({
            "Sr No": index + 1,
            "Code": item.employee_code,
            "Name": `${item.first_name} ${item.last_name}`,
            "Email": item.email_id,
            "Mobile No": item.mobile_number,
            "Company": item.name,
            "Role": item.role,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(user);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "userInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
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


//change password
const onChangePassword = async (req, res) => {
    //run validation
    await Promise.all([
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req),
        body('password').notEmpty().withMessage("Password is required.").run(req),
        body('new_password').notEmpty().withMessage("New password is requierd.").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long.")
        .matches(/[0-9]/).withMessage("Password must contain at least one number.")
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character.").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg,res);
    } 
    const email_id = req.body.email_id ? req.body.email_id.trim() : "";
    const password = req.body.password || "";
    const new_password = req.body.new_password || "";
    const new_email = req.body.new_email ? req.body.new_email.trim() : "";

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        // Check if email_id exists
        const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
        const [checkUserResult] = await connection.query(checkUserQuery, [email_id.toLowerCase()]);
        if (checkUserResult.length === 0) {
            return error422('Email id is not found.', res);
        }

        const userData = checkUserResult[0]; // Extract the first row

        // Retrieve the hashed password from the database (update column name if needed)
        const untitledQuery = 'SELECT extenstions FROM untitled WHERE user_id = ?';
        const [untitledResult] = await connection.query(untitledQuery, [userData.user_id]);

        if (untitledResult.length === 0) {
            return error422("Password not found for this user.", res);
        }

        const hash = untitledResult[0].extenstions;
        if (!hash) {
            return error422('Stored password hash is missing.', res);
        }

        const isValid = await bcrypt.compare(password, hash);
        if (!isValid) {
            return error422('Incorrect password.', res);
        }

        // Hash the new password
        const newHashedPassword = await bcrypt.hash(new_password, 10);

        // Update the user's password in the database
        const updatePasswordQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        await connection.query(updatePasswordQuery, [newHashedPassword, userData.user_id]);

        // If new email is provided, update it
        if (new_email) {
            // Check if the new email already exists
            const checkNewEmailQuery = "SELECT email_id FROM users WHERE LOWER(TRIM(email_id)) = ?";
            const [emailCheckResult] = await connection.query(checkNewEmailQuery, [new_email.toLowerCase()]);

            if (emailCheckResult.length > 0) {
                return error422("New email is already in use.", res);
            }

            // Update the email
            const updateEmailQuery = `UPDATE users SET email_id = ? WHERE user_id = ?`;
            await connection.query(updateEmailQuery, [new_email, userData.user_id]);
        }

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password updated successfully."
        });

    } catch (error) {
        await connection.rollback();
        error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//send otp 
const sendOtp = async (req, res) => {
    await Promise.all([
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const email_id = req.body.email_id;
    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);
    if (result[0].length === 0) {
        return error422('If the email is registered, an OTP will be sent.', res);
    }

    let first_name = result[0][0].first_name;

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        const otp = Math.floor(100000 + Math.random() * 900000);
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        const otpResult = await connection.query(otpQuery, [otp, email_id])

        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-hrms.com</title>
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
       <h2 style="text-transform: capitalize;">Hello ${first_name},</h2>
        <p>It seems you requested a password reset for your Tecstaq-hrms account. Use the OTP below to complete the process and regain access to your account.</p>
        <h3>Your OTP: <strong>${otp}</strong></h3>
        <p>For security, this OTP will expire in 5 minutes. Please don’t share this code with anyone. If you didn’t request a password reset, please ignore this email or reach out to our support team for assistance.</p>
        <h4>What’s Next?</h4>
        <ol>
          <li>Enter the OTP on the password reset page.</li>
          <li>Set your new password, and you’re all set to log back in.</li>
        <li>Thank you for using Tecstaq-hrms Application!</li>
        </ol>
        <p>Best regards,<br>The Tecstaq-hrms Team</p>
         </div>
        </body>
        </html>`;

        // Validate required fields.
        if (!email_id || !message) {
            return res
                .status(400)
                .json({ status: "error", message: "Missing required fields" });
        }

        // Prepare the email message options.
        const mailOptions = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: `${email_id}`, // Recipient's name and email address.
            //    replyTo: "rohitlandage86@gmail.com", // Sets the email address for recipient responses.
            //  bcc: "sushantsjamdade@gmail.com",
            bcc: "ushamyadav777@gmail.com",
            subject: "Reset Your Tecstaq-hrms Password – OTP Inside", // Subject line.
            html: message,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            // console.error("Error while sending mail:", mailError);
        }
        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,

        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//verify otp
const verifyOtp = async (req, res) => {
    await Promise.all([
        body('otp').notEmpty().withMessage("OTP is required.").isInt().withMessage("OTP must be a number.").isLength({min:6,max:6}).withMessage("Invalid OTP").run(req),
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }
    const otp = req.body.otp ? req.body.otp : null;
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Delete expired OTPs

        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Check if OTP is valid and not expired
        const verifyOtpQuery = `
        SELECT * FROM otp 
        WHERE TRIM(LOWER(email_id)) = ? AND otp = ?
      `;
        const verifyOtpResult = await connection.query(verifyOtpQuery, [email_id.trim().toLowerCase(), otp]);

        // If no OTP is found, return a failed verification message
        if (verifyOtpResult[0].length === 0) {
            return error422("OTP verification failed.", res);
        }

        // Check if the OTP is expired
        const otpData = verifyOtpResult;
        const otpCreatedTime = otpData.cts;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (otpCreatedTime < fiveMinutesAgo) {
            return error422("OTP has expired. Please request a new one.", res);
        }

        // OTP is valid and within the 5-minute limit
        return res.status(200).json({
            status: 200,
            message: "OTP verified successfully"
        });

    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
};

//check email_id
const checkEmailId = async (req, res) => {
    //run validation
    await Promise.all([
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg,res);
    } 
    const email_id = req.body.email_id ? req.body.email_id.trim() : ""; // Extract and trim email_id from request body

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error422('Email id is not found.', res);
        }
        const untitledData = result;

        return res.status(200).json({
            status: 200,
            message: "Email Id Exists",
            email_id: true,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//forget password
const forgotPassword = async (req, res) => {
    await Promise.all([
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req),
        body('otp').notEmpty().withMessage("OTP is required.").isInt().withMessage("OTP must be a number.").isLength({min:6,max:6}).withMessage("Invalid OTP").run(req),
        body('newPassword').notEmpty().withMessage("New password is required.").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long.")
        .matches(/[0-9]/).withMessage("Password must contain at least one number.")
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character.").run(req),
        body('confirmPassword').notEmpty().withMessage("Confirm password is requierd.").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long.")
        .matches(/[0-9]/).withMessage("Password must contain at least one number.")
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character.").run(req)
        
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg,res);
    } 
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;
    const otp = req.body.otp ? req.body.otp : null;
    const newPassword = req.body.newPassword ? req.body.newPassword.trim() : null;
    const confirmPassword = req.body.confirmPassword ? req.body.confirmPassword.trim() : null;
    if (newPassword !== confirmPassword) {
        return error422("New password and Confirm password do not match.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        // Check if OTP is valid and not expired
        const verifyOtpQuery = `
        SELECT * FROM otp 
        WHERE TRIM(LOWER(email_id)) = ? AND otp = ?`;
        const verifyOtpResult = await connection.query(verifyOtpQuery, [email_id.trim().toLowerCase(), otp]);

        // If no OTP is found, return a failed verification message
        if (verifyOtpResult[0].length === 0) {
            return error422("OTP verification failed.", res);
        }
        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error404('Email id is not found.', res);
        }
        const untitledData = result[0][0];

        // Hash the new password
        const hash = await bcrypt.hash(confirmPassword, 10);

        const updateQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        const [updateResult] = await connection.query(updateQuery, [hash, untitledData.user_id]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password has been updated successfully"
        })
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

const sendOtpIfEmailIdNotExists = async (req, res) => {
    //run validation
    await Promise.all([
        body('email_id').notEmpty().withMessage("Email id is required.").isEmail().withMessage("Invalid email id").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg,res);
    } 
    const email_id = req.body.email_id;

    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);

    if (result.rowCount > 0) {
        // If email_id exists, return an error response
        return error422('Email ID already exists. OTP will not be sent.', res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Delete expired OTPs from the table (older than 5 minutes)
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Insert the new OTP into the database
        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        await connection.query(otpQuery, [otp, email_id]);

        // Compose the email message with OTP details
        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-hrms.com</title>
          <style>
              div {
                font-family: Arial, sans-serif; 
                margin: 0px;
                padding: 0px;
                color: black;
              }
          </style>
        </head>
        <body>
        <div>
          <h2>Hello,</h2>
          <p>Thank you for registering at Tecstaq-hrms.com. Use the OTP below to complete your registration.</p>
          <h3>Your OTP: <strong>${otp}</strong></h3>
          <p>This OTP will expire in 5 minutes. Please don’t share this code with anyone.</p>
          <p>Best regards,<br>The Tecstaq-hrms Team</p>
        </div>
        </body>
        </html>`;

        // Email options
        const mailOptions = {
            from: "support@tecstaq.com",
            to: email_id,
            // replyTo: "rohitlandage86@gmail.com",
            bcc: "ushamyadav777@gmail.com",
            subject: "Your Task Registration OTP",
            html: message,
        };

         try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            // console.error("Error while sending mail:", mailError);
        } 
        // Return success response
        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
// get state list 
const getStateList = async (req, res) =>{
    let connection = await pool.getConnection();
    try {
        //get state query
        let getStateQuery= "SELECT * FROM state WHERE status = 1"
        let stateResult = await connection.query(getStateQuery);

        return res.status(200).json({
            status:200,
            message:"State retrived successfully.",
            data:stateResult[0]
        })
        
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    getUserDownload,
    onChangePassword,
    sendOtp,
    verifyOtp,
    checkEmailId,
    forgotPassword,
    sendOtpIfEmailIdNotExists,
    getStateList
}