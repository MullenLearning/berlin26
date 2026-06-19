# Cloudflare Worker setup — `berlin26-strava`

One-time, ~5 minutes, all in the dashboard. The Worker only exchanges and
refreshes OAuth tokens (Strava's `/oauth/token` has no CORS headers); activity
reads go browser → Strava directly.

1. **Create the Worker** — <https://dash.cloudflare.com> → *Workers & Pages* →
   *Create* → *Create Worker*. Name it **`berlin26-strava`** → *Deploy* (the
   hello-world placeholder).
2. **Paste the code** — *Edit code*, replace everything with
   [`berlin26-strava.js`](berlin26-strava.js), *Deploy*.
3. **Add the secrets** — Worker → *Settings* → *Variables and Secrets* → add:
   - `STRAVA_CLIENT_ID` = `257604` (type Text is fine)
   - `STRAVA_CLIENT_SECRET` = the secret from <https://www.strava.com/settings/api>
     (type **Secret**)
4. **Copy the URL** — shown on the Worker overview, like
   `https://berlin26-strava.<your-subdomain>.workers.dev`.
5. **Point the app at it** — in `index.html`, set `STRAVA_PROXY` to that URL
   (one line, search for `REPLACE-ME`), commit, push.

Smoke test (expects a 401-shaped JSON, proving env vars + CORS are wired):

```sh
curl -s -X POST https://berlin26-strava.<your-subdomain>.workers.dev/token \
  -H 'Content-Type: application/json' -H 'Origin: https://mullenlearning.github.io' \
  -d '{"code":"bogus"}'
# → {"error":"strava_rejected","status":400}
```

Dev note: the app reads an override from
`localStorage['berlin2026.stravaProxy']`, so you can test a Worker URL from the
console before committing it.

---

## Google Calendar (v3) — same Worker, two more routes

The Worker now also exchanges Google OAuth tokens (`/gcal/token`, `/gcal/refresh`).
Calendar reads/writes are CORS-open, so they go browser → `www.googleapis.com`
directly; only the token exchange needs the Worker (Google's token endpoint needs
the client secret, which must stay out of the public repo).

1. **Create a Google Cloud project** — <https://console.cloud.google.com> → new project
   (e.g. `berlin26`).
2. **Enable the Google Calendar API** — APIs & Services → Library → *Google Calendar API* → Enable.
3. **OAuth consent screen** — User type **External**; fill the app name + your email.
   Leave it in **Testing** and add your own Google account under **Test users** — that
   skips Google verification entirely (sensitive scope is fine for a test user).
4. **Create credentials** — Credentials → Create → **OAuth client ID** → type
   **Web application**. Authorized redirect URI: `https://mullenlearning.github.io/berlin26/`
   (must match the app's redirect exactly). Note the **Client ID** and **Client secret**.
5. **Add the secrets to the Worker** — Settings → Variables and Secrets:
   - `GCAL_CLIENT_ID` = the client ID (Text)
   - `GCAL_CLIENT_SECRET` = the client secret (Secret)
   Re-deploy (re-paste `berlin26-strava.js`) so the `/gcal/*` routes go live.
6. **Scope**: the app requests `https://www.googleapis.com/auth/calendar.events` only
   (read/write events, not full calendar access), with `access_type=offline` +
   `prompt=consent` so Google returns a refresh token on first connect.

Smoke test (expects a 400-shaped JSON, proving env vars + routing are wired):

```sh
curl -s -X POST https://berlin26-strava.<your-subdomain>.workers.dev/gcal/token \
  -H 'Content-Type: application/json' -H 'Origin: https://mullenlearning.github.io' \
  -d '{"code":"bogus","redirect_uri":"https://mullenlearning.github.io/berlin26/"}'
# → {"error":"google_rejected","status":400,...}
```
