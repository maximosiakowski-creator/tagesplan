// Cache-Version erhöhen, sobald sich eine der unten gelisteten Dateien ändert –
// das sorgt dafür, dass beim nächsten App-Start automatisch neu gecacht wird.
const CACHE_NAME='tagesplan-v9';

const CORE_ASSETS=[
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install',event=>{
  /* Nicht auf das Schließen aller Fenster warten – sonst käme ein Update
     erst viel später an. */
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(names=>
      Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(res=>{
        if(res&&res.status===200&&res.type==='basic'){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
        }
        return res;
      }).catch(()=>{
        if(req.mode==='navigate') return caches.match('index.html');
      });
    })
  );
});
