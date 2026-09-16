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
 * @returns {string} Hex color code (#7ec897, #d4a843, or #e8735a).
 */
function getUrgencyColor(daysRemaining) {
    if (daysRemaining >= 3) {
        return '#7ec897'; // OK (3+ days)
    } else if (daysRemaining >= 1) {
        return '#d4a843'; // Due soon (1-2 days)
    } else {
        return '#e8735a'; // Overdue
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
            const idStr = String(key);
            if (document.querySelector(`#marker-${idStr}`)) continue; // Avoid duplicate

            const markerEl = document.createElement('a-marker');
            markerEl.setAttribute('type', 'pattern');
            markerEl.setAttribute('url', `/markers/marker-${idStr}.patt`);
            markerEl.setAttribute('id', `marker-${idStr}`);
            markerEl.setAttribute('patternRatio', '0.75');

            // Main card background
            const bgPlane = document.createElement('a-plane');
            bgPlane.setAttribute('position', '0 1.8 0');
            bgPlane.setAttribute('width', '2.2');
            bgPlane.setAttribute('height', '1.6');
            bgPlane.setAttribute('color', '#0a1a0d');
            bgPlane.setAttribute('opacity', '0.94');
            bgPlane.setAttribute('side', 'double');

            // Name entity: geometry + text combined
            const nameEl = document.createElement('a-entity');
            nameEl.setAttribute('id', `name-${idStr}`);
            nameEl.setAttribute('position', '0 2.52 0.01');
            nameEl.setAttribute('geometry', 'primitive: plane; width: 2.2; height: 0.32');
            nameEl.setAttribute('material', 'color: #162318; opacity: 0.0; transparent: true');
            nameEl.setAttribute('text', 'value: Loading...; color: #e8f0e9; wrapCount: 22; width: 2.0; anchor: center; align: center; baseline: center; font: roboto');

            // Divider 1
            const div1 = document.createElement('a-plane');
            div1.setAttribute('position', '0 2.35 0.01');
            div1.setAttribute('width', '2.0');
            div1.setAttribute('height', '0.01');
            div1.setAttribute('color', '#2a3d2e');

            // Water row entity
            const waterEl = document.createElement('a-entity');
            waterEl.setAttribute('id', `water-${idStr}`);
            waterEl.setAttribute('position', '-0.9 2.18 0.01');
            waterEl.setAttribute('text', 'value: 💧 Water status; color: #d4a843; wrapCount: 28; width: 1.9; anchor: left; align: left; baseline: center; font: roboto');

            // Divider 2
            const div2 = document.createElement('a-plane');
            div2.setAttribute('position', '0 2.0 0.01');
            div2.setAttribute('width', '2.0');
            div2.setAttribute('height', '0.01');
            div2.setAttribute('color', '#2a3d2e');

            // Sun row entity
            const sunEl = document.createElement('a-entity');
            sunEl.setAttribute('id', `sun-${idStr}`);
            sunEl.setAttribute('position', '-0.9 1.82 0.01');
            sunEl.setAttribute('text', 'value: ☀ Sunlight; color: #6b8f6e; wrapCount: 28; width: 1.9; anchor: left; align: left; baseline: center; font: roboto');

            // Divider 3
            const div3 = document.createElement('a-plane');
            div3.setAttribute('position', '0 1.65 0.01');
            div3.setAttribute('width', '2.0');
            div3.setAttribute('height', '0.01');
            div3.setAttribute('color', '#2a3d2e');

            // Tip row entity
            const tipEl = document.createElement('a-entity');
            tipEl.setAttribute('id', `tip-${idStr}`);
            tipEl.setAttribute('position', '-0.9 1.42 0.01');
            tipEl.setAttribute('text', 'value: 💡 Tip; color: #4a6b4e; wrapCount: 22; width: 1.9; anchor: left; align: left; baseline: center; font: roboto');

            // Emoji top left of card
            const emojiEl = document.createElement('a-text');
            emojiEl.setAttribute('id', `emoji-${idStr}`);
            emojiEl.setAttribute('position', '-0.75 2.52 0.02');
            emojiEl.setAttribute('width', '0.8');
            emojiEl.setAttribute('color', '#7ec897');
            emojiEl.setAttribute('value', '🌿');

            markerEl.appendChild(bgPlane);
            markerEl.appendChild(nameEl);
            markerEl.appendChild(div1);
            markerEl.appendChild(waterEl);
            markerEl.appendChild(div2);
            markerEl.appendChild(sunEl);
            markerEl.appendChild(div3);
            markerEl.appendChild(tipEl);
            markerEl.appendChild(emojiEl);

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
                    infoBanner.innerText = `🌿 AR Doctor Active: Scan a plant marker`;
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
    
    // Urgency color logic:
    // Overdue: #e8735a (terracotta)
    // Due soon (1-2 days): #d4a843 (amber)
    // OK (3+ days): #7ec897 (sage green)
    let urgencyColor = '#7ec897';
    if (daysRemaining < 1) {
        urgencyColor = '#e8735a';
    } else if (daysRemaining <= 2) {
        urgencyColor = '#d4a843';
    } else {
        urgencyColor = '#7ec897';
    }

    const nameEl = document.querySelector(`#name-${markerId}`);
    const waterEl = document.querySelector(`#water-${markerId}`);
    const sunEl = document.querySelector(`#sun-${markerId}`);
    const tipEl = document.querySelector(`#tip-${markerId}`);
    const emojiEl = document.querySelector(`#emoji-${markerId}`);

    if (nameEl) {
        nameEl.setAttribute('text', 'value', plant.name);
    }
    if (waterEl) {
        waterEl.setAttribute('text', 'value', '💧 ' + waterText);
        waterEl.setAttribute('text', 'color', urgencyColor);
    }
    if (sunEl) {
        sunEl.setAttribute('text', 'value', '☀ ' + plant.sunlight);
    }
    if (tipEl) {
        tipEl.setAttribute('text', 'value', '💡 ' + (plant.tips[0] || '').substring(0, 60));
    }
    if (emojiEl) {
        emojiEl.setAttribute('value', plant.emoji || '🌿');
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
                infoBanner.innerText = `🌿 AR Doctor Active: Scan a plant marker`;
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
