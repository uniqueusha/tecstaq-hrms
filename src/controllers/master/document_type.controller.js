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

// add document_type...
const addDocumentType = async (req, res) => {
    const document_type = req.body.document_type ? req.body.document_type.trim()  : '';
   
    if (!document_type) {
        return error422("Document Type  is required.", res);
    }

    //check document type  already  exists or not
    const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type= ?  `;
    const isExistDocumentTypeResult = await pool.query(isExistDocumentTypeQuery, [ document_type]);
    if (isExistDocumentTypeResult[0].length > 0) {
        return error422("Document Type is already exists.", res);
    } 

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        //insert into document_type 
        const insertDocumentTypeQuery = `INSERT INTO document_type (document_type ) VALUES (?)`;
        const insertDocumentTypeValues= [document_type ];
        const documentTypeResult = await connection.query(insertDocumentTypeQuery, insertDocumentTypeValues);

         // Commit the transaction
         await connection.commit();
        res.status(200).json({
            status: 200,
            message: "Document Type added successfully",
        });
    } catch (error) {
        return error500(error, res);
    }finally {
        if (connection) connection.release()
    }
}

// get document type list...
const getDocumentTypes = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getDocumentTypeQuery = `SELECT * FROM document_type WHERE 1 `;

        let countQuery = `SELECT COUNT(*) AS total FROM document_type WHERE 1 `;
        
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getDocumentTypeQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getDocumentTypeQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getDocumentTypeQuery += ` AND  LOWER(document_type) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND  LOWER(document_type) LIKE '%${lowercaseKey}%' `;
            }
        }
        getDocumentTypeQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getDocumentTypeQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getDocumentTypeQuery);
        const documentType = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Document Type retrieved successfully",
            data: documentType,
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
        return error500(error, res);
    }finally {
        if (connection) connection.release()
    }

}
// get document type  by id...
const getDocumentType = async (req, res) => {
    const documentTypeId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const documenttypeQuery = `SELECT * FROM document_type WHERE 1`;
        const documenttypeResult = await connection.query(documenttypeQuery, [documentTypeId]);
        if (documenttypeResult[0].length == 0) {
            return error422("Document Type Not Found.", res);
        }
        const documentType = documenttypeResult[0][0];
        
        return res.status(200).json({
            status: 200,
            message: "Document Type Retrived Successfully",
            data: documentType
        });
    } catch (error) {
        return error500(error, res);
    }finally {
        if (connection) connection.release()
    }
}


//document type  update...
const updateDocumentType = async (req, res) => {
    const documentTypeId = parseInt(req.params.id);
    const document_type = req.body.document_type  ? req.body.document_type.trim()  : '';
    
    if (!document_type) {
        return error422("Document type is required.", res);
    } else if (!documentTypeId) {
        return error422("Document Type id is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if document_type exists
        const documentTypeQuery = "SELECT * FROM document_type WHERE document_type_id = ? ";
        const documentTypeResult = await connection.query(documentTypeQuery, [documentTypeId]);
        if (documentTypeResult[0].length == 0) {
            return error422("Document Type Not Found.", res);
        }
        // Check if the provided document_type exists and is active 
        const existingdocumentTypeQuery = "SELECT * FROM document_type WHERE document_type  = ? AND document_type_id = ?";
        const existingdocumentTypeResult = await connection.query(existingdocumentTypeQuery, [document_type, documentTypeId]);

        if (existingdocumentTypeResult[0].length > 0) {
            return error422("Document Type already exists.", res);
        }
        
        // Update the document_type record with new data
        const updateQuery = `
            UPDATE document_type
            SET document_type = ?
            WHERE document_type_id = ?
        `;

        await connection.query(updateQuery, [document_type, documentTypeId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Document Type updated successfully.",
        });
    } catch (error) {
        return error500(error,res);
    }finally {
        if (connection) connection.release()
    }
}

//status change of document_type...
const onStatusChange = async (req, res) => {
    const documentTypeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter
    
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the document type  exists
        const documenttypeQuery = "SELECT * FROM document_type WHERE document_type_id = ?";
        const documenttypeResult = await connection.query(documenttypeQuery, [documentTypeId]);

        if (documenttypeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Document type not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the document_type status
        const updateQuery = `
            UPDATE document_type
            SET status = ?
            WHERE document_type_id = ?
        `;

        await connection.query(updateQuery, [status, documentTypeId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Document type ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error,res);
    }finally {
        if (connection) connection.release()
    }
};

//get document type active...
const getDocumentTypeWma = async (req, res) => {
    
    // attempt to obtain a database connection
    let connection = await pool.getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();
        let documenttypeQuery = `SELECT * FROM document_type
        WHERE 1 AND status = 1 ORDER BY document_type `;
        const documenttypeResult = await connection.query(documenttypeQuery);
        const documenttype = documenttypeResult[0];

        // Commit the transaction
        await connection.commit();
        
        return res.status(200).json({
            status: 200,
            message: "Document type retrieved successfully.",
            data: documenttype,
        });
    } catch (error) {
        return error500(error,res);
    }finally {
        if (connection) connection.release()
    }
}

//get document type Download...
const getdocumentTypeDownload = async (req, res) => {
    const { key } = req.query;
    let connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let getDocumentTypeQuery = `SELECT * FROM document_type WHERE 1 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getDocumentTypeQuery += ` AND  LOWER(document_type) LIKE '%${lowercaseKey}%' `;
        }
        getDocumentTypeQuery += " ORDER BY cts DESC";

        let result = await connection.query(getDocumentTypeQuery);
        let documentType = result[0];
        if (documentType.length === 0) {
            return error422("No data found.", res);
        }

        documentType = documentType.map((item, index) => ({
            "Sr No": index + 1,
            "Document Type": item.document_type,
            "Created at": new Date(item.cts),

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(documentType);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "documentTypeInfo");

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
    addDocumentType,
    getDocumentTypes,
    getDocumentType,
    updateDocumentType,
    onStatusChange,
    getDocumentTypeWma,
    getdocumentTypeDownload
}