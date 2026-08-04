const C="cw-v20";const A=["/","/index.html","/manifest.json","/icon-192.png","/icon-512.png","/favicon.svg","/welcome-combined.mp3","/alert-sound.mp3"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(n=>Promise.all(n.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
self.addEventListener("push",e=>{let d={title:"Community Watch",body:"New alert",icon:"/icon-192.png",badge:"/favicon.svg"};if(e.data){try{d={...d,...e.data.json()}}catch(ex){d.body=e.data.text()}}e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:d.icon,vibrate:[500,200,500],tag:"cw-"+Date.now(),requireInteraction:true,silent:false}))});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.openWindow("/"))});
