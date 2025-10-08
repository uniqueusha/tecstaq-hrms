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

// async function listDepartments(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'departments',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['department_name'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

// get employee list...
const getDepartments = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getDepartmentsQuery = `SELECT d.*, c.name, u.first_name, u.last_name
        FROM departments d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE 1 AND d.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM departments d
        LEFT JOIN company c ON c.company_id = d.company_id
        LEFT JOIN users u ON u.user_id = d.user_id
        WHERE 1 AND d.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getDepartmentsQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(d.department_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(d.department_name) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getDepartmentsQuery += ` AND DATE(d.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(d.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getDepartmentsQuery += ` AND d.company_id = ${company_id}`;
            countQuery += `  AND d.company_id = ${company_id}`;
        }

        if (user_id) {
            getDepartmentsQuery += ` AND d.user_id = ${user_id}`;
            countQuery += `  AND d.user_id = ${user_id}`;
        }

        getDepartmentsQuery += " ORDER BY d.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getDepartmentsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getDepartmentsQuery);
        const departments = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Departments retrieved successfully",
            data: departments,
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



module.exports = { createDepartments, getDepartments, getDepartmentById, updateDepartments,deleteDepartments,departmentsDropdown, onStatusChange };
