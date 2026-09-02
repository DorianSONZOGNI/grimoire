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
        if (data.weight > data.maxWeight && slot !== 'CONSOMMABLE') {
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
        if (slot === 'CONSOMMABLE') el.classList.remove('hidden');
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
}

;





