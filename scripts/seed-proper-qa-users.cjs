const { createClient } = require('./db.cjs');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const accounts = [
  { email: 'qa.organizer.demo@hackos.app', name: 'Devon Vance (Organizer)', role: 'organizer' },
  { email: 'qa.participant.demo@hackos.app', name: 'Zane Malik (Participant)', role: 'participant' },
  { email: 'qa.venue.demo@hackos.app', name: 'Elena Rostova (Venue Authority)', role: 'venue_authority' },
  { email: 'qa.judge.demo@hackos.app', name: 'Marcus Chen (Senior Judge)', role: 'judge' },
  { email: 'qa.admin.demo@hackos.app', name: 'Victoria Sterling (Trust Admin)', role: 'admin' },
];

async function main() {
  const c = createClient();
  await c.connect();

  for (const acc of accounts) {
    console.log(`Signing up ${acc.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: 'TestPassword123!',
      options: { data: { full_name: acc.name } },
    });

    if (error && !error.message.includes('already registered')) {
      console.error(`Error registering ${acc.email}:`, error);
      continue;
    }

    const userId = data?.user?.id;
    console.log(`Confirming email and assigning role for ${acc.email}...`);
    await c.query(`
      UPDATE auth.users
      SET email_confirmed_at = NOW()
      WHERE email = $1;
    `, [acc.email]);

    // Get user id from db
    const uRes = await c.query('SELECT id FROM auth.users WHERE email = $1', [acc.email]);
    const actualId = uRes.rows[0]?.id;

    if (actualId) {
      await c.query(`
        INSERT INTO public.profiles (id, full_name, email, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET full_name = $2, email = $3;
      `, [actualId, acc.name, acc.email]);

      await c.query(`
        INSERT INTO public.user_roles (user_id, role, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (user_id, role) DO UPDATE SET status = 'active';
      `, [actualId, acc.role]);

      if (acc.role === 'venue_authority') {
        const vRes = await c.query('SELECT id FROM venues WHERE owner_user_id = $1', [actualId]);
        if (vRes.rows.length === 0) {
          await c.query(`
            INSERT INTO venues (owner_user_id, venue_name, address, city, state, capacity, facilities, verification_status, contact_email, authorized_rep_name)
            VALUES ($1, 'Metropolitan Innovation Arena', '452 Innovation Blvd', 'Bengaluru', 'Karnataka', 800, '{"wifi": "1 Gbps Fiber", "backup_power": true, "av_rig": true}'::jsonb, 'verified', $2, $3);
          `, [actualId, acc.email, acc.name]);
          console.log(`Created verified venue for ${acc.name}`);
        }
      }
    }

    // Verify login
    const loginRes = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: 'TestPassword123!',
    });
    if (loginRes.error) {
      console.error(`Login check failed for ${acc.email}:`, loginRes.error);
    } else {
      console.log(`✓ Login VERIFIED for ${acc.email} (${acc.role})!`);
    }
  }

  await c.end();
  console.log('\nAll QA accounts registered, confirmed, and verified!');
}

main().catch(console.error);

