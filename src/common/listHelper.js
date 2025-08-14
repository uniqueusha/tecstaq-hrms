const pool = require('./db');
/**
 * Generic list helper for any table
 * @param {string} table - Table name
 * @param {object} filters - Exact match filters { colName: value }
 * @param {number|null} id - Fetch single record by table_id if provided
 * @param {object} options - { page, limit, searchColumns[] }
 * @param {string|null} searchTerm - Search keyword
 */
async function listHelper(table, filters = {}, id = null, options = {}, searchTerm = null) {
    try {
        let query = `SELECT * FROM ${table}`;
        const params = [];

        //  If ID provided → fetch single record
        if (id) {
            query += ` WHERE ${table}_id = ?`;
            params.push(id);
            const [rows] = await pool.query(query, params);
            return { data: rows };
        }

        let whereClauses = [];

        // 🔹 Add exact match filters
        for (const [col, value] of Object.entries(filters)) {
            whereClauses.push(`${col} = ?`);
            params.push(value);
        }

        //  Add dynamic search conditions
        if (searchTerm && options.searchColumns && options.searchColumns.length > 0) {
            const searchConditions = options.searchColumns.map(col => `${col} LIKE ?`).join(' OR ');
            whereClauses.push(`(${searchConditions})`);
            options.searchColumns.forEach(() => {
                params.push(`%${searchTerm}%`);
            });
        }

        //  Apply WHERE clause if needed
        if (whereClauses.length > 0) {
            query += ` WHERE ` + whereClauses.join(' AND ');
        }

        //  Pagination - By Default 10
        const page = options.page || 1;
        const limit = options.limit || 10;
        const offset = (page - 1) * limit;

        // Count total
        const countQuery = `SELECT COUNT(*) AS total FROM ${table}` +
            (whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(' AND ') : '');
        const [countRows] = await pool.query(countQuery, params);
        const totalRows = countRows[0].total;
        const totalPages = Math.ceil(totalRows / limit);

        // Final query with pagination
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);

        return {
            data: rows,
            totalRows,
            totalPages,
            currentPage: page
        };

    } catch (err) {
        throw err;
    }
}

module.exports = { listHelper };