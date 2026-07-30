const pageState = { allEquipments: [], equipmentToDelete: null, editingEquipmentId: null };

// Replaced by window.SLOT_LABELS
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



function calculateWeight(eq) {
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

    const rarity = eq.rarity;
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

async function showNotif(message, isError = false) {
    const ui = await import('/js/ui.js');
    ui.showNotif(message, isError);
}

async function showModal(options) {
    const ui = await import('/js/ui.js');
    return ui.showModal(options);
}

// ===== Custom Select Logic =====
document.addEventListener('click', (e) => {
    // Fermer les dropdowns
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }

    const trigger = e.target.closest('.custom-select-trigger');
    if (trigger) {
        const wrapper = trigger.closest('.custom-select-wrapper');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
        return;
    }

    const option = e.target.closest('.custom-option');
    if (option) {
        const wrapper = option.closest('.custom-select-wrapper');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const labelEl = wrapper.querySelector('.cs-label');

        hiddenInput.value = option.getAttribute('data-value');
        labelEl.innerHTML = option.innerHTML;
        wrapper.classList.remove('open');

        if (hiddenInput.id === 'eqRarity') {
            const val = hiddenInput.value;
            const row = document.getElementById('eqSpecialEffectRow');
            if (val === 'EPIQUE' || val === 'RELIQUE' || val === 'MAUDIT') {
                row.style.display = 'grid';
                const isEpic = val === 'EPIQUE';
                const isMaudit = val === 'MAUDIT';
                let color = isEpic ? '#ef4444' : '#a855f7';
                let bg = isEpic ? 'rgba(239, 68, 68, 0.05)' : 'rgba(168, 85, 247, 0.05)';
                let border = isEpic ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px dashed rgba(168, 85, 247, 0.3)';
                let inputBorder = isEpic ? 'rgba(239, 68, 68, 0.3)' : 'rgba(168, 85, 247, 0.3)';
                if (isMaudit) {
                    color = '#555555';
                    bg = 'rgba(85, 85, 85, 0.05)';
                    border = '1px dashed rgba(85, 85, 85, 0.3)';
                    inputBorder = 'rgba(85, 85, 85, 0.3)';
                }

                row.style.background = bg;
                row.style.border = border;
                document.getElementById('eqSpecialEffectLabelTitle').style.color = color;
                document.getElementById('eqSpecialEffectValueTitle').style.color = color;
                document.getElementById('eqSpecialEffectTrigger').style.borderColor = inputBorder;
                document.getElementById('eqSpecialEffectValue').style.borderColor = inputBorder;

                const effectOptions = document.querySelectorAll('#eqSpecialEffectOptions .custom-option');
                effectOptions.forEach(opt => {
                    const effectVal = opt.getAttribute('data-value');
                    if (effectVal === 'NONE') {
                        opt.style.display = 'block';
                    } else if (isMaudit) {
                        opt.style.display = effectVal.startsWith('CURSED_') ? 'block' : 'none';
                    } else {
                        opt.style.display = effectVal.startsWith('CURSED_') ? 'none' : 'block';
                    }
                });

                const currentEffect = document.getElementById('eqSpecialEffect').value;
                if ((isMaudit && !currentEffect.startsWith('CURSED_') && currentEffect !== 'NONE') ||
                    (!isMaudit && currentEffect.startsWith('CURSED_'))) {
                    document.getElementById('eqSpecialEffect').value = 'NONE';
                    document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">not_interested</span> Aucun';
                    document.getElementById('eqSpecialEffectValue').value = 0;
                }
            } else {
                row.style.display = 'none';
                document.getElementById('eqSpecialEffect').value = 'NONE';
                document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">not_interested</span> Aucun';
                document.getElementById('eqSpecialEffectValue').value = 0;
            }
            updateWeightUI();
        } else if (hiddenInput.id.startsWith('eq') || hiddenInput.id === 'eqSpecialEffect') {
            updateWeightUI();
        } else {
            renderVault(); // Mettre à jour l'affichage au changement
        }
    }
});

// ===== API =====
async function loadEquipments() {
    try {
        const res = await globalFetch('/api/shop/templates');
        if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
                document.getElementById('vaultGrid').innerHTML = `<div class="text-error"><span class="material-symbols-outlined">error</span> Accès refusé.</div>`;
            }
            return;
        }
        pageState.allEquipments = await res.json();
        pageState.allEquipments.forEach(eq => {
            eq._weight = calculateWeight(eq);
        });
        renderVault();
    } catch (e) {
        console.error('Erreur chargement équipements:', e);
        document.getElementById('vaultGrid').innerHTML = `<div class="vault-empty-state text-error"><span class="material-symbols-outlined">error</span>Erreur de connexion.</div>`;
    }
}





