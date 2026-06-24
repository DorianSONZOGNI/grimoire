// ===== Armory Page JavaScript =====

function applyRbac() {
    if (window.currentUser !== undefined && !window.isAdmin) {
        const baseStats = document.getElementById('baseStatsSection');
        if (baseStats) baseStats.style.display = 'none';
        
        const xpField = document.getElementById('charExperience');
        if (xpField && xpField.parentElement) xpField.parentElement.style.display = 'none';
        
        const spiritExpField = document.getElementById('charSpiritExperience');
        if (spiritExpField && spiritExpField.parentElement) spiritExpField.parentElement.style.display = 'none';
        
        const eqCreateSection = document.querySelector('.equip-create-section');
        if (eqCreateSection) eqCreateSection.style.display = 'none';
    }
    
    // Re-render characters to apply button visibility rules
    if (personnages.length > 0) {
        updateCharsList();
    }
}
window.addEventListener('authLoaded', applyRbac);

let voies = [];
let spiritualites = [];
let personnages = [];
let editingId = null;
let equipModalPersoId = null;
let allEquipments = [];

const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau G.', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau D.', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' },
    CONSOMMABLE: { label: 'Consommable', icon: 'inventory_2', color: '#854c4c' }
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
    CAPE: { COMMUN: 5, RARE: 9, LEGENDAIRE: 14, EPIQUE: 20, RELIQUE: 24 },
    CONSOMMABLE: { COMMUN: 5, RARE: 9, LEGENDAIRE: 14, EPIQUE: 20, RELIQUE: 24 }
};

function calculateEquipmentWeight() {
    const hp = parseFloat(document.getElementById('eqHp').value) || 0;
    const mana = parseFloat(document.getElementById('eqMana').value) || 0;
    const power = parseFloat(document.getElementById('eqPower').value) || 0;
    const str = parseFloat(document.getElementById('eqStr').value) || 0;
    const armor = parseFloat(document.getElementById('eqArmor').value) || 0;
    const res = parseFloat(document.getElementById('eqRes').value) || 0;
    const speed = parseFloat(document.getElementById('eqSpeed').value) || 0;
    const crit = parseFloat(document.getElementById('eqCrit').value) || 0;
    const regenHp = parseFloat(document.getElementById('eqRegenHp').value) || 0;
    const regenMana = parseFloat(document.getElementById('eqRegenMana').value) || 0;
    const effectValue = parseFloat(document.getElementById('eqSpecialEffectValue').value) || 0;
    const baseWeightVal = parseFloat(document.getElementById('eqBaseWeight')?.value) || 0;

    return (hp / 5) + (mana / 5) + (power / 2) + (str / 2) + (armor / 2) + (res / 2) + (speed * 2) + crit + regenHp + regenMana + effectValue + baseWeightVal;
}

