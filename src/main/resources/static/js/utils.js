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
    const normalized = (typeof sp === 'string') 
        ? sp.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() 
        : sp;
    
    if (typeof normalized !== 'string') return '#cbd5e1';

    if (normalized.includes('TENEBRES')) return '#a855f7';
    if (normalized.includes('ESPRIT')) return '#38bdf8';
    if (normalized.includes('KARMA')) return '#e7d198';
    if (normalized.includes('VIOLENCE')) return '#a70740';
    if (normalized.includes('TRAHISON')) return '#ed5677';
    if (normalized.includes('SURETE')) return '#00e5cc';
    if (normalized.includes('RAISON')) return '#3b82f6';
    if (normalized.includes('DESTRUCTION')) return '#ff0000';
    if (normalized.includes('CREATION')) return '#10b981';
    if (normalized.includes('CONVICTION')) return '#b74c0b';
    if (normalized.includes('CONSOLIDATION')) return '#99674c';
    
    return '#cbd5e1';
}

function getSpiritualiteIcon(sp) {
    if (!sp) return 'radio_button_unchecked';
    const normalized = (typeof sp === 'string') 
        ? sp.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() 
        : sp;
        
    if (typeof normalized !== 'string') return 'radio_button_unchecked';

    if (normalized.includes('TENEBRES')) return 'dark_mode';
    if (normalized.includes('ESPRIT')) return 'blur_on';
    if (normalized.includes('KARMA')) return 'all_inclusive';
    if (normalized.includes('VIOLENCE')) return 'explosion';
    if (normalized.includes('TRAHISON')) return 'visibility_off';
    if (normalized.includes('SURETE')) return 'water_drop';
    if (normalized.includes('RAISON')) return 'psychology';
    if (normalized.includes('DESTRUCTION')) return 'local_fire_department';
    if (normalized.includes('CREATION')) return 'eco';
    if (normalized.includes('CONVICTION')) return 'volcano';
    if (normalized.includes('CONSOLIDATION')) return 'foundation';
    
    return 'radio_button_unchecked';
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
    } else if (s === 'ANNEAU' || s === 'ANNEAU_GAUCHE' || s === 'ANNEAU_DROIT') {
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

window.showGlobalTooltip = async function(el) {
    const ui = await import('/js/ui.js');
    ui.showGlobalTooltip(el);
}

window.hideGlobalTooltip = async function() {
    const ui = await import('/js/ui.js');
    ui.hideGlobalTooltip();
}

// Make them available globally without window. prefix as well
function showGlobalTooltip(el) {
    window.showGlobalTooltip(el);
}

function hideGlobalTooltip() {
    window.hideGlobalTooltip();
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

function getEquipmentTooltipHTML(eq) {
    if (!eq) return '';
    const statsDef = [
        { key: 'bonusHealthMax', label: 'PV', icon: 'favorite', color: '#ec4899' },
        { key: 'bonusManaMax', label: 'Mana', icon: 'water_drop', color: '#38bdf8' },
        { key: 'bonusPower', label: 'Puiss', icon: 'auto_awesome', color: '#a855f7' },
        { key: 'bonusStrength', label: 'Force', icon: 'fitness_center', color: '#f43f5e' },
        { key: 'bonusArmor', label: 'Armure', icon: 'shield', color: '#3b82f6' },
        { key: 'bonusResistance', label: 'Résist', icon: 'shield', color: '#10b981' },
        { key: 'bonusSpeed', label: 'Vitesse', icon: 'bolt', color: '#f59e0b' },
        { key: 'bonusCrit', label: 'Crit', icon: 'gps_fixed', color: '#ef4444' },
        { key: 'regenHealthPerTurn', label: 'PV/t', icon: 'healing', color: '#10b981' },
        { key: 'regenManaPerTurn', label: 'Mana/t', icon: 'cyclone', color: '#38bdf8' },
        { key: 'consumableHpPercent', label: 'PV Max', icon: 'favorite', color: '#ec4899', isPercent: true },
        { key: 'consumableManaPercent', label: 'Mana Max', icon: 'water_drop', color: '#38bdf8', isPercent: true },
        { key: 'consumableMissingHpPercent', label: 'PV Manq', icon: 'healing', color: '#f43f5e', isPercent: true },
        { key: 'consumableMissingManaPercent', label: 'Mana Manq', icon: 'cyclone', color: '#a855f7', isPercent: true }
    ];
    let statsHtml = statsDef
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            const suffix = s.isPercent ? '%' : '';
            return `<div class="flex-between" style="gap: 1rem; margin-bottom: 0.3rem;">
                <div class="flex-center text-muted" style="gap: 0.3rem;">
                    <span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size: 1rem;">${s.icon}</span>
                    ${s.label}
                </div>
                <span style="font-weight: 600; color: ${isMalus ? '#ef4444' : '#fff'};">${sign}${val}${suffix}</span>
            </div>`;
        }).join('');

    let effectHtml = '';
    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
        const label = (window.EFFECT_LABELS && window.EFFECT_LABELS[eq.specialEffect]) || eq.specialEffect;
        const isCursed = eq.specialEffect.startsWith('CURSED_');
        const icon = isCursed ? 'skull' : 'auto_awesome';
        const color = isCursed ? '#ef4444' : '#c084fc';

        effectHtml = `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
            <div class="flex-center" style="color: ${color}; justify-content: space-between; gap: 0.3rem;">
                <div class="flex-center" style="gap: 0.3rem;">
                    <span class="material-symbols-outlined icon-sm">${icon}</span>
                    ${label}
                </div>
                <span style="font-weight: 600; color: #fff;">${eq.specialEffectValue || ''}</span>
            </div>
        </div>`;
    }

    if (!statsHtml && !effectHtml) return `<div class="font-italic text-muted text-center" style="min-width: 150px; padding: 0.5rem;">Aucun attribut</div>`;

    return `<div style="min-width: 150px; padding: 0.5rem;">
        ${statsHtml}
        ${effectHtml}
    </div>`;
}

