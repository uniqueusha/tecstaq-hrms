const pool = require('../../db');
/**
 * Update a row in any table by ID.
 * @param {string} table - The table name
 * @param {string} idColumn - The primary key column name
 * @param {number|string} idValue - The value of the primary key
 * @param {object} data - Fields to update
 * @returns {object} - Updated row data
 */
async function updateHelper(table, idColumn, idValue, data) {
    try {
        // 1️⃣ Check if record exists
        const [existingRows] = await pool.query(
            `SELECT * FROM ${table} WHERE ${idColumn} = ? LIMIT 1`,
            [idValue]
        );

        if (existingRows.length === 0) {
            throw new Error(`${table} record not found`);
        }

        // 2️⃣ Prepare update query dynamically
        const updateFields = [];
        const params = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(value);
            }
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }

        params.push(idValue); // ID in WHERE clause

        const updateQuery = `UPDATE ${table} SET ${updateFields.join(', ')} WHERE ${idColumn} = ?`;
        await pool.query(updateQuery, params);

        // 3️⃣ Fetch updated row
        const [updatedRows] = await pool.query(
            `SELECT * FROM ${table} WHERE ${idColumn} = ? LIMIT 1`,
            [idValue]
        );

        return updatedRows[0];
    } catch (err) {
        throw err;
    }
}

/**
 * Update header + details
 */
async function updateWithDetails(
    headerTable,
    headerId,
    headerData,
    detailTable,
    detailsData,
    foreignKeyName,
    headerPrimaryKey = "id",  // header table PK
    detailPrimaryKey = "id"   // detail table PK
) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update header
        if (headerData && Object.keys(headerData).length > 0) {
            const headerColumns = Object.keys(headerData)
                .map(col => `${col} = ?`)
                .join(", ");
            const headerValues = Object.values(headerData);

            await conn.query(
                `UPDATE ${headerTable} SET ${headerColumns} WHERE ${headerPrimaryKey} = ?`,
                [...headerValues, headerId]
            );
        }

        // Delete old details
        await conn.query(
            `DELETE FROM ${detailTable} WHERE ${foreignKeyName} = ?`,
            [headerId]
        );

        // Insert new details
        if (Array.isArray(detailsData) && detailsData.length > 0) {
            for (const detail of detailsData) {
                detail[foreignKeyName] = headerId;
            }
            await conn.query(
                `INSERT INTO ${detailTable} (${Object.keys(detailsData[0]).join(", ")}) VALUES ?`,
                [detailsData.map(obj => Object.values(obj))]
            );
        }

        await conn.commit();
        return { success: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}


module.exports = {updateHelper, updateWithDetails };
