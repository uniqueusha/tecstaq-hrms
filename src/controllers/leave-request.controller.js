const pool = require('../common/db')
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
const createLeaveRequest = async (req, res) => {

    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const leave_type_id = req.body.leave_type_id ? req.body.leave_type_id : null;
    const start_date = req.body.start_date ? req.body.start_date : null;
    const end_date = req.body.end_date ? req.body.end_date : null;
    const total_days = req.body.total_days ? req.body.total_days : null;
    const reason = req.body.reason ? req.body.reason : null;
    const approver_id = req.body.approver_id ? req.body.approver_id : null;

    if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!leave_type_id) {
        return error422("Leave type is required.", res);
    } else if (!start_date) {
        return error422("Start date is required.", res);
    } else if (!end_date) {
        return error422("End date is required.", res);
    } else if (!total_days) {
        return error422("Total days is required.", res);
    } else if (!reason) {
        return error422("Reason is required.", res);
    }else if (!approver_id) {
        return error422("approver_id is required.", res);
    }

    const connection = await pool.getConnection();
    try {
        //is leave type
        let isLeaveTypeQuery = "SELECT * FROM leave_type_master WHERE leave_type_master_id = ?";
        let [isLeaveTypeResult] = await connection.query(isLeaveTypeQuery, [leave_type_id])
        let leave_type = isLeaveTypeResult[0];
        if (!leave_type) {
            return error422("Leave Type not found.", res)
        }
        if (parseFloat(leave_type.number_of_days)<parseFloat(total_days)) {
            return error422("Leave limit is over.", res);
        }
        //is leave balance
        let isLeaveBalanceQuery="SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leave_type_id, employee_id]);
        let leaveBalance = isLeaveBalanceResult[0];
        if (leaveBalance) {
            if (parseFloat(leaveBalance.remaining_days)<parseFloat(total_days)) {
            return error422("Your leave limit is over.", res);
            } 
        }
         
        //insert into leave request
        let leaveRequestQuery = " INSERT INTO leave_request (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id) VALUES (?,?,?,?,?,?,?)";
        let leaveRequest = await connection.query(leaveRequestQuery,[employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id])
        const leave_request_id = leaveRequest[0].insertId;
        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery,[leave_request_id, approver_id, "Pending", reason])

        await connection.commit();

        return res.status(200).json({
            status:200,
            message:"Leave Request created Successfully"
        })
    } catch (error) {
        if (connection) await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) await connection.release()
    }
}
// get leave requests...
const getLeaveRequests = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id, approver_id, leave_type_id } = req.query;

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, e.first_name, e.last_name, em.first_name AS approver_first_name , em.last_name AS approver_last_name,
        lt.leave_type_name 
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE 1`;
        
        let countQuery = `SELECT COUNT(*) AS total FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
                getQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
                countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || (LOWER(em.first_name) LIKE '%${lowercaseKey}%' ||  LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(em.last_name) LIKE '%${lowercaseKey}%' || LOWER(lt.leave_type_name) LIKE '%${lowercaseKey}%' || LOWER(lq.reason) LIKE '%${lowercaseKey}%') )`;
        }
        // from date and to date
        if (fromDate && toDate) {
            getQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(lq.applied_date) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (employee_id) {
            getQuery += ` AND lq.employee_id = ${employee_id}`;
            countQuery += `  AND lq.employee_id = ${employee_id}`;
        }
        if (approver_id) {
            getQuery += ` AND lq.approver_id = ${approver_id}`;
            countQuery += `  AND lq.approver_id = ${approver_id}`;
        }
        if (leave_type_id) {
            getQuery += ` AND lq.leave_type_id = ${leave_type_id}`;
            countQuery += `  AND lq.leave_type_id = ${leave_type_id}`;
        }

        getQuery += " ORDER BY lq.applied_date DESC";
        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getQuery);
        const leaveRequests = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave Requests retrieved successfully",
            data: leaveRequests,
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
//get leave request..
const getLeaveRequest = async (req, res) => {
    const leave_request_id =parseInt(req.params.id)

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, e.employee_first_name, e.employee_last_name, em.employee_first_name AS approver_first_name , em.employee_last_name AS approver_last_name,
        lt.leave_type_name 
        FROM leave_request lq
        LEFT JOIN employee e ON e.employee_id = lq.employee_id
        LEFT JOIN employee em ON em.employee_id = lq.approver_id
        LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery,[leave_request_id]);
        const leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Leave Request retrieved successfully",
            data: leaveRequest,
        };
        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
const updateLeaveRequest = async (req, res) =>{
    const leave_request_id =parseInt(req.params.id);
    const employee_id = req.body.employee_id ? req.body.employee_id : null;
    const leave_type_id = req.body.leave_type_id ? req.body.leave_type_id : null;
    const start_date = req.body.start_date ? req.body.start_date : null;
    const end_date = req.body.end_date ? req.body.end_date : null;
    const total_days = req.body.total_days ? req.body.total_days : null;
    const reason = req.body.reason ? req.body.reason : null;
    const approver_id = req.body.approver_id ? req.body.approver_id : null;
     if (!employee_id) {
        return error422("Employee id is required.", res);
    } else if (!leave_type_id) {
        return error422("Leave type is required.", res);
    } else if (!start_date) {
        return error422("Start date is required.", res);
    } else if (!end_date) {
        return error422("End date is required.", res);
    } else if (!total_days) {
        return error422("Total days is required.", res);
    } else if (!reason) {
        return error422("Reason is required.", res);
    }else if (!approver_id) {
        return error422("approver_id is required.", res);
    }

    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();

        let getQuery = `SELECT lq.*, lt.number_of_days, lt.leave_type_name FROM leave_request lq 
       LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery,[leave_request_id]);
        const leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
        if (leaveRequest.status !='Pending') {
            return error422('Sorry! ,Leave request is not Pending.', res)
        }
        //is leave type
        let isLeaveTypeQuery = "SELECT * FROM leave_type_master WHERE leave_type_master_id = ?";
        let [isLeaveTypeResult] = await connection.query(isLeaveTypeQuery, [leave_type_id])
        let leave_type = isLeaveTypeResult[0];
        if (!leave_type) {
            return error422("Leave Type not found.", res)
        }
        if (parseFloat(leave_type.number_of_days)<parseFloat(total_days)) {
            return error422("Leave limit is over.", res);
        }
        //is leave balance
        let isLeaveBalanceQuery="SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leave_type_id, employee_id]);
        let leaveBalance = isLeaveBalanceResult[0];
        if (leaveBalance) {
            if (parseFloat(leaveBalance.remaining_days)<parseFloat(total_days)) {
            return error422("Your leave limit is over.", res);
            } 
        }
        //update leave request
        let updateLeaveRequestQuery = `UPDATE leave_request 
        SET employee_id = ?, leave_type_id = ?, start_date =?, 
        end_date = ?, total_days = ?, reason = ?, approver_id = ? 
        WHERE leave_request_id = ?`;
        let leaveRequestResult = await connection.query(updateLeaveRequestQuery,[employee_id, leave_type_id, start_date, end_date, 
            total_days, reason, approver_id, leave_request_id]);

        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery,[leave_request_id, leaveRequest.approver_id,"Pending", reason])

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Leave Request Updated successfully",
        });

    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Approve Leave Request
