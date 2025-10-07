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
//error handle 422...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}
//error handle 500...
error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}
async function createCompany(req, res) {
    try {
          const userId = req.user?.user_id;


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


//status change of Company...
const onStatusChange = async (req, res) => {
    const companyId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the company exists
        const companyQuery = "SELECT * FROM company WHERE company_id = ? ";
        const companyResult = await connection.query(companyQuery, [companyId]);

        if (companyResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Company not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the company status
            const updateQuery = `
            UPDATE company
            SET status = ?
            WHERE company_id = ?`;
            await connection.query(updateQuery, [status, companyId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Company ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};


module.exports = { createCompany, listCompanies, getCompanyById, updateCompany,deleteCompany,companyDropdown,onStatusChange };
