// getSlotInfo, RARITY_COLORS, showNotif, showModal → utils.js

const pageState = {
    shopItems: [],
    itemToBuy: null,
    allAnomalies: []
};



async function loadShop() {
    try {
        const [resShop, resAno] = await Promise.all([
            globalFetch('/api/shop/daily'),
            globalFetch('/api/anomalies/all-templates')
        ]);
        pageState.shopItems = await resShop.json();
        if (resAno.ok) {
            pageState.allAnomalies = await resAno.json();
        }
        renderShop();
        renderSpecials();
    } catch (e) {
        console.error('Erreur chargement boutique:', e);
        document.getElementById('shopGrid').innerHTML = `<div class="text-error"><span class="material-symbols-outlined">error</span> Erreur de connexion.</div>`;
    }
}


function generateStandHtml(eq) {
    const isPromo = eq.isDiscount;
    const isConsumable = eq.isConsumable;
    const slotInfo = getSlotInfo(eq);

    if (isConsumable && eq.iconId) {
        slotInfo.icon = eq.iconId;
    }

    const statsHtml = STAT_DEFS
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            const suffix = s.isPercent ? '%' : '';
            return `<div class="shop-stand-stat ${isMalus ? 'malus' : ''}" title="${s.label}">
                <div class="flex-center" style="gap: 0.3rem;">
                    <span class="material-symbols-outlined text-sm" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>
                    ${s.label}
                </div>
                <span style="font-weight: 600;">${sign}${val}${suffix}</span>
            </div>`;
        }).join('');

    let effectHtml = '';
    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
        const label = window.EFFECT_LABELS[eq.specialEffect] || eq.specialEffect;
        const isCursed = eq.specialEffect.startsWith('CURSED_');
        const icon = isCursed ? 'skull' : 'auto_awesome';
        const color = isCursed ? '#9b2d2d' : '#c084fc';
        const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

        effectHtml = `<div class="shop-stand-stat" style="background: ${bg}; color: ${color}; ${isCursed ? 'border: 1px solid rgba(156, 163, 175, 0.2);' : ''}">
            <div class="flex-center" style="gap: 0.3rem;">
                <span class="material-symbols-outlined text-sm">${icon}</span>
                ${label}
            </div>
            <span style="font-weight: 600;">${eq.specialEffectValue}</span>
        </div>`;
    }

    const priceStr = eq.shopPrice !== undefined ? (eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1)) : '?';
    const oldPriceStr = eq.originalPrice !== undefined ? (eq.originalPrice % 1 === 0 ? eq.originalPrice : eq.originalPrice.toFixed(1)) : '';

    const rName = getRarityName(eq.rarity);
    let rarityColor = getRarityColor(rName);
    if (rarityColor === '#ef4444' && isConsumable) rarityColor = '#c084fc';
    const promoBadge = isPromo ? `<div class="text-xs font-bold absolute" style="top: -10px; right: -10px; background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 8px; transform: rotate(15deg); box-shadow: 0 4px 6px rgba(0,0,0,0.3);">-20%</div>` : '';
    const oldPriceHtml = isPromo ? `<span class="text-xs text-error" style="text-decoration: line-through; opacity: 0.7;">${oldPriceStr}</span>` : '';

    let isHighRarity = !isConsumable && (rName !== 'COMMUN' && rName !== 'INHABITUEL');

    // Calculate RGB values for gradient
    let r = 239, g = 68, b = 68;
    if (rarityColor === '#94a3b8') { r = 148; g = 163; b = 184; }
    else if (rarityColor === '#22c55e') { r = 34; g = 197; b = 94; }
    else if (rarityColor === '#3b82f6') { r = 59; g = 130; b = 246; }
    else if (rarityColor === '#f97316') { r = 249; g = 115; b = 22; }
    else if (rarityColor === '#eab308') { r = 234; g = 179; b = 8; }
    else if (rarityColor === '#f59e0b') { r = 245; g = 158; b = 11; }
    else if (rarityColor === '#ef4444') { r = 239; g = 68; b = 68; }
    else if (rarityColor === '#a855f7') { r = 168; g = 85; b = 247; }
    else if (rarityColor === '#7f1d1d') { r = 127; g = 29; b = 29; }
    else if (rarityColor === '#555555') { r = 85; g = 85; b = 85; }

    let standStyle = '';
    if (isPromo) {
        standStyle = `border: 2px solid ${rarityColor}; box-shadow: 0 0 10px ${rarityColor}40; background: linear-gradient(135deg, rgba(${r},${g},${b},0.15) 0%, rgba(${r},${g},${b},0.05) 100%);`;
    } else if (isHighRarity) {
        standStyle = `border: 1px solid ${rarityColor}; box-shadow: 0 0 5px ${rarityColor}20; background: linear-gradient(135deg, rgba(${r},${g},${b},0.15) 0%, rgba(${r},${g},${b},0.05) 100%);`;
    }

    return `
        <div class="shop-stand" style="${standStyle}">
            ${promoBadge}
            <span class="material-symbols-outlined shop-stand-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
            <div class="shop-stand-name">${eq.name}</div>
            
            <div class="shop-stand-stats">
                ${statsHtml ? statsHtml : (!isConsumable ? '<div style="color:#64748b; font-style:italic; font-size: 0.85rem; margin-top: 0.5rem;">Aucune stat</div>' : '')}
                ${effectHtml}
                ${eq.description ? `<div class="font-italic text-muted text-center" style="font-size: 0.85rem; margin-top: 0.5rem;">${eq.description}</div>` : ''}
            </div>
            
            <button class="shop-stand-price" onclick="window.openBuyModal('${eq.id}', ${isConsumable})" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div>${oldPriceHtml} ${priceStr} <span class="material-symbols-outlined align-middle" style="font-size: 1.2rem;">monetization_on</span></div>
                ${(() => {
            if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
                let anos = [];
                for (const [n, q] of Object.entries(eq.priceAnomalies)) {
                    let aTemp = pageState.allAnomalies.find(a => a.name === n);

                    const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';

                    const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                    const tooltipData = getAnomalyTooltipHTML(aTemp, n);
                    anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined align-middle" style="font-size: 1rem; color: ${spiriColor};">${catIcon}</span> ${q}
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

    const dailyItems = pageState.shopItems.daily || [];

    if (dailyItems.length === 0) {
        container.innerHTML = `<div class="font-italic text-muted">La boutique est vide aujourd'hui.</div>`;
        return;
    }

    const groups = {
        COMMUN: [],
        INHABITUEL: [],
        RARE: [],
        MYTHIQUE: [],
        LEGENDAIRE: [],
        EPIQUE: [],
        RELIQUE: [],
        MAUDIT: []
    };

    dailyItems.forEach(eq => {
        const rarityObj = eq.rarity;
        const rarity = (typeof rarityObj === 'object' ? rarityObj?.name : rarityObj) || 'COMMUN';
        if (groups[rarity]) groups[rarity].push(eq);
        else groups['COMMUN'].push(eq);
    });

    const RARITY_LABELS = {
        COMMUN: 'Communs',
        INHABITUEL: 'Inhabituel',
        RARE: 'Rare',
        MYTHIQUE: 'Mythique',
        LEGENDAIRE: 'Légendaire',
        EPIQUE: 'Épique',
        RELIQUE: 'Relique',
        MAUDIT: 'Maudit'
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

    const discountItem = pageState.shopItems.discount;
    const consumables = pageState.shopItems.consumables || [];

    let html = '';

    if (discountItem) {
        const rarity = discountItem.rarity || 'COMMUN';
        const color = getRarityColor(rarity);

        let r = 239, g = 68, b = 68;
        if (color === '#94a3b8') { r = 148; g = 163; b = 184; }
        else if (color === '#22c55e') { r = 34; g = 197; b = 94; }
        else if (color === '#3b82f6') { r = 59; g = 130; b = 246; }
        else if (color === '#f97316') { r = 249; g = 115; b = 22; }
        else if (color === '#eab308') { r = 234; g = 179; b = 8; }
        else if (color === '#f59e0b') { r = 245; g = 158; b = 11; }
        else if (color === '#ef4444') { r = 239; g = 68; b = 68; }
        else if (color === '#a855f7') { r = 168; g = 85; b = 247; }
        else if (color === '#7f1d1d') { r = 127; g = 29; b = 29; }
        else if (color === '#555555') { r = 85; g = 85; b = 85; }

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

window.openBuyModal = function (id, isConsumable = false) {
    let eq = null;

    if (isConsumable) {
        eq = (pageState.shopItems.consumables || []).find(e => e.id === parseInt(id));
    } else {
        eq = (pageState.shopItems.daily || []).find(e => e.id === parseInt(id));
        if (!eq && pageState.shopItems.discount) {
            if (pageState.shopItems.discount.id === parseInt(id)) {
                eq = pageState.shopItems.discount;
            }
        }
    }

    if (!eq) return;

    let priceHtml = ``;
    if (eq.shopPrice !== undefined && eq.shopPrice > 0) {
        priceHtml += `<strong style="color:#fbbf24; display: inline-flex; align-items: center; gap: 0.2rem;">${eq.shopPrice} <span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; color:#fcd34d;">monetization_on</span></strong>`;
    }
    if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
        let anos = [];
        for (const [n, q] of Object.entries(eq.priceAnomalies)) {
            let aTemp = pageState.allAnomalies.find(a => a.name === n);
            const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
            const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
            
            const tooltipData = getAnomalyTooltipHTML(aTemp, n);
            
            anos.push(`<span class="anomaly-badge tooltip-trigger" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor}; padding: 0.2rem 0.4rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 600; cursor: help;" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined align-middle" style="font-size: 1rem; color: ${spiriColor};">${catIcon}</span> ${q}x ${n}</span>`);
        }
        if (priceHtml !== '') priceHtml += ` <span class="text-muted" style="margin: 0 0.4rem;">et</span> `;
        priceHtml += anos.join(' <span class="text-muted" style="margin: 0 0.4rem;">+</span> ');
    }

    showModal({
        title: 'Acheter cet objet ?',
        body: `Êtes-vous sûr de vouloir acheter <strong style="color:#fff;">${eq.name}</strong> pour <div style="display:inline-flex; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:0.3rem;">${priceHtml}</div> ?`,
        icon: 'shopping_cart',
        confirmText: 'Oui, acheter',
        onConfirm: async () => {
            try {
                let url = `/api/shop/buy/${id}`;
                const res = await globalFetch(url, { method: 'POST' });
                const data = await res.json();

                if (res.ok) {
                    showNotif('Achat réussi !');
                    if (window.checkAuthStatus) {
                        window.checkAuthStatus(); // Met à jour l'or affiché
                    }
                } else {
                    showNotif(data.message || "Erreur lors de l'achat.", true);
                }
            } catch (e) {
                if (e.message && e.message !== 'Failed to fetch') {
                    showNotif(e.message, true);
                } else {
                    showNotif('Erreur réseau.', true);
                }
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
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



