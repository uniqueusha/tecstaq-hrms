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
//create grade...
const createGrade = async (req, res) => {
    const grade_code = req.body.grade_code ? req.body.grade_code.trim() : null;
    const grade_name = req.body.grade_name ? req.body.grade_name.trim() : null;
    const min_ctc = req.body.min_ctc ? req.body.min_ctc : 0;
    const max_ctc = req.body.max_ctc ? req.body.max_ctc : 0;
    const description = req.body.description ? req.body.description.trim() : null;
    if (!grade_code) {
        return error422("Grade code is required.", res)
    } else if(!grade_name) {
        return error422("Grade name is required.", res)
    } else if(!min_ctc && min_ctc != 0) {
        return error422("Min ctc is required.", res)
    } else if (min_ctc < 0 || max_ctc < 0) {
        return error422("CTC cannot be negative.", res);
    } else if (max_ctc < min_ctc) {
        return error422("Max CTC must be greater than or equal to Min CTC.", res);
    }

    //is exist grade code
    let isGradeCodeQuery = "SELECT * FROM grades WHERE grade_code = ? ";
    let isGradeCodeResult = await pool.query(isGradeCodeQuery,[grade_code]);
    if (isGradeCodeResult[0].length>0) {
       return error422("Grade code already exists.", res);
    }
    
    let connection = await pool.getConnection()
    try {
        await connection.beginTransaction();
        //insert grade
        const insertQuery = ` INSERT INTO grades  (grade_code, grade_name, min_ctc, max_ctc, description) VALUES (?, ?, ?, ?, ?) `;
        await connection.query(insertQuery, [ grade_code, grade_name, min_ctc, max_ctc, description ]);

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Grade created successfully."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}
// get grades...
const getGrades = async (req, res)=>{
    let {page, perPage, key} = req.query;

    let connection = await pool.getConnection();
    try {
        let getGradeQuery = " SELECT * FROM grades WHERE 1 ";
        let countQuery = " SELECT COUNT(*) AS total FROM grades WHERE 1"
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getGradeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getGradeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getGradeQuery += ` AND (LOWER(grade_code) LIKE '%${lowercaseKey}%' || LOWER(grade_name) LIKE '%${lowercaseKey}%' || min_ctc LIKE '%${lowercaseKey}%' || max_ctc LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(grade_code) LIKE '%${lowercaseKey}%' || LOWER(grade_name) LIKE '%${lowercaseKey}%' || min_ctc LIKE '%${lowercaseKey}%' || max_ctc LIKE '%${lowercaseKey}%')`;
            }
        }
        getGradeQuery += ` ORDER BY cts DESC `;
        //Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getGradeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        let result = await connection.query(getGradeQuery)

        //commit the transaction
        await connection.commit();
        const data = {
            status:200,
            message:"Grades retrived successfully",
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
//Grade by id
const getGrade = async (req, res) => {
    const gradeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();

        const gradeQuery = `SELECT * FROM grades
        WHERE grade_id = ? `;
        const gradeResult = await connection.query(gradeQuery, [gradeId]);

        if (gradeResult[0].length == 0) {
            return error422("Grade Not Found.", res);
        }
        const grade = gradeResult[0][0];
        return res.status(200).json({
            status: 200,
            message: "Grade Retrived Successfully",
            data: grade
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//Update grade
const updateGrade = async (req, res) => {
    const gradeId = parseInt(req.params.id);
    const grade_code = req.body.grade_code ? req.body.grade_code.trim() : null;
    const grade_name = req.body.grade_name ? req.body.grade_name.trim() : null;
    const min_ctc = req.body.min_ctc ? req.body.min_ctc : 0;
    const max_ctc = req.body.max_ctc ? req.body.max_ctc : 0;
    const description = req.body.description ? req.body.description.trim() : null;

    if (!grade_code) {
        return error422("Grade code is required.", res)
    } else if(!grade_name) {
        return error422("Grade name is required.", res)
    } else if(!min_ctc && min_ctc != 0) {
        return error422("Min ctc is required.", res)
    } else if (min_ctc < 0 || max_ctc < 0) {
        return error422("CTC cannot be negative.", res);
    } else if (max_ctc < min_ctc) {
        return error422("Max CTC must be greater than or equal to Min CTC.", res);
    }

    // Check if grade exists
    const gradeQuery = "SELECT * FROM grades WHERE grade_id  = ?";
    const gradeResult = await pool.query(gradeQuery, [gradeId]);
    if (gradeResult[0].length == 0) {
        return error422("Grade Not Found.", res);
    }
    // Check if the provided Grade exists
    const existingGradeQuery = "SELECT * FROM grades WHERE grade_code = ? AND grade_id !=? ";
    const existingGradeResult = await pool.query(existingGradeQuery, [grade_code, gradeId]);
    if (existingGradeResult[0].length > 0) {
        return error422("Grade code already exists.", res);
    }
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Update the grade record with new data
        const updateQuery = `
            UPDATE grades
            SET grade_code = ?, grade_name = ?, min_ctc = ?, max_ctc = ?, description = ?
            WHERE grade_id = ?
        `;
        await connection.query(updateQuery, [grade_code, grade_name, min_ctc, max_ctc, description, gradeId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Grade updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
//status change of grade...
const onStatusChange = async (req, res) => {
    const gradeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();
        // Check if the grade exists
        const gradeQuery = "SELECT * FROM grades WHERE grade_id = ? ";
        const gradeResult = await connection.query(gradeQuery, [gradeId]);

        if (gradeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Grade not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }
        // Soft update the grade status
        const updateQuery = `
            UPDATE grades
            SET status = ?
            WHERE grade_id = ?`;
        await connection.query(updateQuery, [status, gradeId]);
        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Grade ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};
//get grade active...
const getGradeWma = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await pool.getConnection();
    try {
        //start a transaction
        await connection.beginTransaction();
        let gradeQuery = `SELECT * FROM grades
        WHERE status = 1  `;
        gradeQuery +=" ORDER BY grade_code"
        const gradeResult = await connection.query(gradeQuery);
        const grade = gradeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Grades retrieved successfully.",
            data: grade,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}
//get Grade Download...
const getGradeDownload = async (req, res) => {
    const { key } = req.query;
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getGradeQuery = `SELECT *
        FROM grades
        WHERE 1 `;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getGradeQuery += ` AND (LOWER(grade_code) LIKE '%${lowercaseKey}%' || LOWER(grade_name) LIKE '%${lowercaseKey}%' || min_ctc LIKE '%${lowercaseKey}%' || max_ctc LIKE '%${lowercaseKey}%') `;
        }
        getGradeQuery += " ORDER BY cts DESC";

        let result = await connection.query(getGradeQuery);
        let grade = result[0];
        if (grade.length === 0) {
            return error422("No data found.", res);
        }

        grade = grade.map((item, index) => ({
            "Sr No": index + 1,
            "Grade Code": item.grade_code,
            "Grade Name": `${item.grade_name} `,
            "Min ctc": item.min_ctc,
            "Max ctc": item.max_ctc,
            "Description": item.description,
            "Status": item.status === 1 ? "activated" : "deactivated",
            "Created at": new Date(item.cts),

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(grade);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "gradeInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
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
    createGrade,
    getGrades,
    getGrade,
    updateGrade,
    onStatusChange,
    getGradeWma,
    getGradeDownload
}