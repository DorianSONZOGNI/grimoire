// ===== Armory Page JavaScript =====

function applyRbac() {
    if (window.currentUser !== undefined && !window.isAdmin) {
        const baseStats = document.getElementById('baseStatsSection');
        if (baseStats) baseStats.classList.add('hidden');

        const xpField = document.getElementById('charExperience');
        if (xpField && xpField.parentElement) xpField.parentElement.classList.add('hidden');

        const spiritExpField = document.getElementById('charSpiritExperience');
        if (spiritExpField && spiritExpField.parentElement) spiritExpField.parentElement.classList.add('hidden');

        const eqCreateSection = document.querySelector('.equip-create-section');
        if (eqCreateSection) eqCreateSection.classList.add('hidden');
    }

    // Re-render characters to apply button visibility rules
    if (pageState.personnages.length > 0) {
        updateCharsList();
    }
}
window.addEventListener('authLoaded', applyRbac);
const pageState = {
    voies: [],
    spiritualites: [],
    personnages: [],
    editingId: null,
    equipModalPersoId: null,
    allEquipments: []
};

// Replaced by window.SLOT_LABELS and window.CONSUMABLE_CATEGORIES


// ===== API =====

async function fetchMeta() {
    try {
        const res = await globalFetch('/api/spells-editor/meta');
        if (res) {
            const data = await res.json();
            pageState.voies = data.voies || [];
            pageState.spiritualites = data.spiritualites || [];
            populateSelects();
        }
    } catch (e) {
        console.error('Erreur chargement meta:', e);
    }
}

async function loadPersonnages() {
    try {
        const url = window.isAdmin ? '/api/personnages/all' : '/api/personnages';
        const res = await globalFetch(url);
        if (res) {
            pageState.personnages = await res.json();
            renderPersonnages();
            await updateCharLimitUI();
        }
    } catch (e) {
        console.error('Erreur chargement personnages:', e);
    }
}

async function updateCharLimitUI() {
    try {
        const res = await globalFetch('/api/personnages/limit');
        if (res) {
            const data = await res.json();
            const limitContainer = document.getElementById('charLimitContainer');
            if (!limitContainer) return;

            const isMaxedOut = data.currentCharacters >= data.maxCharacters;
            const color = (isMaxedOut && !window.isAdmin) ? '#ef4444' : '#94a3b8';

            let html = `<span class="text-sm font-medium" style="color: ${color};">${data.currentCharacters}/${data.maxCharacters}</span>`;

            if (isMaxedOut && data.maxCharacters < 8 && !window.isAdmin) {
                const costs = { 2: 20, 3: 50, 4: 75, 5: 150, 6: 200, 7: 300 };
                const cost = costs[data.maxCharacters];
                html += `<button class="text-success ml-2 bg-success/20 border-success/40 rounded cursor-pointer px-1 py-0 flex-center" onclick="buyRosterSlot(${cost})" title="Acheter un emplacement pour ${cost} or"><span class="material-symbols-outlined text-sm">add</span></button>`;
            }

            limitContainer.innerHTML = html;
        }
    } catch (e) {
        console.error('Erreur limite personnages:', e);
    }
}

window.buyRosterSlot = function (cost) {
    showModal({
        title: 'Agrandir le Roster ?',
        body: `Voulez-vous acheter un nouvel emplacement de personnage pour <strong class="text-gold">${cost}</strong> Or ?`,
        icon: 'shopping_cart',
        confirmText: 'Oui, acheter',
        onConfirm: async () => {
            try {
                const res = await globalFetch('/api/auth/unlock/roster', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    showNotif(data.message);
                    // Update auth state so UI syncs
                    await globalFetch('/api/auth/me').then(r => r.json()).then(u => {
                        if (window.updateGoldDisplay) window.updateGoldDisplay(u.monnaie);
                        window.currentUser = u;
                    });
                    await updateCharLimitUI();

                    const eqCreateSection = document.querySelector('.equip-create-section');
                    if (eqCreateSection && window.currentUser) eqCreateSection.classList.remove('hidden');
                } else {
                    const err = await res.json();
                    showNotif(err.message || "Erreur lors de l'achat", true);
                }
            } catch (e) {
                console.error(e);
                showNotif("Erreur réseau.", true);
            }
        }
    });
};

