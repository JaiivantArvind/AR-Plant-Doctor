// AR Plant Doctor - Dashboard Service Worker

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_PLANTS') {
        const plants = event.data.plants || {};
        const now = new Date();
        const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

        Object.entries(plants).forEach(([id, plant]) => {
            const last = new Date(plant.lastWatered);
            const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
            const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
            const daysRemaining = plant.wateringIntervalDays - daysPassed;

            if (daysRemaining <= 0) {
                self.registration.showNotification("🌿 Plant Doctor", {
                    body: `${plant.name} needs watering!`,
                    icon: "/assets/icons/leaf.png",
                    tag: `plant-${id}`
                });
            }
        });
    }
});
