const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau Gauche', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau Droit', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' },
    CONSOMMABLE: { label: 'Consommable', icon: 'inventory_2', color: '#854c4c' },
    ANOMALIE: { label: 'Anomalie', icon: 'auto_awesome', color: '#f59e0b' }
};

function getSlotInfo(eq) {
    if (!eq) return { icon: 'help', color: '#94a3b8' };
    const info = Object.assign({}, SLOT_LABELS[eq.slot] || { label: eq.slot, icon: eq.iconId || 'help', color: '#94a3b8' });
    if (eq.slot === 'CONSOMMABLE' && eq.consumableCategory) {
        const catIcons = { POTION_ROSE: 'science', POTION_BLEUE: 'science', POTION_ROUGE: 'science', POTION_VIOLETTE: 'science', CLE: 'vpn_key', CORDE: 'gesture', PARCHEMIN: 'history_edu', NOURRITURE: 'restaurant', OUTIL: 'construction', AUTRE: 'inventory_2' };
        const catColors = { POTION_ROSE: '#ec4899', POTION_BLEUE: '#0ea5e9', POTION_ROUGE: '#ef4444', POTION_VIOLETTE: '#a855f7', CLE: '#eab308', CORDE: '#8b4513', PARCHEMIN: '#f59e0b', NOURRITURE: '#f43f5e', OUTIL: '#64748b', AUTRE: '#94a3b8' };
        info.icon = catIcons[eq.consumableCategory] || 'inventory_2';
        info.color = catColors[eq.consumableCategory] || '#854c4c';
    }
    return info;
}

const STAT_DEFS = [
    { key: 'bonusHealthMax', label: 'PV', icon: 'favorite', color: '#ec4899' },
    { key: 'bonusManaMax', label: 'Mana', icon: 'water_drop', color: '#38bdf8' },
    { key: 'bonusPower', label: 'Pui', icon: 'auto_awesome', color: '#a855f7' },
    { key: 'bonusStrength', label: 'For', icon: 'fitness_center', color: '#f43f5e' },
    { key: 'bonusArmor', label: 'Arm', icon: 'shield', color: '#3b82f6' },
    { key: 'bonusResistance', label: 'Rés', icon: 'shield', color: '#10b981' },
    { key: 'bonusSpeed', label: 'Vit', icon: 'bolt', color: '#f59e0b' },
    { key: 'bonusCrit', label: 'Crit', icon: 'gps_fixed', color: '#ef4444' },
    { key: 'regenHealthPerTurn', label: 'PV/t', icon: 'healing', color: '#10b981' },
    { key: 'regenManaPerTurn', label: 'Mana/t', icon: 'cyclone', color: '#38bdf8' },
    { key: 'consumableHpPercent', label: 'PV Max', icon: 'favorite', color: '#ec4899', isPercent: true },
    { key: 'consumableManaPercent', label: 'Mana Max', icon: 'water_drop', color: '#38bdf8', isPercent: true },
    { key: 'consumableMissingHpPercent', label: 'PV Manq', icon: 'healing', color: '#f43f5e', isPercent: true },
    { key: 'consumableMissingManaPercent', label: 'Mana Manq', icon: 'cyclone', color: '#a855f7', isPercent: true }
];

const RARITY_COLORS = {
    COMMUN: '#94a3b8',
    RARE: '#3b82f6',
    LEGENDAIRE: '#f59e0b',
    EPIQUE: '#c084fc',
    RELIQUE: '#ef4444'
};

let shopItems = [];
let itemToBuy = null;
let allAnomalies = [];

function getSpiritualiteColor(sp) {
    if (!sp) return '#cbd5e1';
    switch (sp.toUpperCase()) {
        case 'TENEBRES': return '#a855f7';
        case 'ESPRIT': return '#38bdf8';
        case 'KARMA': return '#e7d198';
        default: return '#cbd5e1';
    }
}

