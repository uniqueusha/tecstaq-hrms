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
//create Salary Structure...
const createSalaryStructure = async (req, res) => {
    const structure_name = req.body.structure_name ? req.body.structure_name.trim() : null;
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : 0;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!structure_name) {
        return error422("Structure name is required.", res)
    } else if(!employment_type_id && employment_type_id != 0) {
        return error422("Employment type is required.", res)
    }
    //is exist salary structure
    let isSalaryStructureQuery = "SELECT * FROM salary_structure WHERE structure_name = ? ";
    let isSalaryStructureResult = await pool.query(isSalaryStructureQuery,[structure_name]);
    if (isSalaryStructureResult[0].length>0) {
       return error422("Salary structure already exists.", res);
    }
    
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert salary structure
        const insertQuery = ` INSERT INTO salary_structure  (structure_name, employment_type_id, description ) VALUES (?, ?, ?) `;
        await connection.query(insertQuery, [ structure_name, employment_type_id, description ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Salary structure created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get Salary Structure...
const getSalaryStructures = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getStructureQuery = ` SELECT s.*, et.employment_type 
        FROM salary_structure s 
        LEFT JOIN employment_type et 
        ON et.employment_type_id = s.employment_type_id  WHERE 1  `;
        let countQuery = `  SELECT COUNT(*) AS total 
        FROM salary_structure s 
        LEFT JOIN employment_type et 
        ON et.employment_type_id = s.employment_type_id  WHERE 1  `
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getStructureQuery += ` AND s.status = 1`;
                countQuery += ` AND s.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getStructureQuery += ` AND s.status = 0`;
                countQuery += ` AND s.status = 0`;
            } else {
                getStructureQuery += ` AND (LOWER(s.structure_name) LIKE '%${lowercaseKey}%' || et.employment_type LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(s.structure_name) LIKE '%${lowercaseKey}%' || et.employment_type LIKE '%${lowercaseKey}%')`;
            }
        }
        getStructureQuery += ` ORDER BY s.cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getStructureQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getStructureQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"Salary structure retrived successfully",
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
//Salary Structure by id
const getSalaryStructure = async (req, res) => {
    const salaryStructureId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const salaryStructureQuery = `SELECT s.*, et.employment_type FROM salary_structure s
        LEFT JOIN employment_type et
        ON et.employment_type_id = s.employment_type_id
        WHERE s.salary_structure_id = ? `;
        const salaryStructureResult = await connection.query(salaryStructureQuery, [salaryStructureId]);

        if (salaryStructureResult[0].length == 0) {
            return error422("Salary Structure Not Found.", res);
        }
        const salaryStructure = salaryStructureResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Salary Structure Retrived Successfully",
            data: salaryStructure
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update Salary Structure
const updateSalaryStructure = async (req, res) => {
    const salaryStructureId = parseInt(req.params.id);
    const structure_name = req.body.structure_name ? req.body.structure_name.trim() : null;
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : 0;
    const description = req.body.description ? req.body.description.trim() : null;

    if (!structure_name) {
        return error422("Structure name is required.", res)
    } else if(!employment_type_id) {
        return error422("Employment type is required.", res)
    } 

    // Check if salary structure exists
    const salaryStructureQuery = "SELECT * FROM salary_structure WHERE salary_structure_id  = ?";
    const salaryStructureResult = await pool.query(salaryStructureQuery, [salaryStructureId]);
    if (salaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found.", res);
    }
    // Check if the provided salary structure exists
    const existingSalaryStructureQuery = "SELECT * FROM salary_structure WHERE structure_name = ? AND salary_structure_id !=? ";
    const existingSalaryStructureResult = await pool.query(existingSalaryStructureQuery, [structure_name, salaryStructureId]);
    if (existingSalaryStructureResult[0].length > 0) {
        return error422("Salary Structure already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the salary structure record with new data
        const updateQuery = `
            UPDATE salary_structure
            SET structure_name = ?, employment_type_id = ?, description = ?
            WHERE salary_structure_id = ?
        `;
        await connection.query(updateQuery, [structure_name, employment_type_id, description, salaryStructureId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary Structure updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of Salary Structure...
const onStatusChange = async (req, res) => {
    const salaryStructureId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the salary structure exists
        const salaryStructureQuery = "SELECT * FROM salary_structure WHERE salary_structure_id = ? ";
        const salaryStructureResult = await connection.query(salaryStructureQuery, [salaryStructureId]);

        if (salaryStructureResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Salary Structure not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the salary structure status
        const updateQuery = `
            UPDATE salary_structure
            SET status = ?
            WHERE salary_structure_id = ?`;
        await connection.query(updateQuery, [status, salaryStructureId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Salary Structure ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get Salary Structure active...
const getSalaryStructureWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let structureQuery = `SELECT * FROM salary_structure
        WHERE status = 1  `;
        structureQuery +=" ORDER BY structure_name "
        const structureResult = await connection.query(structureQuery);
        const structure = structureResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Structure retrieved successfully.",
            data: structure,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createSalaryStructure,
    getSalaryStructures,
    getSalaryStructure,
    updateSalaryStructure,
    onStatusChange,
    getSalaryStructureWma,
}