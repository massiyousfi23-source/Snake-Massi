const CACHE='kichta-run-v4';
const FILES=['./','index.html','styles.css','bonus.css','game.js','manifest.webmanifest','icon.svg','assets/alley-bg.webp','assets/alley-market.webp','assets/alley-industrial.webp','assets/alley-moon.webp','assets/pucci-boss.webp','assets/kichta-paradise.mp4',...Array.from({length:6},(_,i)=>`assets/kichta/run-${i}.webp`)];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
