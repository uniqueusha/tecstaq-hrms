 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 
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


module.exports = { createDepartments, listDepartments, getDepartmentById, updateDepartments,deleteDepartments,departmentsDropdown };
