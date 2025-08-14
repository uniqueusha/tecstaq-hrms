 const pool = require('./db');

/**
 * Soft delete a row by changing status to 0
 * @param {string} table - Table name
 * @param {string} idColumn - Primary key column name
 * @param {number|string} idValue - ID value to match
 */
async function deleteHelper(table, idColumn, idValue) {
    try {
        const [result] = await pool.query(
            `UPDATE \`${table}\` SET status = 0 WHERE \`${idColumn}\` = ?`,
            [idValue]
        );

        if (result.affectedRows === 0) {
            throw new Error(`${table} record not found`);
        }

        return { success: true, message: `${table} deleted successfully` };
    } catch (err) {
        throw err;
    }
}

module.exports = { deleteHelper };
 