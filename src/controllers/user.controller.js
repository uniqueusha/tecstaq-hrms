const pool = require('../common/db');
const bcrypt = require("bcrypt");
 const xlsx = require("xlsx");
 const fs = require("fs");

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
        WHERE 1 AND u.role !="Management" `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.employee_first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(em.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
            countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.employee_first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(em.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
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
            getUserQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_code) LIKE '%${lowercaseKey}%')`;
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

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    getUserDownload
}