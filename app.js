// ============================================================
// AR Plant Doctor — Responsive Plant Display
// ============================================================

'use strict';

let plantsCache = null;

// ── Palette ──────────────────────────────────────────────────
const C = {
    stem: '#2d5a1b',
    leafDark: '#1e4a0f',
    leafMid: '#2d6b18',
    leafLight: '#3d8a22',
    soil: '#3d2b1a',
    pot: '#6b4423',
    potRim: '#7d5530',
    cardBg: '#07110a',
    headerBg: '#0b1a0d',
    footerBg: '#080f09',
    divider: '#18271a',
    accentOk: '#3DDC6B',
    accentWarn: '#D4A843',
    accentCrit: '#E8735A',
    nameText: '#E8F0E9',
    sciText: '#5a7a5c',
    waterOk: '#3DDC6B',
    waterWarn: '#D4A843',
    waterCrit: '#E8735A',
    sunText: '#8FA892',
    tipText: '#8CAE8E',
    footText: '#5a7a5c'
};

// ── Watering Logic ───────────────────────────────────────────
function waterStatus(lastWatered, intervalDays) {
    const last = new Date(lastWatered);
    const lu = Date.UTC(
        last.getFullYear(),
        last.getMonth(),
        last.getDate()
    );

    const now = new Date();
    const nu = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const remaining =
        intervalDays - Math.floor((nu - lu) / 86400000);

    if (remaining < 0) {
        return {
            label: `Overdue by ${Math.abs(remaining)}d`,
            urgency: 'crit'
        };
    }

    if (remaining === 0) {
        return { label: 'Water today', urgency: 'warn' };
    }

    if (remaining <= 2) {
        return {
            label: `Water in ${remaining}d`,
            urgency: 'warn'
        };
    }

    return {
        label: `Water in ${remaining}d`,
        urgency: 'ok'
    };
}

function accentCol(urgency) {
    return urgency === 'crit'
        ? C.accentCrit
        : urgency === 'warn'
            ? C.accentWarn
            : C.accentOk;
}

function waterCol(urgency) {
    return urgency === 'crit'
        ? C.waterCrit
        : urgency === 'warn'
            ? C.waterWarn
            : C.waterOk;
}

function trimTip(text, max = 55) {
    if (!text || text.length <= max) {
        return text || '';
    }

    return text.slice(0, max).replace(/\s\S*$/, '') + '\u2026';
}

// ── A-Frame Helpers ──────────────────────────────────────────
function el(tag, attrs = {}) {
    const element = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
    });

    return element;
}

function plane(position, width, height, color, opacity = 1, extra = {}) {
    return el('a-plane', {
        position,
        width,
        height,
        color,
        opacity,
        side: 'double',
        shader: 'flat',
        ...extra
    });
}

function txt(
    position,
    value,
    color,
    wrapCount,
    width,
    anchor = 'center',
    align = 'center',
    baseline = 'center'
) {
    const element = document.createElement('a-entity');

    element.setAttribute('position', position);

    element.setAttribute('text', [
        `value: ${value}`,
        `color: ${color}`,
        `wrapCount: ${wrapCount}`,
        `width: ${width}`,
        `anchor: ${anchor}`,
        `align: ${align}`,
        `baseline: ${baseline}`,
        'font: roboto'
    ].join('; '));

    return element;
}

// ============================================================
// BILLBOARD COMPONENT
// Original camera-facing orientation logic preserved.
// ============================================================

