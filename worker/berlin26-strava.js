/* berlin26-strava — OAuth token proxy for the Berlin26 PWA.
   Strava's /oauth/token endpoint sends no CORS headers, so the browser can't
   call it directly. Plain API GETs are CORS-open (ACAO: *, verified live
   12 Jun 2026), so only the two auth flows land here:
     POST /token    {code}          → code → tokens   (first connect)
     POST /refresh  {refresh_token} → fresh tokens    (routine refresh)
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

    const path = new URL(request.url).pathname.replace(/\/+$/, '');
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
