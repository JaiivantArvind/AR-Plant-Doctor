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
 * Calculates watering status and remaining days.
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
        return `⚠ Overdue by ${Math.abs(daysRemaining)} days`;
    } else if (daysRemaining <= 1) {
        return `💧 Water today!`;
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
 * @param {string} markerId - Marker ID/value string ("1" to "5").
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

    const emojiEl = document.querySelector(`#emoji-${markerId}`);
    const nameEl = document.querySelector(`#name-${markerId}`);
    const waterEl = document.querySelector(`#water-${markerId}`);
    const sunEl = document.querySelector(`#sun-${markerId}`);
    const tipEl = document.querySelector(`#tip-${markerId}`);

    if (emojiEl) {
        emojiEl.setAttribute('value', plant.emoji || '🪴');
        emojiEl.setAttribute('color', '#52B788');
    }
    if (nameEl) {
        nameEl.setAttribute('value', plant.name || '');
        nameEl.setAttribute('color', 'white');
    }
    if (waterEl) {
        waterEl.setAttribute('value', waterText);
        waterEl.setAttribute('color', urgencyColor);
    }
    if (sunEl) {
        sunEl.setAttribute('value', `☀️ ${plant.sunlight || ''}`);
        sunEl.setAttribute('color', '#B7E4C7');
    }
    if (tipEl) {
        const firstTip = plant.tips && plant.tips.length > 0 ? plant.tips[0] : '';
        tipEl.setAttribute('value', `💡 ${firstTip}`);
        tipEl.setAttribute('color', '#B7E4C7');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen after 4 seconds unconditionally — camera permission
    // is handled by the browser, we do not need to gate on AR.js events
    setTimeout(() => {
        const ls = document.querySelector('.loading-screen');
        if (ls) ls.style.display = 'none';
    }, 4000);

    // Wire markers
    for (let i = 1; i <= 5; i++) {
        const markerEl = document.querySelector(`#marker-${i}`);
        if (markerEl) {
            markerEl.addEventListener('markerFound', () => {
                initMarker(i.toString());
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
