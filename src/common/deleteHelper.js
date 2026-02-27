const pool = require('../../db');

/**
 * Soft delete a row by changing status to 0
 * @param {string} table - Table name
 * @param {string} idColumn - Primary key column name
 * @param {number|string} idValue - ID value to match
 */
async function deleteHelper(table, idColumn, idValue) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query(
            `UPDATE \`${table}\` SET status = 0 WHERE \`${idColumn}\` = ?`,
            [idValue]
        );

        if (result.affectedRows === 0) {
            throw new Error(`${table} record not found`);
        }

        return { success: true, message: `${table} deleted successfully` };
    } catch (err) {
        throw err;
    } finally {
         if (connection) connection.release(); 
    }
}

module.exports = { deleteHelper };