function getLevelColor(lvl) {
    const l = parseInt(lvl) || 1;
    if (l === 1) return '#10b981'; // Vert
    if (l === 2) return '#3b82f6'; // Bleu
    if (l === 3) return '#a855f7'; // Violet
    if (l === 4) return '#f59e0b'; // Or
    if (l >= 5) return '#ef4444'; // Rouge
    return '#10b981';
}

function getTypeColor(isMagic) {
    return isMagic ? '#ec4899' : '#b45309'; // Rose : Marron
}

async function loadShop() {
    try {
        const [resShop, resAno] = await Promise.all([
            fetch('/api/shop/daily'),
            fetch('/api/anomalies/all-templates')
        ]);
        shopItems = await resShop.json();
        if (resAno.ok) {
            allAnomalies = await resAno.json();
        }
        renderShop();
        renderSpecials();
    } catch (e) {
        console.error('Erreur chargement boutique:', e);
        document.getElementById('shopGrid').innerHTML = `<div style="color: #ef4444;"><span class="material-symbols-outlined">error</span> Erreur de connexion.</div>`;
    }
}

function showNotif(message, isError = false) {
    const notif = document.getElementById('shopNotif');
    const text = document.getElementById('shopNotifText');
    text.textContent = message;

    notif.style.background = isError ? '#ef4444' : '#10b981';
    notif.style.boxShadow = isError ? '0 10px 25px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(16, 185, 129, 0.3)';

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(100px)';
    }, 3000);
}

