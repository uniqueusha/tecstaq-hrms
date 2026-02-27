const pool = require('../../../db');
const xlsx = require("xlsx");
const fs = require("fs");
// error handle 422
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}
// error handle 500
const error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}
//create salary component...
const createSalaryComponent = async (req, res) => {
    const salary_component_name = req.body.salary_component_name ? req.body.salary_component_name.trim() : null;
    const component_type_id = req.body.component_type_id ? req.body.component_type_id : null;
    const calculation_type_id = req.body.calculation_type_id ? req.body.calculation_type_id : null;
    const is_statutory = req.body.is_statutory ? req.body.is_statutory : 0;
    if (!salary_component_name) {
        return error422("Salary component name is required.", res)
    } else if (!component_type_id) {
        return error422("Component type id is required.", res);
    } else if (!calculation_type_id) {
        return error422("Calculation type id is required.", res)
    } 
    //is exist salary component 
    let isSalaryComponentQuery = "SELECT * FROM salary_component WHERE salary_component_name = ? ";
    let isSalaryComponentResult = await pool.query(isSalaryComponentQuery,[salary_component_name]);
    if (isSalaryComponentResult[0].length>0) {
       return error422("Salary component already exists.", res);
    }
    //is component type id 
    let isComponentTypeQuery = "SELECT * FROM component_type WHERE component_type_id = ? ";
    let isComponentTypeResult = await pool.query(isComponentTypeQuery,[component_type_id])
    if (isComponentTypeResult[0].length==0) {
        return error422("Component type is Not Found")
    }
    //is calculation type id 
    let isCalculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type_id = ? ";
    let isCalculationTypeResult = await pool.query(isCalculationTypeQuery,[calculation_type_id])
    if (isCalculationTypeResult[0].length==0) {
        return error422("Calculation type is Not Found")
    }
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert 
        const insertQuery = ` INSERT INTO salary_component  (salary_component_name, component_type_id, calculation_type_id, is_statutory) VALUES (?, ?, ?, ?) `;
        await connection.query(insertQuery, [ salary_component_name, component_type_id, calculation_type_id, is_statutory ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Salary Component created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get salary component...
const getSalaryComponents = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getSalaryComponentQuery = `SELECT sc.*, ct.component_type, cat.calculation_type FROM salary_component sc 
        LEFT JOIN component_type ct
        ON ct.component_type_id = sc.component_type_id
        LEFT JOIN calculation_type cat
        ON cat.calculation_type_id = sc.calculation_type_id
        WHERE 1 `
        let countQuery = `SELECT COUNT(*) AS total FROM salary_component sc 
        LEFT JOIN component_type ct
        ON ct.component_type_id = sc.component_type_id
        LEFT JOIN calculation_type cat
        ON cat.calculation_type_id = sc.calculation_type_id
        WHERE 1 `
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getSalaryComponentQuery += ` AND sc.status = 1`;
                countQuery += ` AND sc.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getSalaryComponentQuery += ` AND sc.status = 0`;
                countQuery += ` AND sc.status = 0`;
            } else {
                getSalaryComponentQuery += ` AND (LOWER(sc.salary_component_name) LIKE '%${lowercaseKey}%' || LOWER(ct.component_type) LIKE '%${lowercaseKey}%' || LOWER(cat.calculation_type) LIKE '%${lowercaseKey}%' ) `;
                countQuery += ` AND (LOWER(sc.salary_component_name) LIKE '%${lowercaseKey}%' || LOWER(ct.component_type) LIKE '%${lowercaseKey}%' || LOWER(cat.calculation_type) LIKE '%${lowercaseKey}%' ) `;
            }
        }
        getSalaryComponentQuery += ` ORDER BY sc.cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getSalaryComponentQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getSalaryComponentQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"Salary component retrived successfully",
            data:result[0]
        }
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage)
            };
        }
        return res.status(200).json(data)
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
}
//salary component by id
const getSalaryComponent = async (req, res) => {
    const salaryComponentId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const salaryComponentQuery = `SELECT sc.*, ct.component_type, cat.calculation_type FROM salary_component sc
        LEFT JOIN component_type ct
        ON ct.component_type_id = sc.component_type_id
        LEFT JOIN calculation_type cat
        ON cat.calculation_type_id = sc.calculation_type_id
        WHERE sc.salary_component_id = ? `;
        const salaryComponentResult = await connection.query(salaryComponentQuery, [salaryComponentId]);

        if (salaryComponentResult[0].length == 0) {
            return error422("Salary Component Not Found.", res);
        }
        const salaryComponent = salaryComponentResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Salary Component Retrived Successfully",
            data: salaryComponent
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update salary component
const updateSalaryComponent = async (req, res) => {
    const salaryComponentId = parseInt(req.params.id);
    const salary_component_name = req.body.salary_component_name ? req.body.salary_component_name.trim() : null;
    const component_type_id = req.body.component_type_id ? req.body.component_type_id : null;
    const calculation_type_id = req.body.calculation_type_id ? req.body.calculation_type_id : null;
    const is_statutory = req.body.is_statutory ? req.body.is_statutory : 0;
    if (!salary_component_name) {
        return error422("Salary component name is required.", res)
    } else if(!component_type_id) {
        return error422("Component type id is required.", res)
    } else if(!calculation_type_id) {
        return error422("Calculation type id is required.", res)
    }
    // Check if Calculation type exists
    const calculationTypeQuery = "SELECT * FROM calculation_type WHERE calculation_type_id  = ?";
    const calculationTypeResult = await pool.query(calculationTypeQuery, [calculation_type_id]);
    if (calculationTypeResult[0].length == 0) {
        return error422("Calculation Type Not Found.", res);
    }
    // Check if component type exists
    const componentTypeQuery = "SELECT * FROM component_type WHERE component_type_id  = ?";
    const componentTypeResult = await pool.query(componentTypeQuery, [component_type_id]);
    if (componentTypeResult[0].length == 0) {
        return error422("Component Type Not Found.", res);
    }
    // Check if the provided salary component exists
    const existingSalaryComponentQuery = "SELECT * FROM salary_component WHERE salary_component_name = ? AND salary_component_id !=? ";
    const existingSalaryComponentResult = await pool.query(existingSalaryComponentQuery, [salary_component_name, salaryComponentId]);
    if (existingSalaryComponentResult[0].length > 0) {
        return error422("Salary Component already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the grade record with new data
        const updateQuery = `
            UPDATE salary_component
            SET salary_component_name = ?, component_type_id = ?, calculation_type_id = ?, is_statutory= ?
            WHERE salary_component_id = ?
        `;
        await connection.query(updateQuery, [salary_component_name, component_type_id, calculation_type_id, is_statutory, salaryComponentId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary component updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of salary component...
const onStatusChange = async (req, res) => {
    const salaryComponentId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the salary compoenent exists
        const salaryComponentQuery = "SELECT * FROM salary_component WHERE salary_component_id = ? ";
        const salaryComponentResult = await connection.query(salaryComponentQuery, [salaryComponentId]);
        if (salaryComponentResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Salary Component not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the salary component status
        const updateQuery = `
            UPDATE salary_component
            SET status = ?
            WHERE salary_component_id = ?`;
        await connection.query(updateQuery, [status, salaryComponentId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Salary Component ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get salary component active...
const getSalaryComponentWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let salaryComponentQuery = `SELECT * FROM salary_component
        WHERE status = 1  `;
        salaryComponentQuery +=" ORDER BY salary_component_name"
        const salaryComponentResult = await connection.query(salaryComponentQuery);
        const salaryComponent = salaryComponentResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Salary component retrieved successfully.",
            data: salaryComponent,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
//download salary component
const getSalaryComponentDownload = async (req, res) => {

    let { key } = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

         let getSalaryComponentQuery = `SELECT sc.*, ct.component_type, cat.calculation_type FROM salary_component sc 
        LEFT JOIN component_type ct
        ON ct.component_type_id = sc.component_type_id
        LEFT JOIN calculation_type cat
        ON cat.calculation_type_id = sc.calculation_type_id
        WHERE 1 `
        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getSalaryComponentQuery += ` AND (LOWER(sc.salary_component_name) LIKE '%${lowercaseKey}%' || LOWER(ct.component_type) LIKE '%${lowercaseKey}%' || LOWER(cat.calculation_type) LIKE '%${lowercaseKey}%' ) `;
            }
        getSalaryComponentQuery += ` ORDER BY sc.cts DESC `;

        let result = await connection.query(getSalaryComponentQuery);
        let salaryComponent = result[0];

        if (salaryComponent.length === 0) {
            return error422("No data found.", res);
        }

        salaryComponent = salaryComponent.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Salary Component": item.salary_component_name,
            "Component": item.component_type,
            "Calculation": item.calculation_type,
            "Statutory": item.is_statutory === 1 ? "Yes" : "No",
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(salaryComponent);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "salaryComponentInfo");

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
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createSalaryComponent,
    getSalaryComponents,
    getSalaryComponent,
    updateSalaryComponent,
    onStatusChange,
    getSalaryComponentWma,
    getSalaryComponentDownload
}