const CACHE='civweave-chat-v2';
const CORE=['./', './index.html', './app.css', './mesh.js', './app-config.js', './app-state.js', './app-ui.js', './app-wish.js', './app-validation-rollup.js', './app-validation-ui.js', './app-validation-core.js', './app-validation-peer-ui.js', './app-validation-peer-sync.js', './app-validation-peer.js', './app-flow-records.js', './app-flow-wallet.js', './app-flow-creator.js', './app-flow-commerce.js', './app-network-radar-ui.js', './app-network-radar-discovery.js', './app-network-radar.js', './app-network-pairing-request.js', './app-network-pairing-state.js', './app-network-pairing.js', './app-network-gossip.js', './app-ai-model.js', './app-ai-settings.js', './app-ai-runtime.js', './app-actions-core.js', './app-actions-wallet.js', './app-actions-network.js', './app-actions-system.js', './app-actions.js', './app-boot.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).origin===location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