async function loadAllEquipments() {
    try {
        const url = window.isAdmin ? '/api/equipments/all' : '/api/equipments';
        const res = await globalFetch(url);
        if (res.ok) {
            const rawEquips = await res.json();
            // Filter out templates so they cannot be equipped, even for admins
            pageState.allEquipments = rawEquips.filter(e => !e.isTemplate);
        }
    } catch (e) {
        console.error('Erreur chargement de tous les équipements:', e);
        pageState.allEquipments = [];
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
    if (!pageState.editingId && (!voieIdVal || !spiritIdVal)) {
        showNotif('Une Voie et une Spiritualité sont obligatoires à la création.', true);
        return;
    }

    const dto = {
        id: pageState.editingId,
        name: name,
        healthMax: parseInt(document.getElementById('charHp').value) || 100,
        manaMax: parseInt(document.getElementById('charMana').value) || 100,
        power: parseInt(document.getElementById('charPower').value) || 0,
        strength: parseInt(document.getElementById('charStrength').value) || 0,
        armor: parseInt(document.getElementById('charArmor').value) || 0,
        resistance: parseInt(document.getElementById('charResistance').value) || 0,
        speed: parseInt(document.getElementById('charSpeed').value) || 0,
        crit: parseInt(document.getElementById('charCrit').value) || 0,
        regenHp: parseInt(document.getElementById('charRegenHp').value) || 0,
        regenMana: parseInt(document.getElementById('charRegenMana').value) || 0,
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
        const res = await globalFetch('/api/personnages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res) {
            const data = await res.json();
            showNotif(data.message || 'Personnage sauvegardé !');
            resetForm();
            await loadPersonnages();
        }
    } catch (e) {
        showNotif('Erreur lors de la sauvegarde.', true);
        console.error(e);
    }
}

window.deletePersonnage = function (id) {
    const p = pageState.personnages.find(p => p.id === id);
    if (!p) return;

    showModal({
        title: 'Supprimer ce personnage ?',
        body: `Voulez-vous vraiment supprimer définitivement <strong class="text-white">${p.name}</strong> ?<br><br>Cette action est irréversible.`,
        icon: 'warning',
        confirmText: 'Oui, supprimer',
        onConfirm: async () => {
            try {
                const res = await globalFetch(`/api/personnages/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showNotif('Personnage supprimé.');
                    if (pageState.editingId === id) resetForm();
                    await loadPersonnages();
                } else {
                    showNotif("Erreur lors de la suppression.", true);
                }
            } catch (e) {
                console.error(e);
                showNotif('Erreur réseau lors de la suppression.', true);
            }
        }
    });
}

// ===== Equipment API =====



async function equipItem(equipmentId, personnageId, targetSlot = null) {
    try {
        let url = `/api/equipments/${equipmentId}/equip/${personnageId}`;
        if (targetSlot) {
            url += `?targetSlot=${targetSlot}`;
        }
        const res = await globalFetch(url, { method: 'POST' });
        if (res) {
            const data = await res.json();
            showNotif(data.message);
            await loadAllEquipments();
            renderEquipModal();
            await loadPersonnages();
        }
    } catch (e) {
        showNotif(e.message || 'Erreur lors de l\'équipement.', true);
    }
}

async function unequipItem(equipmentId) {
    try {
        const res = await globalFetch(`/api/equipments/${equipmentId}/unequip`, { method: 'POST' });
        if (res) {
            const data = await res.json();
            showNotif(data.message);
            await loadAllEquipments();
            renderEquipModal();
            await loadPersonnages();
        }
    } catch (e) {
        showNotif(e.message || 'Erreur lors du déséquipement.', true);
    }
}

async function deleteEquipment(id) {
    const eq = pageState.allEquipments.find(e => e.id === id);
    if (!eq) return;

    api.deleteEquipmentAPI(id, {
        confirm: true,
        confirmTitle: "Déséquiper / Détruire ?",
        confirmBody: `Voulez-vous vraiment supprimer l'équipement <strong class="text-white">${eq.name}</strong> ?`,
        apiRoute: "/api/equipments/",
        onSuccess: async () => {
            await loadAllEquipments();
            renderEquipModal();
            await loadPersonnages();
        }
    });
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

function populateSelects() {
    const charVoieOptions = document.getElementById('charVoieOptions');
    const charSpiritOptions = document.getElementById('charSpiritOptions');
    const searchVoieOptions = document.getElementById('searchVoieOptions');
    const searchSpiritOptions = document.getElementById('searchSpiritOptions');

    if (charVoieOptions) {
        charVoieOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —</div>`;
        pageState.voies.forEach(v => {
            const info = getVoieInfo(v.nom);
            charVoieOptions.innerHTML += `<div class="custom-option" data-value="${v.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${v.nom}</div>`;
        });
    }

    if (searchVoieOptions) {
        searchVoieOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> Toutes</div>`;
        pageState.voies.forEach(v => {
            const info = getVoieInfo(v.nom);
            searchVoieOptions.innerHTML += `<div class="custom-option" data-value="${v.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${v.nom}</div>`;
        });
    }

    if (charSpiritOptions) {
        charSpiritOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —</div>`;
        pageState.spiritualites.forEach(s => {
            const info = getSpiritInfo(s.nom);
            charSpiritOptions.innerHTML += `<div class="custom-option" data-value="${s.id}"><span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${s.nom}</div>`;
        });
    }

    if (searchSpiritOptions) {
        searchSpiritOptions.innerHTML = `<div class="custom-option" data-value=""><span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> Toutes</div>`;
        pageState.spiritualites.forEach(s => {
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

    let filtered = pageState.personnages.filter(p => {
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
            const vFull = pageState.voies.find(v => v.id == p.voie.id) || p.voie;
            const info = getVoieInfo(p.voie.nom);
            badges += `<span class="char-badge" style="color: ${vColor}; border-color: ${vColor}40; background: ${vColor}15; cursor: help;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()">
                <span class="material-symbols-outlined text-xs">route</span>
                ${p.voie.nom} Lvl ${p.voieLevel}
                <template class="tooltip-data">
                    <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${info.color};">
                        <span class="material-symbols-outlined text-lg">${info.icon}</span>
                        ${vFull.nom}
                    </div>
                    <div class="text-xs text-slate-300 mb-2">${vFull.description || 'Description générique.'}</div>
                    <div class="flex-start-gap text-xs text-slate-200">
                        <span class="material-symbols-outlined text-md" style="color: ${info.color};">bolt</span>
                        <span class="font-italic whitespace-pre-wrap">${formatRichText(vFull.passiveDescription) || 'Passif spécifique.'}</span>
                    </div>
                </template>
            </span>`;
        }
        if (p.spiritualite) {
            const sColor = getSpiritColor(p.spiritualite.nom);
            const sFull = pageState.spiritualites.find(s => s.id == p.spiritualite.id) || p.spiritualite;
            const info = getSpiritInfo(p.spiritualite.nom);
            badges += `<span class="char-badge" style="color: ${sColor}; border-color: ${sColor}40; background: ${sColor}15; cursor: help;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()">
                <span class="material-symbols-outlined text-xs">psychology</span>
                ${p.spiritualite.nom} Lvl ${p.spiritualiteLevel}
                <template class="tooltip-data">
                    <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${info.color};">
                        <span class="material-symbols-outlined text-lg">${info.icon}</span>
                        ${sFull.nom}
                    </div>
                    <div class="text-xs text-slate-300 mb-2">${sFull.description || 'Description générique.'}</div>
                    <div class="flex-start-gap text-xs text-slate-200">
                        <span class="material-symbols-outlined text-md" style="color: ${info.color};">bolt</span>
                        <span class="font-italic whitespace-pre-wrap">${formatRichText(sFull.passiveDescription) || 'Passif spécifique.'}</span>
                    </div>
                </template>
            </span>`;
        }
        if (!p.voie && !p.spiritualite) {
            badges = `<span class="font-italic text-muted text-xs">Aucune affiliation</span>`;
        }

        // Equipment summary
        const persoEquips = pageState.allEquipments.filter(e => e.personnage && e.personnage.id === p.id);
        let equipHtml = '';
        if (persoEquips.length > 0) {
            const slotOrder = ['CASQUE', 'PLASTRON', 'ARME_GAUCHE', 'ARME_DROITE', 'ANNEAU_GAUCHE', 'ANNEAU_DROIT', 'BOTTES', 'CAPE'];
            equipHtml = `<div class="char-equip-row">` +
                persoEquips.sort((a, b) => {
                    const sNameA = typeof (a.slot?.name || a.slot) === 'object' ? a.slot?.name : a.slot;
                    const sNameB = typeof (b.slot?.name || b.slot) === 'object' ? b.slot?.name : b.slot;
                    return slotOrder.indexOf(sNameA) - slotOrder.indexOf(sNameB);
                }).map(eq => {
                    const slotInfo = getSlotInfo(eq);
                    const statsStr = STAT_DEFS
                        .filter(s => eq[s.key] && eq[s.key] !== 0)
                        .map(s => `${eq[s.key] > 0 ? '+' : ''}${eq[s.key]}${s.isPercent ? '%' : ''} ${s.label}`)
                        .join(', ');
                    const rarityName = getRarityName(eq.rarity);
                    const rarityClass = rarityName ? `rarity-${rarityName}` : '';
                    let effectStar = '';
                    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
                        effectStar = `<span class="material-symbols-outlined text-xs text-purple ml-1">auto_awesome</span>`;
                    }
                    return `<span class="char-equip-chip ${rarityClass}" title="${statsStr || 'Aucun bonus'}">
                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''} text-sm" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
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
                        ${window.isAdmin ? `<span class="text-xxs whitespace-nowrap" style="margin-left: 0.5rem; padding: 0.15rem 0.4rem; background: ${p.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${p.ownerUsername === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${p.ownerUsername === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined align-middle text-xxs mr-1">account_circle</span>${p.ownerUsername}</span>` : ''}
                    </div>
                    <div class="char-card-actions">
                        <button class="char-btn-equip" onclick="openEquipModal(${p.id})" title="Gérer l'équipement">
                            <span class="material-symbols-outlined text-md">shield</span> Équiper
                        </button>
                        ${window.isAdmin ? `
                        <button class="char-btn-edit" onclick="editPersonnage(${p.id})" title="Éditer">
                            <span class="material-symbols-outlined text-md">edit</span> Éditer
                        </button>
                        ` : ''}
                        <button class="char-btn-delete" onclick="deletePersonnage(${p.id})" title="Supprimer">
                            <span class="material-symbols-outlined text-md">delete</span>
                        </button>
                    </div>
                </div>
                <div class="char-card-badges">${badges}</div>
                ${equipHtml}
                <div class="char-card-stats">
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-pink">favorite</span>${p.totalHealthMax || p.healthMax} PV</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-info">water_drop</span>${p.totalManaMax || p.manaMax} Mana</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-purple">auto_awesome</span>${p.totalPower !== undefined ? p.totalPower : p.power} Pui</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-rose-500">fitness_center</span>${p.totalStrength !== undefined ? p.totalStrength : p.strength} For</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-blue">shield</span>${p.totalArmor !== undefined ? p.totalArmor : p.armor} Arm</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined text-success">shield</span>${p.totalResistance !== undefined ? p.totalResistance : p.resistance} Rés</span>
                    ${(p.totalSpeed !== undefined ? p.totalSpeed : p.speed) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined text-warning">bolt</span>${p.totalSpeed !== undefined ? p.totalSpeed : p.speed} Vit</span>` : ''}
                    ${(p.totalCrit !== undefined ? p.totalCrit : p.crit) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined text-red-500">gps_fixed</span>${p.totalCrit !== undefined ? p.totalCrit : p.crit}% Crit</span>` : ''}
                    ${(p.totalRegenHp !== undefined ? p.totalRegenHp : p.regenHp || 0) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined text-pink">healing</span>${p.totalRegenHp !== undefined ? p.totalRegenHp : p.regenHp} Régen PV</span>` : ''}
                    ${(p.totalRegenMana !== undefined ? p.totalRegenMana : p.regenMana || 0) > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined text-cyan-400">dew_point</span>${p.totalRegenMana !== undefined ? p.totalRegenMana : p.regenMana} Régen Mana</span>` : ''}
                </div>
                <div class="char-xp-container">
                    <div class="char-xp-header">
                        <span>Expérience Voie</span>
                        <span>${p.experience} / ${p.nextLevelXp} XP</span>
                    </div>
                    <div class="char-xp-bar-bg">
                        <div class="char-xp-bar-fill-voie" style="width: ${p.nextLevelXp > p.currentLevelXp ? Math.min(100, Math.max(0, ((p.experience - p.currentLevelXp) / (p.nextLevelXp - p.currentLevelXp)) * 100)) : 100}%;"></div>
                    </div>
                    
                    <div class="char-xp-header mt-1">
                        <span>Expérience Spirituelle</span>
                        <span>${p.spiritualiteExperience} / ${p.nextLevelSpiritXp} XP</span>
                    </div>
                    <div class="char-xp-bar-bg">
                        <div class="char-xp-bar-fill-spirit" style="width: ${p.nextLevelSpiritXp > p.currentLevelSpiritXp ? Math.min(100, Math.max(0, ((p.spiritualiteExperience - p.currentLevelSpiritXp) / (p.nextLevelSpiritXp - p.currentLevelSpiritXp)) * 100)) : 100}%;"></div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ===== Equipment Modal =====

async function openEquipModal(persoId) {
    pageState.equipModalPersoId = persoId;
    await loadAllEquipments();
    const overlay = document.getElementById('equipModalOverlay');
    overlay.classList.add('active');
    renderEquipModal();
}

function closeEquipModal() {
    pageState.equipModalPersoId = null;
    document.getElementById('equipModalOverlay').classList.remove('active');
}

function renderEquipModal() {
    const perso = pageState.personnages.find(p => p.id === pageState.equipModalPersoId);
    if (!perso) return;

    document.getElementById('equipModalTitle').textContent = `Équipement de ${perso.name}`;

    // Render slots
    const slotsContainer = document.getElementById('equipSlotsContainer');
    const slots = Object.keys(window.SLOT_LABELS).filter(s => s !== 'CONSOMMABLE' && s !== 'ANOMALIE' && s !== 'ARME_DEUX_MAINS' && s !== 'ARME' && s !== 'ANNEAU');
    const equippedItems = pageState.allEquipments.filter(e => e.personnage && e.personnage.id === perso.id);

    slotsContainer.innerHTML = slots.map(slotKey => {
        const slotInfo = window.SLOT_LABELS[slotKey];
        let equipped = equippedItems.find(e => e.slot === slotKey);
        const twoHanded = equippedItems.find(e => e.slot === 'ARME_DEUX_MAINS');

        if (slotKey === 'ARME_GAUCHE' && twoHanded) {
            equipped = twoHanded;
        }

        if (slotKey === 'ARME_DROITE' && twoHanded) {
            equipped = twoHanded;
        }

        if (equipped) {
            const statsChips = STAT_DEFS
                .filter(s => equipped[s.key] && equipped[s.key] !== 0)
                .map(s => {
                    const val = equipped[s.key];
                    const sign = val > 0 ? '+' : '';
                    const isMalus = val < 0;
                    const suffix = s.isPercent ? '%' : '';
                    return `<span class="eq-stat-mini ${isMalus ? 'malus' : ''}" title="${s.label}"><span class="material-symbols-outlined text-xs" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>${sign}${val}${suffix}</span>`;
                })
                .join('');
            const rarityName = getRarityName(equipped.rarity);
            const rarityClass = rarityName ? `rarity-${rarityName}` : '';

            let specialEffectHtml = '';
            if (equipped.specialEffect && equipped.specialEffect !== 'NONE') {
                const label = window.EFFECT_LABELS[equipped.specialEffect] || equipped.specialEffect;
                const isCursed = equipped.specialEffect.startsWith('CURSED_');
                const icon = isCursed ? 'skull' : 'auto_awesome';
                const color = isCursed ? '#9b2d2d' : '#c084fc';
                const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

                specialEffectHtml = `<div style="margin-top: 0.3rem; font-size: 0.7rem; color: ${color}; background: ${bg}; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem; border: ${isCursed ? '1px solid rgba(156, 163, 175, 0.2)' : 'none'};">
                    <span class="material-symbols-outlined text-xs">${icon}</span>
                    ${label} : ${equipped.specialEffectValue} ${window.getEffectInfoIconHtml ? window.getEffectInfoIconHtml(equipped.specialEffect) : ''}
                </div>`;
            }

            return `
                <div class="equip-slot-card equipped" data-slot="${slotKey}">
                    <div class="equip-slot-header">
                        <span class="equip-slot-label">
                            <span class="material-symbols-outlined text-lg ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label}
                        </span>
                        <button class="eq-unequip-btn" onclick="unequipItem(${equipped.id})" title="Retirer">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <div class="equip-slot-item-name ${rarityClass}">${equipped.name}</div>
                    <div class="equip-slot-stats">
                        ${statsChips || '<span class="opacity-40">Aucun bonus</span>'}
                        ${specialEffectHtml}
                    </div>
                </div>`;
        } else {
            // Available items for this slot
            let available = pageState.allEquipments.filter(e => e.slot === slotKey && !e.personnage);

            // Special case for weapons: allow ARME_DEUX_MAINS in both weapon slots
            if (slotKey === 'ARME_GAUCHE' || slotKey === 'ARME_DROITE') {
                available = pageState.allEquipments.filter(e =>
                    (e.slot === slotKey || e.slot === 'ARME_DEUX_MAINS') && !e.personnage
                );
            }

            // Special case for rings: allow any ring in any ring slot
            if (slotKey === 'ANNEAU_GAUCHE' || slotKey === 'ANNEAU_DROIT') {
                available = pageState.allEquipments.filter(e =>
                    (e.slot === 'ANNEAU' || e.slot === 'ANNEAU_GAUCHE' || e.slot === 'ANNEAU_DROIT') && !e.personnage
                );
            }

            // Sort by rarity (descending) then by name
            const rarityOrder = {
                'COMMUN': 0,
                'INHABITUEL': 1,
                'RARE': 2,
                'MYTHIQUE': 3,
                'LEGENDAIRE': 4,
                'EPIQUE': 5,
                'RELIQUE': 6,
                'MAUDIT': 99
            };
            available.sort((a, b) => {
                const rA = a.rarity ? rarityOrder[getRarityName(a.rarity)] || 0 : 0;
                const rB = b.rarity ? rarityOrder[getRarityName(b.rarity)] || 0 : 0;
                if (rA !== rB) return rB - rA;
                return a.name.localeCompare(b.name);
            });

            // Filter out duplicates by name and rarity so they don't flood the list
            const uniqueAvailable = [];
            const seen = new Set();
            for (const item of available) {
                const rName = item.rarity ? (getRarityName(item.rarity)) : '';
                const key = item.name + '_' + rName;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueAvailable.push(item);
                }
            }
            available = uniqueAvailable;

            let availableHtml = '';
            if (available.length > 0) {
                availableHtml = `
                <div class="custom-select-wrapper mt-2" tabindex="0">
                    <div class="custom-select-trigger text-xs px-3 py-2 border border-white/10 bg-black/20">
                        <span class="cs-label text-muted">Choisir un équipement...</span>
                        <span class="material-symbols-outlined cs-arrow text-muted text-lg">expand_more</span>
                    </div>
                    <div class="custom-select-options">
                        <div class="custom-option" data-value=""><span class="text-muted">Choisir...</span></div>
                        ${available.map(a => {
                    const aStatsChips = STAT_DEFS
                        .filter(s => a[s.key] && a[s.key] !== 0)
                        .map(s => {
                            const val = a[s.key];
                            const sign = val > 0 ? '+' : '';
                            const isMalus = val < 0;
                            const suffix = s.isPercent ? '%' : '';
                            return `<span class="eq-stat-mini ${isMalus ? 'malus' : ''}" title="${s.label}"><span class="material-symbols-outlined text-xs" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>${sign}${val}${suffix}</span>`;
                        }).join('');

                    let aSpecialEffectHtml = '';
                    if (a.specialEffect && a.specialEffect !== 'NONE') {
                        const label = window.EFFECT_LABELS[a.specialEffect] || a.specialEffect;
                        const isCursed = a.specialEffect.startsWith('CURSED_');
                        const icon = isCursed ? 'skull' : 'auto_awesome';
                        const color = isCursed ? '#9b2d2d' : '#c084fc';
                        const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

                        aSpecialEffectHtml = `<div style="margin-top: 0.3rem; font-size: 0.7rem; color: ${color}; background: ${bg}; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem; border: ${isCursed ? '1px solid rgba(156, 163, 175, 0.2)' : 'none'};">
                                    <span class="material-symbols-outlined text-xs">${icon}</span>
                                    ${label} : ${a.specialEffectValue} ${window.getEffectInfoIconHtml ? window.getEffectInfoIconHtml(a.specialEffect) : ''}
                                </div>`;
                    }

                    const aRarityName = getRarityName(a.rarity);
                    const aRarityLabel = typeof a.rarity === 'object' ? a.rarity?.label : a.rarity;

                    const tooltipHtml = `
                                <div class="tooltip-data hidden">
                                    <div class="${aRarityName ? 'rarity-' + aRarityName : ''} font-bold mb-1 text-base">${a.name} ${aRarityLabel ? '(' + aRarityLabel + ')' : ''}</div>
                                    <div class="equip-slot-stats flex-wrap">
                                        ${aStatsChips || '<span class="opacity-40">Aucun bonus</span>'}
                                        ${aSpecialEffectHtml}
                                    </div>
                                </div>
                            `;

                    return `
                                <div class="custom-option" data-value="${a.id}" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()">
                                    <span class="${aRarityName ? 'rarity-' + aRarityName : ''}">${a.name}</span>
                                    ${aRarityLabel ? '<span class="opacity-50 text-xxs ml-1">(' + aRarityLabel + ')</span>' : ''}
                                    ${(a.slot?.name || a.slot) === 'ARME_DEUX_MAINS' ? '<span class="font-bold text-error text-xxs ml-1">[2 Mains]</span>' : ''}
                                    ${tooltipHtml}
                                </div>
                            `;
                }).join('')}
                    </div>
                    <input type="hidden" class="eq-assign-hidden" data-perso-id="${perso.id}" data-slot="${slotKey}" value="">
                </div>`;
            } else {
                availableHtml = `<span class="font-italic text-xs text-slate-600">Aucun disponible</span>`;
            }

            return `
                <div class="equip-slot-card empty" data-slot="${slotKey}">
                    <div class="equip-slot-header">
                        <span class="equip-slot-label">
                            <span class="material-symbols-outlined ${slotInfo.extraClass || ''} opacity-50 text-lg" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label}
                        </span>
                    </div>
                    <div class="equip-slot-empty">Vide</div>
                    ${availableHtml}
                </div>`;
        }
    }).join('');
}

function editPersonnage(id) {
    pageState.editingId = id;
    const p = pageState.personnages.find(x => x.id === id);
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
    document.getElementById('charRegenHp').value = p.regenHp || 0;
    document.getElementById('charRegenMana').value = p.regenMana || 0;
    document.getElementById('charVoie').value = p.voie ? p.voie.id : '';
    if (p.voie) {
        const info = getVoieInfo(p.voie.nom);
        document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${p.voie.nom}`;
    } else {
        document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —`;
    }

    document.getElementById('charExperience').value = p.experience || 0;

    document.getElementById('charSpirit').value = p.spiritualite ? p.spiritualite.id : '';
    if (p.spiritualite) {
        const info = getSpiritInfo(p.spiritualite.nom);
        document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${info.color};">${info.icon}</span> ${p.spiritualite.nom}`;
    } else {
        document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —`;
    }

    document.getElementById('charSpiritExperience').value = p.spiritualiteExperience || 0;

    document.getElementById('formTitleText').innerHTML = `
        <span class="material-symbols-outlined">edit</span>
        Modifier : ${p.name}`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined text-lg">save</span>
        Mettre à jour`;
    document.getElementById('cancelBtn').classList.remove('hidden');
    document.getElementById('cancelBtn').classList.add('inline-flex');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    pageState.editingId = null;
    document.getElementById('charFormPanel').classList.remove('editing-mode');
    document.getElementById('charName').value = '';
    document.getElementById('charHp').value = 100;
    document.getElementById('charMana').value = 100;
    document.getElementById('charPower').value = 10;
    document.getElementById('charStrength').value = 10;
    document.getElementById('charArmor').value = 5;
    document.getElementById('charResistance').value = 5;
    document.getElementById('charSpeed').value = 1;
    document.getElementById('charCrit').value = 5;
    document.getElementById('charRegenHp').value = 2;
    document.getElementById('charRegenMana').value = 4;
    document.getElementById('charVoie').value = '';
    document.getElementById('charVoieLabel').innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —`;

    document.getElementById('charExperience').value = 0;

    document.getElementById('charSpirit').value = '';
    document.getElementById('charSpiritLabel').innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">trip_origin</span> — Aucune —`;

    document.getElementById('charSpiritExperience').value = 0;

    document.getElementById('formTitleText').innerHTML = `
        <span class="material-symbols-outlined">person_add</span>
        Recruter à la taverne`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined text-lg">person_add</span>
        Forger le Personnage`;
    document.getElementById('cancelBtn').classList.add('hidden');
    document.getElementById('cancelBtn').classList.remove('inline-flex');
}

// showNotif, showModal → utils.js

// ===== Custom Select Logic (Event Delegation) =====
// The global custom select event listener is handled by window.initGlobalCustomSelect() in ui.js

document.addEventListener('change', (e) => {
    if (e.target.id === 'searchVoie' || e.target.id === 'searchSpirit') {
        filterPersonnages();
    }
    if (e.target.classList && e.target.classList.contains('eq-assign-hidden')) {
        if (e.target.value) {
            equipItem(e.target.value, e.target.dataset.persoId, e.target.dataset.slot);
        }
    }
});

// ===== Init =====

window.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();



    const cvInput = document.getElementById('charVoie');
    if (cvInput) {
        function applyVoieBaseStats(voieNom) {
            function buildStatHtml(label, valStr, icon, baseColor) {
                const val = parseInt(valStr.replace('+', ''));
                const isPos = val > 0;
                const valColor = isPos ? '#10b981' : '#ef4444';
                return `
                    <div class="flex-center justify-between px-3 py-2 bg-slate-900 rounded-md">
                        <div class="flex-center gap-2 text-slate-300">
                            <span class="material-symbols-outlined text-lg" style="color: ${baseColor};">${icon}</span>
                            ${label}
                        </div>
                        <div class="font-semibold" style="color: ${valColor};">${valStr}</div>
                    </div>
                `;
            }

            let diffHtml = '<span class="font-italic text-muted text-sm">Sélectionnez une voie pour voir les effets.</span>';
            // Statistiques par défaut
            let stats = {
                charHp: 100, charMana: 100, charPower: 10, charStrength: 10,
                charArmor: 5, charResistance: 5, charSpeed: 1, charCrit: 5,
                charRegenHp: 2, charRegenMana: 4
            };

            if (voieNom) {
                diffHtml = "";
                if (voieNom.includes('Raison')) {
                    stats.charCrit = 0; stats.charMana = 120; stats.charHp = 120;
                    diffHtml += buildStatHtml('PV', '+20', 'favorite', '#ec4899');
                    diffHtml += buildStatHtml('Mana', '+20', 'water_drop', '#38bdf8');
                    diffHtml += buildStatHtml('Critique', '-5', 'gps_fixed', '#ef4444');
                } else if (voieNom.includes('Sûreté') || voieNom.includes('Surete')) {
                    stats.charMana = 130; stats.charResistance = 8; stats.charRegenMana = 6;
                    diffHtml += buildStatHtml('Mana', '+30', 'water_drop', '#38bdf8');
                    diffHtml += buildStatHtml('Résistance', '+3', 'shield', '#10b981');
                    diffHtml += buildStatHtml('Régen Mana', '+2', 'cyclone', '#38bdf8');
                } else if (voieNom.includes('Trahison')) {
                    stats.charHp = 90; stats.charStrength = 12; stats.charSpeed = 2;
                    diffHtml += buildStatHtml('PV', '-10', 'favorite', '#ec4899');
                    diffHtml += buildStatHtml('Force', '+2', 'fitness_center', '#f43f5e');
                    diffHtml += buildStatHtml('Vitesse', '+1', 'bolt', '#f59e0b');
                } else if (voieNom.includes('Consolidation')) {
                    stats.charArmor = 8; stats.charResistance = 8; stats.charRegenHp = 3;
                    diffHtml += buildStatHtml('Armure', '+3', 'shield', '#3b82f6');
                    diffHtml += buildStatHtml('Résistance', '+3', 'shield', '#10b981');
                    diffHtml += buildStatHtml('Régen PV', '+1', 'healing', '#10b981');
                } else if (voieNom.includes('Conviction')) {
                    stats.charRegenMana = 25; stats.charHp = 90; stats.charPower = 11;
                    diffHtml += buildStatHtml('PV', '-10', 'favorite', '#ec4899');
                    diffHtml += buildStatHtml('Puissance', '+1', 'auto_awesome', '#a855f7');
                    diffHtml += buildStatHtml('Régen Mana', '+21', 'cyclone', '#38bdf8');
                } else if (voieNom.includes('Création') || voieNom.includes('Creation')) {
                    stats.charHp = 120; stats.charArmor = 8;
                    diffHtml += buildStatHtml('PV', '+20', 'favorite', '#ec4899');
                    diffHtml += buildStatHtml('Armure', '+3', 'shield', '#3b82f6');
                } else if (voieNom.includes('Destruction')) {
                    stats.charPower = 12; stats.charArmor = 0; stats.charStrength = 8; stats.charRegenMana = 5; stats.charMana = 110;
                    diffHtml += buildStatHtml('Mana', '+10', 'water_drop', '#38bdf8');
                    diffHtml += buildStatHtml('Puissance', '+2', 'auto_awesome', '#a855f7');
                    diffHtml += buildStatHtml('Force', '-2', 'fitness_center', '#f43f5e');
                    diffHtml += buildStatHtml('Armure', '-5', 'shield', '#3b82f6');
                    diffHtml += buildStatHtml('Régen Mana', '+1', 'cyclone', '#38bdf8');
                } else if (voieNom.includes('Violence')) {
                    stats.charSpeed = 2; stats.charCrit = 7; stats.charRegenHp = 0; stats.charPower = 11; stats.charStrength = 11;
                    diffHtml += buildStatHtml('Puissance', '+1', 'auto_awesome', '#a855f7');
                    diffHtml += buildStatHtml('Force', '+1', 'fitness_center', '#f43f5e');
                    diffHtml += buildStatHtml('Vitesse', '+1', 'bolt', '#f59e0b');
                    diffHtml += buildStatHtml('Critique', '+2', 'gps_fixed', '#ef4444');
                    diffHtml += buildStatHtml('Régen PV', '-2', 'healing', '#10b981');
                }
            }

            const diffEl = document.getElementById('voieStatsDiff');
            if (diffEl) diffEl.innerHTML = diffHtml;

            if (pageState.editingId) return; // Ne pas écraser les stats en mode édition

            // Mise à jour des champs
            for (const [key, value] of Object.entries(stats)) {
                const el = document.getElementById(key);
                if (el) el.value = value;
            }
        }

        cvInput.addEventListener('change', (e) => {
            const vId = e.target.value;
            const iconEl = document.getElementById('charVoieInfoIcon');

            if (!vId) {
                if (iconEl) iconEl.classList.add('hidden');
                applyVoieBaseStats(null);
                return;
            }
            const v = pageState.voies.find(x => x.id == vId);
            if (v && iconEl) {
                const info = getVoieInfo(v.nom);
                const template = iconEl.querySelector('.tooltip-data');
                if (template) {
                    template.innerHTML = `
                        <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${info.color};">
                            <span class="material-symbols-outlined text-lg">${info.icon}</span>
                            ${v.nom}
                        </div>
                        <div class="text-xs text-slate-300 mb-2">${v.description || 'Description générique.'}</div>
                        <div class="flex-start-gap text-xs text-slate-200">
                            <span class="material-symbols-outlined text-md" style="color: ${info.color};">bolt</span>
                            <span class="font-italic whitespace-pre-wrap">${formatRichText(v.passiveDescription) || 'Passif spécifique.'}</span>
                        </div>
                    `;
                }
                iconEl.classList.remove('hidden');
                applyVoieBaseStats(v.nom);
            } else if (iconEl) {
                iconEl.classList.add('hidden');
                applyVoieBaseStats(null);
            } else {
                applyVoieBaseStats(null);
            }
        });
    }

    const csInput = document.getElementById('charSpirit');
    if (csInput) {
        csInput.addEventListener('change', (e) => {
            const sId = e.target.value;
            const iconEl = document.getElementById('charSpiritInfoIcon');

            if (!sId) {
                if (iconEl) iconEl.classList.add('hidden');
                return;
            }
            const s = pageState.spiritualites.find(x => x.id == sId);
            if (s && iconEl) {
                const info = getSpiritInfo(s.nom);
                const template = iconEl.querySelector('.tooltip-data');
                if (template) {
                    template.innerHTML = `
                        <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${info.color};">
                            <span class="material-symbols-outlined text-lg">${info.icon}</span>
                            ${s.nom}
                        </div>
                        <div class="text-xs text-slate-300 mb-2">${s.description || 'Description générique.'}</div>
                        <div class="flex-start-gap text-xs text-slate-200">
                            <span class="material-symbols-outlined text-md" style="color: ${info.color};">bolt</span>
                            <span class="font-italic whitespace-pre-wrap">${formatRichText(s.passiveDescription) || 'Passif spécifique.'}</span>
                        </div>
                    `;
                }
                iconEl.classList.remove('hidden');
            } else if (iconEl) {
                iconEl.classList.add('hidden');
            }
        });
    }


    await fetchMeta();
});

window.addEventListener('authLoaded', async () => {
    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        if (window.isAdmin) searchOwnerContainer.classList.remove('hidden');
        else searchOwnerContainer.classList.add('hidden');
    }
    await loadAllEquipments();
    await loadPersonnages();
});

;

window.hideEqTooltip = function () {
    const tooltip = document.getElementById('globalSpellTooltip');
    if (tooltip) tooltip.classList.add('hidden');
};




