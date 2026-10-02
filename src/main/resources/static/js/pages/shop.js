// getSlotInfo, RARITY_COLORS, showNotif, showModal → utils.js

const pageState = {
    shopItems: [],
    itemToBuy: null,
    allAnomalies: [],
    shopStatus: null
};



async function loadShop() {
    try {
        const [resShop, resAno, resUserAno, resLevel] = await Promise.all([
            globalFetch(`/api/shop/daily?_t=${Date.now()}`),
            globalFetch('/api/anomalies/all-templates'),
            globalFetch('/api/anomalies'),
            globalFetch('/api/shop/level')
        ]);
        pageState.shopItems = await resShop.json();
        if (resAno.ok) {
            pageState.allAnomalies = await resAno.json();
        }
        if (resUserAno.ok) {
            window.myGlobalAnomalies = await resUserAno.json();
        }
        if (resLevel.ok) {
            pageState.shopStatus = await resLevel.json();
        }
        renderShop();
        renderSpecials();
        renderBlackMarket();
        startPromoCountdown();
        renderUpgradePanel();
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

        const infoIcon = window.getEffectInfoIconHtml ? window.getEffectInfoIconHtml(eq.specialEffect) : '';
        effectHtml = `<div class="shop-stand-stat ${isCursed ? 'border-cursed' : ''}" style="background: ${bg}; color: ${color}; gap: 0.5rem;">
            <div class="flex-center-gap">
                <span class="material-symbols-outlined text-sm">${icon}</span>
                <span>${label} : <span class="font-bold">${eq.specialEffectValue}</span></span>
            </div>
            ${infoIcon}
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
    if (isPromo || eq.isBlackMarket) {
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
            
            ${eq.alreadyOwned ? 
                `<div class="shop-stand-price flex-wrap gap-2" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; cursor: not-allowed; opacity: 0.8;">
                    <span class="material-symbols-outlined align-middle icon-md">remove_shopping_cart</span> Vendu
                </div>`
            : 
                `<button class="shop-stand-price flex-wrap gap-2" onclick="window.openBuyModal('${eq.id}', ${isConsumable})">
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
                </button>`
            }
        </div>
    `;
}

/** Génère le HTML d'un slot cadenas verrouillé */
function generateLockedSlotHtml(slot) {
    return `
        <div class="shop-stand shop-stand--locked">
            <div class="shop-stand-lock-icon">
                <span class="material-symbols-outlined">lock</span>
            </div>
            <div class="shop-stand-name shop-stand-locked-title">${slot.requiredLevel}</div>
            <div class="shop-stand-stats">
                <div class="text-muted text-sm font-italic text-center">${slot.hint}</div>
            </div>
            <div class="shop-stand-price shop-stand-price--locked">
                <span class="material-symbols-outlined align-middle icon-md">lock</span> Verrouillé
            </div>
        </div>
    `;
}

function renderShop() {
    const container = document.getElementById('shopGrid');

    const levelBadge = document.getElementById('shopLevelBadge');
    if (levelBadge && pageState.shopStatus) {
        levelBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1rem;">upgrade</span> Niv. ${pageState.shopStatus.currentLevel}`;
        levelBadge.style.display = 'flex';
    }

    // Force the correct class in case HTML is cached
    container.className = 'shop-showcase';

    const dailyItems = pageState.shopItems.daily || [];
    const lockedSlots = pageState.shopItems.lockedSlots || [];

    if (dailyItems.length === 0 && lockedSlots.length === 0) {
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

    // Slots verrouillés à la fin de la grille
    if (lockedSlots.length > 0) {
        html += `<div class="shop-rarity-group shop-rarity-group--locked">
            <div class="shop-rarity-title shop-rarity-title--locked">Verrouillé</div>`;
        lockedSlots.forEach(slot => {
            html += generateLockedSlotHtml(slot);
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
    } else if (pageState.shopItems.isPromoLocked) {
        const lockedPromoSlot = {
            requiredLevel: "Promo",
            hint: "Améliorez la boutique pour débloquer"
        };
        html += `
            <div class="shop-rarity-group shop-rarity-group--locked">
                <div class="shop-rarity-title shop-rarity-title--locked">EN PROMO</div>
                ${generateLockedSlotHtml(lockedPromoSlot)}
            </div>
        `;
    }

    if (consumables.length > 0) {
        html += `
            <div class="shop-rarity-group border-t-violet bg-violet-light">
                <div class="shop-rarity-title text-violet-500 border-violet-glass">CONSOMABLE</div>
        `;
        consumables.forEach(eq => {
            html += generateStandHtml(eq);
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

/** Rend le panneau quête d'amélioration de la boutique */
function renderUpgradePanel() {
    const panel = document.getElementById('shopUpgradePanel');
    if (!panel) return;

    const status = pageState.shopStatus;
    if (!status) {
        panel.classList.add('is-hidden');
        return;
    }

    // Niveau max = pas de nextLevel
    if (!status.nextLevel) {
        panel.classList.add('is-hidden');
        return;
    }

    panel.classList.remove('is-hidden');

    const requirementsHtml = (status.requirements || []).map(req => {
        const fulfilled = req.fulfilled;
        const color = fulfilled ? '#22c55e' : '#ef4444';
        const progress = `${req.owned}/${req.required}`;

        let labelHtml = '';
        if (req.type === 'GOLD') {
            labelHtml = `${req.required} Or`;
        } else {
            let aTemp = pageState.allAnomalies.find(a => a.name === req.name);
            const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
            const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
            const tooltipData = getAnomalyTooltipHTML(aTemp, req.name);
            labelHtml = `<span class="anomaly-badge tooltip-trigger inline-flex items-center gap-1 font-bold cursor-help rounded-md px-1.5 py-0.5 ml-1" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor}; font-size: 0.8rem;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                <span class="material-symbols-outlined align-middle" style="color: ${spiriColor}; font-size: 1rem;">${catIcon}</span> ${req.required}
            </span>`;
        }

        return `<div class="upgrade-req ${fulfilled ? 'upgrade-req--ok' : 'upgrade-req--nok'}">
            <span class="material-symbols-outlined" style="color: ${color}; font-size: 1rem;">${fulfilled ? 'check_circle' : 'cancel'}</span>
            <span class="upgrade-req-label flex items-center">${labelHtml}</span>
            <span class="upgrade-req-progress">${progress}</span>
        </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="upgrade-panel-header">
            <span class="material-symbols-outlined upgrade-panel-icon">storefront</span>
            <div>
                <div class="upgrade-panel-title">Améliorer la Boutique</div>
                <div class="upgrade-panel-level">Niv. ${status.currentLevel} → Niv. ${status.nextLevel}</div>
            </div>
        </div>
        <div class="upgrade-panel-desc">${status.nextLevelDescription}</div>
        <div class="upgrade-requirements">
            ${requirementsHtml}
        </div>
        <button
            id="upgradeShopBtn"
            class="upgrade-btn ${status.canUpgrade ? 'upgrade-btn--ready' : 'upgrade-btn--locked'}"
            ${status.canUpgrade ? '' : 'disabled'}
            onclick="window.doUpgradeShop()"
        >
            <span class="material-symbols-outlined">${status.canUpgrade ? 'upgrade' : 'lock'}</span>
            ${status.canUpgrade ? 'Améliorer !' : 'Conditions non remplies'}
        </button>
    `;
}

window.doUpgradeShop = async function() {
    const btn = document.getElementById('upgradeShopBtn');
    if (btn) btn.classList.add('is-loading');

    try {
        const res = await globalFetch('/api/shop/upgrade', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showNotif(data.message || 'Boutique améliorée !');
            if (window.checkAuthStatus) window.checkAuthStatus();
            await loadShop();
        } else {
            showNotif(data.error || 'Erreur lors de l\'amélioration.', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    } finally {
        const btnAfter = document.getElementById('upgradeShopBtn');
        if (btnAfter) btnAfter.classList.remove('is-loading');
    }
};

window.updateBuyModalPrice = function() {
    let eq = window.currentBuyItem;
    if (!eq) return;
    let qtyInput = document.getElementById('buyQuantityInput');
    if (!qtyInput) return;

    let maxQty = 99;
    if (eq.shopPrice > 0 && window.currentUser && window.currentUser.monnaie !== undefined) {
        maxQty = Math.floor(window.currentUser.monnaie / eq.shopPrice);
        if (maxQty > 99) maxQty = 99;
        if (maxQty < 1) maxQty = 1;
    }

    let qty = parseInt(qtyInput.value, 10) || 1;
    if (qty > maxQty && parseInt(qtyInput.value, 10) > maxQty) {
        qty = maxQty;
        qtyInput.value = qty;
    }
    if (qty < 1) {
        qty = 1;
        qtyInput.value = qty;
    }
    
    let priceHtml = ``;
    if (eq.shopPrice !== undefined && eq.shopPrice > 0) {
        priceHtml += `<strong class="text-amber-400 inline-flex items-center gap-1">${eq.shopPrice * qty} <span class="material-symbols-outlined align-middle text-md-num text-amber-300">monetization_on</span></strong>`;
    }
    if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
        let anos = [];
        for (const [n, q] of Object.entries(eq.priceAnomalies)) {
            let aTemp = pageState.allAnomalies.find(a => a.name === n);
            const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
            const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
            const tooltipData = getAnomalyTooltipHTML(aTemp, n);
            anos.push(`<span class="anomaly-badge tooltip-trigger inline-flex items-center gap-1 font-bold cursor-help rounded-md px-2 py-1" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor};" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined align-middle text-base" style="color: ${spiriColor};">${catIcon}</span> ${q * qty}x ${n}</span>`);
        }
        if (priceHtml !== '') priceHtml += ` <span class="text-muted mx-1">et</span> `;
        priceHtml += anos.join(' <span class="text-muted mx-1">+</span> ');
    }
    const container = document.getElementById('buyPriceContainer');
    if (container) {
        container.innerHTML = priceHtml;
    }
};

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
        if (!eq && pageState.shopItems.blackMarket) {
            if (pageState.shopItems.blackMarket.id === parseInt(id)) {
                eq = pageState.shopItems.blackMarket;
            }
        }
    }

    if (!eq) return;
    window.currentBuyItem = eq;

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

    let qtyInputHtml = ``;
    if (isConsumable) {
        qtyInputHtml = `
            <div class="mt-4 flex items-center justify-center gap-3">
                <label for="buyQuantityInput" style="color: var(--text-muted);">Quantité :</label>
                <input type="number" id="buyQuantityInput" value="1" min="1" max="99" oninput="if(window.updateBuyModalPrice) window.updateBuyModalPrice();" style="background: var(--bg-surface-light, #1e293b); color: white; border: 1px solid var(--border-color, #334155); border-radius: 4px; padding: 4px 8px; width: 60px; text-align: center; outline: none;">
            </div>
        `;
    }

    showModal({
        title: 'Acheter cet objet ?',
        body: `Êtes-vous sûr de vouloir acheter <strong class="text-white">${eq.name}</strong> pour <div class="inline-flex items-center justify-center flex-wrap mt-1" id="buyPriceContainer">${priceHtml}</div> ?${qtyInputHtml}`,
        icon: 'shopping_cart',
        confirmText: 'Oui, acheter',
        onConfirm: async () => {
            try {
                let qty = 1;
                const qtyInput = document.getElementById('buyQuantityInput');
                if (qtyInput) {
                    qty = parseInt(qtyInput.value, 10) || 1;
                    if (qty < 1) qty = 1;
                }
                
                let url = `/api/shop/buy/${id}?quantity=${qty}`;
                const res = await globalFetch(url, { method: 'POST' });
                const data = await res.json();

                if (res.ok) {
                    showNotif('Achat réussi !');
                    if (window.checkAuthStatus) {
                        window.checkAuthStatus(); // Met à jour l'or affiché
                    }
                    loadShop(); // Met à jour l'affichage de la boutique (boutons Vendu)
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
    const countdownEls = document.querySelectorAll('.promo-countdown');
    if (!countdownEls || countdownEls.length === 0) return;

    if (promoCountdownInterval) clearInterval(promoCountdownInterval);

    const updateTimer = () => {
        const now = Date.now();
        
        let allExpired = true;

        countdownEls.forEach(countdownEl => {
            const textEl = countdownEl.querySelector('.countdown-text');
            const expiresAtStr = countdownEl.getAttribute('data-expires');
            if (!expiresAtStr || expiresAtStr === '0') {
                if (textEl) textEl.textContent = '--:--:--';
                return;
            }
            const expiresAt = parseInt(expiresAtStr, 10);
            const diff = expiresAt - now;

            if (diff <= 0) {
                if (textEl) textEl.textContent = '00:00:00';
            } else {
                allExpired = false;
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);

                if (textEl) textEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        });

        if (allExpired && countdownEls.length > 0) {
            clearInterval(promoCountdownInterval);
            loadShop();
        }
    };

    updateTimer();
    promoCountdownInterval = setInterval(updateTimer, 1000);
}

window.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
    // Attend que auth soit chargé pour fetch loadShop
});

function renderBlackMarket() {
    let container = document.getElementById('blackMarketContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'blackMarketContainer';
        container.style.position = 'fixed';
        container.style.left = '10px';
        container.style.top = '50%';
        container.style.transform = 'translateY(-50%) scale(0.85)';
        container.style.transformOrigin = 'left center';
        container.style.zIndex = '50';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    if (!pageState.shopItems || !pageState.shopItems.isBlackMarketActive) {
        container.innerHTML = '';
        return;
    }

    const { isBlackMarketLocked, blackMarket } = pageState.shopItems;

    let html = `<div style="text-align:center; font-family:'Cinzel',serif; color:#ef4444; text-shadow:0 0 10px rgba(239,68,68,0.5); font-weight:bold; margin-bottom:5px; font-size:1.2rem; letter-spacing:2px;">Marché Noir</div>`;

    if (isBlackMarketLocked) {
        html += generateLockedSlotHtml({ requiredLevel: "Marché Noir", hint: "Débloquez-le via les améliorations de boutique" });
    } else if (blackMarket) {
        blackMarket.isBlackMarket = true;
        // Appliquer un style spécifique pour le marché noir (rouge sombre / ombres rouges)
        let standHtml = generateStandHtml(blackMarket);
        standHtml = standHtml.replace('class="shop-stand"', 'class="shop-stand" style="border-color: #7f1d1d !important; box-shadow: 0 0 15px rgba(220,38,38,0.3) !important; background: linear-gradient(135deg, rgba(127,29,29,0.2) 0%, rgba(127,29,29,0.05) 100%) !important;"');
        html += standHtml;
    }

    container.innerHTML = html;
}

window.addEventListener('authLoaded', () => {
    loadShop();
    const adminLink = document.getElementById('adminShopLink');
    if (adminLink) {
        adminLink.style.display = window.isAdmin ? 'inline-flex' : 'none';
    }
});