if (
    typeof AFRAME !== 'undefined' &&
    !AFRAME.components['billboard']
) {
    AFRAME.registerComponent('billboard', {
        init: function () {
            this.parentQuat = new THREE.Quaternion();
            this.targetQuat = new THREE.Quaternion();
            this.tiltQuat = new THREE.Quaternion();
            this.deviceAngle = 0;

            if (typeof window !== 'undefined') {
                window.addEventListener(
                    'deviceorientation',
                    (event) => {
                        if (
                            !event ||
                            typeof event.gamma !== 'number'
                        ) {
                            return;
                        }

                        if (
                            window.innerWidth <
                            window.innerHeight
                        ) {
                            this.deviceAngle =
                                event.gamma > 40
                                    ? 90
                                    : event.gamma < -40
                                        ? -90
                                        : 0;
                        } else {
                            this.deviceAngle = 0;
                        }
                    },
                    { passive: true }
                );
            }
        },

        tick: function () {
            if (
                !this.el.object3D ||
                !this.el.object3D.parent
            ) {
                return;
            }

            const scene = this.el.sceneEl;

            if (!scene || !scene.camera) {
                return;
            }

            const camera = scene.camera;

            camera.getWorldQuaternion(this.targetQuat);

            let angle = 0;

            if (window.innerWidth > window.innerHeight) {
                const screenAngle =
                    window.screen?.orientation?.angle ??
                    (
                        typeof window.orientation === 'number'
                            ? window.orientation
                            : 0
                    );

                angle =
                    screenAngle === 270
                        ? -90
                        : screenAngle === 90
                            ? 90
                            : 0;
            } else if (this.deviceAngle !== 0) {
                angle = this.deviceAngle;
            }

            if (angle !== 0) {
                this.tiltQuat.setFromAxisAngle(
                    new THREE.Vector3(0, 0, 1),
                    (angle * Math.PI) / 180
                );

                this.targetQuat.multiply(this.tiltQuat);
            }

            this.el.object3D.parent.getWorldQuaternion(
                this.parentQuat
            );

            this.el.object3D.quaternion
                .copy(this.parentQuat)
                .invert()
                .multiply(this.targetQuat);
        }
    });
}

// ============================================================
// RESPONSIVE PLANT COMPONENT
// Automatically adapts model size to viewport orientation.
// Does not modify the billboard rotation or display axis.
// ============================================================

if (
    typeof AFRAME !== 'undefined' &&
    !AFRAME.components['responsive-plant']
) {
    AFRAME.registerComponent('responsive-plant', {
        init: function () {
            this.targetScale = 0.88;

            this.onViewportChange =
                this.onViewportChange.bind(this);

            this.onViewportChange();

            window.addEventListener(
                'resize',
                this.onViewportChange,
                { passive: true }
            );

            window.addEventListener(
                'orientationchange',
                this.onViewportChange,
                { passive: true }
            );
        },

        onViewportChange: function () {
            const portrait = window.matchMedia
                ? window.matchMedia('(orientation: portrait)').matches
                : window.innerHeight >= window.innerWidth;

            // Uniform scaling preserves the shape of the plant.
            this.targetScale = portrait ? 0.88 : 0.76;
        },

        tick: function () {
            const scale = this.el.object3D.scale;

            // Smooth transition instead of an abrupt size change.
            const next =
                scale.x + (this.targetScale - scale.x) * 0.12;

            scale.set(next, next, next);
        },

        remove: function () {
            window.removeEventListener(
                'resize',
                this.onViewportChange
            );

            window.removeEventListener(
                'orientationchange',
                this.onViewportChange
            );
        }
    });
}

// ============================================================
// 3D PLANT
// Pot → Stem → Panel → Foliage → Water Droplet
// ============================================================

