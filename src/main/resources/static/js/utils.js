// ============================================================
//  GRIMOIRE — Shared Utilities (utils.js)
//  Loaded via <script> before page-specific JS files.
//  All functions/constants are global (window scope).
// ============================================================

// ---- Color helpers ----

window.ALL_SPIRITUALITIES = [
    'TENEBRES', 'ESPRIT', 'KARMA', 'VIOLENCE', 'TRAHISON',
    'SURETE', 'RAISON', 'DESTRUCTION', 'CREATION', 'CONVICTION', 'CONSOLIDATION'
];


function getSpiritualiteColor(sp) {
    if (!sp) return '#cbd5e1';
    switch (sp.toUpperCase ? sp.toUpperCase() : sp) {
        case 'TENEBRES': return '#a855f7';
        case 'ESPRIT': return '#38bdf8';
        case 'KARMA': return '#e7d198';
        case 'VIOLENCE': return '#a70740';
        case 'TRAHISON': return '#ed5677';
        case 'SURETE': return '#00e5cc';
        case 'RAISON': return '#3b82f6';
        case 'DESTRUCTION': return '#ff0000';
        case 'CREATION': return '#10b981';
        case 'CONVICTION': return '#b74c0b';
        case 'CONSOLIDATION': return '#99674c';
        default: return '#cbd5e1';
    }
}

function getSpiritualiteIcon(sp) {
    if (!sp) return 'radio_button_unchecked';
    switch (sp.toUpperCase ? sp.toUpperCase() : sp) {
        case 'TENEBRES': return 'dark_mode';
        case 'ESPRIT': return 'blur_on';
        case 'KARMA': return 'all_inclusive';
        case 'VIOLENCE': return 'explosion';
        case 'TRAHISON': return 'visibility_off';
        case 'SURETE': return 'water_drop';
        case 'RAISON': return 'psychology';
        case 'DESTRUCTION': return 'local_fire_department';
        case 'CREATION': return 'eco';
        case 'CONVICTION': return 'volcano';
        case 'CONSOLIDATION': return 'foundation';
        default: return 'radio_button_unchecked';
    }
}

function getLevelColor(lvl) {
    const l = parseInt(lvl) || 1;
    if (l === 1) return '#10b981';
    if (l === 2) return '#3b82f6';
    if (l === 3) return '#a855f7';
    if (l === 4) return '#f59e0b';
    if (l >= 5) return '#ef4444';
    return '#10b981';
}

function getTypeColor(isMagic) {
    return isMagic ? '#ec4899' : '#b45309';
}

// ---- Equipment slot info ----

function getSlotInfo(eq) {
    if (!eq) return { icon: 'help', color: '#94a3b8', label: '?' };
    const sName = typeof eq.slot === 'object' ? eq.slot?.name : eq.slot;
    const info = Object.assign({}, (window.SLOT_LABELS && window.SLOT_LABELS[sName]) ? window.SLOT_LABELS[sName] : { label: sName || '?', icon: 'help', color: '#94a3b8' });

    if (sName === 'CONSOMMABLE' && eq.consumableCategory) {
        const catName = typeof eq.consumableCategory === 'object' ? eq.consumableCategory?.name : eq.consumableCategory;
        if (catName && window.CONSUMABLE_CATEGORIES && window.CONSUMABLE_CATEGORIES[catName]) {
            const catInfo = window.CONSUMABLE_CATEGORIES[catName];
            info.icon = catInfo.icon;
            info.color = catInfo.color;
        }
    }
    return info;
}

// ---- Weight calculation ----

function calculateWeight(eq) {
    if (eq.isAnomalie) return 0;
    let w = eq.baseWeight || 0;

    let mHp = 0.2, mMana = 0.2, mPow = 2.0, mStr = 2.0, mArm = 1.0, mRes = 1.0;
    let mSpd = 3.0, mCrit = 1.5, mRegHp = 3.0, mRegMana = 1.5;

    const s = eq.slot;
    if (s === 'ARME_GAUCHE' || s === 'ARME_DROITE' || s === 'ARME_DEUX_MAINS') {
        mArm = 1.5; mRes = 1.5;
        mHp = 0.4; mMana = 0.4;
        mStr = 1.8; mPow = 1.8;
        mRegHp = 2.4; mRegMana = 1.2;
    } else if (s === 'CASQUE' || s === 'PLASTRON') {
        mArm = 0.8; mRes = 0.8;
        mStr = 2.5; mPow = 2.5;
        mSpd = 3.5;
        mCrit = 2.0;
    } else if (s === 'ANNEAU_GAUCHE' || s === 'ANNEAU_DROIT') {
        mMana = 0.1;
        mArm = 2.0; mRes = 2.0;
        mRegMana = 0.8;
    } else if (s === 'BOTTES') {
        mSpd = 1.5;
    } else if (s === 'CAPE') {
        mCrit = 1.5;
    }

    w += (eq.bonusHealthMax || 0) * mHp;
    w += (eq.bonusManaMax || 0) * mMana;
    w += (eq.bonusPower || 0) * mPow;
    w += (eq.bonusStrength || 0) * mStr;
    w += (eq.bonusArmor || 0) * mArm;
    w += (eq.bonusResistance || 0) * mRes;
    w += (eq.bonusSpeed || 0) * mSpd;
    w += (eq.bonusCrit || 0) * mCrit;
    w += (eq.regenHealthPerTurn || 0) * mRegHp;
    w += (eq.regenManaPerTurn || 0) * mRegMana;

    const rarity = getRarityName(eq.rarity);
    if (rarity === 'EPIQUE' || rarity === 'RELIQUE' || rarity === 'MAUDIT') {
        const specialEffect = eq.specialEffect;
        const effectVal = eq.specialEffectValue || 0;

        if (specialEffect && specialEffect !== 'NONE' && effectVal !== 0) {
            if (rarity === 'MAUDIT') {
                w += effectVal * 0.2;
            } else {
                w += effectVal * 1.5;
            }
        }
    }
    return w;
}