async function loadAnomalies() {
    try {
        const res = await globalFetch('/api/anomalies/all-templates');
        if (res.ok) {
            let data = await res.json();
            window.allAnomalies = data.sort((a, b) => {
                const spiriA = a.spiritualite || 'ZZZ';
                const spiriB = b.spiritualite || 'ZZZ';
                if (spiriA !== spiriB) return spiriA.localeCompare(spiriB);

                const lvlA = a.level || 1;
                const lvlB = b.level || 1;
                if (lvlA !== lvlB) return lvlA - lvlB;

                return a.name.localeCompare(b.name);
            });
        }
    } catch (e) {
        console.error('Erreur chargement anomalies:', e);
    }
}

function addAnomalyRow(selectedName = '', qty = 1) {
    const container = document.getElementById('priceAnomaliesContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'anomaly-price-row';
    row.style.display = 'flex';
    row.style.gap = '0.5rem';
    row.style.alignItems = 'center';

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

    let optionsHtml = '';
    (window.allAnomalies || []).forEach(n => {
        const catIcon = n.category ? (CATEGORY_ICONS[n.category] || 'category') : 'star';
        const spiriColor = n.spiritualite ? getSpiritualiteColor(n.spiritualite) : '#a855f7';
        optionsHtml += `<div class="custom-option" data-value="${n.name}">
                            <span class="material-symbols-outlined cs-icon" style="color: ${spiriColor};">${catIcon}</span>
                            ${n.name} (Niv. ${n.level || 1})
                        </div>`;
    });

    let displayLabel = 'Choisir une anomalie...';
    if (selectedName) {
        const selA = (window.allAnomalies || []).find(a => a.name === selectedName);
        if (selA) {
            const catIcon = selA.category ? (CATEGORY_ICONS[selA.category] || 'category') : 'star';
            const spiriColor = selA.spiritualite ? getSpiritualiteColor(selA.spiritualite) : '#a855f7';
            displayLabel = `<span class="material-symbols-outlined cs-icon" style="color: ${spiriColor};">${catIcon}</span> ${selectedName} (Niv. ${selA.level || 1})`;
        } else {
            displayLabel = `<span class="material-symbols-outlined cs-icon" style="color: #a855f7;">star</span> ${selectedName}`;
        }
    }

    row.innerHTML = `
        <div class="custom-select-wrapper" style="flex: 1;">
            <div class="custom-select-trigger flex-between" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.6rem; cursor: pointer; align-items: center; width: 100%;">
                <span class="cs-label flex-center" style="color: #cbd5e1; font-size: 0.85rem; gap: 0.3rem;">${displayLabel}</span>
                <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
            </div>
            <div class="custom-select-options custom-options" style="max-height: 150px; overflow-y: auto;">
                ${optionsHtml}
            </div>
            <input type="hidden" class="anomaly-select-hidden" value="${selectedName}">
        </div>
        <div class="flex-center" style="gap: 0.3rem;">
            <span class="text-xs text-muted">Qté:</span>
            <input type="number" class="anomaly-qty-input" value="${qty}" min="1" style="width: 60px; padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: 'Outfit', sans-serif;">
        </div>
        <button type="button" class="btn-remove-row" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 6px; cursor: pointer; padding: 0.4rem; display: flex; justify-content: center; align-items: center;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">delete</span>
        </button>
    `;

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        row.remove();
    });

    container.appendChild(row);
}



