const pool = require('../common/db');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
    const first_name = req.body.first_name ? req.body.first_name.trim() : '';
    const last_name = req.body.last_name ? req.body.last_name.trim() : '';
    const email_id = req.body.email_id ? req.body.email_id.trim() : '';
    const mobile_number = req.body.mobile_number ? req.body.mobile_number : '';
    const designation_id = req.body.designation_id ? req.body.designation_id : '';
    const role = req.body.role ? req.body.role.trim() : '';
    const password = req.body.password ? req.body.password : '';

    if (!first_name) {
        return error422("First Name is required.", res);
    } else if (!last_name) {
        return error422("Last name required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!mobile_number) {
        return error422("Mobile Number is required.", res);
    } else if(!designation_id){
        return error422("Designation id is required.", res);
    } else if (!role) {
        return error422("Role is required.", res);
    } else if (!password) {
        return error422("Password is required.", res);
    }  

    // Check if designation id exists
    const designationQuery = "SELECT * FROM designation WHERE designation_id = ?";
    const designationResult = await pool.query(designationQuery, [designation_id]);
    if (designationResult[0].length == 0) {
        return error422("Designation Not Found.", res);
    }

    // Check if email_id exists
    const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
    const checkUserResult = await pool.query(checkUserQuery, [email_id.toLowerCase()]);
    if (checkUserResult[0].length > 0) {
        return error422('Email id is already exists.', res);
    }


    // Attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //insert into user
        const insertUserQuery = `INSERT INTO users (first_name, last_name, email_id, mobile_number, designation_id, role) VALUES (?, ?, ?, ?, ?, ?)`;
        const insertUserValues = [first_name, last_name, email_id, mobile_number, designation_id, role];
        const insertUserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertUserResult[0].insertId;

        const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        //insert into Untitled
        const insertUntitledQuery ="INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        const insertUntitledValues = [user_id, hash];
        const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)

        //commit the transation
        await connection.commit();
        return res.status(200).json({
            status:200,
            message: "Created User Successfully.",
        })
    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    createUser
}