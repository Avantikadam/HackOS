const { createClient } = require('./db.cjs');

async function grantAllRoles() {
  const c = createClient();
  await c.connect();
  const userId = '4b483009-4616-45cd-92a7-7ff86f441543'; // qa.organizer.demo@hackos.app
  const roles = ['organizer', 'participant', 'team_leader', 'venue_authority', 'venue_admin', 'volunteer_scanner', 'judge', 'admin', 'super_admin'];

  for (const r of roles) {
    await c.query(`
      INSERT INTO public.user_roles (user_id, role, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (user_id, role) DO UPDATE SET status = 'active';
    `, [userId, r]);
  }
  console.log('Granted all roles to qa.organizer.demo@hackos.app!');

  // Check venue for this user
  let v = await c.query('SELECT id FROM venues WHERE owner_user_id = $1', [userId]);
  if (v.rows.length === 0) {
    await c.query(`
      INSERT INTO venues (owner_user_id, venue_name, address, city, state, capacity, facilities, verification_status, contact_email, authorized_rep_name)
      VALUES ($1, 'Metropolitan Innovation Arena', '452 Innovation Blvd', 'Bengaluru', 'Karnataka', 800, '{"wifi": "1 Gbps Fiber", "backup_power": true, "av_rig": true}'::jsonb, 'verified', 'qa.organizer.demo@hackos.app', 'Devon Vance');
    `, [userId]);
    console.log('Registered verified venue for Devon Vance');
  }

  await c.end();
}

grantAllRoles().catch(console.error);

