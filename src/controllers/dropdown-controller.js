const pool = require('../../db');
const { body, param, validationResult } = require('express-validator');
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
//create dropdown...
const createDropdown = async (req, res) =>{
    //validation run 
    await Promise.all([
        body('dropdown_type').notEmpty().withMessage("Dropdown type is required.").run(req),
        body('name').notEmpty().withMessage("Name is required.").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res);
    }
    const dropdown_type = req.body.dropdown_type ? req.body.dropdown_type.trim() : '';
    const name = req.body.name ? req.body.name.trim() : '';

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction()
        //get dropdown 
        let getDropDownQuery = 'SELECT * FROM dropdowns WHERE LOWER(TRIM(dropdown_type)) = ? AND LOWER(TRIM(name)) = ? '
        let getDropDownResult = await connection.query(getDropDownQuery,[dropdown_type.toLowerCase().trim(), name.toLowerCase().trim()]);
        if (getDropDownResult[0].length!=0) {
            return error422("Dropdown already exist.", res);
        }
        //insert dropdown
        let dropdownQuery = 'INSERT INTO dropdowns (dropdown_type, name) VALUES (?, ?)';
        await connection.query(dropdownQuery,[dropdown_type, name]);
        await connection.commit();
        return res.status(200).json({
            status:200,
            message:"Dropdown is created successfully.",
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) await connection.release();
    }
}
//get dropdowns
const getDropdowns = async (req, res) =>{
    const { dropdown_type, key, page, perPage } = req.query
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getDropdownQuery = `SELECT * FROM dropdowns 
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM dropdowns
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getDropdownQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getDropdownQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getDropdownQuery += ` AND (LOWER(name) LIKE '%${lowercaseKey}%' || LOWER(document_type) LIKE '%${lowercaseKey}%' )`;
                countQuery += ` AND (LOWER(name) LIKE '%${lowercaseKey}%' || LOWER(document_type) LIKE '%${lowercaseKey}%' )`;
            }
        }


        if (dropdown_type) {
            getDropdownQuery += ` AND dropdown_type = '${dropdown_type}' `;
            countQuery += `  AND dropdown_type = '${dropdown_type}' `;
        }

        getDropdownQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getDropdownQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getDropdownQuery);
        const dropdowns = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Dropdowns retrieved successfully",
            data: dropdowns,
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
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) await connection.release();
    }
}
//get dropdown by id
const getDropdown = async (req, res) => {
    const dropdownId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {

        //start a transaction
        await connection.beginTransaction();

        const dropdownQuery = `SELECT * FROM dropdowns 
        WHERE dropdown_id = ?`;
        const dropdownResult = await connection.query(dropdownQuery, [dropdownId]);

        if (dropdownResult[0].length == 0) {
            return error422("Dropdown Not Found.", res);
        }
        const dropdown = dropdownResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Dropdown Retrived Successfully",
            data: dropdown
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update dropdown
const updateDropdown = async (req, res) => {
    const dropdownId = parseInt(req.params.id);
   //validation run 
    await Promise.all([
        body('dropdown_type').notEmpty().withMessage("Dropdown type is required.").run(req),
        body('name').notEmpty().withMessage("Name is required.").run(req),
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res);
    }
    const dropdown_type = req.body.dropdown_type ? req.body.dropdown_type.trim() : '';
    const name = req.body.name ? req.body.name.trim() : '';

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if dropdown exists
        const dropdownQuery = "SELECT * FROM dropdowns WHERE dropdown_id  = ?";
        const dropdownResult = await connection.query(dropdownQuery, [dropdownId]);
        if (dropdownResult[0].length == 0) {
            return error422("Dropdown Not Found.", res);
        }
        // Check if the provided dropdown exists
        const existingDropdownQuery = "SELECT * FROM dropdowns WHERE (LOWER(TRIM(dropdown_type)) = ? AND LOWER(TRIM(name)) = ? )  AND dropdown_id !=? ";
        const existingDropdownResult = await connection.query(existingDropdownQuery, [dropdown_type.toLowerCase().trim(), name.toLowerCase().trim(), dropdownId]);

        if (existingDropdownResult[0].length > 0) {
            return error422("name already exists.", res);
        }


        // Update the dropdown record with new data
        const updateQuery = `
            UPDATE dropdowns
            SET name = ?, dropdown_type = ?
            WHERE dropdown_id = ?
        `;
        await connection.query(updateQuery, [name, dropdown_type, dropdownId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Dropdown updated successfully.",
        });
    } catch (error) {
        console.log(error);
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of dropdown...
const onStatusChange = async (req, res) => {
    const dropdownId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the dropdown exists
        const dropdownQuery = "SELECT * FROM dropdowns WHERE dropdown_id = ? ";
        const dropdownResult = await connection.query(dropdownQuery, [dropdownId]);

        if (dropdownResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Dropdown not found.",
            });
        }
        // Soft update the dropdown status
        const updateQuery = `
        UPDATE dropdowns
        SET status = ?
        WHERE dropdown_id = ?`;
        await connection.query(updateQuery, [status, dropdownId]);
        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Dropdown ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get dropdown active...
const getDropdownActive = async (req, res) => {
    const { dropdown_type } = req.query;
    if (!dropdown_type) {
       return error422("Dropdown is required.", res) 
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let dropdownQuery = `SELECT * FROM dropdowns
        WHERE status = 1  `;

        // dropdown type
        if (dropdown_type) {
            dropdownQuery += ` AND dropdown_type = '${dropdown_type}' `;
        }
        dropdownQuery += " ORDER BY dropdown_type ASC, name ASC "
        const dropdownResult = await connection.query(dropdownQuery);
        const dropdown = dropdownResult[0];
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Dropdown retrieved successfully.",
            data: dropdown,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
module.exports = {
    createDropdown,
    getDropdowns,
    getDropdown,
    updateDropdown,
    onStatusChange,
    getDropdownActive
}