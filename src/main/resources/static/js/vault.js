const pageState = { allEquipments: [], equipmentToDelete: null, anomalieToDelete: null, editingEquipmentId: null, editingAnomalieId: null };

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
            filterVault(); // Mettre à jour l'affichage au changement
        }
    }
});

// ===== API =====
async function loadEquipments() {
    try {
        const url = window.isAdmin ? '/api/equipments/all' : '/api/equipments';
        pageState.allEquipments = await window.api.loadEquipments({ sources: [url], includeAnomalies: true, isAdmin: window.isAdmin });

        // Pré-calculer le poids pour le tri
        pageState.allEquipments.forEach(eq => {
            eq._weight = calculateWeight(eq);
        });

        pageState.allEquipments = groupEquipments(pageState.allEquipments);

        filterVault();
    } catch (e) {
        console.error('Erreur chargement équipements:', e);
        document.getElementById('vaultGrid').innerHTML = `<div class="vault-empty-state text-error"><span class="material-symbols-outlined">error</span>Erreur de connexion.</div>`;
    }
}




window.deleteAnomalie = function (idsStr) {
    const ids = String(idsStr).split(',');
    const firstId = Number(ids[0]);
    const eq = pageState.allEquipments.find(e => e.id === firstId && e.isAnomalie);
    if (!eq) return;

    showModal({
        title: "Détruire l'anomalie ?",
        body: `Voulez-vous vraiment détruire l'anomalie <strong class="text-white">${eq.name}</strong> ?`,
        icon: 'warning',
        confirmText: "Oui, détruire l'anomalie",
        onConfirm: async () => {
            try {
                let success = false;
                for (let id of ids) {
                    const res = await globalFetch(`/api/anomalies/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        success = true;
                        showNotif('Anomalie détruite.');
                        await loadEquipments();
                        break;
                    }
                }
                if (!success) showNotif('Impossible de détruire cette anomalie (liée).', true);
            } catch (e) {
                showNotif('Erreur réseau.', true);
            }
        }
    });
}

window.deleteEquipment = function (idsStr) {
    const ids = String(idsStr).split(',');
    const firstId = Number(ids[0]);
    const eq = pageState.allEquipments.find(e => e.id === firstId && !e.isAnomalie);
    if (!eq) return;

    const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);

    showModal({
        title: "Détruire l'équipement ?",
        body: `Voulez-vous vraiment détruire <strong class="text-white">${eq.name}</strong> ?<br><br>Vous récupérerez ${weightStr} <span class="material-symbols-outlined align-middle" class="icon-sm mt-neg-1">monetization_on</span>.`,
        icon: 'warning',
        confirmText: `Oui, détruire`,
        onConfirm: async () => {
            try {
                let success = false;
                for (let id of ids) {
                    const res = await globalFetch(`/api/equipments/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        success = true;
                        showNotif('Équipement détruit.');
                        await loadEquipments();
                        if (window.checkAuthStatus) window.checkAuthStatus();
                        break;
                    }
                }
                if (!success) showNotif('Impossible de détruire cet objet (lié).', true);
            } catch (e) {
                showNotif('Erreur réseau.', true);
            }
        }
    });
}

function groupEquipments(list) {
    let stacked = [];
    let groups = {};
    list.forEach(eq => {
        const isStackable = eq.isAnomalie || (eq.slot?.name || eq.slot) === 'CONSOMMABLE';
        if (!isStackable) {
            stacked.push(eq);
            return;
        }

        let ownerLabel = eq.personnage ? eq.personnage.name : eq.ownerUsername;
        let key = eq.isAnomalie ? `ANO_${eq.name}_${eq.level || 1}` : `CONS_${eq.name}`;
        if (window.isAdmin) {
            key += `_${ownerLabel}`;
        }

        if (!groups[key]) {
            groups[key] = { ...eq, stackIds: [eq.id], stackCount: 1, _groupOwner: ownerLabel };
        } else {
            groups[key].stackIds.push(eq.id);
            groups[key].stackCount++;
        }
    });

    return stacked.concat(Object.values(groups));
}