function buildPlant(plant, urgency) {
    const g = document.createElement('a-entity');

    // Preserve marker-relative position.
    g.setAttribute('position', '0 -0.22 0');

    // Responsive scaling only; billboard remains untouched.
    g.setAttribute('responsive-plant', '');

    // ── Pot ──────────────────────────────────────────────────
    g.appendChild(el('a-cylinder', {
        position: '0 0.13 0',
        radius: '0.30',
        height: '0.26',
        color: C.pot,
        shader: 'flat'
    }));

    g.appendChild(el('a-torus', {
        position: '0 0.26 0',
        rotation: '90 0 0',
        radius: '0.30',
        'radius-tubular': '0.025',
        color: C.potRim,
        shader: 'flat'
    }));

    g.appendChild(el('a-cylinder', {
        position: '0 0.265 0',
        radius: '0.275',
        height: '0.025',
        color: C.soil,
        shader: 'flat'
    }));

    // ── Continuous Stem ──────────────────────────────────────
    // Runs behind the information card.
    g.appendChild(el('a-cylinder', {
        position: '0 0.91 -0.20',
        radius: '0.022',
        height: '1.30',
        color: C.stem,
        shader: 'flat'
    }));

    // ── Leaf Builder ─────────────────────────────────────────
    function addLeaf({
        position,
        rotation,
        scale,
        color,
        delay = 0
    }) {
        const leafGroup = document.createElement('a-entity');

        leafGroup.setAttribute('position', position);
        leafGroup.setAttribute('rotation', rotation);

        // Broad, flattened leaf.
        leafGroup.appendChild(el('a-sphere', {
            position: '0 0 0',
            scale,
            color,
            shader: 'flat',
            opacity: '0.98',
            side: 'double'
        }));

        // Subtle central vein.
        const vein = el('a-cylinder', {
            position: '0 0 0.015',
            radius: '0.005',
            height: '0.72',
            color: C.leafDark,
            shader: 'flat',
            opacity: '0.55'
        });

        vein.setAttribute('rotation', '0 0 90');

        leafGroup.appendChild(vein);

        // Gentle alternating leaf sway.
        const rotationValues = rotation
            .trim()
            .split(/\s+/)
            .map(Number);

        const endRotation = [
            rotationValues[0],
            rotationValues[1],
            rotationValues[2] +
            (rotationValues[2] < 0 ? 3 : -3)
        ].join(' ');

        leafGroup.setAttribute('animation', [
            'property: rotation',
            `from: ${rotation}`,
            `to: ${endRotation}`,
            'dur: 3600',
            `delay: ${delay}`,
            'dir: alternate',
            'loop: true',
            'easing: easeInOutSine'
        ].join('; '));

        g.appendChild(leafGroup);
    }

    // ── Lower Foliage ─────────────────────────────────────────
    // Leaves spread sideways around the stem.
    // Their depth keeps them behind the card face.

    addLeaf({
        position: '-0.03 0.36 -0.10',
        rotation: '0 0 150',
        scale: '0.34 0.055 0.085',
        color: C.leafDark,
        delay: 0
    });

    addLeaf({
        position: '0.03 0.40 -0.10',
        rotation: '0 0 30',
        scale: '0.34 0.055 0.085',
        color: C.leafMid,
        delay: 350
    });

    addLeaf({
        position: '-0.02 0.46 -0.10',
        rotation: '0 0 160',
        scale: '0.38 0.055 0.085',
        color: C.leafMid,
        delay: 700
    });

    addLeaf({
        position: '0.02 0.50 -0.10',
        rotation: '0 0 20',
        scale: '0.38 0.055 0.085',
        color: C.leafLight,
        delay: 250
    });

    // ── Centered Information Panel ───────────────────────────
    // No connector. The main stem continues behind the panel.
    g.appendChild(
        buildCard(plant, urgency, '0 0.88 0.02')
    );

    // ── Upper Foliage ─────────────────────────────────────────
    // Shorter spacing keeps the plant from looking stretched.

    addLeaf({
        position: '-0.02 1.49 -0.10',
        rotation: '0 0 155',
        scale: '0.36 0.052 0.08',
        color: C.leafDark,
        delay: 500
    });

    addLeaf({
        position: '0.02 1.53 -0.10',
        rotation: '0 0 25',
        scale: '0.36 0.052 0.08',
        color: C.leafMid,
        delay: 900
    });

    addLeaf({
        position: '-0.01 1.62 -0.10',
        rotation: '0 0 165',
        scale: '0.30 0.05 0.075',
        color: C.leafMid,
        delay: 300
    });

    addLeaf({
        position: '0.01 1.66 -0.10',
        rotation: '0 0 15',
        scale: '0.30 0.05 0.075',
        color: C.leafLight,
        delay: 750
    });

    // ── Natural Plant Tip ─────────────────────────────────────
    // No red bulb at the top.

    g.appendChild(el('a-cylinder', {
        position: '0 1.72 -0.20',
        radius: '0.012',
        height: '0.18',
        color: C.stem,
        shader: 'flat'
    }));

    // ── Blue Water Droplet ────────────────────────────────────
    // Visible only when watering is due or overdue.
    if (urgency !== 'ok') {
        const dropGroup = document.createElement('a-entity');

        dropGroup.setAttribute(
            'position',
            '0 1.98 0.03'
        );

        // Rounded body.
        dropGroup.appendChild(el('a-sphere', {
            position: '0 -0.012 0',
            radius: '0.052',
            scale: '0.88 1 0.88',
            color: '#4FC3F7',
            shader: 'flat',
            opacity: '0.96'
        }));

        // Pointed top. The cone overlaps the sphere to avoid a gap.
        dropGroup.appendChild(el('a-cone', {
            position: '0 0.040 0',
            'radius-bottom': '0.043',
            'radius-top': '0',
            height: '0.105',
            color: '#4FC3F7',
            shader: 'flat',
            opacity: '0.96'
        }));

        // Small vertical bob above the plant.
        dropGroup.setAttribute('animation', [
            'property: position',
            'from: 0 1.94 0.03',
            'to: 0 2.04 0.03',
            'dur: 1200',
            'dir: alternate',
            'loop: true',
            'easing: easeInOutSine'
        ].join('; '));

        g.appendChild(dropGroup);
    }

    return g;
}

