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
async function createshift_type(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id,	shift_type_name,start_time,end_time,break_minutes,description, status } = req.body;

       const result = await insertHelper(
            'shift_type_header',
            { shift_type_name },           // columns to check
            {
                company_id,
                shift_type_name,
                start_time,
                end_time,
                break_minutes,
                description,
                status,
                user_id: userId
            },
            {
                shift_type_name: 'Shift Type'            
            } 
        );

        res.status(200).json({
            success: true,
            shift_type_id: result.insertId,
            message: 'Shift Type created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// async function listshift_type(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'shift_type_header',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['shift_type_name'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getShiftType = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getShiftTypeQuery = `SELECT st.*, c.name, u.first_name, u.last_name
        FROM shift_type_header st
        LEFT JOIN company c ON c.company_id = st.company_id
        LEFT JOIN users u ON u.user_id = st.user_id
        WHERE 1 AND st.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM shift_type_header st
        LEFT JOIN company c ON c.company_id = st.company_id
        LEFT JOIN users u ON u.user_id = st.user_id
        WHERE 1 AND st.status = 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getShiftTypeQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(sf.shift_type_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(sf.shift_type_name) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getShiftTypeQuery += ` AND DATE(st.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(st.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getShiftTypeQuery += ` AND st.company_id = ${company_id}`;
            countQuery += `  AND st.company_id = ${company_id}`;
        }

        if (user_id) {
            getShiftTypeQuery += ` AND st.user_id = ${user_id}`;
            countQuery += `  AND st.user_id = ${user_id}`;
        }

        getShiftTypeQuery += " ORDER BY st.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getShiftTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getShiftTypeQuery);
        const shiftType = result[0];


        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Shift Type retrieved successfully",
            data: shiftType,
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

// async function getshift_typeById(req, res) {
//      try {
//         const { id } = req.params;

//         const result = await listHelper('shift_type_header', {}, Number(id));

//         if (!result.data.length) {
//             return res.status(404).json({ success: false, message: 'shift_type not found' });
//         }

//         res.status(200).json({ success: true, data: result.data[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getShiftTypeById = async (req, res) => {
    const shiftTypeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const shiftTypeQuery = `SELECT st.*, c.name, u.first_name, u.last_name
        FROM shift_type_header st
        LEFT JOIN company c ON c.company_id = st.company_id
        LEFT JOIN users u ON u.user_id = st.user_id
        WHERE st.shift_type_header_id = ?`;
        const shiftTypeResult = await connection.query(shiftTypeQuery, [shiftTypeId]);

        if (shiftTypeResult[0].length == 0) {
            return error422("Shift Type Master Not Found.", res);
        }
        const shiftType = shiftTypeResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Shift Type Master Retrived Successfully",
            data: shiftType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

async function updateshift_type(req, res) {
    try {
        const userId = req.user?.user_id;
        const { id } = req.params;
       const { company_id,	shift_type_name,start_time,end_time,break_minutes,description, status } = req.body;

        const updatedshift_type = await updateHelper(
            'shift_type_header',       // table
            'shift_type_header_id',    // primary key column
            id,              // primary key value
            { company_id,
                shift_type_name,
                start_time,
                end_time,
                break_minutes,
                description,
                status,
                user_id: userId } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Shift Type updated successfully',
            data: updatedshift_type
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteshift_type(req, res) {
    try {
        const result = await deleteHelper('shift_type_header', 'shift_type_header_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function shift_typeDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'shift_type_header',      // table name
            'shift_type_header_id',   // primary key column
            'shift_type_name',         // display column
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
    const shiftTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the shiftType exists
        const shiftTypeQuery = "SELECT * FROM shift_type_header WHERE shift_type_header_id = ? ";
        const shiftTypeResult = await connection.query(shiftTypeQuery, [shiftTypeId]);

        if (shiftTypeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Shift Type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the shift Type Master status
            const updateQuery = `
            UPDATE shift_type_header
            SET status = ?
            WHERE shift_type_header_id = ?`;
            await connection.query(updateQuery, [status, shiftTypeId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Shift Type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//download list
const getShiftTypeDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getShiftTypeQuery = `SELECT st.*, c.name, u.first_name, u.last_name
        FROM shift_type_header st
        LEFT JOIN company c ON c.company_id = st.company_id
        LEFT JOIN users u ON u.user_id = st.user_id
        WHERE 1 AND st.status = 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getShiftTypeQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(sf.shift_type_name) LIKE '%${lowercaseKey}%')`;
        }
        getShiftTypeQuery += " ORDER BY st.cts DESC";

        let result = await connection.query(getShiftTypeQuery);
        let shiftType = result[0];


        if (shiftType.length === 0) {
            return error422("No data found.", res);
        }

        shiftType = shiftType.map((item, index) => ({
            "Sr No": index + 1,
            "Shift Type Name": item.shift_type_name,
            "Start Time": item.start_time,
            "End Time": item.end_time,
            "Break Minutes": item.break_minutes,
            "Description": item.description,
            "Company Name": item.name,
            "Create By": `${item.first_name} ${item.last_name}`,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(shiftType);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "shiftTypeInfo");

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

module.exports = { createshift_type, getShiftType, getShiftTypeById, updateshift_type,deleteshift_type,shift_typeDropdown, onStatusChange, getShiftTypeDownload };
