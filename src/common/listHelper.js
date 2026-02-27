const pool = require('../../db'); // adjust path if needed

/**
 * Generic List Helper
 * @param {string} table - Table name
 * @param {object} filters - Exact match filters (e.g., {status: 1})
 * @param {number|null} id - If provided, fetch single record
 * @param {object} options - Pagination, searchColumns, etc.
 * @param {string|null} searchTerm - Search keyword
 */
async function listHelper(table, filters = {}, id = null, options = {}, searchTerm = null) {
    let connection;
    try {
        connection = await pool.getConnection();
        let query = `SELECT * FROM ${table}`;
        const params = [];
        let whereClauses = [];

        // 1️⃣ If ID provided → fetch single record
        if (id) {
            const primaryKey = `${table}_id`; // Primary key naming convention
            query += ` WHERE ${primaryKey} = ?`;
            params.push(id);
            const [rows] = await connection.query(query, params);
            return { data: rows };
        }

        // 2️⃣ Exact match filters
        for (const [col, value] of Object.entries(filters)) {
            whereClauses.push(`${col} = ?`);
            params.push(value);
        }

        // 3️⃣ Text search only in allowed columns (exclude exact-match ones like 'status')
        if (searchTerm && options.searchColumns && options.searchColumns.length > 0) {
            const textSearchColumns = options.searchColumns.filter(col => !Object.keys(filters).includes(col));
            if (textSearchColumns.length > 0) {
                const searchConditions = textSearchColumns.map(col => `${col} LIKE ?`).join(' OR ');
                whereClauses.push(`(${searchConditions})`);
                textSearchColumns.forEach(() => {
                    params.push(`%${searchTerm}%`);
                });
            }
        }

        // 4️⃣ Apply WHERE clause
        if (whereClauses.length > 0) {
            query += ` WHERE ` + whereClauses.join(' AND ');
        }

        // 5️⃣ Pagination
        const page = options.page || 1;
        const limit = options.limit || 10;
        const offset = (page - 1) * limit;

        // Count query
        const countQuery = `SELECT COUNT(*) AS total FROM ${table}` +
            (whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(' AND ') : '');
        const [countRows] = await connection.query(countQuery, params);
        const totalRows = countRows[0].total;
        const totalPages = Math.ceil(totalRows / limit);

        // Final query with pagination
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await connection.query(query, params);

        return {
            data: rows,
            totalRows,
            totalPages,
            currentPage: page
        };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        if (connection) connection.release();
    }
}

async function getHeaderWithDetailsById(
  headerTable,            // e.g. "holiday_calendar"
  detailTable,            // e.g. "holiday_calendar_details"
  headerPk,               // e.g. "holiday_calendar_id"
  detailFk,               // e.g. "holiday_calendar_id"
  id
) {
    let connection;
    try {
        connection = await pool.getConnection();

  const query = `
    SELECT h.*, d.* 
    FROM ${headerTable} h
    LEFT JOIN ${detailTable} d
      ON h.${headerPk} = d.${detailFk}
    WHERE h.${headerPk} = ?
  `;

  const [rows] = await connection.query(query, [id]);
  if (!rows.length) return null;

  // build header object from first row
  const header = {};
  Object.keys(rows[0]).forEach(col => {
    if (!col.startsWith(detailTable)) header[col] = rows[0][col];
  });
  header.details = [];

  // details
  rows.forEach(row => {
    const detail = {};
    Object.keys(row).forEach(col => {
      if (col in row && row[col] !== null && col in row) {
        // pick only detail table columns
        if (Object.keys(row).includes(col)) {
          detail[col] = row[col];
        }
      }
    });
    if (Object.values(detail).some(v => v !== null)) {
      header.details.push(detail);
    }
  });

  return header;
    } catch (err) {
      await connection.rollback();
        throw err;
    } finally {
        if (connection) connection.release();
    }
}


module.exports = { listHelper,getHeaderWithDetailsById };