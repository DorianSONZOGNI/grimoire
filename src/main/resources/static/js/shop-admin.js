let allEquipments = [];

const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' },
};

const RARITY_ORDER = {
    'COMMUN': 1,
    'RARE': 2,
    'LEGENDAIRE': 3,
    'EPIQUE': 4,
    'RELIQUE': 5
};

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
];

const WEIGHT_LIMITS = {
    CASQUE: { COMMUN: 5, RARE: 9, LEGENDAIRE: 14, EPIQUE: 20, RELIQUE: 24 },
    PLASTRON: { COMMUN: 8, RARE: 13, LEGENDAIRE: 20, EPIQUE: 26, RELIQUE: 30 },
    ANNEAU_GAUCHE: { COMMUN: 2, RARE: 3, LEGENDAIRE: 5, EPIQUE: 7, RELIQUE: 8 },
    ANNEAU_DROIT: { COMMUN: 2, RARE: 3, LEGENDAIRE: 5, EPIQUE: 7, RELIQUE: 8 },
    BOTTES: { COMMUN: 4, RARE: 7, LEGENDAIRE: 11, EPIQUE: 16, RELIQUE: 20 },
    CAPE: { COMMUN: 5, RARE: 9, LEGENDAIRE: 14, EPIQUE: 20, RELIQUE: 24 }
};

function calculateWeight(eq) {
    let w = 0;
    w += (eq.bonusHealthMax || 0) * 0.2;
    w += (eq.bonusManaMax || 0) * 0.2;
    w += (eq.bonusPower || 0) * 2.0;
    w += (eq.bonusStrength || 0) * 2.0;
    w += (eq.bonusArmor || 0) * 1.0;
    w += (eq.bonusResistance || 0) * 1.0;
    w += (eq.bonusSpeed || 0) * 2.0;
    w += (eq.bonusCrit || 0) * 1.0;
    w += (eq.regenHealthPerTurn || 0) * 1.0;
    w += (eq.regenManaPerTurn || 0) * 1.0;

    const rarity = eq.rarity;
    if (rarity === 'EPIQUE' || rarity === 'RELIQUE') {
        const specialEffect = eq.specialEffect;
        const effectVal = eq.specialEffectValue || 0;

        if (specialEffect && specialEffect !== 'NONE' && effectVal > 0) {
            w += effectVal * 1.0;
        }
    }
    return w;
}

function showNotif(message, isError = false) {
    const notif = document.getElementById('vaultNotif');
    const text = document.getElementById('vaultNotifText');
    text.textContent = message;
    notif.classList.remove('error');
    if (isError) notif.classList.add('error');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
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
            if (val === 'EPIQUE' || val === 'RELIQUE') {
                row.style.display = 'grid';
                const isEpic = val === 'EPIQUE';
                const color = isEpic ? '#ef4444' : '#c084fc';
                const bg = isEpic ? 'rgba(239, 68, 68, 0.05)' : 'rgba(168, 85, 247, 0.05)';
                const border = isEpic ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px dashed rgba(168, 85, 247, 0.3)';
                const inputBorder = isEpic ? 'rgba(239, 68, 68, 0.3)' : 'rgba(192, 132, 252, 0.3)';
                row.style.background = bg;
                row.style.border = border;
                document.getElementById('eqSpecialEffectLabelTitle').style.color = color;
                document.getElementById('eqSpecialEffectValueTitle').style.color = color;
                document.getElementById('eqSpecialEffectTrigger').style.borderColor = inputBorder;
                document.getElementById('eqSpecialEffectValue').style.borderColor = inputBorder;
            } else {
                row.style.display = 'none';
                document.getElementById('eqSpecialEffect').value = 'NONE';
                document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">not_interested</span> Aucun';
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
        const res = await fetch('/api/shop/templates');
        if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
                document.getElementById('vaultGrid').innerHTML = `<div style="color: #ef4444;"><span class="material-symbols-outlined">error</span> Accès refusé.</div>`;
            }
            return;
        }
        allEquipments = await res.json();
        allEquipments.forEach(eq => {
            eq._weight = calculateWeight(eq);
        });
        renderVault();
    } catch (e) {
        console.error('Erreur chargement équipements:', e);
        document.getElementById('vaultGrid').innerHTML = `<div class="vault-empty-state" style="color: #ef4444;"><span class="material-symbols-outlined">error</span>Erreur de connexion.</div>`;
    }
}

let equipmentToDelete = null;