// ============================================================
// CENTERED INFO CARD
// ============================================================

function buildCard(plant, urgency, position) {
    const ac = accentCol(urgency);
    const wc = waterCol(urgency);

    const tip = trimTip(plant.tips?.[0] || '', 55);

    const rawSun = plant.sunlight || '';
    const sun = rawSun.length > 40
        ? rawSun.slice(0, 40).replace(/\s\S*$/, '') + '\u2026'
        : rawSun;

    const footer = plant.wateringIntervalDays
        ? `Every ${plant.wateringIntervalDays}d  ·  Last: ${plant.lastWatered || 'None'}`
        : `Last watered: ${plant.lastWatered || 'Unknown'}`;

    const group = document.createElement('a-entity');
    group.setAttribute('position', position);

    // Calculated card dimensions:
    // Fits precisely between pot soil (Y=0.265) and upper foliage (Y=1.49)
    // when centered at Y=0.88.
    const W = 1.82;
    const H = 1.20;

    // Layer positions: front surfaces have larger Z values to prevent Z-fighting.
    const ZS = -0.02; // Shadow plane
    const ZC = 0.04;  // Card background body
    const ZP = 0.065; // Header and footer bands
    const ZD = 0.075; // Dividers
    const ZA = 0.09;  // Urgency indicator stripe
    const ZT = 0.12;  // Text layer

    // ── Background Layers ─────────────────────────────────────
    // Shadow
    group.appendChild(plane(
        `0 0 ${ZS}`,
        W + 0.08,
        H + 0.08,
        '#000000',
        0.35
    ));

    // Card body
    group.appendChild(plane(
        `0 0 ${ZC}`,
        W,
        H,
        C.cardBg,
        1
    ));

    // Header background (Y: +0.33 to +0.60, height: 0.27)
    group.appendChild(plane(
        `0 0.465 ${ZP}`,
        W,
        0.27,
        C.headerBg,
        1
    ));

    // Footer background (Y: -0.60 to -0.44, height: 0.16)
    group.appendChild(plane(
        `0 -0.52 ${ZP}`,
        W,
        0.16,
        C.footerBg,
        1
    ));

    // Urgency accent stripe along left edge
    group.appendChild(plane(
        `${-W / 2 + 0.025} 0 ${ZA}`,
        0.05,
        H - 0.04,
        ac,
        1
    ));

    // ── Dividers (placed at exact slot boundaries) ────────────
    // Header divider (at boundary Y = +0.33)
    group.appendChild(plane(
        `0 0.33 ${ZD}`,
        W - 0.06,
        0.006,
        C.divider,
        1
    ));

    // Divider 1: between Watering and Sunlight (at boundary Y = +0.11)
    group.appendChild(plane(
        `0 0.11 ${ZD}`,
        W - 0.10,
        0.005,
        C.divider,
        0.65
    ));

    // Divider 2: between Sunlight and Care Tip (at boundary Y = -0.13)
    group.appendChild(plane(
        `0 -0.13 ${ZD}`,
        W - 0.10,
        0.005,
        C.divider,
        0.65
    ));

    // Footer divider (at boundary Y = -0.44)
    group.appendChild(plane(
        `0 -0.44 ${ZD}`,
        W - 0.06,
        0.006,
        C.divider,
        1
    ));

    // ── Text Elements ─────────────────────────────────────────
    const textLeft = (-W / 2 + 0.14).toFixed(3);
    const contentWidth = 1.54;

    // Plant Name (Header)
    group.appendChild(txt(
        `0.02 0.505 ${ZT}`,
        plant.name || 'Plant',
        C.nameText,
        20,
        contentWidth,
        'center',
        'center',
        'center'
    ));

    // Scientific Name (Header)
    group.appendChild(txt(
        `0.02 0.405 ${ZT}`,
        plant.scientificName || '',
        C.sciText,
        26,
        contentWidth,
        'center',
        'center',
        'center'
    ));

    // Row 1: Watering Status (slot: +0.33 to +0.11, center: +0.22)
    group.appendChild(txt(
        `${textLeft} 0.22 ${ZT}`,
        `Watering:  ${plant._waterLabel || 'Status unavailable'}`,
        wc,
        24,
        contentWidth,
        'left',
        'left',
        'center'
    ));

    // Row 2: Sunlight Requirements (slot: +0.11 to -0.13, center: -0.01)
    group.appendChild(txt(
        `${textLeft} -0.01 ${ZT}`,
        `Sunlight:  ${sun || 'Moderate indirect light'}`,
        C.sunText,
        28,
        contentWidth,
        'left',
        'left',
        'center'
    ));

    // Row 3: Plant Care Tip (slot: -0.13 to -0.44, center: -0.285)
    group.appendChild(txt(
        `${textLeft} -0.285 ${ZT}`,
        `Care Tip:  ${tip || 'Regular monitoring recommended'}`,
        C.tipText,
        30,
        contentWidth,
        'left',
        'left',
        'center'
    ));

    // Footer: Watering interval and last-watered date (slot: -0.44 to -0.60, center: -0.52)
    group.appendChild(txt(
        `0.02 -0.52 ${ZT}`,
        footer,
        C.footText,
        34,
        contentWidth,
        'center',
        'center',
        'center'
    ));

    return group;
}

