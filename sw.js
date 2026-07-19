const CACHE = 'commwatch-v12';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
  '/welcome-combined.mp3'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((n) => Promise.all(n.filter((x) => x !== CACHE).map((x) => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
// Push notifications
self.addEventListener('push', (e) => {
  let data = { title: 'Community Watch', body: 'New alert in your area', icon: '/icon-192.png', badge: '/favicon.svg' };
  if (e.data) { try { data = { ...data, ...e.data.json() }; } catch(ex) { data.body = e.data.text(); } }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: data.icon, badge: data.badge,
    vibrate: [200, 100, 200], data: { url: '/' },
    actions: [{ action: 'open', title: 'View Alert' }]
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => {
    for (const c of cs) { if (c.url === url && 'focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
