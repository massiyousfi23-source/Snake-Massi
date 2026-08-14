const CACHE='kichta-run-v9';
const FILES=['./','index.html','styles.css','bonus.css','ui.css','game.js?v=9','manifest.webmanifest','icon.svg','assets/alley-panorama.webp','assets/kichta-ending.mp4','assets/pucci-boss.webp','assets/audio/run-loop.mp3','assets/audio/boss-loop.mp3','assets/audio/collision.mp3','assets/audio/pickup.mp3','assets/audio/pucci-meow.mp3','assets/audio/shot.mp3','assets/audio/wall-break.mp3',...Array.from({length:6},(_,i)=>`assets/kichta/run-${i}.webp`)];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
