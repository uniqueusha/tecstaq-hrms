const pool = require('../../common/db');
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
//create component type...
const createComponentType = async (req, res) => {
    const component_type = req.body.component_type ? req.body.component_type.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!component_type) {
        return error422("Component type is required.", res)
    } 
    //is exist component type
    let isComponentTypeQuery = "SELECT * FROM component_type WHERE component_type = ? ";
    let isComponentTypeResult = await pool.query(isComponentTypeQuery,[component_type]);
    if (isComponentTypeResult[0].length>0) {
       return error422("Component type already exists.", res);
    }
    
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert component type
        const insertQuery = ` INSERT INTO component_type  (component_type, description) VALUES (?, ?) `;
        await connection.query(insertQuery, [ component_type, description ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Component type created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get component type...
const getComponentTypes = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getComponentTypeQuery = " SELECT * FROM component_type WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM component_type WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getComponentTypeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getComponentTypeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getComponentTypeQuery += ` AND (LOWER(component_type) LIKE '%${lowercaseKey}%' || LOWER(description) LIKE '%${lowercaseKey}%') `;
                countQuery += ` AND (LOWER(component_type) LIKE '%${lowercaseKey}%' || LOWER(description) LIKE '%${lowercaseKey}%') `;
            }
        }
        getComponentTypeQuery += ` ORDER BY cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getComponentTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getComponentTypeQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"Component type retrived successfully",
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
//component type by id
const getComponentType = async (req, res) => {
    const componentTypeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const componentTypeQuery = `SELECT * FROM component_type
        WHERE component_type_id = ? `;
        const componentTypeResult = await connection.query(componentTypeQuery, [componentTypeId]);

        if (componentTypeResult[0].length == 0) {
            return error422("Component Not Found.", res);
        }
        const componentType = componentTypeResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Component type Retrived Successfully",
            data: componentType
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update component type
const updateComponentType = async (req, res) => {
    const componentTypeId = parseInt(req.params.id);
    const component_type = req.body.component_type ? req.body.component_type.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!component_type) {
        return error422("Component type is required.", res)
    } 
    // Check if component type exists
    const componentTypeQuery = "SELECT * FROM component_type WHERE component_type_id  = ?";
    const componentTypeResult = await pool.query(componentTypeQuery, [componentTypeId]);
    if (componentTypeResult[0].length == 0) {
        return error422("Component Type Not Found.", res);
    }
    // Check if the provided Component type exists
    const existingComponentTypeQuery = "SELECT * FROM component_type WHERE component_type = ? AND component_type_id !=? ";
    const existingComponentTypeResult = await pool.query(existingComponentTypeQuery, [component_type, componentTypeId]);
    if (existingComponentTypeResult[0].length > 0) {
        return error422("Component Type already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the grade record with new data
        const updateQuery = `
            UPDATE component_type
            SET component_type = ?, description = ?
            WHERE component_type_id = ?
        `;
        await connection.query(updateQuery, [component_type, description, componentTypeId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Component Type updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of component type...
const onStatusChange = async (req, res) => {
    const componentTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the component type exists
        const componentTypeQuery = "SELECT * FROM component_type WHERE component_type_id = ? ";
        const componentTypeResult = await connection.query(componentTypeQuery, [componentTypeId]);

        if (componentTypeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Component type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the component type status
        const updateQuery = `
            UPDATE component_type
            SET status = ?
            WHERE component_type_id = ?`;
        await connection.query(updateQuery, [status, componentTypeId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Component type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get component type active...
const getComponentTypeWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let componentTypeQuery = `SELECT * FROM component_type
        WHERE status = 1  `;
        componentTypeQuery +=" ORDER BY component_type"
        const componentTypeResult = await connection.query(componentTypeQuery);
        const componentType = componentTypeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Component Type retrieved successfully.",
            data: componentType,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
//download component type
const getComponentTypeDownload = async (req, res) => {

    let { key} = req.query;

    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

                let getComponentTypeQuery = " SELECT * FROM component_type WHERE 1 ";

        if (key) {
                const lowercaseKey = key.toLowerCase().trim();
                getComponentTypeQuery += ` AND (LOWER(component_type) LIKE '%${lowercaseKey}%' || LOWER(description) LIKE '%${lowercaseKey}%') `;
            }
        getComponentTypeQuery += ` ORDER BY cts DESC `;

        let result = await connection.query(getComponentTypeQuery);
        let componentType = result[0];

        if (componentType.length === 0) {
            return error422("No data found.", res);
        }

        componentType = componentType.map((item, index) => ({
            "Sr No": index + 1,
            "Created at": item.cts,
            "Name": item.component_type,
            "Description": item.description,
            "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(componentType);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "componentTypeInfo");

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
    createComponentType,
    getComponentTypes,
    getComponentType,
    updateComponentType,
    onStatusChange,
    getComponentTypeWma,
    getComponentTypeDownload
}