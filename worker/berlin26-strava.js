/* berlin26-strava — API proxy for the Berlin26 PWA.
   Two jobs, both things the browser can't do itself:
   1. Strava OAuth (no CORS on /oauth/token):
     POST /token    {code}          → code → tokens   (first connect)
     POST /refresh  {refresh_token} → fresh tokens    (routine refresh)
   2. Oura API v2 (no CORS at all, verified 12 Jun 2026):
     GET /oura/v2/usercollection/<endpoint>?...  → forwarded with the
     caller's Authorization header. The Oura token lives on the phone;
     this is a dumb pipe with a path whitelist.
   Env vars (Worker → Settings → Variables; encrypt the secret):
     STRAVA_CLIENT_ID      257604
     STRAVA_CLIENT_SECRET  <from https://www.strava.com/settings/api>
   No storage, no logging — tokens pass through and are never kept. */

const PROD_ORIGIN = 'https://mullenlearning.github.io';
// any localhost port is fine for dev — CORS here gates nothing secret, the
// caller must already hold a valid code or refresh token
const allowOrigin = (o) => o === PROD_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowOrigin(origin) ? origin : PROD_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

    const reqUrl = new URL(request.url);
    const path = reqUrl.pathname.replace(/\/+$/, '');

    if (request.method === 'GET' && path.startsWith('/oura/')) {
      const sub = path.slice(5); // '/v2/usercollection/...'
      if (!/^\/v2\/usercollection\/[A-Za-z0-9_]+$/.test(sub)) return json({ error: 'not_found' }, 404);
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return json({ error: 'missing_auth' }, 401);
      let r;
      try {
        r = await fetch('https://api.ouraring.com' + sub + reqUrl.search, { headers: { Authorization: auth } });
      } catch (e) {
        return json({ error: 'oura_unreachable' }, 502);
      }
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (request.method !== 'POST' || (path !== '/token' && path !== '/refresh')) {
      return json({ error: 'not_found' }, 404);
    }

    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }

    const form = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
    });
    if (path === '/token') {
      if (typeof body.code !== 'string' || !body.code) return json({ error: 'missing_code' }, 400);
      form.set('grant_type', 'authorization_code');
      form.set('code', body.code);
    } else {
      if (typeof body.refresh_token !== 'string' || !body.refresh_token) return json({ error: 'missing_refresh_token' }, 400);
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', body.refresh_token);
    }

    let r, d;
    try {
      r = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body: form });
      d = await r.json();
    } catch (e) {
      return json({ error: 'strava_unreachable' }, 502);
    }
    if (!r.ok) return json({ error: 'strava_rejected', status: r.status }, r.status === 429 ? 429 : 401);

    // pass through only what the app stores — nothing extra transits
    return json({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at,
      athlete: d.athlete
        ? { id: d.athlete.id, firstname: d.athlete.firstname || '', lastname: d.athlete.lastname || '' }
        : null,
    });
  },
};
