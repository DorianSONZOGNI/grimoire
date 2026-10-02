const pageState = { allEquipments: [], equipmentToDelete: null, editingEquipmentId: null };

// getSlotInfo, calculateWeight, showNotif, showModal → utils.js


// ===== Custom Select Logic =====
document.addEventListener('change', (e) => {
    if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'hidden') {
        const hiddenInput = e.target;
        if (hiddenInput.id === 'eqRarity') {
            const val = hiddenInput.value;
            const row = document.getElementById('eqSpecialEffectRow');
            if (val === 'EPIQUE' || val === 'RELIQUE' || val === 'MAUDIT') {
                row.classList.remove('hidden');
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

                row.style.setProperty('background', bg, 'important');
                row.style.setProperty('border', border, 'important');
                document.getElementById('eqSpecialEffectLabelTitle').style.setProperty('color', color, 'important');
                document.getElementById('eqSpecialEffectValueTitle').style.setProperty('color', color, 'important');
                document.getElementById('eqSpecialEffectTrigger').style.setProperty('border-color', inputBorder, 'important');
                document.getElementById('eqSpecialEffectValue').style.setProperty('border-color', inputBorder, 'important');

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
                row.classList.add('hidden');
                row.style.display = 'none';
                document.getElementById('eqSpecialEffect').value = 'NONE';
                document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">not_interested</span> Aucun';
                document.getElementById('eqSpecialEffectValue').value = 0;
            }
            updateWeightUI();
        } else if (hiddenInput.id.startsWith('eq') || hiddenInput.id === 'eqSpecialEffect') {
            if (hiddenInput.id === 'eqSpecialEffect') {
                const infoContainer = document.getElementById('eqSpecialEffectInfoContainer');
                if (infoContainer) {
                    infoContainer.innerHTML = window.getEffectInfoIconHtml(hiddenInput.value);
                }
            }
            updateWeightUI();
        } else {
            renderVault(); // Mettre à jour l'affichage au changement
        }
    }
});

// ===== API =====
async function loadEquipments() {
    try {
        pageState.allEquipments = await window.api.loadEquipments({ sources: ['/api/shop/templates'] });
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
        window.allAnomalies = await api.loadAnomalies({ source: '/api/anomalies/all-templates', deduplicate: false });
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

    let optionsHtml = '';
    (window.allAnomalies || []).forEach(n => {
        const catIcon = n.category ? getCategoryIcon(n.category) : 'star';
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
            displayLabel = `<span class="material-symbols-outlined cs-icon text-purple">star</span> ${selectedName}`;
        }
    }

    row.innerHTML = `
        <div class="custom-select-wrapper flex-1 min-w-0">
            <div class="custom-select-trigger flex-between bg-white/10 border border-white/10 rounded-lg p-2 cursor-pointer items-center w-full">
                <span class="cs-label flex-center text-slate-300 text-sm gap-1 truncate">${displayLabel}</span>
                <span class="material-symbols-outlined text-slate-500 text-lg flex-shrink-0">expand_more</span>
            </div>
            <div class="custom-select-options custom-options">
                ${optionsHtml}
            </div>
            <input type="hidden" class="anomaly-select-hidden" value="${selectedName}">
        </div>
        <span class="text-slate-300 text-sm whitespace-nowrap">Qté:</span>
        <input type="number" class="anomaly-qty-input p-2 bg-black/30 border border-white/10 rounded-lg text-white font-outfit text-center" style="width: 60px;" value="${qty}" min="1">
        <button type="button" class="btn-remove-row bg-red-500/20 border border-red-500/40 text-red-300 rounded-md cursor-pointer p-2 flex justify-center items-center" onclick="removeAnomalyRow(this)">
            <span class="material-symbols-outlined text-md">delete</span>
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

    api.deleteEquipmentAPI(id, {
        confirmTitle: "Détruire l'équipement ?",
        confirmBody: `Voulez-vous vraiment détruire l'équipement <strong class="text-white">${eq.name}</strong> ?<br><br>Cette action est définitive (pour la template de la boutique).`,
        apiRoute: "/api/shop/templates/",
        onSuccess: async () => {
            await loadEquipments();
            if (window.checkAuthStatus) window.checkAuthStatus();
        }
    });
}

