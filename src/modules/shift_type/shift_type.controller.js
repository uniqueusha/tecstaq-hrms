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

async function listshift_type(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'shift_type_header',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['shift_type_name'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getshift_typeById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('shift_type_header', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'shift_type not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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

module.exports = { createshift_type, listshift_type, getshift_typeById, updateshift_type,deleteshift_type,shift_typeDropdown, onStatusChange };
