const pool = require('../../common/db');
const fs = require('fs');
const path = require('path');
const xlsx = require("xlsx");


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
    console.log(error);
    return res.status(500).json({
        status:500,
        message:"Internal Server Error",
        error:error
    });
}

//create policy
const createPolicy = async (req, res)=>{
    const policy_title = req.body.policy_title ? req.body.policy_title.trim() :'';
    const policy_subtitle = req.body.policy_subtitle ? req.body.policy_subtitle.trim():'';
    const company_id = req.body.company_id ? req.body.company_id:'';
    const issued_on = req.body.issued_on ? req.body.issued_on:'';
    const prepared_by = req.body.prepared_by ? req.body.prepared_by.trim():'';
    const approved_by = req.body.approved_by ? req.body.approved_by.trim():'';
    const process_head = req.body.process_head ? req.body.process_head.trim():'';
    const version = req.body.version ? req.body.version:'';
    const policy_file_path = req.body.policy_file_path ? req.body.policy_file_path.trim():'';
    const userId = req.user?.user_id;

    let connection = await getConnection();

    try {
        
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/jpg',
          'image/png'
        ];

        
        const fileType = await import("file-type");
        const uploadFile = async (base64Str, prefix) => {
            if (!base64Str) return '';

            const cleanedBase64 = base64Str.replace(/^data:.*;base64,/, "");
            const pdfBuffer = Buffer.from(cleanedBase64, "base64");
            const fileTypeResult = await fileType.fileTypeFromBuffer(pdfBuffer);

            if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
                throw new Error("Only JPG, JPEG, PNG, PDF files are allowed");
            }

            if (pdfBuffer.length > 10 * 1024 * 1024) {
                throw new Error("File size must be under 10MB");
            }

            const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
            const uploadDir = path.join(__dirname, "..", "..", "uploads");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            
            fs.writeFileSync(filePath, pdfBuffer);
            return `uploads/${fileName}`;
        };

        // Upload GST and PAN files if provided
        const policyFilePath = await uploadFile(policy_file_path, 'policy_file_path');
        
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO policy_master (policy_title, policy_subtitle, company_id, issued_on, prepared_by, approved_by, process_head, version, policy_file_path, user_id)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[policy_title, policy_subtitle, company_id, issued_on, prepared_by, approved_by, process_head, version, policyFilePath, userId]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Policy created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//all policy list
const getAllPolicy = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getPolicyQuery = `SELECT pm.*, c.name AS company_name, u.first_name, u.last_name FROM policy_master pm
        LEFT JOIN company c ON c.company_id = pm.company_id
        LEFT JOIN users u ON u.user_id = pm.user_id WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM policy_master pm
        LEFT JOIN company c ON c.company_id = pm.company_id
        LEFT JOIN users u ON u.user_id = pm.user_id WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            // if (lowercaseKey === "activated") {
            //     getProductQuery += ` AND status = 1`;
            //     countQuery += ` AND status = 1`;
            // } else if (lowercaseKey === "deactivated") {
            //     getProductQuery += ` AND status = 0`;
            //     countQuery += ` AND status = 0`;
            // } else {
                getPolicyQuery += ` AND LOWER(pm.policy_title) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(pm.policy_title) LIKE '%${lowercaseKey}%' `;
            // }
        }
        getPolicyQuery += " ORDER BY pm.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getPolicyQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getPolicyQuery);
        const policy = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Policy retrieved successfully",
            data: policy,
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

//Policy list by id
const getPolicy = async (req, res) => {
    const policyId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const policyQuery = `SELECT pm.*, c.name AS company_name, u.first_name, u.last_name FROM policy_master pm
        LEFT JOIN company c ON c.company_id = pm.company_id
        LEFT JOIN users u ON u.user_id = pm.user_id 
        WHERE policy_master_id = ?`;
        const policyResult = await connection.query(policyQuery, [policyId]);

        if (policyResult[0].length == 0) {
            return error422("Policy Not Found.", res);
        }
        const policy = policyResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Policy Retrived Successfully",
            data: policy
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update policy
const updatePolicy = async (req, res) => {
    const policyId = parseInt(req.params.id);
    const policy_title = req.body.policy_title ? req.body.policy_title.trim() :'';
    const policy_subtitle = req.body.policy_subtitle ? req.body.policy_subtitle.trim():'';
    const company_id = req.body.company_id ? req.body.company_id:'';
    const issued_on = req.body.issued_on ? req.body.issued_on:'';
    const prepared_by = req.body.prepared_by ? req.body.prepared_by.trim():'';
    const approved_by = req.body.approved_by ? req.body.approved_by.trim():'';
    const process_head = req.body.process_head ? req.body.process_head.trim():'';
    const version = req.body.version ? req.body.version:'';
    const policy_file_path = req.body.policy_file_path ? req.body.policy_file_path.trim():'';
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if policy exists
        const policyQuery = "SELECT * FROM policy_master WHERE policy_master_id  = ?";
        const policyResult = await connection.query(policyQuery, [policyId]);
        if (policyResult[0].length == 0) {
            return error422("Policy Not Found.", res);
        }
       
        // Update the policy record with new data
        const updateQuery = `
            UPDATE policy_master
            SET policy_title = ?, policy_subtitle = ?, company_id = ?, issued_on = ?, prepared_by = ?, approved_by = ?, process_head = ?, version = ?, policy_file_path = ?
            WHERE policy_master_id = ?
        `;

        await connection.query(updateQuery, [ policy_title, policy_subtitle, company_id, issued_on, prepared_by, approved_by, process_head, version, policy_file_path,policyId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Policy updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Policy...
const onStatusChange = async (req, res) => {
    const policyId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the Policy exists
        const policyQuery = "SELECT * FROM policy_master WHERE policy_master_id = ? ";
        const policyResult = await connection.query(policyQuery, [policyId]);

        if (policyResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Policy not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the policy status
        const updateQuery = `
            UPDATE policy_master
            SET status = ?
            WHERE policy_master_id = ?
        `;

        await connection.query(updateQuery, [status, policyId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Policy ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get policy active...
const getPolicyWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const policyQuery = `SELECT * FROM policy_master
        WHERE status = 1  ORDER BY policy_title`;

        const policyResult = await connection.query(policyQuery);
        const policy = policyResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Policy retrieved successfully.",
            data: policy,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createPolicy,
    getAllPolicy,
    getPolicy,
    updatePolicy,
    onStatusChange,
    getPolicyWma
    
}