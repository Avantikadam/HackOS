const { createClient } = require('./db.cjs');

async function main() {
  const client = createClient();

  try {
    await client.connect();
    console.log('Connected to PostgreSQL for seeding...');

    // 1. Get or create a system demo owner user for initial verified venues
    // We can insert venues with a placeholder UUID or an existing user if any
    const userRes = await client.query(`SELECT id FROM auth.users LIMIT 1;`);
    let ownerId;
    if (userRes.rows.length > 0) {
      ownerId = userRes.rows[0].id;
    } else {
      // Create a system demo user in auth.users if needed or use a fixed UUID
      ownerId = '00000000-0000-0000-0000-000000000001';
      await client.query(`
        INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud)
        VALUES (
          '${ownerId}',
          'system.venues@hackos.app',
          '{"full_name": "Noor Haddad"}'::jsonb,
          'authenticated',
          'authenticated'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 2. Insert verified venues
    console.log('Seeding verified venues...');
    await client.query(`
      INSERT INTO public.venues (id, owner_user_id, venue_name, address, city, state, capacity, facilities, verification_status, contact_email, contact_phone, authorized_rep_name)
      VALUES 
        (
          '11111111-1111-1111-1111-111111111111',
          '${ownerId}',
          'Nexa Convention Hall · Hall B',
          '42 Innovation Way, Bandra Kurla Complex',
          'Mumbai',
          'Maharashtra',
          1200,
          '{"wifi": "1 Gbps dedicated line + Wi-Fi 6", "power_backup": "240 powered desks + UPS", "accessibility": "Step-free ramp and elevators", "av": "Dual 4K Laser Projectors", "catering": "Dedicated dining hall + hydration spots"}'::jsonb,
          'verified',
          'noor.haddad@nexa.in',
          '+91 98200 12345',
          'Noor Haddad'
        ),
        (
          '22222222-2222-2222-2222-222222222222',
          '${ownerId}',
          'Apex Innovation Hub · Grand Auditorium',
          '88 Outer Ring Road, Bellandur',
          'Bengaluru',
          'Karnataka',
          800,
          '{"wifi": "Enterprise Mesh Wi-Fi 6", "power_backup": "Full generator backup", "accessibility": "Universal ramp and tactile tiles", "av": "Line-array acoustic system"}'::jsonb,
          'verified',
          'auditorium@apexhub.in',
          '+91 98450 67890',
          'Dr. R. Ramanathan'
        ),
        (
          '33333333-3333-3333-3333-333333333333',
          '${ownerId}',
          'Silicon Arena · Pavilions A & B',
          'HITEC City, Madhapur',
          'Hyderabad',
          'Telangana',
          1500,
          '{"wifi": "Redundant 2 Gbps lease lines", "power_backup": "Dual grid power + 500kVA backup", "av": "Video wall and livestream switcher"}'::jsonb,
          'verified',
          'events@siliconarena.in',
          '+91 97000 54321',
          'K. S. Naidu'
        )
      ON CONFLICT (id) DO UPDATE
      SET 
        venue_name = EXCLUDED.venue_name,
        verification_status = EXCLUDED.verification_status,
        capacity = EXCLUDED.capacity,
        facilities = EXCLUDED.facilities;
    `);

    // 3. Seed demo published hackathons
    console.log('Seeding sample published hackathons...');
    await client.query(`
      INSERT INTO public.events (
        id, organizer_id, name, description, detailed_description, category, format, 
        start_at, end_at, duration_hours, registration_fee, 
        minimum_team_size, maximum_team_size, maximum_teams, publication_status
      )
      VALUES 
        (
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          '${ownerId}',
          'HackNorthside 2026',
          '48-hour flagship collegiate hackathon bringing builders together for real-world impact across AI, Climate, and Health.',
          'HackNorthside brings together 1,200+ students, designers, and engineers for 48 hours of collaborative building. All teams receive mentorship, meals, and computing credits.',
          'Open Innovation',
          'offline',
          NOW() + INTERVAL '14 days',
          NOW() + INTERVAL '16 days',
          48,
          0.00,
          2,
          4,
          150,
          'published'
        ),
        (
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          '${ownerId}',
          'Global AI & Agentic Sprint 2026',
          'Worldwide virtual sprint focusing on autonomous developer tooling, intelligent agents, and edge inference.',
          'Build next-generation multi-agent applications and workflows. Virtual hacking with global keynote speakers, async mentor check-ins, and automated test evaluations.',
          'Artificial Intelligence',
          'online',
          NOW() + INTERVAL '7 days',
          NOW() + INTERVAL '9 days',
          36,
          0.00,
          1,
          4,
          300,
          'published'
        )
      ON CONFLICT (id) DO UPDATE
      SET 
        name = EXCLUDED.name,
        publication_status = EXCLUDED.publication_status;
    `);

    // Link Nexa venue request to HackNorthside as accepted demo agreement
    await client.query(`
      INSERT INTO public.venue_requests (
        id, event_id, venue_id, organizer_id, requested_start, requested_end, expected_participants, request_status, notes
      )
      VALUES (
        '44444444-4444-4444-4444-444444444444',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '${ownerId}',
        NOW() + INTERVAL '14 days',
        NOW() + INTERVAL '16 days',
        1200,
        'accepted',
        'Hall B booking confirmed for HackNorthside 2026'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.venue_quotations (
        id, venue_request_id, version, itemized_costs, total_amount, quotation_status
      )
      VALUES (
        '55555555-5555-5555-5555-555555555555',
        '44444444-4444-4444-4444-444444444444',
        1,
        '[{"item": "Hall B rental · 3 days", "amount": 250000, "qty": "3 days"}, {"item": "AV & projection package", "amount": 35000, "qty": "1"}, {"item": "Dedicated 1Gbps fiber + power line", "amount": 40000, "qty": "1"}, {"item": "F&B catering area support", "amount": 25000, "qty": "1"}]'::jsonb,
        350000.00,
        'accepted'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.venue_agreements (
        id, venue_request_id, quotation_id, version, terms, agreement_status, accepted_by, accepted_at, otp_verified_at
      )
      VALUES (
        '66666666-6666-6666-6666-666666666666',
        '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555',
        1,
        '{"deposit": "20% received", "cancellation": "Free cancellation up to 14 days prior", "jurisdiction": "Mumbai"}'::jsonb,
        'accepted',
        '${ownerId}',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Add rounds for HackNorthside
    console.log('Seeding schedule rounds...');
    await client.query(`
      INSERT INTO public.event_rounds (event_id, name, description, round_type, sequence_number)
      VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Check-in & Opening Kickoff', 'Hall doors open, ID verification, kit distribution, keynote address.', 'offline', 1),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hacking Begins & Mentor Review 1', 'Problem statement clarifications and initial architecture review with mentors.', 'offline', 2),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Midnight Demo Round', 'Progress check with floor evaluators on working proof-of-concept.', 'offline', 3),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Submissions Close & Final Judging', 'Repository freeze, slide deck submission, top 10 finalist stage pitches.', 'offline', 4)
      ON CONFLICT DO NOTHING;
    `);

    // Add judging criteria for HackNorthside
    console.log('Seeding judging rubric (100% total weight)...');
    await client.query(`
      INSERT INTO public.judging_criteria (event_id, name, description, weight, sequence_number)
      VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Technical Depth & Architecture', 'System design, code quality, stability, and difficulty of implementation.', 30.00, 1),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Originality & Innovation', 'Uniqueness of the concept and novel application of technology.', 25.00, 2),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Real-world Impact & Feasibility', 'Value to end users, scalability, and market practicality.', 30.00, 3),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Presentation & Live Demo', 'Clarity of communication, working demo execution, and handling Q&A.', 15.00, 4)
      ON CONFLICT DO NOTHING;
    `);

    console.log('>>> Seed data successfully inserted into Supabase!');
    await client.end();
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

main();

