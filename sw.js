 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/sw.js b/sw.js
new file mode 100644
index 0000000000000000000000000000000000000000..7fceabec19156fd6a0434fa4bf054cdcfdac1eed
--- /dev/null
+++ b/sw.js
@@ -0,0 +1,66 @@
+const CACHE_VERSION = 'v2';
+const STATIC_CACHE = `bvhankry-static-${CACHE_VERSION}`;
+const RUNTIME_CACHE = `bvhankry-runtime-${CACHE_VERSION}`;
+
+const PRECACHE_URLS = [
+  '/',
+  '/index.html',
+  '/manifest.webmanifest',
+  '/iconos/pesta%C3%B1a%20simbo.png'
+];
+
+self.addEventListener('install', (event) => {
+  event.waitUntil((async () => {
+    const cache = await caches.open(STATIC_CACHE);
+    await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
+    await self.skipWaiting();
+  })());
+});
+
+self.addEventListener('activate', (event) => {
+  event.waitUntil((async () => {
+    const keys = await caches.keys();
+    await Promise.all(
+      keys
+        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
+        .map((key) => caches.delete(key))
+    );
+    await self.clients.claim();
+  })());
+});
+
+self.addEventListener('fetch', (event) => {
+  const request = event.request;
+  const requestUrl = new URL(request.url);
+
+  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
+    return;
+  }
+
+  if (request.mode === 'navigate') {
+    event.respondWith((async () => {
+      try {
+        const networkResponse = await fetch(request);
+        const runtimeCache = await caches.open(RUNTIME_CACHE);
+        runtimeCache.put(request, networkResponse.clone());
+        return networkResponse;
+      } catch {
+        return (await caches.match(request)) || (await caches.match('/index.html'));
+      }
+    })());
+    return;
+  }
+
+  event.respondWith((async () => {
+    const cached = await caches.match(request);
+    if (cached) return cached;
+
+    const networkResponse = await fetch(request);
+    const destination = request.destination;
+    if (['style', 'script', 'image', 'font'].includes(destination)) {
+      const runtimeCache = await caches.open(RUNTIME_CACHE);
+      runtimeCache.put(request, networkResponse.clone());
+    }
+    return networkResponse;
+  })());
+});
 
EOF
)