// ===== Rendu =====
function filterVault() {
    const searchName = document.getElementById('searchItemName').value.toLowerCase();
    const searchOwner = document.getElementById('searchOwnerName')?.value.toLowerCase() || '';
    const filterSlot = document.getElementById('filterSlot').value;
    const filterRarity = document.getElementById('filterRarity').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const sortVault = document.getElementById('sortVault').value;
    const filterConsommable = document.getElementById('filterConsommableOnly')?.checked;
    const filterAnomalie = document.getElementById('filterAnomalieOnly')?.checked;

    let filtered = pageState.allEquipments.filter(eq => {
        let matchMainType = false;

        if (filterConsommable && filterAnomalie) {
            matchMainType = eq.isAnomalie || (!eq.isAnomalie && (eq.slot?.name || eq.slot) === 'CONSOMMABLE');
        } else if (filterConsommable) {
            matchMainType = (!eq.isAnomalie && (eq.slot?.name || eq.slot) === 'CONSOMMABLE');
        } else if (filterAnomalie) {
            matchMainType = eq.isAnomalie;
        } else {
            matchMainType = (!eq.isAnomalie && (eq.slot?.name || eq.slot) !== 'CONSOMMABLE');
        }

        if (!matchMainType) return false;

        const matchName = !searchName || eq.name.toLowerCase().includes(searchName);
        const matchOwner = !searchOwner || (eq.ownerUsername && eq.ownerUsername.toLowerCase().includes(searchOwner));

        let matchSlot = true;
        if (filterSlot) {
            if (filterSlot === 'ANNEAU') {
                matchSlot = ((eq.slot?.name || eq.slot) === 'ANNEAU');
            } else if (filterSlot === 'ARME') {
                matchSlot = ((eq.slot?.name || eq.slot) === 'ARME_GAUCHE' || (eq.slot?.name || eq.slot) === 'ARME_DROITE' || (eq.slot?.name || eq.slot) === 'ARME_DEUX_MAINS');
            } else {
                matchSlot = (eq.slot?.name || eq.slot) === filterSlot;
            }
        }

        const rarityName = getRarityName(eq.rarity);
        const matchRarity = !filterRarity || rarityName === filterRarity;

        let matchStatus = true;
        if (filterStatus === 'EQUIPPED') matchStatus = eq.personnage != null;
        if (filterStatus === 'AVAILABLE') matchStatus = eq.personnage == null;

        return matchName && matchOwner && matchSlot && matchRarity && matchStatus;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVault === 'name_asc') return a.name.localeCompare(b.name);
        if (sortVault === 'name_desc') return b.name.localeCompare(a.name);

        const getRarityIndex = r => window.GRIMOIRE_META?.equipmentRarities?.findIndex(er => er.name === r) || 0;

        if (sortVault === 'rarity_desc') {
            const ra = getRarityIndex(typeof a.rarity === 'object' ? a.rarity?.name : a.rarity);
            const rb = getRarityIndex(typeof b.rarity === 'object' ? b.rarity?.name : b.rarity);
            if (ra !== rb) return rb - ra;
            return b._weight - a._weight; // Tie-breaker: weight
        }
        if (sortVault === 'rarity_asc') {
            const ra = getRarityIndex(typeof a.rarity === 'object' ? a.rarity?.name : a.rarity);
            const rb = getRarityIndex(typeof b.rarity === 'object' ? b.rarity?.name : b.rarity);
            if (ra !== rb) return ra - rb;
            return a._weight - b._weight;
        }

        if (sortVault === 'weight_desc') return b._weight - a._weight;
        if (sortVault === 'weight_asc') return a._weight - b._weight;

        return 0;
    });

    renderGrid(filtered);
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

    container.innerHTML = equipments.map(eq => {
        const rarityName = getRarityName(eq.rarity);
        const rarityClass = rarityName ? `rarity-${rarityName}` : 'rarity-COMMUN';

        if (eq.isAnomalie) {
            const spColors = {
                'ESPRIT': '#38bdf8',
                'KARMA': '#e7d198',
                'TENEBRES': '#a855f7',
                'VIOLENCE': '#a70740',
                'TRAHISON': '#ed5677',
                'SURETE': '#00e5cc',
                'RAISON': '#3b82f6',
                'DESTRUCTION': '#ff0000',
                'CREATION': '#10b981',
                'CONVICTION': '#b74c0b',
                'CONSOLIDATION': '#99674c'
            };
            const spColor = spColors[eq.spiritualite] || '#d946ef';

            const catIcon = window.CATEGORY_ICONS[eq.category] || 'category';

            let typeIcon = 'star';
            let nameIcon = catIcon;
            let typeStr = 'Magique';
            if (eq.magicObject === false) {
                typeIcon = 'category';
                typeStr = 'Matériau';
            }

            const badgeHtml = (eq.stackCount && eq.stackCount > 1)
                ? `<div class="stack-count-badge">x${eq.stackCount}</div>`
                : '';

            let adminOwnerHtml = '';
            if (window.isAdmin) {
                if (eq.isTemplate || eq.ownerUsername === 'MODELE') {
                    adminOwnerHtml = `<span class="admin-badge admin-badge-model">[MODÈLE]</span>`;
                } else {
                    const displayOwner = eq._groupOwner || eq.ownerUsername;
                    if (displayOwner) {
                        adminOwnerHtml = `<span class="admin-badge ${displayOwner === window.currentUser?.username ? 'admin-badge-self' : 'admin-badge-other'}"><span class="material-symbols-outlined align-middle text-xxs mr-1">account_circle</span>${displayOwner}</span>`;
                    }
                }
            }

            return `
            <div class="vault-card ${rarityClass} relative" data-id="${eq.id}" style="border-top: 2px solid ${spColor}; box-shadow: 0 -4px 15px ${spColor}20;">
                ${badgeHtml}
                <div class="vault-card-header">
                    <div class="vault-card-name-group">
                        <div class="vault-card-slot">
                            <span class="material-symbols-outlined text-sm" style="color: ${spColor};">${typeIcon}</span>
                            ${typeStr} <span class="opacity-50 ml-1">${eq.spiritualite}</span> <span class="opacity-50 ml-1">(Niv. ${eq.level || 1})</span>
                        </div>
                        <div class="vault-card-name flex-start-gap" style="color: #fdf4ff;">
                            <span class="material-symbols-outlined flex-shrink-0 opacity-80 mt-1" style="font-size: 1.2rem; color: ${spColor};">${catIcon}</span>
                            <span class="word-break" title="${eq.name}">${eq.name}</span>
                        </div>
                        ${adminOwnerHtml ? `<div>${adminOwnerHtml}</div>` : ''}
                    </div>
                    <div class="vault-card-actions">
                        ${window.isAdmin ? `<button class="vault-btn-edit" onclick="editAnomalie(${eq.id})" title="Modifier l'anomalie">
                            <span class="material-symbols-outlined">edit</span>
                        </button>` : ''}
                        ${(window.isAdmin || eq.ownerUsername === window.currentUser?.username) ? `<button class="vault-btn-delete" onclick="deleteAnomalie('${eq.stackIds ? eq.stackIds.join(',') : eq.id}')" title="Détruire l'anomalie">
                            <span class="material-symbols-outlined">delete</span>
                        </button>` : ''}
                    </div>
                </div>
                <div class="vault-card-stats text-sm font-italic text-center" style="color: ${spColor}; background: ${spColor}10; border-radius: 8px; padding: 1rem; border: 1px dashed ${spColor}30;">
                    ${eq.description || "Une relique impie imprégnée d'une aura mystique."}
                </div>
                <div class="vault-card-footer">
                    <div class="vault-card-weight"></div>
                    <span class="vault-card-status status-equipped" style="background: ${spColor}20; color: ${spColor};">
                        <span class="material-symbols-outlined text-sm">person</span>
                        Possédé
                    </span>
                </div>
            </div>`;
        }

        const slotInfo = getSlotInfo(eq);

        const statsHtml = window.generateEquipmentStatsHtml(eq, 'vault-stat-chip');
        const effectHtml = window.generateEquipmentEffectHtml(eq, 'vault-card-effect');
        let statusHtml = '';
        if (eq.personnage) {
            statusHtml = `<span class="vault-card-status status-equipped">
                <span class="material-symbols-outlined text-sm">person</span>
                ${eq.personnage.name}
            </span>`;
        } else {
            statusHtml = `<span class="vault-card-status status-available">
                <span class="material-symbols-outlined text-sm">check_circle</span>
                Disponible
            </span>`;
        }

        const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);

        // Optimization Color Logic
        let weightColor = '#94a3b8';
        const maxWeight = eq.maxWeight || 5;

        if (eq._weight <= 0) {
            weightColor = '#ef4444'; // Red
        } else if (eq._weight >= maxWeight) {
            weightColor = '#10b981'; // Green
        } else {
            const percentage = eq._weight / maxWeight;
            const step = Math.floor(percentage * 10); // 0 to 9
            const hue = step * 12; // 0 to 108
            weightColor = `hsl(${hue}, 80%, 55%)`;
        }

        const badgeHtml = (eq.stackCount && eq.stackCount > 1)
            ? `<div class="stack-count-badge">x${eq.stackCount}</div>`
            : '';

        let adminOwnerHtml = '';
        if (window.isAdmin) {
            if (eq.isTemplate || eq.ownerUsername === 'MODELE') {
                adminOwnerHtml = `<span class="admin-badge admin-badge-model">[MODÈLE]</span>`;
            } else {
                const displayOwner = eq._groupOwner || eq.ownerUsername;
                if (displayOwner) {
                    adminOwnerHtml = `<span class="admin-badge ${displayOwner === window.currentUser?.username ? 'admin-badge-self' : 'admin-badge-other'}"><span class="material-symbols-outlined align-middle text-xxs mr-1">account_circle</span>${displayOwner}</span>`;
                }
            }
        }

        return `
            <div class="vault-card ${rarityClass} relative">
                ${badgeHtml}
                <div class="vault-card-header">
                    <div class="vault-card-name-group">
                        <div class="vault-card-slot">
                            <span class="material-symbols-outlined ${slotInfo.extraClass || ''} text-sm" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label} ${eq.rarity ? `<span class="opacity-50 ml-1">${typeof eq.rarity === 'object' ? eq.rarity.label : eq.rarity}</span>` : ''}
                        </div>
                        <div class="vault-card-name word-break">
                            ${eq.name}
                        </div>
                        ${adminOwnerHtml ? `<div class="mt-1">${adminOwnerHtml}</div>` : ''}
                    </div>
                    <div class="vault-card-actions">
                        ${window.isAdmin ? `<button class="vault-btn-edit" onclick="editEquipment(${eq.id})" title="Modifier l'objet">
                            <span class="material-symbols-outlined">edit</span>
                        </button>` : ''}
                        ${(window.isAdmin || eq.ownerUsername === window.currentUser?.username) ? `<button class="vault-btn-delete" onclick="deleteEquipment('${eq.stackIds ? eq.stackIds.join(',') : eq.id}')" title="Détruire l'objet">
                            <span class="material-symbols-outlined">delete</span>
                        </button>` : ''}
                    </div>
                </div>
                
                <div class="vault-card-stats">
                    ${statsHtml || '<span class="text-muted text-sm font-italic">Aucune statistique de base</span>'}
                </div>
                ${effectHtml}
                
                <div class="vault-card-footer">
                    <div class="vault-card-weight" title="${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? 'Poids total' : `Poids total / Poids Max (${maxWeight})`}">
                        <span class="material-symbols-outlined text-md-num" style="color: ${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? '#10b981' : weightColor};">scale</span>
                        <span class="font-bold" style="color: ${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? '#10b981' : weightColor};">${weightStr}</span>${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? ' pts' : ` / ${maxWeight} pts`}
                    </div>
                    ${statusHtml}
                </div>
            </div>`;
    }).join('');
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
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

