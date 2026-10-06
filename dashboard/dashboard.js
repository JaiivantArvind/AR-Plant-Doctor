// ============================================================
// AR Plant Doctor — Dashboard Logic
// Premium Plant Care Intelligence
// ============================================================

// ---- Toast Notification System ----

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- Data Layer ----

async function loadPlants() {
    try {
        const response = await fetch('/api/plants');
        return await response.json();
    } catch (err) {
        console.error('Failed to load plants:', err);
        showToast('Failed to load plant data', 'error');
        return {};
    }
}

async function savePlants(plants) {
    try {
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plants)
        });
        const data = await response.json();
        showToast('Changes saved', 'success');
        return data;
    } catch (err) {
        console.error('Failed to save plants:', err);
        showToast('Save failed. Please try again.', 'error');
    }
}

// ---- Urgency Calculation ----

function getUrgency(plant) {
    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const daysPassed = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.wateringIntervalDays - daysPassed;

    let label, status, statusClass;
    if (daysRemaining < 0) {
        label = `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
        status = 'critical';
        statusClass = 'critical';
    } else if (daysRemaining === 0) {
        label = 'Water today';
        status = 'attention';
        statusClass = 'attention';
    } else if (daysRemaining === 1) {
        label = 'Water tomorrow';
        status = 'attention';
        statusClass = 'attention';
    } else {
        label = `Water in ${daysRemaining} days`;
        status = 'healthy';
        statusClass = 'healthy';
    }

    return { label, status, statusClass, days: daysRemaining };
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

// ---- Marker Print ----

function openMarkerPrintPage(markerId, plantName) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Please allow pop-ups to print markers.', 'error');
        return;
    }

    const idStr = String(markerId);
    const markerImgSrc = `/assets/icons/marker-${idStr}.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Print AR Marker — ${plantName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        body {
            background: #ffffff;
            color: #111;
            font-family: 'Inter', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
        }
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 4px;
            color: #111;
        }
        .header p {
            font-size: 0.9rem;
            color: #666;
            margin: 0;
        }
        .marker-container {
            border: 2px solid #e0e0e0;
            padding: 16px;
            background: #fff;
            border-radius: 8px;
            margin: 16px 0;
        }
        .marker-container img {
            width: 400px;
            height: 400px;
            image-rendering: pixelated;
            display: block;
        }
        .instructions {
            max-width: 420px;
            text-align: center;
            color: #555;
            font-size: 0.85rem;
            line-height: 1.5;
            margin: 16px 0;
        }
        .print-btn {
            background: #111;
            color: #fff;
            border: none;
            padding: 12px 32px;
            font-size: 0.9rem;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 8px;
        }
        .print-btn:hover { opacity: 0.85; }
        @media print {
            .print-btn { display: none !important; }
            body { padding: 0; justify-content: flex-start; }
            .marker-container img { width: 80vw; height: 80vw; max-width: 500px; max-height: 500px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${plantName}</h1>
        <p>AR Marker #${idStr} — AR Plant Doctor</p>
    </div>
    <div class="marker-container">
        <img src="${markerImgSrc}" alt="AR Marker #${idStr}">
    </div>
    <p class="instructions">
        Print this marker and place it near your plant. Point the AR Plant Doctor camera at this marker to instantly see care status and health information.
    </p>
    <button class="print-btn" onclick="window.print()">Print Marker</button>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

// ============================================================
// RENDER: HOME SECTION
// ============================================================

function renderHome(plants) {
    const container = document.getElementById('home-content');
    if (!container) return;

    const entries = Object.entries(plants || {});

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌱</div>
                <h4>Your garden is empty</h4>
                <p>Add your first plant to start tracking watering, care, and AR information.</p>
                <button class="btn btn-md btn-primary" id="empty-add-plant">Add Your First Plant</button>
            </div>`;
        const addBtn = document.getElementById('empty-add-plant');
        if (addBtn) addBtn.addEventListener('click', () => switchSection('plants'));
        return;
    }

    // Calculate stats
    let healthyCount = 0, attentionCount = 0, criticalCount = 0;
    const careItems = [];

    entries.forEach(([id, plant]) => {
        const urgency = getUrgency(plant);
        if (urgency.status === 'healthy') healthyCount++;
        else if (urgency.status === 'attention') attentionCount++;
        else criticalCount++;

        careItems.push({ id, plant, urgency });
    });

    // Sort: critical first, then attention, then healthy
    careItems.sort((a, b) => a.urgency.days - b.urgency.days);

    // Build hero
    const totalPlants = entries.length;
    const gardenStatus = criticalCount > 0 ? 'Some plants need your attention.' :
                         attentionCount > 0 ? 'Your garden is mostly healthy.' :
                         'Your garden is looking great.';

    let html = `
        <div class="dashboard-hero">
            <div class="hero-greeting">${getGreeting()}, Plant Doctor</div>
            <div class="hero-title">${gardenStatus}</div>
            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-value">${totalPlants}</div>
                    <div class="hero-stat-label">Total Plants</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value hero-stat-value--healthy">${healthyCount}</div>
                    <div class="hero-stat-label">Healthy</div>
                </div>`;

    if (attentionCount > 0) {
        html += `
                <div class="hero-stat">
                    <div class="hero-stat-value hero-stat-value--attention">${attentionCount}</div>
                    <div class="hero-stat-label">Needs Care</div>
                </div>`;
    }

    if (criticalCount > 0) {
        html += `
                <div class="hero-stat">
                    <div class="hero-stat-value hero-stat-value--critical">${criticalCount}</div>
                    <div class="hero-stat-label">Overdue</div>
                </div>`;
    }

    html += `
            </div>
        </div>`;

    // AR CTA
    html += `
        <a href="/" class="ar-cta" id="ar-cta-home">
            <div class="ar-cta-icon">📷</div>
            <div class="ar-cta-body">
                <h4>Scan a Plant</h4>
                <p>Point your camera at a marker to see real-time care status</p>
            </div>
            <span class="ar-cta-arrow">→</span>
        </a>`;

    // Today's Care
    const urgentItems = careItems.filter(c => c.urgency.days <= 1);
    const upcomingItems = careItems.filter(c => c.urgency.days > 1);

    if (urgentItems.length > 0) {
        html += `
        <div class="section-label">
            <h3>Needs Attention</h3>
            <span class="section-count">${urgentItems.length} plant${urgentItems.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="care-list">`;

        urgentItems.forEach(({ id, plant, urgency }) => {
            const indicatorClass = urgency.status === 'critical' ? 'care-item-indicator--critical' : 'care-item-indicator--attention';
            const statusColor = urgency.status === 'critical' ? 'var(--status-critical)' : 'var(--status-attention)';
            const btnClass = urgency.status === 'critical' ? 'btn-water--solid' : 'btn-water';

            html += `
            <div class="care-item">
                <div class="care-item-indicator ${indicatorClass}">
                    ${plant.emoji || '🪴'}
                </div>
                <div class="care-item-body">
                    <div class="care-item-name">${plant.name}</div>
                    <div class="care-item-status" style="color: ${statusColor}">
                        <span class="status-dot" style="background: ${statusColor}"></span>
                        ${urgency.label}
                    </div>
                </div>
                <div class="care-item-action">
                    <button class="btn-water ${btnClass}" data-water-id="${id}">Water Now</button>
                </div>
            </div>`;
        });

        html += `</div>`;
    }

    // Upcoming
    if (upcomingItems.length > 0) {
        html += `
        <div class="section-label">
            <h3>Upcoming Care</h3>
            <span class="section-count">${upcomingItems.length} plant${upcomingItems.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="care-list">`;

        upcomingItems.forEach(({ id, plant, urgency }) => {
            html += `
            <div class="care-item">
                <div class="care-item-indicator care-item-indicator--healthy">
                    ${plant.emoji || '🪴'}
                </div>
                <div class="care-item-body">
                    <div class="care-item-name">${plant.name}</div>
                    <div class="care-item-status" style="color: var(--status-healthy)">
                        <span class="status-dot" style="background: var(--status-healthy)"></span>
                        ${urgency.label}
                    </div>
                </div>
                <div class="care-item-action">
                    <button class="btn-water" data-water-id="${id}">Water</button>
                </div>
            </div>`;
        });

        html += `</div>`;
    }

    // Quick collection preview
    html += `
        <div class="section-label" style="margin-top: var(--space-2xl);">
            <h3>Your Collection</h3>
            <button class="btn btn-sm btn-ghost" id="view-all-plants">View All →</button>
        </div>
        <div class="card-grid">`;

    entries.slice(0, 6).forEach(([id, plant]) => {
        const urgency = getUrgency(plant);
        const statusLabel = urgency.status === 'critical' ? 'Overdue' :
                            urgency.status === 'attention' ? 'Needs Care' : 'Healthy';

        html += `
            <div class="plant-card" data-plant-id="${id}">
                <div class="plant-card-visual">${plant.emoji || '🪴'}</div>
                <div class="plant-card-status plant-card-status--${urgency.statusClass}">${statusLabel}</div>
                <div class="plant-card-name">${plant.name}</div>
                <div class="plant-card-scientific">${plant.scientificName || ''}</div>
                <div class="plant-card-meta">
                    <div class="plant-card-meta-item">
                        <span class="meta-icon">💧</span>
                        ${urgency.label}
                    </div>
                    <div class="plant-card-meta-item">
                        <span class="meta-icon">☀️</span>
                        ${plant.sunlight || 'Not specified'}
                    </div>
                </div>
            </div>`;
    });

    html += `</div>`;

    container.innerHTML = html;

    // Wire events
    container.querySelectorAll('[data-water-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const plantId = btn.dataset.waterId;
            const plant = plants[plantId];
            if (!plant) return;

            const today = new Date().toISOString().split('T')[0];
            plant.lastWatered = today;
            if (!Array.isArray(plant.wateringHistory)) plant.wateringHistory = [];
            plant.wateringHistory.push(today);

            await savePlants(plants);
            renderHome(plants);
            renderAnalytics(plants);
        });
    });

    container.querySelectorAll('.plant-card').forEach(card => {
        card.addEventListener('click', () => {
            const plantId = card.dataset.plantId;
            switchSection('plants');
            setTimeout(() => renderDetail(plants, plantId), 50);
        });
    });

    const viewAllBtn = document.getElementById('view-all-plants');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => switchSection('plants'));
    }
}

// ============================================================
// RENDER: PLANT DETAIL VIEW
// ============================================================

function renderDetail(plants, id) {
    const container = document.getElementById('plants-content');
    if (!container) return;

    const plant = plants[id];
    if (!plant) return;

    const urgency = getUrgency(plant);
    const last = new Date(plant.lastWatered);
    const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSince = Math.floor((nowUtc - lastUtc) / (1000 * 60 * 60 * 24));

    const history = Array.isArray(plant.wateringHistory) ? [...plant.wateringHistory].reverse() : [];
    const tip1 = plant.tips && plant.tips[0] ? plant.tips[0] : '';
    const tip2 = plant.tips && plant.tips[1] ? plant.tips[1] : '';

    let historyHtml = '';
    if (history.length > 0) {
        historyHtml = history.map(d => `<tr><td>${d}</td></tr>`).join('');
    } else {
        historyHtml = `<tr><td style="color: var(--text-tertiary)">No watering history recorded yet.</td></tr>`;
    }

    // Care tips
    let tipsHtml = '';
    if (plant.tips && plant.tips.length > 0) {
        tipsHtml = `
            <div class="card" style="margin-bottom: var(--space-xl);">
                <div class="card-header">
                    <h4 class="card-title">Care Tips</h4>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                    ${plant.tips.map(tip => `
                        <div style="display: flex; gap: var(--space-sm); font-size: 13px; color: var(--text-secondary); padding: var(--space-sm) 0;">
                            <span style="color: var(--accent); flex-shrink: 0;">•</span>
                            ${tip}
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    container.innerHTML = `
        <div class="plant-detail">
            <!-- Back nav -->
            <div style="margin-bottom: var(--space-xl);">
                <button class="btn btn-sm btn-secondary" id="detail-back-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Back to Plants
                </button>
            </div>

            <!-- Header -->
            <div class="plant-detail-header">
                <div class="plant-detail-visual">${plant.emoji || '🪴'}</div>
                <div class="plant-detail-info">
                    <h2 class="plant-detail-name">${plant.name}</h2>
                    <div class="plant-detail-scientific">${plant.scientificName || ''}</div>
                    <div class="plant-detail-stats">
                        <div class="detail-stat">
                            <div class="detail-stat-label">Status</div>
                            <div class="detail-stat-value" style="color: var(--status-${urgency.statusClass})">${urgency.label}</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-label">Days Since Watered</div>
                            <div class="detail-stat-value">${daysSince}</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-label">Interval</div>
                            <div class="detail-stat-value">${plant.wateringIntervalDays} days</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-label">Sunlight</div>
                            <div class="detail-stat-value">${plant.sunlight || 'Not specified'}</div>
                        </div>
                    </div>
                </div>
                <div class="plant-detail-actions">
                    <button class="btn btn-md btn-primary" id="detail-water-btn">
                        💧 Water Now
                    </button>
                    <button class="btn btn-md btn-outline-accent" id="detail-print-btn">
                        🖨 Print Marker
                    </button>
                    <a href="/" class="btn btn-md btn-secondary" style="text-decoration:none;">
                        📷 Open in AR
                    </a>
                </div>
            </div>

            ${tipsHtml}

            <!-- Detail grid -->
            <div class="plant-detail-grid">
                <!-- Watering History -->
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Watering History</h4>
                        <span class="card-subtitle">${history.length} record${history.length !== 1 ? 's' : ''}</span>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr><th>Date</th></tr>
                        </thead>
                        <tbody>
                            ${historyHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Edit Form -->
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Edit Plant Details</h4>
                    </div>
                    <form id="detail-edit-form">
                        <div class="form-group">
                            <label class="form-label">Plant Name</label>
                            <input type="text" class="form-input" id="detail-name" value="${plant.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Scientific Name</label>
                            <input type="text" class="form-input" id="detail-scientific" value="${plant.scientificName || ''}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Emoji</label>
                                <input type="text" class="form-input" id="detail-emoji" value="${plant.emoji || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Interval (Days)</label>
                                <input type="number" class="form-input" id="detail-interval" value="${plant.wateringIntervalDays || 7}" required min="1">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sunlight</label>
                            <input type="text" class="form-input" id="detail-sunlight" value="${plant.sunlight || ''}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Care Tip 1</label>
                                <input type="text" class="form-input" id="detail-tip1" value="${tip1}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Care Tip 2</label>
                                <input type="text" class="form-input" id="detail-tip2" value="${tip2}">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-md btn-primary" style="width: 100%;">Save Changes</button>
                    </form>
                </div>
            </div>
        </div>`;

    // Wire events
    document.getElementById('detail-back-btn').addEventListener('click', () => renderPlants(plants));

    document.getElementById('detail-water-btn').addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        plant.lastWatered = today;
        if (!Array.isArray(plant.wateringHistory)) plant.wateringHistory = [];
        plant.wateringHistory.push(today);
        await savePlants(plants);
        renderDetail(plants, id);
        renderHome(plants);
        renderAnalytics(plants);
    });

    document.getElementById('detail-print-btn').addEventListener('click', () => {
        openMarkerPrintPage(id, plant.name);
    });

    document.getElementById('detail-edit-form').addEventListener('submit', async (e) => {
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
        renderDetail(plants, id);
        renderHome(plants);
        renderAnalytics(plants);
    });
}

// ============================================================
// RENDER: PLANTS MANAGEMENT
// ============================================================

function renderPlants(plants) {
    const container = document.getElementById('plants-content');
    if (!container) return;

    const entries = Object.entries(plants || {});

    let html = `
        <div class="section-header">
            <h2>My Plants</h2>
            <p>Manage your plant collection, edit details, and generate AR markers.</p>
        </div>

        <!-- Add Plant Form -->
        <div class="card" style="margin-bottom: var(--space-2xl); max-width: 640px;">
            <div class="card-header">
                <h4 class="card-title" id="form-title">Add New Plant</h4>
            </div>
            <form id="plant-form">
                <input type="hidden" id="edit-id" value="">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Plant Name</label>
                        <input type="text" class="form-input" id="plant-name" required placeholder="e.g. Monstera">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Scientific Name</label>
                        <input type="text" class="form-input" id="plant-scientific" placeholder="e.g. Monstera deliciosa">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Emoji</label>
                        <input type="text" class="form-input" id="plant-emoji" required placeholder="🌿" value="🪴">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Watering Interval (Days)</label>
                        <input type="number" class="form-input" id="plant-interval" required min="1" value="7">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Sunlight Requirements</label>
                    <input type="text" class="form-input" id="plant-sunlight" placeholder="e.g. Bright indirect sunlight">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Care Tip 1</label>
                        <input type="text" class="form-input" id="plant-tip1" placeholder="Care tip">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Care Tip 2</label>
                        <input type="text" class="form-input" id="plant-tip2" placeholder="Care tip">
                    </div>
                </div>
                <button type="submit" class="btn btn-md btn-primary" id="submit-btn">Add Plant & Generate Marker</button>
            </form>
        </div>`;

    // Plant list
    if (entries.length === 0) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">🌿</div>
                <h4>No plants yet</h4>
                <p>Use the form above to add your first plant and start your garden.</p>
            </div>`;
    } else {
        html += `
            <div class="section-label">
                <h3>Your Plants</h3>
                <span class="section-count">${entries.length} plant${entries.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-grid">`;

        entries.forEach(([id, plant]) => {
            const urgency = getUrgency(plant);
            const statusLabel = urgency.status === 'critical' ? 'Overdue' :
                                urgency.status === 'attention' ? 'Needs Care' : 'Healthy';

            html += `
                <div class="plant-card" data-plant-id="${id}" style="cursor: default;">
                    <div class="plant-card-visual">${plant.emoji || '🪴'}</div>
                    <div class="plant-card-status plant-card-status--${urgency.statusClass}">${statusLabel}</div>
                    <div class="plant-card-name" style="cursor: pointer; text-decoration: none;" data-detail-id="${id}">${plant.name}</div>
                    <div class="plant-card-scientific">${plant.scientificName || ''}</div>
                    <div class="plant-card-meta">
                        <div class="plant-card-meta-item">
                            <span class="meta-icon">💧</span>
                            ${urgency.label}
                        </div>
                        <div class="plant-card-meta-item">
                            <span class="meta-icon">☀️</span>
                            ${plant.sunlight || 'Not specified'}
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--space-sm); margin-top: var(--space-lg);">
                        <button class="btn btn-sm btn-secondary" style="flex: 1;" data-detail-id="${id}">View</button>
                        <button class="btn btn-sm btn-outline-warning edit-plant-btn" data-edit-id="${id}">Edit</button>
                        <button class="btn btn-sm btn-destructive delete-plant-btn" data-delete-id="${id}">Delete</button>
                    </div>
                </div>`;
        });

        html += `</div>`;
    }

    container.innerHTML = html;

    // Wire events
    const form = document.getElementById('plant-form');
    if (form) {
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
                showToast(`${name} added! Marker #${targetId} generated — print it from the plant detail page.`, 'success');
            }
        });
    }

    // Detail view links
    container.querySelectorAll('[data-detail-id]').forEach(el => {
        el.addEventListener('click', () => {
            renderDetail(plants, el.dataset.detailId);
        });
    });

    // Edit buttons
    container.querySelectorAll('.edit-plant-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const editId = btn.dataset.editId;
            const plant = plants[editId];
            if (!plant) return;

            document.getElementById('form-title').innerText = `Edit Plant #${editId}`;
            document.getElementById('edit-id').value = editId;
            document.getElementById('plant-name').value = plant.name || '';
            document.getElementById('plant-scientific').value = plant.scientificName || '';
            document.getElementById('plant-emoji').value = plant.emoji || '';
            document.getElementById('plant-interval').value = plant.wateringIntervalDays || 7;
            document.getElementById('plant-sunlight').value = plant.sunlight || '';
            document.getElementById('plant-tip1').value = plant.tips && plant.tips[0] ? plant.tips[0] : '';
            document.getElementById('plant-tip2').value = plant.tips && plant.tips[1] ? plant.tips[1] : '';
            document.getElementById('submit-btn').innerText = 'Save Changes';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Delete buttons
    container.querySelectorAll('.delete-plant-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const deleteId = btn.dataset.deleteId;
            const plant = plants[deleteId];
            if (!plant) return;

            if (confirm(`Are you sure you want to delete ${plant.name}?`)) {
                delete plants[deleteId];
                await savePlants(plants);
                renderPlants(plants);
                renderHome(plants);
                renderAnalytics(plants);
            }
        });
    });
}

// ============================================================
// RENDER: ANALYTICS
// ============================================================

function renderAnalytics(plants) {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    const entries = Object.entries(plants || {});
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let overdueCount = 0;
    let totalWaterings30d = 0;
    let totalWaterings7d = 0;
    let daysWithActivity = new Set();
    const labels = [];
    const counts = [];
    let mostWatered = { name: '—', count: 0 };

    entries.forEach(([id, plant]) => {
        const urgency = getUrgency(plant);
        if (urgency.days <= 0) overdueCount++;

        labels.push(plant.name);
        const history = Array.isArray(plant.wateringHistory) ? plant.wateringHistory : [];
        const recent30 = history.filter(d => new Date(d) >= thirtyDaysAgo);
        const recent7 = history.filter(d => new Date(d) >= sevenDaysAgo);
        counts.push(recent30.length);
        totalWaterings30d += recent30.length;
        totalWaterings7d += recent7.length;

        recent7.forEach(d => daysWithActivity.add(d));
        if (recent30.length > mostWatered.count) {
            mostWatered = { name: plant.name, count: recent30.length };
        }
    });

    const careConsistency = Math.min(7, daysWithActivity.size);

    // Update analytics badge
    const sidebarBadge = document.getElementById('analytics-badge');
    if (sidebarBadge) {
        if (overdueCount > 0) {
            sidebarBadge.style.display = 'inline';
            sidebarBadge.innerText = overdueCount;
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    let html = `
        <div class="section-header">
            <h2>Care Analytics</h2>
            <p>Track your plant care activity and watering consistency.</p>
        </div>

        <!-- Metrics -->
        <div class="metric-row">
            <div class="metric-card">
                <div class="metric-card-label">Total Plants</div>
                <div class="metric-card-value">${entries.length}</div>
            </div>
            <div class="metric-card">
                <div class="metric-card-label">Waterings (30d)</div>
                <div class="metric-card-value metric-card-value--accent">${totalWaterings30d}</div>
            </div>
            <div class="metric-card">
                <div class="metric-card-label">Overdue</div>
                <div class="metric-card-value ${overdueCount > 0 ? 'metric-card-value--danger' : ''}">${overdueCount}</div>
            </div>
            <div class="metric-card">
                <div class="metric-card-label">7-Day Streak</div>
                <div class="metric-card-value">${careConsistency}/7</div>
            </div>
        </div>

        <!-- Chart -->
        <div class="chart-card" style="margin-bottom: var(--space-xl);">
            <div class="card-header">
                <h4 class="card-title">Watering Activity — Last 30 Days</h4>
            </div>
            <div class="chart-container">
                <canvas id="watering-chart"></canvas>
            </div>
        </div>

        <!-- Additional insights -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg);">
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Most Active Plant</h4>
                </div>
                <div style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${mostWatered.name}</div>
                <div style="font-size: 13px; color: var(--text-tertiary);">${mostWatered.count} watering${mostWatered.count !== 1 ? 's' : ''} in 30 days</div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Plants Needing Attention</h4>
                </div>
                <div style="font-size: 1.5rem; font-weight: 600; color: ${overdueCount > 0 ? 'var(--danger)' : 'var(--accent)'}; margin-bottom: 4px;">
                    ${overdueCount}
                </div>
                <div style="font-size: 13px; color: var(--text-tertiary);">
                    ${overdueCount > 0 ? 'Plants requiring immediate watering' : 'All plants are on schedule'}
                </div>
            </div>
        </div>`;

    container.innerHTML = html;

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
                    label: 'Waterings (30 days)',
                    data: counts,
                    backgroundColor: 'rgba(15, 198, 27, 0.6)',
                    borderColor: 'rgba(15, 198, 27, 0.8)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.65
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#162318',
                        titleColor: '#F6F8F6',
                        bodyColor: '#A5B3AF',
                        borderColor: '#263827',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        titleFont: { family: 'Inter', size: 13, weight: '500' },
                        bodyFont: { family: 'Inter', size: 12 }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#6B7E74',
                            font: { family: 'Inter', size: 11 },
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(30, 46, 31, 0.5)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#A5B3AF',
                            font: { family: 'Inter', size: 12 }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// ============================================================
// RENDER: SETTINGS
// ============================================================

function renderSettings(plants) {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    container.innerHTML = `
        <div class="section-header">
            <h2>Settings</h2>
            <p>Configure notifications, markers, and application preferences.</p>
        </div>

        <div class="settings-card">
            <h3>Browser Notifications</h3>
            <p>Receive alerts when any plant is due or overdue for watering.</p>
            <div class="settings-row">
                <div class="settings-status">
                    <strong>Permission Status:</strong>
                    <span id="notification-status" style="text-transform: capitalize; margin-left: 6px; color: var(--botanical);">${currentPermission}</span>
                </div>
                <button class="btn btn-md btn-primary" id="enable-notifications-btn">Enable Notifications</button>
            </div>
        </div>

        <div class="settings-card">
            <h3>Marker Generation</h3>
            <p>Regenerate custom AR pattern markers for all plants. This is useful after adding new plants or if markers become corrupted.</p>
            <button class="btn btn-md btn-outline-accent" id="generate-all-markers-btn">
                Generate All Markers
            </button>
        </div>

        <div class="settings-card">
            <h3>AR Camera</h3>
            <p>Open the AR scanner to detect plant markers in real-time.</p>
            <a href="/" class="btn btn-md btn-secondary" style="text-decoration:none;">Open AR Scanner</a>
        </div>`;

    // Wire events
    const notifBtn = document.getElementById('enable-notifications-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', async () => {
            if (typeof Notification !== 'undefined') {
                const permission = await Notification.requestPermission();
                const statusEl = document.getElementById('notification-status');
                if (statusEl) statusEl.innerText = permission;
                if (permission === 'granted') {
                    showToast('Notifications enabled successfully!', 'success');
                }
            } else {
                showToast('Notifications are not supported in this browser.', 'error');
            }
        });
    }

    const genBtn = document.getElementById('generate-all-markers-btn');
    if (genBtn) {
        genBtn.addEventListener('click', async () => {
            genBtn.disabled = true;
            genBtn.innerText = 'Generating...';
            const keys = Object.keys(plants);
            for (const key of keys) {
                await fetch('/api/generate-marker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plantId: key, plantName: plants[key].name })
                });
            }
            genBtn.disabled = false;
            genBtn.innerText = 'Generate All Markers';
            showToast(`${keys.length} markers generated successfully`, 'success');
        });
    }
}

// ============================================================
// NAVIGATION SYSTEM
// ============================================================

function switchSection(targetSection) {
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(sec => sec.style.display = 'none');

    const target = document.getElementById(`${targetSection}-section`);
    if (target) target.style.display = 'block';

    // Update sidebar nav
    document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === targetSection);
    });

    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item[data-section]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === targetSection);
    });
}

// ============================================================
// SERVICE WORKER & CARE CHECKS
// ============================================================

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

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/dashboard/sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    }

    // Navigation — Sidebar
    document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // Navigation — Bottom nav
    document.querySelectorAll('.bottom-nav-item[data-section]').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // Load data and render
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
