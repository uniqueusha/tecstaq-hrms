const XLSX = require("xlsx");
const moment = require("moment");
const pool = require('../common/db');
//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
} 
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
    const { fileBase64,file_name } = req.body;
      const user_id = req.user.user_id
    if (!fileBase64) {
      return error422("Excel file required", res)
    }else if (!file_name) {
      return error422("Excel file name required", res)
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    /* 🔹 FIND DAYS ROW */
    const daysRowIndex = rows.findIndex(
      r => String(r[0]).trim().toLowerCase() === "days"
    );

    if (daysRowIndex === -1) {
      return res.status(422).json({ message: "Days row not found" });
    }

    const daysRow = rows[daysRowIndex];

    /* 🔹 EXTRACT DAY NUMBERS */
    const days = [];
    for (let i = 1; i < daysRow.length; i++) {
      const match = String(daysRow[i]).match(/\d+/);
      if (match) days.push({ index: i, day: parseInt(match[0]) });
    }

    const result = [];

    /* 🔹 LOOP THROUGH ROWS */
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
          const isExistAttendanceQuery = "SELECT * FROM attendance_master WHERE employe_code = ? AND attendance_date = ?"
          const [rows] = await connection.query(isExistAttendanceQuery, [employeeId,attendance_date]);
          if (rows.length === 0) {
          // Insert into DB  
          const sql = "INSERT INTO attendance_master ( employee_code, employee_name, attendance_date, status, in_time, out_time, duration, late_by, early_by, ot, shift, medium) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
          await connection.query(sql, [employeeId, employeeName,attendance_date,  status,status, in_time, out_time, duration, late_by, early_by, ot, shift, 'excel-sheet'])
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

module.exports = { importAttendanceFromBase64 };
