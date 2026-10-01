const VERSION='basusice-1.1.1-final';
const BASE=new URL('./',self.registration.scope).href;
const SHELL=['','index.html','manifest.json','icon.svg','logo-sice.jpg','logo-veralu.jpg','admin.html','privacy.html','terms.html'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const cached=await cache.match(event.request);
    if(cached) return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok) cache.put(event.request,response.clone());
      return response;
    }catch(error){
      if(event.request.mode==='navigate') return cache.match(new URL('index.html',BASE));
      return new Response('',{status:503,statusText:'Offline'});
    }
  })());
});
