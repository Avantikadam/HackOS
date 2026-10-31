const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.scripts');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function createClient() {
  loadEnvFile();

  const password = process.env.PGPASSWORD || process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error(
      'Database password is not configured. Create .env.scripts from ' +
        '.env.scripts.example and set PGPASSWORD, or set PGPASSWORD in the shell.'
    );
  }

  return new Client({
    host: process.env.PGHOST || 'aws-0-eu-west-1.pooler.supabase.com',
    port: Number(process.env.PGPORT || 6543),
    user: process.env.PGUSER || 'postgres.hpzvxuyjkgisdrbhcrus',
    password,
    database: process.env.PGDATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
  });
}

module.exports = { createClient };
