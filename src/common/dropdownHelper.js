const pool = require('./db');

/**
 * Get dropdown data for any table
 * @param {string} table - Table name
 * @param {string} idColumn - Primary key column
 * @param {string} nameColumn - Column to display in dropdown
 * @param {object} filters - Exact match filters (optional)
 * @param {string} searchTerm - Search term for typeahead (optional)
 * @param {number} limit - Max number of results (default 10)
 */
async function dropdownHelper(table, idColumn, nameColumn, filters = {}, searchTerm = null, limit = 10) {

    let connection;
    try {
        connection = await pool.getConnection();
        let query = `SELECT ${idColumn} AS id, ${nameColumn} AS name FROM ${table}`;
        const params = [];
        const whereClauses = [];

        // Filters (e.g., status=1)
        for (const [col, value] of Object.entries(filters)) {
            whereClauses.push(`${col} = ?`);
            params.push(value);
        }

        // Search (typeahead/autocomplete)
        if (searchTerm) {
            whereClauses.push(`${nameColumn} LIKE ?`);
            params.push(`%${searchTerm}%`);
        }

        // Apply WHERE if any conditions
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // Limit results for dropdown
        query += ` ORDER BY ${nameColumn} ASC LIMIT ?`;
        params.push(limit);

        const [rows] = await connection.query(query, params);
        return rows;
    } catch (err) {
        throw err;
    } finally {
        if (connection) connection.release(); 
    }
}

module.exports = { dropdownHelper };
