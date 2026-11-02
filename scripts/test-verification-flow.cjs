const { createClient } = require('./db.cjs');

async function main() {
  console.log('============================================================');
  console.log('   HACKOS OFFICIAL VERIFICATION & ACCOUNTABILITY TEST SUITE   ');
  console.log('============================================================\n');

  const client = createClient();
  await client.connect();

  try {
    // 1. Setup Users & Roles (Organizer, Admin Reviewer, Participant)
    console.log('--- Step 0: Ensure Test Users & Roles Exist ---');
    
    // Find or create organizer
    let orgRes = await client.query(`
      SELECT u.id, u.email FROM auth.users u
      JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'organizer' AND ur.status = 'active'
      LIMIT 1
    `);
    
    let organizerId;
    if (orgRes.rows.length > 0) {
      organizerId = orgRes.rows[0].id;
      console.log(`✓ Using existing organizer: ${orgRes.rows[0].email} (${organizerId})`);
    } else {
      const anyUser = await client.query(`SELECT id, email FROM auth.users LIMIT 1`);
      if (anyUser.rows.length === 0) throw new Error('No users found in auth.users');
      organizerId = anyUser.rows[0].id;
      await client.query(`
        INSERT INTO public.user_roles (user_id, role, status)
        VALUES ($1, 'organizer', 'active')
        ON CONFLICT (user_id, role) DO UPDATE SET status = 'active'
      `, [organizerId]);
      console.log(`✓ Assigned organizer role to: ${anyUser.rows[0].email}`);
    }

    // Ensure an Admin user exists for verification review
    let adminRes = await client.query(`
      SELECT u.id, u.email FROM auth.users u
      JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin' AND ur.status = 'active'
      LIMIT 1
    `);

    let adminId;
    if (adminRes.rows.length > 0) {
      adminId = adminRes.rows[0].id;
      console.log(`✓ Using existing admin reviewer: ${adminRes.rows[0].email} (${adminId})`);
    } else {
      // Find a user or assign admin role to a secondary user
      const users = await client.query(`SELECT id, email FROM auth.users ORDER BY created_at DESC`);
      adminId = users.rows.find(u => u.id !== organizerId)?.id || users.rows[0].id;
      await client.query(`
        INSERT INTO public.user_roles (user_id, role, status)
        VALUES ($1, 'admin', 'active')
        ON CONFLICT (user_id, role) DO UPDATE SET status = 'active'
      `, [adminId]);
      console.log(`✓ Assigned admin reviewer role to: ${adminId}`);
    }

    // 2. Create a test event for verification testing
    console.log('\n--- Step 1: Create Test Event ---');
    const eventRes = await client.query(`
      INSERT INTO public.events (
        organizer_id, name, description, format,
        start_at, end_at, duration_hours, publication_status
      ) VALUES (
        $1, 'HACKOS AI National Hackathon 2026', 'National frontier AI hackathon', 'offline',
        now() + interval '30 days', now() + interval '32 days', 48, 'draft'
      )
      RETURNING id, name, format, publication_status, verification_status;
    `, [organizerId]);

    const event = eventRes.rows[0];
    const eventId = event.id;
    console.log(`✓ Created event: "${event.name}" (ID: ${eventId})`);
    console.log(`  Initial publication status: ${event.publication_status}`);
    console.log(`  Initial verification status: ${event.verification_status}`);

    if (event.verification_status !== 'not_submitted') {
      throw new Error(`Expected verification_status 'not_submitted', got ${event.verification_status}`);
    }

    // 3. Organizer Submits Official Venue Authorization
    console.log('\n--- Step 2: Organizer Submits Official Verification ---');
    const submitRes = await client.query(`
      SELECT public.submit_hackathon_verification(
        $1, -- p_event_id
        'Indian Institute of Science Innovation Hub', -- p_venue_name
        'CV Raman Road, Bangalore, Karnataka 560012', -- p_venue_address
        'Dr. K. R. Sharma', -- p_representative_name
        'Dean of Academic Infrastructure', -- p_representative_designation
        'dean.infra@iisc.ac.in', -- p_representative_contact
        $2, -- p_event_name_confirmed
        now() + interval '30 days', -- p_start_at_confirmed
        now() + interval '32 days', -- p_end_at_confirmed
        48, -- p_duration_hours_confirmed
        $3, -- p_document_storage_path
        'IISc_Official_Authorization_Letter_2026.pdf', -- p_document_filename
        245760, -- p_document_file_size
        'application/pdf', -- p_document_mime_type
        '1.0', -- p_terms_version
        'HACKOS ORGANIZER VERIFICATION & ACCOUNTABILITY DECLARATION (v1.0)...', -- p_accepted_terms_text
        true, -- p_confirmed_accurate
        true -- p_confirmed_authentic
      ) AS result;
    `, [
      eventId,
      event.name,
      `${eventId}/v_1730419200_IISc_Official_Authorization_Letter_2026.pdf`
    ]);

    const submitResult = submitRes.rows[0].result;
    console.log('✓ Submit verification result:', submitResult);
    if (!submitResult.success) throw new Error('submit_hackathon_verification failed');

    const verifId = submitResult.verification_id;

    // Check verification record in DB
    const verifCheck = await client.query(`SELECT * FROM public.event_verifications WHERE id = $1`, [verifId]);
    const verif = verifCheck.rows[0];
    console.log(`✓ event_verifications record created (status: ${verif.status}, doc_version: ${verif.document_version})`);
    if (verif.status !== 'pending_review') throw new Error(`Expected pending_review, got ${verif.status}`);

    // Check events table sync
    const eventCheck1 = await client.query(`SELECT verification_status FROM public.events WHERE id = $1`, [eventId]);
    console.log(`✓ events table synced status: ${eventCheck1.rows[0].verification_status}`);
    if (eventCheck1.rows[0].verification_status !== 'pending_review') {
      throw new Error('Events table was not synced to pending_review');
    }

    // Check terms acceptance record
    const termsCheck = await client.query(`
      SELECT * FROM public.event_verification_terms_acceptances WHERE verification_id = $1
    `, [verifId]);
    console.log(`✓ Terms acceptance record created (version: ${termsCheck.rows[0].terms_version}, confirmed_authentic: ${termsCheck.rows[0].confirmed_authentic})`);
    if (termsCheck.rows.length === 0) throw new Error('Terms acceptance record missing');

    // Check audit log
    const audit1 = await client.query(`
      SELECT * FROM public.event_verification_audit_logs WHERE verification_id = $1 ORDER BY created_at DESC
    `, [verifId]);
    console.log(`✓ Audit log created (action: ${audit1.rows[0].action}, doc_version: ${audit1.rows[0].document_version})`);

    // 4. Verify Public View hides unverified events
    console.log('\n--- Step 3: Verify Public View Hides Pending Events ---');
    const pubCheck1 = await client.query(`
      SELECT * FROM public.public_hackathon_verifications WHERE event_id = $1
    `, [eventId]);
    console.log(`✓ Public verified view count for pending event: ${pubCheck1.rows.length} (Expected: 0)`);
    if (pubCheck1.rows.length !== 0) throw new Error('Unverified event visible in public_hackathon_verifications');

    // 5. Reviewer Requests Clarification
    console.log('\n--- Step 4: Reviewer Requests Clarification / Corrected Evidence ---');
    const reqInfoRes = await client.query(`
      SELECT public.review_hackathon_verification(
        $1, -- p_verification_id
        'request_info', -- p_action
        'Please submit letter containing institutional seal and phone number of the signatory.', -- p_reason
        'Seal missing on first page.', -- p_notes
        NULL, -- p_public_summary
        false -- p_letter_public
      ) AS result;
    `, [verifId]);

    console.log('✓ Reviewer request info result:', reqInfoRes.rows[0].result);
    const verifCheck2 = await client.query(`SELECT status, clarification_request FROM public.event_verifications WHERE id = $1`, [verifId]);
    console.log(`✓ Verification status updated to: ${verifCheck2.rows[0].status}`);
    console.log(`  Clarification note: "${verifCheck2.rows[0].clarification_request}"`);
    if (verifCheck2.rows[0].status !== 'additional_info_required') {
      throw new Error('Expected additional_info_required status');
    }

    // 6. Organizer Submits Corrected Evidence
    console.log('\n--- Step 5: Organizer Submits Corrected Evidence (v2) ---');
    const submitV2Res = await client.query(`
      SELECT public.submit_hackathon_verification(
        $1,
        'Indian Institute of Science Innovation Hub',
        'CV Raman Road, Bangalore, Karnataka 560012',
        'Dr. K. R. Sharma',
        'Dean of Academic Infrastructure',
        'dean.infra@iisc.ac.in / +91-80-22932000',
        $2,
        now() + interval '30 days',
        now() + interval '32 days',
        48,
        $3,
        'IISc_Official_Authorization_Letter_2026_Sealed_v2.pdf',
        312000,
        'application/pdf',
        '1.0',
        'HACKOS ORGANIZER VERIFICATION & ACCOUNTABILITY DECLARATION (v1.0)...',
        true,
        true
      ) AS result;
    `, [
      eventId,
      event.name,
      `${eventId}/v_1730419999_IISc_Official_Authorization_Letter_2026_Sealed_v2.pdf`
    ]);

    console.log('✓ Organizer re-submit result:', submitV2Res.rows[0].result);
    const verifCheck3 = await client.query(`SELECT status, document_version, document_filename FROM public.event_verifications WHERE id = $1`, [verifId]);
    console.log(`✓ Document updated: ${verifCheck3.rows[0].document_filename} (v${verifCheck3.rows[0].document_version}, status: ${verifCheck3.rows[0].status})`);
    if (verifCheck3.rows[0].document_version !== 2) throw new Error('Expected document_version 2');
    if (verifCheck3.rows[0].status !== 'pending_review') throw new Error('Expected pending_review status');

    // 7. Reviewer Approves Verification
    console.log('\n--- Step 6: Reviewer Approves Verification ---');
    const approveRes = await client.query(`
      SELECT public.review_hackathon_verification(
        $1,
        'approve',
        NULL,
        'Institutional seal and signatory credentials verified with IISc registrar.',
        'Official venue authorization and organizer accountability terms verified by HACKOS verification officers for IISc Innovation Hub.',
        true -- letter_public
      ) AS result;
    `, [verifId]);

    console.log('✓ Reviewer approval result:', approveRes.rows[0].result);

    const verifCheck4 = await client.query(`
      SELECT status, verified_at, public_summary, letter_public FROM public.event_verifications WHERE id = $1
    `, [verifId]);
    console.log(`✓ Verification status: ${verifCheck4.rows[0].status}`);
    console.log(`✓ Verified at: ${verifCheck4.rows[0].verified_at}`);
    console.log(`✓ Public summary: "${verifCheck4.rows[0].public_summary}"`);
    console.log(`✓ Letter public toggle: ${verifCheck4.rows[0].letter_public}`);
    if (verifCheck4.rows[0].status !== 'verified') throw new Error('Expected verified status');

    // Check events table synced
    const eventCheck2 = await client.query(`
      SELECT verification_status, verified_at FROM public.events WHERE id = $1
    `, [eventId]);
    console.log(`✓ Events table synced verification_status: ${eventCheck2.rows[0].verification_status}`);
    if (eventCheck2.rows[0].verification_status !== 'verified') {
      throw new Error('Events table verification_status not synced to verified');
    }

    // 8. Publish event and verify public view
    console.log('\n--- Step 7: Publish Event and Inspect Public Verification View ---');
    await client.query(`UPDATE public.events SET publication_status = 'published' WHERE id = $1`, [eventId]);

    const pubCheck2 = await client.query(`
      SELECT * FROM public.public_hackathon_verifications WHERE event_id = $1
    `, [eventId]);

    console.log(`✓ Public verified view count for published & verified event: ${pubCheck2.rows.length}`);
    if (pubCheck2.rows.length !== 1) throw new Error('Expected 1 row in public_hackathon_verifications');

    const pubRecord = pubCheck2.rows[0];
    console.log('✓ Public-safe verification record:', pubRecord);
    console.log('  Venue name:', pubRecord.venue_name);
    console.log('  Venue address:', pubRecord.venue_address);
    console.log('  Status:', pubRecord.verification_status);
    console.log('  Verified date:', pubRecord.verified_at);
    console.log('  Public summary:', pubRecord.public_summary);
    console.log('  Public document path:', pubRecord.public_document_path);

    // Verify confidential fields are NOT in public view
    if (pubRecord.representative_contact !== undefined || pubRecord.reviewer_notes !== undefined) {
      throw new Error('Confidential fields leaked into public view!');
    }

    // 9. Test Rejection with mandatory reason
    console.log('\n--- Step 8: Test Rejection with Mandatory Reason Requirement ---');
    const event2Res = await client.query(`
      INSERT INTO public.events (organizer_id, name, format)
      VALUES ($1, 'Dubious Hackathon Without Authorization', 'offline')
      RETURNING id, name;
    `, [organizerId]);
    const event2Id = event2Res.rows[0].id;

    const submitBadRes = await client.query(`
      SELECT public.submit_hackathon_verification(
        $1, 'Random Hall', 'Unknown Address', 'Mr. Anon', 'Manager', NULL,
        'Dubious Hackathon', now(), now() + interval '1 day', 24,
        'bad_path.pdf', 'fake_letter.pdf', 10000, 'application/pdf',
        '1.0', 'terms', true, true
      ) AS result;
    `, [event2Id]);
    const badVerifId = submitBadRes.rows[0].result.verification_id;

    // Attempt rejection without reason -> must fail
    let failedWithoutReason = false;
    try {
      await client.query(`
        SELECT public.review_hackathon_verification($1, 'reject', '', 'internal notes')
      `, [badVerifId]);
    } catch (err) {
      failedWithoutReason = true;
      console.log(`✓ Mandatory rejection reason enforced: Rejected without reason caught error: "${err.message}"`);
    }
    if (!failedWithoutReason) throw new Error('Rejection without reason should have been blocked');

    // Reject with reason
    await client.query(`
      SELECT public.review_hackathon_verification($1, 'reject', 'Document could not be verified by stated venue administrators.')
    `, [badVerifId]);
    const badCheck = await client.query(`SELECT status, rejection_reason FROM public.event_verifications WHERE id = $1`, [badVerifId]);
    console.log(`✓ Verification rejected with reason: "${badCheck.rows[0].rejection_reason}" (status: ${badCheck.rows[0].status})`);
    if (badCheck.rows[0].status !== 'rejected') throw new Error('Expected rejected status');

    // 10. Material Event Changes Trigger Re-Review
    console.log('\n--- Step 9: Material Changes to Verified Event Trigger Re-Review ---');
    console.log('Changing dates on the verified event:');
    await client.query(`
      UPDATE public.events
      SET start_at = now() + interval '45 days', end_at = now() + interval '47 days'
      WHERE id = $1;
    `, [eventId]);

    const eventCheck3 = await client.query(`SELECT verification_status FROM public.events WHERE id = $1`, [eventId]);
    const verifCheck5 = await client.query(`SELECT status, clarification_request FROM public.event_verifications WHERE id = $1`, [verifId]);

    console.log(`✓ Verification status after material change: ${verifCheck5.rows[0].status}`);
    console.log(`✓ Events table synced verification_status: ${eventCheck3.rows[0].verification_status}`);
    console.log(`  Automatic clarification request: "${verifCheck5.rows[0].clarification_request}"`);

    if (verifCheck5.rows[0].status !== 'additional_info_required') {
      throw new Error('Expected additional_info_required status after material change');
    }

    // 11. Verify Audit Log Tamper Protection
    console.log('\n--- Step 10: Verify Audit Log Tamper Protection ---');
    const auditLogs = await client.query(`
      SELECT action, previous_status, new_status, reason, created_at
      FROM public.event_verification_audit_logs
      WHERE event_id = $1
      ORDER BY created_at ASC;
    `, [eventId]);

    console.log(`✓ Total audit records for event: ${auditLogs.rows.length}`);
    auditLogs.rows.forEach((l, idx) => {
      console.log(`  [${idx + 1}] Action: ${l.action.padEnd(24)} | Status: ${(l.previous_status || 'none') + ' -> ' + l.new_status} | Reason: ${l.reason || 'N/A'}`);
    });

    // Verify that ordinary authenticated users cannot delete audit logs
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE authenticated`);
    await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [organizerId]);
    const delAttempt = await client.query(`DELETE FROM public.event_verification_audit_logs WHERE event_id = $1`, [eventId]);
    await client.query('ROLLBACK');

    console.log(`✓ Ordinary users cannot delete audit logs (affected rows: ${delAttempt.rowCount}, strictly 0 allowed)`);
    if (delAttempt.rowCount !== 0) {
      throw new Error('Audit log deletion by ordinary user should have been blocked');
    }

    // Clean up test events
    console.log('\n--- Step 11: Cleanup Test Records ---');
    await client.query(`DELETE FROM public.events WHERE id IN ($1, $2)`, [eventId, event2Id]);
    console.log('✓ Cleaned up temporary test events.');

    console.log('\n============================================================');
    console.log('   ALL 15 VERIFICATION & ACCOUNTABILITY TESTS PASSED!       ');
    console.log('============================================================\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
