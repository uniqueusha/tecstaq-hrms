const pool = require('../../../db');
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

//create Professional Tax slabs
const createProfessionalTaxSlabs = async (req, res)=>{
    const pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id :'';
    const salary_from = req.body.salary_from ? req.body.salary_from :0;
    const salary_to  = req.body.salary_to  ? req.body.salary_to : 0;
    const tax_amount = req.body.tax_amount ? req.body.tax_amount :'';
    const applicable_month = req.body.applicable_month ? req.body.applicable_month.trim() : null;
    const user_id = req.user?.user_id;

    if (!pt_rule_id) {
        return error422("Pt rule id is required.", res);
    } else if (!salary_from&& salary_from != 0) {
        return error422("Salary from is required.", res);
    } else if (!tax_amount && tax_amount != 0) {
        return error422("Tax amount is required.", res);
    } 

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        // // Check if the professional_tax_rules exists and is active
        const isProfessionalRuleExist = "SELECT * FROM professional_tax_rules WHERE pt_rule_id = ?";
        const isProfessionalRuleResult = await connection.query(isProfessionalRuleExist,[ pt_rule_id]);
        if (isProfessionalRuleResult[0].length == 0) {
            return error422("Professional Rule Not Found.", res);
        }
        const insertQuery = "INSERT INTO professional_tax_slabs (pt_rule_id, salary_from, salary_to , tax_amount, applicable_month, created_by)VALUES(?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[pt_rule_id, salary_from, salary_to , tax_amount, applicable_month, user_id]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Professional tax slabs created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all Professional tax slabs list
const getAllProfessionalTaxSlabs = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getProfessionalTaxSlabsQuery = `SELECT ps.*, pr.rule_name FROM professional_tax_slabs ps
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = ps.pt_rule_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM professional_tax_slabs ps 
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = ps.pt_rule_id
        WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getProfessionalTaxSlabsQuery += ` AND ps.status = 1`;
                countQuery += ` AND ps.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getProfessionalTaxSlabsQuery += ` AND ps.status = 0`;
                countQuery += ` AND ps.status = 0`;
            } 
            else {
                getProfessionalTaxSlabsQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_from) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_to) LIKE '%${lowercaseKey}%' || LOWER(ps.tax_amount) LIKE '%${lowercaseKey}%' || LOWER(ps.applicable_month) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND  (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_from) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_to) LIKE '%${lowercaseKey}%' || LOWER(ps.tax_amount) LIKE '%${lowercaseKey}%' || LOWER(ps.applicable_month) LIKE '%${lowercaseKey}%')`;
            }
        }
        getProfessionalTaxSlabsQuery += " ORDER BY ps.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getProfessionalTaxSlabsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getProfessionalTaxSlabsQuery);
        const professionalTaxSlabs = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Professional Tax Slabs retrieved successfully",
            data: professionalTaxSlabs,
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

//Professional Tax Slab  by id
const getprofessionalTaxSlab = async (req, res) => {
    const professionalTaxSlabsId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const professionalTaxSlabsQuery = `SELECT ps.*, pr.rule_name FROM professional_tax_slabs ps
        LEFT JOIN professional_tax_rules pr ON  pr.pt_rule_id = ps.pt_rule_id
        WHERE ps.pt_slab_id = ?`;
        const professionalTaxSlabsResult = await connection.query(professionalTaxSlabsQuery, [professionalTaxSlabsId]);
        if (professionalTaxSlabsResult[0].length == 0) {
            return error422("Professional Tax Slabs Not Found.", res);
        }
        const professionalTaxSlabs = professionalTaxSlabsResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Slab Retrived Successfully",
            data: professionalTaxSlabs
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update professional tax Slabs
const updateProfessionalTaxSlabs = async (req, res) => {
    const professionalTaxSlabsId = parseInt(req.params.id);
    const pt_rule_id = req.body.pt_rule_id ? req.body.pt_rule_id :'';
    const salary_from = req.body.salary_from ? req.body.salary_from :0;
    const salary_to  = req.body.salary_to  ? req.body.salary_to : 0;
    const tax_amount = req.body.tax_amount ? req.body.tax_amount :'';
    const applicable_month = req.body.applicable_month ? req.body.applicable_month.trim() : null;
    const user_id = req.user?.user_id;

    if (!pt_rule_id) {
        return error422("Pt rule id is required.", res);
    } else if (!salary_from && salary_from != 0) {
        return error422("Salary from is required.", res);
    } else if (!tax_amount && tax_amount != 0) {
        return error422("Tax amount is required.", res);
    } 

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if professional_tax_rules exists
        const professionalTaxRulesQuery = "SELECT * FROM professional_tax_rules WHERE pt_rule_id  = ?";
        const professionalTaxRulesResult = await connection.query(professionalTaxRulesQuery, [pt_rule_id]);
        if (professionalTaxRulesResult[0].length === 0) {
            return error422("Professional Tax Rules Not Found.", res);
        }

        // Check if professional_tax_slabs exists
        const professionalTaxSlabsQuery = "SELECT * FROM professional_tax_slabs WHERE pt_slab_id  = ?";
        const professionalTaxSlabsResult = await connection.query(professionalTaxSlabsQuery, [professionalTaxSlabsId]);
        if (professionalTaxSlabsResult[0].length === 0) {
            return error422("Professional Tax Slab Not Found.", res);
        }

        // Update the professional_tax_slabs  record with new data
        const updateQuery = `
            UPDATE professional_tax_slabs
            SET pt_rule_id = ?, salary_from = ?, salary_to = ?, tax_amount = ?, applicable_month = ?
            WHERE pt_slab_id = ?
        `;

        await connection.query(updateQuery, [ pt_rule_id, salary_from, salary_to , tax_amount, applicable_month, professionalTaxSlabsId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Slabs updated successfully.",
        });
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of professional Tax Slabs...
const onStatusChange = async (req, res) => {
    const professionalTaxSlabsId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the professional Tax Slabs Id exists
        const professionalTaxSlabsQuery = "SELECT * FROM professional_tax_slabs WHERE pt_slab_id = ? ";
        const professionalTaxSlabsResult = await connection.query(professionalTaxSlabsQuery, [professionalTaxSlabsId]);

        if (professionalTaxSlabsResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Professional Tax Slabs not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the professional Tax Slabs
        const updateQuery = `
            UPDATE professional_tax_slabs
            SET status = ?
            WHERE pt_slab_id = ?
        `;

        await connection.query(updateQuery, [status, professionalTaxSlabsId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Professional Tax Slabs ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get professional Tax Slab active...
const getProfessionalTaxSlabsIdWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const professionalTaxSlabsIdQuery = `SELECT * FROM professional_tax_slabs WHERE status = 1 `;
        const professionalTaxSlabsIdResult = await connection.query(professionalTaxSlabsIdQuery);
        const professionalTaxSlabs = professionalTaxSlabsIdResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Professional Tax Slab retrieved successfully.",
            data: professionalTaxSlabs,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//download professional Tax Slab
const getProfessionalTaxSlabsDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getProfessionalTaxSlabsQuery = `SELECT ps.*, pr.rule_name FROM professional_tax_slabs ps
        LEFT JOIN professional_tax_rules pr ON pr.pt_rule_id = ps.pt_rule_id
        WHERE 1 `;
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getProfessionalTaxSlabsQuery += ` AND (LOWER(pr.rule_name) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_from) LIKE '%${lowercaseKey}%' || LOWER(ps.salary_to) LIKE '%${lowercaseKey}%' || LOWER(ps.tax_amount) LIKE '%${lowercaseKey}%' || LOWER(ps.applicable_month) LIKE '%${lowercaseKey}%')`;
            }
        getProfessionalTaxSlabsQuery += " ORDER BY ps.cts DESC";

        let result = await connection.query(getProfessionalTaxSlabsQuery);
        let professionalTaxSlabs = result[0];

        if (professionalTaxSlabs.length === 0) {
            return error422("No data found.", res);
        }

        professionalTaxSlabs = professionalTaxSlabs.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Rule": item.rule_name,
            "From": item.salary_from,
            "To": item.salary_to,
            "Tax": item.tax_amount,
            "Month": item.applicable_month,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(professionalTaxSlabs);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "professionalTaxSlabsInfo");

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
    createProfessionalTaxSlabs,
    getAllProfessionalTaxSlabs,
    getprofessionalTaxSlab,
    updateProfessionalTaxSlabs,
    onStatusChange,
    getProfessionalTaxSlabsIdWma,
    getProfessionalTaxSlabsDownload
}
