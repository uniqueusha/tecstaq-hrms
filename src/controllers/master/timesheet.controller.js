const pool = require('../../../db');
const xlsx = require("xlsx");
const fs = require("fs");
const path = require('path');

//function to obtain a database connection 
const getConnection = async ()=> {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
//error handle 422...
error422 = (message, res)=>{
    return res.status(422).json({
        status:422,
        message:message
    });
}
//error handle 500...
error500 = (error, res)=>{
    return res.status(500).json({
        status:500,
        message:"Internal Server Error",
        error:error
    });
}

function calculateTotalHours(start_time, end_time) {

    const startParts = start_time.split(':');
    const endParts = end_time.split(':');

    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);

    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let diffMinutes = endTotalMinutes - startTotalMinutes;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}
//create timesheet...
const createTimesheet = async (req, res) => {
    const date = req.body.date ? req.body.date : '';
    const work_category_id = req.body.work_category_id ? req.body.work_category_id : '';
    const customer_id = req.body.customer_id ? req.body.customer_id : null;
    const task_name = req.body.task_name ? req.body.task_name.trim() : '';
    const description = req.body.description ? req.body.description.trim() : '';
    const start_time = req.body.start_time ? req.body.start_time.trim() : null;
    const end_time = req.body.end_time ? req.body.end_time.trim() : null;
    const user_id = req.user?.user_id;
    if (!user_id) {
        return error422("user_id is required.", res)
    } else if (!date) {
        return error422("Date is required.", res)
    } else if (!work_category_id) {
        return error422("Work Category Id is required.", res)
    } else if (!task_name) {
        return error422("Task Name is required.", res)
    } 
    let total_hours = calculateTotalHours(start_time, end_time);

//    let total_hours = null;

// if (start_time && end_time) {

//     const startParts = start_time.split(':');
//     const endParts = end_time.split(':');

//     const startHour = parseInt(startParts[0]);
//     const startMinute = parseInt(startParts[1]);

//     const endHour = parseInt(endParts[0]);
//     const endMinute = parseInt(endParts[1]);

//     const startTotalMinutes = startHour * 60 + startMinute;
//     const endTotalMinutes = endHour * 60 + endMinute;

//     let diffMinutes = endTotalMinutes - startTotalMinutes;

//     const hours = Math.floor(diffMinutes / 60);
//     const minutes = diffMinutes % 60;

//     total_hours = `${hours}:${minutes.toString().padStart(2, '0')}`;
// }

    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();

        //work category check exist 
        const workCategoryQuery = `SELECT * FROM work_category WHERE work_category_id = ?`;
        const workCategoryResult = await connection.query(workCategoryQuery, [work_category_id]);
        if (workCategoryResult[0].length == 0) {
            return error422("Work Category Not Found.", res);
        }
        //insert component type
        const insertQuery = ` INSERT INTO timesheet  (date, work_category_id, customer_id, task_name, description, start_time, end_time, total_hours, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) `;
        await connection.query(insertQuery, [ date, work_category_id, customer_id, task_name, description, start_time, end_time, total_hours, user_id ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Timesheet created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
//all Timesheet list
const getAllTimesheet = async (req, res) => {
    const { page, perPage, key } = req.query;
   
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getTimesheetQuery = `SELECT t.*, wc.work_category, c.customer_name, u.first_name, u.last_name 
        FROM timesheet t
        LEFT JOIN work_category wc ON wc.work_category_id = t.work_category_id
        LEFT JOIN customer c ON c.customer_id = t.customer_id
        LEFT JOIN users u ON u.user_id = t.user_id
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total  FROM timesheet t
        LEFT JOIN work_category wc ON wc.work_category_id = t.work_category_id
        LEFT JOIN customer c ON c.customer_id = t.customer_id
        LEFT JOIN users u ON u.user_id = t.user_id
        WHERE 1 `;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getTimesheetQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getTimesheetQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getTimesheetQuery += ` AND trim(LOWER(wc.work_category) LIKE '%${lowercaseKey}%' || LOWER(c.customer_name) LIKE '%${lowercaseKey}%' || LOWER(t.date) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND trim(LOWER(wc.work_category) LIKE '%${lowercaseKey}%' || LOWER(c.customer_name) LIKE '%${lowercaseKey}%' || LOWER(t.date) LIKE '%${lowercaseKey}%' )`;
            }
        }
        getTimesheetQuery += " ORDER BY t.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getTimesheetQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getTimesheetQuery);
        const timesheet = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Timesheet retrieved successfully",
            data: timesheet,
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

//Work Timesheet by id
const getTimesheet = async (req, res) => {
    const timesheetId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const timesheetQuery = `SELECT t.*, wc.work_category, c.customer_name, u.first_name, u.last_name 
        FROM timesheet t
        LEFT JOIN work_category wc ON wc.work_category_id = t.work_category_id
        LEFT JOIN customer c ON c.customer_id = t.customer_id
        LEFT JOIN users u ON u.user_id = t.user_id
        WHERE t.timesheet_id = ?`;
        const timesheetResult = await connection.query(timesheetQuery, [timesheetId]);
        if (timesheetResult[0].length == 0) {
            return error422("Timesheet Not Found.", res);
        }
        const timesheet = timesheetResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Timesheet Retrived Successfully",
            data: timesheet
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update timesheet
const updateTimesheet = async (req, res) => {
    const timesheetId = parseInt(req.params.id);
     const date = req.body.date ? req.body.date : '';
    const work_category_id = req.body.work_category_id ? req.body.work_category_id : '';
    const customer_id = req.body.customer_id ? req.body.customer_id : null;
    const task_name = req.body.task_name ? req.body.task_name.trim() : '';
    const description = req.body.description ? req.body.description.trim() : '';
    const start_time = req.body.start_time ? req.body.start_time.trim() : null;
    const end_time = req.body.end_time ? req.body.end_time.trim() : null;
    const user_id = req.user?.user_id;
    if (!date) {
        return error422("Date is required.", res)
    } else if (!work_category_id) {
        return error422("Work Category Id is required.", res)
    } else if (!task_name) {
        return error422("Task Name is required.", res)
    } 

    //work category check exist
    const workCategoryQuery = `SELECT * FROM work_category WHERE work_category_id = ?`;
    const workCategoryResult = await pool.query(workCategoryQuery, [work_category_id]);
    if (workCategoryResult[0].length == 0) {
        return error422("Work Category Not Found.", res);
    }

    //work customer check exist
    const customerQuery = `SELECT * FROM customer WHERE customer_id = ?`;
    const customerResult = await pool.query(customerQuery, [customer_id]);
    if (customerResult[0].length == 0) {
        return error422("Customer Not Found.", res);
    }

    //work timesheet check exist
    const timesheetQuery = `SELECT * FROM timesheet WHERE timesheet_id = ?`;
    const timesheetResult = await pool.query(timesheetQuery, [timesheetId]);
    if (timesheetResult[0].length == 0) {
        return error422("Timesheet Not Found.", res);
    }
    

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Update the timesheet record with new data
        const updateQuery = `
            UPDATE timesheet
            SET date = ?, work_category_id = ?, customer_id = ?, task_name = ?, description = ?, start_time = ?, end_time = ?
            WHERE timesheet_id = ?`;

        await connection.query(updateQuery, [ date, work_category_id, customer_id, task_name, description, start_time, end_time, timesheetId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Timesheet updated successfully.",
        });
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of timesheet ...
const onStatusChange = async (req, res) => {
    const timesheetId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        //work timesheet check exist
        const timesheetQuery = `SELECT * FROM timesheet WHERE timesheet_id = ?`;
        const timesheetResult = await connection.query(timesheetQuery, [timesheetId]);
        if (timesheetResult[0].length == 0) {
            return error422("Timesheet Not Found.", res);
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the timesheet
        const updateQuery = `
            UPDATE timesheet
            SET status = ?
            WHERE timesheet_id = ?
        `;

        await connection.query(updateQuery, [status, timesheetId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Timesheet ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get timesheet active...
const getTimesheetWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const timesheetQuery = `SELECT * FROM timesheet
        WHERE status = 1  ORDER BY date ASC`;

        const timesheetResult = await connection.query(timesheetQuery);
        const timesheet = timesheetResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Timesheet retrieved successfully.",
            data: timesheet,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
module.exports = {
   createTimesheet,
   getAllTimesheet,
   getTimesheet,
   updateTimesheet,
   onStatusChange,
   getTimesheetWma
   
}