function generateStandHtml(eq) {
    const isPromo = eq.isDiscount;
    const isConsumable = eq.isConsumable;
    const slotInfo = getSlotInfo(eq);

    if (isConsumable && eq.iconId) {
        slotInfo.icon = eq.iconId;
        slotInfo.color = '#c084fc';
    }

    const statsHtml = STAT_DEFS
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            const suffix = s.isPercent ? '%' : '';
            return `<div class="shop-stand-stat ${isMalus ? 'malus' : ''}" title="${s.label}">
                <div style="display: flex; align-items: center; gap: 0.3rem;">
                    <span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size: 0.9rem;">${s.icon}</span>
                    ${s.label}
                </div>
                <span style="font-weight: 600;">${sign}${val}${suffix}</span>
            </div>`;
        }).join('');

    let effectHtml = '';
    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
        const effectLabels = {
            'LIFESTEAL': 'Vol de Vie',
            'THORNS': 'Épines',
            'MANA_SHIELD': 'Bouclier de Mana',
            'CHEAT_DEATH': 'Ange Gardien',
            'CRIT_DAMAGE': 'Dégâts Critiques'
        };
        const label = effectLabels[eq.specialEffect] || eq.specialEffect;
        effectHtml = `<div class="shop-stand-stat" style="background: rgba(168, 85, 247, 0.1); color: #c084fc;">
            <div style="display: flex; align-items: center; gap: 0.3rem;">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">auto_awesome</span>
                ${label}
            </div>
            <span style="font-weight: 600;">${eq.specialEffectValue}</span>
        </div>`;
    }

    const priceStr = eq.shopPrice !== undefined ? (eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1)) : '?';
    const oldPriceStr = eq.originalPrice !== undefined ? (eq.originalPrice % 1 === 0 ? eq.originalPrice : eq.originalPrice.toFixed(1)) : '';

    const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
    const promoBadge = isPromo ? `<div style="position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 8px; font-size: 0.8rem; font-weight: bold; transform: rotate(15deg); box-shadow: 0 4px 6px rgba(0,0,0,0.3);">-20%</div>` : '';
    const oldPriceHtml = isPromo ? `<span style="text-decoration: line-through; color: #ef4444; font-size: 0.8rem; opacity: 0.7;">${oldPriceStr}</span>` : '';

    return `
        <div class="shop-stand" style="${isPromo ? `border: 1px solid ${rarityColor}; box-shadow: 0 0 10px ${rarityColor}40;` : ''}">
            ${promoBadge}
            <span class="material-symbols-outlined shop-stand-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
            <div class="shop-stand-name">${eq.name}</div>
            
            <div class="shop-stand-stats">
                ${!isConsumable ? (statsHtml || '<div style="color:#64748b; font-style:italic; font-size: 0.85rem; margin-top: 0.5rem;">Aucune stat</div>') : ''}
                ${effectHtml}
                ${isConsumable && eq.description ? `<div style="color: #94a3b8; font-size: 0.85rem; font-style: italic; text-align: center; margin-top: 0.5rem;">${eq.description}</div>` : ''}
            </div>
            
            <button class="shop-stand-price" onclick="openBuyModal('${isConsumable ? eq.typeId : eq.id}', ${isConsumable})" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div>${oldPriceHtml} ${priceStr} <span class="material-symbols-outlined" style="font-size: 1.2rem; vertical-align: middle;">monetization_on</span></div>
                ${(() => {
            if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
                let anos = [];
                for (const [n, q] of Object.entries(eq.priceAnomalies)) {
                    let aTemp = allAnomalies.find(a => a.name === n);

                    const CATEGORY_ICONS = {
                        'PIERRE': 'landslide',
                        'METAL': 'hardware',
                        'COEUR': 'favorite',
                        'ORBE': 'lens',
                        'CRISTAL': 'diamond',
                        'PLUME': 'history_edu',
                        'ECAILLE': 'waves',
                        'AUTRE': 'category'
                    };
                    const catIcon = aTemp && aTemp.category ? (CATEGORY_ICONS[aTemp.category] || 'category') : 'star';

                    const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                    const tooltipData = `
                                    <div class="anomaly-tooltip-title">${aTemp ? aTemp.name : n}</div>
                                    <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
                                        <span style="border: 1px solid ${getLevelColor(aTemp ? aTemp.level : 1)}; color: ${getLevelColor(aTemp ? aTemp.level : 1)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                                            Lvl ${aTemp ? aTemp.level || 1 : 1}
                                        </span>
                                        <span style="border: 1px solid ${getTypeColor(aTemp && aTemp.magicObject)}; color: ${getTypeColor(aTemp && aTemp.magicObject)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                                            <span class="material-symbols-outlined" style="font-size: 0.9rem;">${catIcon}</span>
                                            ${aTemp && aTemp.magicObject ? 'Objet Magique' : 'Matériau'}
                                        </span>
                                        ${aTemp && aTemp.spiritualite ?
                            `<span style="border: 1px solid ${getSpiritualiteColor(aTemp.spiritualite)}; color: ${getSpiritualiteColor(aTemp.spiritualite)}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; background: rgba(0,0,0,0.3);">
                                            ${aTemp.spiritualite}
                                        </span>` : ''}
                                    </div>
                                    <div class="anomaly-tooltip-desc">${aTemp && aTemp.description ? aTemp.description : 'Aucune description'}</div>
                            `;
                    anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; color: ${spiriColor};">${catIcon}</span> ${q}
                            </span>`);
                }
                return `<div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 2px;">${anos.join('')}</div>`;
            }
            return '';
        })()}
            </button>
        </div>
    `;
}

function renderShop() {
    const container = document.getElementById('shopGrid');

    // Force the correct class in case HTML is cached
    container.className = 'shop-showcase';

    const dailyItems = shopItems.daily || [];

    if (dailyItems.length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-style: italic;">La boutique est vide aujourd'hui.</div>`;
        return;
    }

    const groups = {
        COMMUN: [],
        RARE: [],
        LEGENDAIRE: [],
        EPIQUE: [],
        RELIQUE: []
    };

    dailyItems.forEach(eq => {
        const rarity = eq.rarity || 'COMMUN';
        if (groups[rarity]) groups[rarity].push(eq);
        else groups['COMMUN'].push(eq);
    });

    const RARITY_LABELS = {
        COMMUN: 'Communs',
        RARE: 'Rare',
        LEGENDAIRE: 'Légendaire',
        EPIQUE: 'Épique',
        RELIQUE: 'Relique'
    };

    let html = '';

    for (const [rarity, items] of Object.entries(groups)) {
        if (items.length === 0) continue;

        html += `
            <div class="shop-rarity-group group-${rarity}">
                <div class="shop-rarity-title">${RARITY_LABELS[rarity]}</div>
        `;

        items.forEach(eq => {
            html += generateStandHtml(eq);
        });

        html += `</div>`;
    }

    container.innerHTML = html;
}

