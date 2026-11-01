import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'npm:pdf-lib@1.17.1';

type Row = Record<string, any>;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function randomHex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomOtp() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(100000 + (buffer[0] % 900000));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildAgreementPdf(context: {
  agreement: Row;
  request: Row;
  venue: Row;
  event: Row;
  quotation: Row;
  actorEmail: string;
}) {
  const { agreement, request, venue, event, quotation, actorEmail } = context;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const width = 595.28 - margin * 2;
  let y = 780;

  page.drawRectangle({
    x: 0,
    y: 790,
    width: 595.28,
    height: 52,
    color: rgb(0.12, 0.31, 0.85),
  });
  page.drawText('HACKOS VENUE AUTHORIZATION AGREEMENT', {
    x: margin,
    y: 815,
    size: 15,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText('OFFICIAL OPERATIONAL AUTHORIZATION RECORD', {
    x: margin,
    y: 799,
    size: 8,
    font,
    color: rgb(0.9, 0.94, 1),
  });

  const row = (label: string, value: string) => {
    page.drawText(label, { x: margin, y, size: 9, font: bold, color: rgb(0.07, 0.11, 0.19) });
    const lines = wrapText(value || '-', font, 9, width - 130);
    lines.forEach((line, index) => {
      page.drawText(line, { x: margin + 130, y: y - index * 12, size: 9, font, color: rgb(0.07, 0.11, 0.19) });
    });
    y -= Math.max(18, lines.length * 12 + 6);
  };

  const heading = (text: string) => {
    y -= 10;
    page.drawText(text, { x: margin, y, size: 12, font: bold, color: rgb(0.07, 0.11, 0.19) });
    y -= 18;
  };

  heading('1. Event');
  row('Event name', String(event.name || ''));
  row('Format', String(event.format || '').toUpperCase());
  row('Dates', event.start_at && event.end_at
    ? `${new Date(event.start_at).toLocaleDateString()} to ${new Date(event.end_at).toLocaleDateString()}`
    : 'As scheduled');
  row('Organizer request', String(request.id || ''));

  heading('2. Venue');
  row('Venue name', String(venue.venue_name || ''));
  row('Address', [venue.address, venue.city, venue.state].filter(Boolean).join(', '));
  row('Capacity', `${venue.capacity ?? 0} seated participants`);
  row('Authorized representative', `${venue.authorized_rep_name || 'Authorized Venue Lead'} (${venue.contact_email || actorEmail})`);

  heading('3. Agreed quotation');
  const costs = Array.isArray(quotation.itemized_costs) ? quotation.itemized_costs : [];
  for (const item of costs) {
    row(String(item.item || 'Service item'), `INR ${Number(item.amount || 0).toLocaleString('en-IN')}`);
  }
  row('Total agreed amount', `INR ${Number(quotation.total_amount || 0).toLocaleString('en-IN')}`);

  heading('4. Electronic acceptance');
  row('Agreement reference', String(agreement.id || ''));
  row('Version', `v${agreement.version ?? 1}.0`);
  row('Representative email', actorEmail);
  row('Verification', `OTP verified on ${new Date().toISOString()}`);
  row('Terms', JSON.stringify(agreement.terms || {}));

  const statement = 'This document records the authorized venue representative confirmation of the booking request through a server-verified OTP challenge. The acceptance timestamp, representative identity and agreement document reference are recorded in the HACKOS audit trail.';
  const lines = wrapText(statement, font, 8.5, width);
  lines.forEach((line, index) => {
    page.drawText(line, { x: margin, y: y - index * 12, size: 8.5, font, color: rgb(0.25, 0.29, 0.36) });
  });
  y -= lines.length * 12 + 24;

  page.drawRectangle({
    x: margin,
    y: y - 34,
    width,
    height: 34,
    color: rgb(0.88, 0.94, 0.92),
    borderColor: rgb(0.18, 0.49, 0.42),
    borderWidth: 1,
  });
  page.drawText('OTP VERIFICATION RECORDED', {
    x: margin + 12,
    y: y - 14,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.39, 0.34),
  });
  page.drawText(`Audit reference: ${agreement.id}`, {
    x: margin + 12,
    y: y - 27,
    size: 8,
    font,
    color: rgb(0.15, 0.39, 0.34),
  });

  page.drawText('Generated by HACKOS. This record is the operational prerequisite for publishing an offline or hybrid event.', {
    x: margin,
    y: 34,
    size: 7.5,
    font,
    color: rgb(0.37, 0.42, 0.51),
  });

  return await pdf.save();
}

async function loadContext(admin: ReturnType<typeof createClient>, agreementId: string) {
  const { data: agreement, error: agreementError } = await admin
    .from('venue_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();
  if (agreementError) throw new HttpError(500, agreementError.message);
  if (!agreement) throw new HttpError(404, 'Agreement not found');

  const { data: request, error: requestError } = await admin
    .from('venue_requests')
    .select('*')
    .eq('id', agreement.venue_request_id)
    .maybeSingle();
  if (requestError) throw new HttpError(500, requestError.message);
  if (!request) throw new HttpError(404, 'Venue request not found');

  const [{ data: venue }, { data: event }, { data: quotation }] = await Promise.all([
    admin.from('venues').select('*').eq('id', request.venue_id).maybeSingle(),
    admin.from('events').select('*').eq('id', request.event_id).maybeSingle(),
    admin.from('venue_quotations').select('*').eq('id', agreement.quotation_id).maybeSingle(),
  ]);

  if (!venue || !event || !quotation) throw new HttpError(404, 'Agreement context is incomplete');
  return { agreement, request, venue, event, quotation };
}

async function assertVenueAuthority(admin: ReturnType<typeof createClient>, actorId: string, venue: Row) {
  if (venue.owner_user_id !== actorId) {
    throw new HttpError(403, 'Only the venue owner can manage this agreement');
  }
  const { data: role } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', actorId)
    .eq('role', 'venue_authority')
    .eq('status', 'active')
    .maybeSingle();
  if (!role) throw new HttpError(403, 'An active venue authority role is required');
}

async function sendEmail(to: string, code: string, eventName: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('OTP_FROM_EMAIL');
  if (!apiKey || !from) throw new HttpError(503, 'OTP email is not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'HACKOS venue authorization code',
      html: `<p>Your HACKOS venue authorization code for <strong>${eventName}</strong> is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p><p>The code expires in 10 minutes. If you did not request it, ignore this email.</p>`,
    }),
  });

  if (!response.ok) throw new HttpError(502, 'Could not send OTP email');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const pepper = Deno.env.get('OTP_PEPPER');
    if (!supabaseUrl || !anonKey || !serviceKey || !pepper) {
      throw new HttpError(503, 'OTP service is not configured');
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'Authentication required');
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) throw new HttpError(401, 'Invalid session');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request body');
    if (!isUuid(body.agreementId)) throw new HttpError(400, 'Invalid agreement id');

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const context = await loadContext(admin, body.agreementId);
    await assertVenueAuthority(admin, user.id, context.venue);

    if (body.action === 'send') {
      if (context.agreement.agreement_status !== 'awaiting_otp') {
        throw new HttpError(409, 'Agreement is not awaiting OTP');
      }

      const destination = user.email || context.venue.contact_email;
      if (!destination) throw new HttpError(400, 'No venue representative email is available');

      const { data: lastChallenge } = await admin
        .from('venue_otp_challenges')
        .select('created_at, consumed_at')
        .eq('agreement_id', context.agreement.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastChallenge && !lastChallenge.consumed_at &&
          Date.now() - new Date(lastChallenge.created_at).getTime() < 60_000) {
        throw new HttpError(429, 'Please wait before requesting another code');
      }

      const { count } = await admin
        .from('venue_otp_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('agreement_id', context.agreement.id)
        .gte('created_at', new Date(Date.now() - 3_600_000).toISOString());

      if ((count || 0) >= 5) throw new HttpError(429, 'Too many OTP requests. Try again later.');

      const code = randomOtp();
      const salt = randomHex(16);
      const otpHash = await sha256Hex(`${salt}:${code}:${pepper}`);

      const { data: challenge, error: challengeError } = await admin
        .from('venue_otp_challenges')
        .insert({
          agreement_id: context.agreement.id,
          phone_or_email: destination,
          otp_hash: otpHash,
          otp_salt: salt,
          expires_at: new Date(Date.now() + 600_000).toISOString(),
          attempts: 0,
        })
        .select('id')
        .single();

      if (challengeError || !challenge) throw new HttpError(500, 'Could not create OTP challenge');

      try {
        await sendEmail(destination, code, context.event.name);
      } catch (error) {
        await admin.from('venue_otp_challenges').delete().eq('id', challenge.id);
        throw error;
      }

      return json({
        success: true,
        destination,
        ...(Deno.env.get('OTP_RETURN_CODE') === 'true' ? { devCode: code } : {}),
        message: `A verification code was sent to ${destination}.`,
      });
    }

    if (body.action === 'verify') {
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
        throw new HttpError(400, 'Enter the 6-digit verification code');
      }
      if (context.agreement.agreement_status !== 'awaiting_otp') {
        throw new HttpError(409, 'Agreement is not awaiting OTP');
      }

      const { data: challenge, error: challengeError } = await admin
        .from('venue_otp_challenges')
        .select('*')
        .eq('agreement_id', context.agreement.id)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeError) throw new HttpError(500, challengeError.message);
      if (!challenge) throw new HttpError(400, 'No active OTP challenge. Request a new code.');
      if (new Date(challenge.expires_at) < new Date()) {
        throw new HttpError(400, 'The verification code has expired. Request a new code.');
      }
      if (challenge.attempts >= 5) {
        throw new HttpError(429, 'Too many incorrect attempts. Request a new code.');
      }
      if (!challenge.otp_salt) {
        throw new HttpError(409, 'This challenge is outdated. Request a new code.');
      }

      const otpHash = await sha256Hex(`${challenge.otp_salt}:${body.code}:${pepper}`);
      if (otpHash !== challenge.otp_hash) {
        const attempts = await admin.rpc('register_otp_failure', { p_agreement_id: context.agreement.id });
        throw new HttpError(400, 'Invalid verification code');
      }

      const pdfBytes = await buildAgreementPdf({
        agreement: context.agreement,
        request: context.request,
        venue: context.venue,
        event: context.event,
        quotation: context.quotation,
        actorEmail: user.email || '',
      });
      const documentPath = `${context.agreement.id}.pdf`;

      const { error: uploadError } = await admin.storage
        .from('venue-agreements')
        .upload(documentPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw new HttpError(500, 'Could not store the agreement document');

      const { error: finalizeError } = await admin.rpc('finalize_agreement_acceptance', {
        p_agreement_id: context.agreement.id,
        p_actor_id: user.id,
        p_code_hash: otpHash,
        p_document_path: documentPath,
      });

      if (finalizeError) {
        await admin.storage.from('venue-agreements').remove([documentPath]);
        throw new HttpError(400, finalizeError.message);
      }

      return json({
        success: true,
        documentPath,
        message: 'Agreement OTP verified and accepted successfully.',
      });
    }

    throw new HttpError(400, 'Unsupported action');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    return json({ error: 'OTP service failed' }, 500);
  }
});
