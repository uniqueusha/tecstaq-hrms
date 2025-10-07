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

async function listleave_type_master(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'leave_type_master',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['leave_type_name'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getleave_type_masterById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('leave_type_master', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Leave Type not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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




module.exports = { createleave_type_master, listleave_type_master, getleave_type_masterById, updateleave_type_master,deleteleave_type_master,leave_type_masterDropdown, onStatusChange};
