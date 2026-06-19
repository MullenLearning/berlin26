# Google OAuth client — setup checklist (Berlin26 v3)

~5 minutes, all in the browser. You create a "Web application" OAuth client, put the **secret**
into Cloudflare, and hand the **client ID** to the app. The secret never goes into the repo or chat.

## Values you'll paste (copy these)

| Where | Value |
|---|---|
| Authorized **redirect URI** | `https://mullenlearning.github.io/berlin26/` *(exact, keep the trailing slash)* |
| Authorized **JavaScript origin** (optional) | `https://mullenlearning.github.io` |
| **Scope** the app requests | `https://www.googleapis.com/auth/calendar.events` |
| Worker **env var names** | `GCAL_CLIENT_ID` (Text) · `GCAL_CLIENT_SECRET` (Secret) |
| Worker URL (for the smoke test) | `https://berlin26-strava.luke-mullen1.workers.dev` |

---

## 1. Create / pick a project
1. Go to <https://console.cloud.google.com>.
2. Project picker (top bar) → **New Project** → name `berlin26` → **Create** → select it.

## 2. Enable the Calendar API
3. Left menu → **APIs & Services → Library**.
4. Search **Google Calendar API** → open it → **Enable**.

## 3. Configure the consent screen (Google Auth Platform)
> New console calls this **Google Auth Platform**; older one calls it **OAuth consent screen**. Same thing.
5. Left menu → **Google Auth Platform** (or APIs & Services → OAuth consent screen).
6. **Branding**: App name `Berlin26`; User support email = your email; Developer contact = your email. Save.
7. **Audience**: User type **External**. Leave **Publishing status = Testing** (don't publish).
8. **Audience → Test users → Add users**: add **your own Google account email**.
   *(In Testing, your own account can use the sensitive `calendar.events` scope with no Google verification.)*

## 4. Create the OAuth client
9. **Google Auth Platform → Clients → Create client** (or APIs & Services → Credentials → **Create credentials → OAuth client ID**).
10. **Application type: Web application**.
11. Name: `Berlin26 web`.
12. **Authorized redirect URIs → Add URI**: `https://mullenlearning.github.io/berlin26/`
    *(must match exactly — trailing slash and the `/berlin26/` path).*
13. *(Optional)* **Authorized JavaScript origins → Add**: `https://mullenlearning.github.io`.
14. **Create.** A dialog shows your **Client ID** and **Client secret** — keep both for the next steps.
    Don't paste the secret into chat or commit it to the repo.

## 5. Put the secret in Cloudflare (re-deploy the Worker)
15. <https://dash.cloudflare.com> → **Workers & Pages → `berlin26-strava` → Settings → Variables and Secrets**.
16. Add `GCAL_CLIENT_ID` = your client ID (**Text**).
17. Add `GCAL_CLIENT_SECRET` = your client secret (**Secret**).
18. **Save**, then re-paste `worker/berlin26-strava.js` and **Deploy** so the `/gcal/*` routes go live.

## 6. Give the client ID to the app
19. The **client ID** (public, ends `.apps.googleusercontent.com`) goes into `index.html`. Find the line
    near the top of the `<script>`:
    ```js
    const GCAL_CLIENT_ID=(storageOK&&localStorage.getItem('berlin2026.gcalClientId'))||'PASTE-GOOGLE-CLIENT-ID.apps.googleusercontent.com';
    ```
    Replace the `PASTE-GOOGLE-CLIENT-ID.apps.googleusercontent.com` placeholder with your client ID, commit,
    and push. (Alternatively, without editing the file, set it once on the device:
    `localStorage['berlin2026.gcalClientId'] = '<your-id>.apps.googleusercontent.com'`.) Until it's set, the
    **Connect Google Calendar** button explains it isn't configured yet. The **secret stays only in
    Cloudflare** — the app never sees it.

## 7. Smoke test (optional, terminal)
```sh
curl -s -X POST https://berlin26-strava.luke-mullen1.workers.dev/gcal/token \
  -H 'Content-Type: application/json' -H 'Origin: https://mullenlearning.github.io' \
  -d '{"code":"bogus","redirect_uri":"https://mullenlearning.github.io/berlin26/"}'
# Expect:  {"error":"google_rejected","status":400,...}
# (That proves the route + env vars are wired. A "google_rejected" is the *good* result here.)
```
Then, once Claude Code has built the connect flow: app → **Training tab → Connect Google Calendar**.

---

## Gotchas
- **Redirect URI mismatch** is the #1 failure — it must be character-for-character identical to the app URL (with the trailing slash). If you host anywhere else, add that URI too.
- **"Access blocked: app isn't verified"** → your account isn't in **Test users**, or publishing status got moved off Testing. Add yourself as a test user; stay in Testing.
- **No refresh token coming back?** Google only returns one on the *first* consent with `access_type=offline` + `prompt=consent` (the app's authorize URL sets both). If it stops, remove the app at <https://myaccount.google.com/permissions> and reconnect.
- **Secret hygiene**: it lives only in the Cloudflare Secret field. Never in `index.html`, the public repo, or this chat.