function deleteEquipment(id) {
    equipmentToDelete = id;
    const eq = allEquipments.find(e => e.id === id);
    if (eq) {
        document.getElementById('deleteTargetName').textContent = eq.name;
        const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);
        document.getElementById('deleteConfirmBtn').innerHTML = `Oui, détruire pour ${weightStr} <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-top: -2px;">monetization_on</span>`;
    }
    document.getElementById('deleteConfirmModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
    equipmentToDelete = null;
}

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
    if (!equipmentToDelete) return;

    const id = equipmentToDelete;
    closeDeleteModal();

    try {
        const res = await fetch(`/api/shop/templates/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showNotif('Équipement détruit.');
            await loadEquipments();
            if (window.checkAuthStatus) {
                window.checkAuthStatus();
            }
        } else {
            showNotif('Erreur lors de la suppression.', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    }
});

// ===== Rendu =====
function renderVault() {
    // Sort allEquipments: rarity order, then slot, then name
    const rarityOrder = { 'RELIQUE': 0, 'EPIQUE': 1, 'LEGENDAIRE': 2, 'RARE': 3, 'COMMUN': 4 };
    const slotOrder = { 'CASQUE': 1, 'PLASTRON': 2, 'ANNEAU_GAUCHE': 3, 'ANNEAU_DROIT': 3, 'BOTTES': 4, 'CAPE': 5 };

    let sorted = [...allEquipments].sort((a, b) => {
        const rA = rarityOrder[a.rarity || 'COMMUN'];
        const rB = rarityOrder[b.rarity || 'COMMUN'];
        if (rA !== rB) return rA - rB;
        
        const sA = slotOrder[a.slot] || 99;
        const sB = slotOrder[b.slot] || 99;
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
                <span class="material-symbols-outlined" style="font-size: 3rem; opacity: 0.5;">search_off</span>
                Aucun objet ne correspond à votre recherche.
            </div>`;
        return;
    }

    const groups = {
        COMMUN: [],
        RARE: [],
        LEGENDAIRE: [],
        EPIQUE: [],
        RELIQUE: []
    };

    equipments.forEach(eq => {
        const rarity = eq.rarity || 'COMMUN';
        if (groups[rarity]) {
            groups[rarity].push(eq);
        } else {
            groups['COMMUN'].push(eq);
        }
    });

    const RARITY_LABELS = {
        COMMUN: { label: 'Commun', icon: 'lens' },
        RARE: { label: 'Rare', icon: 'adjust' },
        LEGENDAIRE: { label: 'Légendaire', icon: 'workspace_premium' },
        EPIQUE: { label: 'Épique', icon: 'whatshot' },
        RELIQUE: { label: 'Relique', icon: 'webhook' }
    };

    let html = '';

    for (const [rarity, items] of Object.entries(groups)) {
        if (items.length === 0) continue;

        const rarityInfo = RARITY_LABELS[rarity];

        html += `
            <div class="shop-admin-section">
                <div class="shop-admin-header rarity-${rarity}">
                    <span class="material-symbols-outlined" style="font-size: 1.3rem;">${rarityInfo.icon}</span>
                    ${rarityInfo.label}
                </div>
                <div class="shop-admin-list">
        `;

        items.forEach(eq => {
            const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };

            const statsHtml = STAT_DEFS
                .filter(s => eq[s.key] && eq[s.key] !== 0)
                .map(s => {
                    const val = eq[s.key];
                    const isMalus = val < 0;
                    const sign = val > 0 ? '+' : '';
                    return `<span class="stat-badge ${isMalus ? 'malus' : ''}">
                        <span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size: 0.8rem;">${s.icon}</span>
                        ${sign}${val}
                    </span>`;
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
                effectHtml = `<span class="stat-badge" style="background: rgba(168, 85, 247, 0.1); color: #c084fc;">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">auto_awesome</span>
                    ${label} : ${eq.specialEffectValue}
                </span>`;
            }

            const displayPrice = eq.shopPrice !== undefined ? (eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1)) : calculateShopPrice(eq._weight || 0, eq.rarity || 'COMMUN', eq.slot);

            html += `
                <div class="shop-admin-row">
                    <div class="shop-admin-row-name">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.4rem; color: ${slotInfo.color};" title="${slotInfo.label}">${slotInfo.icon}</span>
                        ${eq.name}
                        ${window.isAdmin && eq.ownerUsername ? `<span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${eq.ownerUsername === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${eq.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined" style="font-size: 0.7rem; vertical-align: middle; margin-right: 2px;">account_circle</span>${eq.ownerUsername}</span>` : ''}
                    </div>
                    
                    <div class="shop-admin-row-stats">
                        ${statsHtml || '<span style="color:#64748b; font-style:italic;">Aucune stat</span>'}
                        ${effectHtml}
                    </div>

                    <div class="shop-admin-row-price">
                        ${displayPrice}
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">monetization_on</span>
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

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadEquipments();

    // Listeners for Weight Calculation
    const eqInputs = ['eqSlot', 'eqRarity', 'eqHp', 'eqMana', 'eqPower', 'eqStr', 'eqArmor', 'eqRes', 'eqSpeed', 'eqCrit', 'eqRegenHp', 'eqRegenMana', 'eqSpecialEffectValue'];
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
        const slots = ['CASQUE', 'PLASTRON', 'ANNEAU_GAUCHE', 'ANNEAU_DROIT', 'BOTTES', 'CAPE'];
        slotOptionsContainer.innerHTML = slots.map(s => {
            const info = SLOT_LABELS[s];
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
    if (allEquipments && allEquipments.length > 0) {
        renderVault();
    }
});

// ===== Equipment Creation / Edition =====

let editingEquipmentId = null;

window.openCreateEqModal = function () {
    editingEquipmentId = null;
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
    document.getElementById('eqRegenHp').value = 0;
    document.getElementById('eqRegenMana').value = 0;

    // Reset Rarity
    const rarityInput = document.getElementById('eqRarity');
    if (rarityInput) {
        rarityInput.value = 'COMMUN';
        document.getElementById('eqRarityLabel').innerHTML = '<span class="cs-icon" style="color: #94a3b8; font-weight: bold;">C</span> Commun';
        const row = document.getElementById('eqSpecialEffectRow');
        if (row) row.style.display = 'none';
    }

    // Reset Special Effect
    const effectInput = document.getElementById('eqSpecialEffect');
    if (effectInput) {
        effectInput.value = 'NONE';
        document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">not_interested</span> Aucun';
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
    editingEquipmentId = id;
    const eq = allEquipments.find(e => e.id === id);
    if (!eq) return;

    document.getElementById('equipModalTitle').innerHTML = 'Modifier un objet';
    document.getElementById('submitEquipmentBtn').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">save</span> Enregistrer';

    document.getElementById('eqName').value = eq.name || '';
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

    // Slot Setup
    const slotInput = document.getElementById('eqSlot');
    if (slotInput && eq.slot) {
        slotInput.value = eq.slot;
        const info = SLOT_LABELS[eq.slot];
        if (info) {
            document.getElementById('eqSlotLabel').innerHTML = `<span class="material-symbols-outlined cs-icon ${info.extraClass || ''}" style="color: ${info.color};">${info.icon}</span> ${info.label}`;
        }
    }

    // Rarity Setup
    const rarityInput = document.getElementById('eqRarity');
    if (rarityInput && eq.rarity) {
        rarityInput.value = eq.rarity;
        const option = document.querySelector(`.custom-option.rarity-${eq.rarity}`);
        if (option) {
            document.getElementById('eqRarityLabel').innerHTML = option.innerHTML;
        }

        const row = document.getElementById('eqSpecialEffectRow');
        if (eq.rarity === 'EPIQUE' || eq.rarity === 'RELIQUE') {
            if (row) row.style.display = 'grid';

            const isEpic = eq.rarity === 'EPIQUE';
            const color = isEpic ? '#ef4444' : '#c084fc';
            const bg = isEpic ? 'rgba(239, 68, 68, 0.05)' : 'rgba(168, 85, 247, 0.05)';
            const border = isEpic ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px dashed rgba(168, 85, 247, 0.3)';
            const inputBorder = isEpic ? 'rgba(239, 68, 68, 0.3)' : 'rgba(192, 132, 252, 0.3)';

            if (row) {
                row.style.background = bg;
                row.style.border = border;
            }

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

window.submitEquipment = async function () {
    const name = document.getElementById('eqName').value.trim();
    const slot = document.getElementById('eqSlot').value;
    if (!name) { showNotif('Nom de l\'équipement obligatoire.', true); return; }
    if (!slot) { showNotif('Slot obligatoire.', true); return; }

    const rarity = document.getElementById('eqRarity').value;
    const maxWeight = (WEIGHT_LIMITS[slot] && WEIGHT_LIMITS[slot][rarity]) ? WEIGHT_LIMITS[slot][rarity] : 5;
    const currentWeight = calculateEquipmentWeight();
    if (currentWeight > maxWeight) {
        showNotif('Le poids de cet équipement dépasse la limite autorisée !', true);
        return;
    }

    let specialEffect = document.getElementById('eqSpecialEffect').value;
    let specialEffectValue = parseInt(document.getElementById('eqSpecialEffectValue').value) || 0;

    if (rarity !== 'EPIQUE' && rarity !== 'RELIQUE') {
        specialEffect = 'NONE';
        specialEffectValue = 0;
    } else {
        if (specialEffect === 'NONE') {
            specialEffectValue = 0;
        }
    }

    if (specialEffect !== 'NONE' && specialEffectValue <= 0) {
        showNotif('La valeur de l\'effet spécial doit être strictement supérieure à 0.', true);
        return;
    }

    const dto = {
        id: editingEquipmentId,
        name,
        slot,
        bonusHealthMax: parseInt(document.getElementById('eqHp').value) || 0,
        bonusManaMax: parseInt(document.getElementById('eqMana').value) || 0,
        bonusPower: parseInt(document.getElementById('eqPower').value) || 0,
        bonusStrength: parseInt(document.getElementById('eqStr').value) || 0,
        bonusArmor: parseInt(document.getElementById('eqArmor').value) || 0,
        bonusResistance: parseInt(document.getElementById('eqRes').value) || 0,
        bonusSpeed: parseInt(document.getElementById('eqSpeed').value) || 0,
        bonusCrit: parseInt(document.getElementById('eqCrit').value) || 0,
        regenHealthPerTurn: parseInt(document.getElementById('eqRegenHp').value) || 0,
        regenManaPerTurn: parseInt(document.getElementById('eqRegenMana').value) || 0,
        rarity,
        specialEffect,
        specialEffectValue,
        personnageId: null, // Keep null when forged from vault
    };

    try {
        let url = '/api/shop/templates';
        let method = 'POST';
        if (editingEquipmentId) {
            url += `/${editingEquipmentId}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
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
        showNotif(editingEquipmentId ? 'Équipement modifié !' : 'Équipement forgé !');
        await loadEquipments();
    } catch (e) {
        console.error(e);
        showNotif('Erreur réseau', true);
    }
}

function calculateEquipmentWeight() {
    let w = 0;
    w += (parseInt(document.getElementById('eqHp').value) || 0) * 0.2;
    w += (parseInt(document.getElementById('eqMana').value) || 0) * 0.2;
    w += (parseInt(document.getElementById('eqPower').value) || 0) * 2.0;
    w += (parseInt(document.getElementById('eqStr').value) || 0) * 2.0;
    w += (parseInt(document.getElementById('eqArmor').value) || 0) * 1.0;
    w += (parseInt(document.getElementById('eqRes').value) || 0) * 1.0;
    w += (parseInt(document.getElementById('eqSpeed').value) || 0) * 2.0;
    w += (parseInt(document.getElementById('eqCrit').value) || 0) * 1.0;
    w += (parseInt(document.getElementById('eqRegenHp').value) || 0) * 1.0;
    w += (parseInt(document.getElementById('eqRegenMana').value) || 0) * 1.0;

    // Add special effect weight if Epic/Relic
    const rarity = document.getElementById('eqRarity').value;
    if (rarity === 'EPIQUE' || rarity === 'RELIQUE') {
        const specialEffect = document.getElementById('eqSpecialEffect').value;
        const effectVal = parseInt(document.getElementById('eqSpecialEffectValue').value) || 0;

        if (specialEffect !== 'NONE' && effectVal > 0) {
            w += effectVal * 1.0;
        }
    }
    return w;
}
function calculateShopPrice(weight, rarity, slot) {
    let multiplier = 1;
    if (rarity === 'COMMUN') multiplier = 1;
    else if (rarity === 'RARE') multiplier = 2;
    else if (rarity === 'LEGENDAIRE') multiplier = 3;
    else if (rarity === 'EPIQUE') multiplier = 5;
    else if (rarity === 'RELIQUE') multiplier = 6;

    let slotMultiplier = 1.0;
    if (slot === 'PLASTRON') slotMultiplier = 1.1;
    else if (slot === 'ANNEAU_GAUCHE' || slot === 'ANNEAU_DROIT') slotMultiplier = 1.5;
    else if (slot === 'BOTTES') slotMultiplier = 0.9;
    else if (slot === 'CAPE') slotMultiplier = 1.2;

    return Math.ceil(weight * 2 * multiplier * slotMultiplier);
}

window.updateWeightUI = function () {
    const slot = document.getElementById('eqSlot').value;
    const rarity = document.getElementById('eqRarity').value;
    const w = calculateEquipmentWeight();

    const limitsForSlot = WEIGHT_LIMITS[slot] || {};
    const maxW = limitsForSlot[rarity || 'COMMUN'] || 5;

    const fillEl = document.getElementById('eqWeightFill');
    const textEl = document.getElementById('eqWeightText');

    if (textEl) {
        const displayW = w % 1 === 0 ? w : w.toFixed(1);
        textEl.innerText = `${displayW} / ${maxW}`;
    }

    if (fillEl) {
        let pct = (w / maxW) * 100;
        let color = '#10b981';

        if (pct < 0) {
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

    const price = calculateShopPrice(w, rarity || 'COMMUN', slot);
    const priceEl = document.getElementById('eqPriceText');
    if (priceEl) {
        const displayPrice = price % 1 === 0 ? price : price.toFixed(1);
        priceEl.innerHTML = `${displayPrice} <span class="material-symbols-outlined" style="font-size: 1.2rem;">monetization_on</span>`;
    }
}
