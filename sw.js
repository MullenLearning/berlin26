/* Berlin 2026 — offline cache. Logged data lives in localStorage, never here,
   so cache updates can never touch user logs.
   DEPLOY NOTE: bump CACHE whenever icons or manifest change — index.html
   updates land automatically (navigations are network-first). */
const CACHE = 'berlin26-v3';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Navigations: network-first with a short timeout so a flaky connection falls
   back to the cached app instead of hanging on a blank screen. Static assets:
   cache-first. Only successful responses are ever cached. */
function networkWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => { ctl.abort(); reject(new Error('timeout')); }, ms);
    fetch(req, { signal: ctl.signal }).then(r => { clearTimeout(timer); resolve(r); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      networkWithTimeout(e.request, 2500)
        .then(r => {
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }))
  );
});
