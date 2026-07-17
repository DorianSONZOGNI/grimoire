const pageState = { allEquipments: [], equipmentToDelete: null, anomalieToDelete: null, editingEquipmentId: null, editingAnomalieId: null };

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
    if (eq.isAnomalie) return 0;
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

    const rarity = typeof eq.rarity === 'object' ? eq.rarity?.name : eq.rarity;
    if (rarity === 'EPIQUE' || rarity === 'RELIQUE' || rarity === 'MAUDIT') {
        const specialEffect = eq.specialEffect;
        const effectVal = eq.specialEffectValue || 0;

        if (specialEffect && specialEffect !== 'NONE' && effectVal !== 0) {
            w += effectVal * 1.5;
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
            filterVault(); // Mettre à jour l'affichage au changement
        }
    }
});

// ===== API =====
async function loadEquipments() {
    try {
        const url = window.isAdmin ? '/api/equipments/all' : '/api/equipments';
        const res = await globalFetch(url);
        let eqData = await res.json();

        let anomaliesData = [];
        try {
            const aUrl = window.isAdmin ? '/api/anomalies/all' : '/api/anomalies';
            const aRes = await globalFetch(aUrl);
            if (aRes.ok) anomaliesData = await aRes.json();
        } catch (e) { console.error('Erreur chargement anomalies:', e); }

        anomaliesData.forEach(a => {
            a.isAnomalie = true;
            a.slot = 'ANOMALIE';
            a.rarity = 'RELIQUE';
        });

        pageState.allEquipments = eqData.concat(anomaliesData);

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
    pageState.anomalieToDelete = String(idsStr).split(',');
    pageState.equipmentToDelete = null;
    const firstId = Number(pageState.anomalieToDelete[0]);
    const eq = pageState.allEquipments.find(e => e.id === firstId && e.isAnomalie);
    if (eq) {
        document.getElementById('deleteTargetName').textContent = eq.name;
        document.getElementById('deleteConfirmBtn').innerHTML = `Oui, détruire l'anomalie`;
    }
    document.getElementById('deleteConfirmModal').classList.add('show');
}

window.deleteEquipment = function (idsStr) {
    pageState.equipmentToDelete = String(idsStr).split(',');
    pageState.anomalieToDelete = null;
    const firstId = Number(pageState.equipmentToDelete[0]);
    const eq = pageState.allEquipments.find(e => e.id === firstId && !e.isAnomalie);
    if (eq) {
        document.getElementById('deleteTargetName').textContent = eq.name;
        const weightStr = eq._weight % 1 === 0 ? eq._weight : eq._weight.toFixed(1);
        document.getElementById('deleteConfirmBtn').innerHTML = `Oui, détruire pour ${weightStr} <span class="material-symbols-outlined align-middle" style="font-size: 1rem; margin-top: -2px;">monetization_on</span>`;
    }
    document.getElementById('deleteConfirmModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
    pageState.equipmentToDelete = null;
}

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
    if (!pageState.equipmentToDelete && !pageState.anomalieToDelete) return;

    const idsEq = pageState.equipmentToDelete;
    const idsAn = pageState.anomalieToDelete;
    closeDeleteModal();

    try {
        if (idsEq) {
            let success = false;
            for (let id of idsEq) {
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
        } else if (idsAn) {
            let success = false;
            for (let id of idsAn) {
                const res = await globalFetch(`/api/anomalies/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    success = true;
                    showNotif('Anomalie détruite.');
                    await loadEquipments();
                    break;
                }
            }
            if (!success) showNotif('Impossible de détruire cette anomalie (liée).', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    }
});

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
                matchSlot = ((eq.slot?.name || eq.slot) === 'ANNEAU_GAUCHE' || (eq.slot?.name || eq.slot) === 'ANNEAU_DROIT');
            } else if (filterSlot === 'ARME') {
                matchSlot = ((eq.slot?.name || eq.slot) === 'ARME_GAUCHE' || (eq.slot?.name || eq.slot) === 'ARME_DROITE' || (eq.slot?.name || eq.slot) === 'ARME_DEUX_MAINS');
            } else {
                matchSlot = (eq.slot?.name || eq.slot) === filterSlot;
            }
        }

        const rarityName = typeof eq.rarity === 'object' ? eq.rarity?.name : eq.rarity;
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
                <span class="material-symbols-outlined opacity-50" style="font-size: 3rem;">search_off</span>
                Aucun objet ne correspond à votre recherche.
            </div>`;
        return;
    }

    container.innerHTML = equipments.map(eq => {
        const rarityName = typeof eq.rarity === 'object' ? eq.rarity?.name : eq.rarity;
        const rarityClass = rarityName ? `rarity-${rarityName}` : 'rarity-COMMUN';

        if (eq.isAnomalie) {
            const spColors = {
                'NATURE': '#10b981',
                'NECROMANCIE': '#8b5cf6',
                'EAU': '#3b82f6',
                'FEU': '#ef4444',
                'TERRE': '#f59e0b',
                'AIR': '#06b6d4',
                'LUMIERE': '#fde047',
                'NEANT': '#000000',
                'FOUDRE': '#fbbf24',
                'SANG': '#991b1b',
                'POISON': '#22c55e',
                'GLACE': '#93c5fd',
                'ESPRIT': '#38bdf8',
                'KARMA': '#e7d198',
                'TENEBRES': '#a855f7'
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
                ? `<div class="font-bold absolute" style="top: -10px; right: -10px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; border: 2px solid #1e293b; z-index: 5; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">x${eq.stackCount}</div>`
                : '';

            let adminOwnerHtml = '';
            if (window.isAdmin) {
                if (eq.isTemplate || eq.ownerUsername === 'MODELE') {
                    adminOwnerHtml = `<span class="flex-shrink-0 text-xxs font-bold text-error whitespace-nowrap align-middle inline-block" style="padding: 0.15rem 0.4rem; background: rgba(239, 68, 68, 0.2); border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);">[MODÈLE]</span>`;
                } else {
                    const displayOwner = eq._groupOwner || eq.ownerUsername;
                    if (displayOwner) {
                        adminOwnerHtml = `<span class="flex-shrink-0 text-xxs whitespace-nowrap align-middle inline-block" style="padding: 0.15rem 0.4rem; background: ${displayOwner === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${displayOwner === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${displayOwner === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined align-middle" style="font-size: 0.7rem; margin-right: 2px;">account_circle</span>${displayOwner}</span>`;
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
                            ${typeStr} <span style="opacity:0.5; margin-left:4px;">${eq.spiritualite}</span> <span style="opacity:0.5; margin-left:4px;">(Niv. ${eq.level || 1})</span>
                        </div>
                        <div class="vault-card-name flex-start-gap" style="color: #fdf4ff;">
                            <span class="material-symbols-outlined flex-shrink-0 opacity-80" style="font-size: 1.2rem; color: ${spColor}; margin-top: 2px;">${catIcon}</span>
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

        const statsHtml = STAT_DEFS
            .filter(s => eq[s.key] && eq[s.key] !== 0)
            .map(s => {
                const val = eq[s.key];
                const isMalus = val < 0;
                const sign = val > 0 ? '+' : '';
                const suffix = s.isPercent ? '%' : '';
                return `<span class="vault-stat-chip ${isMalus ? 'malus' : ''}" title="${s.label}">
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

            effectHtml = `<div class="vault-card-effect" style="color: ${color}; background: ${bg}; ${isCursed ? 'border: 1px solid rgba(156, 163, 175, 0.2);' : ''}">
                <span class="material-symbols-outlined text-sm">${icon}</span>
                ${label} : ${eq.specialEffectValue}
            </div>`;
        }
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
            ? `<div class="font-bold absolute" style="top: -10px; right: -10px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; border: 2px solid #1e293b; z-index: 5; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">x${eq.stackCount}</div>`
            : '';

        let adminOwnerHtml = '';
        if (window.isAdmin) {
            if (eq.isTemplate || eq.ownerUsername === 'MODELE') {
                adminOwnerHtml = `<span class="flex-shrink-0 text-xxs font-bold text-error whitespace-nowrap align-middle inline-block" style="padding: 0.15rem 0.4rem; background: rgba(239, 68, 68, 0.2); border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);">[MODÈLE]</span>`;
            } else {
                const displayOwner = eq._groupOwner || eq.ownerUsername;
                if (displayOwner) {
                    adminOwnerHtml = `<span class="flex-shrink-0 text-xxs whitespace-nowrap align-middle inline-block" style="padding: 0.15rem 0.4rem; background: ${displayOwner === window.currentUser?.username ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${displayOwner === window.currentUser?.username ? '#34d399' : '#cbd5e1'}; border-radius: 4px; border: 1px solid ${displayOwner === window.currentUser?.username ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'};"><span class="material-symbols-outlined align-middle" style="font-size: 0.7rem; margin-right: 2px;">account_circle</span>${displayOwner}</span>`;
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
                            ${slotInfo.label} ${eq.rarity ? `<span style="opacity:0.5; margin-left:4px;">${typeof eq.rarity === 'object' ? eq.rarity.label : eq.rarity}</span>` : ''}
                        </div>
                        <div class="vault-card-name word-break">
                            ${eq.name}
                        </div>
                        ${adminOwnerHtml ? `<div style="margin-top: 0.2rem;">${adminOwnerHtml}</div>` : ''}
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
                    ${statsHtml || '<span style="color:#64748b; font-size:0.85rem; font-style:italic;">Aucune statistique de base</span>'}
                </div>
                ${effectHtml}
                
                <div class="vault-card-footer">
                    <div class="vault-card-weight" title="${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? 'Poids total' : `Poids total / Poids Max (${maxWeight})`}">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? '#10b981' : weightColor};">scale</span>
                        <span style="color: ${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? '#10b981' : weightColor}; font-weight: 600;">${weightStr}</span>${(eq.slot?.name || eq.slot) === 'CONSOMMABLE' ? ' pts' : ` / ${maxWeight} pts`}
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

window.addEventListener('authLoaded', async () => {
    const btnCreate = document.getElementById('btnCreateVaultEq');
    const btnCreateAnomalie = document.getElementById('btnCreateAnomalie');
    if (btnCreate) {
        btnCreate.style.display = window.isAdmin ? 'flex' : 'none';
    }
    if (btnCreateAnomalie) {
        btnCreateAnomalie.style.display = window.isAdmin ? 'flex' : 'none';
    }

    const searchOwnerContainer = document.getElementById('searchOwnerContainer');
    if (searchOwnerContainer) {
        searchOwnerContainer.style.display = window.isAdmin ? 'flex' : 'none';
    }

    await loadEquipments();
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
        document.getElementById('eqAvailableInShop').checked = false;
    }
    document.getElementById('eqRegenHp').value = 0;
    document.getElementById('eqRegenMana').value = 0;
    if (document.getElementById('eqConsumableHpPercent')) document.getElementById('eqConsumableHpPercent').value = 0;
    if (document.getElementById('eqConsumableManaPercent')) document.getElementById('eqConsumableManaPercent').value = 0;
    if (document.getElementById('eqConsumableMissingHpPercent')) document.getElementById('eqConsumableMissingHpPercent').value = 0;
    if (document.getElementById('eqConsumableMissingManaPercent')) document.getElementById('eqConsumableMissingManaPercent').value = 0;
    if (document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = 0;

    const catInput = document.getElementById('eqConsumableCategory');
    if (catInput) {
        catInput.value = 'AUTRE';
        document.getElementById('eqConsumableCategoryLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">inventory_2</span> Autre';
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
    const eqRarityName = typeof eq.rarity === 'object' ? eq.rarity?.name : eq.rarity;
    if (rarityInput && eqRarityName) {
        rarityInput.value = eqRarityName;
        const option = document.querySelector(`.custom-option.rarity-${eqRarityName}`);
        if (option) {
            document.getElementById('eqRarityLabel').innerHTML = option.innerHTML;
        }

        // Si l'équipement est épique ou plus, afficher la valeur
        const row = document.getElementById('eqSpecialEffectRow');
        if (eqRarityName === 'EPIQUE' || eqRarityName === 'RELIQUE' || eqRarityName === 'MAUDIT') {
            if (row) row.style.display = 'grid';
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

function getFormEquipmentData() {
    const slot = document.getElementById('eqSlot').value;
    const rarity = document.getElementById('eqRarity').value;
    const specialEffect = document.getElementById('eqSpecialEffect').value;
    const specialEffectValue = parseInt(document.getElementById('eqSpecialEffectValue').value) || 0;

    return {
        name: document.getElementById('eqName').value,
        availableInShop: document.getElementById('eqAvailableInShop') ? document.getElementById('eqAvailableInShop').checked : false,
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
        consumableHpPercent: document.getElementById('eqConsumableHpPercent') ? (parseInt(document.getElementById('eqConsumableHpPercent').value) || 0) : 0,
        consumableManaPercent: document.getElementById('eqConsumableManaPercent') ? (parseInt(document.getElementById('eqConsumableManaPercent').value) || 0) : 0,
        consumableMissingHpPercent: document.getElementById('eqConsumableMissingHpPercent') ? (parseInt(document.getElementById('eqConsumableMissingHpPercent').value) || 0) : 0,
        consumableMissingManaPercent: document.getElementById('eqConsumableMissingManaPercent') ? (parseInt(document.getElementById('eqConsumableMissingManaPercent').value) || 0) : 0,
        baseWeight: document.getElementById('eqBaseWeight') ? (parseFloat(document.getElementById('eqBaseWeight').value) || 0.0) : 0.0,
        consumableCategory: document.getElementById('eqConsumableCategory') ? document.getElementById('eqConsumableCategory').value : 'AUTRE',
        rarity,
        specialEffect,
        specialEffectValue,
        isAnomalie: false
    };
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

    const row = document.getElementById('eqBaseWeightRow');
    if (row) {
        row.style.display = slot === 'CONSOMMABLE' ? 'flex' : 'none';
    }

    document.querySelectorAll('.consumable-category-field').forEach(el => {
        el.style.display = slot === 'CONSOMMABLE' ? 'block' : 'none';
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
        if (textEl) textEl.style.color = color;
    }
}



