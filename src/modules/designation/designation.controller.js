 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 const pool = require('../../../db');
 const xlsx = require("xlsx");
 const fs = require("fs");

//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
async function createDesignation(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id, designation, description, status } = req.body;

        const result = await insertHelper(
            'designation',
            { designation},           // columns to check
            {
                company_id,
                designation,
                description,
                status,
                user_id: userId
            },
            {
                name: 'Designation Name'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Designation created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// async function listDesignation(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'designation',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['designation'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getDesignations = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getDesignationsQuery = `SELECT d.*, c.name, u.first_name, u.last_name
        FROM designation d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE 1 AND d.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total
        FROM designation d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE 1 AND d.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getDesignationsQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(d.designation) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(d.designation) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getDesignationsQuery += ` AND DATE(d.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(d.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getDesignationsQuery += ` AND d.company_id = ${company_id}`;
            countQuery += `  AND d.company_id = ${company_id}`;
        }

        if (user_id) {
            getDesignationsQuery += ` AND d.user_id = ${user_id}`;
            countQuery += `  AND d.user_id = ${user_id}`;
        }

        getDesignationsQuery += " ORDER BY d.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getDesignationsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getDesignationsQuery);
        const designation = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Designation retrieved successfully",
            data: designation,
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

// async function getDesignationById(req, res) {
//      try {
//         const { id } = req.params;

//         const result = await listHelper('designation', {}, Number(id));

//         if (!result.data.length) {
//             return res.status(404).json({ success: false, message: 'Designation not found' });
//         }

//         res.status(200).json({ success: true, data: result.data[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getDesignationById = async (req, res) => {
    const designationId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const designationQuery = `SELECT d.*, c.name, u.first_name, u.last_name
        FROM designation d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE d.designation_id = ?`;
        const designationResult = await connection.query(designationQuery, [designationId]);

        if (designationResult[0].length == 0) {
            return error422("Designation Not Found.", res);
        }
        const designation = designationResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Designation Retrived Successfully",
            data: designation
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

async function updateDesignation(req, res) {
    try {
        const { id } = req.params;
        const { company_id, designation, description, status } = req.body;

        const updatedCompany = await updateHelper(
            'designation',       // table
            'designation_id',    // primary key column
            id,              // primary key value
            { company_id, designation, description, status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Designation updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteDesignation(req, res) {
    try {
        const result = await deleteHelper('designation', 'designation_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function designationDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'designation',      // table name
            'designation_id',   // primary key column
            'designation',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function document_typeDropdown(req, res) {
    
     try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'document_type',      // table name
            'document_type_id',   // primary key column
            'document_type',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

//status change of designation...
const onStatusChange = async (req, res) => {
    const designationId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the departments exists
        const designationQuery = "SELECT * FROM designation WHERE designation_id = ? ";
        const designationResult = await connection.query(designationQuery, [designationId]);

        if (designationResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Designation not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the designation status
            const updateQuery = `
            UPDATE designation
            SET status = ?
            WHERE designation_id = ?`;
            await connection.query(updateQuery, [status, designationId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Designation ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//download list
const getDesignationDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getDesignationQuery = `SELECT d.*, c.name, u.first_name, u.last_name
        FROM designation d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE 1 AND d.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getDesignationQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(d.designation) LIKE '%${lowercaseKey}%')`;
        }
        getDesignationQuery += " ORDER BY d.cts DESC";

        let result = await connection.query(getDesignationQuery);
        let designation = result[0];


        if (designation.length === 0) {
            return error422("No data found.", res);
        }

        designation = designation.map((item, index) => ({
            "Sr No": index + 1,
            "Designation": item.designation,
            "Description": item.description,
            "Company Name": item.name,
            "Create By": `${item.first_name} ${item.last_name}`,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(designation);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "designationInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
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


module.exports = { createDesignation, getDesignations, getDesignationById, updateDesignation,deleteDesignation,designationDropdown,document_typeDropdown, onStatusChange, getDesignationDownload };