// ---- UI helpers (delegate to ui.js) ----

async function showNotif(message, isError = false) {
    const ui = await import('/js/ui.js');
    ui.showNotif(message, isError);
}

async function showModal(options) {
    const ui = await import('/js/ui.js');
    return ui.showModal(options);
}

// ---- Shared constants ----

function getRarityName(rarity) {
    if (!rarity) return null;
    return typeof rarity === 'object' ? (rarity.name || null) : rarity;
}

function getRarityColor(rarity) {
    const rName = getRarityName(rarity);
    if (!rName) return '#ef4444';
    return (window.RARITY_COLORS && window.RARITY_COLORS[rName]) ? window.RARITY_COLORS[rName] : '#ef4444';
}

const CATEGORY_ICONS_FALLBACK = {
    'PIERRE': 'landslide', 'METAL': 'hardware', 'COEUR': 'favorite',
    'ORBE': 'lens', 'CRISTAL': 'diamond', 'PLUME': 'history_edu',
    'ECAILLE': 'waves', 'AUTRE': 'category'
};

function getCategoryIcon(categoryName) {
    if (window.CATEGORY_ICONS && window.CATEGORY_ICONS[categoryName]) {
        return window.CATEGORY_ICONS[categoryName];
    }
    return CATEGORY_ICONS_FALLBACK[categoryName] || 'category';
}

window.DEFAULT_SECRETS_META = [
    { name: "Secret du Chaos", icon: "local_fire_department", color: "#ff0000" },
    { name: "Secret de l'Abondance", icon: "eco", color: "#10b981" },
    { name: "Secret de la Préservation", icon: "foundation", color: "#99674c" },
    { name: "Secret de la Sérénité", icon: "water_drop", color: "#00e5cc" },
    { name: "Secret de la Chasse", icon: "visibility_off", color: "#ed5677" },
    { name: "Secret du Carnage", icon: "explosion", color: "#a70740" },
    { name: "Secret de la Joie", icon: "volcano", color: "#b74c0b" },
    { name: "Secret du Savoir", icon: "psychology", color: "#3b82f6" },
    { name: "Secret du Destin", icon: "all_inclusive", color: "#e7d198" },
    { name: "Secret de l'Éther", icon: "blur_on", color: "#38bdf8" },
    { name: "Secret des Abysses", icon: "dark_mode", color: "#c084fc" }
];

function getAnomalyTooltipHTML(aTemp, fallbackName) {
    const n = aTemp ? aTemp.name : fallbackName;
    const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
    const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';

    let html = `
        <div class="anomaly-tooltip-title" style="color: ${spiriColor}; border-bottom: 1px solid ${spiriColor}40; padding-bottom: 4px;">
            <span class="material-symbols-outlined" style="font-size: 1rem; margin-right: 4px;">${catIcon}</span>${n}
        </div>
        <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
            <span class="font-bold" style="border: 1px solid ${getLevelColor(aTemp ? aTemp.level : 1)}; color: ${getLevelColor(aTemp ? aTemp.level : 1)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                Lvl ${aTemp ? aTemp.level || 1 : 1}
            </span>
            <span class="flex-center font-bold" style="border: 1px solid ${getTypeColor(aTemp && aTemp.magicObject)}; color: ${getTypeColor(aTemp && aTemp.magicObject)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; gap: 4px;">
                <span class="material-symbols-outlined text-sm">${aTemp && aTemp.magicObject ? 'star' : 'category'}</span>
                ${aTemp && aTemp.magicObject ? 'Magique' : 'Matériau'}
            </span>`;

    if (aTemp && aTemp.spiritualite) {
        html += `
            <span class="font-bold" style="border: 1px solid ${getSpiritualiteColor(aTemp.spiritualite)}; color: ${getSpiritualiteColor(aTemp.spiritualite)}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: rgba(0,0,0,0.3);">
                ${aTemp.spiritualite}
            </span>`;
    }

    html += `
        </div>
        <div class="anomaly-tooltip-desc">${aTemp && aTemp.description ? aTemp.description : 'Aucune description'}</div>
    `;

    return html;
}
