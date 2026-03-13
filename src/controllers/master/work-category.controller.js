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

//create work_category
const createWorkCategory = async (req, res)=>{
    const work_category = req.body.work_category ? req.body.work_category.trim() :'';
    
    if (!work_category) {
        return error422("Work Category is required.", res);
    } 

    // Check if the work_category exists and is active
    const isWorkCategoryExist = "SELECT * FROM work_category WHERE work_category = ? ";
    const isWorkCategoryResult = await pool.query(isWorkCategoryExist,[ work_category ]);
    if (isWorkCategoryResult[0].length > 0) {
        return error422("Work category is already is exist.", res);
    }

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const insertQuery = "INSERT INTO work_category (work_category)VALUES(?)";
        const result = await connection.query(insertQuery,[work_category]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Work category created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all work_category list
const getAllWorkCategory = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getWorkCategoryQuery = `SELECT * FROM work_category
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM work_category 
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getWorkCategoryQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getWorkCategoryQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getWorkCategoryQuery += ` AND trim(LOWER(work_category) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND trim(LOWER(work_category) LIKE '%${lowercaseKey}%' )`;
            }
        }
        getWorkCategoryQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getWorkCategoryQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getWorkCategoryQuery);
        const workCategory = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Work Category retrieved successfully",
            data: workCategory,
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

//Work Category by id
const getWorkCategory = async (req, res) => {
    const workCategoryId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const workCategoryQuery = `SELECT * FROM work_category
        WHERE work_category_id = ?`;
        const workCategoryResult = await connection.query(workCategoryQuery, [workCategoryId]);
        if (workCategoryResult[0].length == 0) {
            return error422("Work Category Not Found.", res);
        }
        const workCategory = workCategoryResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Work Category Retrived Successfully",
            data: workCategory
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update work Category
const updateWorkCategory = async (req, res) => {
    const workCategoryId = parseInt(req.params.id);
    const work_category = req.body.work_category ? req.body.work_category.trim() :'';
   
    if (!work_category) {
        return error422("Work category is required.", res);
    } 
    
     // Check if the work_category exists and is active
    const isWorkCategoryExist = "SELECT * FROM work_category WHERE work_category = ? ";
    const isWorkCategoryResult = await pool.query(isWorkCategoryExist,[ work_category ]);
    if (isWorkCategoryResult[0].length > 0) {
        return error422("Work category is already is exist.", res);
    }
    

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

       const workCategoryQuery = `SELECT * FROM work_category
        WHERE work_category_id = ?`;
        const workCategoryResult = await connection.query(workCategoryQuery, [workCategoryId]);
        if (workCategoryResult[0].length == 0) {
            return error422("Work Category Not Found.", res);
        }

        // Update the work_category record with new data
        const updateQuery = `
            UPDATE work_category
            SET work_category = ?
            WHERE work_category_id = ?
        `;

        await connection.query(updateQuery, [ work_category, workCategoryId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Work Category updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Work Category ...
const onStatusChange = async (req, res) => {
    const workCategoryId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the work Category exists
        const workCategoryQuery = "SELECT * FROM work_category WHERE work_category_id = ? ";
        const workCategoryResult = await connection.query(workCategoryQuery, [workCategoryId]);

        if (workCategoryResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Work Category not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the work Category
        const updateQuery = `
            UPDATE work_category
            SET status = ?
            WHERE work_category_id = ?
        `;

        await connection.query(updateQuery, [status, workCategoryId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Work category ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get work category active...
const getWorkCategoryWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const workCategoryQuery = `SELECT * FROM work_category
        WHERE status = 1  ORDER BY work_category ASC`;

        const workCategoryResult = await connection.query(workCategoryQuery);
        const workCategory = workCategoryResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Work Category retrieved successfully.",
            data: workCategory,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

//work Category download
const getWorkCategoryDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getWorkCategoryQuery = `SELECT * FROM work_category
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getWorkCategoryQuery += ` AND trim(LOWER(work_category) LIKE '%${lowercaseKey}%')`;
        }

        getWorkCategoryQuery += " ORDER BY cts DESC";

        let result = await connection.query(getWorkCategoryQuery);
        let workCategory = result[0];

        if (workCategory.length === 0) {
            return error422("No data found.", res);
        }


        workCategory = workCategory.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Work Category": item.work_category,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(workCategory);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "workCategoryInfo");

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
    createWorkCategory,
    getAllWorkCategory,
    getWorkCategory,
    updateWorkCategory,
    onStatusChange,
    getWorkCategoryWma,
    getWorkCategoryDownload
}
