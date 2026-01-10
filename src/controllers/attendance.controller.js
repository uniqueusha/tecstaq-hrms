const XLSX = require("xlsx");
const moment = require("moment");
const pool = require('../common/db');
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
    // Attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
    const { file_base64,file_name } = req.body;
      const user_id = req.user.user_id
    if (!file_base64) {
      return error422("Excel file required", res)
    }else if (!file_name) {
      return error422("Excel file name required", res)
    }
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
 
           let attendance_date =   moment(`2025-01-${d.day}`, "YYYY-MM-DD").format("YYYY-MM-DD")
           let status =   statusRow?.[d.index] || null
           let in_time =   inTimeRow?.[d.index] || null
           let out_time =   outTimeRow?.[d.index] || null
           let duration =   durationRow?.[d.index] || null
           let late_by =   lateByRow?.[d.index] || null
           let early_by =   earlyByRow?.[d.index] || null
           let ot =   otRow?.[d.index] || null
           let shift =   shiftRow?.[d.index] || null
          records.push({
            attendance_date:attendance_date,
            status:status,
            in_time:in_time,
            out_time:out_time,
            duration:duration,
            late_by:late_by,
            early_by:early_by,
            ot:ot,
            shift:shift,
          });
          const isExistAttendanceQuery = "SELECT * FROM attendance_master WHERE employee_code = ? AND attendance_date = ?"
          const [rows] = await connection.query(isExistAttendanceQuery, [employeeId,attendance_date]);
          if (rows.length === 0) {
          // Insert into DB  
          const sql = "INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, shift, medium) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
          await connection.query(sql, [employeeId, employeeName,attendance_date,  status, in_time, out_time, duration, late_by, early_by, ot, shift, 'excel-sheet'])
          }else{
            const updateSql = `
              UPDATE attendance_master
              SET employee_name = ?, status = ?, in_time = ?, out_time = ?, duration = ?, late_by = ?, early_by = ?, ot = ?, shift = ?, medium = ?
              WHERE employee_code = ?
                AND attendance_date = ?
              `;
              await connection.query(updateSql, [ employeeName, status, in_time, out_time, duration, late_by, early_by, ot, shift, 'excel-sheet', employeeId, attendance_date]);
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
    const insertAttendanceUploadQuery = "INSERT INTO attendance_upload ( file_name, records, created_by) VALUES ( ?, ?, ? )";
    const insertAttendanceUploadValues = [file_name, result.length, user_id];
    await connection.query(insertAttendanceUploadQuery,insertAttendanceUploadValues)

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
        let getEmployeeQuery = `SELECT employee_id, company_id, departments_id, designation_id, employment_type_id, employee_code, title, first_name, last_name,holiday_calendar_id  FROM employee WHERE employee_code = ?`
        let getEmployeeResult = await connection.query(getEmployeeQuery,[employee_code]);
        if (getEmployeeResult[0].length==0) {
          return error422("Employee Not Found", res);
        }
        let getCalendarDetailsQuery = "SELECT * FROM holiday_calendar_details WHERE holiday_calendar_id = ?"
        let getCalendarDetails = await connection.query(getCalendarDetailsQuery,[getEmployeeResult[0][0].holiday_calendar_id])
       
        
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employee Attendance retrieved successfully",
            data: employee_attendance,
            calendarDetails:getCalendarDetails[0]
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
const checkIn = async (req, res)=>{
    let employee_code = req.body.employee_code ? req.body.employee_code :'';
    let attendance_date = req.body.attendance_date ? req.body.attendance_date :'';
    let in_time = req.body.in_time ? req.body.in_time :'';
    
    if (!employee_code) {
        return error422("Employee code is required.", res)
    } else if(!attendance_date) {
        return error422("Attendance date is required.", res)
    } else if(!in_time) {
        return error422("In time is required.", res);
    }
    let isExistEmployeeQuery = `SELECT employee_code, CONCAT(first_name,' ',last_name) AS employee_name FROM employee WHERE employee_code = '${employee_code}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery);
    if (isExistEmployeeResult[0].length==0) {
        return error422("Employee Not Found.", res)
    }
    const employee_name = isExistEmployeeResult[0][0].employee_name;
    let isExistAttendanceQuery = `SELECT in_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery,[employee_code, attendance_date]);
    if (isExistAttendanceResult[0].length > 0) {
        return error422("Employee already checked in.", res);
    }

    let connection
    try {
        connection = await pool.getConnection()
        const insertAttendanceQuery = `INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, medium) VALUES ( ?, ?, ?, ?, ?, ?)`;
        await connection.query(insertAttendanceQuery,[employee_code, employee_name, attendance_date, 'P', in_time, 'manual']);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Check In successfully."
        })
    } catch (error) {
        if(connection) await connection.rollback()
        return error500(error, res)
    } finally {
        if(connection) await connection.release()
    }
}
const checkOut = async (req, res) => {
    let employee_code = req.body.employee_code ? req.body.employee_code : '';
    let attendance_date = req.body.attendance_date ? req.body.attendance_date : '';
    let out_time = req.body.out_time ? req.body.out_time :'';
    
    if (!employee_code) {
        return error422("Employee code is required.", res)
    } else if(!attendance_date) {
        return error422("Attendance date is required.", res);
    } else if(!out_time) {
        return error422("Out time is required.", res)
    }
    let isExistEmployeeQuery = ` SELECT employee_code, CONCAT(first_name,'',last_name) AS employee_name FROM employee WHERE employee_code = '${employee_code}' `;
    let isExistEmployeeResult = await pool.query(isExistEmployeeQuery)
    if (isExistEmployeeResult[0].length==0) {
        return error422("Employee Not Found.", res)
    }
    const employee_name = isExistEmployeeResult[0][0].employee_name;
    let isExistAttendanceQuery = `SELECT in_time, out_time FROM attendance_master WHERE employee_code = ? AND attendance_date = ?`;
    let isExistAttendanceResult = await pool.query(isExistAttendanceQuery,[employee_code, attendance_date])
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
        if(connection) await connection.rollback();
        return error422(error, res)
    } finally {
        if(connection) await connection.release();
    }
}

module.exports = { 
  importAttendanceFromBase64,
  getEmployeeAttendanceByEmployeeCode,
  getAttendanceUploadList,
  checkIn,
  checkOut
};
