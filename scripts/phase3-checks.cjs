const { createClient } = require('./db.cjs');

const ORGANIZER = '10000000-0000-0000-0000-000000000001';
const VENUE = '10000000-0000-0000-0000-000000000002';
const PARTICIPANT = '10000000-0000-0000-0000-000000000003';
const TEST_VENUE = '39df6ad1-74bd-4ff7-94b7-97976d846e9c';

const results = [];
const client = createClient();

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function setUser(userId) {
  await client.query('RESET ROLE');
  if (userId) {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query(
      "SELECT set_config('request.jwt.claim.sub', $1, true), " +
        "set_config('request.jwt.claims', json_build_object('sub', $1::text)::text, true)",
      [userId],
    );
  }
}

async function transaction(fn) {
  await client.query('BEGIN');
  try {
    const value = await fn();
    await client.query('ROLLBACK');
    return { ok: true, value };
  } catch (error) {
    await client.query('ROLLBACK');
    return { ok: false, error: error.message };
  }
}

function expectError(result, fragment) {
  return !result.ok && result.error.toLowerCase().includes(fragment.toLowerCase());
}

async function createAgreement() {
  const event = await client.query(
    "INSERT INTO public.events (organizer_id, name, format, start_at, end_at) VALUES ($1, 'Phase 3 OTP event', 'hybrid', now(), now() + interval '2 days') RETURNING id",
    [ORGANIZER],
  );
  const request = await client.query(
    "INSERT INTO public.venue_requests (event_id, venue_id, organizer_id, requested_start, requested_end) VALUES ($1, $2, $3, now(), now() + interval '2 days') RETURNING id",
    [event.rows[0].id, TEST_VENUE, ORGANIZER],
  );
  const quotation = await client.query(
    "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
    [request.rows[0].id],
  );
  const agreement = await client.query(
    "INSERT INTO public.venue_agreements (venue_request_id, quotation_id) VALUES ($1, $2) RETURNING id",
    [request.rows[0].id, quotation.rows[0].id],
  );
  await client.query(
    "INSERT INTO public.venue_otp_challenges (agreement_id, phone_or_email, otp_hash, otp_salt, expires_at) VALUES ($1, 'rep@example.test', 'expected-hash', 'test-salt', now() + interval '10 minutes')",
    [agreement.rows[0].id],
  );
  return {
    agreementId: agreement.rows[0].id,
    requestId: request.rows[0].id,
  };
}

async function main() {
  await client.connect();

  let result = await transaction(async () => {
    const context = await createAgreement();
    await setUser(VENUE);
    return client.query(
      'SELECT public.finalize_agreement_acceptance($1, $2, $3, $4)',
      [context.agreementId, VENUE, 'expected-hash', `${context.agreementId}.pdf`],
    );
  });
  record('authenticated clients cannot finalize agreements', expectError(result, 'permission denied'));

  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query('SELECT count(*) FROM public.venue_otp_challenges');
  });
  record('authenticated clients cannot read OTP hashes', expectError(result, 'permission denied'));

  result = await transaction(async () => {
    const context = await createAgreement();
    return client.query(
      'SELECT public.finalize_agreement_acceptance($1, $2, $3, $4)',
      [context.agreementId, VENUE, 'wrong-hash', `${context.agreementId}.pdf`],
    );
  });
  record('wrong OTP hash is rejected', expectError(result, 'invalid verification code'));

  result = await transaction(async () => {
    const context = await createAgreement();
    return client.query(
      'SELECT public.finalize_agreement_acceptance($1, $2, $3, $4)',
      [context.agreementId, PARTICIPANT, 'expected-hash', `${context.agreementId}.pdf`],
    );
  });
  record('non-owner cannot accept agreement', expectError(result, 'only the venue owner'));

  result = await transaction(async () => {
    const context = await createAgreement();
    return client.query(
      'SELECT public.finalize_agreement_acceptance($1, $2, $3, $4)',
      [context.agreementId, VENUE, 'expected-hash', 'not-the-agreement.pdf'],
    );
  });
  record('invalid agreement document path is rejected', expectError(result, 'invalid agreement document path'));

  result = await transaction(async () => {
    const context = await createAgreement();
    await client.query('SELECT public.register_otp_failure($1)', [context.agreementId]);
    const attempts = await client.query(
      'SELECT attempts FROM public.venue_otp_challenges WHERE agreement_id = $1',
      [context.agreementId],
    );
    const accepted = await client.query(
      'SELECT agreement_status FROM public.venue_agreements WHERE id = $1',
      [context.agreementId],
    );
    return { attempts: attempts.rows[0].attempts, accepted: accepted.rows[0].agreement_status };
  });
  record(
    'failed OTP increments attempts without accepting',
    result.ok && result.value.attempts === 1 && result.value.accepted === 'awaiting_otp',
  );

  result = await transaction(async () => {
    const context = await createAgreement();
    const accepted = await client.query(
      'SELECT * FROM public.finalize_agreement_acceptance($1, $2, $3, $4)',
      [context.agreementId, VENUE, 'expected-hash', `${context.agreementId}.pdf`],
    );
    const request = await client.query(
      'SELECT request_status FROM public.venue_requests WHERE id = $1',
      [context.requestId],
    );
    const challenge = await client.query(
      'SELECT consumed_at, verified_at FROM public.venue_otp_challenges WHERE agreement_id = $1',
      [context.agreementId],
    );
    const audit = await client.query(
      "SELECT count(*)::int AS count FROM public.agreement_audit_logs WHERE agreement_id = $1 AND action = 'OTP_VERIFIED_AND_ACCEPTED'",
      [context.agreementId],
    );
    return {
      status: accepted.rows[0].agreement_status,
      acceptedBy: accepted.rows[0].accepted_by,
      documentPath: accepted.rows[0].agreement_document_path,
      otpVerifiedAt: accepted.rows[0].otp_verified_at,
      requestStatus: request.rows[0].request_status,
      consumedAt: challenge.rows[0].consumed_at,
      verifiedAt: challenge.rows[0].verified_at,
      auditCount: audit.rows[0].count,
    };
  });
  record(
    'correct OTP accepts agreement and records audit + document',
    result.ok &&
      result.value.status === 'accepted' &&
      result.value.acceptedBy === VENUE &&
      result.value.documentPath &&
      result.value.otpVerifiedAt &&
      result.value.requestStatus === 'accepted' &&
      result.value.consumedAt &&
      result.value.verifiedAt &&
      result.value.auditCount === 1,
  );

  result = await transaction(async () => {
    return client.query(
      "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload venue agreements'",
    );
  });
  record('broad agreement upload policy is removed', result.ok && result.value.rows[0].count === 0);

  await client.end();

  const failed = results.filter((entry) => !entry.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => {});
  process.exit(1);
});
