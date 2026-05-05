const { log } = require('console');
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
const autoCheckOut1 = async (req, res) => {
  const GRACE_HOURS = 2;
  let date = req.query.date;
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const now = new Date();
    const getEmployeeQuery = `
      SELECT 
        e.employee_code,
        e.first_name,
        e.last_name,
        e.holiday_calendar_id,
        st.end_time,
        am.attendance_date,
        am.in_time,
        am.out_time,
        h.holiday_date
      FROM employee e
      LEFT JOIN employee_shift es
        ON es.employee_id = e.employee_id
      LEFT JOIN shift_type_header st
        ON st.shift_type_header_id = es.shift_type_header_id
      LEFT JOIN attendance_master am
        ON am.employee_code = e.employee_code
        AND am.attendance_date = ?
      LEFT JOIN holiday_calendar_details h
        ON h.holiday_calendar_id = e.holiday_calendar_id
        AND h.holiday_date = ?
      WHERE e.employee_status = 'active'
      AND e.status = 1
    `;

    const [employees] = await connection.query(getEmployeeQuery, [date, date]);
    for (const emp of employees) {
      const employeeName = `${emp.first_name} ${emp.last_name}`;
      // CASE 1: Holiday
      if (emp.holiday_date) {
        continue;
      }
      // CASE 2: No attendance record → Absent
      if (!emp.attendance_date) {
        await connection.query(`
          INSERT INTO attendance_master
          (employee_code, employee_name, attendance_date, status, medium)
          VALUES (?, ?, ?, 'A', 'auto')
        `, [emp.employee_code, employeeName, date]);
        continue;
      }
      // CASE 3: Checked in but not checked out
      if (emp.in_time && !emp.out_time && emp.end_time) {
        const shiftEnd = new Date(date);
        const [h, m, s] = emp.end_time.split(':');
        shiftEnd.setHours(h);
        shiftEnd.setMinutes(m);
        shiftEnd.setSeconds(s);
        // add grace time
        shiftEnd.setHours(shiftEnd.getHours() + GRACE_HOURS);
        if (now > shiftEnd) {
          const out_time = shiftEnd.toTimeString().split(' ')[0];
          await connection.query(`
            UPDATE attendance_master
            SET out_time = ?, medium = 'auto'
            WHERE employee_code = ?
            AND attendance_date = ?
          `, [out_time, emp.employee_code, date]);
        }
      }
      // CASE 4: if weekend then not set asent check if employee working then add present otherwise  holiday
    }
    await connection.commit();
    return res.json({
      status: 200,
      message: "Auto checkout, holiday and absent marking completed"
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return error500(error, res);
  } finally {
    if (connection) connection.release();
  }
};
const autoCheckOut = async (req, res) => {
  const GRACE_HOURS = 2;
  let date = req.query.date;
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const now = new Date();
    const getEmployeeQuery = `
              SELECT 
          e.employee_code,
          e.employee_id,
          e.first_name,
          e.last_name,
          e.holiday_calendar_id,
          st.end_time,
          am.attendance_date,
          am.in_time,
          am.out_time,
          h.holiday_date,
          wwp.working_days
        FROM employee e
        LEFT JOIN employee_shift es
          ON es.employee_id = e.employee_id
        LEFT JOIN shift_type_header st
          ON st.shift_type_header_id = es.shift_type_header_id
        LEFT JOIN attendance_master am
          ON am.employee_code = e.employee_code
          AND am.attendance_date = ?
        LEFT JOIN holiday_calendar_details h
          ON h.holiday_calendar_id = e.holiday_calendar_id
          AND h.holiday_date = ?
        LEFT JOIN employee_work_week eww
          ON eww.employee_id = e.employee_id
        LEFT JOIN work_week_pattern wwp
          ON wwp.work_week_pattern_id = eww.work_week_pattern_id
        WHERE e.employee_status = 'active'
        AND e.status = 1
        `;

    const [employees] = await connection.query(getEmployeeQuery, [date, date]);
    for (const emp of employees) {

      const employeeName = `${emp.first_name} ${emp.last_name}`;

      // CASE 1 Holiday
      if (emp.holiday_date) {
        continue;
      }

      // CASE 2 Weekend
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });

      if (emp.working_days) {
        const workingDays = emp.working_days.split(',').map(d => d.trim());

        if (!workingDays.includes(dayName)) {
          continue; // weekend skip
        }
      }

      // CASE 3 No attendance → Absent
      if (!emp.attendance_date) {

        await connection.query(`
          INSERT INTO attendance_master
          (employee_code, employee_name, attendance_date, status, medium)
          VALUES (?, ?, ?, 'A', 'auto')
        `, [emp.employee_code, employeeName, date]);

        continue;
      }

      // CASE 4 Auto checkout
      if (emp.in_time && !emp.out_time && emp.end_time) {

        const shiftEnd = new Date(date);
        const [h, m, s] = emp.end_time.split(':');

        shiftEnd.setHours(h);
        shiftEnd.setMinutes(m);
        shiftEnd.setSeconds(s);

        shiftEnd.setHours(shiftEnd.getHours() + GRACE_HOURS);

        if (now > shiftEnd) {
          const out_time = shiftEnd.toTimeString().split(' ')[0];
          await connection.query(`
           UPDATE attendance_master
           SET out_time = ?, medium = 'auto'
           WHERE employee_code = ?
           AND attendance_date = ?
         `, [out_time, emp.employee_code, date]);

        }
      }

    }
    await connection.commit();
    return res.json({
      status: 200,
      message: "Auto checkout, holiday and absent marking completed"
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return error500(error, res);
  } finally {
    if (connection) connection.release();
  }
};
//birth send email
const empEmail =async (req, res) => {
    const newDate = new Date();
const todayDate = newDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try{
       
        let getQuery = `SELECT * FROM employee WHERE DATE_FORMAT(dob, '%d/%m') = DATE_FORMAT(?, '%d/%m')`;
        let [result] = await connection.query(getQuery,[todayDate]);
        let first_name = result[0].first_name;

        let full_name = result[0].title +" "+ result[0].first_name +" "+ result[0].last_name;
        const empMessage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave Request</title>
</head>
<body style="margin:0; padding:20; background-color:#f4f4f4; font-family: Arial, sans-serif; ">

    <table align="center" width="70%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff; border-radius:8px; overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding:20px; background-color:#F3F6FF">
                            <img src="https://hrms.tecstaq.com:3000/assets/images/Empflowhr_Logo.png" alt="Company Logo" width="180" />
                        </td>
                    </tr>
      
                    <!-- Content Box -->
                    <tr width="200" height="100" style="background-image: url('http://localhost:3000/assets/images/cake.png'); 
           background-size: cover; 
           background-position: center; 
           background-repeat: no-repeat;">
                        <td style="padding:30px;">
                            <h2 style="margin:0; color:#fff;">
                             Happy Birthday ${first_name}</h2>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 20px 40px 0;">
                            <h3>Dear ${full_name}, <h3>
                        </td>
                    </tr>
                   
                        <tr>
                            <td style="padding:10px 40px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6FF;border-radius:10px;color:#596780;">
                                    <tr>
                                        <td width="70" style="padding:20px;">
                                            <p>May your birthday and every day be filled with the warmth of sunshine, the happiness of smiles, the sounds of laughter, the feeling of love and the sharing of good cheer.</p>
                                            <p>Have a wonderful, happy, healthy birthday now and forever.<strong>Happy Birthday!</strong></P>
                                            <p>Thank you.</p>
                                            <p>Regards<br>
                                            TECSTAQ</p>
                                        </td>
                                    </tr>   
                                </table>
                            </td>
                        </tr>
    
                    <tr>
                        <td align="center" style="padding:20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-top:1px solid #dcdcdc; font-size:0; line-height:0;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding:10px 0; font-family:Arial, sans-serif; font-size:12px; color:#7a7a7a;">
                                        This is automated message, please do not reply to this email.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
`;


        const empMailOptions  = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: result.map(item => item.email_id),
            // to: [created_email_id, email_id, customer_email_id].filter(Boolean), 
            subject: `Leave Request created Successfully`,
            html: empMessage,
        };
        return res.status(200).send(empMessage);
        // await transporter.sendMail(empMailOptions);
        // return res.status(200).json({
        //     status: 200,
        //     message: "Leave Request created Successfully"
        // })
    } catch (error ) {
      console.log(error);
      
        await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) await connection.release()
    }

}
module.exports = {
  autoCheckOut,
  empEmail
};