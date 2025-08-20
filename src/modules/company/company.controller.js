 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 
async function createCompany(req, res) {
    try {
          const userId = req.user?.user_id;

          console.log("userId",userId);

        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
        const { name, address, email, phone, status } = req.body;

       const result = await insertHelper(
            'company',
            { name, email,phone },           // columns to check
            {
                name,
                address,
                email,
                phone,
                status,
                user_id: userId
            },
            {
                name: 'Company Name',
                email: 'Email Address',
                phone:'Phone'
            } 
        );

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Company created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function listCompanies(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'company',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['name', 'email', 'phone'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getCompanyById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('company', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


async function updateCompany(req, res) {
    try {
        const { id } = req.params;
        const { name, address, email, phone, status } = req.body;

        const updatedCompany = await updateHelper(
            'company',       // table
            'company_id',    // primary key column
            id,              // primary key value
            { name, address, email, phone, status } // fields to update
        );

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: updatedCompany
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteCompany(req, res) {
    try {
        const result = await deleteHelper('company', 'company_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function companyDropdown(req, res) {

    console.log('HIT: companyDropdown'); // in companyDropdown
    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'company',      // table name
            'company_id',   // primary key column
            'name',         // display column
            { status:  1},  // filters
            search || null, // search term
            10              // limit
        );

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


module.exports = { createCompany, listCompanies, getCompanyById, updateCompany,deleteCompany,companyDropdown };
