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

//create salary structure statutory_rules
const createSalaryStructureStatutoryRules = async (req, res)=>{
    const salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : '';
    const pf_applicable = req.body.pf_applicable ? req.body.pf_applicable :'';
    const pf_employee_pct  = req.body.pf_employee_pct  ? req.body.pf_employee_pct : null;
    const pf_wage_limit = req.body.pf_wage_limit ? req.body.pf_wage_limit : null;
    const esi_applicable = req.body.esi_applicable ? req.body.esi_applicable :'';
    const esi_employee_pct = req.body.esi_employee_pct ? req.body.esi_employee_pct : null;
    const esi_gross_limit = req.body.esi_gross_limit ? req.body.esi_gross_limit : null;
    const pt_applicable = req.body.pt_applicable ? req.body.pt_applicable :'';
    const pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id : null;
    const user_id = req.user?.user_id;

    if (!salary_structure_id) {
        return error422("Salary structure id is required.", res);
    } else if (!pf_applicable) {
        return error422("Pf applicable  is required.", res);
    } else if (!esi_applicable) {
        return error422("esi applicable is required.", res);
    } else if (!pt_applicable) {
        return error422("Pt applicable is required.", res);
    } 

    // Check if the salary_structure exists and is active
    const isSalaryStructureExist = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    const isSalaryStructureResult = await pool.query(isSalaryStructureExist,[ salary_structure_id]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found.", res);
    }

    //  Check if professional_tax_rules exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await pool.query(professionalTaxRulesQuery, [pt_rule_id]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }
    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        const insertQuery = "INSERT INTO salary_structure_statutory_rules (salary_structure_id, pf_applicable, pf_employee_pct , pf_wage_limit, esi_applicable, esi_employee_pct, esi_gross_limit, pt_applicable, pt_rule_id, created_by)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[salary_structure_id, pf_applicable, pf_employee_pct , pf_wage_limit, esi_applicable, esi_employee_pct, esi_gross_limit, pt_applicable, pt_rule_id, user_id]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Salary Structure  Statutory Rules created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all Salary Structure  Statutory Rules list
const getAllSalaryStructureStatutoryRules = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getSalaryStructureStatutoryRulesQuery = `SELECT sssr.*, pr.rule_name FROM salary_structure_statutory_rules sssr
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = sssr.pt_rule_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM salary_structure_statutory_rules sssr 
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = sssr.pt_rule_id
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getSalaryStructureStatutoryRulesQuery += ` AND sssr.status = 1`;
                countQuery += ` AND sssr.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getSalaryStructureStatutoryRulesQuery += ` AND sssr.status = 0`;
                countQuery += ` AND sssr.status = 0`;
            } else {
                getSalaryStructureStatutoryRulesQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%' || LOWER(sssr.pf_employee_pct) LIKE '%${lowercaseKey}%' || LOWER(sssr.pf_wage_limit) LIKE '%${lowercaseKey}%'|| LOWER(sssr.esi_employee_pct) LIKE '%${lowercaseKey}%' || LOWER(sssr.esi_gross_limit) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%' || LOWER(sssr.pf_employee_pct) LIKE '%${lowercaseKey}%' || LOWER(sssr.pf_wage_limit) LIKE '%${lowercaseKey}%' || LOWER(sssr.esi_employee_pct) LIKE '%${lowercaseKey}%' || LOWER(sssr.esi_gross_limit) LIKE '%${lowercaseKey}%')`;
            }
        }
        getSalaryStructureStatutoryRulesQuery += " ORDER BY sssr.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getSalaryStructureStatutoryRulesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getSalaryStructureStatutoryRulesQuery);
        const salaryStructureStatutoryRules = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Salary Structure  Statutory Rules retrieved successfully",
            data: salaryStructureStatutoryRules,
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

//salary_structure_Statutory Rules by id
const getSalaryStructureStatutoryRule = async (req, res) => {
    const salaryStructureStatutoryRulesId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const salaryStructureStatutoryRulesQuery = `SELECT sr.*, pr.rule_name FROM salary_structure_statutory_rules sr
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = sr.pt_rule_id
        WHERE sr.statutory_rule_id = ?`;
        const salaryStructureStatutoryRulesResult = await connection.query(salaryStructureStatutoryRulesQuery, [salaryStructureStatutoryRulesId]);
        if (salaryStructureStatutoryRulesResult[0].length == 0) {
            return error422("Salary Structure Statutory Rules Not Found.", res);
        }
        const salaryStructureStatutoryRules = salaryStructureStatutoryRulesResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Salary  Structure  Statutory Rules Retrived Successfully",
            data: salaryStructureStatutoryRules
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update salary Structure Statutory Rules
const updateSalaryStructureStatutoryRules = async (req, res) => {
    const salaryStructureStatutoryRulesId = parseInt(req.params.id);
    const salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id :'';
    const pf_applicable = req.body.pf_applicable ? req.body.pf_applicable :'';
    const pf_employee_pct  = req.body.pf_employee_pct  ? req.body.pf_employee_pct : null;
    const pf_wage_limit = req.body.pf_wage_limit ? req.body.pf_wage_limit : null;
    const esi_applicable = req.body.esi_applicable ? req.body.esi_applicable :'';
    const esi_employee_pct = req.body.esi_employee_pct ? req.body.esi_employee_pct : null;
    const esi_gross_limit = req.body.esi_gross_limit ? req.body.esi_gross_limit : null;
    const pt_applicable = req.body.pt_applicable ? req.body.pt_applicable :'';
    const pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id : null;
    const user_id = req.user?.user_id;

    if (!salary_structure_id) {
        return error422("Salary structure id is required.", res);
    } else if (!pf_applicable) {
        return error422("Pf applicable  is required.", res);
    } else if (!esi_applicable) {
        return error422("esi applicable is required.", res);
    } else if (!pt_applicable) {
        return error422("Pt applicable is required.", res);
    } 


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        // Check if the salary_structure exists and is active
        const isSalaryStructureExist = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
        const isSalaryStructureResult = await connection.query(isSalaryStructureExist,[ salary_structure_id]);
        if (isSalaryStructureResult[0].length == 0) {
            return error422("Salary Structure Not Found.", res);
        }

        //  Check if professional_tax_rules exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await connection.query(professionalTaxRulesQuery, [professionalTaxRulesId]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }
        // Check if salary Structure Statutory Rules exists
        const salaryStructureStatutoryRulesQuery = "SELECT * FROM salary_structure_statutory_rules WHERE statutory_rule_id  = ?";
        const salaryStructureStatutoryRulesResult = await connection.query(salaryStructureStatutoryRulesQuery, [salaryStructureStatutoryRulesId]);
        if (salaryStructureStatutoryRulesResult[0].length === 0) {
            return error422("Salary Structure Statutory Rules Not Found.", res);
        }

        // Update the salary Structure Statutory Rules record with new data
        const updateQuery = `
            UPDATE salary_structure_statutory_rules
            SET salary_structure_id = ?, pf_applicable = ?, pf_employee_pct = ?, pf_wage_limit = ?, esi_applicable = ?, esi_employee_pct = ?, esi_gross_limit = ?, pt_applicable =?, pt_rule_id = ?, created_by = ?
            WHERE statutory_rule_id = ?
        `;

        await connection.query(updateQuery, [ salary_structure_id, pf_applicable, pf_employee_pct , pf_wage_limit, esi_applicable, esi_employee_pct, esi_gross_limit, pt_applicable, pt_rule_id, user_id, salaryStructureStatutoryRulesId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: " Salary Structure  Statutory Rules updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of salary_structure_statutory_rules...
const onStatusChange = async (req, res) => {
    const salaryStructureStatutoryRulesId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the salary_structure_statutory_rules exists
        const salaryStructureStatutoryRulesQuery = "SELECT * FROM salary_structure_statutory_rules WHERE statutory_rule_id = ? ";
        const salaryStructureStatutoryRulesResult = await connection.query(salaryStructureStatutoryRulesQuery, [salaryStructureStatutoryRulesId]);

        if (salaryStructureStatutoryRulesResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Salary Structure  Statutory Rules not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the salary Structure Statutory Rules
        const updateQuery = `
            UPDATE salary_structure_statutory_rules
            SET status = ?
            WHERE statutory_rule_id = ?
        `;

        await connection.query(updateQuery, [status, salaryStructureStatutoryRulesId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Salary Structure  Statutory Rules ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get salary Structure Statutory Rules active...
const getSalaryStructureStatutoryRulesIdWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const salaryStructureStatutoryRulesIdQuery = `SELECT * FROM salary_structure_statutory_rules
        WHERE status = 1 `;

        const salaryStructureStatutoryRulesIdResult = await connection.query(salaryStructureStatutoryRulesIdQuery);
        const salaryStructureStatutoryRules = salaryStructureStatutoryRulesIdResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary Structure  Statutory Rules retrieved successfully.",
            data: salaryStructureStatutoryRules,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createSalaryStructureStatutoryRules,
    getAllSalaryStructureStatutoryRules,
    getSalaryStructureStatutoryRule,
    updateSalaryStructureStatutoryRules,
    onStatusChange,
    getSalaryStructureStatutoryRulesIdWma
}
