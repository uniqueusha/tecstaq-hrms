const pool = require('../../common/db');
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

//create salary structure statutory_rules
const createSalaryStructureStatutoryRules = async (req, res) => {
    const salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : '';
    let pf_applicable = req.body.pf_applicable ? req.body.pf_applicable : 0;
    let pf_rule_id = req.body.pf_rule_id ? req.body.pf_rule_id : null;
    let pf_wage_limit = req.body.pf_wage_limit ? req.body.pf_wage_limit : null;
    let esi_applicable = req.body.esi_applicable ? req.body.esi_applicable : 0;
    let esi_rule_id = req.body.esi_rule_id ? req.body.esi_rule_id : null;
    let esi_gross_limit = req.body.esi_gross_limit ? req.body.esi_gross_limit : null;
    let pt_applicable = req.body.pt_applicable ? req.body.pt_applicable : 0;
    let pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id : null;
    let user_id = 1;

    if (!salary_structure_id) {
        return error422("Salary structure id is required.", res);
    } else if (!pf_applicable && pf_applicable != 0) {
        return error422("Pf applicable  is required.", res);
    } else if (!esi_applicable && esi_applicable != 0) {
        return error422("esi applicable is required.", res);
    } else if (!pt_applicable && pt_applicable != 0) {
        return error422("Pt applicable is required.", res);
    }
    if (pf_applicable == 0) {
        pf_rule_id = 0, pf_wage_limit = 0
    } else {
        if (!pf_rule_id) {
            return error422("PF Rule is required.", res);
        } else if (!pf_wage_limit) {
            return error422("PF wage limit is required.", res);
        }
    }
    if (esi_applicable == 0) {
        esi_rule_id = 0, esi_gross_limit = 0
    } else {
        if (!esi_rule_id) {
            return error422("ESI Rule is required.", res);
        } else if (!esi_gross_limit) {
            return error422("ESI gross limit is required.", res);
        }
    }
    if (pt_applicable == 0) {
        pt_rule_id = 0
    } else {
        if (!pt_rule_id) {
            return error422("Professional Tax Rule is required.", res);
        }
    }

    // Check if the salary_structure exists and is active
    const isSalaryStructureExist = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    const isSalaryStructureResult = await pool.query(isSalaryStructureExist, [salary_structure_id]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found.", res);
    }

    if (pf_rule_id) {
        //  Check if provident fund rule exists
        const providentFundRulesQuery = "SELECT * FROM provident_fund_rules WHERE pf_rule_id  = ?";
        const providentFundRulesResult = await pool.query(providentFundRulesQuery, [pf_rule_id]);
        if (providentFundRulesResult[0].length === 0) {
            return error422("Provident Fund Rules Not Found.", res);
        }
    }
    if (esi_rule_id) {
        //  Check if esi rule exists
        const esiRulesQuery = "SELECT * FROM esi_rules WHERE esi_rule_id  = ?";
        const esiRulesResult = await pool.query(esiRulesQuery, [esi_rule_id]);
        if (esiRulesResult[0].length === 0) {
            return error422("ESI Rules Not Found.", res);
        }
    }
    if (pt_rule_id) {
        //  Check if professional tax rule exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await pool.query(professionalTaxRulesQuery, [pt_rule_id]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }
    }
    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO salary_structure_statutory_rules (salary_structure_id, pf_applicable , pf_rule_id, pf_wage_limit, esi_applicable, esi_rule_id, esi_gross_limit, pt_applicable, pt_rule_id, created_by)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery, [salary_structure_id, pf_applicable, pf_rule_id, pf_wage_limit, esi_applicable, esi_rule_id, esi_gross_limit, pt_applicable, pt_rule_id, user_id]);

        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Salary Structure Statutory Rules created successfully."
        })
    } catch (error) {
        console.log(error);
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
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
        let getSalaryStructureStatutoryRulesQuery = `SELECT sssr.*, ss.structure_name, pf.rule_name AS provident_fund_rule_name, esi.rule_name AS esi_rule_name, pt.rule_name AS professional_tax_rule_name  FROM salary_structure_statutory_rules sssr
        LEFT JOIN salary_structure ss 
        ON ss.salary_structure_id = sssr.salary_structure_id
        LEFT JOIN provident_fund_rules pf 
        ON pf.pf_rule_id = sssr.pf_rule_id
        LEFT JOIN esi_rules esi
        ON esi.esi_rule_id = sssr.esi_rule_id
        LEFT JOIN professional_tax_rules pt 
        ON pt.pt_rule_id = sssr.pt_rule_id
        WHERE 1 `;
        let countQuery = `SELECT COUNT(*) AS total FROM salary_structure_statutory_rules sssr 
        LEFT JOIN salary_structure ss 
        ON ss.salary_structure_id = sssr.salary_structure_id
        LEFT JOIN provident_fund_rules pf 
        ON pf.pf_rule_id = sssr.pf_rule_id
        LEFT JOIN esi_rules esi
        ON esi.esi_rule_id = sssr.esi_rule_id
        LEFT JOIN professional_tax_rules pt 
        ON pt.pt_rule_id = sssr.pt_rule_id
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
                getSalaryStructureStatutoryRulesQuery += ` AND (LOWER(ss.structure_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(ss.structure_name) LIKE '%${lowercaseKey}%')`;
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
            message: "Salary Structure Statutory Rules retrieved successfully",
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

//salary structure statutory rules by id
const getSalaryStructureStatutoryRule = async (req, res) => {
    const salaryStructureStatutoryRulesId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const salaryStructureStatutoryRulesQuery = `SELECT sssr.*, ss.structure_name, pf.rule_name AS provident_fund_rule_name, esi.rule_name AS esi_rule_name, pt.rule_name AS professional_tax_rule_name  FROM salary_structure_statutory_rules sssr
        LEFT JOIN salary_structure ss 
        ON ss.salary_structure_id = sssr.salary_structure_id
        LEFT JOIN provident_fund_rules pf 
        ON pf.pf_rule_id = sssr.pf_rule_id
        LEFT JOIN esi_rules esi
        ON esi.esi_rule_id = sssr.esi_rule_id
        LEFT JOIN professional_tax_rules pt 
        ON pt.pt_rule_id = sssr.pt_rule_id
        WHERE sssr.statutory_rule_id = ?`;
        const salaryStructureStatutoryRulesResult = await connection.query(salaryStructureStatutoryRulesQuery, [salaryStructureStatutoryRulesId]);
        if (salaryStructureStatutoryRulesResult[0].length == 0) {
            return error422("Salary Structure Statutory Rules Not Found.", res);
        }
        const salaryStructureStatutoryRules = salaryStructureStatutoryRulesResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Salary Structure Statutory Rules Retrived Successfully",
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
    let salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : '';
    let pf_applicable = req.body.pf_applicable ? req.body.pf_applicable : 0;
    let pf_rule_id = req.body.pf_rule_id ? req.body.pf_rule_id : null;
    let pf_wage_limit = req.body.pf_wage_limit ? req.body.pf_wage_limit : null;
    let esi_applicable = req.body.esi_applicable ? req.body.esi_applicable : 0;
    let esi_rule_id = req.body.esi_rule_id ? req.body.esi_rule_id : null;
    let esi_gross_limit = req.body.esi_gross_limit ? req.body.esi_gross_limit : null;
    let pt_applicable = req.body.pt_applicable ? req.body.pt_applicable : 0;
    let pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id : null;
    let user_id = 1;

    if (!salary_structure_id) {
        return error422("Salary structure id is required.", res);
    } else if (!pf_applicable && pf_applicable != 0) {
        return error422("Pf applicable  is required.", res);
    } else if (!esi_applicable && esi_applicable != 0) {
        return error422("esi applicable is required.", res);
    } else if (!pt_applicable && pt_applicable != 0) {
        return error422("Pt applicable is required.", res);
    }
    if (pf_applicable == 0) {
        pf_rule_id = 0, pf_wage_limit = 0
    } else {
        if (!pf_rule_id) {
            return error422("PF Rule is required.", res);
        } else if (!pf_wage_limit) {
            return error422("PF wage limit is required.", res);
        }
    }
    if (esi_applicable == 0) {
        esi_rule_id = 0, esi_gross_limit = 0
    } else {
        if (!esi_rule_id) {
            return error422("ESI Rule is required.", res);
        } else if (!esi_gross_limit) {
            return error422("ESI gross limit is required.", res);
        }
    }
    if (pt_applicable == 0) {
        pt_rule_id = 0
    } else {
        if (!pt_rule_id) {
            return error422("Professional Tax Rule is required.", res);
        }
    }

    // Check if salary Structure Statutory Rules exists
    const salaryStructureStatutoryRulesQuery = "SELECT * FROM salary_structure_statutory_rules WHERE statutory_rule_id  = ?";
    const salaryStructureStatutoryRulesResult = await pool.query(salaryStructureStatutoryRulesQuery, [salaryStructureStatutoryRulesId]);
    if (salaryStructureStatutoryRulesResult[0].length === 0) {
        return error422("Salary Structure Statutory Rules Not Found.", res);
    }

    // Check if the salary_structure exists and is active
    const isSalaryStructureExist = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    const isSalaryStructureResult = await pool.query(isSalaryStructureExist, [salary_structure_id]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found.", res);
    }

    if (pf_rule_id) {
        //  Check if provident fund rule exists
        const providentFundRulesQuery = "SELECT * FROM provident_fund_rules WHERE pf_rule_id  = ?";
        const providentFundRulesResult = await pool.query(providentFundRulesQuery, [pf_rule_id]);
        if (providentFundRulesResult[0].length === 0) {
            return error422("Provident Fund Rules Not Found.", res);
        }
    }
    if (esi_rule_id) {
        //  Check if esi rule exists
        const esiRulesQuery = "SELECT * FROM esi_rules WHERE esi_rule_id  = ?";
        const esiRulesResult = await pool.query(esiRulesQuery, [esi_rule_id]);
        if (esiRulesResult[0].length === 0) {
            return error422("ESI Rules Not Found.", res);
        }
    }
    if (pt_rule_id) {
        //  Check if professional tax rule exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await pool.query(professionalTaxRulesQuery, [pt_rule_id]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        // Update the salary Structure Statutory Rules record with new data
        const updateQuery = `
            UPDATE salary_structure_statutory_rules
            SET salary_structure_id = ?, pf_applicable = ?, pf_rule_id = ?, pf_wage_limit = ?, esi_applicable = ?, esi_rule_id = ?, esi_gross_limit = ?, pt_applicable =?, pt_rule_id = ?, created_by = ?
            WHERE statutory_rule_id = ?
        `;

        await connection.query(updateQuery, [salary_structure_id, pf_applicable, pf_rule_id, pf_wage_limit, esi_applicable, esi_rule_id, esi_gross_limit, pt_applicable, pt_rule_id, user_id, salaryStructureStatutoryRulesId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: " Salary Structure Statutory Rules updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of salary structure statutory rules...
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
            message: `Salary Structure Statutory Rules ${statusMessage} successfully.`,
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
            message: "Salary Structure Statutory Rules retrieved successfully.",
            data: salaryStructureStatutoryRules,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
//download salary Structure Statutory Rules
const getSalaryStructureStatutoryRulesDownload = async (req, res) => {

    let { key} = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

    let getSalaryStructureStatutoryRulesQuery = `SELECT sssr.*, ss.structure_name, pf.rule_name AS provident_fund_rule_name, esi.rule_name AS esi_rule_name, pt.rule_name AS professional_tax_rule_name  FROM salary_structure_statutory_rules sssr
        LEFT JOIN salary_structure ss 
        ON ss.salary_structure_id = sssr.salary_structure_id
        LEFT JOIN provident_fund_rules pf 
        ON pf.pf_rule_id = sssr.pf_rule_id
        LEFT JOIN esi_rules esi
        ON esi.esi_rule_id = sssr.esi_rule_id
        LEFT JOIN professional_tax_rules pt 
        ON pt.pt_rule_id = sssr.pt_rule_id
        WHERE 1 `;
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getSalaryStructureStatutoryRulesQuery += ` AND (LOWER(ss.structure_name) LIKE '%${lowercaseKey}%')`;
            }
        getSalaryStructureStatutoryRulesQuery += " ORDER BY sssr.cts DESC";

        let result = await connection.query(getSalaryStructureStatutoryRulesQuery);
        let salaryStructureStatutoryRules = result[0];

        if (salaryStructureStatutoryRules.length === 0) {
            return error422("No data found.", res);
        }

        salaryStructureStatutoryRules = salaryStructureStatutoryRules.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Structure name": item.structure_name,
            "PF": item.pf_applicable === 1 ? "Yes" : "No",
            "ESI": item.esi_applicable === 1 ? "Yes" : "No",
            "PT": item.pt_applicable === 1 ? "Yes" : "No",
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(salaryStructureStatutoryRules);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "salaryStatutoryRulesInfo");

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
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createSalaryStructureStatutoryRules,
    getAllSalaryStructureStatutoryRules,
    getSalaryStructureStatutoryRule,
    updateSalaryStructureStatutoryRules,
    onStatusChange,
    getSalaryStructureStatutoryRulesIdWma,
    getSalaryStructureStatutoryRulesDownload
}
