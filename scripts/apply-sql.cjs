const fs = require('fs');
const path = require('path');
const { createClient } = require('./db.cjs');

async function main() {
  const relativePath = process.argv[2];
  if (!relativePath) {
    throw new Error('Usage: node scripts/apply-sql.cjs <path-to-sql-file>');
  }

  const sqlPath = path.resolve(process.cwd(), relativePath);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = createClient();

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Applied ${relativePath}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
