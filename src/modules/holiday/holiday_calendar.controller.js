 const { insertWithDetails } = require('../../common/insertHelper');
 const { listHelper } = require('../../common/listHelper');
  const { getHeaderWithDetailsById } = require('../../common/listHelper');
 const { updateWithDetails } = require('../../common/updateHelper');
 const { deleteHelper } = require('../../common/deleteHelper');
 const { dropdownHelper } = require('../../common/dropdownHelper');
 const pool = require('../../common/db');
 const xlsx = require("xlsx");
 const fs = require("fs");

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

// async function listholiday_calendar(req, res) {
//    try {
//         const { page, limit, search, status } = req.query;

//         const result = await listHelper(
//             'holiday_calendar',
//             status ? { status } : {}, // Exact match filters
//             null, // No ID → list mode
//             {
//                 page: parseInt(page) || 1,
//                 limit: parseInt(limit) || 10,
//                 searchColumns: ['calendar_name'] // ✅ No 'status' here
//             },
//             search || null // Search keyword
//          );

//         res.status(200).json({ success: true, ...result });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getHoliday = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, company_id, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getHolidayQuery = `SELECT h.*, c.name, u.first_name, u.last_name
        FROM holiday_calendar h
        LEFT JOIN company c ON c.company_id = h.company_id
        LEFT JOIN users u ON u.user_id = h.user_id
        WHERE 1 AND h.status = 1`;
        
        let countQuery = `SELECT COUNT(*) AS total 
        FROM holiday_calendar h
        LEFT JOIN company c ON c.company_id = h.company_id
        LEFT JOIN users u ON u.user_id = h.user_id
        WHERE 1 AND h.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getHolidayQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%')`;
        }

        // from date and to date
        if (fromDate && toDate) {
            getHolidayQuery += ` AND DATE(h.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(h.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (company_id) {
            getHolidayQuery += ` AND h.company_id = ${company_id}`;
            countQuery += `  AND h.company_id = ${company_id}`;
        }

        if (user_id) {
            getHolidayQuery += ` AND h.user_id = ${user_id}`;
            countQuery += `  AND h.user_id = ${user_id}`;
        }

        getHolidayQuery += " ORDER BY h.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getHolidayQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getHolidayQuery);
        const holiday = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Holiday retrieved successfully",
            data: holiday,
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

// async function getholiday_calendarById(req, res) {
//      try {
//         const { id } = req.params;

//         const result = await listHelper('holiday_calendar', {}, Number(id));

//         if (!result.data.length) {
//             return res.status(404).json({ success: false, message: 'Calendar not found' });
//         }

//         res.status(200).json({ success: true, data: result.data[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// }

const getHolidayCalendarById = async (req, res) => {
    const holidayCalendarId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const holidayCalendarQuery = `SELECT h.*, c.name, u.first_name, u.last_name
        FROM holiday_calendar h
        LEFT JOIN company c ON c.company_id = h.company_id
        LEFT JOIN users u ON u.user_id = h.user_id
        WHERE h.holiday_calendar_id = ?`;
        const holidayCalendarResult = await connection.query(holidayCalendarQuery, [holidayCalendarId]);

        if (holidayCalendarResult[0].length == 0) {
            return error422("Holiday Calendar Not Found.", res);
        }
        const holidayCalendar = holidayCalendarResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Holiday Calendar Retrived Successfully",
            data: holidayCalendar
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
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

//download list
const getHolidayCalendarDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getHolidayCalendarQuery = `SELECT h.*, c.name, u.first_name, u.last_name
        FROM holiday_calendar h
        LEFT JOIN company c ON c.company_id = h.company_id
        LEFT JOIN users u ON u.user_id = h.user_id
        WHERE 1 AND h.status = 1`;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getHolidayCalendarQuery += ` AND (LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%')`;
        }
        getHolidayCalendarQuery += " ORDER BY h.cts DESC";

        let result = await connection.query(getHolidayCalendarQuery);
        let holidayCalendar = result[0];


        if (holidayCalendar.length === 0) {
            return error422("No data found.", res);
        }

        holidayCalendar = holidayCalendar.map((item, index) => ({
            "Sr No": index + 1,
            "Calendar Name": item.calendar_name,
            "Description": item.description,
            "Company Name": item.name,
            "Create By": `${item.first_name} ${item.last_name}`,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(holidayCalendar);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "holidayCalendarInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { createholiday_calendar, getHoliday, getHolidayCalendarById, list_with_details_holiday_calendar,updateHolidayCalendar,deleteholiday_calendar,holiday_calendarDropdown, onStatusChange, getHolidayCalendarDownload };
