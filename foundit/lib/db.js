import mysql from 'mysql2/promise';

// One pool per server process. Credentials come from environment variables only.
const g = globalThis;
export const db =
  g._foundit_db ||
  (g._foundit_db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
  }));

export async function query(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}
