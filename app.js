// ============================================================
// AR Plant Doctor — v5
// Upright 3D plant with smooth horizontal camera-facing
// Plant only is modified. Card/UI/marker/API logic preserved.
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
    tipText: '#4a6a4c',
    footText: '#334a35',
};


// ── Watering logic ────────────────────────────────────────────

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

    const passed = Math.floor(
        (nu - lu) / 86_400_000
    );

    const remaining = intervalDays - passed;

    if (remaining < 0) {
        return {
            label: `Overdue by ${Math.abs(remaining)}d`,
            urgency: 'crit'
        };
    }

    if (remaining === 0) {
        return {
            label: 'Water today',
            urgency: 'warn'
        };
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


function accentCol(u) {
    return u === 'crit'
        ? C.accentCrit
        : u === 'warn'
            ? C.accentWarn
            : C.accentOk;
}


function waterCol(u) {
    return u === 'crit'
        ? C.waterCrit
        : u === 'warn'
            ? C.waterWarn
            : C.waterOk;
}


function trimTip(s, max = 55) {

    if (!s || s.length <= max) {
        return s || '';
    }

    return (
        s.slice(0, max)
            .replace(/\s\S*$/, '') +
        '\u2026'
    );
}


// ── A-Frame element helpers ──────────────────────────────────

function el(tag, attrs = {}) {

    const e = document.createElement(tag);

    Object.entries(attrs).forEach(([k, v]) => {
        e.setAttribute(k, String(v));
    });

    return e;
}


// Flat plane — default rotation is in XY plane (vertical).
// Card is rotated -90° on X so it lies flat in XZ.

function plane(
    pos,
    w,
    h,
    color,
    opacity = 1,
    extra = {}
) {

    return el('a-plane', {
        position: pos,
        width: w,
        height: h,
        color,
        opacity,
        side: 'double',
        shader: 'flat',
        ...extra
    });
}


// Text entity

function txt(
    pos,
    value,
    color,
    wrapCount,
    width,
    anchor = 'center',
    align = 'center'
) {

    const e = document.createElement('a-entity');

    e.setAttribute('position', pos);

    e.setAttribute(
        'text',
        [
            `value: ${value}`,
            `color: ${color}`,
            `wrapCount: ${wrapCount}`,
            `width: ${width}`,
            `anchor: ${anchor}`,
            `align: ${align}`,
            'baseline: center',
            'font: roboto'
        ].join('; ')
    );

    return e;
}


// ============================================================
// CAMERA-FACING PLANT COMPONENT
// ============================================================
//
// The plant remains upright.
// Only its Y rotation changes.
//
// This means:
//
// Camera here        Plant faces here
//
//      [PHONE]
//         |
//         v
//
//        🌿
//        🪴
//
// Looking from another horizontal direction:
//
//       [PHONE]
//          \
//           \
//            🌿
//            🪴
//
// The plant rotates around its vertical axis.
// It never tips over.
//

if (typeof AFRAME !== 'undefined' &&
    !AFRAME.components['billboard']) {

AFRAME.registerComponent('billboard', {

    init: function () {
        this.parentQuat = new THREE.Quaternion();
        this.targetQuat = new THREE.Quaternion();
        this.tiltQuat = new THREE.Quaternion();
        this.deviceAngle = 0;

        // Listen for device orientation to handle phones with portrait lock on
        if (typeof window !== 'undefined') {
            window.addEventListener('deviceorientation', (e) => {
                if (!e || typeof e.gamma !== 'number') return;
                // If phone is physically held sideways while browser is portrait:
                if (window.innerWidth < window.innerHeight) {
                    if (e.gamma > 40) {
                        this.deviceAngle = 90;
                    } else if (e.gamma < -40) {
                        this.deviceAngle = -90;
                    } else {
                        this.deviceAngle = 0;
                    }
                } else {
                    this.deviceAngle = 0;
                }
            }, { passive: true });
        }
    },

    tick: function () {
        if (!this.el.object3D || !this.el.object3D.parent) return;
        const scene = this.el.sceneEl;
        if (!scene || !scene.camera) return;
        const camera = scene.camera;

        // 1. Lock directly to camera's view-plane (100% straight and flat to screen)
        camera.getWorldQuaternion(this.targetQuat);

        // 2. Determine tilt angle for landscape compensation
        let angle = 0;
        if (window.innerWidth > window.innerHeight) {
            // Browser window is in landscape mode
            const screenAngle = (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number')
                ? window.screen.orientation.angle
                : (typeof window.orientation === 'number' ? window.orientation : 0);
            angle = screenAngle === 270 ? -90 : (screenAngle === 90 ? 90 : 0);
        } else if (this.deviceAngle !== 0) {
            // Browser is in portrait, but device is physically tilted sideways
            angle = this.deviceAngle;
        }

        if (angle !== 0) {
            // Positive rotation around Z keeps plant pointing UP on the landscape screen
            const rad = (angle * Math.PI) / 180;
            this.tiltQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad);
            this.targetQuat.multiply(this.tiltQuat);
        }

        // 3. Set this entity's world quaternion to match targetQuat exactly
        this.el.object3D.parent.getWorldQuaternion(this.parentQuat);
        this.el.object3D.quaternion.copy(this.parentQuat).invert().multiply(this.targetQuat);
    }
});
}


// ============================================================
// 3D PLANT
// ============================================================
//
// Upright Peace Lily.
// Always faces the camera with full 3D billboard.
// Shows side profile with pot, stems, foliage, and flower.
//

function buildPlant(urgency) {

    const ac = accentCol(urgency);

    const g = document.createElement('a-entity');

    // --------------------------------------------------------
    // PLANT ROOT TRANSFORM
    // --------------------------------------------------------

    // Centered directly over marker origin
    g.setAttribute(
        'position',
        '0 -0.22 0'
    );

    g.setAttribute(
        'rotation',
        '0 0 0'
    );


    // ========================================================
    // POT
    // ========================================================

    // Main pot body
    g.appendChild(
        el('a-cylinder', {

            position: '0 0.13 0',

            radius: '0.30',

            height: '0.26',

            color: C.pot,

            shader: 'flat'

        })
    );


    // Pot rim (flat horizontal ring)
    g.appendChild(
        el('a-torus', {

            position: '0 0.26 0',

            rotation: '90 0 0',

            radius: '0.30',

            'radius-tubular': '0.025',

            color: C.potRim,

            shader: 'flat'

        })
    );


    // Soil
    g.appendChild(
        el('a-cylinder', {

            position: '0 0.265 0',

            radius: '0.275',

            height: '0.025',

            color: C.soil,

            shader: 'flat'

        })
    );


    // ========================================================
    // MAIN STEM
    // ========================================================

    g.appendChild(
        el('a-cylinder', {

            position: '0 0.70 0',

            radius: '0.023',

            height: '0.88',

            color: C.stem,

            shader: 'flat'

        })
    );


    // Upper central stalk
    g.appendChild(
        el('a-cylinder', {

            position: '0 1.05 0',

            radius: '0.015',

            height: '0.50',

            color: C.leafDark,

            shader: 'flat'

        })
    );


    // ========================================================
    // LEAF BUILDER
    // ========================================================
    //
    // Leaves are grouped around their attachment point.
    //
    // Each leaf:
    //
    // - starts close to the stem
    // - extends outward
    // - has thickness
    // - has a darker central vein
    // - has gentle movement
    //
    // This prevents the "floating leaves" appearance.
    //

    function addLeaf(options) {

        const {
            position,
            rotation,
            scale,
            color,
            delay = 0
        } = options;


        const leafGroup =
            document.createElement('a-entity');


        leafGroup.setAttribute(
            'position',
            position
        );


        leafGroup.setAttribute(
            'rotation',
            rotation
        );


        // ----------------------------------------------------
        // LEAF BODY
        // ----------------------------------------------------

        const leaf = el(
            'a-sphere',
            {

                position: '0 0 0',

                scale: scale,

                color: color,

                shader: 'flat',

                opacity: '0.98',

                side: 'double'

            }
        );


        leafGroup.appendChild(leaf);


        // ----------------------------------------------------
        // CENTRAL VEIN
        // ----------------------------------------------------
        //
        // Thin dark line gives the leaf actual structure.
        //

        const vein = el(
            'a-cylinder',
            {

                position: '0 0.045 0',

                radius: '0.006',

                height: '0.60',

                color: C.leafDark,

                shader: 'flat',

                opacity: '0.55'

            }
        );


        vein.setAttribute(
            'rotation',
            '0 0 90'
        );


        leafGroup.appendChild(vein);


        // ----------------------------------------------------
        // NATURAL MOVEMENT
        // ----------------------------------------------------

        const rotationParts =
            rotation
                .trim()
                .split(/\s+/)
                .map(Number);


        const animatedRotation = [
            rotationParts[0],
            rotationParts[1],
            rotationParts[2] + 4
        ].join(' ');


        leafGroup.setAttribute(
            'animation',
            [
                'property: rotation',

                `from: ${rotation}`,

                `to: ${animatedRotation}`,

                'dur: 3200',

                `delay: ${delay}`,

                'dir: alternate',

                'loop: true',

                'easing: easeInOutSine'

            ].join('; ')
        );


        g.appendChild(leafGroup);
    }


    // ========================================================
    // LOWER LEAVES
    // ========================================================

    addLeaf({

        position: '-0.10 0.55 0',

        rotation: '12 0 -52',

        scale: '0.20 0.055 0.42',

        color: C.leafDark,

        delay: 0

    });


    addLeaf({

        position: '0.10 0.58 0',

        rotation: '12 0 52',

        scale: '0.20 0.055 0.42',

        color: C.leafMid,

        delay: 450

    });


    // ========================================================
    // LOWER-MIDDLE LEAVES
    // ========================================================

    addLeaf({

        position: '-0.10 0.72 0',

        rotation: '6 0 -62',

        scale: '0.21 0.055 0.48',

        color: C.leafMid,

        delay: 800

    });


    addLeaf({

        position: '0.10 0.76 0',

        rotation: '6 0 62',

        scale: '0.21 0.055 0.48',

        color: C.leafLight,

        delay: 300

    });


    // ========================================================
    // MIDDLE LEAVES
    // ========================================================

    addLeaf({

        position: '-0.08 0.91 0',

        rotation: '-4 0 -48',

        scale: '0.22 0.055 0.50',

        color: C.leafDark,

        delay: 600

    });


    addLeaf({

        position: '0.08 0.94 0',

        rotation: '-4 0 48',

        scale: '0.22 0.055 0.50',

        color: C.leafMid,

        delay: 1000

    });


    // ========================================================
    // UPPER LEAVES
    // ========================================================

    addLeaf({

        position: '-0.06 1.08 0',

        rotation: '-10 0 -34',

        scale: '0.19 0.05 0.45',

        color: C.leafMid,

        delay: 350

    });


    addLeaf({

        position: '0.06 1.10 0',

        rotation: '-10 0 34',

        scale: '0.19 0.05 0.45',

        color: C.leafLight,

        delay: 750

    });


    // ========================================================
    // CENTER NEW LEAF
    // ========================================================

    addLeaf({

        position: '0 1.15 0',

        rotation: '-8 0 0',

        scale: '0.17 0.045 0.42',

        color: C.leafLight,

        delay: 500

    });


    // ========================================================
    // NEW CENTRAL SHOOT
    // ========================================================

    g.appendChild(
        el('a-cylinder', {

            position: '0 1.23 0',

            radius: '0.012',

            height: '0.25',

            color: C.leafDark,

            shader: 'flat'

        })
    );


    // ========================================================
    // HEALTH / STATUS BUD
    // ========================================================

    const bud = el(
        'a-sphere',
        {

            position: '0 1.36 0',

            radius: '0.035',

            color: ac,

            shader: 'flat'

        }
    );


    bud.setAttribute(
        'animation',
        [
            'property: scale',

            'from: 1 1 1',

            'to: 1.35 1.35 1.35',

            'dur: 1400',

            'dir: alternate',

            'loop: true',

            'easing: easeInOutSine'

        ].join('; ')
    );


    g.appendChild(bud);


    return g;
}


// ============================================================
// FLAT INFO CARD
// ============================================================

function buildCard(plant, urgency) {

    const ac = accentCol(urgency);

    const wc = waterCol(urgency);

    const tip = trimTip(
        plant.tips?.[0] || ''
    );

    const sun =
        (plant.sunlight || '').length > 32

            ? plant.sunlight
                .slice(0, 32)
                .replace(/\s\S*$/, '') +
              '\u2026'

            : (plant.sunlight || '');


    const footer =
        `Every ${plant.wateringIntervalDays}d  ·  Last: ${plant.lastWatered}`;


    // Outer group
    const group =
        document.createElement('a-entity');


    // Positioned beside plant and centered with foliage
    group.setAttribute(
        'position',
        '1.45 0.28 0'
    );

    group.setAttribute(
        'rotation',
        '0 0 0'
    );


    const W = 2.0;

    const H = 1.55;


    // Depth layers
    const ZS = -0.06;

    const ZC = 0;

    const ZP = 0.06;

    const ZD = 0.09;

    const ZA = 0.12;

    const ZT = 0.18;


    // Shadow
    group.appendChild(
        plane(
            `0 0 ${ZS}`,
            W + 0.10,
            H + 0.10,
            '#000000',
            0.45
        )
    );


    // Card body
    group.appendChild(
        plane(
            `0 0 ${ZC}`,
            W,
            H,
            C.cardBg,
            0.96
        )
    );


    // Header
    group.appendChild(
        plane(
            `0 ${H / 2 - 0.22} ${ZP}`,
            W,
            0.44,
            C.headerBg,
            1
        )
    );


    // Footer
    group.appendChild(
        plane(
            `0 ${-H / 2 + 0.12} ${ZP}`,
            W,
            0.24,
            C.footerBg,
            1
        )
    );


    // Urgency accent
    group.appendChild(
        plane(
            `${-W / 2 + 0.028} 0 ${ZA}`,
            0.055,
            H - 0.06,
            ac,
            0.92
        )
    );


    // Header divider
    group.appendChild(
        plane(
            `0 ${H / 2 - 0.44} ${ZD}`,
            W - 0.05,
            0.007,
            C.divider,
            1
        )
    );


    // Row dividers
    [
        H / 2 - 0.68,
        H / 2 - 1.00,
        H / 2 - 1.30
    ].forEach(dy => {

        group.appendChild(
            plane(
                `0.02 ${dy} ${ZD}`,
                W - 0.10,
                0.006,
                C.divider,
                0.65
            )
        );

    });


    // Footer divider
    group.appendChild(
        plane(
            `0 ${-H / 2 + 0.24} ${ZD}`,
            W - 0.05,
            0.006,
            C.divider,
            0.6
        )
    );


    // Plant name
    group.appendChild(
        txt(
            `0.10 ${H / 2 - 0.18} ${ZT}`,
            plant.name,
            C.nameText,
            20,
            1.70,
            'center',
            'center'
        )
    );


    // Scientific name
    group.appendChild(
        txt(
            `0.10 ${H / 2 - 0.33} ${ZT}`,
            plant.scientificName || '',
            C.sciText,
            28,
            1.70,
            'center',
            'center'
        )
    );


    // Water row
    group.appendChild(
        txt(
            `${-W / 2 + 0.15} ${H / 2 - 0.58} ${ZT}`,
            `\u{1F4A7}  ${plant._waterLabel}`,
            wc,
            26,
            1.72,
            'left',
            'left'
        )
    );


    // Sunlight row
    group.appendChild(
        txt(
            `${-W / 2 + 0.15} ${H / 2 - 0.90} ${ZT}`,
            `\u2600\uFE0F  ${sun}`,
            C.sunText,
            28,
            1.72,
            'left',
            'left'
        )
    );


    // Tip row
    group.appendChild(
        txt(
            `${-W / 2 + 0.15} ${H / 2 - 1.20} ${ZT}`,
            `\u{1F4A1}  ${tip}`,
            C.tipText,
            30,
            1.70,
            'left',
            'left'
        )
    );


    // Footer
    group.appendChild(
        txt(
            `0.02 ${-H / 2 + 0.12} ${ZT}`,
            footer,
            C.footText,
            36,
            1.80,
            'center',
            'center'
        )
    );


    // ========================================================
    // CONNECTOR
    // ========================================================

    const conn =
        document.createElement('a-entity');

    // Bridges the gap between plant stem at (0, 0.50, 0) and card left edge
    conn.setAttribute(
        'position',
        `-1.225 0 ${ZC}`
    );

    conn.appendChild(
        el('a-cylinder', {

            position: '0 0 0',

            rotation: '0 0 90',

            radius: '0.008',

            height: '0.45',

            color: ac,

            opacity: '0.70',

            shader: 'flat'

        })
    );

    // Junction dot on the plant stem
    conn.appendChild(
        el('a-sphere', {

            position: '-0.225 0 0',

            radius: '0.02',

            color: ac,

            shader: 'flat'

        })
    );

    group.appendChild(conn);


    return group;
}


// ============================================================
// MARKER FACTORY
// ============================================================

function createMarker(id, plant) {

    const {
        label,
        urgency
    } = waterStatus(
        plant.lastWatered,
        plant.wateringIntervalDays
    );


    plant._waterLabel = label;


    const marker = el(
        'a-marker',
        {

            type: 'pattern',

            url: `/markers/marker-${id}.patt`,

            id: `marker-${id}`,

            patternRatio: '0.75'

        }
    );


    // Unified display group billboarded to camera
    const displayGroup = document.createElement('a-entity');
    displayGroup.setAttribute('position', '0 0 0');
    displayGroup.setAttribute('billboard', '');

    // Plant at center (0, 0, 0)
    displayGroup.appendChild(
        buildPlant(urgency)
    );

    // Information card locked beside plant at (1.45, 0.50, 0)
    displayGroup.appendChild(
        buildCard(
            plant,
            urgency
        )
    );

    marker.appendChild(displayGroup);


    marker.addEventListener(
        'markerFound',
        () => setBanner(
            `${plant.name}`,
            true
        )
    );


    marker.addEventListener(
        'markerLost',
        () => setBanner(
            'Scanning — point at a plant marker',
            false
        )
    );


    return marker;
}


// ============================================================
// BANNER
// ============================================================

function setBanner(text, detected) {

    const bar =
        document.getElementById(
            'ar-status-bar'
        );

    const span =
        document.getElementById(
            'ar-status-text'
        );


    if (!bar || !span) {
        return;
    }


    span.textContent = text;


    bar.classList.toggle(
        'detected',
        detected
    );
}


// ============================================================
// DATA
// ============================================================

async function fetchPlants() {

    try {

        const res =
            await fetch('/api/plants');


        if (!res.ok) {

            throw new Error(
                `HTTP ${res.status}`
            );

        }


        plantsCache =
            await res.json();


        return plantsCache;

    } catch (e) {

        console.error(
            '[AR Plant Doctor]',
            e
        );

        return null;
    }
}


// ============================================================
// MARKER SYNCHRONIZATION
// ============================================================

async function syncMarkers() {

    const plants =
        await fetchPlants();


    if (!plants) {
        return;
    }


    const scene =
        document.querySelector(
            'a-scene'
        );


    if (!scene) {
        return;
    }


    for (
        const [id, plant]
        of Object.entries(plants)
    ) {

        if (
            document.getElementById(
                `marker-${id}`
            )
        ) {
            continue;
        }


        scene.appendChild(
            createMarker(
                id,
                plant
            )
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


        setInterval(
            syncMarkers,
            30_000
        );


        const loading =
            document.getElementById(
                'loading-screen'
            );


        const hide = () => {

            if (!loading) {
                return;
            }


            loading.style.opacity = '0';


            setTimeout(
                () => {
                    loading.style.display =
                        'none';
                },
                500
            );
        };


        const scene =
            document.querySelector(
                'a-scene'
            );


        if (scene?.hasLoaded) {

            hide();

        } else {

            scene?.addEventListener(
                'loaded',
                hide
            );


            setTimeout(
                hide,
                5000
            );
        }

    }
);


// ============================================================
// DEBUG API
// ============================================================

if (typeof window !== 'undefined') {

    window._ARPD = {

        syncMarkers,

        getCache: () =>
            plantsCache

    };
}