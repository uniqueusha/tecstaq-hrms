 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 const pool = require('../../common/db');

//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
 
async function create_work_week_pattern(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id, pattern_name, working_days, weekly_hours, remarks,status } = req.body;

        const result = await insertHelper(
            'work_week_pattern',
            { pattern_name},           // columns to check
            {
                company_id,
                pattern_name,
                working_days,
                weekly_hours,
                status,
                remarks,
                user_id: userId
            },
            {
                name: 'pattern_name'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'work_week_pattern created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// async function listwork_week_pattern(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'work_week_pattern',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['pattern_name'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getWorkWeek = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getWorkWeekQuery = `SELECT w.*, c.name, u.first_name, u.last_name
        FROM work_week_pattern w
        LEFT JOIN company c ON c.company_id = w.company_id
        LEFT JOIN users u ON u.user_id = w.user_id
        WHERE 1 AND w.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM work_week_pattern w
        LEFT JOIN company c ON c.company_id = w.company_id
        LEFT JOIN users u ON u.user_id = w.user_id
        WHERE 1 AND w.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getWorkWeekQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(w.pattern_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(w.pattern_name) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getWorkWeekQuery += ` AND DATE(w.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(w.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getWorkWeekQuery += ` AND w.company_id = ${company_id}`;
            countQuery += `  AND w.company_id = ${company_id}`;
        }

        if (user_id) {
            getWorkWeekQuery += ` AND w.user_id = ${user_id}`;
            countQuery += `  AND w.user_id = ${user_id}`;
        }

        getWorkWeekQuery += " ORDER BY w.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getWorkWeekQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getWorkWeekQuery);
        const workWeek = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Work Week retrieved successfully",
            data: workWeek,
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

async function getwork_week_patternById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('work_week_pattern', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'work_week_pattern not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function updatework_week_pattern(req, res) {
    try {
        const { id } = req.params;
        const { company_id, pattern_name, working_days, weekly_hours, remarks,status } = req.body;

        const updatedCompany = await updateHelper(
            'work_week_pattern',       // table
            'work_week_pattern_id',    // primary key column
            id,              // primary key value
            { company_id, pattern_name, working_days, weekly_hours, remarks,status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Work Week Pattern Updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deletework_week_pattern(req, res) {
    try {
        const result = await deleteHelper('work_week_pattern', 'work_week_pattern_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function work_week_patternDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'work_week_pattern',      // table name
            'work_week_pattern_id',   // primary key column
            'pattern_name',         // display column
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
    const workWeekId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the workWeek exists
        const workWeekQuery = "SELECT * FROM work_week_pattern WHERE work_week_pattern_id = ? ";
        const workWeekResult = await connection.query(workWeekQuery, [workWeekId]);

        if (workWeekResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Work Week not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the work Week status
            const updateQuery = `
            UPDATE work_week_pattern
            SET status = ?
            WHERE work_week_pattern_id = ?`;
            await connection.query(updateQuery, [status, workWeekId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Work week pattern ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};



module.exports = { create_work_week_pattern, getWorkWeek, getwork_week_patternById, updatework_week_pattern,deletework_week_pattern,work_week_patternDropdown, onStatusChange };