function deleteEquipment(id) {
    const eq = pageState.allEquipments.find(e => e.id === id);
    if (!eq) return;

    const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);
    
    showModal({
        title: "Détruire l'équipement ?",
        body: `Voulez-vous vraiment détruire l'équipement <strong style="color:#fff;">${eq.name}</strong> ?<br><br>Cette action est définitive (pour la template de la boutique).`,
        icon: 'warning',
        confirmText: `Oui, détruire`,
        onConfirm: async () => {
            try {
                const res = await globalFetch(`/api/shop/templates/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showNotif('Équipement détruit.');
                    await loadEquipments();
                    if (window.checkAuthStatus) window.checkAuthStatus();
                } else {
                    showNotif('Erreur lors de la suppression.', true);
                }
            } catch (e) {
                showNotif('Erreur réseau.', true);
            }
        }
    });
}

// ===== Rendu =====
function renderVault() {
    // Sort allEquipments: rarity order, then slot, then name
    const rarityOrder = { 'MAUDIT': -1, 'RELIQUE': 0, 'EPIQUE': 1, 'LEGENDAIRE': 2, 'MYTHIQUE': 3, 'RARE': 4, 'INHABITUEL': 5, 'COMMUN': 6 };
    const slotOrder = { 'CASQUE': 1, 'PLASTRON': 2, 'ARME_DEUX_MAINS': 3, 'ARME_GAUCHE': 4, 'ARME_DROITE': 5, 'ANNEAU_GAUCHE': 6, 'ANNEAU_DROIT': 7, 'BOTTES': 8, 'CAPE': 9, 'CONSOMMABLE': 10 };

    let sorted = [...pageState.allEquipments].sort((a, b) => {
        const rNameA = typeof a.rarity === 'object' ? a.rarity?.name : a.rarity;
        const rNameB = typeof b.rarity === 'object' ? b.rarity?.name : b.rarity;
        const rA = rarityOrder[rNameA || 'COMMUN'] ?? 100;
        const rB = rarityOrder[rNameB || 'COMMUN'] ?? 100;
        if (rA !== rB) return rA - rB;

        const sNameA = typeof (a.slot?.name || a.slot) === 'object' ? a.slot?.name : a.slot;
        const sNameB = typeof (b.slot?.name || b.slot) === 'object' ? b.slot?.name : b.slot;
        const sA = slotOrder[sNameA] || 99;
        const sB = slotOrder[sNameB] || 99;
        if (sA !== sB) return sA - sB;

        return a.name.localeCompare(b.name);
    });

    renderGrid(sorted);
}

function renderGrid(equipments) {
    const container = document.getElementById('vaultGrid');

    if (equipments.length === 0) {
        container.innerHTML = `
            <div class="vault-empty-state">
                <span class="material-symbols-outlined opacity-50" style="font-size: 3rem;">search_off</span>
                Aucun objet ne correspond à votre recherche.
            </div>`;
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

    equipments.forEach(eq => {
        const rarityObj = eq.rarity;
        const rarity = (typeof rarityObj === 'object' ? rarityObj?.name : rarityObj) || 'COMMUN';
        if (groups[rarity]) {
            groups[rarity].push(eq);
        } else {
            groups['COMMUN'].push(eq);
        }
    });

    const RARITY_LABELS = {
        COMMUN: { label: 'Commun', icon: 'lens' },
        INHABITUEL: { label: 'Inhabituel', icon: 'radio_button_unchecked' },
        RARE: { label: 'Rare', icon: 'adjust' },
        MYTHIQUE: { label: 'Mythique', icon: 'star_half' },
        LEGENDAIRE: { label: 'Légendaire', icon: 'workspace_premium' },
        EPIQUE: { label: 'Épique', icon: 'whatshot' },
        RELIQUE: { label: 'Relique', icon: 'webhook' },
        MAUDIT: { label: 'Maudit', icon: 'skull' }
    };

    let html = '';

    for (const [rarity, items] of Object.entries(groups)) {
        const rarityInfo = RARITY_LABELS[rarity];

        html += `
            <div class="shop-admin-section">
                <div class="shop-admin-header rarity-${rarity}">
                    <span class="material-symbols-outlined" style="font-size: 1.3rem;">${rarityInfo.icon}</span>
                    ${rarityInfo.label}
                </div>
                <div class="shop-admin-list">
        `;

        if (items.length === 0) {
            html += `<div class="font-italic text-center" style="padding: 1rem; color: #64748b;">Aucun article dans cette rareté</div>`;
        } else {
            items.forEach(eq => {
                const slotInfo = getSlotInfo(eq);

                const statsHtml = STAT_DEFS
                    .filter(s => eq[s.key] && eq[s.key] !== 0)
                    .map(s => {
                        const val = eq[s.key];
                        const isMalus = val < 0;
                        const sign = val > 0 ? '+' : '';
                        const suffix = s.isPercent ? '%' : '';
                        return `<span class="stat-badge ${isMalus ? 'malus' : ''}" title="${s.label}">
                        <span class="material-symbols-outlined text-xs" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>
                        ${sign}${val}${suffix}
                    </span>`;
                    }).join('');

                let effectHtml = '';
                if (eq.specialEffect && eq.specialEffect !== 'NONE') {
                    const effectLabels = {
                        'LIFESTEAL': 'Vol de Vie',
                        'THORNS': 'Épines',
                        'MANA_SHIELD': 'Bouclier de Mana',
                        'CHEAT_DEATH': 'Ange Gardien',
                        'CRIT_DAMAGE': 'Dégâts Critiques',
                        'CURSED_MANA_DRAIN': 'Famine (Drain Mana)',
                        'CURSED_HP_LOSS_ON_MANA': 'Brèche spirituelle (- hp % en mana Act.)',
                        'CURSED_MAGIC_DAMAGE_REDUCTION': 'Folie (% dégâts magique -)',
                        'CURSED_PHYSICAL_DAMAGE_REDUCTION': 'Faiblesse (% dégâts physique -)',
                        'CURSED_VULNERABILITY': 'Vulnérabilité (Dégâts subis % +)',
                        'CURSED_HEALING_REDUCTION': 'Chair putréfiée (Soins % -)',
                        'EXECUTION': 'Exécution (% Phy)',
                        'MAGIC_OVERLOAD': 'Surcharge (% Mag mana Act)'
                    };
                    const label = effectLabels[eq.specialEffect] || eq.specialEffect;
                    const isCursed = eq.specialEffect.startsWith('CURSED_');
                    const icon = isCursed ? 'skull' : 'auto_awesome';
                    const color = isCursed ? '#9b2d2d' : '#c084fc';
                    const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

                    effectHtml = `<span class="stat-badge" style="background: ${bg}; color: ${color}; ${isCursed ? 'border: 1px solid rgba(156, 163, 175, 0.2);' : ''}">
                    <span class="material-symbols-outlined text-xs">${icon}</span>
                    ${label} : ${eq.specialEffectValue}
                </span>`;
                }

                const displayPrice = eq.shopPrice !== undefined ? (eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1)) : calculateShopPrice(eq._weight || 0, rarity || 'COMMUN', eq.slot);

                html += `
                <div class="shop-admin-row">
                    <div class="shop-admin-row-name">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.4rem; color: ${slotInfo.color};" title="${slotInfo.label}">${slotInfo.icon}</span>
                        ${eq.name}
                        ${window.isAdmin && eq.ownerUsername ? `<span class="text-xxs" style="padding: 0.15rem 0.4rem; background: ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${eq.ownerUsername === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined align-middle" style="font-size: 0.7rem; margin-right: 2px;">account_circle</span>${eq.ownerUsername}</span>` : ''}
                    </div>
                    
                    <div class="shop-admin-row-stats">
                        ${statsHtml || '<span style="color:#64748b; font-style:italic;">Aucune stat</span>'}
                        ${effectHtml}
                    </div>

                    <div class="shop-admin-row-price">
                        ${(() => {
                        let priceHtml = `${displayPrice} <span class="material-symbols-outlined" style="font-size: 1.1rem;">monetization_on</span>`;
                        if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
                            let anos = [];
                            for (const [n, q] of Object.entries(eq.priceAnomalies)) {
                                let aTemp = window.allAnomalies ? window.allAnomalies.find(a => a.name === n) : null;
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
                                            <div class="anomaly-tooltip-title" style="color: ${spiriColor}; border-bottom: 1px solid ${spiriColor}40; padding-bottom: 4px;"><span class="material-symbols-outlined" style="font-size: 1rem; margin-right: 4px;">${catIcon}</span>${aTemp ? aTemp.name : n}</div>
                                            <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
                                                <span class="font-bold" style="border: 1px solid ${getLevelColor(aTemp ? aTemp.level : 1)}; color: ${getLevelColor(aTemp ? aTemp.level : 1)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                                                    Lvl ${aTemp ? aTemp.level || 1 : 1}
                                                </span>
                                                <span class="flex-center font-bold" style="border: 1px solid ${getTypeColor(aTemp && aTemp.magicObject)}; color: ${getTypeColor(aTemp && aTemp.magicObject)}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; gap: 4px;">
                                                    <span class="material-symbols-outlined text-sm">${catIcon}</span>
                                                    ${aTemp && aTemp.magicObject ? 'Magique' : 'Matériau'}
                                                </span>
                                                ${aTemp && aTemp.spiritualite ?
                                        `<span class="font-bold" style="border: 1px solid ${getSpiritualiteColor(aTemp.spiritualite)}; color: ${getSpiritualiteColor(aTemp.spiritualite)}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: rgba(0,0,0,0.3);">
                                                    ${aTemp.spiritualite}
                                                </span>` : ''}
                                            </div>
                                            <div class="anomaly-tooltip-desc">${aTemp && aTemp.description ? aTemp.description : 'Aucune description'}</div>
                                    `;
                                anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: ${spiriColor}25; color: ${spiriColor};" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                                        <span class="material-symbols-outlined text-sm align-middle" style="color: ${spiriColor};">${catIcon}</span> ${q}
                                    </span>`);
                            }
                            priceHtml += ` <br><div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 4px;">${anos.join('')}</div>`;
                        }
                        return priceHtml;
                    })()}
                    </div>

                    <div class="shop-admin-row-actions">
                        ${window.isAdmin ? `<button class="vault-btn-edit" onclick="editEquipment(${eq.id})" title="Modifier l'objet" style="padding: 0.4rem; border-radius: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span>
                        </button>` : ''}
                        ${(window.isAdmin || eq.ownerUsername === window.currentUser?.username) ? `<button class="vault-btn-delete" onclick="deleteEquipment(${eq.id})" title="Détruire l'objet" style="padding: 0.4rem; border-radius: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                        </button>` : ''}
                    </div>
                </div>
            `;
            });
        }

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
    loadEquipments();
    loadAnomalies();

    if (document.getElementById('addAnomalyPriceBtn')) {
        document.getElementById('addAnomalyPriceBtn').addEventListener('click', () => {
            addAnomalyRow();
        });
    }

    // Listeners for Weight Calculation
    const eqInputs = ['eqSlot', 'eqRarity', 'eqHp', 'eqMana', 'eqPower', 'eqStr', 'eqArmor', 'eqRes', 'eqSpeed', 'eqCrit', 'eqRegenHp', 'eqRegenMana', 'eqSpecialEffectValue', 'eqBaseWeight'];
    eqInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateWeightUI);
            el.addEventListener('change', updateWeightUI);
        }
    });

    // Render create form slot select
    const slotOptionsContainer = document.getElementById('eqSlotOptions');
    if (slotOptionsContainer) {
        const slots = ['CASQUE', 'PLASTRON', 'ARME_DEUX_MAINS', 'ARME_GAUCHE', 'ARME_DROITE', 'ANNEAU_GAUCHE', 'ANNEAU_DROIT', 'BOTTES', 'CAPE', 'CONSOMMABLE'];
        slotOptionsContainer.innerHTML = slots.map(s => {
            const info = window.SLOT_LABELS[s];
            return `<div class="custom-option" data-value="${s}">
                <span class="material-symbols-outlined cs-icon ${info.extraClass || ''}" style="color: ${info.color};">${info.icon}</span>
                ${info.label}
            </div>`;
        }).join('');
    }
});

window.addEventListener('authLoaded', () => {
    const btnCreate = document.getElementById('btnCreateVaultEq');
    if (btnCreate) {
        btnCreate.style.display = window.isAdmin ? 'flex' : 'none';
    }

    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        searchOwnerContainer.style.display = window.isAdmin ? 'flex' : 'none';
    }

    // Re-render the grid in case equipments loaded before auth
    if (pageState.allEquipments && pageState.allEquipments.length > 0) {
        renderVault();
    }
});

// ===== Equipment Creation / Edition =====



window.openCreateEqModal = function () {
    pageState.editingEquipmentId = null;
    document.getElementById('equipModalTitle').innerHTML = 'Forger un objet';
    document.getElementById('submitEquipmentBtn').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">add</span> Forger';
    resetEqForm();
    document.getElementById('equipCreateModal').classList.add('show');
    updateWeightUI();
}

window.closeCreateEqModal = function () {
    document.getElementById('equipCreateModal').classList.remove('show');
    resetEqForm();
}

function resetEqForm() {
    document.getElementById('eqName').value = '';
    document.getElementById('eqHp').value = 0;
    document.getElementById('eqMana').value = 0;
    document.getElementById('eqPower').value = 0;
    document.getElementById('eqStr').value = 0;
    document.getElementById('eqArmor').value = 0;
    document.getElementById('eqRes').value = 0;
    document.getElementById('eqSpeed').value = 0;
    document.getElementById('eqCrit').value = 0;
    if (document.getElementById('eqAvailableInShop')) {
        document.getElementById('eqAvailableInShop').checked = true;
    }
    document.getElementById('eqRegenHp').value = 0;
    document.getElementById('eqRegenMana').value = 0;
    if (document.getElementById('eqConsumableHpPercent')) document.getElementById('eqConsumableHpPercent').value = 0;
    if (document.getElementById('eqConsumableManaPercent')) document.getElementById('eqConsumableManaPercent').value = 0;
    if (document.getElementById('eqConsumableMissingHpPercent')) document.getElementById('eqConsumableMissingHpPercent').value = 0;
    if (document.getElementById('eqConsumableMissingManaPercent')) document.getElementById('eqConsumableMissingManaPercent').value = 0;
    if (document.getElementById('eqConsumableCategory')) {
        document.getElementById('eqConsumableCategory').value = 'AUTRE';
        const label = document.getElementById('eqConsumableCategoryLabel');
        if (label) label.innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">inventory_2</span> Autre';
    }
    if (document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = 0;

    const anomaliesContainer = document.getElementById('priceAnomaliesContainer');
    if (anomaliesContainer) {
        anomaliesContainer.innerHTML = '';
    }

    // Reset Rarity
    const rarityInput = document.getElementById('eqRarity');
    if (rarityInput) {
        rarityInput.value = 'COMMUN';
        document.getElementById('eqRarityLabel').innerHTML = '<span class="cs-icon font-bold text-muted">C</span> Commun';
        const row = document.getElementById('eqSpecialEffectRow');
        if (row) row.style.display = 'none';
    }

    // Reset Special Effect
    const effectInput = document.getElementById('eqSpecialEffect');
    if (effectInput) {
        effectInput.value = 'NONE';
        document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">not_interested</span> Aucun';
        document.getElementById('eqSpecialEffectValue').value = 0;
    }

    // Reset Slot
    const slotInput = document.getElementById('eqSlot');
    if (slotInput) {
        slotInput.value = '';
        document.getElementById('eqSlotLabel').innerHTML = 'Choisir un slot...';
    }
}

window.editEquipment = function (id) {
    pageState.editingEquipmentId = id;
    const eq = pageState.allEquipments.find(e => e.id === id);
    if (!eq) return;

    document.getElementById('equipModalTitle').innerHTML = 'Modifier un objet';
    document.getElementById('submitEquipmentBtn').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">save</span> Enregistrer';

    document.getElementById('eqName').value = eq.name || '';
    if (document.getElementById('eqAvailableInShop')) {
        document.getElementById('eqAvailableInShop').checked = eq.availableInShop !== false;
    }
    document.getElementById('eqHp').value = eq.bonusHealthMax || 0;
    document.getElementById('eqMana').value = eq.bonusManaMax || 0;
    document.getElementById('eqPower').value = eq.bonusPower || 0;
    document.getElementById('eqStr').value = eq.bonusStrength || 0;
    document.getElementById('eqArmor').value = eq.bonusArmor || 0;
    document.getElementById('eqRes').value = eq.bonusResistance || 0;
    document.getElementById('eqSpeed').value = eq.bonusSpeed || 0;
    document.getElementById('eqCrit').value = eq.bonusCrit || 0;
    document.getElementById('eqRegenHp').value = eq.regenHealthPerTurn || 0;
    document.getElementById('eqRegenMana').value = eq.regenManaPerTurn || 0;
    if (document.getElementById('eqConsumableHpPercent')) document.getElementById('eqConsumableHpPercent').value = eq.consumableHpPercent || 0;
    if (document.getElementById('eqConsumableManaPercent')) document.getElementById('eqConsumableManaPercent').value = eq.consumableManaPercent || 0;
    if (document.getElementById('eqConsumableMissingHpPercent')) document.getElementById('eqConsumableMissingHpPercent').value = eq.consumableMissingHpPercent || 0;
    if (document.getElementById('eqConsumableMissingManaPercent')) document.getElementById('eqConsumableMissingManaPercent').value = eq.consumableMissingManaPercent || 0;
    if (document.getElementById('eqConsumableCategory')) {
        const cat = eq.consumableCategory || 'AUTRE';
        document.getElementById('eqConsumableCategory').value = cat;
        const option = document.querySelector(`#eqConsumableCategoryOptions .custom-option[data-value="${cat}"]`);
        if (option) {
            document.getElementById('eqConsumableCategoryLabel').innerHTML = option.innerHTML;
        }
    }
    if (document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = eq.baseWeight || 0;

    const anomaliesContainer = document.getElementById('priceAnomaliesContainer');
    if (anomaliesContainer) {
        anomaliesContainer.innerHTML = '';
        if (eq.priceAnomalies && typeof eq.priceAnomalies === 'object') {
            for (const [name, qty] of Object.entries(eq.priceAnomalies)) {
                addAnomalyRow(name, qty);
            }
        }
    }

    // Slot Setup
    const slotInput = document.getElementById('eqSlot');
    if (slotInput && eq.slot) {
        slotInput.value = eq.slot;
        const info = getSlotInfo(eq);
        if (info) {
            document.getElementById('eqSlotLabel').innerHTML = `<span class="material-symbols-outlined cs-icon ${info.extraClass || ''}" style="color: ${info.color};">${info.icon}</span> ${info.label}`;
        }
    }

    // Rarity Setup
    const rarityInput = document.getElementById('eqRarity');
    const eqRarityName = eq.rarity && typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity;
    if (rarityInput && eqRarityName) {
        rarityInput.value = eqRarityName;
        const option = document.querySelector(`.custom-option.rarity-${eqRarityName}`);
        if (option) {
            document.getElementById('eqRarityLabel').innerHTML = option.innerHTML;
        }

        const row = document.getElementById('eqSpecialEffectRow');
        if (eqRarityName === 'EPIQUE' || eqRarityName === 'RELIQUE' || eqRarityName === 'MAUDIT') {
            if (row) row.style.display = 'grid';

            const isEpic = eqRarityName === 'EPIQUE';
            const isMaudit = eqRarityName === 'MAUDIT';
            let color = isEpic ? '#ef4444' : '#a855f7';
            let bg = isEpic ? 'rgba(239, 68, 68, 0.05)' : 'rgba(168, 85, 247, 0.05)';
            let border = isEpic ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px dashed rgba(168, 85, 247, 0.3)';
            let inputBorder = isEpic ? 'rgba(239, 68, 68, 0.3)' : 'rgba(168, 85, 247, 0.3)';

            if (isMaudit) {
                color = '#555555';
                bg = 'rgba(85, 85, 85, 0.05)';
                border = '1px dashed rgba(85, 85, 85, 0.3)';
                inputBorder = 'rgba(85, 85, 85, 0.3)';
            }

            if (row) {
                row.style.background = bg;
                row.style.border = border;
            }

            const effectOptions = document.querySelectorAll('#eqSpecialEffectOptions .custom-option');
            effectOptions.forEach(opt => {
                const effectVal = opt.getAttribute('data-value');
                if (effectVal === 'NONE') {
                    opt.style.display = 'block';
                } else if (isMaudit) {
                    opt.style.display = effectVal.startsWith('CURSED_') ? 'block' : 'none';
                } else {
                    opt.style.display = effectVal.startsWith('CURSED_') ? 'none' : 'block';
                }
            });

            const labelTitle = document.getElementById('eqSpecialEffectLabelTitle');
            if (labelTitle) labelTitle.style.color = color;

            const valueTitle = document.getElementById('eqSpecialEffectValueTitle');
            if (valueTitle) valueTitle.style.color = color;

            const trigger = document.getElementById('eqSpecialEffectTrigger');
            if (trigger) trigger.style.borderColor = inputBorder;

            const valInput = document.getElementById('eqSpecialEffectValue');
            if (valInput) valInput.style.borderColor = inputBorder;

        } else {
            if (row) row.style.display = 'none';
        }
    }

    // Effect Setup
    const effectInput = document.getElementById('eqSpecialEffect');
    if (effectInput && eq.specialEffect) {
        effectInput.value = eq.specialEffect;
        const option = document.querySelector(`.custom-option.effect-${eq.specialEffect}`);
        if (option) {
            document.getElementById('eqSpecialEffectLabel').innerHTML = option.innerHTML;
        }
    }

    document.getElementById('eqSpecialEffectValue').value = eq.specialEffectValue || 0;

    updateWeightUI();
    document.getElementById('equipCreateModal').classList.add('show');
}

function getFormEquipmentData() {
    const slot = document.getElementById('eqSlot') ? document.getElementById('eqSlot').value : null;
    const rarity = document.getElementById('eqRarity') ? document.getElementById('eqRarity').value : 'COMMUN';
    const specialEffect = document.getElementById('eqSpecialEffect') ? document.getElementById('eqSpecialEffect').value : 'NONE';
    const specialEffectValue = document.getElementById('eqSpecialEffectValue') ? parseInt(document.getElementById('eqSpecialEffectValue').value) || 0 : 0;

    return {
        id: pageState.editingEquipmentId,
        name: document.getElementById('eqName') ? document.getElementById('eqName').value.trim() : '',
        availableInShop: document.getElementById('eqAvailableInShop') ? document.getElementById('eqAvailableInShop').checked : false,
        slot,
        bonusHealthMax: document.getElementById('eqHp') ? parseInt(document.getElementById('eqHp').value) || 0 : 0,
        bonusManaMax: document.getElementById('eqMana') ? parseInt(document.getElementById('eqMana').value) || 0 : 0,
        bonusPower: document.getElementById('eqPower') ? parseInt(document.getElementById('eqPower').value) || 0 : 0,
        bonusStrength: document.getElementById('eqStr') ? parseInt(document.getElementById('eqStr').value) || 0 : 0,
        bonusArmor: document.getElementById('eqArmor') ? parseInt(document.getElementById('eqArmor').value) || 0 : 0,
        bonusResistance: document.getElementById('eqRes') ? parseInt(document.getElementById('eqRes').value) || 0 : 0,
        bonusSpeed: document.getElementById('eqSpeed') ? parseInt(document.getElementById('eqSpeed').value) || 0 : 0,
        bonusCrit: document.getElementById('eqCrit') ? parseInt(document.getElementById('eqCrit').value) || 0 : 0,
        regenHealthPerTurn: document.getElementById('eqRegenHp') ? parseInt(document.getElementById('eqRegenHp').value) || 0 : 0,
        regenManaPerTurn: document.getElementById('eqRegenMana') ? parseInt(document.getElementById('eqRegenMana').value) || 0 : 0,
        consumableHpPercent: document.getElementById('eqConsumableHpPercent') ? (parseInt(document.getElementById('eqConsumableHpPercent').value) || 0) : 0,
        consumableManaPercent: document.getElementById('eqConsumableManaPercent') ? (parseInt(document.getElementById('eqConsumableManaPercent').value) || 0) : 0,
        consumableMissingHpPercent: document.getElementById('eqConsumableMissingHpPercent') ? (parseInt(document.getElementById('eqConsumableMissingHpPercent').value) || 0) : 0,
        consumableMissingManaPercent: document.getElementById('eqConsumableMissingManaPercent') ? (parseInt(document.getElementById('eqConsumableMissingManaPercent').value) || 0) : 0,
        consumableCategory: document.getElementById('eqConsumableCategory') ? document.getElementById('eqConsumableCategory').value : 'AUTRE',
        baseWeight: document.getElementById('eqBaseWeight') ? parseFloat(document.getElementById('eqBaseWeight').value) || 0 : 0,
        rarity,
        specialEffect,
        specialEffectValue,
        personnageId: null, // Keep null when forged from vault
        priceAnomalies: (() => {
            const map = {};
            const container = document.getElementById('priceAnomaliesContainer');
            if (container) {
                const rows = container.querySelectorAll('.anomaly-price-row');
                rows.forEach(row => {
                    const selectVal = row.querySelector('.anomaly-select-hidden').value;
                    const qtyVal = parseInt(row.querySelector('.anomaly-qty-input').value) || 0;
                    if (selectVal && qtyVal > 0) {
                        map[selectVal] = (map[selectVal] || 0) + qtyVal;
                    }
                });
            }
            return map;
        })(),
    };
}

window.submitEquipment = async function () {
    const dto = getFormEquipmentData();
    const name = dto.name;
    const slot = dto.slot;
    if (!name) { showNotif('Nom de l\'équipement obligatoire.', true); return; }
    if (!slot) { showNotif('Slot obligatoire.', true); return; }

    const rarity = dto.rarity;

    // We already fetch simulated maxWeight in updateWeightUI. We can use it, or validate on backend.
    // Let's use the UI's last known max weight if available, or just skip local check and let backend fail if needed.
    // Wait, the backend doesn't fail on weight limit for templates, so we DO need local check or we can just fetch it here.
    const res = await window.globalFetch('/api/equipments/simulate-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
    });
    if (res) {
        const data = await res.json();
        if (data.weight > data.maxWeight && slot !== 'CONSOMMABLE') {
            showNotif('Le poids de cet équipement dépasse la limite autorisée !', true);
            return;
        }
    }

    let specialEffect = dto.specialEffect;
    let specialEffectValue = dto.specialEffectValue;

    if (rarity !== 'EPIQUE' && rarity !== 'RELIQUE' && rarity !== 'MAUDIT') {
        specialEffect = 'NONE';
        specialEffectValue = 0;
    } else {
        if (specialEffect === 'NONE') {
            specialEffectValue = 0;
        }
    }

    if (specialEffect !== 'NONE') {
        if (rarity === 'MAUDIT') {
            if (specialEffectValue > 0) specialEffectValue = -specialEffectValue;
            if (specialEffectValue === 0) {
                showNotif('La valeur de l\'effet spécial maudit ne peut pas être 0.', true);
                return;
            }
        } else if (rarity !== 'MAUDIT' && specialEffectValue <= 0) {
            showNotif('La valeur de l\'effet spécial doit être strictement supérieure à 0.', true);
            return;
        }
    }

    dto.specialEffect = specialEffect;
    dto.specialEffectValue = specialEffectValue;

    try {
        let url = '/api/shop/templates';
        let method = 'POST';
        if (pageState.editingEquipmentId) {
            url += `/${pageState.editingEquipmentId}`;
            method = 'PUT';
        }

        const res = await globalFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        const data = await res.json();
        if (!res.ok) {
            showNotif(data.message || 'Erreur', true);
            return;
        }

        closeCreateEqModal();
        showNotif(pageState.editingEquipmentId ? 'Équipement modifié !' : 'Équipement forgé !');
        await loadEquipments();
    } catch (e) {
        console.error(e);
        showNotif('Erreur réseau', true);
    }
}

window.updateWeightUI = async function () {
    const slot = document.getElementById('eqSlot').value;
    const rarity = document.getElementById('eqRarity').value;
    if (!slot) return;

    document.querySelectorAll('.non-consumable-stat').forEach(el => {
        el.style.display = slot === 'CONSOMMABLE' ? 'none' : '';
    });
    document.querySelectorAll('.consumable-stat').forEach(el => {
        el.style.display = slot === 'CONSOMMABLE' ? 'flex' : 'none';
    });
    document.querySelectorAll('.consumable-category-field').forEach(el => {
        el.style.display = slot === 'CONSOMMABLE' ? 'flex' : 'none';
    });

    const row = document.getElementById('eqBaseWeightRow');
    if (row) {
        row.style.display = slot === 'CONSOMMABLE' ? 'flex' : 'none';
    }

    let w = 0;
    let maxW = 5;
    let price = 0;

    const dto = getFormEquipmentData(); // Suppose that we refactored getFormEquipmentData earlier? No, wait. 
    // Wait, getFormEquipmentData() is defined in shop-admin.js! I can use it.
    if (!dto.slot) {
        if (document.getElementById('eqWeightText')) {
            document.getElementById('eqWeightText').innerText = "0 / 5";
            document.getElementById('eqWeightText').style.color = 'var(--text-muted)';
        }
        return;
    }

    try {
        const res = await window.globalFetch('/api/equipments/simulate-weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res) {
            const data = await res.json();
            w = data.weight || 0;
            maxW = data.maxWeight || 5;
            price = data.shopPrice || 0;
        }
    } catch (e) {
        console.error("Error simulating weight:", e);
    }

    const fillEl = document.getElementById('eqWeightFill');
    const textEl = document.getElementById('eqWeightText');

    if (textEl) {
        const displayW = w % 1 === 0 ? w : w.toFixed(1);
        if (slot === 'CONSOMMABLE') {
            textEl.innerText = `${displayW}`;
        } else {
            textEl.innerText = `${displayW} / ${maxW}`;
        }
    }

    if (fillEl) {
        let pct = (w / maxW) * 100;
        let color = '#10b981';

        if (slot === 'CONSOMMABLE') {
            pct = 0;
            color = '#10b981';
        } else if (pct < 0) {
            pct = Math.min(Math.abs(pct), 100);
            color = '#3b82f6';
        } else if (pct > 100) {
            pct = 100;
            color = '#ef4444';
        } else if (pct > 80) {
            color = '#f59e0b';
        }

        fillEl.style.width = pct + '%';
        fillEl.style.background = color;
        if (textEl) textEl.style.color = color;
    }

    const priceEl = document.getElementById('eqPriceText');
    if (priceEl) {
        const displayPrice = price % 1 === 0 ? price : price.toFixed(1);
        priceEl.innerHTML = `${displayPrice} <span class="material-symbols-outlined" style="font-size: 1.2rem;">monetization_on</span>`;
    }
}

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



