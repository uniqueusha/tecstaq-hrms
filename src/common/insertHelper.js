 const db = require('./db');
/**
 * Insert into table after checking duplicates for multiple columns.
 * Returns which column(s) already exist in the DB in the error.
 * @param {string} table - Table name
 * @param {object} uniqueChecks - Key-value pairs of columns & values to check for duplicates
 * @param {object} data - Data to insert
 * @param {object} [columnLabels] - Optional mapping from DB column names to user-friendly names
 */

/**
 * Insert into any header/detail tables with PK/FK relationship
 * @param {string} headerTable - name of header table
 * @param {Object} headerData - key/value pairs for header insert
 * @param {string} detailTable - name of detail table
 * @param {Array} detailsData - array of objects (rows for detail insert)
 * @param {string} foreignKeyName - FK column in detailTable pointing to header PK
 * @returns {Promise<Object>} inserted IDs
 */

async function insertHelper(table, uniqueChecks, data, columnLabels = {}) {
    let connection;
    try {
        connection = await db.getConnection();
        let duplicateColumns = [];

        // Check each unique column separately
        for (const [col, value] of Object.entries(uniqueChecks)) {
            const [rows] = await connection.query(
                `SELECT 1 FROM ${table} WHERE ${col} = ? LIMIT 1`,
                [value]
            );
            if (rows.length > 0) {
                duplicateColumns.push(columnLabels[col] || col);
            }
        }

        // If any duplicates found → throw error
        if (duplicateColumns.length > 0) {
            throw new Error(
                `${table} with the following fields already exists: ${duplicateColumns.join(', ')}`
            );
        }

        // Insert new data
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const insertValues = Object.values(data);

        const insertQuery = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const [result] = await connection.query(insertQuery, insertValues);

        return result;
    } catch (err) {
        throw err;
    } finally {
        if (connection) connection.release(); 
    }
}


async function insertWithDetails(headerTable, headerData, detailTable, detailsData, foreignKeyName) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Insert into header
        const headerColumns = Object.keys(headerData).join(', ');
        const headerValues = Object.values(headerData);
        const headerPlaceholders = Object.keys(headerData).map(() => '?').join(', ');

        const [headerResult] = await connection.query(
            `INSERT INTO ${headerTable} (${headerColumns}) VALUES (${headerPlaceholders})`,
            headerValues
        );

        const headerId = headerResult.insertId;

        // Insert into details
        if (detailsData && detailsData.length > 0) {
            for (const row of detailsData) {
                row[foreignKeyName] = headerId; // attach FK

                const detailColumns = Object.keys(row).join(', ');
                const detailValues = Object.values(row);
                const detailPlaceholders = Object.keys(row).map(() => '?').join(', ');

                await connection.query(
                    `INSERT INTO ${detailTable} (${detailColumns}) VALUES (${detailPlaceholders})`,
                    detailValues
                );
            }
        }

        await connection.commit();
        return { success: true, header_id: headerId };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release(); 
    }
}

module.exports = { insertHelper, insertWithDetails};
