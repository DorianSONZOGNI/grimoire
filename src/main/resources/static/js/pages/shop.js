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
    const isPromo = eq.isDiscount === true || eq.discount === true;
    const isConsumable = eq.slot === 'CONSOMMABLE' || eq.isConsumable === true || eq.consumable === true;
    const slotInfo = getSlotInfo(eq);

    if (isConsumable && eq.iconId) {
        slotInfo.icon = eq.iconId;
    }

    let statsHtml = STAT_DEFS
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            const suffix = s.isPercent ? '%' : '';
            return `<div class="shop-stand-stat ${isMalus ? 'malus' : ''}" title="${s.label}">
                <div class="flex-center-gap">
                    <span class="material-symbols-outlined text-sm" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>
                    ${s.label}
                </div>
                <span class="font-bold">${sign}${val}${suffix}</span>
            </div>`;
        }).join('');

    if (isConsumable) {
        const cat = eq.consumableCategory || eq.category;
        if (cat === 'CLE' && eq.specialEffectValue) {
            statsHtml += `<div class="shop-stand-stat" title="Bonus de Butin">
                <div class="flex-center-gap">
                    <span class="material-symbols-outlined text-sm" style="color:#fbbf24;">diamond</span>
                    Butin
                </div>
                <span class="font-bold">+${eq.specialEffectValue}%</span>
            </div>`;
        }

        const weight = eq.weight !== undefined ? eq.weight : (eq._weight !== undefined ? eq._weight : eq.baseWeight);
        if (weight !== undefined && weight !== null && weight >= 0) {
            statsHtml += `<div class="shop-stand-stat" title="Poids">
                <div class="flex-center-gap">
                    <span class="material-symbols-outlined text-sm text-muted">scale</span>
                    Poids
                </div>
                <span class="font-bold">${+Number(weight).toFixed(1)}</span>
            </div>`;
        }
    }

    let effectHtml = '';
    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
        const label = window.EFFECT_LABELS[eq.specialEffect] || eq.specialEffect;
        const isCursed = eq.specialEffect.startsWith('CURSED_');
        const icon = isCursed ? 'skull' : 'auto_awesome';
        const color = isCursed ? '#9b2d2d' : '#c084fc';
        const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

        effectHtml = `<div class="shop-stand-stat ${isCursed ? 'border-cursed' : ''}" style="background: ${bg}; color: ${color};">
            <div class="flex-center-gap">
                <span class="material-symbols-outlined text-sm">${icon}</span>
                ${label}
            </div>
            <span class="font-bold">${eq.specialEffectValue}</span>
        </div>`;
    }

    const priceStr = eq.shopPrice !== undefined ? +Number(eq.shopPrice).toFixed(1) : '?';
    const oldPriceStr = eq.originalPrice !== undefined ? +Number(eq.originalPrice).toFixed(1) : '';

    const rName = getRarityName(eq.rarity);
    let rarityColor = getRarityColor(rName);
    if (rarityColor === '#ef4444' && isConsumable) rarityColor = '#c084fc';
    const promoBadge = isPromo ? `<div class="text-xs font-bold absolute promo-badge">-20%</div>` : '';
    const oldPriceHtml = isPromo ? `<span class="text-xs text-error old-price">${oldPriceStr}</span>` : '';

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

    let promoTimerHtml = '';
    if (isPromo) {
        const expiresAt = pageState.shopItems && pageState.shopItems.promoExpiresAt ? pageState.shopItems.promoExpiresAt : 0;
        promoTimerHtml = `
            <div class="shop-stand-timer promo-countdown" style="color: ${rarityColor};" data-expires="${expiresAt}">
                <span class="material-symbols-outlined">timer</span> <span class="countdown-text">--:--:--</span>
            </div>
        `;
    }

    return `
        <div class="shop-stand" style="${standStyle}">
            ${promoTimerHtml}
            ${promoBadge}
            <span class="material-symbols-outlined shop-stand-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
            <div class="shop-stand-name">${eq.name}</div>
            
            <div class="shop-stand-stats">
                ${statsHtml ? statsHtml : (!isConsumable ? '<div class="text-muted text-sm font-italic mt-2">Aucune stat</div>' : '')}
                ${effectHtml}
                ${eq.description ? `<div class="font-italic text-muted text-center text-sm mt-2">${eq.description}</div>` : ''}
            </div>
            
            <button class="shop-stand-price flex-wrap gap-2" onclick="window.openBuyModal('${eq.id}', ${isConsumable})">
                <div>${oldPriceHtml} ${priceStr} <span class="material-symbols-outlined align-middle icon-md">monetization_on</span></div>
                ${(() => {
            if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
                let anos = [];
                for (const [n, q] of Object.entries(eq.priceAnomalies)) {
                    let aTemp = pageState.allAnomalies.find(a => a.name === n);

                    const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';

                    const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                    const tooltipData = getAnomalyTooltipHTML(aTemp, n);
                    anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined align-middle text-base" style="color: ${spiriColor};">${catIcon}</span> ${q}
                            </span>`);
                }
                return `<div class="flex flex-wrap justify-center gap-1">${anos.join('')}</div>`;
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
                <div class="shop-rarity-title" style="color: ${color}; border-color: rgba(${r}, ${g}, ${b}, 0.3);">EN PROMO</div>
                ${generateStandHtml(discountItem)}
            </div>
        `;
    }

    if (consumables.length > 0) {
        html += `
            <div class="shop-rarity-group border-t-violet bg-violet-light">
                <div class="shop-rarity-title text-violet border-violet-glass">CONSOMABLE</div>
        `;
        consumables.forEach(eq => {
            html += generateStandHtml(eq);
        });
        html += `</div>`;
    }

    container.innerHTML = html;

    if (discountItem) {
        startPromoCountdown();
    }
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
        priceHtml += `<strong class="text-amber-400 inline-flex items-center gap-1">${eq.shopPrice} <span class="material-symbols-outlined align-middle text-md-num text-amber-300">monetization_on</span></strong>`;
    }
    if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
        let anos = [];
        for (const [n, q] of Object.entries(eq.priceAnomalies)) {
            let aTemp = pageState.allAnomalies.find(a => a.name === n);
            const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
            const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';

            const tooltipData = getAnomalyTooltipHTML(aTemp, n);

            anos.push(`<span class="anomaly-badge tooltip-trigger inline-flex items-center gap-1 font-bold cursor-help rounded-md px-2 py-1" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined align-middle text-base" style="color: ${spiriColor};">${catIcon}</span> ${q}x ${n}</span>`);
        }
        if (priceHtml !== '') priceHtml += ` <span class="text-muted mx-1">et</span> `;
        priceHtml += anos.join(' <span class="text-muted mx-1">+</span> ');
    }

    showModal({
        title: 'Acheter cet objet ?',
        body: `Êtes-vous sûr de vouloir acheter <strong class="text-white">${eq.name}</strong> pour <div class="inline-flex items-center justify-center flex-wrap mt-1">${priceHtml}</div> ?`,
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

let promoCountdownInterval = null;

function startPromoCountdown() {
    const countdownEl = document.querySelector('.promo-countdown');
    if (!countdownEl) return;

    const textEl = countdownEl.querySelector('.countdown-text');
    const expiresAtStr = countdownEl.getAttribute('data-expires');
    if (!expiresAtStr || expiresAtStr === '0') {
        textEl.textContent = '--:--:--';
        return;
    }
    const expiresAt = parseInt(expiresAtStr, 10);

    if (promoCountdownInterval) clearInterval(promoCountdownInterval);

    const updateTimer = () => {
        const now = Date.now();
        const diff = expiresAt - now;

        if (diff <= 0) {
            textEl.textContent = '00:00:00';
            clearInterval(promoCountdownInterval);
            loadShop();
            return;
        }

        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);

        textEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    updateTimer();
    promoCountdownInterval = setInterval(updateTimer, 1000);
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

