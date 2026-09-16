// AR Plant Doctor - Main Application Script

let plantsCache = null;

/**
 * Fetches plant data from plants.json and caches the result.
 * @param {string} markerId - The marker ID (key) to look up.
 * @returns {Promise<Object|null>} Matching plant object or null if not found.
 */
async function getPlantData(markerId) {
    if (!plantsCache) {
        try {
            const response = await fetch('./plants.json');
            plantsCache = await response.json();
        } catch (error) {
            console.error('Error fetching plants.json:', error);
            return null;
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
 * Initializes and populates marker AR overlay elements with plant data.
 * @param {string} markerId - Marker ID/value string ("1" to "5" or "hiro").
 */
async function initMarker(markerId) {
    const targetKey = markerId === 'hiro' ? '1' : markerId;
    const plant = await getPlantData(targetKey);
    if (!plant) return;

    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.wateringIntervalDays - daysPassed;

    const waterText = daysUntilWater(plant.lastWatered, plant.wateringIntervalDays);
    const urgencyColor = getUrgencyColor(daysRemaining);

    const suffix = markerId;
    const nameEl = document.querySelector(`#name-${suffix}`);
    const waterEl = document.querySelector(`#water-${suffix}`);
    const sunEl = document.querySelector(`#sun-${suffix}`);
    const tipEl = document.querySelector(`#tip-${suffix}`);

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
    // Pre-populate marker data for markers 1 to 5 and hiro
    const markerIds = ['1', '2', '3', '4', '5', 'hiro'];
    for (const id of markerIds) {
        await initMarker(id);
    }

    // Hide loading screen after 3 seconds unconditionally
    setTimeout(() => {
        const ls = document.querySelector('.loading-screen');
        if (ls) ls.style.display = 'none';
    }, 3000);

    // Wire markers with markerFound / markerLost event handlers
    const infoBanner = document.getElementById('ar-overlay-info');

    for (const id of markerIds) {
        const selector = id === 'hiro' ? '#marker-hiro' : `#marker-${id}`;
        const markerEl = document.querySelector(selector);
        if (markerEl) {
            markerEl.addEventListener('markerFound', async () => {
                await initMarker(id);
                const targetKey = id === 'hiro' ? '1' : id;
                const plant = plantsCache && plantsCache[targetKey] ? plantsCache[targetKey] : null;
                if (infoBanner && plant) {
                    infoBanner.innerText = `🌿 Marker ${id.toUpperCase()} Detected: ${plant.name}`;
                    infoBanner.style.borderColor = '#FFD166';
                    infoBanner.style.color = '#FFD166';
                }
            });

            markerEl.addEventListener('markerLost', () => {
                if (infoBanner) {
                    infoBanner.innerText = `🌿 AR Doctor Active: Scan Marker #1-5 or Hiro Marker`;
                    infoBanner.style.borderColor = '#52B788';
                    infoBanner.style.color = '#52B788';
                }
            });
        }
    }
});

// Attach functions to global window object
if (typeof window !== 'undefined') {
    window.getPlantData = getPlantData;
    window.daysUntilWater = daysUntilWater;
    window.getUrgencyColor = getUrgencyColor;
    window.initMarker = initMarker;
}
