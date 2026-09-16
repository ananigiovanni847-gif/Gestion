// Service Worker — Gestion Immo Pro
// Rend l'app installable (icône, plein écran) et un peu plus résistante aux coupures réseau.
// Prêt aussi à recevoir de vraies notifications push le jour où le serveur (Cloud Functions)
// sera configuré pour les envoyer — voir les écouteurs "push" et "notificationclick" plus bas.

const CACHE_NAME = "gestion-immo-v1";
const FICHIERS_A_METTRE_EN_CACHE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_METTRE_EN_CACHE).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Réseau en priorité (pour toujours avoir les dernières données), et on ne se rabat sur
// le cache que si la connexion est vraiment coupée.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// Affiche une vraie notification système quand le serveur en envoie une (à activer plus tard).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { titre: "Gestion Immo Pro", message: event.data ? event.data.text() : "" }; }
  const titre = data.titre || "Gestion Immo Pro";
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: data.message || "",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: "./index.html" },
    })
  );
});

// Au clic sur la notification, ouvre (ou remet au premier plan) l'app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const dejaOuvert = clientsArr.find((c) => c.url.includes("index.html"));
      if (dejaOuvert) return dejaOuvert.focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