function renderSpecials() {
    const container = document.getElementById('specialsGrid');
    if (!container) return;

    const discountItem = shopItems.discount;
    const consumables = shopItems.consumables || [];

    let html = '';

    if (discountItem) {
        const rarity = discountItem.rarity || 'COMMUN';
        const color = RARITY_COLORS[rarity] || '#ef4444';

        let r = 239, g = 68, b = 68;
        if (color === '#94a3b8') { r = 148; g = 163; b = 184; }
        else if (color === '#3b82f6') { r = 59; g = 130; b = 246; }
        else if (color === '#f59e0b') { r = 245; g = 158; b = 11; }
        else if (color === '#c084fc') { r = 192; g = 132; b = 252; }

        html += `
            <div class="shop-rarity-group" style="border-top: 3px solid ${color}; background: rgba(${r}, ${g}, ${b}, 0.05);">
                <div class="shop-rarity-title" style="color: ${color}; border-color: rgba(${r}, ${g}, ${b}, 0.3);">PROMO DU JOUR</div>
                ${generateStandHtml(discountItem)}
            </div>
        `;
    }

    if (consumables.length > 0) {
        html += `
            <div class="shop-rarity-group" style="border-top: 3px solid #c084fc; background: rgba(192, 132, 252, 0.05);">
                <div class="shop-rarity-title" style="color: #c084fc; border-color: rgba(192, 132, 252, 0.3);">CONSOMABLE</div>
        `;
        consumables.forEach(eq => {
            html += generateStandHtml(eq);
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

window.openBuyModal = function (idOrType, isConsumable = false) {
    let eq = null;

    if (isConsumable) {
        eq = (shopItems.consumables || []).find(e => e.typeId === idOrType);
    } else {
        eq = (shopItems.daily || []).find(e => e.id === parseInt(idOrType));
        if (!eq && shopItems.discount) {
            if (shopItems.discount.id === parseInt(idOrType)) {
                eq = shopItems.discount;
            }
        }
    }

    if (!eq) return;

    itemToBuy = { idOrType, isConsumable, price: eq.shopPrice, priceAnomalies: eq.priceAnomalies };

    document.getElementById('buyTargetName').textContent = eq.name;

    const priceStr = eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1);
    let btnHtml = `<div style="display: flex; align-items: center; gap: 6px; justify-content: center; flex-wrap: wrap;">`;
    btnHtml += `<span>Acheter pour ${priceStr} <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-top: -2px;">monetization_on</span></span>`;
    if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
        let anos = [];
        for (const [n, q] of Object.entries(eq.priceAnomalies)) {
            let aTemp = allAnomalies.find(a => a.name === n);
            const CATEGORY_ICONS = {
                'PIERRE': 'landslide',
                'METAL': 'hardware',
                'COEUR': 'favorite',
                'ORBE': 'lens',
                'CRISTAL': 'diamond',
                'PLUME': 'history_edu',
                'ECAILLE': 'waves',
                'AUTRE': 'category'
            };
            const catIcon = aTemp && aTemp.category ? (CATEGORY_ICONS[aTemp.category] || 'category') : 'star';
            const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
            const tooltipData = `
                    <div class="anomaly-tooltip-title">${aTemp ? aTemp.name : n}</div>
                    <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
                        <span style="border: 1px solid ${getLevelColor(aTemp ? aTemp.level : 1)}; color: ${getLevelColor(aTemp ? aTemp.level : 1)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                            Lvl ${aTemp ? aTemp.level || 1 : 1}
                        </span>
                        <span style="border: 1px solid ${getTypeColor(aTemp && aTemp.magicObject)}; color: ${getTypeColor(aTemp && aTemp.magicObject)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 0.9rem;">${catIcon}</span>
                            ${aTemp && aTemp.magicObject ? 'Objet Magique' : 'Matériau'}
                        </span>
                        ${aTemp && aTemp.spiritualite ?
                    `<span style="border: 1px solid ${getSpiritualiteColor(aTemp.spiritualite)}; color: ${getSpiritualiteColor(aTemp.spiritualite)}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; background: rgba(0,0,0,0.3);">
                            ${aTemp.spiritualite}
                        </span>` : ''}
                    </div>
                    <div class="anomaly-tooltip-desc">${aTemp && aTemp.description ? aTemp.description : 'Aucune description'}</div>
            `;
            anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; color: ${spiriColor};">${catIcon}</span> ${q}
            </span>`);
        }
        btnHtml += `<span style="color: #94a3b8;">+</span> ${anos.join(' ')}`;
    }
    btnHtml += `</div>`;
    document.getElementById('buyConfirmBtn').innerHTML = btnHtml;

    document.getElementById('buyConfirmModal').style.opacity = '1';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'all';
}

window.closeBuyModal = function () {
    document.getElementById('buyConfirmModal').style.opacity = '0';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'none';
    itemToBuy = null;
}

document.getElementById('buyConfirmBtn').addEventListener('click', async () => {
    if (!itemToBuy) return;

    const { idOrType, isConsumable } = itemToBuy;
    closeBuyModal();

    try {
        let url = `/api/shop/buy/${idOrType}`;
        if (isConsumable) {
            url = `/api/shop/buy/consumable/${idOrType}`;
        }

        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotif('Achat réussi !');
            if (window.checkAuthStatus) {
                window.checkAuthStatus(); // Met à jour l'or affiché
            }
        } else {
            showNotif(data.message || 'Erreur lors de l\'achat.', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    loadShop();
});

window.addEventListener('authLoaded', () => {
    const adminLink = document.getElementById('adminShopLink');
    if (adminLink) {
        adminLink.style.display = window.isAdmin ? 'inline-flex' : 'none';
    }
});

window.showTooltipFixed = function (el) {
    let tooltip = document.getElementById('globalFixedTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'globalFixedTooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '999999';
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.transform = 'none';
        tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
        tooltip.style.border = '1px solid rgba(168, 85, 247, 0.5)';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '10px';
        tooltip.style.color = '#f8fafc';
        tooltip.style.fontSize = '0.8rem';
        tooltip.style.lineHeight = '1.4';
        tooltip.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        tooltip.style.maxWidth = 'max-content';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.wordWrap = 'normal';
        tooltip.style.textAlign = 'left';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = el.getAttribute('data-tooltip-html');
    const elColor = el.style.color || '#a855f7';
    tooltip.style.border = '1px solid ' + elColor;
    const titleEl = tooltip.querySelector('.anomaly-tooltip-title');
    if (titleEl) {
        titleEl.style.color = elColor;
        titleEl.style.borderBottom = '1px solid ' + elColor;
    }
    tooltip.style.display = 'block';

    const rect = el.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;

    if (top + tooltip.offsetHeight > window.innerHeight) {
        top = rect.top - tooltip.offsetHeight - 8;
    }
    if (left < 10) left = 10;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltip.offsetWidth - 10;
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
};

window.hideTooltipFixed = function () {
    const tooltip = document.getElementById('globalFixedTooltip');
    if (tooltip) tooltip.style.display = 'none';
};
