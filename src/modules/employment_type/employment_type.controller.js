 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 const pool = require('../../common/db');
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
async function createemployment_type(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id, employment_type, description,status} = req.body;

       const result = await insertHelper(
            'employment_type',
            { employment_type },           // columns to check
            {
                company_id,
                employment_type,
                description,             
                status,
                user_id: userId
            },
            {
                employment_type: 'Employment Type Name'              
            } 
        );

        res.status(200).json({
            success: true,
            employment_type_id: result.insertId,
            message: 'Employment Type created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// async function listemployment_type(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'employment_type',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['employment_type'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getEmploymentType = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getEmploymentTypeQuery = `SELECT et.*, c.name, u.first_name, u.last_name
        FROM employment_type et
        LEFT JOIN company c ON c.company_id = et.company_id
        LEFT JOIN users u ON u.user_id = et.user_id
        WHERE 1 AND et.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM employment_type et
        LEFT JOIN company c ON c.company_id = et.company_id
        LEFT JOIN users u ON u.user_id = et.user_id
        WHERE 1 AND et.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getEmploymentTypeQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(et.employment_type) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(et.employment_type) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getEmploymentTypeQuery += ` AND DATE(et.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(et.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getEmploymentTypeQuery += ` AND et.company_id = ${company_id}`;
            countQuery += `  AND et.company_id = ${company_id}`;
        }

        if (user_id) {
            getEmploymentTypeQuery += ` AND et.user_id = ${user_id}`;
            countQuery += `  AND et.user_id = ${user_id}`;
        }

        getEmploymentTypeQuery += " ORDER BY et.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getEmploymentTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getEmploymentTypeQuery);
        const employmentType = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employment Type retrieved successfully",
            data: employmentType,
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

// async function getemployment_typeById(req, res) {
//      try {
//         const { id } = req.params;

//         const result = await listHelper('employment_type', {}, Number(id));

//         if (!result.data.length) {
//             return res.status(404).json({ success: false, message: 'Employment type not found' });
//         }

//         res.status(200).json({ success: true, data: result.data[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getEmploymentTypeById = async (req, res) => {
    const employmentTypeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const employmentTypeQuery = `SELECT et.*, c.name, u.first_name, u.last_name
        FROM employment_type et
        LEFT JOIN company c ON c.company_id = et.company_id
        LEFT JOIN users u ON u.user_id = et.user_id
        WHERE et.employment_type_id = ?`;
        const employmentTypeResult = await connection.query(employmentTypeQuery, [employmentTypeId]);

        if (employmentTypeResult[0].length == 0) {
            return error422("Employment Type Not Found.", res);
        }
        const employmentType = employmentTypeResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Employment Type Retrived Successfully",
            data: employmentType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

async function updateemployment_type(req, res) {
    try {
        
        const userId = req.user?.user_id;
        const { id } = req.params;
        const { company_id, employment_type, description,status} = req.body;

        const updatedemployment_type = await updateHelper(
            'employment_type',       // table
            'employment_type_id',    // primary key column
            id,              // primary key value
            {   company_id,
                employment_type,
                description,             
                status,
                user_id: userId} // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Employment Type updated successfully',
            data: updatedemployment_type
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteemployment_type(req, res) {
    try {
        const result = await deleteHelper('employment_type', 'employment_type_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function employment_typeDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'employment_type',      // table name
            'employment_type_id',   // primary key column
            'employment_type',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

const onStatusChange = async (req, res) => {
    const employmentTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the employment_type exists
        const employmentTypeQuery = "SELECT * FROM employment_type WHERE employment_type_id = ? ";
        const employmentTypeResult = await connection.query(employmentTypeQuery, [employmentTypeId]);

        if (employmentTypeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Employment Type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the employment Type Master status
            const updateQuery = `
            UPDATE employment_type
            SET status = ?
            WHERE employment_type_id = ?`;
            await connection.query(updateQuery, [status, employmentTypeId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Employement Type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//download list
const getEmploymentTypeDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getEmploymentTypeQuery = `SELECT et.*, c.name, u.first_name, u.last_name
        FROM employment_type et
        LEFT JOIN company c ON c.company_id = et.company_id
        LEFT JOIN users u ON u.user_id = et.user_id
        WHERE 1 AND et.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getEmploymentTypeQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(et.employment_type) LIKE '%${lowercaseKey}%')`;
        }

        getEmploymentTypeQuery += " ORDER BY et.cts DESC";

        let result = await connection.query(getEmploymentTypeQuery);
        let employmentType = result[0];


        if (employmentType.length === 0) {
            return error422("No data found.", res);
        }

        employmentType = employmentType.map((item, index) => ({
            "Sr No": index + 1,
            "Employment Type": item.employment_type,
            "Description": item.description,
            "Company Name": item.name,
            "Create By": `${item.first_name} ${item.last_name}`,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(employmentType);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "employmentTypeInfo");

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


module.exports = { createemployment_type, getEmploymentType, getEmploymentTypeById, updateemployment_type,deleteemployment_type,employment_typeDropdown, onStatusChange, getEmploymentTypeDownload };