// ============================================================
// MARKER FACTORY
// ============================================================

function createMarker(id, plant) {
    const { label, urgency } = waterStatus(
        plant.lastWatered,
        plant.wateringIntervalDays
    );

    plant._waterLabel = label;

    const marker = el('a-marker', {
        type: 'pattern',
        url: `/markers/marker-${id}.patt`,
        id: `marker-${id}`,
        patternRatio: '0.75'
    });

    const displayGroup = document.createElement('a-entity');

    displayGroup.setAttribute('position', '0 0 0');
    displayGroup.setAttribute('billboard', '');

    displayGroup.appendChild(
        buildPlant(plant, urgency)
    );

    marker.appendChild(displayGroup);

    marker.addEventListener('markerFound', () => {
        setBanner(`${plant.name}`, true);
    });

    marker.addEventListener('markerLost', () => {
        setBanner(
            'Scanning — point at a plant marker',
            false
        );
    });

    return marker;
}

// ============================================================
// STATUS BANNER
// ============================================================

function setBanner(text, detected) {
    const bar = document.getElementById('ar-status-bar');
    const span = document.getElementById('ar-status-text');

    if (!bar || !span) {
        return;
    }

    span.textContent = text;
    bar.classList.toggle('detected', detected);
}

// ============================================================
// DATA FETCHING
// ============================================================

async function fetchPlants() {
    try {
        const response = await fetch('/api/plants');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        plantsCache = await response.json();

        return plantsCache;
    } catch (error) {
        console.error('[AR Plant Doctor]', error);
        return null;
    }
}

// ============================================================
// MARKER SYNCHRONIZATION
// ============================================================

async function syncMarkers() {
    const plants = await fetchPlants();

    if (!plants) {
        return;
    }

    const scene = document.querySelector('a-scene');

    if (!scene) {
        return;
    }

    for (const [id, plant] of Object.entries(plants)) {
        if (document.getElementById(`marker-${id}`)) {
            continue;
        }

        scene.appendChild(
            createMarker(id, plant)
        );
    }
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {
        await syncMarkers();

        setInterval(syncMarkers, 30000);

        const loading =
            document.getElementById('loading-screen');

        const hide = () => {
            if (!loading) {
                return;
            }

            loading.style.opacity = '0';

            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        };

        const scene = document.querySelector('a-scene');

        if (scene?.hasLoaded) {
            hide();
        } else {
            scene?.addEventListener('loaded', hide);
            setTimeout(hide, 5000);
        }
    }
);

// ============================================================
// DEBUG API
// ============================================================

if (typeof window !== 'undefined') {
    window._ARPD = {
        syncMarkers,
        getCache: () => plantsCache
    };
}