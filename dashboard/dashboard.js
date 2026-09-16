// Dashboard Logic - AR Plant Doctor

/**
 * Displays a fixed bottom-right toast message that auto-dismisses after 3 seconds.
 * @param {string} message - Toast message text.
 * @param {string} type - Toast type ('success' or 'error').
 */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const bgColor = type === 'error' ? '#E63946' : '#52B788';
    toast.style.cssText = `background-color: ${bgColor}; color: #1a1a2e; font-weight: bold; padding: 0.75rem 1.25rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s ease;`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Displays spinner loading indicator in section card grids.
 */
function showSpinners() {
    const grids = document.querySelectorAll('.dashboard-section .card-grid');
    grids.forEach(grid => {
        grid.innerHTML = '<div class="spinner"></div>';
    });
}

/**
 * Fetches plant dataset from backend GET /api/plants endpoint.
 * @returns {Promise<Object>} Object containing plant entries keyed by ID.
 */
async function loadPlants() {
    try {
        const response = await fetch('/api/plants');
        return await response.json();
    } catch (err) {
        console.error('Failed to load plants:', err);
        showToast('Failed to load plants', 'error');
        return {};
    }
}

/**
 * Saves plant dataset to backend POST /api/plants endpoint.
 * @param {Object} plants - Updated plants object.
 * @returns {Promise<Object>} Server response.
 */
async function savePlants(plants) {
    try {
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plants)
        });
        const data = await response.json();
        showToast('Saved!', 'success');
        return data;
    } catch (err) {
        console.error('Failed to save plants:', err);
        showToast('Save failed', 'error');
    }
}

/**
 * Opens a new tab displaying the generated marker image for printing.
 * @param {string|number} markerId - Marker ID.
 * @param {string} plantName - Name of the plant.
 */
function openMarkerPrintPage(markerId, plantName) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow pop-ups to view and print the marker.');
        return;
    }

    const idStr = String(markerId);
    const markerImgSrc = `/assets/icons/marker-${idStr}.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Print AR Marker - ${plantName}</title>
    <style>
        body {
            background-color: #ffffff;
            color: #1a1a2e;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        h1 {
            color: #1B4332;
            margin-bottom: 0.25rem;
            font-size: 2rem;
        }
        p.sub {
            color: #1B4332;
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
            font-weight: bold;
        }
        .marker-container {
            margin: 1rem 0;
            border: 2px solid #ccc;
            padding: 10px;
            background: #fff;
        }
        .marker-container img {
            width: 400px;
            height: 400px;
            image-rendering: pixelated;
        }
        p.instructions {
            max-width: 450px;
            text-align: center;
            color: #333;
            font-size: 0.95rem;
            line-height: 1.4;
            margin-top: 1.5rem;
        }
        .print-btn {
            background-color: #1B4332;
            color: #ffffff;
            border: none;
            padding: 0.75rem 1.75rem;
            font-size: 1rem;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 1rem;
        }
        @media print {
            .print-btn {
                display: none !important;
            }
            body {
                padding: 0;
                justify-content: flex-start;
            }
            .marker-container img {
                width: 80vw;
                height: 80vw;
                max-width: 500px;
                max-height: 500px;
            }
        }
    </style>
</head>
<body>
    <h1>${plantName}</h1>
    <p class="sub">AR Marker #${idStr}</p>
    <div class="marker-container">
        <img src="${markerImgSrc}" alt="AR Marker #${idStr}">
    </div>
    <p class="instructions">
        Print this page and attach to your plant pot. Point the AR Plant Doctor camera at this pattern marker.
    </p>
    <button class="print-btn" onclick="window.print()">Save / Print</button>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

/**
 * Calculates watering urgency and remaining days for a plant.
 * @param {Object} plant - Plant object.
 * @returns {Object} Object containing label, color, and remaining days.
 */
function getUrgency(plant) {
    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.wateringIntervalDays - daysPassed;

    let label, color;
    if (daysRemaining < 0) {
        label = `⚠ Overdue by ${Math.abs(daysRemaining)} days`;
        color = '#E63946';
    } else if (daysRemaining <= 1) {
        label = '💧 Water today!';
        color = '#FFB703';
    } else {
        label = `Water in ${daysRemaining} days`;
        color = '#52B788';
    }

    return { label, color, days: daysRemaining };
}

/**
 * Renders plant cards inside the home section card grid.
 * @param {Object} plants - Plant dataset.
 */
function renderHome(plants) {
    const grid = document.querySelector('#home-section .card-grid');
    if (!grid) return;

    if (!plants || Object.keys(plants).length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #a0aec0; font-size: 1.2rem;">No plants yet — add one in My Plants 🌿</div>';
        return;
    }

    grid.innerHTML = '';

    Object.entries(plants).forEach(([id, plant]) => {
        const urgency = getUrgency(plant);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${plant.emoji || '🪴'}</div>
            <h3 style="margin-bottom: 0.25rem; font-size: 1.25rem;">${plant.name}</h3>
            <p style="color: #b7e4c7; font-size: 0.9rem; margin-bottom: 0.75rem;">${plant.scientificName || ''}</p>
            <div style="margin-bottom: 1rem;">
                <span class="urgency-badge" style="background-color: ${urgency.color}; color: #1a1a2e; padding: 0.25rem 0.65rem; border-radius: 9999px; font-weight: bold; font-size: 0.85rem; display: inline-block;">
                    ${urgency.label}
                </span>
            </div>
            <p style="font-size: 0.85rem; color: #a0aec0; margin-bottom: 1rem;">
                Last Watered: ${plant.lastWatered} (${plant.wateringIntervalDays}d interval)
            </p>
            <button class="water-btn" data-id="${id}" style="background-color: #52B788; color: #1a1a2e; border: none; padding: 0.55rem 1rem; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%;">
                🌿 Mark Watered
            </button>
        `;

        const btn = card.querySelector('.water-btn');
        btn.addEventListener('click', async () => {
            const today = new Date().toISOString().split('T')[0];
            plant.lastWatered = today;
            if (!Array.isArray(plant.wateringHistory)) {
                plant.wateringHistory = [];
            }
            plant.wateringHistory.push(today);
            await savePlants(plants);
            renderHome(plants);
            renderPlants(plants);
            renderAnalytics(plants);
        });

        grid.appendChild(card);
    });
}

