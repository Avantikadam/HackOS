const { createClient } = require('./db.cjs');

async function setupQAUsers() {
  const c = createClient();
  await c.connect();

  // Get the valid password hash
  const hashRes = await c.query(`SELECT encrypted_password FROM auth.users WHERE email = 'qa.organizer.1793486532069@hackos.app' LIMIT 1`);
  const validHash = hashRes.rows[0]?.encrypted_password;
  if (!validHash) throw new Error('No valid hash found');
  console.log('Valid hash found.');

  const qaUsers = [
    { id: '20000000-0000-0000-0000-000000000001', email: 'qa.organizer@hackos.app', name: 'Devon Vance (Organizer)', role: 'organizer' },
    { id: '20000000-0000-0000-0000-000000000002', email: 'qa.participant@hackos.app', name: 'Zane Malik (Participant)', role: 'participant' },
    { id: '20000000-0000-0000-0000-000000000003', email: 'qa.venue@hackos.app', name: 'Elena Rostova (Venue Authority)', role: 'venue_authority' },
    { id: '20000000-0000-0000-0000-000000000004', email: 'qa.judge@hackos.app', name: 'Marcus Chen (Senior Judge)', role: 'judge' },
    { id: '20000000-0000-0000-0000-000000000005', email: 'qa.admin@hackos.app', name: 'Victoria Sterling (Trust Admin)', role: 'admin' },
  ];

  for (const u of qaUsers) {
    // 1. Insert or update in auth.users
    await c.query(`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, raw_app_meta_data, role, aud, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, NOW(),
        $4, '{"provider":"email","providers":["email"]}'::jsonb,
        'authenticated', 'authenticated', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = $2,
        encrypted_password = $3,
        email_confirmed_at = NOW(),
        raw_user_meta_data = $4;
    `, [u.id, u.email, validHash, JSON.stringify({ full_name: u.name })]);

    // 2. Insert or update in profiles
    await c.query(`
      INSERT INTO public.profiles (id, full_name, email, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET full_name = $2, email = $3;
    `, [u.id, u.name, u.email]);

    // 3. Insert role
    await c.query(`
      INSERT INTO public.user_roles (user_id, role, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT DO NOTHING;
    `, [u.id, u.role]);

    console.log(`✓ Prepared QA User: ${u.email} (${u.role})`);
  }

  // Ensure venue authority has a venue registered
  const venueUser = qaUsers[2];
  let vRes = await c.query(`SELECT id FROM venues WHERE owner_user_id = $1`, [venueUser.id]);
  if (vRes.rows.length === 0) {
    await c.query(`
      INSERT INTO venues (owner_user_id, venue_name, address, city, state, capacity, facilities, verification_status, contact_email, authorized_rep_name)
      VALUES ($1, 'Metropolitan Tech Center', '452 Innovation Blvd', 'Bangalore', 'Karnataka', 800, '{"wifi": "1 Gbps Fiber", "backup_power": true, "av_rig": true}'::jsonb, 'verified', $2, $3)
    `, [venueUser.id, venueUser.email, venueUser.name]);
    console.log('✓ Created verified venue for Elena Rostova');
  }

  await c.end();
}

setupQAUsers().catch(console.error);

