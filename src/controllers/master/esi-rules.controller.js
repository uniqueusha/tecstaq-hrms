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
//create ESI Rule...
const createEsiRule = async (req, res) => {
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() : null;
    const employee_pct = req.body.employee_pct ? req.body.employee_pct : null;
    const employer_pct = req.body.employer_pct ? req.body.employer_pct : null;
    const gross_limit = req.body.gross_limit ? req.body.gross_limit : null;
    const rounding_method = req.body.rounding_method ? req.body.rounding_method.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from.trim() : null;
    const effective_to = req.body.effective_to ? req.body.effective_to.trim() : null;
    const created_by = 1
    if (!rule_name) {
        return error422("Rule name is required.", res)
    } else if (!employee_pct) {
        return error422("Employee percentage is required.", res)
    } else if (!employer_pct) {
        return error422("Employer percentage is required.", res)
    } else if (!gross_limit) {
        return error422("Gross limit is required.", res)
    } else if (!rounding_method) {
        return error422("Rounding method is required.", res)
    } else if (!effective_from) {
        return error422("Effective from is required.", res)
    } else if (!effective_to) {
        return error422("Effective to is required.", res)
    }
    //is exist rule name
    let isRuleNameQuery = "SELECT * FROM esi_rules WHERE rule_name = ? ";
    let isRuleNameResult = await pool.query(isRuleNameQuery,[rule_name]);
    if (isRuleNameResult[0].length>0) {
       return error422("Rule name already exists.", res);
    }
    
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert component type
        const insertQuery = ` INSERT INTO esi_rules  (rule_name, employee_pct, employer_pct, gross_limit, rounding_method, effective_from, effective_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?) `;
        await connection.query(insertQuery, [ rule_name, employee_pct, employer_pct, gross_limit, rounding_method, effective_from, effective_to, created_by ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "ESI Rule created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get ESI Rule...
const getEsiRules = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getEsiRuleQuery = " SELECT * FROM esi_rules WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM esi_rules WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getEsiRuleQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getEsiRuleQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getEsiRuleQuery += ` AND (LOWER(esi_rule) LIKE '%${lowercaseKey}%' || LOWER(rounding_method) LIKE '%${lowercaseKey}%') `;
                countQuery += ` AND (LOWER(esi_rule) LIKE '%${lowercaseKey}%' || LOWER(rounding_method) LIKE '%${lowercaseKey}%') `;
            }
        }
        getEsiRuleQuery += ` ORDER BY cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getEsiRuleQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getEsiRuleQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"ESI Rule retrived successfully",
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
//ESI Rule by id
const getEsiRule = async (req, res) => {
    const esiRuleId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const esiRuleQuery = `SELECT * FROM esi_rules
        WHERE esi_rule_id = ? `;
        const esiRuleResult = await connection.query(esiRuleQuery, [esiRuleId]);

        if (esiRuleResult[0].length == 0) {
            return error422("ESI Rule Not Found.", res);
        }
        const esiRule = esiRuleResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "ESI Retrived Successfully",
            data: esiRule
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update ESI Rule
const updateEsiRule = async (req, res) => {
    const esiRuleId = parseInt(req.params.id);
    const rule_name = req.body.rule_name ? req.body.rule_name.trim() : null;
    const employee_pct = req.body.employee_pct ? req.body.employee_pct : null;
    const employer_pct = req.body.employer_pct ? req.body.employer_pct : null;
    const gross_limit = req.body.gross_limit ? req.body.gross_limit : null;
    const rounding_method = req.body.rounding_method ? req.body.rounding_method.trim() : null;
    const effective_from = req.body.effective_from ? req.body.effective_from.trim() : null;
    const effective_to = req.body.effective_to ? req.body.effective_to.trim() : null;
    const created_by = 1
    if (!rule_name) {
        return error422("Rule name is required.", res)
    } else if (!employee_pct) {
        return error422("Employee percentage is required.", res)
    } else if (!employer_pct) {
        return error422("Employer percentage is required.", res)
    } else if (!gross_limit) {
        return error422("Gross limit is required.", res)
    } else if (!rounding_method) {
        return error422("Rounding method is required.", res)
    } else if (!effective_from) {
        return error422("Effective from is required.", res)
    } else if (!effective_to) {
        return error422("Effective to is required.", res)
    }
    // Check if esi rule exists
    const esiRuleQuery = "SELECT * FROM esi_rules WHERE esi_rule_id  = ?";
    const esiRuleResult = await pool.query(esiRuleQuery, [esiRuleId]);
    if (esiRuleResult[0].length == 0) {
        return error422("ESI rule Not Found.", res);
    }
    // Check if the provided ESI rule exists
    const existingEsiRuleQuery = "SELECT * FROM esi_rules WHERE rule_name = ? AND esi_rule_id !=? ";
    const existingEsiRuleResult = await pool.query(existingEsiRuleQuery, [rule_name, esiRuleId]);
    if (existingEsiRuleResult[0].length > 0) {
        return error422("ESI Rule already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the ESI rule record with new data
        const updateQuery = `
            UPDATE esi_rules
            SET rule_name = ?, employee_pct = ?, employer_pct = ?, gross_limit = ?, rounding_method = ?, effective_from = ?, effective_to = ?, created_by = ?
            WHERE esi_rule_id = ?
        `;
        await connection.query(updateQuery, [rule_name, employee_pct, employer_pct, gross_limit, rounding_method, effective_from, effective_to, created_by, esiRuleId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "ESI Rule updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of ESI Rule...
const onStatusChange = async (req, res) => {
    const esiRuleId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the ESI Rule exists
        const esiRuleQuery = "SELECT * FROM esi_rules WHERE esi_rule_id = ? ";
        const esiRuleResult = await connection.query(esiRuleQuery, [esiRuleId]);

        if (esiRuleResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "ESI Rule not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the ESI rule status
        const updateQuery = `
            UPDATE esi_rules
            SET status = ?
            WHERE esi_rule_id = ?`;
        await connection.query(updateQuery, [status, esiRuleId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `ESI Rule ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get ESI Rule active...
const getEsiRuleWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let esiRuleQuery = `SELECT * FROM esi_rules
        WHERE status = 1  `;
        esiRuleQuery +=" ORDER BY rule_name"
        const esiRuleResult = await connection.query(esiRuleQuery);
        const esiRule = esiRuleResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "ESI Rule retrieved successfully.",
            data: esiRule,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createEsiRule,
    getEsiRules,
    getEsiRule,
    updateEsiRule,
    onStatusChange,
    getEsiRuleWma,
}