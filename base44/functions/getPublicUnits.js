// Base44 backend function: GET getPublicUnits
// Public (unauthenticated) — feeds the availability board on the static site.
// price = ALWAYS the target price (מחיר יעד) pushed from the management app — shown as "מחיר החל מ־".
import { createClientFromRequest } from 'npm:@base44/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const units = await base44.asServiceRole.entities.Unit.list('order');
    return new Response(JSON.stringify(units || []), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
