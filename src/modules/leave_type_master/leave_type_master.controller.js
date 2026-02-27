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
 
async function createleave_type_master(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { policy_id,company_id,leave_type_name,leave_type_code,number_of_days,description,status } = req.body;

        const result = await insertHelper(
            'leave_type_master',
            { leave_type_name},           // columns to check
            {
               policy_id,
               company_id,
               leave_type_name,
               leave_type_code,
               number_of_days,
               description,
                status,
                user_id: userId
            },
            {
                leave_type_name: 'Leave Type',
                leave_type_code: 'Leave Code'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Leave Type Created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// async function listleave_type_master(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'leave_type_master',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['leave_type_name'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getLeaveType = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getLeaveTypeQuery = `SELECT ltm.*, c.name, u.first_name, u.last_name, p.policy_title
        FROM leave_type_master ltm
        LEFT JOIN company c ON c.company_id = ltm.company_id
        LEFT JOIN users u ON u.user_id = ltm.user_id
        LEFT JOIN policy_master p ON p.policy_master_id = ltm.policy_id
        WHERE 1 AND ltm.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM leave_type_master ltm
        LEFT JOIN company c ON c.company_id = ltm.company_id
        LEFT JOIN users u ON u.user_id = ltm.user_id
        LEFT JOIN policy_master p ON p.policy_master_id = ltm.policy_id
        WHERE 1 AND ltm.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getLeaveTypeQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(ltm.leave_type_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(ltm.leave_type_name) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getLeaveTypeQuery += ` AND DATE(ltm.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(ltm.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getLeaveTypeQuery += ` AND ltm.company_id = ${company_id}`;
            countQuery += `  AND ltm.company_id = ${company_id}`;
        }

        if (user_id) {
            getLeaveTypeQuery += ` AND ltm.user_id = ${user_id}`;
            countQuery += `  AND ltm.user_id = ${user_id}`;
        }

        getLeaveTypeQuery += " ORDER BY ltm.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getLeaveTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getLeaveTypeQuery);
        const leaveType = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave type retrieved successfully",
            data: leaveType,
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

// async function getleave_type_masterById(req, res) {
//      try {
//         const { id } = req.params;

//         const result = await listHelper('leave_type_master', {}, Number(id));

//         if (!result.data.length) {
//             return res.status(404).json({ success: false, message: 'Leave Type not found' });
//         }

//         res.status(200).json({ success: true, data: result.data[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getLeaveTypeMasterById = async (req, res) => {
    const leaveTypeMasterId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const leaveTypeMasterQuery = `SELECT ltm.*, c.name, u.first_name, u.last_name, p.policy_title
        FROM leave_type_master ltm
        LEFT JOIN company c ON c.company_id = ltm.company_id
        LEFT JOIN users u ON u.user_id = ltm.user_id
        LEFT JOIN policy_master p ON p.policy_master_id = ltm.policy_id
        WHERE ltm.leave_type_master_id = ?`;
        const leaveTypeMasterResult = await connection.query(leaveTypeMasterQuery, [leaveTypeMasterId]);

        if (leaveTypeMasterResult[0].length == 0) {
            return error422("Leave Type Master Not Found.", res);
        }
        const leaveTypeMaster = leaveTypeMasterResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Leave Type Master Retrived Successfully",
            data: leaveTypeMaster
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

async function updateleave_type_master(req, res) {
    try {
        const { id } = req.params;
       const { policy_id,company_id,leave_type_name,leave_type_code,number_of_days,description,status } = req.body;

        const updatedCompany = await updateHelper(
            'leave_type_master',       // table
            'leave_type_master_id',    // primary key column
            id,              // primary key value
            { policy_id,
               company_id,
               leave_type_name,
               leave_type_code,
               number_of_days,
               description,
               status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Leave Type updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteleave_type_master(req, res) {
    try {
        const result = await deleteHelper('leave_type_master', 'leave_type_master_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function leave_type_masterDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'leave_type_master',      // table name
            'leave_type_master_id',   // primary key column
            'leave_type_name',         // display column
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
    const leaveTypeMasterId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the leave_type_master exists
        const leaveTypeMasterQuery = "SELECT * FROM leave_type_master WHERE leave_type_master_id = ? ";
        const leaveTypeMasterResult = await connection.query(leaveTypeMasterQuery, [leaveTypeMasterId]);

        if (leaveTypeMasterResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Leave Type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the leave Type Master status
            const updateQuery = `
            UPDATE leave_type_master
            SET status = ?
            WHERE leave_type_master_id = ?`;
            await connection.query(updateQuery, [status, leaveTypeMasterId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Leave Type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//download list
const getLeaveTypeMasterDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getLeaveTypeMasterQuery = `SELECT ltm.*, c.name, u.first_name, u.last_name, p.policy_title
        FROM leave_type_master ltm
        LEFT JOIN company c ON c.company_id = ltm.company_id
        LEFT JOIN users u ON u.user_id = ltm.user_id
        LEFT JOIN policy_master p ON p.policy_master_id = ltm.policy_id
        WHERE 1 AND ltm.status = 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getLeaveTypeMasterQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(ltm.leave_type_name) LIKE '%${lowercaseKey}%')`;
        }
        getLeaveTypeMasterQuery += " ORDER BY ltm.cts DESC";

        let result = await connection.query(getLeaveTypeMasterQuery);
        let leaveTypeMaster = result[0];


        if (leaveTypeMaster.length === 0) {
            return error422("No data found.", res);
        }

        leaveTypeMaster = leaveTypeMaster.map((item, index) => ({
            "Sr No": index + 1,
            "Leave Type Name": item.leave_type_name,
            "Leave Type Code": item.leave_type_code,
            "Number Of Days": item.number_of_days,
            "Description": item.description,
            "Company Name": item.name,
            "Policy Title": item.policy_title,
            "Create By": `${item.first_name} ${item.last_name}`,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(leaveTypeMaster);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "leaveTypeMasterInfo");

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

module.exports = { createleave_type_master, getLeaveType, getLeaveTypeMasterById, updateleave_type_master,deleteleave_type_master,leave_type_masterDropdown, onStatusChange, getLeaveTypeMasterDownload};
