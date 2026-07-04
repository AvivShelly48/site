// Base44 backend function: GET getPublicProjects
// Public (unauthenticated) — feeds the projects grid on the static site.
// Deploy into the "Aviv Shelly| site" app (6a2ff9d8f0f6cef4ef4c3d65) as `getPublicProjects`.
import { createClientFromRequest } from 'npm:@base44/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=120'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const projects = await base44.asServiceRole.entities.Project.list('order');
    return new Response(JSON.stringify(projects || []), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
