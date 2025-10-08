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

async function listwork_week_pattern(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'work_week_pattern',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['pattern_name'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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



module.exports = { create_work_week_pattern, listwork_week_pattern, getwork_week_patternById, updatework_week_pattern,deletework_week_pattern,work_week_patternDropdown, onStatusChange };
