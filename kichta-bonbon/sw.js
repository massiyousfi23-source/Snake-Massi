// Mode hors ligne : le jeu se met en cache à la première visite.
const CACHE = 'kichta-run-bonbon-b6';
const AI_CACHE = 'kichta-ai-1';
const FILES = ['./', 'index.html', 'candy.css?v=b6', 'main.js?v=b6', 'world.js?v=b6', 'toons.js?v=b6', 'sfx.js?v=b6', 'bosses.js?v=b6', 'themes.js?v=b6', 'cats.js?v=b6',
  '../vendor/three.core.min.js', '../vendor/three.module.min.js', '../vendor/three.addons.min.js',
  'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'assets/audio/candy-menu.mp3', 'assets/audio/candy-run.mp3', 'assets/audio/candy-boss.mp3', 'assets/audio/pucci-meow.mp3',
  'assets/audio/k-jump.mp3', 'assets/audio/k-land.mp3', 'assets/audio/k-coin.mp3', 'assets/audio/k-break.mp3', 'assets/audio/k-blaster.mp3',
  'assets/audio/k-impact.mp3', 'assets/audio/k-hurt.mp3', 'assets/audio/k-destroy.mp3', 'assets/audio/k-steps.mp3', 'assets/audio/k-click.mp3',
  'assets/audio/k-attack.mp3', 'assets/audio/k-fall.mp3'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE && x.startsWith('kichta-run-bonbon')).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
// Les vidéos passent directement par le réseau (Safari les demande par morceaux).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || e.request.headers.has('range') || url.pathname.endsWith('.mp4')) return;
  if (url.origin !== location.origin) return;
  // L'IA « Mon chat » (≈ 50 Mo) : gardée dans son propre cache, d'une version à l'autre
  if (url.pathname.includes('/ai/')) {
    e.respondWith(caches.open(AI_CACHE).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
