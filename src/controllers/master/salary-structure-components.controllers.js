const pool = require('../../../db');
const xlsx = require("xlsx");
const fs = require("fs");
const path = require('path');

//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
//error handle 422...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}
//error handle 500...
error500 = (error, res) => {
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}

//create salary structure component
const createSalaryStructureComponent = async (req, res) => {
    const salary_component_id = req.body.salary_component_id ? req.body.salary_component_id : '';
    const percentage_of = req.body.percentage_of ? req.body.percentage_of : '';
    const value = req.body.value ? req.body.value : '';
    const min_limit = req.body.min_limit ? req.body.min_limit : '';
    const max_limit = req.body.max_limit ? req.body.max_limit : '';
    const calculation_order = req.body.calculation_order ? req.body.calculation_order : '';
    // const user_id = req.companyData.userId;
    const user_id = req.user?.user_id;

  
    if (!salary_component_id) {
        return error422("Salary component id is required.", res);
    } else if (!percentage_of && percentage_of != 0) {
        return error422("Percentage of is required.", res);
    } else if (!value && value != 0) {
        return error422("Value is required.", res);
    } else if (!min_limit && min_limit != 0) {
        return error422("Min limit is required.", res);
    } else if (!max_limit && max_limit != 0) {
        return error422("Max limit is required.", res);
    } else if (!calculation_order) {
        return error422("Calculation order is required.", res);
    }

    // Check if the salary_component exists and is active
    const isSalaryComponentExist = "SELECT * FROM salary_component WHERE salary_component_id = ?";
    const isSalaryComponentResult = await pool.query(isSalaryComponentExist, [salary_component_id]);
    if (isSalaryComponentResult[0].length == 0) {
        return error422("Salary Component Not Found.", res);
    }
    // Check if the percentage of exists and is active
    // const isPercentageOfExist = "SELECT * FROM salary_structure_components WHERE percentage_of = ?";
    // const isPercentageOfResult = await pool.query(isPercentageOfExist, [percentage_of]);
    // if (isPercentageOfResult[0].length > 0) {
    //     return error422("Percentage of is already is exist.", res);
    // }
    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const insertQuery = "INSERT INTO salary_structure_components (salary_component_id, percentage_of, value , min_limit, max_limit, calculation_order, created_by)VALUES(?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery, [salary_component_id, percentage_of, value, min_limit, max_limit, calculation_order, user_id]);

        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Salary Structure Components created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

//all salary_structure_components list
const getAllSalaryStructureComponents = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();
    try {

        //start a transaction
        await connection.beginTransaction();

        let getSalaryStructureComponentsQuery = `SELECT ssc.*, sc.salary_component_name FROM salary_structure_components ssc
        LEFT JOIN salary_component sc
        ON sc.salary_component_id = ssc.salary_component_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM salary_structure_components ssc
        LEFT JOIN salary_component sc
        ON sc.salary_component_id = ssc.salary_component_id 
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getSalaryStructureComponentsQuery += ` AND ssc.status = 1`;
                countQuery += ` AND ssc.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getSalaryStructureComponentsQuery += ` AND ssc.status = 0`;
                countQuery += ` AND ssc.status = 0`;
            } else {
                getSalaryStructureComponentsQuery += ` AND (LOWER(ssc.percentage_of) LIKE '%${lowercaseKey}%' || LOWER(ssc.value) LIKE '%${lowercaseKey}%' || LOWER(ssc.min_limit) LIKE '%${lowercaseKey}%' || LOWER(ssc.max_limit) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(ssc.percentage_of) LIKE '%${lowercaseKey}%' || LOWER(ssc.value) LIKE '%${lowercaseKey}%' || LOWER(ssc.min_limit) LIKE '%${lowercaseKey}%' || LOWER(ssc.max_limit) LIKE '%${lowercaseKey}%')`;
            }
        }
        getSalaryStructureComponentsQuery += " ORDER BY ssc.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getSalaryStructureComponentsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getSalaryStructureComponentsQuery);
        const salaryStructureComponents = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Salary Structure Components retrieved successfully",
            data: salaryStructureComponents,
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