const approveLeaveRequest = async (req, res)=>{
    const leave_request_id =parseInt(req.params.id);
    const status = req.query.status ? req.query.status.trim():'';
    const remarks = req.body.remarks ? req.body.remarks.trim():"";
    // 'Pending','Approved','Rejected','Cancelled' 
    if (status!='Pending'&&status!='Approved'&&status!='Rejected'&&status!='Cancelled') {
      return error422("Status is invalid.", res) ;
    }

    let connection = await pool.getConnection();
    try {
       let getQuery = `SELECT lq.*, lt.number_of_days, lt.leave_type_name FROM leave_request lq 
       LEFT JOIN leave_type_master lt ON lt.leave_type_master_id = lq.leave_type_id
        WHERE  lq.leave_request_id = ?`;
        const [result] = await connection.query(getQuery,[leave_request_id]);
        const leaveRequest = result[0];
        if (!leaveRequest) {
            return error422('Leave Request Not Found', res)
        }
            if (status==leaveRequest.status) {
        return error422("This leave request is already "+status, res)
    }
        let current_year = new Date().getFullYear();
        //is leave balance
        let isLeaveBalanceQuery="SELECT * FROM leave_balance WHERE leave_type_id = ? AND employee_id = ? AND year = ?";
        let [isLeaveBalanceResult] = await connection.query(isLeaveBalanceQuery, [leaveRequest.leave_type_id, leaveRequest.employee_id, current_year]);
        let leaveBalance = isLeaveBalanceResult[0];
        let used_days = 0
        if (leaveBalance) {
            used_days = leaveBalance.used_days
        }
        let allocated_days = leaveRequest.number_of_days
        used_days = parseFloat(used_days) + parseFloat(leaveRequest.total_days);
        let remaining_days = allocated_days - used_days
        if (status =='Approved') {
            if (leaveBalance) {
            let updateLeaveBalanceQuery = `UPDATE leave_balance 
            SET allocated_days = ?, used_days = ?, remaining_days = ? WHERE leave_balance_id = ?`
            let [updateLeaveBalanceResult] = await connection.query(updateLeaveBalanceQuery, [ allocated_days, used_days, remaining_days, leaveBalance.leave_balance_id])
        }else{
            let insertLeaveBalanceQuery ="INSERT INTO leave_balance (employee_id, leave_type_id, allocated_days, used_days, remaining_days, year ) VALUES (?,?,?,?,?,?)";
            await connection.query(insertLeaveBalanceQuery,[leaveRequest.employee_id, leaveRequest.leave_type_id, allocated_days, used_days, remaining_days, current_year]) 
        }

        }
        let updateLeaveRequestQuery =  `UPDATE leave_request
        SET status = ?, approved_date = ? WHERE leave_request_id = ?`;
        let [updateLeaveBalanceResult] = await connection.query( updateLeaveRequestQuery,[status, new Date(), leave_request_id]);

        //insert into leave history
        let leaveHistoryQuery = " INSERT INTO leave_history (leave_request_id, approver_id, action, remarks) VALUES (?,?,?,?)";
        let leaveHistory = await connection.query(leaveHistoryQuery,[leave_request_id, leaveRequest.approver_id, status, remarks])

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Leave Request '${status}' successfully`,
        }); 
    } catch (error) {
        await connection.rollback()
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    createLeaveRequest,
    getLeaveRequests,
    getLeaveRequest,
    updateLeaveRequest,
    approveLeaveRequest
}