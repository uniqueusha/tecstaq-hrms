const pool = require('../../common/db');
const xlsx = require("xlsx");
const fs = require("fs");
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
//create Calculation Type...
const createCalculationType = async (req, res) => {
    const calculation_type = req.body.calculation_type ? req.body.calculation_type.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!calculation_type) {
        return error422("Calculation type is required.", res)
    } 
    //is exist Calculation type
    let isCalculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type = ? ";
    let isCalculationTypeResult = await pool.query(isCalculationTypeQuery,[calculation_type]);
    if (isCalculationTypeResult[0].length>0) {
       return error422("Calculation type already exists.", res);
    }
    
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert Calculation type
        const insertQuery = ` INSERT INTO calculation_type  (calculation_type, description) VALUES (?, ?) `;
        await connection.query(insertQuery, [ calculation_type, description ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Calculation type created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get Calculation Type...
const getCalculationTypes = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getCalculationTypeQuery = " SELECT * FROM calculation_type WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM calculation_type WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getCalculationTypeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getCalculationTypeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getCalculationTypeQuery += ` AND (LOWER(calculation_type) LIKE '%${lowercaseKey}%' || LOWER(description) LIKE '%${lowercaseKey}%') `;
                countQuery += ` AND (LOWER(calculation_type) LIKE '%${lowercaseKey}%' || LOWER(description) LIKE '%${lowercaseKey}%') `;
            }
        }
        getCalculationTypeQuery += ` ORDER BY cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getCalculationTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getCalculationTypeQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"Calculation type retrived successfully",
            data:result[0]
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
//Calculation Type by id
const getCalculationType = async (req, res) => {
    const calculationTypeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const calculationTypeQuery = `SELECT * FROM calculation_type
        WHERE calculation_type_id = ? `;
        const calculationTypeResult = await connection.query(calculationTypeQuery, [calculationTypeId]);

        if (calculationTypeResult[0].length == 0) {
            return error422("Calculation Not Found.", res);
        }
        const calculationType = calculationTypeResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Calculation type Retrived Successfully",
            data: calculationType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update Calculation Type
const updateCalculationType = async (req, res) => {
    const calculationTypeId = parseInt(req.params.id);
    const calculation_type = req.body.calculation_type ? req.body.calculation_type.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!calculation_type) {
        return error422("Calculation type is required.", res)
    } 
    // Check if Calculation type exists
    const calculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type_id  = ?";
    const calculationTypeResult = await pool.query(calculationTypeQuery, [calculationTypeId]);
    if (calculationTypeResult[0].length == 0) {
        return error422("Calculation Type Not Found.", res);
    }
    // Check if the provided Calculation type exists
    const existingCalculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type = ? AND calculation_type_id !=? ";
    const existingCalculationTypeResult = await pool.query(existingCalculationTypeQuery, [calculation_type, calculationTypeId]);
    if (existingCalculationTypeResult[0].length > 0) {
        return error422("Calculation Type already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the grade record with new data
        const updateQuery = `
            UPDATE calculation_type
            SET calculation_type = ?, description = ?
            WHERE calculation_type_id = ?
        `;
        await connection.query(updateQuery, [calculation_type, description, calculationTypeId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Calculation Type updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of Calculation Type...
const onStatusChange = async (req, res) => {
    const calculationTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the Calculation type exists
        const calculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type_id = ? ";
        const calculationTypeResult = await connection.query(calculationTypeQuery, [calculationTypeId]);

        if (calculationTypeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Calculation type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the Calculation type status
        const updateQuery = `
            UPDATE calculation_type
            SET status = ?
            WHERE calculation_type_id = ?`;
        await connection.query(updateQuery, [status, calculationTypeId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Calculation type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get Calculation Type active...
const getCalculationTypeWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let calculationTypeQuery = `SELECT * FROM calculation_type
        WHERE status = 1  `;
        calculationTypeQuery +=" ORDER BY calculation_type"
        const calculationTypeResult = await connection.query(calculationTypeQuery);
        const calculationType = calculationTypeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Calculation Type retrieved successfully.",
            data: calculationType,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createCalculationType,
    getCalculationTypes,
    getCalculationType,
    updateCalculationType,
    onStatusChange,
    getCalculationTypeWma,
}