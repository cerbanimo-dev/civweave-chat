const CACHE='civweave-chat-v4-security';
const CORE=['./index.html','./app.css','./mesh.js','./core.js','./weave.js','./validation.js','./payments.js','./realms.js','./hardening.js','./peers.js','./ai.js','./actions.js','./boot.js'];
const PATHS=new Set(['/',...CORE.map(x=>new URL(x,self.location.origin).pathname)]);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin||url.pathname.startsWith('/api/')||!PATHS.has(url.pathname))return;const key=url.pathname==='/'?'./index.html':`.${url.pathname}`;event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(key,response.clone()));return response}).catch(()=>caches.match(key,{ignoreSearch:true}))) });
