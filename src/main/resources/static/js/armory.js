// ===== Armory Page JavaScript =====

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
];

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
        const res = await fetch('/api/personnages');
        personnages = await res.json();
        renderPersonnages();
    } catch (e) {
        console.error('Erreur chargement personnages:', e);
    }
}

async function loadAllEquipments() {
    try {
        const res = await fetch('/api/equipment');
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
        voieLevel: parseInt(document.getElementById('charVoieLevel').value) || 1,
        spiritualiteId: document.getElementById('charSpirit').value || null,
        spiritualiteLevel: parseInt(document.getElementById('charSpiritLevel').value) || 1,
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

async function deletePersonnage(id) {
    if (!confirm('Supprimer ce personnage ?')) return;
    try {
        await fetch(`/api/personnages/${id}`, { method: 'DELETE' });
        showNotif('Personnage supprimé.');
        if (editingId === id) resetForm();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de la suppression.', true);
    }
}

// ===== Equipment API =====

async function submitEquipment() {
    const name = document.getElementById('eqName').value.trim();
    const slot = document.getElementById('eqSlot').value;
    if (!name) { showNotif('Nom de l\'équipement obligatoire.', true); return; }
    if (!slot) { showNotif('Slot obligatoire.', true); return; }

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
        personnageId: equipModalPersoId,
    };

    try {
        const res = await fetch('/api/equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        const data = await res.json();
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
        await loadAllEquipments();
        renderEquipModal();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur création équipement.', true);
    }
}

async function equipItem(equipmentId, personnageId) {
    try {
        const res = await fetch(`/api/equipment/${equipmentId}/equip/${personnageId}`, { method: 'POST' });
        const data = await res.json();
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

function populateSelects() {
    const voieSelect = document.getElementById('charVoie');
    const spiritSelect = document.getElementById('charSpirit');

    voieSelect.innerHTML = '<option value="">— Aucune —</option>';
    voies.forEach(v => {
        voieSelect.innerHTML += `<option value="${v.id}">${v.nom}</option>`;
    });

    spiritSelect.innerHTML = '<option value="">— Aucune —</option>';
    spiritualites.forEach(s => {
        spiritSelect.innerHTML += `<option value="${s.id}">${s.nom}</option>`;
    });
}

function renderPersonnages() {
    const container = document.getElementById('personnagesList');
    if (!container) return;

    if (personnages.length === 0) {
        container.innerHTML = `
            <div class="armory-empty-state">
                <span class="material-symbols-outlined">person_off</span>
                Aucun personnage créé. Forgez votre premier héros !
            </div>`;
        return;
    }

    container.innerHTML = personnages.map(p => {
        let badges = '';
        if (p.voie) {
            badges += `<span class="char-badge char-badge-voie">
                <span class="material-symbols-outlined" style="font-size: 0.8rem;">route</span>
                ${p.voie.nom} Lvl ${p.voieLevel}
            </span>`;
        }
        if (p.spiritualite) {
            badges += `<span class="char-badge char-badge-spirit">
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
            equipHtml = `<div class="char-equip-row">` +
                persoEquips.map(eq => {
                    const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                    const statsStr = STAT_DEFS
                        .filter(s => eq[s.key] && eq[s.key] !== 0)
                        .map(s => `+${eq[s.key]} ${s.label}`)
                        .join(', ');
                    return `<span class="char-equip-chip" title="${statsStr || 'Aucun bonus'}">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 0.85rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                        ${eq.name}
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
                    </div>
                    <div class="char-card-actions">
                        <button class="char-btn-equip" onclick="openEquipModal(${p.id})" title="Gérer l'équipement">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span> Équiper
                        </button>
                        <button class="char-btn-edit" onclick="editPersonnage(${p.id})" title="Éditer">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">edit</span> Éditer
                        </button>
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
                .map(s => `<span class="eq-stat-mini"><span class="material-symbols-outlined" style="color:${s.color}; font-size:0.75rem;">${s.icon}</span>+${equipped[s.key]}</span>`)
                .join('');

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
                    <div class="equip-slot-item-name">${equipped.name}</div>
                    <div class="equip-slot-stats">${statsChips || '<span style="opacity:0.4;">Aucun bonus</span>'}</div>
                </div>`;
        } else {
            // Available items for this slot
            const available = allEquipments.filter(e => e.slot === slotKey && !e.personnage);
            let availableHtml = '';
            if (available.length > 0) {
                availableHtml = `<select class="eq-assign-select" onchange="if(this.value) equipItem(this.value, ${perso.id})">
                    <option value="">Choisir...</option>
                    ${available.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>`;
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
    const slotSelect = document.getElementById('eqSlot');
    if (slotSelect) {
        slotSelect.innerHTML = slots.map(s => `<option value="${s}">${SLOT_LABELS[s].label}</option>`).join('');
    }
}

// ===== Form Helpers =====

function editPersonnage(id) {
    const p = personnages.find(c => c.id === id);
    if (!p) return;

    editingId = p.id;
    document.getElementById('charName').value = p.name || '';
    document.getElementById('charHp').value = p.healthMax || 100;
    document.getElementById('charMana').value = p.manaMax || 100;
    document.getElementById('charPower').value = p.power || 0;
    document.getElementById('charStrength').value = p.strength || 0;
    document.getElementById('charArmor').value = p.armor || 0;
    document.getElementById('charResistance').value = p.resistance || 0;
    document.getElementById('charSpeed').value = p.speed || 0;
    document.getElementById('charCrit').value = p.crit || 0;
    document.getElementById('charVoie').value = p.voie ? p.voie.id : '';
    document.getElementById('charVoieLevel').value = p.voieLevel || 1;
    document.getElementById('charSpirit').value = p.spiritualite ? p.spiritualite.id : '';
    document.getElementById('charSpiritLevel').value = p.spiritualiteLevel || 1;

    document.getElementById('formTitle').innerHTML = `
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
    document.getElementById('charVoieLevel').value = 1;
    document.getElementById('charSpirit').value = '';
    document.getElementById('charSpiritLevel').value = 1;

    document.getElementById('formTitle').innerHTML = `
        <span class="material-symbols-outlined">person_add</span>
        Créer un Personnage`;
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

// ===== Init =====

window.addEventListener('DOMContentLoaded', async () => {
    await fetchMeta();
    await loadAllEquipments();
    await loadPersonnages();
});