window.getEquipmentTooltipHTML = getEquipmentTooltipHTML;

window.generateEquipmentStatsHtml = function(eq, cssClass = 'vault-stat-chip') {
    if (!eq) return '';
    const statsDef = [
        { key: 'bonusHealthMax', label: 'PV', icon: 'favorite', color: '#ec4899' },
        { key: 'bonusManaMax', label: 'Mana', icon: 'water_drop', color: '#38bdf8' },
        { key: 'bonusPower', label: 'Puiss', icon: 'auto_awesome', color: '#a855f7' },
        { key: 'bonusStrength', label: 'Force', icon: 'fitness_center', color: '#f43f5e' },
        { key: 'bonusArmor', label: 'Armure', icon: 'shield', color: '#3b82f6' },
        { key: 'bonusResistance', label: 'Résist', icon: 'shield', color: '#10b981' },
        { key: 'bonusSpeed', label: 'Vitesse', icon: 'bolt', color: '#f59e0b' },
        { key: 'bonusCrit', label: 'Crit', icon: 'gps_fixed', color: '#ef4444' },
        { key: 'regenHealthPerTurn', label: 'PV/t', icon: 'healing', color: '#10b981' },
        { key: 'regenManaPerTurn', label: 'Mana/t', icon: 'cyclone', color: '#38bdf8' },
        { key: 'consumableHpPercent', label: 'PV Max', icon: 'favorite', color: '#ec4899', isPercent: true },
        { key: 'consumableManaPercent', label: 'Mana Max', icon: 'water_drop', color: '#38bdf8', isPercent: true },
        { key: 'consumableMissingHpPercent', label: 'PV Manq', icon: 'healing', color: '#f43f5e', isPercent: true },
        { key: 'consumableMissingManaPercent', label: 'Mana Manq', icon: 'cyclone', color: '#a855f7', isPercent: true }
    ];
    let html = statsDef
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            const suffix = s.isPercent ? '%' : '';
            return `<span class="${cssClass} ${isMalus ? 'malus' : ''}" title="${s.label}">
                <span class="material-symbols-outlined text-xs" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>
                ${sign}${val}${suffix}
            </span>`;
        }).join('');

    if (eq.slot === 'CONSOMMABLE' || eq.isConsumable) {
        const cat = eq.consumableCategory || eq.category; 
        if (cat === 'CLE' && eq.specialEffectValue) {
            html += `<span class="${cssClass}" title="Bonus de Butin">
                <span class="material-symbols-outlined text-xs" style="color:#fbbf24;">diamond</span>
                +${eq.specialEffectValue}%
            </span>`;
        }

        const weight = eq.weight !== undefined ? eq.weight : (eq._weight !== undefined ? eq._weight : eq.baseWeight);
        if (weight !== undefined && weight !== null && weight > 0) {
            html += `<span class="${cssClass}" title="Poids">
                <span class="material-symbols-outlined text-xs text-muted">scale</span>
                ${+Number(weight).toFixed(1)}
            </span>`;
        }
    }

    return html;
};

window.generateEquipmentEffectHtml = function(eq, baseClass = 'vault-card-effect') {
    if (!eq || !eq.specialEffect || eq.specialEffect === 'NONE') return '';
    
    const label = (window.EFFECT_LABELS && window.EFFECT_LABELS[eq.specialEffect]) || eq.specialEffect;
    const isCursed = eq.specialEffect.startsWith('CURSED_');
    const icon = isCursed ? 'skull' : 'auto_awesome';
    const color = isCursed ? '#9b2d2d' : '#c084fc';
    const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

    return `<div class="${baseClass}" style="color: ${color}; background: ${bg}; ${isCursed ? 'border: 1px solid rgba(156, 163, 175, 0.2);' : ''}">
        <span class="material-symbols-outlined text-sm">${icon}</span>
        ${label} : ${eq.specialEffectValue || ''}
    </div>`;
};