window.addEventListener('authLoaded', async () => {
    const btnCreate = document.getElementById('btnCreateVaultEq');
    const btnCreateAnomalie = document.getElementById('btnCreateAnomalie');
    if (btnCreate) {
        if (window.isAdmin) btnCreate.classList.remove('hidden');
        else btnCreate.classList.add('hidden');
    }
    if (btnCreateAnomalie) {
        btnCreateAnomalie.style.display = window.isAdmin ? 'flex' : 'none';
    }

    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        if (window.isAdmin) searchOwnerContainer.classList.remove('hidden');
        else searchOwnerContainer.classList.add('hidden');
    }

    await loadEquipments();
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
    if (document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = eq.baseWeight || 0;

    const catInput = document.getElementById('eqConsumableCategory');
    if (catInput && eq.consumableCategory) {
        catInput.value = eq.consumableCategory;
        const option = document.querySelector(`#eqConsumableCategoryOptions .custom-option[data-value="${eq.consumableCategory}"]`);
        if (option) {
            document.getElementById('eqConsumableCategoryLabel').innerHTML = option.innerHTML;
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

    const rarityInput = document.getElementById('eqRarity');
    const eqRarityName = getRarityName(eq.rarity);
    if (rarityInput && eqRarityName) {
        rarityInput.value = eqRarityName;
        const option = document.querySelector(`.custom-option.rarity-${eqRarityName}`);
        if (option) {
            document.getElementById('eqRarityLabel').innerHTML = option.innerHTML;
        }

        // Si l'équipement est épique ou plus, afficher la valeur
        const row = document.getElementById('eqSpecialEffectRow');
        if (eqRarityName === 'EPIQUE' || eqRarityName === 'RELIQUE' || eqRarityName === 'MAUDIT') {
            if (row) { row.classList.remove('hidden'); row.style.display = 'grid'; }
            if (document.getElementById('eqSpecialEffectBlock')) document.getElementById('eqSpecialEffectBlock').style.display = 'block';
            if (document.getElementById('eqSpecialEffectValueBlock')) document.getElementById('eqSpecialEffectValueBlock').style.display = 'block';
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



window.openCreateAnomalieModal = function () {
    pageState.editingAnomalieId = null;
    const titleEl = document.getElementById('anomalieModalTitle');
    if (titleEl) titleEl.innerText = 'Créer une anomalie';
    const btnTextEl = document.getElementById('submitAnomalieBtnText');
    if (btnTextEl) btnTextEl.innerText = "Créer l'Anomalie";
    const btnIconEl = document.getElementById('submitAnomalieBtnIcon');
    if (btnIconEl) btnIconEl.innerText = "add";

    document.getElementById('anomalieName').value = '';
    document.getElementById('anomalieDescription').value = '';
    document.getElementById('anomalieSpiritualite').value = 'TENEBRES';
    document.getElementById('anomalieLevel').value = 1;

    const toggleMagic = document.getElementById('anomalieMagicToggle');
    if (toggleMagic) {
        toggleMagic.checked = true;
        // Trigger onchange manually
        toggleMagic.dispatchEvent(new Event('change'));
    }

    document.getElementById('anomalieCreateModal').classList.add('show');
};

window.editAnomalie = function (id) {
    pageState.editingAnomalieId = id;
    const eq = pageState.allEquipments.find(e => e.id === id && e.isAnomalie);
    if (!eq) return;

    const titleEl = document.getElementById('anomalieModalTitle');
    if (titleEl) titleEl.innerText = 'Modifier une anomalie';
    const btnTextEl = document.getElementById('submitAnomalieBtnText');
    if (btnTextEl) btnTextEl.innerText = "Enregistrer";
    const btnIconEl = document.getElementById('submitAnomalieBtnIcon');
    if (btnIconEl) btnIconEl.innerText = "save";

    document.getElementById('anomalieName').value = eq.name || '';
    document.getElementById('anomalieDescription').value = eq.description || '';
    document.getElementById('anomalieSpiritualite').value = eq.spiritualite || 'TENEBRES';
    document.getElementById('anomalieCategory').value = eq.category || 'AUTRE';
    document.getElementById('anomalieLevel').value = eq.level || 1;

    // Update custom selects UI
    const spiriLabel = document.getElementById('anomalieSpiritualiteLabel');
    if (spiriLabel) {
        const option = document.querySelector(`#anomalieSpiritualiteOptions .custom-option[data-value="${eq.spiritualite || 'TENEBRES'}"]`);
        if (option) spiriLabel.innerHTML = option.innerHTML;
    }
    const catLabel = document.getElementById('anomalieCategoryLabel');
    if (catLabel) {
        const option = document.querySelector(`#anomalieCategoryOptions .custom-option[data-value="${eq.category || 'AUTRE'}"]`);
        if (option) catLabel.innerHTML = option.innerHTML;
    }
    const lvlLabel = document.getElementById('anomalieLevelLabel');
    if (lvlLabel) {
        const option = document.querySelector(`#anomalieLevelOptions .custom-option[data-value="${eq.level || 1}"]`);
        if (option) lvlLabel.innerHTML = option.innerHTML;
    }

    const isMagic = eq.magicObject !== false;
    const toggleMagic = document.getElementById('anomalieMagicToggle');
    if (toggleMagic) {
        toggleMagic.checked = isMagic;
        // Trigger onchange manually to update UI
        toggleMagic.dispatchEvent(new Event('change'));
    }

    document.getElementById('anomalieCreateModal').classList.add('show');
};

window.closeCreateAnomalieModal = function () {
    document.getElementById('anomalieCreateModal').classList.remove('show');
    pageState.editingAnomalieId = null;
};

window.submitAnomalie = async function () {
    const name = document.getElementById('anomalieName').value.trim();
    const spiritualite = document.getElementById('anomalieSpiritualite').value;
    const category = document.getElementById('anomalieCategory').value;
    const description = document.getElementById('anomalieDescription').value.trim();
    const toggleMagic = document.getElementById('anomalieMagicToggle');
    const isMagicObject = toggleMagic ? toggleMagic.checked : true;

    if (!name) {
        showNotif("Veuillez entrer un nom pour l'anomalie.", true);
        return;
    }

    const payload = {
        id: pageState.editingAnomalieId,
        name: name,
        spiritualite: spiritualite,
        category: category,
        description: description,
        level: parseInt(document.getElementById('anomalieLevel').value) || 1,
        magicObject: isMagicObject
    };

    try {
        const res = await globalFetch('/api/anomalies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            showNotif("Erreur : " + err, true);
            return;
        }

        showNotif(pageState.editingAnomalieId ? "Anomalie modifiée avec succès !" : "Anomalie créée avec succès !");
        closeCreateAnomalieModal();
        await loadEquipments(); // Recharger les anomalies et équipements
    } catch (e) {
        console.error(e);
        showNotif("Erreur lors de la sauvegarde de l'anomalie.", true);
    }
};

window.submitEquipment = async function () {
    const name = document.getElementById('eqName').value.trim();
    const slot = document.getElementById('eqSlot').value;
    if (!name) { showNotif('Nom de l\'équipement obligatoire.', true); return; }
    if (!slot) { showNotif('Slot obligatoire.', true); return; }

    const rarity = document.getElementById('eqRarity').value;

    let specialEffect = document.getElementById('eqSpecialEffect').value;
    let specialEffectValue = parseInt(document.getElementById('eqSpecialEffectValue').value) || 0;

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

    const dto = getFormEquipmentData();
    dto.id = pageState.editingEquipmentId;
    dto.name = name;
    dto.personnageId = null; // Keep null when forged from vault

    try {
        const resSim = await globalFetch('/api/equipments/simulate-weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (resSim && resSim.ok) {
            const simData = await resSim.json();
            if (simData.weight > simData.maxWeight) {
                showNotif(`Le poids (${simData.weight.toFixed(1)}) dépasse la limite (${simData.maxWeight}) !`, true);
                return;
            }
        }
    } catch (e) {
        console.error("Simulation error", e);
    }

    try {
        const res = await globalFetch('/api/equipments', {
            method: 'POST',
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

    const row = document.getElementById('eqBaseWeightRow');
    if (row) {
        if (slot === 'CONSOMMABLE') row.classList.remove('hidden');
        else row.classList.add('hidden');
        row.style.display = '';
    }

    document.querySelectorAll('.consumable-category-field').forEach(el => {
        if (slot === 'CONSOMMABLE') el.classList.remove('hidden');
        else el.classList.add('hidden');
        el.style.display = '';
    });

    const textEl = document.getElementById('eqWeightText');
    const fillEl = document.getElementById('eqWeightFill');

    const dto = getFormEquipmentData();
    if (!dto.slot) {
        if (textEl) {
            textEl.innerText = "0 / 5";
            textEl.style.color = 'var(--text-muted)';
        }
        return;
    }

    let w = 0;
    let maxW = 5;

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
        }
    } catch (e) {
        console.error("Error simulating weight:", e);
    }

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
        if (textEl) {
            textEl.style.color = color;
            textEl.style.backgroundColor = 'transparent';
            textEl.classList.remove('text-resist');
        }
    }
}



