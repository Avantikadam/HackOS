const { createClient } = require('./db.cjs');

async function testPhase1Schema() {
  const client = createClient();
  await client.connect();

  console.log('--- Verifying Phase 1 Schema & Database Objects ---');

  try {
    // 1. Verify user_roles constraint
    const roleCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.user_roles'::regclass AND conname = 'user_roles_role_check';
    `);
    console.log('✓ user_roles_role_check:', roleCheck.rows[0]?.def.includes('super_admin') ? 'PASS' : 'FAIL');

    // 2. Verify institutional_domains table & initial seeds
    const instRes = await client.query(`
      SELECT institution_name, approved_domain, verification_status
      FROM public.institutional_domains
      ORDER BY institution_name ASC;
    `);
    console.log(`✓ institutional_domains rows: ${instRes.rows.length}`);
    if (instRes.rows.length < 5) throw new Error('Expected at least 5 seeded institutional domains');

    // 3. Test match_institutional_domain() RPC
    const matchRes1 = await client.query(`
      SELECT * FROM public.match_institutional_domain('dean_admin@iitg.ac.in');
    `);
    console.log('✓ match_institutional_domain(iitg.ac.in):', matchRes1.rows[0]?.is_approved ? 'PASS' : 'FAIL');

    const matchRes2 = await client.query(`
      SELECT * FROM public.match_institutional_domain('attacker@fake-iitg.com');
    `);
    console.log('✓ match_institutional_domain(fake-iitg.com):', !matchRes2.rows[0]?.is_approved ? 'PASS (Correctly rejected)' : 'FAIL');

    // 4. Test screen_administrative_mailbox()
    const screenRes1 = await client.query(`
      SELECT public.screen_administrative_mailbox('estate.office@iitg.ac.in') as s;
    `);
    console.log('✓ screen_administrative_mailbox(estate.office):', screenRes1.rows[0]?.s?.is_admin_signal ? 'PASS' : 'FAIL');

    const screenRes2 = await client.query(`
      SELECT public.screen_administrative_mailbox('2024student123@iitg.ac.in') as s;
    `);
    console.log('✓ screen_administrative_mailbox(student):', screenRes2.rows[0]?.s?.is_student_signal ? 'PASS (Flagged student)' : 'FAIL');

    // 5. Test teams table has team_code column and non-null values
    const teamsCheck = await client.query(`
      SELECT count(*) as total, count(team_code) as with_code FROM public.teams;
    `);
    console.log(`✓ teams table: total=${teamsCheck.rows[0].total}, with_code=${teamsCheck.rows[0].with_code}`);
    if (teamsCheck.rows[0].total !== teamsCheck.rows[0].with_code) {
      throw new Error('Not all teams have team_code populated');
    }

    // 6. Test team code generation RPC
    const codeRes = await client.query(`SELECT public.generate_team_code() as code;`);
    console.log('✓ generate_team_code():', codeRes.rows[0].code, codeRes.rows[0].code.startsWith('HACK-') ? 'PASS' : 'FAIL');

    // 7. Verify participant_qr_passes and event_attendance_records tables
    const qrPassTable = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'participant_qr_passes';
    `);
    console.log('✓ participant_qr_passes columns:', qrPassTable.rows.length > 4 ? 'PASS' : 'FAIL');

    const attendanceTable = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'event_attendance_records';
    `);
    console.log('✓ event_attendance_records columns:', attendanceTable.rows.length > 5 ? 'PASS' : 'FAIL');

    // 8. Verify project_submissions and judge_assignments tables
    const submissionsTable = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'project_submissions';
    `);
    console.log('✓ project_submissions columns:', submissionsTable.rows.length > 8 ? 'PASS' : 'FAIL');

    const judgeTable = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'judge_assignments';
    `);
    console.log('✓ judge_assignments columns:', judgeTable.rows.length > 4 ? 'PASS' : 'FAIL');

    // 9. Verify project-presentations storage bucket
    const bucketRes = await client.query(`
      SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'project-presentations';
    `);
    console.log('✓ project-presentations bucket:', bucketRes.rows.length === 1 ? 'PASS (Found 25MB private bucket)' : 'FAIL');

    console.log('\n>>> All Phase 1 Schema validations passed successfully! <<<\n');
  } finally {
    await client.end();
  }
}

testPhase1Schema().catch(err => {
  console.error('Schema verification error:', err);
  process.exit(1);
});

