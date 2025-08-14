const pool = require('./db');
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

module.exports = { updateHelper };
