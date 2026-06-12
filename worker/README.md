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
