 const { insertHelper } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
 const { updateHelper } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 
async function create_work_week_pattern(req, res) {
    try {
          const userId = req.user?.user_id;

          console.log("userId",userId);

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

    console.log('HIT: work_week_patternDropdown'); // in companyDropdown
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





module.exports = { create_work_week_pattern, listwork_week_pattern, getwork_week_patternById, updatework_week_pattern,deletework_week_pattern,work_week_patternDropdown };
