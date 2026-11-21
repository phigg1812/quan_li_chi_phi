// Service worker: (1) lưu giao diện để mở được khi mất mạng, (2) nhận thông báo đẩy và mở đúng đơn
const CACHE = 'qc-shell-v51';
const SHELL = ['/', '/index.html', '/app.js?v=50', '/core.js?v=49', '/style.css?v=48', '/ui-v5.css?v=6', '/logo-qc.png?v=1', '/deco-lily.png?v=1', '/deco-bouquet.png?v=1', '/manifest.webmanifest', '/icon-192.png?v=qc3', '/icon-512.png?v=qc3', '/icon-180.png?v=qc3', '/favicon-64.png?v=qc4', '/favicon-192.png?v=qc4', '/dat-hoa.html', '/dat-hoa.js?v=4'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('qc-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Giao diện: ưu tiên mạng (luôn mới), mất mạng thì dùng bản đã lưu. Dữ liệu /api không bao giờ được lưu ở đây.
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      if (res.ok && (r.mode === 'navigate' || /\.(js|css|png|svg|webmanifest)$/.test(u.pathname))) { const c = await caches.open(CACHE); c.put(r, res.clone()); }
      return res;
    } catch {
      const hit = await caches.match(r, { ignoreSearch: r.mode === 'navigate' });
      if (hit) return hit;
      if (r.mode === 'navigate') return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      return Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let d = { title: 'Tiệm Hoa Quý Cảnh', body: '', url: '/' };
  try { d = { ...d, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: '/icon-192.png?v=qc3',
      badge: '/icon-192.png?v=qc3',
      data: { url: d.url },
      tag: d.tag || undefined,
      renotify: !!d.tag,
      requireInteraction: !!d.urgent, // chỉ thông báo khẩn (đơn quá hạn) mới nằm lại đến khi bấm
      vibrate: d.urgent ? [200, 100, 200] : [120],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      try {
        await c.focus();
        if ('navigate' in c) await c.navigate(target);
        return;
      } catch {}
    }
    await self.clients.openWindow(target);
  })());
});
