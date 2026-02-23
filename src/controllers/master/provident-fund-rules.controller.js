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

//create provident fund rule
const createProvidentFundRule = async (req, res)=>{
    const state_id = req.body.state_id ? req.body.state_id :'';
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() :'';
    const description  = req.body.description  ? req.body.description.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from :'';
    const effective_to = req.body.effective_to ? req.body.effective_to : null;
    const user_id = 1
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
        const isRuleNameExist = "SELECT * FROM provident_fund_rules WHERE rule_name = ?";
        const isRuleNameResult = await pool.query(isRuleNameExist,[ rule_name]);
        if (isRuleNameResult[0].length > 0) {
            return error422("Rule Name is already is exist.", res);
        }

        const insertQuery = "INSERT INTO provident_fund_rules (state_id, rule_name, description , effective_from, effective_to, created_by)VALUES(?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[state_id, rule_name, description , effective_from, effective_to, user_id]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Provident Fund Rule created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all provident fund rule list
const getAllProvidentFundRules = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getProvidentFundRulesQuery = `SELECT pf.*, s.state_name FROM provident_fund_rules pf
        LEFT JOIN state s
        ON s.state_id = pf.state_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM provident_fund_rules pf 
        LEFT JOIN state s
        ON s.state_id = pf.state_id
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getProvidentFundRulesQuery += ` AND pf.status = 1`;
                countQuery += ` AND pf.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getProvidentFundRulesQuery += ` AND pf.status = 0`;
                countQuery += ` AND pf.status = 0`;
            } else {
                getProvidentFundRulesQuery += ` AND (LOWER(pf.rule_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(pf.rule_name) LIKE '%${lowercaseKey}%')`;
            }
        }
        getProvidentFundRulesQuery += " ORDER BY pf.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getProvidentFundRulesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getProvidentFundRulesQuery);
        const providentFundRules = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Provident Fund Rules retrieved successfully",
            data: providentFundRules,
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

//Provident fund Rules  by id
const getProvidentFundRule = async (req, res) => {
    const providentFundRulesId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const providentFundRulesQuery = `SELECT pf.*, s.state_name FROM provident_fund_rules pf
        LEFT JOIN state s
        ON s.state_id = pf.state_id
        WHERE pf.pf_rule_id = ?`;
        const providentFundRulesResult = await connection.query(providentFundRulesQuery, [providentFundRulesId]);
        if (providentFundRulesResult[0].length == 0) {
            return error422("Provident Fund Rules Not Fund.", res);
        }
        const providentFundRules = providentFundRulesResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Provident Fund Rules Retrived Successfully",
            data: providentFundRules
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update provident fund rule
const updateProvidentFundRule = async (req, res) => {
    const providentFundRulesId = parseInt(req.params.id);
    const state_id = req.body.state_id ? req.body.state_id :'';
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() :'';
    const description  = req.body.description  ? req.body.description.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from :'';
    const effective_to = req.body.effective_to ? req.body.effective_to : null;
    const user_id = 1

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
        const isRuleNameExist = "SELECT * FROM provident_fund_rules WHERE rule_name = ? AND pf_rule_id !=?";
        const isRuleNameResult = await pool.query(isRuleNameExist,[ rule_name, providentFundRulesId]);
        if (isRuleNameResult[0].length > 0) {
            return error422("Rule Name is already is exist.", res);
        }

        // Check if provident fund rule exists
        const providentFundRulesQuery = "SELECT * FROM provident_fund_rules WHERE pf_rule_id  = ?";
        const providentFundRulesResult = await connection.query(providentFundRulesQuery, [providentFundRulesId]);
        if (providentFundRulesResult[0].length === 0) {
            return error422("Provident Fund Rules Not Fund.", res);
        }

        // Update the provident fund Rules record with new data
        const updateQuery = `
            UPDATE provident_fund_rules
            SET state_id = ?, rule_name = ?, description = ?, effective_from = ?, effective_to = ?
            WHERE pf_rule_id = ?
        `;

        await connection.query(updateQuery, [ state_id, rule_name, description , effective_from, effective_to, providentFundRulesId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Provident Fund Rules updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of provident fund Rules...
const onStatusChange = async (req, res) => {
    const providentFundRulesId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the Provident fund Rules Id exists
        const providentFundRulesQuery = "SELECT * FROM provident_fund_rules WHERE pf_rule_id = ? ";
        const providentFundRulesResult = await connection.query(providentFundRulesQuery, [providentFundRulesId]);

        if (providentFundRulesResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Provident Fund Rules not fund.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the provident fund Rules
        const updateQuery = `
            UPDATE provident_fund_rules
            SET status = ?
            WHERE pf_rule_id = ?
        `;

        await connection.query(updateQuery, [status, providentFundRulesId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Provident Fund Rules ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get Provident Fund rule active...
const getProvidentFundRulesIdWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const providentFundRulesIdQuery = `SELECT pf.*, s.state_name FROM provident_fund_rules pf
        LEFT JOIN state s
        ON s.state_id = pf.state_id
        WHERE pf.status = 1 `;

        const providentFundRulesIdResult = await connection.query(providentFundRulesIdQuery);
        const providentFundRules = providentFundRulesIdResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Provident Fund Rules retrieved successfully.",
            data: providentFundRules,
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

        let getProvidentFundRulesQuery = `SELECT pf.*, s.state_name FROM provident_fund_rules pf
            LEFT JOIN state s
            ON s.state_id = pf.state_id
            WHERE 1 `;
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getProvidentFundRulesQuery += ` AND (LOWER(pf.rule_name) LIKE '%${lowercaseKey}%')`;
            }
        getProvidentFundRulesQuery += " ORDER BY pf.cts DESC";

        let result = await connection.query(getProvidentFundRulesQuery);
        let providentFundRules = result[0];

        if (providentFundRules.length === 0) {
            return error422("No data found.", res);
        }

        providentFundRules = providentFundRules.map((item, index) => ({
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
        const worksheet = xlsx.utils.json_to_sheet(providentFundRules);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "providentFundRulesInfo");

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
    createProvidentFundRule,
    getAllProvidentFundRules,
    getProvidentFundRule,
    updateProvidentFundRule,
    onStatusChange,
    getProvidentFundRulesIdWma,
    getProvidentFundRulesDownload
}