function updateWeightUI() {
    const slot = document.getElementById('eqSlot').value;
    const rarity = document.getElementById('eqRarity').value;
    
    const row = document.getElementById('eqBaseWeightRow');
    if (row) {
        row.style.display = slot === 'CONSOMMABLE' ? 'flex' : 'none';
    }
    
    let maxWeight = 5; // Fallback
    if (slot && rarity && WEIGHT_LIMITS[slot] && WEIGHT_LIMITS[slot][rarity]) {
        maxWeight = WEIGHT_LIMITS[slot][rarity];
    }

    const currentWeight = calculateEquipmentWeight();
    let pct = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
    
    const textEl = document.getElementById('eqWeightText');
    const fillEl = document.getElementById('eqWeightFill');
    const btn = document.getElementById('submitEquipmentBtn');
    
    if (textEl && fillEl) {
        const displayW = currentWeight % 1 === 0 ? currentWeight : currentWeight.toFixed(1);
        
        if (slot === 'CONSOMMABLE') {
            textEl.innerText = `${displayW}`;
            fillEl.style.width = `0%`;
            textEl.style.color = '#94a3b8'; // Normal
            fillEl.style.background = '#10b981'; // Green
            if (btn) {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        } else {
            textEl.innerText = `${displayW} / ${maxWeight}`;
            fillEl.style.width = `${Math.min(pct, 100)}%`;
            
            if (currentWeight > maxWeight) {
                textEl.style.color = '#ef4444'; // Red
                fillEl.style.background = '#ef4444';
                if (btn) {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }
            } else if (pct > 80) {
                textEl.style.color = '#f59e0b'; // Orange
                fillEl.style.background = '#f59e0b';
                if (btn) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            } else {
                textEl.style.color = '#94a3b8'; // Normal
                fillEl.style.background = '#10b981'; // Green
                if (btn) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            }
        }
    }
}

// ===== API =====

async function fetchMeta() {
    try {
        const res = await fetch('/api/spells-editor/meta');
        const data = await res.json();
        voies = data.voies || [];
        spiritualites = data.spiritualites || [];
        populateSelects();
    } catch (e) {
        console.error('Erreur chargement meta:', e);
    }
}

async function loadPersonnages() {
    try {
        const url = window.isAdmin ? '/api/personnages/all' : '/api/personnages';
        const res = await fetch(url);
        personnages = await res.json();
        renderPersonnages();
        await updateCharLimitUI();
    } catch (e) {
        console.error('Erreur chargement personnages:', e);
    }
}

async function updateCharLimitUI() {
    try {
        const res = await fetch('/api/personnages/limit');
        if (res.ok) {
            const data = await res.json();
            const limitContainer = document.getElementById('charLimitContainer');
            if (!limitContainer) return;

            const isMaxedOut = data.currentCharacters >= data.maxCharacters;
            const color = (isMaxedOut && !window.isAdmin) ? '#ef4444' : '#94a3b8';
            
            let html = `<span style="font-size: 0.9rem; color: ${color}; font-weight: 500;">${data.currentCharacters}/${data.maxCharacters}</span>`;

            if (isMaxedOut && data.maxCharacters < 8 && !window.isAdmin) {
                const costs = {2: 20, 3: 50, 4: 75, 5: 150, 6: 200, 7: 300};
                const cost = costs[data.maxCharacters];
                html += `<button onclick="buyRosterSlot(${cost})" style="margin-left: 0.5rem; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981; border-radius: 4px; cursor: pointer; padding: 0.1rem 0.3rem; display: inline-flex; align-items: center;" title="Acheter un emplacement pour ${cost} or"><span class="material-symbols-outlined" style="font-size: 0.9rem;">add</span></button>`;
            }

            limitContainer.innerHTML = html;
        }
    } catch (e) {
        console.error('Erreur limite personnages:', e);
    }
}

window.buyRosterSlot = function(cost) {
    document.getElementById('rosterSlotCostText').textContent = cost;
    document.getElementById('buyRosterModal').classList.add('show');
};

window.closeRosterModal = function() {
    document.getElementById('buyRosterModal').classList.remove('show');
};

document.getElementById('buyRosterConfirmBtn').addEventListener('click', async () => {
    closeRosterModal();
    try {
        const res = await fetch('/api/auth/unlock/roster', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showNotif(data.message);
            // Update auth state so UI syncs
            await fetch('/api/auth/me').then(r => r.json()).then(u => {
                if (window.updateGoldDisplay) window.updateGoldDisplay(u.monnaie);
                window.currentUser = u;
            });
            await updateCharLimitUI();
            
            // Si le panneau de création était caché par applyRbac (pas géré directement mais au cas où)
            const eqCreateSection = document.querySelector('.equip-create-section');
            if (eqCreateSection && window.currentUser) eqCreateSection.style.display = 'block';
            
        } else {
            showNotif(data.message, true);
        }
    } catch (e) {
        showNotif('Erreur réseau', true);
    }
});

async function loadAllEquipments() {
    try {
        const url = window.isAdmin ? '/api/equipment/all' : '/api/equipment';
        const res = await fetch(url);
        allEquipments = await res.json();
    } catch (e) {
        console.error('Erreur chargement équipements:', e);
        allEquipments = [];
    }
}

async function submitPersonnage() {
    const name = document.getElementById('charName').value.trim();
    if (!name) {
        showNotif('Le nom est obligatoire.', true);
        return;
    }

    const voieIdVal = document.getElementById('charVoie').value;
    const spiritIdVal = document.getElementById('charSpirit').value;
    if (!editingId && (!voieIdVal || !spiritIdVal)) {
        showNotif('Une Voie et une Spiritualité sont obligatoires à la création.', true);
        return;
    }

    const dto = {
        id: editingId,
        name: name,
        healthMax: parseInt(document.getElementById('charHp').value) || 100,
        manaMax: parseInt(document.getElementById('charMana').value) || 100,
        power: parseInt(document.getElementById('charPower').value) || 0,
        strength: parseInt(document.getElementById('charStrength').value) || 0,
        armor: parseInt(document.getElementById('charArmor').value) || 0,
        resistance: parseInt(document.getElementById('charResistance').value) || 0,
        speed: parseInt(document.getElementById('charSpeed').value) || 0,
        crit: parseInt(document.getElementById('charCrit').value) || 0,
        voieId: document.getElementById('charVoie').value || null,
        experience: parseInt(document.getElementById('charExperience').value) || 0,
        spiritualiteId: document.getElementById('charSpirit').value || null,
        spiritualiteExperience: parseInt(document.getElementById('charSpiritExperience').value) || 0,
    };

    if (dto.voieId === '') dto.voieId = null;
    if (dto.spiritualiteId === '') dto.spiritualiteId = null;
    if (dto.voieId) dto.voieId = parseInt(dto.voieId);
    if (dto.spiritualiteId) dto.spiritualiteId = parseInt(dto.spiritualiteId);

    try {
        const res = await fetch('/api/personnages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        const data = await res.json();
        showNotif(data.message || 'Personnage sauvegardé !');
        resetForm();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de la sauvegarde.', true);
        console.error(e);
    }
}

let persoToDelete = null;

function deletePersonnage(id) {
    persoToDelete = id;
    const p = personnages.find(p => p.id === id);
    if (p) {
        document.getElementById('deletePersoTargetName').textContent = p.name;
    }
    document.getElementById('deletePersonnageModal').classList.add('show');
}

window.closeDeletePersoModal = function() {
    document.getElementById('deletePersonnageModal').classList.remove('show');
    persoToDelete = null;
};

document.getElementById('deletePersoConfirmBtn').addEventListener('click', async () => {
    if (!persoToDelete) return;
    const id = persoToDelete;
    closeDeletePersoModal();
    
    try {
        await fetch(`/api/personnages/${id}`, { method: 'DELETE' });
        showNotif('Personnage supprimé.');
        if (editingId === id) resetForm();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de la suppression.', true);
    }
});

// ===== Equipment API =====

async function submitEquipment() {
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

    // Security: Only Epic and Relic can have special effects
    if (rarity !== 'EPIQUE' && rarity !== 'RELIQUE') {
        specialEffect = 'NONE';
        specialEffectValue = 0;
    } else {
        // If they chose no effect on an Epic/Relic, we just ignore the value
        if (specialEffect === 'NONE') {
            specialEffectValue = 0;
        }
    }

    // Security: Special effect value must be strictly positive
    if (specialEffect !== 'NONE' && specialEffectValue <= 0) {
        showNotif('La valeur de l\'effet spécial doit être strictement supérieure à 0.', true);
        return;
    }

    const dto = {
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
        baseWeight: parseFloat(document.getElementById('eqBaseWeight')?.value) || 0,
        rarity,
        specialEffect,
        specialEffectValue,
        personnageId: equipModalPersoId,
    };

    try {
        const res = await fetch('/api/equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        const data = await res.json();
        if (!res.ok) {
            showNotif(data.message || 'Erreur', true);
            return;
        }
        showNotif(data.message || 'Équipement créé !');
        // Reset equipment form
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
        if(document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = 0;
        document.getElementById('eqRarity').value = 'COMMUN';
        document.getElementById('eqSpecialEffect').value = 'NONE';
        document.getElementById('eqSpecialEffectValue').value = 0;
        document.getElementById('eqSpecialEffectRow').style.display = 'none';
        
        updateWeightUI(); // Update UI after reset
        
        await loadAllEquipments();
        renderEquipModal();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur création équipement.', true);
    }
}

async function equipItem(equipmentId, personnageId, targetSlot = null) {
    try {
        let url = `/api/equipment/${equipmentId}/equip/${personnageId}`;
        if (targetSlot) {
            url += `?targetSlot=${targetSlot}`;
        }
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            showNotif(data.message || 'Erreur', true);
            // Reset dropdown
            renderEquipModal();
            return;
        }
        showNotif(data.message);
        await loadAllEquipments();
        renderEquipModal();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de l\'équipement.', true);
    }
}

async function unequipItem(equipmentId) {
    try {
        const res = await fetch(`/api/equipment/${equipmentId}/unequip`, { method: 'POST' });
        const data = await res.json();
        showNotif(data.message);
        await loadAllEquipments();
        renderEquipModal();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors du déséquipement.', true);
    }
}

async function deleteEquipment(id) {
    try {
        await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
        showNotif('Équipement supprimé.');
        await loadAllEquipments();
        renderEquipModal();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur suppression.', true);
    }
}

// ===== UI =====

// Helpers for icons and colors
function getVoieInfo(nom) {
    if (!nom) return { icon: 'trip_origin', color: '#94a3b8' };
    const n = nom.toLowerCase();
    if (n.includes('raison')) return { icon: 'psychology', color: '#3b82f6' };
    if (n.includes('sûreté') || n.includes('surete')) return { icon: 'water_drop', color: '#00e5cc' };
    if (n.includes('trahison')) return { icon: 'visibility_off', color: '#ed5677' };
    if (n.includes('consolidation')) return { icon: 'foundation', color: '#99674c' };
    if (n.includes('conviction')) return { icon: 'volcano', color: '#b74c0b' };
    if (n.includes('création') || n.includes('creation')) return { icon: 'eco', color: '#10b981' };
    if (n.includes('destruction')) return { icon: 'local_fire_department', color: '#ff0000' };
    if (n.includes('violence')) return { icon: 'explosion', color: '#a70740' };
    return { icon: 'route', color: '#94a3b8' };
}

function getSpiritInfo(nom) {
    if (!nom) return { icon: 'trip_origin', color: '#94a3b8' };
    const n = nom.toLowerCase();
    if (n.includes('esprit')) return { icon: 'blur_on', color: '#38bdf8' };
    if (n.includes('ténèbres') || n.includes('tenebres')) return { icon: 'dark_mode', color: '#c084fc' };
    if (n.includes('karma')) return { icon: 'all_inclusive', color: '#e7d198' };
    return { icon: 'psychology', color: '#a78bfa' };
}

function getLevelInfo(lvl) {
    switch(parseInt(lvl)) {
        case 1: return { icon: 'looks_one', color: '#cbd5e1' };
        case 2: return { icon: 'looks_two', color: '#10b981' };
        case 3: return { icon: 'looks_3', color: '#3b82f6' };
        case 4: return { icon: 'looks_4', color: '#a855f7' };
        case 5: return { icon: 'looks_5', color: '#f59e0b' };
        default: return { icon: 'stairs', color: '#10b981' };
    }
}

function populateSelects() {
    const charVoieOptions = document.getElementById('charVoieOptions');
    const charSpiritOptions = document.getElementById('charSpiritOptions');
    const searchVoieOptions = document.getElementById('searchVoieOptions');
    const searchSpiritOptions = document.getElementById('searchSpiritOptions');

    if (charVoieOptions) {
        charVoieOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —</div>`;
        voies.forEach(v => {
            const info = getVoieInfo(v.nom);
            charVoieOptions.innerHTML += `<div class="custom-option" data-value="${v.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${v.nom}</div>`;
        });
    }

    if (searchVoieOptions) {
        searchVoieOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> Toutes</div>`;
        voies.forEach(v => {
            const info = getVoieInfo(v.nom);
            searchVoieOptions.innerHTML += `<div class="custom-option" data-value="${v.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${v.nom}</div>`;
        });
    }

    if (charSpiritOptions) {
        charSpiritOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —</div>`;
        spiritualites.forEach(s => {
            const info = getSpiritInfo(s.nom);
            charSpiritOptions.innerHTML += `<div class="custom-option" data-value="${s.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${s.nom}</div>`;
        });
    }

    if (searchSpiritOptions) {
        searchSpiritOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> Toutes</div>`;
        spiritualites.forEach(s => {
            const info = getSpiritInfo(s.nom);
            searchSpiritOptions.innerHTML += `<div class="custom-option" data-value="${s.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${s.nom}</div>`;
        });
    }




}
function getVoieColor(nom) {
    if (!nom) return '#94a3b8';
    const vNom = nom.toLowerCase();
    if (vNom.includes('raison')) return '#3b82f6';
    if (vNom.includes('sûreté') || vNom.includes('surete')) return '#00e5cc';
    if (vNom.includes('trahison')) return '#ed5677';
    if (vNom.includes('consolidation')) return '#99674c';
    if (vNom.includes('conviction')) return '#b74c0b';
    if (vNom.includes('création') || vNom.includes('creation')) return '#10b981';
    if (vNom.includes('destruction')) return '#ff0000';
    if (vNom.includes('violence')) return '#a70740';
    return '#94a3b8';
}

