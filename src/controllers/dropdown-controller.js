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


        // Update the employee record with new data
        const updateQuery = `
            UPDATE employee
            SET company_id = ?, departments_id = ?, designation_id = ?, employment_type_id = ?, employee_code = ?, title = ?, first_name = ?, last_name = ?, email = ?, personal_email = ?, dob = ?, gender = ?, father_name = ?, mother_name = ?, blood_group = ?, marital_status = ?, country_code = ?, mobile_number = ?, profile_photo = ?, current_address = ?, permanent_address = ?, alternate_contact_number = ?, doj = ?, office_location = ?, work_location = ?, employee_status = ?, holiday_calendar_id = ?, reporting_manager_id = ?, uan_number = ?, esic_number = ?, pf_number = ?, pan_card_number = ?, aadhar_number = ?, passport_no = ?, passport_expiry = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateQuery, [company_id, departments_id, designation_id, employment_type_id, employee_code, title, first_name, last_name, email, personal_email, dob, gender, father_name, mother_name, blood_group, marital_status, country_code, mobile_number, profilePhotoPath, current_address, permanent_address, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager_id, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, employeeId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee updated successfully.",
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
    const employeeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the employee exists
        const employeeQuery = "SELECT * FROM employee WHERE employee_id = ? ";
        const employeeResult = await connection.query(employeeQuery, [employeeId]);

        if (employeeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Employee not found.",
            });
        }

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
            message: `Employee ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get dropdown active...
const getDropdownActive = async (req, res) => {
    const { is_upcoming_birthday } = req.query;
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let employeeQuery = `SELECT * FROM employee
        WHERE status = 1  `;

        // Upcoming birthdays within next 7 days
        if (is_upcoming_birthday) {
            employeeQuery += `
            AND (
              DAYOFYEAR(dob) BETWEEN DAYOFYEAR(CURDATE())
              AND DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))
              OR
              (
                DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY)) < DAYOFYEAR(CURDATE())
                AND (
                  DAYOFYEAR(dob) >= DAYOFYEAR(CURDATE())
                  OR DAYOFYEAR(dob) <= DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))
                )
              )
            )
          `;
        }
        employeeQuery += " ORDER BY first_name"
        const employeeResult = await connection.query(employeeQuery);
        const employee = employeeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee retrieved successfully.",
            data: employee,
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