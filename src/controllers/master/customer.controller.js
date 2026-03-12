const pool = require('../../../db');
const xlsx = require("xlsx");
const fs = require("fs");
const path = require('path');

//function to obtain a database connection 
const getConnection = async ()=> {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
//error handle 422...
error422 = (message, res)=>{
    return res.status(422).json({
        status:422,
        message:message
    });
}
//error handle 500...
error500 = (error, res)=>{
    return res.status(500).json({
        status:500,
        message:"Internal Server Error",
        error:error
    });
}

//create Customer
const createCustomer = async (req, res)=>{
    const customer_name = req.body.customer_name ? req.body.customer_name.trim() :'';
    const email_id = req.body.email_id ? req.body.email_id.trim() :'';
    const phone_number = req.body.phone_number ? req.body.phone_number :'';

    if (!customer_name) {
        return error422("Customer name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!phone_number) {
        return error422("Phone Number is required.", res);
    }

    // Check if the Email id exists and is active
    const isEmailExist = "SELECT * FROM customer WHERE email_id = ?";
    const isEmailResult = await pool.query(isEmailExist,[ email_id ]);
    if (isEmailResult[0].length > 0) {
        return error422("Email is already is exist.", res);
    }

    // Check if the Phone Number exists and is active
    const isPhoneNumberExist = "SELECT * FROM customer WHERE phone_number = ?";
    const isPhoneNumberResult = await pool.query(isPhoneNumberExist,[ phone_number ]);
    if (isPhoneNumberResult[0].length > 0) {
        return error422("Phone Number is already is exist.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const insertQuery = "INSERT INTO customer (customer_name, email_id, phone_number)VALUES(?, ?, ?)";
        const result = await connection.query(insertQuery,[customer_name, email_id, phone_number]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Customer created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all Customer list
const getAllCustomer = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getCustomerQuery = `SELECT c.*  FROM customer c
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM customer c 
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getCustomerQuery += ` AND c.status = 1`;
                countQuery += ` AND c.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getCustomerQuery += ` AND c.status = 0`;
                countQuery += ` AND c.status = 0`;
            } else {
            getCustomerQuery += ` AND trim(LOWER(c.customer_name) LIKE '%${lowercaseKey}%' OR LOWER(c.email_id) LIKE '%${lowercaseKey}%' OR LOWER(c.phone_number) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND trim(LOWER(c.customer_name) LIKE '%${lowercaseKey}%' OR LOWER(c.email_id) LIKE '%${lowercaseKey}%' OR LOWER(c.phone_number) LIKE '%${lowercaseKey}%')`;
            }
        }
        getCustomerQuery += " ORDER BY c.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getCustomerQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getCustomerQuery);
        const customers = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Customer retrieved successfully",
            data: customers,
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
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Customer by id
const getCustomer = async (req, res) => {
    const customerId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const customerQuery = `SELECT c.* FROM customer c
        WHERE customer_id = ?`;
        const customerResult = await connection.query(customerQuery, [customerId]);
        if (customerResult[0].length == 0) {
            return error422("Customer Not Found.", res);
        }
        const customer = customerResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Customer Retrived Successfully",
            data: customer
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update Customer
const updateCustomer = async (req, res) => {
    const customerId = parseInt(req.params.id);
    const customer_name = req.body.customer_name ? req.body.customer_name.trim() :'';
    const email_id = req.body.email_id ? req.body.email_id.trim() :'';
    const phone_number = req.body.phone_number ? req.body.phone_number :'';

    if (!customer_name) {
        return error422("Customer name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!phone_number) {
        return error422("Phone Number is required.", res);
    }
    
    // Check if the Email id exists and is active
    const isEmailExist = "SELECT * FROM customer WHERE email_id = ? AND customer_id != ?";
    const isEmailResult = await pool.query(isEmailExist,[ email_id, customerId]);
    if (isEmailResult[0].length > 0) {
        return error422("Email is already is exist.", res);
    }

    // Check if the Phone Number exists and is active
    const isPhoneNumberExist = "SELECT * FROM customer WHERE phone_number = ? AND customer_id != ?";
    const isPhoneNumberResult = await pool.query(isPhoneNumberExist,[ phone_number, customerId]);
    if (isPhoneNumberResult[0].length > 0) {
        return error422("Phone Number is already is exist.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if customer exists
        const customerQuery = "SELECT * FROM customer WHERE customer_id  = ?";
        const customerResult = await connection.query(customerQuery, [customerId]);
        if (customerResult[0].length === 0) {
            return error422("Customer Not Found.", res);
        }

        // Update the Customer record with new data
        const updateQuery = `
            UPDATE customer
            SET customer_name = ?, email_id = ?, phone_number = ?
            WHERE customer_id = ?
        `;

        await connection.query(updateQuery, [ customer_name, email_id, phone_number,customerId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Customer updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Customer...
const onStatusChange = async (req, res) => {
    const customerId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the customer exists
        const customerQuery = "SELECT * FROM customer WHERE customer_id = ? ";
        const customerResult = await connection.query(customerQuery, [customerId]);

        if (customerResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Customer not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the customer
        const updateQuery = `
            UPDATE customer
            SET status = ?
            WHERE customer_id = ?
        `;

        await connection.query(updateQuery, [status, customerId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Customer ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get Customer active...
const getCustomerWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const customerQuery = `SELECT * FROM customer
        WHERE status = 1  ORDER BY customer_name ASC`;

        const customerResult = await connection.query(customerQuery);
        const customer = customerResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Customer retrieved successfully.",
            data: customer,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

//customer download
const getCustomerDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getCustomerQuery = `SELECT c.* FROM customer c
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getCustomerQuery += ` AND trim(LOWER(c.customer_name) LIKE '%${lowercaseKey}%' OR LOWER(c.email_id) LIKE '%${lowercaseKey}%' OR LOWER(c.phone_number) LIKE '%${lowercaseKey}%')`;
        }

        getCustomerQuery += " ORDER BY c.cts DESC";

        let result = await connection.query(getCustomerQuery);
        let customer = result[0];

        if (customer.length === 0) {
            return error422("No data found.", res);
        }


        customer = customer.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Customer Name": item.customer_name,
            "Email Id": item.email_id,
            "Mobile Number": item.phone_number,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(customer);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "CustomerInfo");

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
    createCustomer,
    getAllCustomer,
    getCustomer,
    updateCustomer,
    onStatusChange,
    getCustomerWma,
    getCustomerDownload
}