function getSpiritColor(nom) {
    if (!nom) return '#a78bfa';
    const sNom = nom.toLowerCase();
    if (sNom.includes('esprit')) return '#38bdf8';
    if (sNom.includes('ténèbres') || sNom.includes('tenebres')) return '#c084fc';
    if (sNom.includes('karma')) return '#e7d198';
    return '#a78bfa';
}

function filterPersonnages() {
    renderPersonnages();
}

function renderPersonnages() {
    const container = document.getElementById('personnagesList');
    if (!container) return;

    // Filter logic
    const searchName = document.getElementById('searchName') ? document.getElementById('searchName').value.toLowerCase() : '';
    const searchOwner = document.getElementById('searchOwner') ? document.getElementById('searchOwner').value.toLowerCase() : '';
    const searchVoie = document.getElementById('searchVoie') ? document.getElementById('searchVoie').value : '';
    const searchSpirit = document.getElementById('searchSpirit') ? document.getElementById('searchSpirit').value : '';

    let filtered = personnages.filter(p => {
        const matchName = !searchName || (p.name && p.name.toLowerCase().includes(searchName));
        const matchOwner = !searchOwner || (p.ownerUsername && p.ownerUsername.toLowerCase().includes(searchOwner));
        const matchVoie = !searchVoie || (p.voie && p.voie.id == searchVoie);
        const matchSpirit = !searchSpirit || (p.spiritualite && p.spiritualite.id == searchSpirit);
        return matchName && matchOwner && matchVoie && matchSpirit;
    });
    
    // Sort logic: Sort by User then Name for admins, else by Name only
    filtered.sort((a, b) => {
        if (window.isAdmin) {
            const uA = a.ownerUsername || '';
            const uB = b.ownerUsername || '';
            if (uA === uB) return a.name.localeCompare(b.name);
            return uA.localeCompare(uB);
        } else {
            return a.name.localeCompare(b.name);
        }
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="armory-empty-state">
                <span class="material-symbols-outlined">person_off</span>
                Aucun personnage ne correspond à la recherche.
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(p => {
        let badges = '';
        if (p.voie) {
            const vColor = getVoieColor(p.voie.nom);
            badges += `<span class="char-badge" style="color: ${vColor}; border-color: ${vColor}40; background: ${vColor}15;">
                <span class="material-symbols-outlined" style="font-size: 0.8rem;">route</span>
                ${p.voie.nom} Lvl ${p.voieLevel}
            </span>`;
        }
        if (p.spiritualite) {
            const sColor = getSpiritColor(p.spiritualite.nom);
            badges += `<span class="char-badge" style="color: ${sColor}; border-color: ${sColor}40; background: ${sColor}15;">
                <span class="material-symbols-outlined" style="font-size: 0.8rem;">psychology</span>
                ${p.spiritualite.nom} Lvl ${p.spiritualiteLevel}
            </span>`;
        }
        if (!p.voie && !p.spiritualite) {
            badges = `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">Aucune affiliation</span>`;
        }

        // Equipment summary
        const persoEquips = allEquipments.filter(e => e.personnage && e.personnage.id === p.id);
        let equipHtml = '';
        if (persoEquips.length > 0) {
            const slotOrder = ['CASQUE', 'PLASTRON', 'ANNEAU_GAUCHE', 'ANNEAU_DROIT', 'BOTTES', 'CAPE', 'CONSOMMABLE'];
            equipHtml = `<div class="char-equip-row">` +
                persoEquips.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot)).map(eq => {
                    const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                    const statsStr = STAT_DEFS
                        .filter(s => eq[s.key] && eq[s.key] !== 0)
                        .map(s => `${eq[s.key] > 0 ? '+' : ''}${eq[s.key]} ${s.label}`)
                        .join(', ');
                    const rarityClass = eq.rarity ? `rarity-${eq.rarity}` : '';
                    let effectStar = '';
                    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
                        effectStar = `<span class="material-symbols-outlined" style="font-size: 0.8rem; color: #c084fc; margin-left: 0.2rem;">auto_awesome</span>`;
                    }
                    return `<span class="char-equip-chip ${rarityClass}" title="${statsStr || 'Aucun bonus'}">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 0.85rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                        ${eq.name}${effectStar}
                    </span>`;
                }).join('') +
            `</div>`;
        }

        return `
            <div class="char-card">
                <div class="char-card-header">
                    <div class="char-card-name">
                        <span class="material-symbols-outlined">person</span>
                        ${p.name}
                        ${window.isAdmin ? `<span style="margin-left: 0.5rem; font-size: 0.65rem; padding: 0.15rem 0.4rem; background: ${p.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${p.ownerUsername === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${p.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}; white-space: nowrap;"><span class="material-symbols-outlined" style="font-size: 0.7rem; vertical-align: middle; margin-right: 2px;">account_circle</span>${p.ownerUsername}</span>` : ''}
                    </div>
                    <div class="char-card-actions">
                        <button class="char-btn-equip" onclick="openEquipModal(${p.id})" title="Gérer l'équipement">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span> Équiper
                        </button>
                        ${window.isAdmin ? `
                        <button class="char-btn-edit" onclick="editPersonnage(${p.id})" title="Éditer">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">edit</span> Éditer
                        </button>
                        ` : ''}
                        <button class="char-btn-delete" onclick="deletePersonnage(${p.id})" title="Supprimer">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">delete</span>
                        </button>
                    </div>
                </div>
                <div class="char-card-badges">${badges}</div>
                ${equipHtml}
                <div class="char-card-stats">
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #ec4899;">favorite</span>${p.totalHealthMax || p.healthMax} PV</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #38bdf8;">water_drop</span>${p.totalManaMax || p.manaMax} Mana</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${p.totalPower !== undefined ? p.totalPower : p.power} Pui</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #f43f5e;">fitness_center</span>${p.totalStrength !== undefined ? p.totalStrength : p.strength} For</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${p.totalArmor !== undefined ? p.totalArmor : p.armor} Arm</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${p.totalResistance !== undefined ? p.totalResistance : p.resistance} Rés</span>
                    ${(p.totalSpeed !== undefined ? p.totalSpeed : p.speed) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${p.totalSpeed !== undefined ? p.totalSpeed : p.speed} Vit</span>` : ''}
                    ${(p.totalCrit !== undefined ? p.totalCrit : p.crit) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${p.totalCrit !== undefined ? p.totalCrit : p.crit}% Crit</span>` : ''}
                </div>
                <div class="char-xp-container" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 500;">
                        <span>Expérience Voie</span>
                        <span>${p.experience} / ${p.nextLevelXp} XP</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: ${p.nextLevelXp > p.currentLevelXp ? Math.min(100, Math.max(0, ((p.experience - p.currentLevelXp) / (p.nextLevelXp - p.currentLevelXp)) * 100)) : 100}%; border-radius: 3px; box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 500; margin-top: 0.3rem;">
                        <span>Expérience Spirituelle</span>
                        <span>${p.spiritualiteExperience} / ${p.nextLevelSpiritXp} XP</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="height: 100%; background: linear-gradient(90deg, #fb923c, #f59e0b); width: ${p.nextLevelSpiritXp > p.currentLevelSpiritXp ? Math.min(100, Math.max(0, ((p.spiritualiteExperience - p.currentLevelSpiritXp) / (p.nextLevelSpiritXp - p.currentLevelSpiritXp)) * 100)) : 100}%; border-radius: 3px; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);"></div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ===== Equipment Modal =====

async function openEquipModal(persoId) {
    equipModalPersoId = persoId;
    await loadAllEquipments();
    const overlay = document.getElementById('equipModalOverlay');
    overlay.classList.add('active');
    renderEquipModal();
}

function closeEquipModal() {
    equipModalPersoId = null;
    document.getElementById('equipModalOverlay').classList.remove('active');
}

function renderEquipModal() {
    const perso = personnages.find(p => p.id === equipModalPersoId);
    if (!perso) return;

    document.getElementById('equipModalTitle').textContent = `Équipement de ${perso.name}`;

    // Render slots
    const slotsContainer = document.getElementById('equipSlotsContainer');
    const slots = Object.keys(SLOT_LABELS);
    const equippedItems = allEquipments.filter(e => e.personnage && e.personnage.id === perso.id);

    slotsContainer.innerHTML = slots.map(slotKey => {
        const slotInfo = SLOT_LABELS[slotKey];
        const equipped = equippedItems.find(e => e.slot === slotKey);

        if (equipped) {
            const statsChips = STAT_DEFS
                .filter(s => equipped[s.key] && equipped[s.key] !== 0)
                .map(s => {
                    const val = equipped[s.key];
                    const sign = val > 0 ? '+' : '';
                    const isMalus = val < 0;
                    return `<span class="eq-stat-mini ${isMalus ? 'malus' : ''}"><span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size:0.75rem;">${s.icon}</span>${sign}${val}</span>`;
                })
                .join('');
            const rarityClass = equipped.rarity ? `rarity-${equipped.rarity}` : '';
            
            let specialEffectHtml = '';
            if (equipped.specialEffect && equipped.specialEffect !== 'NONE') {
                const effectLabels = {
                    'LIFESTEAL': 'Vol de Vie',
                    'THORNS': 'Épines',
                    'MANA_SHIELD': 'Bouclier de Mana',
                    'CHEAT_DEATH': 'Ange Gardien',
                    'CRIT_DAMAGE': 'Dégâts Critiques'
                };
                const label = effectLabels[equipped.specialEffect] || equipped.specialEffect;
                specialEffectHtml = `<div style="margin-top: 0.3rem; font-size: 0.7rem; color: #c084fc; background: rgba(168, 85, 247, 0.1); padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">auto_awesome</span>
                    ${label} : ${equipped.specialEffectValue}
                </div>`;
            }

            return `
                <div class="equip-slot-card equipped">
                    <div class="equip-slot-header">
                        <span class="equip-slot-label">
                            <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.1rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label}
                        </span>
                        <button class="eq-unequip-btn" onclick="unequipItem(${equipped.id})" title="Retirer">
                            <span class="material-symbols-outlined" style="font-size: 0.9rem;">close</span>
                        </button>
                    </div>
                    <div class="equip-slot-item-name ${rarityClass}">${equipped.name}</div>
                    <div class="equip-slot-stats">
                        ${statsChips || '<span style="opacity:0.4;">Aucun bonus</span>'}
                        ${specialEffectHtml}
                    </div>
                </div>`;
        } else {
            // Available items for this slot
            let available = allEquipments.filter(e => e.slot === slotKey && !e.personnage);
            
            // Special case for rings: allow any ring in any ring slot
            if (slotKey === 'ANNEAU_GAUCHE' || slotKey === 'ANNEAU_DROIT') {
                available = allEquipments.filter(e => 
                    (e.slot === 'ANNEAU_GAUCHE' || e.slot === 'ANNEAU_DROIT') && !e.personnage
                );
            }

            // Sort by rarity (descending) then by name
            const rarityOrder = {
                'COMMUN': 0,
                'RARE': 1,
                'LEGENDAIRE': 2,
                'EPIQUE': 3,
                'RELIQUE': 4
            };
            available.sort((a, b) => {
                const rA = a.rarity ? rarityOrder[a.rarity] || 0 : 0;
                const rB = b.rarity ? rarityOrder[b.rarity] || 0 : 0;
                if (rA !== rB) return rB - rA;
                return a.name.localeCompare(b.name);
            });


            let availableHtml = '';
            if (available.length > 0) {
                availableHtml = `
                <div class="custom-select-wrapper" tabindex="0" style="margin-top: 0.5rem; width: 100%;">
                    <div class="custom-select-trigger" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
                        <span class="cs-label" style="color: var(--text-muted);">Choisir un équipement...</span>
                        <span class="material-symbols-outlined cs-arrow" style="font-size: 1.1rem; color: var(--text-muted);">expand_more</span>
                    </div>
                    <div class="custom-select-options" style="font-size: 0.85rem;">
                        <div class="custom-option" data-value=""><span style="color: var(--text-muted);">Choisir...</span></div>
                        ${available.map(a => {
                            const aStatsChips = STAT_DEFS
                                .filter(s => a[s.key] && a[s.key] !== 0)
                                .map(s => {
                                    const val = a[s.key];
                                    const sign = val > 0 ? '+' : '';
                                    const isMalus = val < 0;
                                    return `<span class="eq-stat-mini ${isMalus ? 'malus' : ''}"><span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size:0.75rem;">${s.icon}</span>${sign}${val}</span>`;
                                }).join('');

                            let aSpecialEffectHtml = '';
                            if (a.specialEffect && a.specialEffect !== 'NONE') {
                                const effectLabels = {
                                    'LIFESTEAL': 'Vol de Vie',
                                    'THORNS': 'Épines',
                                    'MANA_SHIELD': 'Bouclier de Mana',
                                    'CHEAT_DEATH': 'Ange Gardien',
                                    'CRIT_DAMAGE': 'Dégâts Critiques'
                                };
                                const label = effectLabels[a.specialEffect] || a.specialEffect;
                                aSpecialEffectHtml = `<div style="margin-top: 0.3rem; font-size: 0.7rem; color: #c084fc; background: rgba(168, 85, 247, 0.1); padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">auto_awesome</span>
                                    ${label} : ${a.specialEffectValue}
                                </div>`;
                            }

                            const tooltipHtml = `
                                <div class="tooltip-data" style="display:none;">
                                    <div style="font-weight: bold; margin-bottom: 0.3rem; font-size: 1rem;" class="${a.rarity ? 'rarity-' + a.rarity : ''}">${a.name} ${a.rarity ? '(' + a.rarity + ')' : ''}</div>
                                    <div class="equip-slot-stats" style="flex-wrap: wrap;">
                                        ${aStatsChips || '<span style="opacity:0.4;">Aucun bonus</span>'}
                                        ${aSpecialEffectHtml}
                                    </div>
                                </div>
                            `;

                            return `
                                <div class="custom-option" data-value="${a.id}" onmouseenter="showEqTooltip(this)" onmouseleave="hideEqTooltip()">
                                    <span class="${a.rarity ? 'rarity-' + a.rarity : ''}">${a.name}</span>
                                    ${a.rarity ? '<span style="font-size: 0.7rem; opacity: 0.5; margin-left: 0.3rem;">(' + a.rarity + ')</span>' : ''}
                                    ${tooltipHtml}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <input type="hidden" class="eq-assign-hidden" data-perso-id="${perso.id}" data-slot="${slotKey}" value="">
                </div>`;
            } else {
                availableHtml = `<span style="font-size: 0.72rem; color: #475569; font-style: italic;">Aucun disponible</span>`;
            }

            return `
                <div class="equip-slot-card empty">
                    <div class="equip-slot-header">
                        <span class="equip-slot-label">
                            <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.1rem; color: ${slotInfo.color}; opacity: 0.5;">${slotInfo.icon}</span>
                            ${slotInfo.label}
                        </span>
                    </div>
                    <div class="equip-slot-empty">Vide</div>
                    ${availableHtml}
                </div>`;
        }
    }).join('');

    // Render create form slot select
    const slotOptionsContainer = document.getElementById('eqSlotOptions');
    if (slotOptionsContainer) {
        slotOptionsContainer.innerHTML = slots.map(s => {
            const info = SLOT_LABELS[s];
            return `<div class="custom-option" data-value="${s}">
                <span class="material-symbols-outlined cs-icon ${info.extraClass || ''}" style="color: ${info.color};">${info.icon}</span>
                ${info.label}
            </div>`;
        }).join('');
        
        // Setup initial value
        if (slots.length > 0) {
            const firstSlot = slots[0];
            const info = SLOT_LABELS[firstSlot];
            document.getElementById('eqSlot').value = firstSlot;
            document.getElementById('eqSlotLabel').innerHTML = `<span class="material-symbols-outlined cs-icon ${info.extraClass || ''}" style="color: ${info.color};">${info.icon}</span> ${info.label}`;
        }
    }
}