//salary_structure_components by id
const getSalaryStructureComponents = async (req, res) => {
    const salaryStructureComponentsId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const salaryStructureComponentsQuery = `SELECT ssc.*, sc.salary_component_name FROM salary_structure_components ssc
        LEFT JOIN salary_component sc
        ON sc.salary_component_id = ssc.salary_component_id
        WHERE ssc.salary_structure_component_id = ?`;
        const salaryStructureComponentsResult = await connection.query(salaryStructureComponentsQuery, [salaryStructureComponentsId]);
        if (salaryStructureComponentsResult[0].length == 0) {
            return error422("Salary Structure Components Not Found.", res);
        }
        const salaryStructureComponents = salaryStructureComponentsResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Salary Structure Components Retrived Successfully",
            data: salaryStructureComponents
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update salary Structure Components
const updatesalaryStructureComponents = async (req, res) => {
    const salaryStructureComponentsId = parseInt(req.params.id);
    const salary_component_id = req.body.salary_component_id ? req.body.salary_component_id : '';
    const percentage_of = req.body.percentage_of ? req.body.percentage_of : '';
    const value = req.body.value ? req.body.value : '';
    const min_limit = req.body.min_limit ? req.body.min_limit : '';
    const max_limit = req.body.max_limit ? req.body.max_limit : '';
    const calculation_order = req.body.calculation_order ? req.body.calculation_order : '';
    const user_id = req.user?.user_id;

    if (!salary_component_id) {
        return error422("Salary component id is required.", res);
    } else if (!percentage_of) {
        return error422("Percentage of is required.", res);
    } else if (!value) {
        return error422("Value is required.", res);
    } else if (!min_limit) {
        return error422("Min limit is required.", res);
    } else if (!max_limit) {
        return error422("Max limit is required.", res);
    } else if (!calculation_order) {
        return error422("Calculation order is required.", res);
    }


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if salary Structure Components exists
        const salaryStructureComponentsQuery = "SELECT * FROM salary_structure_components WHERE salary_structure_component_id  = ?";
        const salaryStructureComponentsResult = await connection.query(salaryStructureComponentsQuery, [salaryStructureComponentsId]);
        if (salaryStructureComponentsResult[0].length === 0) {
            return error422("Salary Structure Components Not Found.", res);
        }

        // Update the salary Structure Components record with new data
        const updateQuery = `
            UPDATE salary_structure_components
            SET salary_component_id = ?, percentage_of = ?, value = ?, min_limit = ?, max_limit = ?, calculation_order = ?, created_by = ?
            WHERE salary_structure_component_id = ?
        `;

        await connection.query(updateQuery, [salary_component_id, percentage_of, value, min_limit, max_limit, calculation_order, user_id, salaryStructureComponentsId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary Structure Components updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of salary_structure_components...
const onStatusChange = async (req, res) => {
    const salaryStructureComponentsId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the salary_structure_components exists
        const salaryStructureComponentsQuery = "SELECT * FROM salary_structure_components WHERE salary_structure_component_id = ? ";
        const salaryStructureComponentsResult = await connection.query(salaryStructureComponentsQuery, [salaryStructureComponentsId]);

        if (salaryStructureComponentsResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Salary Structure Components not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the salary Structure Components
        const updateQuery = `
            UPDATE salary_structure_components
            SET status = ?
            WHERE salary_structure_component_id = ?
        `;

        await connection.query(updateQuery, [status, salaryStructureComponentsId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Salary Structure Components ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get salary Structure Components active...
const getSalaryStructureComponentsIdWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const salaryStructureComponentsIdQuery = `SELECT ssc.*, sc.salary_component_name FROM salary_structure_components ssc
        LEFT JOIN salary_component sc
        ON sc.salary_component_id = ssc.salary_component_id
        WHERE ssc.status = 1  ORDER BY ssc.calculation_order`;

        const salaryStructureComponentsIdResult = await connection.query(salaryStructureComponentsIdQuery);
        const salaryStructureComponents = salaryStructureComponentsIdResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary Structure Components retrieved successfully.",
            data: salaryStructureComponents,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
//download salary Structure Components
const getSalaryStructureComponentsDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getSalaryStructureComponentsQuery = `SELECT ssc.*, sc.salary_component_name FROM salary_structure_components ssc
        LEFT JOIN salary_component sc
        ON sc.salary_component_id = ssc.salary_component_id
        WHERE 1 `;
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getSalaryStructureComponentsQuery += ` AND (LOWER(ssc.percentage_of) LIKE '%${lowercaseKey}%' || LOWER(ssc.value) LIKE '%${lowercaseKey}%' || LOWER(ssc.min_limit) LIKE '%${lowercaseKey}%' || LOWER(ssc.max_limit) LIKE '%${lowercaseKey}%')`;
            }
        getSalaryStructureComponentsQuery += " ORDER BY ssc.cts DESC";

        let result = await connection.query(getSalaryStructureComponentsQuery);
        let salaryStructureComponents = result[0];

        if (salaryStructureComponents.length === 0) {
            return error422("No data found.", res);
        }

        salaryStructureComponents = salaryStructureComponents.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Salary Structure Component": item.salary_component_name,
            "% Of": item.percentage_of,
            "Value": item.value,
            "Min": item.min_limit,
            "Max": item.max_limit,
            "Order": item.calculation_order,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(salaryStructureComponents);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "salaryStructureComponentsInfo");

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
    createSalaryStructureComponent,
    getAllSalaryStructureComponents,
    getSalaryStructureComponents,
    updatesalaryStructureComponents,
    onStatusChange,
    getSalaryStructureComponentsIdWma,
    getSalaryStructureComponentsDownload,
    

}
