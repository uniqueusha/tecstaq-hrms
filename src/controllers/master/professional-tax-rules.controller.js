const pool = require('../../common/db');
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

//create Professional Tax rules
const createProfessionalTaxRules = async (req, res)=>{
    const state_id = req.body.state_id ? req.body.state_id :'';
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() :'';
    const description  = req.body.description  ? req.body.description.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from :'';
    const effective_to = req.body.effective_to ? req.body.effective_to : null;
    const user_id = req.user?.user_id;

    if (!state_id) {
        return error422("State is required.", res);
    } else if (!rule_name) {
        return error422("Rule name is required.", res);
    } else if (!effective_from) {
        return error422("Effective from is required.", res);
    } else if (!effective_to) {
        return error422("Effective to is required.", res);
    }   

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        // // Check if the rule name exists and is active
        const isRuleNameExist = "SELECT * FROM professional_tax_rules WHERE rule_name = ?";
        const isRuleNameResult = await pool.query(isRuleNameExist,[ rule_name]);
        if (isRuleNameResult[0].length > 0) {
            return error422("Rule Name is already is exist.", res);
        }

        const insertQuery = "INSERT INTO professional_tax_rules (state_id, rule_name, description , effective_from, effective_to, created_by)VALUES(?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[state_id, rule_name, description , effective_from, effective_to, user_id]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Professional tax rules created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all Professional tax rules list
const getAllProfessionalTaxRules = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getProfessionalTaxRulesQuery = `SELECT pr.*, s.state_name FROM professional_tax_rules pr
        LEFT JOIN state s
        ON s.state_id = pr.state_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM professional_tax_rules pr 
        LEFT JOIN state s
        ON s.state_id = pr.state_id
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getProfessionalTaxRulesQuery += ` AND pr.status = 1`;
                countQuery += ` AND pr.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getProfessionalTaxRulesQuery += ` AND pr.status = 0`;
                countQuery += ` AND pr.status = 0`;
            } else {
                getProfessionalTaxRulesQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%')`;
            }
        }
        getProfessionalTaxRulesQuery += " ORDER BY pr.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getProfessionalTaxRulesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getProfessionalTaxRulesQuery);
        const professionalTaxRules = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Professional Tax Rules retrieved successfully",
            data: professionalTaxRules,
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

//Professional Tax Rules  by id
const getprofessionalTaxRule = async (req, res) => {
    const professionalTaxRulesId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const professionalTaxRulesQuery = `SELECT pr.*, s.state_name FROM professional_tax_rules pr
        LEFT JOIN state s
        ON s.state_id = pr.state_id
        WHERE pr.pt_rule_id = ?`;
        const professionalTaxRulesResult = await connection.query(professionalTaxRulesQuery, [professionalTaxRulesId]);
        if (professionalTaxRulesResult[0].length == 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }
        const professionalTaxRules = professionalTaxRulesResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Rules Retrived Successfully",
            data: professionalTaxRules
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update professional tax rules
const updateProfessionalTaxRules = async (req, res) => {
    const professionalTaxRulesId = parseInt(req.params.id);
    const state_id = req.body.state_id ? req.body.state_id :'';
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() :'';
    const description  = req.body.description  ? req.body.description.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from :'';
    const effective_to = req.body.effective_to ? req.body.effective_to : null;
    const user_id = req.user?.user_id;

    if (!state_id) {
        return error422("State is required.", res);
    } else if (!rule_name) {
        return error422("Rule name is required.", res);
    } else if (!effective_from) {
        return error422("Effective from is required.", res);
    } else if (!effective_to) {
        return error422("Effective to is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // // Check if the rule name exists and is active
        const isRuleNameExist = "SELECT * FROM professional_tax_rules WHERE rule_name = ? AND pt_rule_id !=?";
        const isRuleNameResult = await pool.query(isRuleNameExist,[ rule_name, professionalTaxRulesId]);
        if (isRuleNameResult[0].length > 0) {
            return error422("Rule Name is already is exist.", res);
        }

        // Check if professional_tax_rules exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await connection.query(professionalTaxRulesQuery, [professionalTaxRulesId]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }

        // Update the professional_tax_rules Rules record with new data
        const updateQuery = `
            UPDATE professional_tax_rules
            SET state_id = ?, rule_name = ?, description = ?, effective_from = ?, effective_to = ?
            WHERE pt_rule_id = ?
        `;

        await connection.query(updateQuery, [ state_id, rule_name, description , effective_from, effective_to, professionalTaxRulesId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Rules updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of professional Tax Rules...
const onStatusChange = async (req, res) => {
    const professionalTaxRulesId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the professional Tax Rules Id exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id = ? ";
        const professionalTaxRulesResult = await connection.query(professionalTaxRulesQuery, [professionalTaxRulesId]);

        if (professionalTaxRulesResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Professional Tax Rules not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the professional Tax Rules
        const updateQuery = `
            UPDATE professional_tax_rules
            SET status = ?
            WHERE pt_rule_id = ?
        `;

        await connection.query(updateQuery, [status, professionalTaxRulesId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Professional Tax Rules ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get professional Tax rule active...
const getProfessionalTaxRulesIdWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const professionalTaxRulesIdQuery = `SELECT pr.*, s.state_name FROM professional_tax_rules pr
        LEFT JOIN state s
        ON s.state_id = pr.state_id
        WHERE pr.status = 1 `;

        const professionalTaxRulesIdResult = await connection.query(professionalTaxRulesIdQuery);
        const professionalTaxRules = professionalTaxRulesIdResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Rules retrieved successfully.",
            data: professionalTaxRules,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

//download Provident Fund rule
const getProvidentFundRulesDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getProfessionalTaxRulesQuery = `SELECT pr.*, s.state_name FROM professional_tax_rules pr
        LEFT JOIN state s
        ON s.state_id = pr.state_id
        WHERE 1 `;
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getProfessionalTaxRulesQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%')`;
            }
        getProfessionalTaxRulesQuery += " ORDER BY pr.cts DESC";

        let result = await connection.query(getProfessionalTaxRulesQuery);
        let professionalTaxRules = result[0];

        if (professionalTaxRules.length === 0) {
            return error422("No data found.", res);
        }

        professionalTaxRules = professionalTaxRules.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Rule": item.rule_name,
            "State": item.state_name,
            "From": item.effective_from,
            "To": item.effective_to,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(professionalTaxRules);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "professionalTaxRulesInfo");

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
    createProfessionalTaxRules,
    getAllProfessionalTaxRules,
    getprofessionalTaxRule,
    updateProfessionalTaxRules,
    onStatusChange,
    getProfessionalTaxRulesIdWma,
    getProvidentFundRulesDownload
}
