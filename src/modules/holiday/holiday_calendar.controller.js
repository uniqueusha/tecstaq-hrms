 const { insertWithDetails } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
  const { getHeaderWithDetailsById } = require('../../common/listHelper');
 const { updateWithDetails } = require('../../common/updateHelper');
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
 
async function createholiday_calendar(req, res) {
    try {
          const userId = req.user?.user_id;


        if (!userId)
        {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        else{
    
        const {
        company_id,calendar_name, description,status,details // Expecting array OR single object for footer rows
        } = req.body;


        const headerData = {company_id, calendar_name, description,status,user_id:userId};


        const result = await insertWithDetails(
      "holiday_calendar",          // parent table
      headerData,                  // parent data
      "holiday_calendar_details",  // child table
      details,                     // child data (array or single row)
      "holiday_calendar_id"        // foreign key in child table
    );
        

        res.status(200).json({
            success: true,
            company_id: result.insertId,
            message: 'Calendar created successfully'
        });    
        }
        
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function listholiday_calendar(req, res) {
   try {
        const { page, limit, search, status } = req.query;

        const result = await listHelper(
            'holiday_calendar',
            status ? { status } : {}, // Exact match filters
            null, // No ID → list mode
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                searchColumns: ['calendar_name'] // ✅ No 'status' here
            },
            search || null // Search keyword
         );

        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function list_with_details_holiday_calendar(req, res) {
     try {
       const { id } = req.params; // ✅ take id from params

    const result = await getHeaderWithDetailsById(
      "holiday_calendar",          // header table
      "holiday_calendar_details",  // detail table
      "holiday_calendar_id",       // PK of header
      "holiday_calendar_id",       // FK in details
      id                           // ✅ pass only ID
    );
    
        res.status(200).json({ success: true, ...result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getholiday_calendarById(req, res) {
     try {
        const { id } = req.params;

        const result = await listHelper('holiday_calendar', {}, Number(id));

        if (!result.data.length) {
            return res.status(404).json({ success: false, message: 'Calendar not found' });
        }

        res.status(200).json({ success: true, data: result.data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function updateHolidayCalendar(req, res) {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const holiday_calendar_id = req.params.id;  // FIX: take from URL *** Header PK***
        const { calendar_name, description, status, details } = req.body;

        const headerData = {
            calendar_name,
            description,
            status,
            user_id: userId
        };

       const result = await updateWithDetails(
            "holiday_calendar",           // header table
            holiday_calendar_id,          // header id (from req.params.id)
            headerData,                   // new header data
            "holiday_calendar_details",   // detail table
            details,                      // array of details
            "holiday_calendar_id",        // FK in details
            "holiday_calendar_id",        // PK of header table
            "id"  // PK of detail table
        );

        res.status(200).json({
            success: true,
            message: 'Calendar updated successfully',
            result
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }

}

async function deleteholiday_calendar(req, res) {
    try {
        const result = await deleteHelper('holiday_calendar', 'holiday_calendar_id', req.params.id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function holiday_calendarDropdown(req, res) {

    try {
        const { search } = req.query;
        const rows = await dropdownHelper(
            'holiday_calendar',      // table name
            'holiday_calendar_id',   // primary key column
            'calendar_name',         // display column
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
    const holidayId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the employment_type exists
        const holidayQuery = "SELECT * FROM holiday_calendar WHERE holiday_calendar_id = ? ";
        const holidayResult = await connection.query(holidayQuery, [holidayId]);

        if (holidayResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Holiday not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        
            // Soft update the holiday status
            const updateQuery = `
            UPDATE holiday_calendar
            SET status = ?
            WHERE holiday_calendar_id = ?`;
            await connection.query(updateQuery, [status, holidayId]);
        
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Holiday ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

module.exports = { createholiday_calendar, listholiday_calendar, getholiday_calendarById, list_with_details_holiday_calendar,updateHolidayCalendar,deleteholiday_calendar,holiday_calendarDropdown, onStatusChange };