// ===== Rendu =====
function renderVault() {
    // Sort allEquipments: rarity order, then slot, then name
    const rarityOrder = { 'MAUDIT': -1, 'RELIQUE': 0, 'EPIQUE': 1, 'LEGENDAIRE': 2, 'MYTHIQUE': 3, 'RARE': 4, 'INHABITUEL': 5, 'COMMUN': 6 };
    const slotOrder = { 'CASQUE': 1, 'PLASTRON': 2, 'ARME_DEUX_MAINS': 3, 'ARME_GAUCHE': 4, 'ARME_DROITE': 5, 'ANNEAU': 6, 'BOTTES': 8, 'CAPE': 9, 'CONSOMMABLE': 10 };

    let sorted = [...pageState.allEquipments].sort((a, b) => {
        const rNameA = getRarityName(a.rarity);
        const rNameB = getRarityName(b.rarity);
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
                <span class="material-symbols-outlined opacity-50 icon-lg">search_off</span>
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
                    <span class="material-symbols-outlined text-xl">${rarityInfo.icon}</span>
                    ${rarityInfo.label}
                </div>
                <div class="shop-admin-list">
        `;

        if (items.length === 0) {
            html += `<div class="font-italic text-center text-muted p-4">Aucun article dans cette rareté</div>`;
        } else {
            items.forEach(eq => {
                const slotInfo = getSlotInfo(eq);

                const statsHtml = window.generateEquipmentStatsHtml(eq, 'stat-badge');
                const effectHtml = window.generateEquipmentEffectHtml(eq, 'stat-badge');

                const displayPrice = eq.shopPrice !== undefined ? +Number(eq.shopPrice).toFixed(1) : calculateShopPrice(eq._weight || 0, rarity || 'COMMUN', eq.slot);

                html += `
                <div class="shop-admin-row">
                    <div class="shop-admin-row-name">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''} text-2xl" style="color: ${slotInfo.color};" title="${slotInfo.label}">${slotInfo.icon}</span>
                        <span class="font-bold text-lg">${eq.name}</span>
                        ${window.isAdmin && eq.ownerUsername ? `<span class="text-xxs whitespace-nowrap" style="padding: 0.15rem 0.4rem; background: ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${eq.ownerUsername === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined align-middle text-xxs mr-1">account_circle</span>${eq.ownerUsername}</span>` : ''}
                    </div>
                    
                    <div class="shop-admin-row-stats">
                        ${statsHtml || '<span class="text-muted font-italic">Aucune stat</span>'}
                        ${effectHtml}
                    </div>

                    <div class="shop-admin-row-price">
                        ${(() => {
                        let priceHtml = `${displayPrice} <span class="material-symbols-outlined text-lg">monetization_on</span>`;
                        if (eq.priceAnomalies && Object.keys(eq.priceAnomalies).length > 0) {
                            let anos = [];
                            for (const [n, q] of Object.entries(eq.priceAnomalies)) {
                                let aTemp = window.allAnomalies ? window.allAnomalies.find(a => a.name === n) : null;
                                const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
                                const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                                const tooltipData = getAnomalyTooltipHTML(aTemp, n);
                                anos.push(`<span class="anomaly-badge" style="border-color: ${spiriColor}; background: ${spiriColor}25; color: ${spiriColor};" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                                        <span class="material-symbols-outlined text-sm align-middle" style="color: ${spiriColor};">${catIcon}</span> ${q}
                                    </span>`);
                            }
                            priceHtml += ` <br><div class="flex flex-wrap justify-center gap-1 mt-1">${anos.join('')}</div>`;
                        }
                        return priceHtml;
                    })()}
                    </div>

                    <div class="vault-card-actions">
                        ${window.isAdmin ? `<button class="vault-btn-edit p-1 rounded-md" onclick="editEquipment(${eq.id})" title="Modifier l'objet">
                            <span class="material-symbols-outlined text-md">edit</span>
                        </button>` : ''}
                        ${(window.isAdmin || eq.ownerUsername === window.currentUser?.username) ? `<button class="vault-btn-delete p-1 rounded-md" onclick="deleteEquipment(${eq.id})" title="Détruire l'objet">
                            <span class="material-symbols-outlined text-md">delete</span>
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

    const checkAdmin = async () => {
        if (!window.currentUser) return;
        if (!window.isAdmin) {
            document.body.innerHTML = "<h2 class='text-error text-center mt-12'>Accès Refusé : Réservé aux Admins</h2>";
            return;
        }
        await loadAnomalies();
        loadEquipments();
        loadUpgrades();
    };

    if (window.currentUser !== undefined) {
        checkAdmin();
    } else {
        window.addEventListener('authLoaded', checkAdmin, { once: true });
    }

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

    const categoryInput = document.getElementById('eqConsumableCategory');
    if (categoryInput) {
        categoryInput.addEventListener('change', () => {
            const row = document.getElementById('eqKeyBonusRow');
            if (row) {
                if (categoryInput.value === 'CLE') {
                    row.classList.remove('hidden');
                } else {
                    row.classList.add('hidden');
                }
            }
        });
    }

    // Render create form slot select
    const slotOptionsContainer = document.getElementById('eqSlotOptions');
    if (slotOptionsContainer) {
        const slots = ['CASQUE', 'PLASTRON', 'ARME_DEUX_MAINS', 'ARME_GAUCHE', 'ARME_DROITE', 'ANNEAU', 'BOTTES', 'CAPE', 'CONSOMMABLE'];
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
        if (window.isAdmin) btnCreate.classList.remove('hidden');
        else btnCreate.classList.add('hidden');
    }

    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        if (window.isAdmin) searchOwnerContainer.classList.remove('hidden');
        else searchOwnerContainer.classList.add('hidden');
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
    document.getElementById('submitEquipmentBtn').innerHTML = '<span class="material-symbols-outlined icon-md">add</span> Forger';
    resetEqForm();
    document.getElementById('equipCreateModal').classList.add('show');
    updateWeightUI();
}

window.closeCreateEqModal = function () {
    document.getElementById('equipCreateModal').classList.remove('show');
    resetEqForm();
}



window.editEquipment = function (id) {
    pageState.editingEquipmentId = id;
    const eq = pageState.allEquipments.find(e => e.id === id);
    if (!eq) return;

    document.getElementById('equipModalTitle').innerHTML = 'Modifier un objet';
    document.getElementById('submitEquipmentBtn').innerHTML = '<span class="material-symbols-outlined icon-md">save</span> Enregistrer';

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
    if (document.getElementById('eqConsumableBonusXpPercent')) document.getElementById('eqConsumableBonusXpPercent').value = eq.consumableBonusXpPercent || 0;
    if (document.getElementById('eqConsumableBonusMagicalDamagePercent')) document.getElementById('eqConsumableBonusMagicalDamagePercent').value = eq.consumableBonusMagicalDamagePercent || 0;
    if (document.getElementById('eqConsumableBonusPhysicalDamagePercent')) document.getElementById('eqConsumableBonusPhysicalDamagePercent').value = eq.consumableBonusPhysicalDamagePercent || 0;
    if (document.getElementById('eqConsumableBonusArmorFlat')) document.getElementById('eqConsumableBonusArmorFlat').value = eq.consumableBonusArmorFlat || 0;
    if (document.getElementById('eqConsumableBonusResistanceFlat')) document.getElementById('eqConsumableBonusResistanceFlat').value = eq.consumableBonusResistanceFlat || 0;
    if (document.getElementById('eqConsumableDurationTurns')) document.getElementById('eqConsumableDurationTurns').value = eq.consumableDurationTurns || 0;
    if (document.getElementById('eqConsumableCategory')) {
        const cat = eq.consumableCategory || 'AUTRE';
        document.getElementById('eqConsumableCategory').value = cat;
        const option = document.querySelector(`#eqConsumableCategoryOptions .custom-option[data-value="${cat}"]`);
        if (option) {
            document.getElementById('eqConsumableCategoryLabel').innerHTML = option.innerHTML;
        }
        const row = document.getElementById('eqKeyBonusRow');
        if (row) {
            if (cat === 'CLE') {
                row.classList.remove('hidden');
                document.getElementById('eqKeyBonus').value = eq.specialEffectValue || 10;
            } else {
                row.classList.add('hidden');
            }
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
    const eqRarityName = getRarityName(eq.rarity);
    if (rarityInput && eqRarityName) {
        rarityInput.value = eqRarityName;
        const option = document.querySelector(`.custom-option.rarity-${eqRarityName}`);
        if (option) {
            document.getElementById('eqRarityLabel').innerHTML = option.innerHTML;
        }

        const row = document.getElementById('eqSpecialEffectRow');
        if (eqRarityName === 'EPIQUE' || eqRarityName === 'RELIQUE' || eqRarityName === 'MAUDIT') {
            if (row) { row.classList.remove('hidden'); row.style.display = 'grid'; }

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
                row.style.setProperty('background', bg, 'important');
                row.style.setProperty('border', border, 'important');
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
            if (labelTitle) labelTitle.style.setProperty('color', color, 'important');

            const valueTitle = document.getElementById('eqSpecialEffectValueTitle');
            if (valueTitle) valueTitle.style.setProperty('color', color, 'important');

            const trigger = document.getElementById('eqSpecialEffectTrigger');
            if (trigger) trigger.style.setProperty('border-color', inputBorder, 'important');

            const valInput = document.getElementById('eqSpecialEffectValue');
            if (valInput) valInput.style.setProperty('border-color', inputBorder, 'important');

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
        const infoContainer = document.getElementById('eqSpecialEffectInfoContainer');
        if (infoContainer) {
            infoContainer.innerHTML = window.getEffectInfoIconHtml(eq.specialEffect);
        }
    } else {
        const infoContainer = document.getElementById('eqSpecialEffectInfoContainer');
        if (infoContainer) infoContainer.innerHTML = '';
    }

    document.getElementById('eqSpecialEffectValue').value = eq.specialEffectValue || 0;

    updateWeightUI();
    document.getElementById('equipCreateModal').classList.add('show');
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
        const roundedWeight = Math.round(data.weight * 10) / 10;
        if (roundedWeight > data.maxWeight && slot !== 'CONSOMMABLE') {
            showNotif('Le poids de cet équipement dépasse la limite autorisée !', true);
            return;
        }
    }

    let specialEffect = dto.specialEffect;
    let specialEffectValue = dto.specialEffectValue;

    if (slot === 'CONSOMMABLE' && dto.consumableCategory === 'CLE') {
        specialEffect = 'NONE';
        const keyBonusEl = document.getElementById('eqKeyBonus');
        specialEffectValue = keyBonusEl ? (parseInt(keyBonusEl.value) || 0) : 10;
    } else {
        if (rarity !== 'EPIQUE' && rarity !== 'RELIQUE' && rarity !== 'MAUDIT') {
            specialEffect = 'NONE';
            specialEffectValue = 0;
        } else {
            if (specialEffect === 'NONE') {
                specialEffectValue = 0;
            }
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
        if (slot === 'CONSOMMABLE') el.classList.add('hidden');
        else el.classList.remove('hidden');
        el.style.display = '';
    });
    document.querySelectorAll('.consumable-stat').forEach(el => {
        if (slot === 'CONSOMMABLE') el.classList.remove('hidden');
        else el.classList.add('hidden');
        el.style.display = '';
    });
    document.querySelectorAll('.consumable-category-field').forEach(el => {
        if (slot === 'CONSOMMABLE') {
            el.classList.remove('hidden');
            if (window.renderConsumableCategorySelect) {
                window.renderConsumableCategorySelect();
            }
        }
        else el.classList.add('hidden');
        el.style.display = '';
    });

    const row = document.getElementById('eqBaseWeightRow');
    if (row) {
        if (slot === 'CONSOMMABLE') row.classList.remove('hidden');
        else row.classList.add('hidden');
        row.style.display = '';
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
            const rawWeight = data.weight || 0;
            w = Math.round(rawWeight * 10) / 10;
            maxW = data.maxWeight || 5;
            price = data.shopPrice || 0;
        }
    } catch (e) {
        console.error("Error simulating weight:", e);
    }

    const fillEl = document.getElementById('eqWeightFill');
    const textEl = document.getElementById('eqWeightText');

    if (textEl) {
        const displayW = +Number(w).toFixed(1);
        if (slot === 'CONSOMMABLE') {
            textEl.innerText = `${displayW}`;
        } else {
            textEl.innerText = `${displayW} / ${maxW}`;
        }
    }

    if (fillEl) {
        let pct = Math.round((w / maxW) * 100);
        let colorClass = 'bg-success';
        let textColorClass = 'text-success';

        if (slot === 'CONSOMMABLE') {
            pct = 0;
            colorClass = 'bg-success';
            textColorClass = 'text-success';
        } else if (pct < 0) {
            pct = Math.min(Math.abs(pct), 100);
            colorClass = 'bg-info';
            textColorClass = 'text-info';
        } else if (pct > 100) {
            pct = 100;
            colorClass = 'bg-danger';
            textColorClass = 'text-danger';
        } else if (pct > 80) {
            colorClass = 'bg-warning';
            textColorClass = 'text-warning';
        }

        fillEl.className = 'gauge-fill hp h-full transition-all duration-300 w-pct-' + pct + ' ' + colorClass;
        if (textEl) {
            textEl.className = textColorClass + ' text-sm font-bold';
            textEl.style.backgroundColor = 'transparent';
        }
    }

    const priceEl = document.getElementById('eqPriceText');
    if (priceEl) {
        const displayPrice = +Number(price).toFixed(1);
        priceEl.innerHTML = `${displayPrice} <span class="material-symbols-outlined icon-md">monetization_on</span>`;
    }
};



// ============================================================
// PALIERS D'AMÉLIORATION BOUTIQUE — Admin CRUD
// ============================================================

const upgradeState = { configs: [], editingId: null };

async function loadUpgrades() {
    const grid = document.getElementById('upgradesGrid');
    if (!grid) return;
    try {
        const res = await globalFetch('/api/shop/admin/upgrades');
        if (!res.ok) { grid.innerHTML = `<div class="text-error">Erreur chargement paliers.</div>`; return; }
        upgradeState.configs = await res.json();
        renderUpgradesGrid();
    } catch (e) {
        grid.innerHTML = `<div class="text-error">Erreur réseau.</div>`;
    }
}

function renderUpgradesGrid() {
    const grid = document.getElementById('upgradesGrid');
    if (!grid) return;

    if (upgradeState.configs.length === 0) {
        grid.innerHTML = `<div class="text-muted font-italic">Aucun palier configuré. Créez-en un pour activer le système d'amélioration de la boutique.</div>`;
        return;
    }

    const sorted = [...upgradeState.configs].sort((a, b) => a.targetLevel - b.targetLevel);

    grid.innerHTML = sorted.map(cfg => {
        const anomalyEntries = cfg.anomalyCost ? Object.entries(cfg.anomalyCost) : [];
        const anomalyHtml = anomalyEntries.length > 0
            ? `<div class="flex flex-wrap justify-center gap-1">` + anomalyEntries.map(([n, q]) => {
                  let aTemp = window.allAnomalies ? window.allAnomalies.find(a => a.name === n) : null;
                  const catIcon = aTemp && aTemp.category ? getCategoryIcon(aTemp.category) : 'star';
                  const spiriColor = aTemp && aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                  const tooltipData = (typeof getAnomalyTooltipHTML === 'function' && aTemp) ? getAnomalyTooltipHTML(aTemp, n) : n;
                  return `<span class="anomaly-badge" style="border-color: ${spiriColor}; background: ${spiriColor}25; color: ${spiriColor};" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}">
                          <span class="material-symbols-outlined text-sm align-middle" style="color: ${spiriColor};">${catIcon}</span> ${q}
                      </span>`;
              }).join('') + `</div>`
            : `<span class="text-muted text-sm">Aucune anomalie requise</span>`;

        return `
        <div class="upgrade-admin-card" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-card); border-radius: 8px; margin-bottom: 0.5rem;">
            <div class="upgrade-admin-level flex-1 font-bold">Niveau ${cfg.targetLevel} <span class="text-xs text-muted ml-2 font-normal">${cfg.description || '—'}</span></div>
            <div class="upgrade-admin-costs flex gap-2 items-center">
                ${cfg.goldCost > 0 ? `<span class="upgrade-admin-tag upgrade-admin-tag--gold" style="border-color: #f59e0b; color: #f59e0b; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid; background: rgba(245, 158, 11, 0.1);"><span class="material-symbols-outlined align-middle" style="font-size:0.9rem">monetization_on</span> ${cfg.goldCost}</span>` : ''}
                ${anomalyHtml}
            </div>
            <div class="vault-card-actions flex gap-2 justify-end">
                <button class="vault-btn-edit p-1 rounded-md cursor-pointer border-none bg-transparent" style="color: #10b981;" onclick="openEditUpgradeModal(${cfg.id})" title="Modifier">
                    <span class="material-symbols-outlined text-md">edit</span>
                </button>
                <button class="vault-btn-delete p-1 rounded-md cursor-pointer border-none bg-transparent" style="color: #ef4444;" onclick="deleteUpgrade(${cfg.id})" title="Supprimer">
                    <span class="material-symbols-outlined text-md">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

function openCreateUpgradeModal() {
    upgradeState.editingId = null;
    let nextLevel = 2;
    if (upgradeState.configs && upgradeState.configs.length > 0) {
        nextLevel = Math.max(...upgradeState.configs.map(c => c.targetLevel)) + 1;
    }
    renderUpgradeModal(null, nextLevel);
}

function openEditUpgradeModal(id) {
    const cfg = upgradeState.configs.find(c => c.id === id);
    if (!cfg) return;
    upgradeState.editingId = id;
    renderUpgradeModal(cfg);
}

function renderUpgradeModal(cfg, nextLevel = 2) {
    // Construire le modal inline
    const existingModal = document.getElementById('upgradeModal');
    if (existingModal) existingModal.remove();

    const anomalyEntries = cfg && cfg.anomalyCost ? Object.entries(cfg.anomalyCost) : [];

    const modal = document.createElement('div');
    modal.id = 'upgradeModal';
    modal.className = 'vault-modal-overlay';
    modal.innerHTML = `
        <div class="equip-modal modal-sm" style="max-width:480px;">
            <div class="equip-modal-header">
                <div class="equip-modal-title">
                    <span class="material-symbols-outlined" style="color:#a855f7">upgrade</span>
                    ${cfg ? 'Modifier le palier' : 'Nouveau palier'}
                </div>
                <button class="equip-modal-close" onclick="document.getElementById('upgradeModal').remove()">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>
            <div class="equip-modal-body" style="display:flex;flex-direction:column;gap:1rem;padding:1.5rem;">
                <div class="eq-create-field">
                    <label for="upLevel">Niveau cible</label>
                    <input type="number" id="upLevel" min="2" value="${cfg ? cfg.targetLevel : nextLevel}" placeholder="Ex: 2">
                </div>
                <div class="eq-create-field">
                    <label for="upDesc">Description</label>
                    <input type="text" id="upDesc" value="${cfg ? cfg.description : ''}" placeholder="Ex: Débloque le slot Inhabituel">
                </div>
                <div class="eq-create-field">
                    <label for="upGold">Coût en Or</label>
                    <input type="number" id="upGold" min="0" value="${cfg ? cfg.goldCost : 200}" placeholder="200">
                </div>
                <div>
                    <label class="flex items-center justify-between mb-2">
                        <span>Coût en Anomalies</span>
                        <button type="button" class="flex items-center gap-1 text-sm cursor-pointer rounded px-2 py-1"
                            style="background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.4);color:#a855f7"
                            onclick="addUpgradeAnomalyRow()">
                            <span class="material-symbols-outlined text-base">add</span> Ajouter
                        </button>
                    </label>
                    <div id="upAnomalyRows" style="display:flex;flex-direction:column;gap:0.5rem;">
                        ${anomalyEntries.map(([name, qty]) => upgradeAnomalyRowHtml(name, qty)).join('')}
                    </div>
                </div>

                <hr style="border-color: rgba(255,255,255,0.1); margin: 0.5rem 0;">
                
                <h4 style="margin-bottom: 0;">Déblocage des Slots</h4>
                <div class="flex gap-4 flex-wrap text-sm text-slate-300">
                    <label class="flex items-center gap-1"><input type="checkbox" id="upSlot4" ${cfg?.unlocksSlot4 ? 'checked' : ''}> Slot 4</label>
                    <label class="flex items-center gap-1"><input type="checkbox" id="upSlot5" ${cfg?.unlocksSlot5 ? 'checked' : ''}> Slot 5</label>
                    <label class="flex items-center gap-1"><input type="checkbox" id="upPromo" ${cfg?.unlocksPromo ? 'checked' : ''}> Promo</label>
                    <label class="flex items-center gap-1"><input type="checkbox" id="upBlackMarket" ${cfg?.unlocksBlackMarket ? 'checked' : ''}> Marché Noir</label>
                </div>

                <hr style="border-color: rgba(255,255,255,0.1); margin: 0.5rem 0;">
                
                <div>
                    <label class="flex items-center justify-between mb-2">
                        <span>Probabilités Rareté par Slot</span>
                        <button type="button" class="flex items-center gap-1 text-sm cursor-pointer rounded px-2 py-1"
                            style="background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);color:#3b82f6"
                            onclick="addUpgradeSlotRuleRow()">
                            <span class="material-symbols-outlined text-base">add</span> Règle
                        </button>
                    </label>
                    <div id="upSlotRuleRows" style="display:flex;flex-direction:column;gap:0.5rem;">
                        ${(cfg?.slotRules || []).map(rule => upgradeSlotRuleRowHtml(rule.slotIndex, rule.rarity, rule.weight)).join('')}
                    </div>
                </div>

                <button type="button" class="eq-create-btn text-white p-3 flex items-center justify-center gap-2 font-semibold text-base cursor-pointer border-none rounded-lg mt-2"
                    style="background:linear-gradient(135deg,#a855f7,#7c3aed);"
                    onclick="submitUpgrade()">
                    <span class="material-symbols-outlined text-xl">save</span>
                    ${cfg ? 'Enregistrer' : 'Créer le palier'}
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Déclencher l'animation : forcer un reflow puis ajouter la classe
    requestAnimationFrame(() => modal.classList.add('show'));
}

function upgradeAnomalyRowHtml(selectedName = '', qty = 1) {
    let optionsHtml = '';
    (window.allAnomalies || []).forEach(n => {
        const catIcon = n.category ? getCategoryIcon(n.category) : 'star';
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
            displayLabel = `<span class="material-symbols-outlined cs-icon text-purple">star</span> ${selectedName}`;
        }
    }

    return `<div class="flex gap-2 items-center">
        <div class="custom-select-wrapper flex-1 min-w-0" style="position: relative;">
            <div class="custom-select-trigger flex-between bg-white/10 border border-white/10 rounded-lg p-2 cursor-pointer items-center w-full" style="display: flex; justify-content: space-between;">
                <span class="cs-label flex text-slate-300 text-sm gap-1 items-center truncate">${displayLabel}</span>
                <span class="material-symbols-outlined text-slate-500 text-lg flex-shrink-0">expand_more</span>
            </div>
            <div class="custom-select-options custom-options">
                ${optionsHtml}
            </div>
            <input type="hidden" class="upgrade-ano-name anomaly-select-hidden" value="${selectedName}">
        </div>
        <input type="number" min="1" value="${qty}" class="upgrade-ano-qty"
            style="width:60px;background:#1e293b;border:1px solid #334155;color:white;border-radius:6px;padding:6px 8px;text-align:center;font-size:0.9rem;">
        <button type="button" onclick="this.closest('.flex').remove()"
            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 8px;cursor:pointer;color:#ef4444">
            <span class="material-symbols-outlined" style="font-size:1rem">delete</span>
        </button>
    </div>`;
}

window.addUpgradeAnomalyRow = function() {
    const container = document.getElementById('upAnomalyRows');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = upgradeAnomalyRowHtml();
    container.appendChild(div.firstElementChild);
};

window.upgradeSlotRuleRowHtml = function(slotIndex = 1, rarity = 'COMMUN', weight = 100) {
    const rarities = ['COMMUN', 'INHABITUEL', 'RARE', 'MYTHIQUE', 'LEGENDAIRE', 'EPIQUE', 'RELIQUE', 'MAUDIT'];
    const rarityOptions = rarities.map(r => `<option value="${r}" ${rarity === r ? 'selected' : ''}>${r}</option>`).join('');
    
    return `<div class="flex gap-2 items-center slot-rule-row">
        <select class="rule-slot-index" style="width:70px;background:#1e293b;border:1px solid #334155;color:white;border-radius:6px;padding:6px;font-size:0.9rem;">
            <option value="1" ${slotIndex === 1 ? 'selected' : ''}>Slot 1</option>
            <option value="2" ${slotIndex === 2 ? 'selected' : ''}>Slot 2</option>
            <option value="3" ${slotIndex === 3 ? 'selected' : ''}>Slot 3</option>
            <option value="4" ${slotIndex === 4 ? 'selected' : ''}>Slot 4</option>
            <option value="5" ${slotIndex === 5 ? 'selected' : ''}>Slot 5</option>
        </select>
        <select class="rule-rarity flex-1" style="background:#1e293b;border:1px solid #334155;color:white;border-radius:6px;padding:6px;font-size:0.9rem;">
            ${rarityOptions}
        </select>
        <input type="number" class="rule-weight" min="1" value="${weight}" title="Probabilité (poids)"
            style="width:60px;background:#1e293b;border:1px solid #334155;color:white;border-radius:6px;padding:6px;text-align:center;font-size:0.9rem;">
        <span class="text-xs text-muted">%</span>
        <button type="button" onclick="this.closest('.slot-rule-row').remove()"
            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 8px;cursor:pointer;color:#ef4444">
            <span class="material-symbols-outlined" style="font-size:1rem">delete</span>
        </button>
    </div>`;
}

window.addUpgradeSlotRuleRow = function() {
    const container = document.getElementById('upSlotRuleRows');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = upgradeSlotRuleRowHtml();
    container.appendChild(div.firstElementChild);
};

window.submitUpgrade = async function() {
    const level = parseInt(document.getElementById('upLevel')?.value, 10);
    const desc = document.getElementById('upDesc')?.value?.trim();
    const gold = parseInt(document.getElementById('upGold')?.value, 10) || 0;

    if (!level || level < 2) { showNotif('Niveau invalide (min 2).', true); return; }
    if (!desc) { showNotif('Description requise.', true); return; }

    const anomalyCost = {};
    document.querySelectorAll('#upAnomalyRows > div').forEach(row => {
        const name = row.querySelector('.upgrade-ano-name')?.value?.trim();
        const qty = parseInt(row.querySelector('.upgrade-ano-qty')?.value, 10) || 1;
        if (name) anomalyCost[name] = qty;
    });

    const unlocksSlot4 = document.getElementById('upSlot4')?.checked || false;
    const unlocksSlot5 = document.getElementById('upSlot5')?.checked || false;
    const unlocksPromo = document.getElementById('upPromo')?.checked || false;
    const unlocksBlackMarket = document.getElementById('upBlackMarket')?.checked || false;

    const slotRules = [];
    document.querySelectorAll('.slot-rule-row').forEach(row => {
        const sIndex = parseInt(row.querySelector('.rule-slot-index')?.value, 10) || 1;
        const rarity = row.querySelector('.rule-rarity')?.value || 'COMMUN';
        const weight = parseInt(row.querySelector('.rule-weight')?.value, 10) || 100;
        slotRules.push({ slotIndex: sIndex, rarity, weight });
    });

    const slotSums = {};
    for (const r of slotRules) {
        slotSums[r.slotIndex] = (slotSums[r.slotIndex] || 0) + r.weight;
    }
    for (const [idx, sum] of Object.entries(slotSums)) {
        if (sum > 100) {
            showNotif(`Erreur : Le total des probabilités pour le Slot ${idx} dépasse 100% (actuel: ${sum}%)`, true);
            return;
        }
    }

    const payload = { 
        targetLevel: level, description: desc, goldCost: gold, anomalyCost,
        unlocksSlot4, unlocksSlot5, unlocksPromo, unlocksBlackMarket, slotRules
    };

    try {
        let res;
        if (upgradeState.editingId) {
            res = await globalFetch(`/api/shop/admin/upgrades/${upgradeState.editingId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await globalFetch('/api/shop/admin/upgrades', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        const data = await res.json();
        if (res.ok) {
            showNotif(upgradeState.editingId ? 'Palier modifié !' : 'Palier créé !');
            document.getElementById('upgradeModal')?.remove();
            await loadUpgrades();
        } else {
            showNotif(data.error || 'Erreur.', true);
        }
    } catch (e) { showNotif('Erreur réseau.', true); }
};

window.deleteUpgrade = async function(id) {
    window.showModal({
        title: 'Supprimer ce palier ?',
        body: 'Cette action est irréversible.',
        icon: 'delete',
        confirmText: 'Supprimer',
        onConfirm: async () => {
            const res = await globalFetch(`/api/shop/admin/upgrades/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showNotif('Palier supprimé.');
                await loadUpgrades();
            } else {
                showNotif('Erreur suppression.', true);
            }
        }
    });
};

window.openCreateUpgradeModal = openCreateUpgradeModal;
window.openEditUpgradeModal = openEditUpgradeModal;

