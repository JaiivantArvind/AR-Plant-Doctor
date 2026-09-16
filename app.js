// AR Plant Doctor - Main Application Script

let plantsCache = null;

/**
 * Fetches plant data from plants.json and caches the result.
 * Automatically re-fetches if markerId is missing in cache.
 * @param {string} markerId - The marker ID (key) to look up.
 * @returns {Promise<Object|null>} Matching plant object or null if not found.
 */
async function getPlantData(markerId) {
    if (!plantsCache || !plantsCache[markerId]) {
        try {
            const response = await fetch('/api/plants');
            plantsCache = await response.json();
        } catch (error) {
            console.error('Error fetching plants data:', error);
        }
    }
    return plantsCache && plantsCache[markerId] ? plantsCache[markerId] : null;
}

/**
 * Calculates watering status and remaining days in clean ASCII text.
 * @param {string} lastWatered - ISO date string (YYYY-MM-DD).
 * @param {number} intervalDays - Watering interval in days.
 * @returns {string} Human-readable status message.
 */
function daysUntilWater(lastWatered, intervalDays) {
    const last = new Date(lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
    const daysRemaining = intervalDays - daysPassed;

    if (daysRemaining < 0) {
        return `Overdue by ${Math.abs(daysRemaining)} days!`;
    } else if (daysRemaining <= 1) {
        return `Water Today!`;
    } else {
        return `Water in ${daysRemaining} days`;
    }
}

/**
 * Determines urgency color code based on days remaining.
 * @param {number} daysRemaining - Days remaining until next watering.
 * @returns {string} Hex color code (#52B788, #FFB703, or #E63946).
 */
function getUrgencyColor(daysRemaining) {
    if (daysRemaining > 2) {
        return '#52B788';
    } else if (daysRemaining >= 1) {
        return '#FFB703';
    } else {
        return '#E63946';
    }
}

/**
 * Dynamically fetches plant data and appends <a-marker type="pattern"> elements for plant keys >= 6.
 */
async function initDynamicMarkers() {
    try {
        const response = await fetch('/api/plants');
        if (!response.ok) return;
        plantsCache = await response.json();
        const scene = document.querySelector('a-scene');
        if (!scene) return;

        const infoBanner = document.getElementById('ar-overlay-info');

        for (const key of Object.keys(plantsCache)) {
            const num = parseInt(key, 10);
            if (isNaN(num) || num < 6) continue; // 1 to 5 are hardcoded pattern markers in HTML

            const idStr = String(num);
            if (document.querySelector(`#marker-${idStr}`)) continue; // Avoid duplicate

            const markerEl = document.createElement('a-marker');
            markerEl.setAttribute('type', 'pattern');
            markerEl.setAttribute('url', `/markers/marker-${idStr}.patt`);
            markerEl.setAttribute('id', `marker-${idStr}`);
            markerEl.setAttribute('patternRatio', '0.75');

            const planeEl = document.createElement('a-plane');
            planeEl.setAttribute('position', '0 1.8 0');
            planeEl.setAttribute('width', '2.4');
            planeEl.setAttribute('height', '1.6');
            planeEl.setAttribute('color', '#1A1A2E');
            planeEl.setAttribute('opacity', '0.92');

            const emojiEl = document.createElement('a-text');
            emojiEl.setAttribute('id', `emoji-${idStr}`);
            emojiEl.setAttribute('position', '-0.9 2.3 0.05');
            emojiEl.setAttribute('value', '🪴');
            emojiEl.setAttribute('color', '#52B788');
            emojiEl.setAttribute('width', '5');

            const nameEl = document.createElement('a-text');
            nameEl.setAttribute('id', `name-${idStr}`);
            nameEl.setAttribute('position', '-0.6 2.3 0.05');
            nameEl.setAttribute('value', `PLANT #${idStr}`);
            nameEl.setAttribute('color', '#FFFFFF');
            nameEl.setAttribute('width', '4.5');

            const waterEl = document.createElement('a-text');
            waterEl.setAttribute('id', `water-${idStr}`);
            waterEl.setAttribute('position', '-1.0 2.0 0.05');
            waterEl.setAttribute('value', 'Water Status');
            waterEl.setAttribute('color', '#FFD166');
            waterEl.setAttribute('width', '3.5');

            const sunEl = document.createElement('a-text');
            sunEl.setAttribute('id', `sun-${idStr}`);
            sunEl.setAttribute('position', '-1.0 1.7 0.05');
            sunEl.setAttribute('value', 'Sunlight');
            sunEl.setAttribute('color', '#B7E4C7');
            sunEl.setAttribute('width', '3.0');

            const tipEl = document.createElement('a-text');
            tipEl.setAttribute('id', `tip-${idStr}`);
            tipEl.setAttribute('position', '-1.0 1.4 0.05');
            tipEl.setAttribute('value', 'Tip');
            tipEl.setAttribute('color', '#B7E4C7');
            tipEl.setAttribute('width', '2.6');

            markerEl.appendChild(planeEl);
            markerEl.appendChild(emojiEl);
            markerEl.appendChild(nameEl);
            markerEl.appendChild(waterEl);
            markerEl.appendChild(sunEl);
            markerEl.appendChild(tipEl);

            markerEl.addEventListener('markerFound', async () => {
                await initMarker(idStr);
                const plant = plantsCache && plantsCache[idStr] ? plantsCache[idStr] : null;
                if (infoBanner && plant) {
                    infoBanner.innerText = `🌿 Marker #${idStr} Detected: ${plant.name}`;
                    infoBanner.style.borderColor = '#FFD166';
                    infoBanner.style.color = '#FFD166';
                }
            });

            markerEl.addEventListener('markerLost', () => {
                if (infoBanner) {
                    infoBanner.innerText = `🌿 AR Doctor Active: Scan Marker #1-5`;
                    infoBanner.style.borderColor = '#52B788';
                    infoBanner.style.color = '#52B788';
                }
            });

            scene.appendChild(markerEl);
            await initMarker(idStr);
        }
    } catch (err) {
        console.error('Error initializing dynamic markers:', err);
    }
}

/**
 * Initializes and populates marker AR overlay elements with plant data.
 * @param {string} markerId - Marker ID/value string ("1", "2", "3", ...).
 */
async function initMarker(markerId) {
    const plant = await getPlantData(markerId);
    if (!plant) return;

    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.wateringIntervalDays - daysPassed;

    const waterText = daysUntilWater(plant.lastWatered, plant.wateringIntervalDays);
    const urgencyColor = getUrgencyColor(daysRemaining);

    const nameEl = document.querySelector(`#name-${markerId}`);
    const waterEl = document.querySelector(`#water-${markerId}`);
    const sunEl = document.querySelector(`#sun-${markerId}`);
    const tipEl = document.querySelector(`#tip-${markerId}`);
    const emojiEl = document.querySelector(`#emoji-${markerId}`);

    if (emojiEl && plant.emoji) {
        emojiEl.setAttribute('value', plant.emoji);
    }
    if (nameEl) {
        const displayName = (plant.name || '').toUpperCase();
        nameEl.setAttribute('value', displayName);
        nameEl.setAttribute('color', '#FFFFFF');
    }
    if (waterEl) {
        waterEl.setAttribute('value', `WATER: ${waterText}`);
        waterEl.setAttribute('color', urgencyColor);
    }
    if (sunEl) {
        const sun = (plant.sunlight || '').substring(0, 30);
        sunEl.setAttribute('value', `SUN: ${sun}`);
        sunEl.setAttribute('color', '#B7E4C7');
    }
    if (tipEl) {
        const firstTip = (plant.tips && plant.tips.length > 0 ? plant.tips[0] : '').substring(0, 35);
        tipEl.setAttribute('value', `TIP: ${firstTip}`);
        tipEl.setAttribute('color', '#B7E4C7');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch and initialize dynamic pattern markers from /api/plants
    await initDynamicMarkers();

    // 2. Poll for new markers every 3 seconds
    setInterval(initDynamicMarkers, 3000);

    // 3. Pre-populate plant data for all markers currently in DOM
    const allMarkers = document.querySelectorAll('a-marker');
    for (const el of allMarkers) {
        const id = el.id.replace('marker-', '');
        if (id) await initMarker(id);
    }

    // 4. Hide loading screen after 3 seconds
    setTimeout(() => {
        const ls = document.querySelector('.loading-screen');
        if (ls) ls.style.display = 'none';
    }, 3000);

    // 5. Wire initial markers in DOM
    const infoBanner = document.getElementById('ar-overlay-info');

    allMarkers.forEach((markerEl) => {
        const id = markerEl.id.replace('marker-', '');
        markerEl.addEventListener('markerFound', async () => {
            await initMarker(id);
            const plant = plantsCache && plantsCache[id] ? plantsCache[id] : null;
            if (infoBanner && plant) {
                infoBanner.innerText = `🌿 Marker #${id} Detected: ${plant.name}`;
                infoBanner.style.borderColor = '#FFD166';
                infoBanner.style.color = '#FFD166';
            }
        });

        markerEl.addEventListener('markerLost', () => {
            if (infoBanner) {
                infoBanner.innerText = `🌿 AR Doctor Active: Scan Marker #1-5`;
                infoBanner.style.borderColor = '#52B788';
                infoBanner.style.color = '#52B788';
            }
        });
    });
});

// Attach functions to global window object
if (typeof window !== 'undefined') {
    window.getPlantData = getPlantData;
    window.daysUntilWater = daysUntilWater;
    window.getUrgencyColor = getUrgencyColor;
    window.initMarker = initMarker;
    window.initDynamicMarkers = initDynamicMarkers;
}
