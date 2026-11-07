/* Mawjoud service worker — "works on a weak connection".
 *
 * Pages: network-first with a short timeout, falling back to the last
 *   copy this phone saw, then to /hors-ligne. A patient in a pharmacy
 *   queue with one bar of signal still gets the last results.
 * Static build assets (/_next/static): cache-first (content-hashed).
 * API GETs: network-first, cached copy on failure.
 * Never cached: non-GET requests, pharmacist + admin pages and APIs, auth, RSC
 *   payloads (Next falls back to a full navigation when those fail,
 *   which this worker then serves from cache).
 *
 * Bump VERSION to invalidate every cache on the next deploy.
 */
const VERSION = "v3";
const PAGES = `mawjoud-pages-${VERSION}`;
const STATIC = `mawjoud-static-${VERSION}`;
const API = `mawjoud-api-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
const INDEX_URL = "/__mawjoud-offline-index";
const PAGE_TIMEOUT_MS = 4500;
const MAX_PAGES = 40;

/** Precache /hors-ligne AND the JS/CSS it needs: the page is only ever
 *  shown offline, when its chunks could not be fetched any more, and
 *  without them it cannot hydrate to list the saved pages. */
async function precacheOfflinePage() {
  const pages = await caches.open(PAGES);
  await pages.addAll([OFFLINE_URL, "/"]);
  const html = await (await pages.match(OFFLINE_URL)).text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  const statics = await caches.open(STATIC);
  await Promise.all(assets.map((url) => statics.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isPrivate(url) {
  return ["/pharmacien", "/admin", "/api/pharmacist", "/api/admin"].some((p) => url.pathname.startsWith(p));
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function readIndex() {
  const cache = await caches.open(PAGES);
  const res = await cache.match(INDEX_URL);
  return res ? res.json() : [];
}

/** Keep a small {path, title, savedAt} index so /hors-ligne can list
 *  what is available offline, newest first, capped at MAX_PAGES. */
async function remember(request, response) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  await cache.put(url.pathname, response.clone());

  let title = url.pathname;
  try {
    const html = await response.clone().text();
    const m = html.match(/<title>([^<]{1,200})<\/title>/i);
    if (m) title = m[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
  } catch {
    /* keep the path as title */
  }

  const index = (await readIndex()).filter((e) => e.path !== url.pathname);
  index.unshift({ path: url.pathname, title, savedAt: new Date().toISOString() });
  const kept = index.slice(0, MAX_PAGES);
  for (const dropped of index.slice(MAX_PAGES)) await cache.delete(dropped.path);
  await cache.put(INDEX_URL, new Response(JSON.stringify(kept), { headers: { "Content-Type": "application/json" } }));
}

/**
 * With a saved copy: race the network against PAGE_TIMEOUT_MS and show
 * the saved copy if the network is slow or down (the network keeps going
 * in the background and refreshes the copy).
 * Without one: wait for the network as long as it takes — the free-tier
 * API can take ~60 s to wake, and an online user must never be shown the
 * offline page just because the server is slow.
 */
async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  const saved = await cache.match(url.pathname);

  const network = fetch(request);
  // Keep the worker alive until the background refresh is stored.
  event.waitUntil(
    network
      .then((response) =>
        response.ok && response.type === "basic" && !isPrivate(url) ? remember(request, response.clone()) : undefined
      )
      .catch(() => undefined)
  );

  if (saved) {
    try {
      return await Promise.race([network, timeout(PAGE_TIMEOUT_MS)]);
    } catch {
      return saved;
    }
  }
  try {
    return await network;
  } catch {
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([fetch(request), timeout(PAGE_TIMEOUT_MS * 2)]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname === INDEX_URL) {
      event.respondWith(caches.open(PAGES).then((c) => c.match(INDEX_URL)).then((r) => r || new Response("[]")));
      return;
    }
    if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
    if (request.mode === "navigate") {
      if (isPrivate(url)) return;
      event.respondWith(handleNavigation(event));
      return;
    }
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Cross-origin: only the Mawjoud API's public GETs.
  if (url.pathname.startsWith("/api/") && !isPrivate(url) && !request.headers.has("Authorization")) {
    event.respondWith(networkFirst(request, API));
  }
});
