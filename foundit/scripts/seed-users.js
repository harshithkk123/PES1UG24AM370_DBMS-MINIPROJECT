// Sets the real bcrypt hash (password: Password@123) for the demo users created by database/seed.sql
// Run AFTER seed.sql:   npm run seed:users
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

for (const f of ['.env.local', '.env']) {            // tiny .env loader (Next loads these itself, plain node does not)
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
}

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  const hash = bcrypt.hashSync('Password@123', 10);
  const [r] = await db.execute("UPDATE user_account SET password_hash = ? WHERE password_hash LIKE 'PLACEHOLDER%'", [hash]);
  console.log('Updated users:', r.affectedRows);
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
