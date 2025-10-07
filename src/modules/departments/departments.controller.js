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

async function createDepartments(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id, department_name, description, status } = req.body;

        const result = await insertHelper(
            'departments',
            { department_name},           // columns to check
            {
                company_id,
                department_name,
                description,
                status,
                user_id: userId
            },
            {
                name: 'Department Name'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Department created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function listDepartments(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'departments',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['department_name'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getDepartmentById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('departments', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


async function updateDepartments(req, res) {
    try {
        const { id } = req.params;
        const { company_id, department_name, description, status } = req.body;

        const updatedCompany = await updateHelper(
            'departments',       // table
            'departments_id',    // primary key column
            id,              // primary key value
            { company_id, department_name, description, status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Department updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteDepartments(req, res) {
    try {
        const result = await deleteHelper('departments', 'departments_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function departmentsDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'departments',      // table name
            'departments_id',   // primary key column
            'department_name',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

//status change of departments...
const onStatusChange = async (req, res) => {
    const departmentsId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the departments exists
        const departmentsQuery = "SELECT * FROM departments WHERE departments_id = ? ";
        const departmentsResult = await connection.query(departmentsQuery, [departmentsId]);

        if (departmentsResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Departments not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the departments status
            const updateQuery = `
            UPDATE departments
            SET status = ?
            WHERE departments_id = ?`;
            await connection.query(updateQuery, [status, departmentsId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Departments ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};



module.exports = { createDepartments, listDepartments, getDepartmentById, updateDepartments,deleteDepartments,departmentsDropdown, onStatusChange };