// ===== Form Helpers =====

function editPersonnage(id) {
    editingId = id;
    const p = personnages.find(x => x.id === id);
    if (!p) return;

    document.getElementById('charFormPanel').classList.add('editing-mode');

    document.getElementById('charName').value = p.name;
    document.getElementById('charHp').value = p.healthMax || 100;
    document.getElementById('charMana').value = p.manaMax || 100;
    document.getElementById('charPower').value = p.power || 0;
    document.getElementById('charStrength').value = p.strength || 0;
    document.getElementById('charArmor').value = p.armor || 0;
    document.getElementById('charResistance').value = p.resistance || 0;
    document.getElementById('charSpeed').value = p.speed || 0;
    document.getElementById('charCrit').value = p.crit || 0;
    document.getElementById('charVoie').value = p.voie ? p.voie.id : '';
    if (p.voie) {
        const info = getVoieInfo(p.voie.nom);
        document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${p.voie.nom}`;
    } else {
        document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —`;
    }

    document.getElementById('charExperience').value = p.experience || 0;

    document.getElementById('charSpirit').value = p.spiritualite ? p.spiritualite.id : '';
    if (p.spiritualite) {
        const info = getSpiritInfo(p.spiritualite.nom);
        document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${p.spiritualite.nom}`;
    } else {
        document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —`;
    }

    document.getElementById('charSpiritExperience').value = p.spiritualiteExperience || 0;

    document.getElementById('formTitleText').innerHTML = `
        <span class="material-symbols-outlined">edit</span>
        Modifier : ${p.name}`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">save</span>
        Mettre à jour`;
    document.getElementById('cancelBtn').style.display = 'inline-flex';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editingId = null;
    document.getElementById('charFormPanel').classList.remove('editing-mode');
    document.getElementById('charName').value = '';
    document.getElementById('charHp').value = 100;
    document.getElementById('charMana').value = 100;
    document.getElementById('charPower').value = 25;
    document.getElementById('charStrength').value = 10;
    document.getElementById('charArmor').value = 10;
    document.getElementById('charResistance').value = 10;
    document.getElementById('charSpeed').value = 0;
    document.getElementById('charCrit').value = 0;
    document.getElementById('charVoie').value = '';
    document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —`;
    
    document.getElementById('charExperience').value = 0;

    document.getElementById('charSpirit').value = '';
    document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">trip_origin</span> — Aucune —`;
    
    document.getElementById('charSpiritExperience').value = 0;

    document.getElementById('formTitleText').innerHTML = `
        <span class="material-symbols-outlined">person_add</span>
        Recruter à la taverne`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">person_add</span>
        Forger le Personnage`;
    document.getElementById('cancelBtn').style.display = 'none';
}

function showNotif(message, isError = false) {
    const notif = document.getElementById('armoryNotif');
    notif.textContent = message;
    notif.classList.remove('error');
    if (isError) notif.classList.add('error');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// ===== Custom Select Logic (Event Delegation) =====
document.addEventListener('click', (e) => {
    // Fermer les dropdowns si on clique en dehors
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }

    // Clic sur le trigger (ouvrir/fermer)
    const trigger = e.target.closest('.custom-select-trigger');
    if (trigger) {
        const wrapper = trigger.closest('.custom-select-wrapper');
        // Fermer les autres
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
        return;
    }

    // Clic sur une option
    const option = e.target.closest('.custom-option');
    if (option) {
        const wrapper = option.closest('.custom-select-wrapper');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const labelEl = wrapper.querySelector('.cs-label');
        
        hiddenInput.value = option.getAttribute('data-value');
        labelEl.innerHTML = option.innerHTML;
        wrapper.classList.remove('open');
        
        const event = new Event('change', { bubbles: true });
        hiddenInput.dispatchEvent(event);
        
        // Trigger specific logic for search
        if (hiddenInput.id === 'searchVoie' || hiddenInput.id === 'searchSpirit') {
            filterPersonnages();
        }

        // Trigger specific logic for equipment assign
        if (hiddenInput.classList.contains('eq-assign-hidden')) {
            if (hiddenInput.value) {
                equipItem(hiddenInput.value, hiddenInput.dataset.persoId, hiddenInput.dataset.slot);
            }
        }
    }
});

// ===== Init =====

window.addEventListener('DOMContentLoaded', async () => {
    // Listeners for Weight Calculation
    const eqInputs = ['eqSlot', 'eqRarity', 'eqHp', 'eqMana', 'eqPower', 'eqStr', 'eqArmor', 'eqRes', 'eqSpeed', 'eqCrit', 'eqRegenHp', 'eqRegenMana', 'eqSpecialEffectValue', 'eqBaseWeight'];
    eqInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateWeightUI);
            el.addEventListener('change', updateWeightUI);
        }
    });
    
    // Initial UI update
    updateWeightUI();

    // Écouteur pour la rareté
    const eqRarity = document.getElementById('eqRarity');
    if (eqRarity) {
        eqRarity.addEventListener('change', (e) => {
            const val = e.target.value;
            const row = document.getElementById('eqSpecialEffectRow');
            if (val === 'EPIQUE' || val === 'RELIQUE') {
                row.style.display = 'grid';
                
                // Colors based on rarity
                const isEpic = val === 'EPIQUE';
                const color = isEpic ? '#ef4444' : '#c084fc';
                const bg = isEpic ? 'rgba(239, 68, 68, 0.05)' : 'rgba(168, 85, 247, 0.05)';
                const border = isEpic ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px dashed rgba(168, 85, 247, 0.3)';
                const inputBorder = isEpic ? 'rgba(239, 68, 68, 0.3)' : 'rgba(192, 132, 252, 0.3)';
                
                row.style.background = bg;
                row.style.border = border;
                
                const labelTitle = document.getElementById('eqSpecialEffectLabelTitle');
                if(labelTitle) labelTitle.style.color = color;
                
                const valueTitle = document.getElementById('eqSpecialEffectValueTitle');
                if(valueTitle) valueTitle.style.color = color;
                
                const trigger = document.getElementById('eqSpecialEffectTrigger');
                if(trigger) trigger.style.borderColor = inputBorder;
                
                const valInput = document.getElementById('eqSpecialEffectValue');
                if(valInput) valInput.style.borderColor = inputBorder;

            } else {
                row.style.display = 'none';
                
                // Reset hidden input for custom select
                const effectInput = document.getElementById('eqSpecialEffect');
                if (effectInput) {
                    effectInput.value = 'NONE';
                    // Update label manually since there's no native value changing
                    const labelSpan = document.getElementById('eqSpecialEffectLabel');
                    if (labelSpan) {
                        labelSpan.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">not_interested</span> Aucun`;
                    }
                }
                
                const valInput = document.getElementById('eqSpecialEffectValue');
                if (valInput) valInput.value = 0;
            }
            updateWeightUI(); // Trigger UI update since value changed manually
        });
    }

    await fetchMeta();
});

window.addEventListener('authLoaded', async () => {
    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        searchOwnerContainer.style.display = window.isAdmin ? 'flex' : 'none';
    }
    await loadAllEquipments();
    await loadPersonnages();
});

window.showEqTooltip = function(el) {
    let tooltip = document.getElementById('globalSpellTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'globalSpellTooltip';
        document.body.appendChild(tooltip);
    }
    const dataEl = el.querySelector('.tooltip-data');
    if (!dataEl) return;

    tooltip.innerHTML = dataEl.innerHTML;
    tooltip.style.display = 'flex';

    const rect = el.getBoundingClientRect();
    let topPos = rect.top - tooltip.offsetHeight - 8;
    if (topPos < 10) topPos = rect.bottom + 8;

    let leftPos = rect.right - tooltip.offsetWidth;
    if (leftPos < 10) leftPos = 10;

    tooltip.style.top = topPos + 'px';
    tooltip.style.left = leftPos + 'px';
};

window.hideEqTooltip = function() {
    const tooltip = document.getElementById('globalSpellTooltip');
    if (tooltip) tooltip.style.display = 'none';
};

