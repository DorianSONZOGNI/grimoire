let allEquipments = [];

const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7' },
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
    const hp = eq.bonusHealthMax || 0;
    const mana = eq.bonusManaMax || 0;
    const power = eq.bonusPower || 0;
    const str = eq.bonusStrength || 0;
    const armor = eq.bonusArmor || 0;
    const res = eq.bonusResistance || 0;
    const speed = eq.bonusSpeed || 0;
    const crit = eq.bonusCrit || 0;
    const regenHp = eq.regenHealthPerTurn || 0;
    const regenMana = eq.regenManaPerTurn || 0;
    const effectValue = eq.specialEffectValue || 0;

    return (hp / 5) + (mana / 5) + (power / 2) + (str / 2) + (armor / 2) + (res / 2) + (speed * 2) + crit + regenHp + regenMana + effectValue;
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
        
        filterVault(); // Mettre à jour l'affichage au changement
    }
});

// ===== API =====
async function loadEquipments() {
    try {
        const res = await fetch('/api/equipment');
        allEquipments = await res.json();
        
        // Pré-calculer le poids pour le tri
        allEquipments.forEach(eq => {
            eq._weight = calculateWeight(eq);
        });

        filterVault();
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
        const res = await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showNotif('Équipement détruit.');
            await loadEquipments();
        } else {
            showNotif('Erreur lors de la suppression.', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    }
});

// ===== Rendu =====
function filterVault() {
    const searchName = document.getElementById('searchItemName').value.toLowerCase();
    const filterSlot = document.getElementById('filterSlot').value;
    const filterRarity = document.getElementById('filterRarity').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const sortVault = document.getElementById('sortVault').value;

    let filtered = allEquipments.filter(eq => {
        const matchName = !searchName || eq.name.toLowerCase().includes(searchName);
        
        let matchSlot = true;
        if (filterSlot) {
            if (filterSlot === 'ANNEAU') {
                matchSlot = (eq.slot === 'ANNEAU_GAUCHE' || eq.slot === 'ANNEAU_DROIT');
            } else {
                matchSlot = eq.slot === filterSlot;
            }
        }
        
        const matchRarity = !filterRarity || eq.rarity === filterRarity;
        
        let matchStatus = true;
        if (filterStatus === 'EQUIPPED') matchStatus = eq.personnage != null;
        if (filterStatus === 'AVAILABLE') matchStatus = eq.personnage == null;

        return matchName && matchSlot && matchRarity && matchStatus;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVault === 'name_asc') return a.name.localeCompare(b.name);
        if (sortVault === 'name_desc') return b.name.localeCompare(a.name);
        
        if (sortVault === 'rarity_desc') {
            const ra = RARITY_ORDER[a.rarity] || 0;
            const rb = RARITY_ORDER[b.rarity] || 0;
            if (ra !== rb) return rb - ra;
            return b._weight - a._weight; // Tie-breaker: weight
        }
        if (sortVault === 'rarity_asc') {
            const ra = RARITY_ORDER[a.rarity] || 0;
            const rb = RARITY_ORDER[b.rarity] || 0;
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
                <span class="material-symbols-outlined" style="font-size: 3rem; opacity: 0.5;">search_off</span>
                Aucun objet ne correspond à votre recherche.
            </div>`;
        return;
    }

    container.innerHTML = equipments.map(eq => {
        const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
        
        const statsHtml = STAT_DEFS
            .filter(s => eq[s.key] && eq[s.key] !== 0)
            .map(s => {
                const val = eq[s.key];
                const isMalus = val < 0;
                const sign = val > 0 ? '+' : '';
                return `<span class="vault-stat-chip ${isMalus ? 'malus' : ''}">
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
            effectHtml = `<div class="vault-card-effect">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">auto_awesome</span>
                ${label} : ${eq.specialEffectValue}
            </div>`;
        }

        const rarityClass = eq.rarity ? `rarity-${eq.rarity}` : 'rarity-COMMUN';
        
        let statusHtml = '';
        if (eq.personnage) {
            statusHtml = `<span class="vault-card-status status-equipped">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">person</span>
                ${eq.personnage.name}
            </span>`;
        } else {
            statusHtml = `<span class="vault-card-status status-available">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">check_circle</span>
                Disponible
            </span>`;
        }

        const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);

        // Optimization Color Logic
        let weightColor = '#94a3b8';
        const limitsForSlot = WEIGHT_LIMITS[eq.slot] || {};
        const maxWeight = limitsForSlot[eq.rarity || 'COMMUN'] || 5;

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

        return `
            <div class="vault-card ${rarityClass}">
                <div class="vault-card-header">
                    <div class="vault-card-name-group">
                        <div class="vault-card-slot">
                            <span class="material-symbols-outlined" style="font-size: 0.9rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label} ${eq.rarity ? `<span style="opacity:0.5; margin-left:4px;">${eq.rarity}</span>` : ''}
                        </div>
                        <div class="vault-card-name">${eq.name}</div>
                    </div>
                    <div class="vault-card-actions">
                        <button class="vault-btn-delete" onclick="deleteEquipment(${eq.id})" title="Détruire l'objet">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                
                <div class="vault-card-stats">
                    ${statsHtml || '<span style="color:#64748b; font-size:0.85rem; font-style:italic;">Aucune statistique de base</span>'}
                </div>
                ${effectHtml}
                
                <div class="vault-card-footer">
                    <div class="vault-card-weight" title="Poids total / Poids Max (${maxWeight})">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${weightColor};">scale</span>
                        <span style="color: ${weightColor}; font-weight: 600;">${weightStr}</span> / ${maxWeight} pts
                    </div>
                    ${statusHtml}
                </div>
            </div>`;
    }).join('');
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadEquipments();
});
