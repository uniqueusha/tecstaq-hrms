const pool = require('../common/db');
const xlsx = require("xlsx");
const fs = require("fs");
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
const error500 = (error, res) => {
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}
// create employee salary mapping
const createEmployeeSalaryMapping = async (req, res) => {
    let employee_id = req.body.employee_id ? req.body.employee_id : null;
    let salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : null;
    let grade_id = req.body.grade_id ? req.body.grade_id : null;
    let ctc_amount = req.body.ctc_amount ? req.body.ctc_amount : 0;
    let basic_override = req.body.basic_override ? req.body.basic_override : 0;
    let effective_from = req.body.effective_from ? req.body.effective_from : null;
    let effective_to = req.body.effective_to ? req.body.effective_to : null;
    let pay_cycle = req.body.pay_cycle ? req.body.pay_cycle : null;
    const employeeSalaryMappingDetails  = req.body.employeeSalaryMappingDetails ? req.body.employeeSalaryMappingDetails : [];
    let user_id = 1
    if (!employee_id) {
        return error422("Employee is required.", res);
    } else if (!salary_structure_id) {
        return error422("Salary structure is required.", res);
    } else if (!grade_id) {
        return error422("Grade is required.", res);
    } else if (!ctc_amount) {
        return error422("CTC amount is required.", res);
    } else if (!basic_override && basic_override != 0) {
        return error422("Basic override is required.", res);
    } else if (!effective_from) {
        return error422("Effective from is required.", res);
    } else if (!effective_to) {
        return error422("Effective to is required.", res);
    } else if (!pay_cycle) {
        return error422("Pay cycle is required.", res)
    }
    //is employee exist
    let isEmployeeQuery = "SELECT * FROM employee WHERE employee_id = ?";
    let isEmployeeResult = await pool.query(isEmployeeQuery, [employee_id]);
    if (isEmployeeResult[0].length == 0) {
        return error422("Employee Not Found", res);
    }
    //is salary structure
    let isSalaryStructureQuery = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    let isSalaryStructureResult = await pool.query(isSalaryStructureQuery, [salary_structure_id]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found", res);
    }
    //is grade
    let isGradeQuery = "SELECT * FROM grades WHERE grade_id = ?";
    let isGradeResult = await pool.query(isGradeQuery, [grade_id]);
    if (isGradeResult[0].length == 0) {
        return error422("Grade Not Found", res);
    }
    //is employee already exist
    let isEmployeeExistQuery = "SELECT * FROM employee_salary_mapping WHERE employee_id = ?";
    let isEmployeeExistResult = await pool.query(isEmployeeExistQuery, [employee_id]);
    if (isEmployeeExistResult[0].length > 0) {
        return error422("The employee already has a salary mapped.", res);
    }
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction()
        //create employee salary mapping
        let employeeSalaryMappingQuery = `INSERT INTO employee_salary_mapping (employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, pay_cycle, created_by) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        let salaryMappingResult = await connection.query(employeeSalaryMappingQuery, [employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, pay_cycle, user_id]);
        let employee_salary_id = salaryMappingResult[0].insertId
        let salaryMappingArray = employeeSalaryMappingDetails
        for (let i = 0; i < salaryMappingArray.length; i++) {
            const element = salaryMappingArray[i];
            const salary_structure_component_id = element.salary_structure_component_id ? element.salary_structure_component_id : '';
            // Upload employee salary mapping footer if provided
            let insertSalaryMappingFooterQuery = 'INSERT INTO employee_salary_mapping_footer (employee_salary_id, salary_structure_component_id) VALUES (?, ?)';
            let insertSalaryMappingFooterValues = [employee_salary_id, salary_structure_component_id];
            let insertSalaryMappingFooterResult = await connection.query(insertSalaryMappingFooterQuery, insertSalaryMappingFooterValues);
        }

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Employee salary mapping created successfully."
        })
    } catch (error) {
        await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) await connection.release();
    }
}
//get employee salary mapping list
const getEmployeeSalaryMapping = async (req, res) => {
    const { perPage, page, key } = req.query;
    let connection = await pool.getConnection();
    try {
        let getEmployeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE 1 `
        let countQuery = ` SELECT COUNT(*) AS total FROM employee_salary_mapping sm 
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE 1 `
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getEmployeeSalaryMappingQuery += ` AND sm.status = 1`;
                countQuery += ` AND sm.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getEmployeeSalaryMappingQuery += ` AND sm.status = 0`;
                countQuery += ` AND sm.status = 0`;
            } else {
                getEmployeeSalaryMappingQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' )`;
                countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' )`;
            }
        }
        getEmployeeSalaryMappingQuery += " ORDER BY sm.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getEmployeeSalaryMappingQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getEmployeeSalaryMappingQuery);
        const employeeSalaryMapping = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employee salary mapping retrieved successfully",
            data: employeeSalaryMapping,
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
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//get employee salary mapping by id
const getEmployeeSalaryMappingById = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const employeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE employee_salary_id = ? `;
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);

        if (employeeSalaryMappingResult[0].length == 0) {
            return error422("Employee salary mapping Not Found.", res);
        }
        let employeeSalaryMapping = employeeSalaryMappingResult[0][0];
        let getSalaryMappingFooterQuery = `SELECT esmf.*, ssc.salary_component_id, ssc.percentage_of, ssc.value, ssc.min_limit, ssc.max_limit, ssc.calculation_order,
        sc.salary_component_name, sc.component_type_id, sc.calculation_type_id, sc.is_statutory,
        ct.component_type, cat.calculation_type FROM employee_salary_mapping_footer esmf
        LEFT JOIN salary_structure_components ssc
        ON ssc.salary_structure_component_id = esmf.salary_structure_component_id
        LEFT JOIN salary_component sc
        ON ssc.salary_component_id = sc.salary_component_id
        LEFT JOIN component_type ct
        ON ct.component_type_id = sc.component_type_id
        LEFT JOIN calculation_type cat
        ON cat.calculation_type_id = sc.calculation_type_id
        WHERE esmf.employee_salary_id = ? ORDER BY ssc.calculation_order ASC`
        let getSalaryMappingFooterResult = await connection.query(getSalaryMappingFooterQuery,[employeeSalaryMapping.employee_salary_id]);
        employeeSalaryMapping['employeeSalaryMappingDetails']=getSalaryMappingFooterResult[0]
        return res.status(200).json({
            status: 200,
            message: "Employee salary mapping Retrived Successfully",
            data: employeeSalaryMapping
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update employee salary mapping 
const updateEmployeeSalaryMapping = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);
    let employee_id = req.body.employee_id ? req.body.employee_id : null;
    let salary_structure_id = req.body.salary_structure_id ? req.body.salary_structure_id : null;
    let grade_id = req.body.grade_id ? req.body.grade_id : null;
    let ctc_amount = req.body.ctc_amount ? req.body.ctc_amount : 0;
    let basic_override = req.body.basic_override ? req.body.basic_override : 0;
    let effective_from = req.body.effective_from ? req.body.effective_from : null;
    let effective_to = req.body.effective_to ? req.body.effective_to : null;
    let pay_cycle = req.body.pay_cycle ? req.body.pay_cycle : null;
    const employeeSalaryMappingDetails  = req.body.employeeSalaryMappingDetails ? req.body.employeeSalaryMappingDetails : [];
    let user_id = 1

    if (!employee_id) {
        return error422("Employee is required.", res);
    } else if (!salary_structure_id) {
        return error422("Salary structure is required.", res);
    } else if (!grade_id) {
        return error422("Grade is required.", res);
    } else if (!ctc_amount) {
        return error422("CTC amount is required.", res);
    } else if (!basic_override && basic_override !=0) {
        return error422("Basic override is required.", res);
    } else if (!effective_from) {
        return error422("Effective from is required.", res);
    } else if (!effective_to) {
        return error422("Effective to is required.", res);
    } else if (!pay_cycle) {
        return error422("Pay cycle is required.", res)
    }

    //is employee exist
    let isEmployeeQuery = "SELECT * FROM employee WHERE employee_id = ?";
    let isEmployeeResult = await pool.query(isEmployeeQuery, [employee_id]);
    if (isEmployeeResult[0].length == 0) {
        return error422("Employee Not Found", res);
    }
    //is salary structure
    let isSalaryStructureQuery = "SELECT * FROM salary_structure WHERE salary_structure_id = ?";
    let isSalaryStructureResult = await pool.query(isSalaryStructureQuery, [salary_structure_id]);
    if (isSalaryStructureResult[0].length == 0) {
        return error422("Salary Structure Not Found", res);
    }
    //is grade
    let isGradeQuery = "SELECT * FROM grades WHERE grade_id = ?";
    let isGradeResult = await pool.query(isGradeQuery, [grade_id]);
    if (isGradeResult[0].length == 0) {
        return error422("Grade Not Found", res);
    }

    // Check if employee salary mapping  exists
    const employeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_salary_id  = ?";
    const employeeSalaryMappingResult = await pool.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);
    if (employeeSalaryMappingResult[0].length == 0) {
        return error422("Employee Salary Mapping Not Found.", res);
    }
    // // Check if the provided salary mapping mapping exists
    // const existingEmployeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_id = ? AND employee_salary_id !=? ";
    // const existingEmployeeSalaryMappingResult = await pool.query(existingEmployeeSalaryMappingQuery, [employee_id, employeeSalaryMappingId]);
    // if (existingEmployeeSalaryMappingResult[0].length > 0) {
    //     return error422("The employee already has a salary mapped.", res);
    // }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the employee salary mapping record with new data
        const updateQuery = `
            UPDATE employee_salary_mapping
            SET employee_id = ?, salary_structure_id = ?, grade_id = ?, ctc_amount = ?, basic_override = ?, effective_from = ?, effective_to = ?, pay_cycle = ?, created_by = ?
            WHERE employee_salary_id = ?
        `;
        await connection.query(updateQuery, [employee_id, salary_structure_id, grade_id, ctc_amount, basic_override, effective_from, effective_to, pay_cycle, user_id, employeeSalaryMappingId]);
        let salaryMappingArray = employeeSalaryMappingDetails
        for (let i = 0; i < salaryMappingArray.length; i++) {
            const element = salaryMappingArray[i];
            const salary_structure_component_id = element.salary_structure_component_id ? element.salary_structure_component_id : '';
            const employee_salary_mapping_footer_id = element.employee_salary_mapping_footer_id ? element.employee_salary_mapping_footer_id : '';
            if (employee_salary_mapping_footer_id){
                let updateSalaryMappingFooterQuery = 'UPDATE employee_salary_mapping_footer SET employee_salary_id = ?, salary_structure_component_id = ? WHERE employee_salary_mapping_footer_id = ? AND employee_salary_id = ? ';
                let updateSalaryMappingFooterValues = [employeeSalaryMappingId, salary_structure_component_id, employee_salary_mapping_footer_id, employeeSalaryMappingId];
                let updateSalaryMappingFooterResult = await connection.query(updateSalaryMappingFooterQuery, updateSalaryMappingFooterValues);
            } else {
            // Upload employee salary mapping footer if provided
                let insertSalaryMappingFooterQuery = 'INSERT INTO employee_salary_mapping_footer (employee_salary_id, salary_structure_component_id) VALUES (?, ?)';
                let insertSalaryMappingFooterValues = [employeeSalaryMappingId, salary_structure_component_id];
                let insertSalaryMappingFooterResult = await connection.query(insertSalaryMappingFooterQuery, insertSalaryMappingFooterValues);
            }
        }

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Employee Salary Mapping updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of employee salary mapping...
const onStatusChange = async (req, res) => {
    const employeeSalaryMappingId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the employee salary mapping exists
        const employeeSalaryMappingQuery = "SELECT * FROM employee_salary_mapping WHERE employee_salary_id = ? ";
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery, [employeeSalaryMappingId]);

        if (employeeSalaryMappingResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Employee Salary Mapping not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the employee salary mapping status
        const updateQuery = `
            UPDATE employee_salary_mapping
            SET status = ?
            WHERE employee_salary_id = ?`;
        await connection.query(updateQuery, [status, employeeSalaryMappingId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Employee Salary Mapping ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get employee salary mapping active...
const getEmployeeSalaryMappingWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let employeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE sm.status = 1  `;
        // gradeQuery +=" ORDER BY grade_code"
        const employeeSalaryMappingResult = await connection.query(employeeSalaryMappingQuery);
        const employeeSalaryMapping = employeeSalaryMappingResult[0];

        // Commit the transaction
        await connection.commit();
            
        return res.status(200).json({
            status: 200,
            message: "Employee Salary Mapping retrieved successfully.",
            data: employeeSalaryMapping,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

// delete Employee Salary Mapping footer
const deleteSalaryMappingFooter = async (req, res) => {
    const salaryMappingFooterId = parseInt(req.params.id);
    // const lead_attach_id = parseInt(req.query.lead_attach_id); // Validate and parse the status parameter

    // attempt to obtain a database connection
     let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the Employee Salary Mapping footer exists
        const salaryMappingFooterQuery = "SELECT * FROM employee_salary_mapping_footer WHERE employee_salary_mapping_footer_id = ? ";
        const salaryMappingFooterResult = await connection.query(salaryMappingFooterQuery, [salaryMappingFooterId]);

        if (salaryMappingFooterResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Salary Mapping Footer not found.",
            });
        }

        // Soft update the Employee Salary Mapping footer
        const updateQuery = `
            DELETE FROM employee_salary_mapping_footer
            WHERE employee_salary_mapping_footer_id = ?
        `;

        await connection.query(updateQuery, [salaryMappingFooterId]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Employee Salary Mapping Footer Deleted successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//download employee salary mapping
const getSalaryEmployeeMappingDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getEmployeeSalaryMappingQuery = ` SELECT sm.*, e.first_name, e.last_name, ss.structure_name, g.grade_code, g.grade_name FROM employee_salary_mapping sm
        LEFT JOIN employee e
        ON e.employee_id = sm.employee_id
        LEFT JOIN salary_structure ss
        ON ss.salary_structure_id = sm.salary_structure_id 
        LEFT JOIN grades g
        ON g.grade_id = sm.grade_id
        WHERE 1 `
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getEmployeeSalaryMappingQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' )`;
            }
        getEmployeeSalaryMappingQuery += " ORDER BY sm.cts DESC";

        let result = await connection.query(getEmployeeSalaryMappingQuery);
        let employeeSalaryMappingQuery = result[0];

        if (employeeSalaryMappingQuery.length === 0) {
            return error422("No data found.", res);
        }

        employeeSalaryMappingQuery = employeeSalaryMappingQuery.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Employee": `${item.first_name} ${item.last_name}`,
            "Structure name": item.structure_name,
            "Grade": item.grade_code,
            "Basic Override": item.basic_override,
            "CTC Amount": item.ctc_amount,
            "Pay Cycle": item.pay_cycle,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(employeeSalaryMappingQuery);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "employeeSalaryMappingQueryInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createEmployeeSalaryMapping,
    getEmployeeSalaryMapping,
    getEmployeeSalaryMappingById,
    updateEmployeeSalaryMapping,
    onStatusChange,
    getEmployeeSalaryMappingWma,
    deleteSalaryMappingFooter,
    getSalaryEmployeeMappingDownload
}