// Base44 backend function: POST submitLead
// Public — receives lead-form submissions from the static site, stores a Lead record.
// Body: { name, phone, email?, project?, rooms?, budget?, timeline?, message?, source?, website? }
import { createClientFromRequest } from 'npm:@base44/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Content-Type': 'application/json; charset=utf-8'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
  try {
    const b = await req.json();
    // Honeypot: bots commonly fill this visually hidden field. Return a neutral
    // success response without creating a Lead so the protection is not disclosed.
    if (b && b.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 201, headers: CORS });
    }
    if (!b || !b.name || !b.phone) {
      return new Response(JSON.stringify({ error: 'name and phone are required' }), { status: 400, headers: CORS });
    }
    const base44 = createClientFromRequest(req);
    const lead = await base44.asServiceRole.entities.Lead.create({
      name: String(b.name).slice(0, 120),
      phone: String(b.phone).slice(0, 40),
      email: b.email ? String(b.email).slice(0, 160) : undefined,
      project: b.project ? String(b.project).slice(0, 160) : 'כללי',
      rooms: b.rooms ? String(b.rooms).slice(0, 40) : undefined,
      budget: b.budget ? String(b.budget).slice(0, 80) : undefined,
      timeline: b.timeline ? String(b.timeline).slice(0, 80) : undefined,
      message: b.message ? String(b.message).slice(0, 2000) : undefined,
      source: b.source ? String(b.source).slice(0, 40) : 'website'
    });
    return new Response(JSON.stringify({ ok: true, id: lead && lead.id }), { status: 201, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
