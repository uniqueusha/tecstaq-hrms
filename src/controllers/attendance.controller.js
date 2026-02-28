const XLSX = require("xlsx");
const moment = require("moment");
const pool = require('../../db');
const { body, param, validationResult } = require('express-validator');
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
const error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}
const importAttendanceFromBase64 = async (req, res) => {
    // validation run
    await Promise.all([
        body('file_base64').notEmpty().withMessage("File Base 64 is required.").run(req),
        body('file_name').notEmpty().withMessage("File Name is required").run(req),
        body('attendance_cycle').notEmpty().withMessage("Attendance cycle is required").run(req),
        body('attendance_month').notEmpty().withMessage("Attendance month is required.").isInt().withMessage("Invalid Attendance month.").run(req),
        body('attendance_year').notEmpty().withMessage("Attendance year is required.").isInt().withMessage("Invalid Attendance year.").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }

    const file_base64 = req.body.file_base64 ? req.body.file_base64.trim() : '';
    const file_name = req.body.file_name ? req.body.file_name.trim() : '';
    const attendance_cycle = req.body.attendance_cycle ? req.body.attendance_cycle.trim() : '';
    const attendance_month = req.body.attendance_month ? req.body.attendance_month : null;
    const attendance_year = req.body.attendance_year ? req.body.attendance_year : null;
    const remarks = req.body.remarks ? req.body.remarks : null;
    const user_id = req.user.user_id


    // Attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //check file already exists or not
        const isExistFileQuery = `SELECT * FROM attendance_upload WHERE file_name = ? `;
        const isExistFileResult = await pool.query(isExistFileQuery, [file_name]);
        if (isExistFileResult[0].length > 0) {
            return error422("File is already uploaded.", res);
        }
        const buffer = Buffer.from(file_base64, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        /* FIND DAYS ROW */
        const daysRowIndex = rows.findIndex(
            r => String(r[0]).trim().toLowerCase() === "days"
        );

        if (daysRowIndex === -1) {
            return res.status(422).json({ message: "Days row not found" });
        }

        const daysRow = rows[daysRowIndex];

        /* EXTRACT DAY NUMBERS */
        const days = [];
        for (let i = 1; i < daysRow.length; i++) {
            const match = String(daysRow[i]).match(/\d+/);
            if (match) days.push({ index: i, day: parseInt(match[0]) });
        }

        const result = [];

        /* LOOP THROUGH ROWS */
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            if (String(row[0]).trim().startsWith("Employee")) {
                const employeeRaw = row[2] || "";
                const employeeId = employeeRaw.split(":")[0].trim();
                const employeeName = employeeRaw.split(":")[1]?.trim() || "";
                // console.log('employeeRaw,',row);

                const statusRow = rows[i + 1];
                const inTimeRow = rows[i + 2];
                const outTimeRow = rows[i + 3];
                const durationRow = rows[i + 4];
                const lateByRow = rows[i + 5];
                const earlyByRow = rows[i + 6];
                const otRow = rows[i + 7];
                const shiftRow = rows[i + 8];

                const records = [];

                for (const d of days) {

                    let attendance_date = moment(`2025-01-${d.day}`, "YYYY-MM-DD").format("YYYY-MM-DD")
                    let status = statusRow?.[d.index] || null
                    let in_time = inTimeRow?.[d.index] || null
                    let out_time = outTimeRow?.[d.index] || null
                    let duration = durationRow?.[d.index] || null
                    let late_by = lateByRow?.[d.index] || null
                    let early_by = earlyByRow?.[d.index] || null
                    let ot = otRow?.[d.index] || null
                    let shift = shiftRow?.[d.index] || null
                    records.push({
                        attendance_date: attendance_date,
                        status: status,
                        in_time: in_time,
                        out_time: out_time,
                        duration: duration,
                        late_by: late_by,
                        early_by: early_by,
                        ot: ot,
                        shift: shift,
                    });
                    const isExistAttendanceQuery = "SELECT * FROM attendance_master WHERE employee_code = ? AND attendance_date = ?"
                    const [rows] = await connection.query(isExistAttendanceQuery, [employeeId, attendance_date]);
                    if (rows.length === 0) {
                        // Insert into DB  
                        const sql = "INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, shift, medium) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
                        await connection.query(sql, [employeeId, employeeName, attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, shift, 'excel-sheet'])
                    } else {
                        const updateSql = `
              UPDATE attendance_master
              SET employee_name = ?, status = ?, in_time = ?, out_time = ?, duration = ?, late_by = ?, early_by = ?, ot = ?, shift = ?, medium = ?
              WHERE employee_code = ?
                AND attendance_date = ?
              `;
                        await connection.query(updateSql, [employeeName, status, in_time, out_time, duration, late_by, early_by, ot, shift, 'excel-sheet', employeeId, attendance_date]);
                    }


                }
                result.push({
                    employee_code: employeeId,
                    employee_name: employeeName,
                    records
                });
            }
        }

        // Insert into attendance upload 
        const insertAttendanceUploadQuery = "INSERT INTO attendance_upload ( file_name, records, attendance_cycle, attendance_month, attendance_year, remarks, created_by) VALUES ( ?, ?, ?, ?, ?, ?, ? )";
        const insertAttendanceUploadValues = [file_name, result.length, attendance_cycle, attendance_month, attendance_year, remarks, user_id];
        await connection.query(insertAttendanceUploadQuery, insertAttendanceUploadValues)

        //commit the transation
        await connection.commit();
        return res.json({
            status: 200,
            employees: result.length,
            // attendanceData: insertAttendanceUploadValues
        });

    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
const getEmployeeAttendanceByEmployeeCode = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_code } = req.query;
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT a.* 
        FROM attendance_master a
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total         
        FROM attendance_master a
        WHERE 1 `;

        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (employee_code) {
            getQuery += ` AND a.employee_code = '${employee_code}'`;
            countQuery += `  AND a.employee_code = '${employee_code}'`;
        }
        getQuery += " ORDER BY a.attendance_date DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const employee_attendance = result[0];
        // calendarDetails
        let getEmployeeQuery = `SELECT e.employee_id, e.company_id, e.departments_id, e.designation_id, e.employment_type_id, e.employee_code, e.title, e.first_name, e.last_name, e.holiday_calendar_id,
        eww.work_week_pattern_id  
        FROM employee e  
        LEFT JOIN employee_work_week eww 
        ON e.employee_id = eww.employee_id

        WHERE e.employee_code = ?`
        //LEFT JOIN work_week_pattern wwp
        //ON eww.work_week_pattern_id = wwp.work_week_pattern_id
        let getEmployeeResult = await connection.query(getEmployeeQuery, [employee_code]);
        if (getEmployeeResult[0].length == 0) {
            return error422("Employee Not Found", res);
        }
        let getCalendarDetailsQuery = "SELECT * FROM holiday_calendar_details WHERE holiday_calendar_id = ?"
        let getCalendarDetails = await connection.query(getCalendarDetailsQuery, [getEmployeeResult[0][0].holiday_calendar_id])

        let getWorkWeekPatternQuery = 'SELECT * FROM work_week_pattern WHERE work_week_pattern_id =? '
        let [workWeekPatternResult] = await connection.query(getWorkWeekPatternQuery, [getEmployeeResult[0][0].work_week_pattern_id])

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employee Attendance retrieved successfully",
            data: employee_attendance,
            calendarDetails: getCalendarDetails[0],
            workWeekPatternDetails: workWeekPatternResult[0]
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
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const getAttendanceUploadList = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id } = req.query;
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT a.*, e.first_name, e.last_name 
        FROM attendance_upload a
        LEFT JOIN employee e
        ON e.employee_id = a.created_by
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total         
        FROM attendance_upload a
        LEFT JOIN employee e
        ON e.employee_id = a.created_by
        WHERE 1 `;

        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(a.created_at) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(a.created_at) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (employee_id) {
            getQuery += ` AND a.created_by = '${employee_id}'`;
            countQuery += `  AND a.created_by = '${employee_id}'`;
        }
        getQuery += " ORDER BY a.created_at DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const employee_attendance = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Attendance upload retrieved successfully",
            data: employee_attendance,
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
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const checkIn = async (req, res) => {
    let employee_code = req.body.employee_code ? req.body.employee_code : '';
    let attendance_date = req.body.attendance_date ? req.body.attendance_date : '';
    let in_time = req.body.in_time ? req.body.in_time : '';

    if (!employee_code) {
        return error422("Employee code is required.", res)
    } else if (!attendance_date) {
        return error422("Attendance date is required.", res)
    } else if (!in_time) {
        return error422("In time is required.", res);
    }
    let isExistEmployeeQuery = `SELECT employee_code, CONCAT(first_name,' ',last_name) AS employee_name FROM employee WHERE employee_code = '${employee_code}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery);
    if (isExistEmployeeResult[0].length == 0) {
        return error422("Employee Not Found.", res)
    }
    const employee_name = isExistEmployeeResult[0][0].employee_name;
    let isExistAttendanceQuery = `SELECT in_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery, [employee_code, attendance_date]);
    if (isExistAttendanceResult[0].length > 0) {
        return error422("Employee already checked in.", res);
    }

    let connection
    try {
        connection = await pool.getConnection()
        const insertAttendanceQuery = `INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, medium) VALUES ( ?, ?, ?, ?, ?, ?)`;
        await connection.query(insertAttendanceQuery, [employee_code, employee_name, attendance_date, 'P', in_time, 'manual']);

        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Check In successfully."
        })
    } catch (error) {
        if (connection) await connection.rollback()
        return error500(error, res)
    } finally {
        if (connection) await connection.release()
    }
}
const checkOut = async (req, res) => {
    let employee_code = req.body.employee_code ? req.body.employee_code : '';
    let attendance_date = req.body.attendance_date ? req.body.attendance_date : '';
    let out_time = req.body.out_time ? req.body.out_time : '';

    if (!employee_code) {
        return error422("Employee code is required.", res)
    } else if (!attendance_date) {
        return error422("Attendance date is required.", res);
    } else if (!out_time) {
        return error422("Out time is required.", res)
    }
    let isExistEmployeeQuery = ` SELECT employee_code, CONCAT(first_name,'',last_name) AS employee_name FROM employee WHERE employee_code = '${employee_code}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery)
    if (isExistEmployeeResult[0].length == 0) {
        return error422("Employee Not Found.", res)
    }
    const employee_name = isExistEmployeeResult[0][0].employee_name;
    let isExistAttendanceQuery = `SELECT in_time, out_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery, [employee_code, attendance_date])
    if (isExistAttendanceResult[0].length === 0) {
        return error422("Check-in not found. Please check in first.", res)
    }
    const { in_time, out_time: existingOutTime } = isExistAttendanceResult[0][0];

    //  Validation
    if (!in_time || in_time === '00:00:00') {
        return error422("Employee has not checked in yet.", res);
    }

    if (existingOutTime && existingOutTime !== '00:00:00') {
        return error422("Employee already checked out.", res);
    }

    // Validate time order
    const inMoment = moment(in_time, "HH:mm:ss");
    const outMoment = moment(out_time, "HH:mm:ss");

    if (outMoment.isSameOrBefore(inMoment)) {
        return error422("Out time must be after in time.", res);
    }

    //Calculate duration
    const durationMinutes = outMoment.diff(inMoment, "minutes");
    const duration = moment.utc(durationMinutes * 60 * 1000).format("HH:mm:ss");
    let connection
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        //  Update attendance
        await connection.query(
            `UPDATE attendance_master
       SET out_time = ?, duration = ?, status = 'P', medium = 'manual'
       WHERE employee_code = ?
         AND attendance_date = ?`,
            [out_time, duration, employee_code, attendance_date]
        );

        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Check-out successfully.",
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error422(error, res)
    } finally {
        if (connection) await connection.release();
    }
}
const importAttendanceManual = async (req, res) => {
    // validation run
    await Promise.all([
        body('file_base64').notEmpty().withMessage("File Base 64 is required.").run(req),
        body('file_name').notEmpty().withMessage("File Name is required").run(req),
        body('month').notEmpty().withMessage("Month is required.").isInt().withMessage("Invalid month.").run(req),
        body('year').notEmpty().withMessage("Year is required.").isInt().withMessage("Invalid year.").run(req)
    ]);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return error422(errors.array()[0].msg, res)
    }

    const file_base64 = req.body.file_base64 ? req.body.file_base64.trim() : '';
    const file_name = req.body.file_name ? req.body.file_name.trim() : '';
    const month = req.body.month ? req.body.month : null;
    const year = req.body.year ? req.body.year : null;
    const remarks = req.body.remarks ? req.body.remarks : null;
    const user_id = req.user.user_id


    // Attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //check file already exists or not
        const isExistFileQuery = `SELECT * FROM attendance_upload_manual WHERE file_name = ? `;
        const isExistFileResult = await pool.query(isExistFileQuery, [file_name]);
        if (isExistFileResult[0].length > 0) {
            return error422("File is already uploaded.", res);
        }
        const buffer = Buffer.from(file_base64, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        /* FIND DAYS ROW */
        const daysRowIndex = rows.findIndex(
            r => String(r[0]).trim().toLowerCase() === "days"
        );

        if (daysRowIndex === -1) {
            return res.status(422).json({ message: "Days row not found" });
        }

        const daysRow = rows[daysRowIndex];

        /* EXTRACT DAY NUMBERS */
        const days = [];
        for (let i = 1; i < daysRow.length; i++) {
            const match = String(daysRow[i]).match(/\d+/);
            if (match) days.push({ index: i, day: parseInt(match[0]) });
        }

        let records = [];

        for (let i = 0; i < rows.length; i++) {

            // detect employee start
            if (rows[i][0] === 'employee_code:') {

                const employee_code = rows[i][1];

                const statusRow = rows[i + 1];
                const inTimeRow = rows[i + 2];
                const outTimeRow = rows[i + 3];
                const durationRow = rows[i + 4] || [];
                const lateByRow = rows[i + 5] || [];
                const earlyByRow = rows[i + 6] || [];
                const otRow = rows[i + 7] || [];
                
                // loop days
                for (let d = 0; d < days.length; d++) {
                    
                    const attendance_date = moment(
                        `${year}-${month}-${days[d].day}`,
                        "YYYY-MM-DD"
                    ).format("YYYY-MM-DD");
                    
                    const status = statusRow?.[d + 1] || null;
                    const in_time = excelTimeToHHMM(inTimeRow?.[d + 1]);
                    const out_time = excelTimeToHHMM(outTimeRow?.[d + 1]);
                    const duration = durationRow?.[d + 1] || null;
                    const late_by = lateByRow?.[d + 1] || null;
                    const early_by = earlyByRow?.[d + 1] || null;
                    const ot = otRow?.[d + 1] || null;
                    if (attendance_date != 'Invalid date') {
                        records.push({
                            employee_code,
                            attendance_date,
                            status: status,
                            in_time: in_time,
                            out_time: out_time,
                            duration: duration,
                            late_by: late_by,
                            early_by: early_by,
                            ot: ot,
                        });
                    }
                    if (attendance_date != 'Invalid date') {
                        const isExistAttendanceQuery = "SELECT * FROM attendance_master WHERE employee_code = ? AND attendance_date = ?"
                        const [rows] = await connection.query(isExistAttendanceQuery, [employee_code, attendance_date]);
                        if (rows.length === 0) {
                            // Insert into DB  
                            const sql = "INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, shift, medium) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
                            await connection.query(sql, [employee_code, '', attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, '', 'excel-sheet-manual'])
                        } else {
                            const updateSql = `
                        UPDATE attendance_master
                        SET employee_name = ?, status = ?, in_time = ?, out_time = ?, duration = ?, late_by = ?, early_by = ?, ot = ?, shift = ?, medium = ?
                        WHERE employee_code = ?
                          AND attendance_date = ?
                        `;
                            await connection.query(updateSql, ['', status, in_time, out_time, duration, late_by, early_by, ot, '', 'excel-sheet-manual', employee_code, attendance_date]);
                        }

                    }
                    

                

                }
            }
        }
        function excelTimeToHHMM(value) {
            if (!value && value !== 0) return null;

            const totalSeconds = Math.round(value * 24 * 60 * 60);

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        // Insert into attendance upload manual 
        const insertAttendanceUploadQuery = "INSERT INTO attendance_upload_manual ( file_name, records, month, year, remarks, created_by) VALUES ( ?, ?, ?, ?, ?, ? )";
        const insertAttendanceUploadValues = [file_name, records.length, month, year, remarks, user_id];
        await connection.query(insertAttendanceUploadQuery, insertAttendanceUploadValues) 

        //commit the transation
        await connection.commit();
        return res.json({
            status: 200,
            // employees: result.length,
            // attendanceData: insertAttendanceUploadValues,
            rows: records
        });

    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
const getAttendanceUploadManualList = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id } = req.query;
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT a.*, e.first_name, e.last_name 
        FROM attendance_upload_manual a
        LEFT JOIN employee e
        ON e.employee_id = a.created_by
        WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total         
        FROM attendance_upload_manual a
        LEFT JOIN employee e
        ON e.employee_id = a.created_by
        WHERE 1 `;

        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(a.created_at) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(a.created_at) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (employee_id) {
            getQuery += ` AND a.created_by = '${employee_id}'`;
            countQuery += `  AND a.created_by = '${employee_id}'`;
        }
        getQuery += " ORDER BY a.created_at DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const employee_attendance = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Attendance upload manual retrieved successfully",
            data: employee_attendance,
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
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    importAttendanceFromBase64,
    getEmployeeAttendanceByEmployeeCode,
    getAttendanceUploadList,
    checkIn,
    checkOut,
    importAttendanceManual,
    getAttendanceUploadManualList
};
