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

async function listemployment_type(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'employment_type',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['employment_type'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getemployment_typeById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('employment_type', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Employment type not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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


module.exports = { createemployment_type, listemployment_type, getemployment_typeById, updateemployment_type,deleteemployment_type,employment_typeDropdown, onStatusChange };
