const CACHE='kichta-run-3d-v1';
const FILES=['./','index.html','styles.css?v=3d1','bonus.css?v=3d1','ui.css?v=3d1','game.js?v=3d1','run3d.js?v=3d1','cats.js?v=3d1','../vendor/three.core.min.js','../vendor/three.module.min.js','manifest.webmanifest','icon.svg','assets/audio/run-loop.mp3','assets/audio/boss-loop.mp3','assets/audio/collision.mp3','assets/audio/pickup.mp3','assets/audio/pucci-meow.mp3','assets/audio/shot.mp3','assets/audio/wall-break.mp3'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Les vidéos passent directement par le réseau : Safari (iPhone) les demande
// par morceaux, ce qu'une réponse en cache ne sait pas fournir.
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||e.request.headers.has('range')||url.pathname.endsWith('.mp4'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
