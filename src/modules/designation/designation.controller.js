 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 
async function createDesignation(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { company_id, designation, description, status } = req.body;

        const result = await insertHelper(
            'designation',
            { designation},           // columns to check
            {
                company_id,
                designation,
                description,
                status,
                user_id: userId
            },
            {
                name: 'Designation Name'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Designation created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function listDesignation(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'designation',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['designation'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getDesignationById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('designation', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Designation not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


async function updateDesignation(req, res) {
    try {
        const { id } = req.params;
        const { company_id, designation, description, status } = req.body;

        const updatedCompany = await updateHelper(
            'designation',       // table
            'designation_id',    // primary key column
            id,              // primary key value
            { company_id, designation, description, status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Designation updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteDesignation(req, res) {
    try {
        const result = await deleteHelper('designation', 'designation_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function designationDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'designation',      // table name
            'designation_id',   // primary key column
            'designation',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function document_typeDropdown(req, res) {
    
     try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'document_type',      // table name
            'document_type_id',   // primary key column
            'document_type',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}




module.exports = { createDesignation, listDesignation, getDesignationById, updateDesignation,deleteDesignation,designationDropdown,document_typeDropdown };
