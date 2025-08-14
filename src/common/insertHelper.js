 const db = require('./db');
/**
 * Insert into table after checking duplicates for multiple columns.
 * Returns which column(s) already exist in the DB in the error.
 * @param {string} table - Table name
 * @param {object} uniqueChecks - Key-value pairs of columns & values to check for duplicates
 * @param {object} data - Data to insert
 * @param {object} [columnLabels] - Optional mapping from DB column names to user-friendly names
 */
async function insertHelper(table, uniqueChecks, data, columnLabels = {}) {
    try {
        let duplicateColumns = [];

        // Check each unique column separately
        for (const [col, value] of Object.entries(uniqueChecks)) {
            const [rows] = await db.query(
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
        const [result] = await db.query(insertQuery, insertValues);

        return result;
    } catch (err) {
        throw err;
    }
}

module.exports = { insertHelper };