/**
 * Renders detailed view for a selected plant.
 * @param {Object} plants - Plant dataset.
 * @param {string} id - Selected plant ID.
 */
function renderDetail(plants, id) {
    const container = document.getElementById('plants-section');
    if (!container) return;

    const plant = plants[id];
    if (!plant) return;

    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSince = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));

    const history = Array.isArray(plant.wateringHistory) ? [...plant.wateringHistory].reverse() : [];
    const historyRows = history.length > 0 
        ? history.map(d => `<tr><td style="padding: 0.5rem; border-bottom: 1px solid #0f3460;">${d}</td></tr>`).join('')
        : '<tr><td style="padding: 0.5rem; color: #a0aec0;">No watering history recorded.</td></tr>';

    const tip1 = plant.tips && plant.tips[0] ? plant.tips[0] : '';
    const tip2 = plant.tips && plant.tips[1] ? plant.tips[1] : '';

    container.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <button class="back-btn" style="background: #16213e; color: #b7e4c7; border: 1px solid #0f3460; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 1rem;">
                ← Back
            </button>
            <button class="print-marker-btn" style="background: #1B4332; color: #ffffff; border: 1px solid #52B788; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 1rem; margin-left: 0.5rem;">
                🖨 View & Print Marker
            </button>
            <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">${plant.emoji || '🪴'} ${plant.name}</h2>
            <p style="color: #b7e4c7; font-size: 1rem; margin-bottom: 1rem;">${plant.scientificName || ''}</p>
            <p style="font-size: 1.1rem; color: #FFD166; font-weight: bold; margin-bottom: 1.5rem;">
                Days since last watered: ${daysSince}
            </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div class="card">
                <h3 style="margin-bottom: 1rem; border-bottom: 1px solid #0f3460; padding-bottom: 0.5rem;">Watering History</h3>
                <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="padding: 0.5rem; border-bottom: 2px solid #0f3460; color: #b7e4c7;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyRows}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 1rem; border-bottom: 1px solid #0f3460; padding-bottom: 0.5rem;">Edit Plant Details</h3>
                <form id="detail-edit-form">
                    <div style="margin-bottom: 0.75rem;">
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Name</label>
                        <input type="text" id="detail-name" value="${plant.name || ''}" required style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Scientific Name</label>
                        <input type="text" id="detail-scientific" value="${plant.scientificName || ''}" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Emoji</label>
                            <input type="text" id="detail-emoji" value="${plant.emoji || ''}" required style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Interval (Days)</label>
                            <input type="number" id="detail-interval" value="${plant.wateringIntervalDays || 7}" required min="1" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                        </div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Sunlight</label>
                        <input type="text" id="detail-sunlight" value="${plant.sunlight || ''}" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Tip 1</label>
                        <input type="text" id="detail-tip1" value="${tip1}" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Tip 2</label>
                        <input type="text" id="detail-tip2" value="${tip2}" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <button type="submit" style="background-color: #52B788; color: #1a1a2e; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%;">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    `;

    container.querySelector('.back-btn').addEventListener('click', () => {
        renderPlants(plants);
    });

    const printBtn = container.querySelector('.print-marker-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            openMarkerPrintPage(id, plant.name);
        });
    }

    container.querySelector('#detail-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        plant.name = document.getElementById('detail-name').value.trim();
        plant.scientificName = document.getElementById('detail-scientific').value.trim();
        plant.emoji = document.getElementById('detail-emoji').value.trim();
        plant.wateringIntervalDays = parseInt(document.getElementById('detail-interval').value, 10) || 7;
        plant.sunlight = document.getElementById('detail-sunlight').value.trim();
        plant.tips = [
            document.getElementById('detail-tip1').value.trim(),
            document.getElementById('detail-tip2').value.trim()
        ].filter(Boolean);

        await savePlants(plants);
        renderPlants(plants);
        renderHome(plants);
        renderAnalytics(plants);
    });
}

/**
 * Renders the plant management view in #plants-section, including an Add Plant form
 * and a list of existing plants with Edit and Delete options.
 * @param {Object} plants - Plant dataset.
 */
function renderPlants(plants) {
    const container = document.getElementById('plants-section');
    if (!container) return;

    container.innerHTML = `
        <h2>Plant Management</h2>
        
        <div class="card" style="margin: 1.5rem 0; max-width: 600px;">
            <h3 id="form-title" style="margin-bottom: 1rem;">Add Plant</h3>
            <form id="plant-form">
                <input type="hidden" id="edit-id" value="">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Plant Name</label>
                        <input type="text" id="plant-name" required placeholder="e.g. Monstera" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Scientific Name</label>
                        <input type="text" id="plant-scientific" placeholder="e.g. Monstera deliciosa" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Emoji</label>
                        <input type="text" id="plant-emoji" required placeholder="🌿" value="🪴" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Watering Interval (Days)</label>
                        <input type="number" id="plant-interval" required min="1" value="7" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Sunlight Requirements</label>
                    <input type="text" id="plant-sunlight" placeholder="e.g. Bright indirect sunlight" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Tip 1</label>
                        <input type="text" id="plant-tip1" placeholder="Care tip 1" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Tip 2</label>
                        <input type="text" id="plant-tip2" placeholder="Care tip 2" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #fff;">
                    </div>
                </div>
                <button type="submit" id="submit-btn" style="background-color: #52B788; color: #1a1a2e; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    Save Plant
                </button>
            </form>
        </div>

        <h3 style="margin: 1.5rem 0 1rem 0;">Existing Plants</h3>
        <div class="card-grid" id="plants-list-grid"></div>
    `;

    const form = document.getElementById('plant-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-id').value;
        const name = document.getElementById('plant-name').value.trim();
        const scientificName = document.getElementById('plant-scientific').value.trim();
        const emoji = document.getElementById('plant-emoji').value.trim();
        const wateringIntervalDays = parseInt(document.getElementById('plant-interval').value, 10) || 7;
        const sunlight = document.getElementById('plant-sunlight').value.trim();
        const tip1 = document.getElementById('plant-tip1').value.trim();
        const tip2 = document.getElementById('plant-tip2').value.trim();
        const tips = [tip1, tip2].filter(Boolean);

        let targetId = editId;
        if (!targetId) {
            const numericKeys = Object.keys(plants).map(Number).filter(n => !isNaN(n));
            const maxKey = numericKeys.length > 0 ? Math.max(...numericKeys) : 0;
            targetId = String(maxKey + 1);
        }

        const existingHistory = (plants[targetId] && Array.isArray(plants[targetId].wateringHistory)) ? plants[targetId].wateringHistory : [];
        const todayStr = new Date().toISOString().split('T')[0];

        plants[targetId] = {
            name,
            scientificName,
            emoji,
            wateringIntervalDays,
            sunlight,
            tips,
            lastWatered: plants[targetId] ? plants[targetId].lastWatered : todayStr,
            wateringHistory: existingHistory
        };

        const isNew = !editId;

        await savePlants(plants);
        renderPlants(plants);
        renderHome(plants);
        renderAnalytics(plants);

        if (isNew) {
            try {
                await fetch('/api/generate-marker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plantId: targetId, plantName: name })
                });
            } catch (err) {
                console.error('Error auto-generating marker:', err);
            }
            showToast(`Plant added! Marker #${targetId} auto-generated — print it from the plant detail page.`, 'success');
        }
    });

    const listGrid = document.getElementById('plants-list-grid');
    Object.entries(plants).forEach(([id, plant]) => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${plant.emoji || '🪴'}</div>
            <h3 class="plant-name-link" style="font-size: 1.1rem; margin-bottom: 0.25rem; cursor: pointer; text-decoration: underline; color: #52B788;">[${id}] ${plant.name}</h3>
            <p style="color: #b7e4c7; font-size: 0.85rem; margin-bottom: 0.5rem;">${plant.scientificName || ''}</p>
            <p style="font-size: 0.85rem; color: #a0aec0; margin-bottom: 0.5rem;">Interval: ${plant.wateringIntervalDays} days</p>
            <p style="font-size: 0.85rem; color: #a0aec0; margin-bottom: 1rem;">Sunlight: ${plant.sunlight || 'N/A'}</p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="edit-btn" style="flex: 1; background: #FFB703; color: #1a1a2e; border: none; padding: 0.4rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Edit</button>
                <button class="delete-btn" style="flex: 1; background: #E63946; color: #fff; border: none; padding: 0.4rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Delete</button>
            </div>
        `;

        item.querySelector('.plant-name-link').addEventListener('click', () => {
            renderDetail(plants, id);
        });

        item.querySelector('.edit-btn').addEventListener('click', () => {
            document.getElementById('form-title').innerText = `Edit Plant #${id}`;
            document.getElementById('edit-id').value = id;
            document.getElementById('plant-name').value = plant.name || '';
            document.getElementById('plant-scientific').value = plant.scientificName || '';
            document.getElementById('plant-emoji').value = plant.emoji || '';
            document.getElementById('plant-interval').value = plant.wateringIntervalDays || 7;
            document.getElementById('plant-sunlight').value = plant.sunlight || '';
            document.getElementById('plant-tip1').value = plant.tips && plant.tips[0] ? plant.tips[0] : '';
            document.getElementById('plant-tip2').value = plant.tips && plant.tips[1] ? plant.tips[1] : '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        item.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete ${plant.name}?`)) {
                delete plants[id];
                await savePlants(plants);
                renderPlants(plants);
                renderHome(plants);
                renderAnalytics(plants);
            }
        });

        listGrid.appendChild(item);
    });
}

