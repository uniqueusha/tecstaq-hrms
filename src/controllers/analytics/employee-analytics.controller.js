const pool = require('../../../db');
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
const getEmployeeAnalytics = async (req, res) => {
  const { employee_id } = req.query;

  if (!employee_id) {
    return error422("Employee id is required.", res);
  }

  let connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Employee Details
    const [employeeResult] = await connection.query(`
      SELECT 
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.doj,
        es.shift_type_header_id,
        st.shift_type_name,
        eww.work_week_pattern_id,
        dp.department_name,
        wwp.pattern_name, ee.first_name AS reporting_manager_first_name,ee.last_name AS reporting_manager_last_name 
      FROM employee e
      LEFT JOIN employee_shift es
        ON es.employee_id = e.employee_id
      LEFT JOIN shift_type_header st
        ON st.shift_type_header_id = es.shift_type_header_id
      LEFT JOIN employee_work_week eww
        ON eww.employee_id = e.employee_id
      LEFT JOIN work_week_pattern wwp
        ON wwp.work_week_pattern_id = eww.work_week_pattern_id
      LEFT JOIN employee ee
        ON ee.employee_id = e.reporting_manager_id
      LEFT JOIN departments dp ON dp.departments_id = e.departments_id
      WHERE e.employee_id = ?
    `, [employee_id]);

    // Attendance Count
    const [attendanceCount] = await connection.query(`
      SELECT 
        SUM(a.status = 'P') AS present,
        SUM(a.status = 'A') AS absent,
        SUM(a.status = 'L') AS leave_count,
        SUM(a.late_by IS NOT NULL AND a.late_by != '00:00:00') AS late_count
      FROM attendance_master a
      LEFT JOIN employee e 
        ON e.employee_code = a.employee_code
      WHERE e.employee_id = ?
    `, [employee_id]);

    await connection.commit();

    return res.json({
      status: 200,
      message: "Employee analytics fetched successfully",
      data: {
        employee: employeeResult[0],
        attendance: attendanceCount[0]
      }
    });

  } catch (error) {
    await connection.rollback();
    return error500(error, res);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
    getEmployeeAnalytics,
};
