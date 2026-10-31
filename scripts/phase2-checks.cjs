const { createClient } = require('./db.cjs');

const ORGANIZER = '10000000-0000-0000-0000-000000000001';
const VENUE = '10000000-0000-0000-0000-000000000002';
const PARTICIPANT = '10000000-0000-0000-0000-000000000003';
const SEED_USER = '00000000-0000-0000-0000-000000000001';

const DRAFT_EVENT = 'e62d4c8c-1b99-4322-82cd-aec4bdf7327f';
const SECOND_DRAFT_EVENT = '77a06986-ef5a-4336-8502-5ad50ba78b7f';
const PENDING_REQUEST = '3b1bb3cc-9e4c-4c72-8d16-0f7be6ae9a97';
const TEST_VENUE = '39df6ad1-74bd-4ff7-94b7-97976d846e9c';
const APPLICATION = 'fbdd5122-3709-43f6-bf89-0cb23ed1e104';

const results = [];
const client = createClient();

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
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

async function main() {
  await client.connect();

  // --- Roles -----------------------------------------------------------
  let result = await transaction(async () => {
    await setUser(SEED_USER);
    return client.query(
      "INSERT INTO public.user_roles (user_id, role, status) VALUES ($1, 'participant', 'pending') RETURNING status",
      [SEED_USER],
    );
  });
  record('role insert is forced active', result.ok && result.value.rows[0].status === 'active');

  result = await transaction(async () => {
    await setUser(ORGANIZER);
    return client.query("UPDATE public.user_roles SET status = 'suspended' WHERE user_id = $1 AND role = 'organizer'", [ORGANIZER]);
  });
  record('user cannot self-suspend a role', expectError(result, 'reviewer approval'));

  result = await transaction(async () => {
    await setUser(ORGANIZER);
    return client.query("INSERT INTO public.user_roles (user_id, role, status) VALUES ($1, 'admin', 'active')", [ORGANIZER]);
  });
  record('user cannot self-grant admin', expectError(result, 'admin access'));

  // --- Events ----------------------------------------------------------
  result = await transaction(async () => {
    await setUser(ORGANIZER);
    return client.query(
      "INSERT INTO public.events (organizer_id, name, format, publication_status) VALUES ($1, 'Trigger test', 'online', 'published') RETURNING publication_status",
      [ORGANIZER],
    );
  });
  record('event insert is forced to draft', result.ok && result.value.rows[0].publication_status === 'draft');

  result = await transaction(async () => {
    await setUser(PARTICIPANT);
    return client.query(
      "INSERT INTO public.events (organizer_id, name, format) VALUES ($1, 'Unauthorized event', 'online')",
      [PARTICIPANT],
    );
  });
  record('participant cannot create an event', !result.ok);

  result = await transaction(async () => {
    await setUser(ORGANIZER);
    return client.query("UPDATE public.events SET publication_status = 'published' WHERE id = $1", [DRAFT_EVENT]);
  });
  record('direct event publish is blocked', expectError(result, 'publish action'));

  result = await transaction(async () => {
    await client.query(
      "UPDATE public.events SET start_at = now(), end_at = now() + interval '2 days' WHERE id = $1",
      [DRAFT_EVENT],
    );
    await setUser(ORGANIZER);
    return client.query('SELECT public.publish_event($1)', [DRAFT_EVENT]);
  });
  record('hybrid event without agreement cannot publish', expectError(result, 'accepted venue agreement'));

  result = await transaction(async () => {
    const inserted = await client.query(
      "INSERT INTO public.events (organizer_id, name, format, start_at, end_at) VALUES ($1, 'Online publish test', 'online', now(), now() + interval '2 days') RETURNING id",
      [ORGANIZER],
    );
    await setUser(ORGANIZER);
    await client.query('SELECT public.publish_event($1)', [inserted.rows[0].id]);
    return client.query('SELECT publication_status FROM public.events WHERE id = $1', [inserted.rows[0].id]);
  });
  record('online event publishes through RPC', result.ok && result.value.rows[0].publication_status === 'published');

  // --- Venues ----------------------------------------------------------
  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query(
      "INSERT INTO public.venues (owner_user_id, venue_name, verification_status) VALUES ($1, 'Pending venue test', 'verified') RETURNING verification_status",
      [VENUE],
    );
  });
  record('venue insert is forced pending', result.ok && result.value.rows[0].verification_status === 'pending');

  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query("UPDATE public.venues SET verification_status = 'rejected' WHERE id = $1", [TEST_VENUE]);
  });
  record('venue owner cannot self-verify', expectError(result, 'reviewer-only'));

  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query("UPDATE public.venues SET authorized_rep_name = 'Rep Test' WHERE id = $1", [TEST_VENUE]);
  });
  record('venue owner can edit profile fields', result.ok);

  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query('SELECT public.review_venue($1, $2)', [TEST_VENUE, 'verified']);
  });
  record('non-admin cannot review a venue', expectError(result, 'only reviewers'));

  result = await transaction(async () => {
    await client.query(
      "INSERT INTO public.user_roles (user_id, role, status) VALUES ($1, 'admin', 'active') ON CONFLICT DO NOTHING",
      [ORGANIZER],
    );
    await setUser(ORGANIZER);
    await client.query('SELECT public.review_venue($1, $2)', [TEST_VENUE, 'rejected']);
    return client.query('SELECT verification_status FROM public.venues WHERE id = $1', [TEST_VENUE]);
  });
  record('admin can review a venue', result.ok && result.value.rows[0].verification_status === 'rejected');

  // --- Applications ----------------------------------------------------
  result = await transaction(async () => {
    await setUser(PARTICIPANT);
    return client.query("UPDATE public.applications SET payment_status = 'paid' WHERE id = $1", [APPLICATION]);
  });
  record('team leader cannot mark payment paid', expectError(result, 'only withdraw'));

  result = await transaction(async () => {
    await setUser(PARTICIPANT);
    return client.query("UPDATE public.applications SET application_status = 'withdrawn' WHERE id = $1 RETURNING application_status", [APPLICATION]);
  });
  record('team leader can withdraw', result.ok && result.value.rows[0].application_status === 'withdrawn');

  result = await transaction(async () => {
    await setUser(ORGANIZER);
    return client.query("UPDATE public.applications SET application_status = 'accepted', payment_status = 'paid' WHERE id = $1 RETURNING payment_status", [APPLICATION]);
  });
  record('organizer can set application and payment status', result.ok && result.value.rows[0].payment_status === 'paid');

  // --- Quotations ------------------------------------------------------
  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs, total_amount) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100},{\"item\":\"AV\",\"amount\":50.5}]'::jsonb, 1) RETURNING total_amount, quotation_status, version",
      [PENDING_REQUEST],
    );
  });
  record(
    'quotation total and status are server-computed',
    result.ok && Number(result.value.rows[0].total_amount) === 150.5 && result.value.rows[0].quotation_status === 'submitted',
    result.ok ? JSON.stringify(result.value.rows[0]) : '',
  );

  result = await transaction(async () => {
    const quote = await client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
      [PENDING_REQUEST],
    );
    await setUser(VENUE);
    return client.query("UPDATE public.venue_quotations SET quotation_status = 'accepted' WHERE id = $1", [quote.rows[0].id]);
  });
  record('venue cannot accept a quotation', expectError(result, 'only the organizer'));

  result = await transaction(async () => {
    const quote = await client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
      [PENDING_REQUEST],
    );
    await setUser(ORGANIZER);
    return client.query("UPDATE public.venue_quotations SET quotation_status = 'accepted' WHERE id = $1 RETURNING quotation_status", [quote.rows[0].id]);
  });
  record('organizer can accept a quotation', result.ok && result.value.rows[0].quotation_status === 'accepted');

  // --- Venue requests --------------------------------------------------
  result = await transaction(async () => {
    await setUser(VENUE);
    return client.query("UPDATE public.venue_requests SET request_status = 'accepted' WHERE id = $1", [PENDING_REQUEST]);
  });
  record('request cannot be accepted without an agreement', expectError(result, 'accepted agreement'));

  result = await transaction(async () => {
    const event = await client.query(
      "INSERT INTO public.events (organizer_id, name, format, start_at, end_at) VALUES ($1, 'Phase 2 temp event', 'online', now(), now() + interval '1 day') RETURNING id",
      [ORGANIZER],
    );
    const request = await client.query(
      "INSERT INTO public.venue_requests (event_id, venue_id, organizer_id, requested_start, requested_end) VALUES ($1, $2, $3, now(), now() + interval '1 day') RETURNING id",
      [event.rows[0].id, TEST_VENUE, ORGANIZER],
    );
    await setUser(ORGANIZER);
    return client.query("UPDATE public.venue_requests SET request_status = 'quoted' WHERE id = $1", [request.rows[0].id]);
  });
  record('request cannot be quoted without a quotation', expectError(result, 'quotation is required'));

  // --- Agreements ------------------------------------------------------
  result = await transaction(async () => {
    const quote = await client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
      [PENDING_REQUEST],
    );
    await setUser(ORGANIZER);
    return client.query(
      "INSERT INTO public.venue_agreements (venue_request_id, quotation_id, agreement_status, accepted_by, accepted_at, otp_verified_at) VALUES ($1, $2, 'accepted', $3, now(), now()) RETURNING agreement_status, accepted_by, otp_verified_at",
      [PENDING_REQUEST, quote.rows[0].id, ORGANIZER],
    );
  });
  record(
    'agreement insert cannot skip OTP',
    result.ok && result.value.rows[0].agreement_status === 'awaiting_otp' && result.value.rows[0].accepted_by === null && result.value.rows[0].otp_verified_at === null,
  );

  result = await transaction(async () => {
    const quote = await client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
      [PENDING_REQUEST],
    );
    const agreement = await client.query(
      "INSERT INTO public.venue_agreements (venue_request_id, quotation_id) VALUES ($1, $2) RETURNING id",
      [PENDING_REQUEST, quote.rows[0].id],
    );
    await setUser(VENUE);
    return client.query("UPDATE public.venue_agreements SET agreement_status = 'accepted' WHERE id = $1", [agreement.rows[0].id]);
  });
  record(
    'direct agreement acceptance is blocked',
    !result.ok && /OTP verification|permission denied/i.test(result.error),
  );

  result = await transaction(async () => {
    await client.query(
      "UPDATE public.events SET start_at = now(), end_at = now() + interval '2 days' WHERE id = $1",
      [SECOND_DRAFT_EVENT],
    );
    const quote = await client.query(
      "INSERT INTO public.venue_quotations (venue_request_id, itemized_costs) VALUES ($1, '[{\"item\":\"Hall\",\"amount\":100}]'::jsonb) RETURNING id",
      [PENDING_REQUEST],
    );
    const agreement = await client.query(
      "INSERT INTO public.venue_agreements (venue_request_id, quotation_id) VALUES ($1, $2) RETURNING id",
      [PENDING_REQUEST, quote.rows[0].id],
    );
    await client.query(
      "UPDATE public.venue_agreements SET agreement_status = 'accepted', accepted_by = $2, accepted_at = now(), otp_verified_at = now() WHERE id = $1",
      [agreement.rows[0].id, VENUE],
    );
    await setUser(ORGANIZER);
    await client.query('SELECT public.publish_event($1)', [SECOND_DRAFT_EVENT]);
    return client.query('SELECT publication_status FROM public.events WHERE id = $1', [SECOND_DRAFT_EVENT]);
  });
  record('hybrid event publishes after accepted agreement', result.ok && result.value.rows[0].publication_status === 'published');

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