/**
 * Renders care analytics including a Chart.js horizontal bar chart of 30-day watering counts
 * and overdue plant badge count.
 * @param {Object} plants - Plant dataset.
 */
function renderAnalytics(plants) {
    const container = document.getElementById('analytics-section');
    if (!container) return;

    let overdueCount = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const labels = [];
    const counts = [];

    Object.values(plants).forEach(plant => {
        labels.push(plant.name);
        const history = Array.isArray(plant.wateringHistory) ? plant.wateringHistory : [];
        const recentCount = history.filter(d => new Date(d) >= thirtyDaysAgo).length;
        counts.push(recentCount);

        const urgency = getUrgency(plant);
        if (urgency.days <= 0) {
            overdueCount++;
        }
    });

    container.innerHTML = `
        <h2>Care Analytics</h2>
        <div class="card" style="margin-top: 1.5rem; padding: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: #b7e4c7;">Watering Activity (Last 30 Days)</h3>
            <div style="position: relative; width: 100%; min-height: 300px;">
                <canvas id="watering-chart"></canvas>
            </div>
        </div>

        <div class="card" style="margin-top: 1.5rem; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <h3 style="margin-bottom: 0.25rem;">Overdue Plants</h3>
                <p style="color: #a0aec0; font-size: 0.9rem;">Plants requiring immediate watering attention</p>
            </div>
            <div style="background-color: #E63946; color: #ffffff; font-size: 1.5rem; font-weight: bold; padding: 0.5rem 1.25rem; border-radius: 9999px;">
                ${overdueCount} Overdue
            </div>
        </div>
    `;

    // Update Analytics nav badge
    const analyticsBtn = document.querySelector('.nav-btn[data-section="analytics"]');
    if (analyticsBtn) {
        if (overdueCount > 0) {
            analyticsBtn.innerHTML = `Analytics <span style="background-color: #E63946; color: white; border-radius: 9999px; padding: 0.15rem 0.45rem; font-size: 0.75rem; margin-left: 0.25rem;">${overdueCount}</span>`;
        } else {
            analyticsBtn.innerText = 'Analytics';
        }
    }

    // Render Chart.js
    const canvas = document.getElementById('watering-chart');
    if (canvas && typeof Chart !== 'undefined') {
        if (window.analyticsChartInstance) {
            window.analyticsChartInstance.destroy();
        }
        window.analyticsChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Waterings in Last 30 Days',
                    data: counts,
                    backgroundColor: '#52B788',
                    borderColor: '#52B788',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#b7e4c7', precision: 0 },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#ffffff' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

/**
 * Renders the Settings view in #settings-section.
 * @param {Object} plants - Plant dataset.
 */
function renderSettings(plants) {
    const container = document.getElementById('settings-section');
    if (!container) return;

    const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    container.innerHTML = `
        <h2>Settings</h2>
        <div class="card" style="margin-top: 1.5rem; max-width: 600px; padding: 1.5rem;">
            <h3 style="margin-bottom: 0.5rem;">Notifications</h3>
            <p style="color: #a0aec0; font-size: 0.9rem; margin-bottom: 1.25rem;">
                Receive browser alerts when any plant is due or overdue for watering.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <span style="font-weight: bold;">Permission Status:</span>
                    <span id="notification-status" style="margin-left: 0.5rem; color: #b7e4c7; text-transform: capitalize;">
                        ${currentPermission}
                    </span>
                </div>
                <button id="enable-notifications-btn" style="background-color: #52B788; color: #1a1a2e; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    Enable Notifications
                </button>
            </div>

            <div style="margin-top: 1.5rem; border-top: 1px solid #0f3460; padding-top: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem;">Marker Storage</h3>
                <p style="color: #a0aec0; font-size: 0.9rem; margin-bottom: 1rem;">
                    Regenerate custom AR pattern markers for all plants.
                </p>
                <button id="generate-all-markers-btn" style="background-color: #1B4332; color: #ffffff; border: 1px solid #52B788; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    Generate All Markers
                </button>
            </div>
        </div>
    `;

    const btn = document.getElementById('enable-notifications-btn');
    if (btn) {
        btn.addEventListener('click', async () => {
            if (typeof Notification !== 'undefined') {
                const permission = await Notification.requestPermission();
                const statusEl = document.getElementById('notification-status');
                if (statusEl) statusEl.innerText = permission;
                if (permission === 'granted') {
                    alert('Notifications enabled successfully!');
                }
            } else {
                alert('Notifications API is not supported in this browser.');
            }
        });
    }

    const genBtn = document.getElementById('generate-all-markers-btn');
    if (genBtn) {
        genBtn.addEventListener('click', async () => {
            const keys = Object.keys(plants);
            for (const key of keys) {
                await fetch('/api/generate-marker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plantId: key, plantName: plants[key].name })
                });
            }
            showToast("All markers generated and saved", "success");
        });
    }
}

/**
 * Periodically sends CHECK_PLANTS message to service worker.
 * @param {Object} plants - Plant dataset.
 */
function scheduleCheck(plants) {
    const sendCheck = () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_PLANTS',
                plants: plants
            });
        }
    };

    sendCheck();
    setInterval(sendCheck, 60000);
}

// Navigation and initialization listener
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/dashboard/sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    }

    // Navigation section switching
    const navButtons = document.querySelectorAll('.nav-btn[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSectionId = `${btn.dataset.section}-section`;
            sections.forEach(sec => sec.style.display = 'none');
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) targetSection.style.display = 'block';

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Show loading spinners initially
    showSpinners();

    // Initial load and render
    loadPlants().then(plants => {
        if (plants) {
            renderHome(plants);
            renderPlants(plants);
            renderAnalytics(plants);
            renderSettings(plants);
            scheduleCheck(plants);
        }
    });
});
