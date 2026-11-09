/* Service worker của Sổ Theo Dõi: trang tải từ mạng trước (luôn có bản mới), có bản lưu đệm khi mất mạng. */
const CACHE = 'sd-v27';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const LIBS = /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.sheetjs\.com|www\.gstatic\.com\/firebasejs/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === location.origin;
  if (!same && !LIBS.test(u.href)) return;   // Firestore, đăng nhập Google...: để trình duyệt tự xử lý
  if (same) {                                 // trang của app: mạng trước, hết 4 giây hoặc mất mạng thì dùng bản lưu
    e.respondWith(
      Promise.race([
        fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }),
        new Promise((_, rej) => setTimeout(rej, 4000))
      ]).catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
    );
  } else {                                    // thư viện CDN đã ghim phiên bản: bản lưu trước
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    })));
  }
});
