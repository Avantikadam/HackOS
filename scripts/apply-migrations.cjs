const fs = require('fs');
const path = require('path');
const { createClient } = require('./db.cjs');

async function main() {
  const client = createClient();

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database on aws-0-eu-west-1.pooler.supabase.com');

    const migrations = [
      '20261031000001_initial_schema.sql',
      '20261031000002_storage_setup.sql',
      '20261031000003_row_level_security.sql'
    ];

    for (const m of migrations) {
      console.log(`\n========================================`);
      console.log(`Executing migration: ${m}`);
      console.log(`========================================`);
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', m);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute SQL in a transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`>>> Migration ${m} committed successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`>>> Migration ${m} failed:`, err.message);
        throw err;
      }
    }

    // Verify all tables created
    console.log('\n--- VERIFICATION: TABLES CREATED ---');
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`Found ${tableRes.rows.length} public tables:`);
    tableRes.rows.forEach(r => console.log('  - ' + r.table_name));

    // Verify storage buckets
    console.log('\n--- VERIFICATION: STORAGE BUCKETS ---');
    const bucketRes = await client.query(`SELECT id, name, public FROM storage.buckets ORDER BY id;`);
    bucketRes.rows.forEach(b => console.log(`  - Bucket: ${b.name} (public: ${b.public})`));

    // Verify RLS policies
    console.log('\n--- VERIFICATION: RLS POLICIES COUNT ---');
    const policyRes = await client.query(`
      SELECT schemaname, tablename, count(*) as policy_count 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      GROUP BY schemaname, tablename 
      ORDER BY tablename;
    `);
    policyRes.rows.forEach(p => console.log(`  - ${p.tablename}: ${p.policy_count} policies`));

    await client.end();
    console.log('\n>>> ALL MIGRATIONS COMPLETED AND VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Fatal execution error:', err);
    process.exit(1);
  }
}

main();

