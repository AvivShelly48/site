// Base44 backend function: POST submitLead
// Public — receives lead-form submissions from the static site, stores a Lead record.
// Body: { name, phone, email?, project?, rooms?, budget?, timeline?, message?, source?, website? }
import { createClientFromRequest } from 'npm:@base44/sdk';

const ALLOWED_ORIGINS = new Set([
  'https://shellygroup.co.il',
  'https://www.shellygroup.co.il'
]);
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;
const MAX_BODY_BYTES = 16 * 1024;
const rateBuckets = new Map();

function responseHeaders(req) {
  const origin = req.headers.get('origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin'
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(req, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(req), ...extraHeaders }
  });
}

function clientKey(req) {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (ip) return `ip:${ip.slice(0, 80)}`;
  return `fallback:${(req.headers.get('user-agent') || 'unknown').slice(0, 160)}`;
}

function consumeRateLimit(key) {
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (active.length >= RATE_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - active[0])) / 1000));
    rateBuckets.set(key, active);
    return retryAfter;
  }
  active.push(now);
  rateBuckets.set(key, active);

  // Prevent unbounded memory use in a long-lived isolate.
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, times] of rateBuckets) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) rateBuckets.delete(bucketKey);
    }
  }
  return 0;
}

function text(value, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return String(value).trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, 403, { error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'POST only' });

  const retryAfter = consumeRateLimit(clientKey(req));
  if (retryAfter) {
    return json(req, 429, { error: 'Too many requests. Please try again later.' }, {
      'Retry-After': String(retryAfter)
    });
  }

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json(req, 415, { error: 'Content-Type must be application/json' });
  }
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json(req, 413, { error: 'Request body is too large' });

  let b;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(req, 413, { error: 'Request body is too large' });
    }
    b = JSON.parse(rawBody);
  } catch {
    return json(req, 400, { error: 'Invalid JSON body' });
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return json(req, 400, { error: 'Invalid request body' });
  }

  try {
    // Honeypot: bots commonly fill this visually hidden field. Return a neutral
    // success response without creating a Lead so the protection is not disclosed.
    if (b && b.website) {
      return json(req, 201, { ok: true });
    }

    const name = text(b && b.name, 120);
    const phone = text(b && b.phone, 40);
    const email = text(b && b.email, 160);
    const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

    if (!name || name.length < 2 || /[\u0000-\u001f<>]/.test(name)) {
      return json(req, 400, { error: 'Invalid name' });
    }
    if (!phone || !/^(?:(?:972)|0)?[2-9]\d{7,9}$/.test(phoneDigits)) {
      return json(req, 400, { error: 'Invalid phone' });
    }
    if (email === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) {
      return json(req, 400, { error: 'Invalid email' });
    }

    const project = text(b.project, 160);
    const rooms = text(b.rooms, 40);
    const budget = text(b.budget, 80);
    const timeline = text(b.timeline, 80);
    const message = text(b.message, 2000);
    const source = text(b.source, 80);
    if ([project, rooms, budget, timeline, message, source].includes(null)) {
      return json(req, 400, { error: 'Invalid field type' });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.Lead.create({
      name,
      phone,
      email,
      project: project || 'כללי',
      rooms,
      budget,
      timeline,
      message,
      source: source || 'website'
    });
    return json(req, 201, { ok: true });
  } catch (e) {
    const requestId = crypto.randomUUID();
    console.error('submitLead failed', { requestId, error: e instanceof Error ? e.stack : String(e) });
    return json(req, 500, { error: 'Unable to submit lead', requestId });
  }
});
