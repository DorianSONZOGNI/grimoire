
const pageState = {
    editingMonsterId: null,
    editingDungeonId: null,
    editingMutationId: null,
    allMonsters: null,
    allEquipments: null,
    allAnomalies: null,
    allDungeons: null,
    allMutations: null,
    selectedRooms: null,
    selectedMutationIds: null,
};
pageState.editingMonsterId = null;
pageState.editingDungeonId = null;
pageState.editingMutationId = null;
pageState.allMonsters = [];
pageState.allEquipments = [];
pageState.allAnomalies = [];
pageState.allDungeons = [];
pageState.allMutations = [];
pageState.selectedRooms = [];
pageState.selectedMutationIds = [];
// Replaced by window.SLOT_LABELS

// getSlotInfo -> utils.js

// RARITY_COLORS -> utils.js
const SECRETS_META = [
    { name: "Secret du Chaos", icon: "local_fire_department", color: "#ef4444" },
    { name: "Secret de l'Abondance", icon: "eco", color: "#10b981" },
    { name: "Secret de la Préservation", icon: "foundation", color: "#d97706" },
    { name: "Secret de la Sérénité", icon: "water_drop", color: "#06b6d4" },
    { name: "Secret de la Chasse", icon: "visibility_off", color: "#f43f5e" },
    { name: "Secret du Carnage", icon: "explosion", color: "#be123c" },
    { name: "Secret de la Joie", icon: "volcano", color: "#ea580c" },
    { name: "Secret du Savoir", icon: "psychology", color: "#3b82f6" },
    { name: "Secret du Destin", icon: "all_inclusive", color: "#fcd34d" },
    { name: "Secret de l'Éther", icon: "blur_on", color: "#0ea5e9" },
    { name: "Secret des Abysses", icon: "dark_mode", color: "#a855f7" }
];

function getSecretIconOnlyHtml(m) {
    if (!m.nativeSecret) return '';
    const sm = SECRETS_META.find(s => s.name === m.nativeSecret) || { icon: "explore", color: "#10b981" };
    return `<span class="material-symbols-outlined cs-icon align-middle" title="${m.nativeSecret}" style="color: ${sm.color}; font-size: 1.1rem; margin-right: 4px;">${sm.icon}</span>`;
}

function getSecretBadgeHtml(m) {
    if (!m.nativeSecret) return '';
    const sm = SECRETS_META.find(s => s.name === m.nativeSecret) || { icon: "explore", color: "#10b981" };
    return `<div class="flex-center" title="${m.nativeSecret}" style="background: rgba(15, 23, 42, 0.9); color: ${sm.color}; padding: 0.2rem 0.4rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); border: 1px solid ${sm.color}60; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 1.1rem;">${sm.icon}</span></div>`;
}

function sortMonstersBySecret(monsters) {
    return monsters.sort((a, b) => {
        let idxA = SECRETS_META.findIndex(s => s.name === a.nativeSecret);
        if (idxA === -1) idxA = 999;
        let idxB = SECRETS_META.findIndex(s => s.name === b.nativeSecret);
        if (idxB === -1) idxB = 999;

        if (idxA !== idxB) return idxA - idxB;
        if ((a.level || 1) !== (b.level || 1)) return (a.level || 1) - (b.level || 1);
        return a.name.localeCompare(b.name);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
    // Check if auth loaded
    const checkAdmin = () => {
        if (!window.currentUser) return;
        if (!window.isAdmin) {
            document.getElementById('adminWarning').style.display = 'block';
            setTimeout(() => { window.location.href = '/'; }, 2000);
            return;
        }

        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('adminPvELink').style.display = 'inline-flex';

        loadMonsters();
        loadEquipments();
        loadAnomalies();
        loadDungeons();
        loadMutations();
    };

    if (window.currentUser !== undefined) {
        checkAdmin();
    } else {
        window.addEventListener('authLoaded', checkAdmin);
    }

    document.getElementById('monsterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const monstre = {
            name: document.getElementById('mName').value,
            description: document.getElementById('mDesc').value,
            level: parseInt(document.getElementById('mLevel').value) || 1,
            healthMax: parseInt(document.getElementById('mHp').value) || 0,
            regenHp: parseInt(document.getElementById('mRegenHp').value) || 0,
            startHpPct: parseInt(document.getElementById('mStartHpPct').value) || 0,
            manaMax: parseInt(document.getElementById('mMana').value) || 0,
            regenMana: parseInt(document.getElementById('mRegenMana').value) || 0,
            startManaPct: parseInt(document.getElementById('mStartManaPct').value) || 0,
            speed: parseInt(document.getElementById('mSpeed').value) || 0,
            crit: parseInt(document.getElementById('mCrit').value) || 0,
            strength: parseInt(document.getElementById('mStrength').value) || 0,
            power: parseInt(document.getElementById('mPower').value) || 0,
            armor: parseInt(document.getElementById('mArmor').value) || 0,
            resistance: parseInt(document.getElementById('mResist').value) || 0,
            rewardGold: parseInt(document.getElementById('mGold').value) || 0,
            rewardExp: parseInt(document.getElementById('mXp').value) || 0,
            monsterType: document.getElementById('mType').value,
            behavior: document.getElementById('mBehavior').value,
            nativeSecret: document.getElementById('mNativeSecret').value || null,
            mutations: pageState.selectedMutationIds.map(id => ({ id: id }))
        };

        try {
            let url = '/api/admin/pve/monsters';
            let method = 'POST';

            if (pageState.editingMonsterId) {
                url = `/api/admin/pve/monsters/${pageState.editingMonsterId}`;
                method = 'PUT';
            }

            const res = await globalFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monstre)
            });
            if (res.ok) {
                showNotif(pageState.editingMonsterId ? 'Monstre modifié avec succès' : 'Monstre créé avec succès');
                window.cancelMonsterEdit();
                loadMonsters();
            } else {
                showNotif("Erreur lors de l'enregistrement du monstre", true);
            }
        } catch (err) {
            console.error(err);
        }
    });

    document.getElementById('dungeonForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (pageState.selectedRooms.length === 0) {
            showNotif("Veuillez ajouter au moins une salle au donjon.", true);
            return;
        }

        for (let i = 0; i < pageState.selectedRooms.length; i++) {
            const r = pageState.selectedRooms[i];
            if (r.type === 'EVENT' && r.eventSubType === 'PORTE_ETRANGE') {
                const total = (r.doorOutcomes || []).reduce((sum, o) => sum + o.probability, 0);
                if (total > 100) {
                    showNotif(`La salle ${i + 1} (Porte Étrange) a un total de probabilité de ${total}% (Maximum 100%).`, true);
                    return;
                }
            }
        }

        const donjon = {
            name: document.getElementById('dName').value,
            description: document.getElementById('dDesc').value,
            recommendedLevel: parseInt(document.getElementById('dLevel').value),
            maxHeroes: parseInt(document.getElementById('dMaxHeroes').value) || 1,
            unlockCostGold: parseFloat(document.getElementById('dUnlockCost').value) || 0,
            entryCostGold: parseFloat(document.getElementById('dEntryCost').value) || 0,
            requiredSecret: document.getElementById('dRequiredSecret').value || null,
            requiredSecretLevel: parseInt(document.getElementById('dRequiredSecretLevel').value) || 1,
            salles: pageState.selectedRooms.map(r => {
                const s = { type: r.type };
                if (r.type === 'COMBAT') {
                    s.monsters = r.monsters.map(mId => ({ id: mId }));
                } else if (r.type === 'BOSS') {
                    s.monsters = r.monsters.map(mId => ({ id: mId }));
                    s.globalBuffs = r.globalBuffs && r.globalBuffs.length > 0 ? JSON.stringify(r.globalBuffs) : null;
                    s.bossRewardSpiritualXp = r.bossRewardSpiritualXp || 0;
                    s.bossRewardGold = r.bossRewardGold || 0;
                } else if (r.type === 'TREASURE') {
                    s.treasureGold = r.treasureGold || 0;
                    s.treasureExp = r.treasureExp || 0;
                    if (r.lootTable) {
                        s.lootTable = r.lootTable;
                    }
                } else if (r.type === 'EVENT') {
                    s.eventSubType = r.eventSubType || 'ALTERATION';
                    s.eventText = r.eventText || "Événement mystérieux";
                    s.eventEffectAmount = r.eventEffectAmount || 0; // Legacy / Generic
                    s.alterationType = r.alterationType || 'VIE_XP';
                    s.alterationHpAmount = r.alterationHpAmount || 0;
                    s.alterationExpAmount = r.alterationExpAmount || 0;
                    s.alterationRewardType = r.alterationRewardType || 'SPIRITUAL_XP';
                    s.alterationSpiritualXpReward = r.alterationSpiritualXpReward || 0;
                    s.alterationSpecialItemReward = r.alterationSpecialItemReward || null;
                    s.alterationRequiredItem = r.alterationRequiredItem || null;
                    s.trapType = r.trapType || null;
                    s.trapAmount = r.trapAmount || 0;
                    s.trapHasRopeOption = r.trapHasRopeOption || false;
                    s.trapDamageHpPct = r.trapDamageHpPct || 0;
                    s.trapDamageManaPct = r.trapDamageManaPct || 0;
                    s.trapDamageHpFixed = r.trapDamageHpFixed || 0;
                    s.trapDamageManaFixed = r.trapDamageManaFixed || 0;
                    s.doorOutcomes = r.doorOutcomes ? JSON.stringify(r.doorOutcomes) : null;
                    if (r.lootTable) {
                        s.lootTable = r.lootTable;
                    }
                }
                return s;
            })
        };

        try {
            let url = '/api/admin/pve/dungeons';
            let method = 'POST';

            if (pageState.editingDungeonId) {
                url = `/api/admin/pve/dungeons/${pageState.editingDungeonId}`;
                method = 'PUT';
            }

            const res = await globalFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(donjon)
            });
            if (res.ok) {
                showNotif(pageState.editingDungeonId ? 'Donjon modifié avec succès' : 'Donjon créé avec succès');
                window.cancelDungeonEdit();
                loadDungeons();
            } else {
                showNotif("Erreur lors de l'enregistrement du donjon", true);
            }
        } catch (err) {
            console.error(err);
        }
    });
});

window.addRoom = function (type) {
    if (type === 'COMBAT') {
        pageState.selectedRooms.push({ type: 'COMBAT', monsters: [] });
    } else if (type === 'BOSS') {
        pageState.selectedRooms.push({
            type: 'BOSS',
            monsters: [],
            globalBuffs: [],
            bossRewardSpiritualXp: 0,
            bossRewardGold: 0
        });
    } else if (type === 'TREASURE') {
        pageState.selectedRooms.push({ type: 'TREASURE', treasureGold: 50, treasureExp: 10 });
    } else if (type === 'ALTERATION') {
        pageState.selectedRooms.push({ type: 'EVENT', eventSubType: 'ALTERATION', eventText: 'Une aura mystérieuse émane des murs...', alterationType: 'VIE_XP', alterationHpAmount: 0, alterationExpAmount: 0, alterationRewardType: 'SPIRITUAL_XP', alterationSpiritualXpReward: 0, alterationSpecialItemReward: null, alterationRequiredItem: null });
    } else if (type === 'RENCONTRE') {
        pageState.selectedRooms.push({ type: 'EVENT', eventSubType: 'RENCONTRE', eventText: 'Un marchand ambulant vous interpelle...', lootTable: [] });
    } else if (type === 'PIEGE') {
        pageState.selectedRooms.push({ type: 'EVENT', eventSubType: 'PIEGE', eventText: 'Un piège se déclenche !', trapType: 'PV', trapAmount: 10, trapHasRopeOption: false });
    } else if (type === 'PORTE_ETRANGE') {
        pageState.selectedRooms.push({ type: 'EVENT', eventSubType: 'PORTE_ETRANGE', eventText: 'Une porte étrange se dresse devant vous...', doorOutcomes: [] });
    }
    renderRooms();
};

window.removeRoom = function (index) {
    pageState.selectedRooms.splice(index, 1);
    renderRooms();
};

window.addMonsterToRoom = function (roomIndex) {
    const select = document.getElementById(`room_monster_select_${roomIndex}`);
    if (select && select.value) {
        pageState.selectedRooms[roomIndex].monsters.push(parseInt(select.value));
        renderRooms();
    }
};

window.removeMonsterFromRoom = function (roomIndex, monsterIndex) {
    pageState.selectedRooms[roomIndex].monsters.splice(monsterIndex, 1);
    renderRooms();
};

window.toggleMonsterSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_select_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectMonsterOption = function (rIndex, monsterId, monsterName, monsterLvl) {
    const select = document.getElementById(`room_monster_select_${rIndex}`);
    if (select) select.value = monsterId;

    const label = document.getElementById(`room_select_label_${rIndex}`);
    if (label) {
        label.innerHTML = `<span class="material-symbols-outlined cs-icon text-error">pest_control</span> ${monsterName} (Lvl ${monsterLvl})`;
    }

    const wrapper = document.getElementById(`room_select_wrapper_${rIndex}`);
    if (wrapper) wrapper.classList.remove('open');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }
});

window.toggleLevelSelect = function () {
    const wrapper = document.getElementById('mLevelWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleFilterLevelSelect = function () {
    const wrapper = document.getElementById('mLevelFilterWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectLevelOption = function (lvl, color) {
    document.getElementById('mLevel').value = lvl;
    const trigger = document.getElementById('mLevelTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color || '#38bdf8'}; font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">${lvl}</span>`;
    }
    const wrapper = document.getElementById('mLevelWrapper');
    if (wrapper) wrapper.classList.remove('open');
};

window.toggleMonsterTypeSelect = function () {
    const wrapper = document.getElementById('mTypeWrapper');
    if (wrapper) wrapper.classList.toggle('open');
};

window.selectMonsterType = function (val, label, icon, color) {
    document.getElementById('mType').value = val;
    const trigger = document.getElementById('mTypeTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined text-muted" style="font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
    }
    const wrapper = document.getElementById('mTypeWrapper');
    if (wrapper) wrapper.classList.remove('open');
};

window.toggleMonsterBehaviorSelect = function () {
    const wrapper = document.getElementById('mBehaviorWrapper');
    if (wrapper) wrapper.classList.toggle('open');
};

window.selectMonsterBehavior = function (val, label, icon, color) {
    document.getElementById('mBehavior').value = val;
    const trigger = document.getElementById('mBehaviorTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined text-muted" style="font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
    }
    const wrapper = document.getElementById('mBehaviorWrapper');
    if (wrapper) wrapper.classList.remove('open');
};


window.selectFilterLevelOption = function (lvl, label, color, icon) {
    document.getElementById('monsterLevelFilter').value = lvl;
    const trigger = document.getElementById('mLevelFilterTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:center;">${label}</span>`;
    }
    const wrapper = document.getElementById('mLevelFilterWrapper');
    if (wrapper) wrapper.classList.remove('open');

    if (window.renderMonstersList) window.renderMonstersList();
};

window.toggleSortSelect = function () {
    const wrapper = document.getElementById('mSortWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectSortOption = function (val, label, icon, color) {
    document.getElementById('monsterSort').value = val;
    const trigger = document.getElementById('mSortTrigger');
    if (trigger) {
        // For name_desc, we need the scaleY(-1) transform on the icon
        const transformStr = val === 'name_desc' ? 'transform: scaleY(-1);' : '';
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem; ${transformStr}">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined text-muted" style="font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
    }
    const wrapper = document.getElementById('mSortWrapper');
    if (wrapper) wrapper.classList.remove('open');

    if (window.renderMonstersList) window.renderMonstersList();
};

window.updateRoomField = function (roomIndex, field, value) {
    pageState.selectedRooms[roomIndex][field] = value;
};

function renderRooms() {
    const currentScroll = window.scrollY;

    const container = document.getElementById('selectedRoomsContainer');
    const emptyMsg = document.getElementById('emptyRoomsMsg');

    // Remove all room elements except the empty message
    const elements = container.querySelectorAll('.room-card');
    elements.forEach(c => c.remove());

    if (pageState.selectedRooms.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    pageState.selectedRooms.forEach((room, rIndex) => {
        let optionsHtml = '';
        pageState.allMonsters.forEach(m => {
            optionsHtml += `<div class="custom-option" data-value="${m.id}" onclick="selectMonsterOption(${rIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})">${getSecretIconOnlyHtml(m)}<span class="material-symbols-outlined cs-icon text-error">pest_control</span> ${m.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${m.level || 1})</span></div>`;
        });

        const div = document.createElement('div');
        div.className = 'room-card';
        div.style.cssText = `background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; position: relative; z-index: ${1000 - rIndex};`;

        let headerIcon = '';
        let headerColor = '';
        let headerTitle = '';
        let contentHtml = '';

        if (room.type === 'COMBAT') {
            headerIcon = 'swords'; headerColor = '#ef4444'; headerTitle = 'Salle de Combat';

            // Monsters inside the room
            let monstersHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
            if (room.monsters.length === 0) {
                monstersHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun monstre dans cette salle.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = pageState.allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;"><span class="text-muted" style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button class="text-error" type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleMonsterSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">pest_control</span> Sélectionner un monstre...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button class="flex-center text-sm" type="button" onclick="addMonsterToRoom(${rIndex})" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.5)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.3)';" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span> Ajouter
                    </button>
                </div>
            `;
            contentHtml = monstersHtml;

        } else if (room.type === 'BOSS') {
            headerIcon = 'local_fire_department'; headerColor = '#e11d48'; headerTitle = 'Salle de Boss';

            // Monsters inside the room
            let monstersHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
            if (room.monsters.length === 0) {
                monstersHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun monstre configuré pour le boss.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = pageState.allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;"><span class="text-muted" style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button class="text-error" type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleMonsterSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">pest_control</span> Sélectionner un boss/monstre...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button class="flex-center text-sm" type="button" onclick="addMonsterToRoom(${rIndex})" style="background: linear-gradient(135deg, #e11d48, #be123c); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span> Ajouter
                    </button>
                </div>
            `;

            // Global Buffs HTML
            if (!room.globalBuffs) room.globalBuffs = [];
            let buffsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
            if (room.globalBuffs.length === 0) {
                buffsHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun buff global configuré.</div>`;
            } else {
                room.globalBuffs.forEach((buff, bIndex) => {
                    let buffLabel = '';
                    if (buff.type === 'HP_PCT') buffLabel = `+${buff.value}% PV Max`;
                    else if (buff.type === 'SHIELD_PCT') buffLabel = `Bouclier ${buff.value}% PV Max (${buff.duration} tours)`;
                    else if (buff.type === 'ARMOR_FLAT') buffLabel = `+${buff.value} Armure (${buff.duration} tours)`;
                    else if (buff.type === 'RESIST_FLAT') buffLabel = `+${buff.value} Résistance (${buff.duration} tours)`;
                    else if (buff.type === 'BURN_ON_HIT') buffLabel = `Brûlure au touché : ${buff.value} dgts (${buff.duration} tours)`;
                    else if (buff.type === 'POISON_ON_HIT') buffLabel = `Poison au touché : ${buff.value} dgts (${buff.duration} tours)`;

                    buffsHtml += `
                        <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                            <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">upgrade</span>
                                ${buffLabel}
                            </span>
                            <button class="text-error" type="button" onclick="removeGlobalBuffFromRoomBoss(${rIndex}, ${bIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                        </div>
                    `;
                });
            }
            buffsHtml += `</div>
            <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 120px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Type de buff</label>
                    <div class="custom-combobox relative" style="width: 100%;">
                        <input type="hidden" id="room_boss_buff_type_${rIndex}" value="HP_PCT">
                        <button type="button" class="form-control text-xs flex-between" onclick="toggleBuffCombobox(${rIndex})" id="room_boss_buff_btn_${rIndex}" style="width: 100%; cursor: pointer; text-align: left; padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                            <span id="room_boss_buff_label_${rIndex}" style="display: flex; align-items: center; gap: 0.5rem;"><span class="material-symbols-outlined text-green-400" style="font-size: 1.1rem;">favorite</span> <span>+ PV Max (%)</span></span>
                            <span class="material-symbols-outlined" style="font-size: 1.2rem; color: var(--text-muted);">expand_more</span>
                        </button>
                        <div id="room_boss_buff_menu_${rIndex}" class="custom-combobox-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; z-index: 50; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; flex-direction: column;">
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'HP_PCT', '+ PV Max (%)', 'favorite', 'text-green-400')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-green-400" style="font-size: 1.1rem;">favorite</span>
                                <span>+ PV Max (%)</span>
                            </div>
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'SHIELD_PCT', 'Bouclier (% PV)', 'shield', 'text-blue-400')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-blue-400" style="font-size: 1.1rem;">shield</span>
                                <span>Bouclier (% PV)</span>
                            </div>
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'ARMOR_FLAT', '+ Armure', 'security', 'text-gray-300')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-gray-300" style="font-size: 1.1rem;">security</span>
                                <span>+ Armure</span>
                            </div>
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'RESIST_FLAT', '+ Résistance', 'gpp_maybe', 'text-purple-400')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-purple-400" style="font-size: 1.1rem;">gpp_maybe</span>
                                <span>+ Résistance</span>
                            </div>
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'BURN_ON_HIT', 'Brûlure au touché', 'local_fire_department', 'text-orange-500')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-orange-500" style="font-size: 1.1rem;">local_fire_department</span>
                                <span>Brûlure au touché</span>
                            </div>
                            <div class="combobox-item" onclick="selectBuffType(${rIndex}, 'POISON_ON_HIT', 'Poison au touché', 'coronavirus', 'text-green-500')" style="padding: 0.5rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; font-size: 0.8rem;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <span class="material-symbols-outlined text-green-500" style="font-size: 1.1rem;">coronavirus</span>
                                <span>Poison au touché</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Stat (Valeur)</label>
                    <input type="number" id="room_boss_buff_val_${rIndex}" class="form-control" style="width: 100%;" value="10">
                </div>
                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Durée (Tours)</label>
                    <input type="number" id="room_boss_buff_dur_${rIndex}" class="form-control" style="width: 100%;" value="4">
                </div>
                <button class="flex-center text-sm" type="button" onclick="addGlobalBuffToRoomBoss(${rIndex})" style="height: 38px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                </button>
            </div>`;

            contentHtml = `
                ${monstersHtml}
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.15);">
                    <label class="text-xs" style="color: #3b82f6;">Buffs Globaux du Boss</label>
                    ${buffsHtml}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.15);">
                    <label class="flex-center text-xs" style="color: #e11d48; gap: 0.3rem; margin-bottom: 0.6rem;">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">emoji_events</span>
                        Récompenses de fin de combat (Boss vaincu)
                    </label>
                    <div style="display: flex; gap: 1rem;">
                        <div style="flex: 1;">
                            <label class="flex-center" style="font-size: 0.75rem; color: #8b5cf6; gap: 0.3rem; margin-bottom: 0.3rem;">
                                <span class="material-symbols-outlined text-sm">blur_on</span>
                                XP Spiritualité
                            </label>
                            <input type="number" class="form-control" min="0" value="${room.bossRewardSpiritualXp || 0}" onchange="updateRoomField(${rIndex}, 'bossRewardSpiritualXp', parseInt(this.value) || 0)">
                        </div>
                        <div style="flex: 1;">
                            <label class="flex-center" style="font-size: 0.75rem; color: #f59e0b; gap: 0.3rem; margin-bottom: 0.3rem;">
                                <span class="material-symbols-outlined text-sm">paid</span>
                                Or bonus
                            </label>
                            <input type="number" class="form-control" min="0" value="${room.bossRewardGold || 0}" onchange="updateRoomField(${rIndex}, 'bossRewardGold', parseInt(this.value) || 0)">
                        </div>
                    </div>
                </div>
            `;

        } else if (room.type === 'TREASURE') {
            headerIcon = 'shopping_bag'; headerColor = '#f59e0b'; headerTitle = 'Salle de Trésor';

            if (!room.lootTable) room.lootTable = [];

            let lootHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
            if (room.lootTable.length === 0) {
                lootHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun loot configuré.</div>`;
            } else {
                room.lootTable.forEach((loot, lIndex) => {
                    const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                    if (eq) {
                        const slotInfo = getSlotInfo(eq);
                        const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                        const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                        lootHtml += `
                            <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;"><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span style="color:#94a3b8; font-size:0.8rem;">(${loot.probability}%)</span></span>
                                <button class="text-error" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            lootHtml += `</div>
                <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                    <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">category</span> Objet...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
            `;
            pageState.allEquipments.forEach(eq => {
                const slotInfo = getSlotInfo(eq);
                const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                lootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
            });
            lootHtml += `
                        </div>
                        <input type="hidden" id="room_loot_select_${rIndex}" value="">
                    </div>
                    <input type="number" id="room_loot_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="0.1" min="0" max="100">
                    <button class="flex-center text-sm" type="button" onclick="addLootToRoom(${rIndex})" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                    </button>
                </div>
            `;

            contentHtml = `
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <div style="flex: 1;">
                        <label class="text-xs text-muted">Or</label>
                        <input type="number" class="form-control" value="${room.treasureGold}" onchange="updateRoomField(${rIndex}, 'treasureGold', parseInt(this.value))">
                    </div>
                    <div style="flex: 1;">
                        <label class="text-xs text-muted">Expérience</label>
                        <input type="number" class="form-control" value="${room.treasureExp}" onchange="updateRoomField(${rIndex}, 'treasureExp', parseInt(this.value))">
                    </div>
                </div>
                ${lootHtml}
            `;
        } else if (room.type === 'EVENT') {
            const subType = room.eventSubType || 'ALTERATION';

            if (subType === 'ALTERATION') {
                headerIcon = 'blur_on'; headerColor = '#8b5cf6'; headerTitle = 'Altération';
                const altType = room.alterationType || 'VIE_XP';

                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label class="text-xs text-muted">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div style="margin-top: 0.75rem;">
                        <label class="text-xs text-muted">Possibilité offerte</label>
                        <div class="custom-select-wrapper" id="room_alt_type_wrapper_${rIndex}" style="width: 100%; z-index: ${102 - rIndex}; margin: 0; margin-top: 0.2rem;">
                            <div class="custom-select-trigger" onclick="const w = document.getElementById('room_alt_type_wrapper_${rIndex}'); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== w) el.classList.remove('open'); }); w.classList.toggle('open');" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_alt_type_label_${rIndex}">
                                    ${altType === 'VIE_XP' ? '<span class="material-symbols-outlined cs-icon text-error">favorite</span> Don de vie et/ou d\'xp' :
                        (altType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Don d\'un item spécial' :
                            '<span class="material-symbols-outlined cs-icon text-muted">block</span> Ne rien faire')}
                                </span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_alt_type_options_${rIndex}">
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'VIE_XP'); renderRooms();"><span class="material-symbols-outlined cs-icon text-error">favorite</span> Don de vie et/ou d'xp</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'ITEM'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Don d'un item spécial</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'RIEN'); renderRooms();"><span class="material-symbols-outlined cs-icon text-muted">block</span> Ne rien faire</div>
                            </div>
                        </div>
                    </div>
                `;

                if (altType === 'VIE_XP') {
                    const rewType = room.alterationRewardType || 'SPIRITUAL_XP';
                    contentHtml += `
                    <div style="display: flex; gap: 1rem; margin-top: 0.75rem;">
                        <div style="flex: 1;">
                            <label class="text-xs text-muted">Effet PV (+ soin, - perte)</label>
                            <input type="number" class="form-control" value="${room.alterationHpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationHpAmount', parseInt(this.value))">
                        </div>
                        <div style="flex: 1;">
                            <label class="text-xs text-muted">Effet XP (+ gain, - perte)</label>
                            <input type="number" class="form-control" value="${room.alterationExpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationExpAmount', parseInt(this.value))">
                        </div>
                    </div>
                    <div style="margin-top: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px;">
                        <label class="text-xs" style="color: #fbbf24;">Récompense en échange</label>
                        <div class="custom-select-wrapper" id="room_alt_reward_type_wrapper_${rIndex}" style="width: 100%; z-index: ${105 - rIndex}; margin: 0; margin-top: 0.2rem; margin-bottom: 0.5rem;">
                            <div class="custom-select-trigger" onclick="const w = document.getElementById('room_alt_reward_type_wrapper_${rIndex}'); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== w) el.classList.remove('open'); }); w.classList.toggle('open');" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_alt_reward_type_label_${rIndex}">
                                    ${rewType === 'SPIRITUAL_XP' ? '<span class="material-symbols-outlined cs-icon" style="color: #8b5cf6;">blur_on</span> XP de Spiritualité' :
                            '<span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Item Spécial'}
                                </span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_alt_reward_type_options_${rIndex}">
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRewardType', 'SPIRITUAL_XP'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #8b5cf6;">blur_on</span> XP de Spiritualité</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRewardType', 'SPECIAL_ITEM'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Item Spécial</div>
                            </div>
                        </div>
                        ${rewType === 'SPIRITUAL_XP' ? `
                            <label class="text-xs text-muted">Gain XP Spiritualité</label>
                            <input type="number" class="form-control" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                        ` : `
                            <label class="text-xs text-muted">Item Spécial Donné en récompense</label>
                            ${(() => {
                            const selAnomalie = pageState.allAnomalies.find(a => a.name === room.alterationSpecialItemReward);
                            let selHtml = '<span class="material-symbols-outlined cs-icon text-muted">star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                let color = getSpiritualiteColor(selAnomalie.spiritualite);
                                const icon = getCategoryIcon(selAnomalie.category);
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                                <div class="custom-select-wrapper" id="room_alt_reward_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${103 - rIndex};">
                                    <div class="custom-select-trigger" onclick="document.getElementById('room_alt_reward_wrapper_${rIndex}').classList.toggle('open')" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                        <span class="cs-label" id="room_alt_reward_label_${rIndex}">${selHtml}</span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options" style="max-height: 200px; overflow-y: auto;">
                                        ${pageState.allAnomalies.map(a => {
                                let color = getSpiritualiteColor(a.spiritualite);
                                const icon = getCategoryIcon(a.category);
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationSpecialItemReward', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                            }).join('')}
                                    </div>
                                </div>
                                `;
                        })()}
                        `}
                    </div>
                    `;
                } else if (altType === 'ITEM') {
                    contentHtml += `
                    <div style="margin-top: 0.75rem;">
                        <label class="text-xs text-muted">Item Spécial Requis (que le joueur donne)</label>
                        ${(() => {
                            const selAnomalie = pageState.allAnomalies.find(a => a.name === room.alterationRequiredItem);
                            let selHtml = '<span class="material-symbols-outlined cs-icon text-muted">star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                let color = getSpiritualiteColor(selAnomalie.spiritualite);
                                const icon = getCategoryIcon(selAnomalie.category);
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                            <div class="custom-select-wrapper" id="room_alt_req_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${100 - rIndex};">
                                <div class="custom-select-trigger" onclick="document.getElementById('room_alt_req_wrapper_${rIndex}').classList.toggle('open')" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_alt_req_label_${rIndex}">${selHtml}</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" style="max-height: 200px; overflow-y: auto;">
                                    ${pageState.allAnomalies.map(a => {
                                let color = getSpiritualiteColor(a.spiritualite);
                                const icon = getCategoryIcon(a.category);
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRequiredItem', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                            }).join('')}
                                </div>
                            </div>
                            `;
                        })()}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <label class="text-xs" style="color: #fbbf24;">Récompense (XP Spiritualité)</label>
                        <input type="number" class="form-control" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                    </div>
                    `;
                }
            } else if (subType === 'RENCONTRE') {
                headerIcon = 'storefront'; headerColor = '#10b981'; headerTitle = 'Rencontre';

                if (!room.lootTable) room.lootTable = [];

                let shopHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                if (room.lootTable.length === 0) {
                    shopHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun objet en vente.</div>`;
                } else {
                    room.lootTable.forEach((loot, lIndex) => {
                        let nameHtml = '';
                        if (loot.specialItemName) {
                            let color = '#d946ef';
                            let icon = 'star';
                            let tooltipDesc = 'Cet objet aura un effet unique !';
                                                        const an = pageState.allAnomalies.find(a => a.name === loot.specialItemName);
                            if (an) {
                                if (an.spiritualite) color = getSpiritualiteColor(an.spiritualite);
                                icon = getCategoryIcon(an.category);
                                if (an.description) tooltipDesc = an.description.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                            }
                            const lvlColor = an && an.level ? (an.level === 1 ? '#10b981' : an.level === 2 ? '#3b82f6' : an.level === 3 ? '#a855f7' : an.level === 4 ? '#f59e0b' : '#ef4444') : '#10b981';
                            const typeColor = an && an.magicObject ? '#ec4899' : '#b45309';
                            const tooltipDataHtml = `
                                    <div class="anomaly-tooltip-title" style="color: ${color}; border-bottom: 1px solid ${color}40; padding-bottom: 4px;">${loot.specialItemName}</div>
                                    <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
                                        <span class="font-bold" style="border: 1px solid ${lvlColor}; color: ${lvlColor}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                                            Lvl ${an ? an.level || 1 : 1}
                                        </span>
                                        <span class="flex-center font-bold" style="border: 1px solid ${typeColor}; color: ${typeColor}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; gap: 4px;">
                                            <span class="material-symbols-outlined text-sm">${icon}</span>
                                            ${an && an.magicObject ? 'Magique' : 'Matériau'}
                                        </span>
                                        ${an && an.spiritualite ?
                                    `<span class="font-bold" style="border: 1px solid ${color}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: rgba(0,0,0,0.3);">
                                            ${an.spiritualite}
                                        </span>` : ''}
                                    </div>
                                    <div class="anomaly-tooltip-desc">${tooltipDesc}</div>
                            `;
                            nameHtml = `<span class="anomaly-badge" style="border-color: ${color}; background: ${color}25; color: ${color}; cursor: help;" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipDataHtml.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; color: ${color};">${icon}</span>
                            </span>`;
                        } else {
                            const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                            if (eq) {
                                const slotInfo = getSlotInfo(eq);
                                const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                nameHtml = `<span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span>`;
                            } else {
                                nameHtml = `Inconnu`;
                            }
                        }

                        let priceHtml = '';
                        if (loot.priceGold > 0) priceHtml += `<span style="color:#f59e0b; font-size:0.8rem; margin-left: 0.3rem;">${loot.priceGold} Or</span>`;
                        else if (!loot.priceGold && loot.probability > 0) priceHtml += `<span style="color:#f59e0b; font-size:0.8rem; margin-left: 0.3rem;">${loot.probability} Or</span>`;
                        if (loot.priceSpecialItemName) {
                            let priceColor = '#d946ef';
                            let priceIcon = 'star';
                            let tooltipDesc = 'Cet objet aura un effet unique !';
                                                        const anPrice = pageState.allAnomalies.find(a => a.name === loot.priceSpecialItemName);
                            if (anPrice) {
                                if (anPrice.spiritualite) priceColor = getSpiritualiteColor(anPrice.spiritualite);
                                priceIcon = getCategoryIcon(anPrice.category);
                                if (anPrice.description) tooltipDesc = anPrice.description.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                            }
                            const lvlColor = anPrice && anPrice.level ? (anPrice.level === 1 ? '#10b981' : anPrice.level === 2 ? '#3b82f6' : anPrice.level === 3 ? '#a855f7' : anPrice.level === 4 ? '#f59e0b' : '#ef4444') : '#10b981';
                            const typeColor = anPrice && anPrice.magicObject ? '#ec4899' : '#b45309';
                            const tooltipDataHtml2 = `
                                    <div class="anomaly-tooltip-title" style="color: ${priceColor}; border-bottom: 1px solid ${priceColor}40; padding-bottom: 4px;">${loot.priceSpecialItemName}</div>
                                    <div style="display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap;">
                                        <span class="font-bold" style="border: 1px solid ${lvlColor}; color: ${lvlColor}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                                            Lvl ${anPrice ? anPrice.level || 1 : 1}
                                        </span>
                                        <span class="flex-center font-bold" style="border: 1px solid ${typeColor}; color: ${typeColor}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; gap: 4px;">
                                            <span class="material-symbols-outlined text-sm">${priceIcon}</span>
                                            ${anPrice && anPrice.magicObject ? 'Magique' : 'Matériau'}
                                        </span>
                                        ${anPrice && anPrice.spiritualite ?
                                    `<span class="font-bold" style="border: 1px solid ${priceColor}; color: ${priceColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: rgba(0,0,0,0.3);">
                                            ${anPrice.spiritualite}
                                        </span>` : ''}
                                    </div>
                                    <div class="anomaly-tooltip-desc">${tooltipDesc}</div>
                            `;
                            priceHtml += `<span class="anomaly-badge" style="border-color: ${priceColor}; background: ${priceColor}25; color: ${priceColor}; margin-left: 0.5rem; cursor: help; display: inline-flex; align-items: center; gap: 0.2rem;" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipDataHtml2.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined text-sm align-middle" style="color: ${priceColor};">${priceIcon}</span> 1x
                            </span>`;
                        }

                        shopHtml += `
                            <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;">
                                    ${nameHtml}
                                </span>
                                <div class="flex-center" style="gap: 0.8rem;">
                                    <span class="flex-center">
                                        ${priceHtml}
                                    </span>
                                    <button class="text-error" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                </div>
                            </div>
                        `;
                    });
                }
                shopHtml += `</div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 6px;">
                        <div class="relative" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <div class="custom-select-wrapper" id="room_merchant_type_wrapper_${rIndex}" style="width: 100%; z-index: ${102 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleMerchantTypeSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_merchant_type_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">category</span> Équipement</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_type_options_${rIndex}">
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'EQ', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8;\\'>category</span> Équipement')"><span class="material-symbols-outlined cs-icon text-muted">category</span> Équipement</div>
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'SPECIAL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #d946ef;\\'>diamond</span> Item Spécial')"><span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Item Spécial</div>
                                </div>
                                <input type="hidden" id="room_merchant_type_${rIndex}" value="EQ">
                            </div>
                            
                            <!-- Mode Equipement -->
                            <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="width: 100%; z-index: ${101 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">category</span> Objet...</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                `;
                pageState.allEquipments.forEach(eq => {
                    const slotInfo = getSlotInfo(eq);
                    const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                    shopHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
                });
                shopHtml += `
                                </div>
                                <input type="hidden" id="room_loot_select_${rIndex}" value="">
                            </div>
                            
                            <!-- Mode Spécial -->
                            <div class="custom-select-wrapper" id="room_merchant_special_wrapper_${rIndex}" style="width: 100%; display: none; z-index: ${101 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleMerchantSpecialSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_merchant_special_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">diamond</span> Choisir un item spécial...</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_special_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                                    <div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '', 'Choisir un item spécial...')"><span class="material-symbols-outlined cs-icon text-muted">diamond</span> Choisir un item spécial...</div>
                                    ${pageState.allAnomalies.map(a => {
                    let color = getSpiritualiteColor(a.spiritualite);
                    const icon = getCategoryIcon(a.category);
                    return `<div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}')"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                }).join('')}
                                </div>
                                <input type="hidden" id="room_merchant_special_${rIndex}" value="">
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 0.8rem;">
                            <div>
                                <label class="text-xs text-muted" style="display: block; margin-bottom: 0.3rem;">Prix en Or</label>
                                <input type="number" id="room_merchant_gold_${rIndex}" class="form-control" style="width: 100%; margin: 0;" placeholder="0" min="0">
                            </div>
                            <div class="relative" style="z-index: ${99 - rIndex};">
                                <label class="text-xs text-muted" style="display: block; margin-bottom: 0.3rem;">Ou Prix en Item Spécial</label>
                                <div class="custom-select-wrapper" id="room_merchant_cost_item_wrapper_${rIndex}" style="width: 100%; margin: 0;">
                                    <div class="custom-select-trigger" onclick="toggleMerchantCostSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                        <span class="cs-label" id="room_merchant_cost_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">diamond</span> Sélectionner (Optionnel)</span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options" id="room_merchant_cost_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                                        <div class="custom-option" onclick="selectMerchantCost(${rIndex}, '', 'Sélectionner (Optionnel)')"><span class="material-symbols-outlined cs-icon text-muted">diamond</span> Sélectionner (Optionnel)</div>
                                        ${pageState.allAnomalies.map(a => {
                    let color = getSpiritualiteColor(a.spiritualite);
                    const icon = getCategoryIcon(a.category);
                    return `<div class="custom-option" onclick="selectMerchantCost(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}')"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                }).join('')}
                                    </div>
                                    <input type="hidden" id="room_merchant_cost_item_${rIndex}" value="">
                                </div>
                            </div>
                            <button class="flex-center" type="button" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'" onclick="addMerchantItemToRoom(${rIndex})" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; justify-content: center; width: 100%; transition: all 0.2s ease; margin-top: 0.5rem;">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem; margin-right: 0.5rem;">add_shopping_cart</span> Ajouter cet objet
                            </button>
                        </div>
                    </div>
                `;

                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label class="text-xs text-muted">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${shopHtml}
                `;
            } else if (subType === 'PIEGE') {
                headerIcon = 'warning'; headerColor = '#f87171'; headerTitle = 'Piège';
                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label class="text-xs text-muted">Texte du piège</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;">
                        <div>
                            <label class="text-muted" style="font-size: 0.75rem;">Perte PV (% max)</label>
                            <input type="number" class="form-control" value="${room.trapDamageHpPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label class="text-muted" style="font-size: 0.75rem;">Perte Mana (% max)</label>
                            <input type="number" class="form-control" value="${room.trapDamageManaPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label class="text-muted" style="font-size: 0.75rem;">Perte PV (Fixe)</label>
                            <input type="number" class="form-control" value="${room.trapDamageHpFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                        <div>
                            <label class="text-muted" style="font-size: 0.75rem;">Perte Mana (Fixe)</label>
                            <input type="number" class="form-control" value="${room.trapDamageManaFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                    </div>
                    <div class="flex-center" style="margin-top: 1rem; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                            <span class="flex-center text-sm font-medium" style="color: #f8fafc; gap: 0.4rem;">
                                <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 1.1rem;">auto_fix</span> Option Corde d'évitement
                            </span>
                            <span class="text-muted" style="font-size: 0.75rem;">Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                        </div>
                        <label class="flex-shrink-0 relative" style="display: block; width: 40px; height: 24px; margin: 0;">
                            <input type="checkbox" style="opacity: 0; width: 0; height: 0;" ${room.trapHasRopeOption ? 'checked' : ''} onchange="updateRoomField(${rIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
                            <span class="absolute" style="cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${room.trapHasRopeOption ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}; transition: .3s; border-radius: 24px;">
                                <span class="absolute" style="content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; transform: ${room.trapHasRopeOption ? 'translateX(16px)' : 'translateX(0)'}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                            </span>
                        </label>
                    </div>
                `;
            } else if (subType === 'PORTE_ETRANGE') {
                headerIcon = 'door_front'; headerColor = '#fbbf24'; headerTitle = 'Porte Étrange';

                if (!room.doorOutcomes) room.doorOutcomes = [];
                if (!room.lootTable) room.lootTable = [];

                let doorLootHtml = `<div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                    <label class="text-xs" style="color: #8b5cf6;">Loot possible si l'issue "Item" est choisie</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">`;
                if (room.lootTable.length === 0) {
                    doorLootHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun loot configuré.</div>`;
                } else {
                    room.lootTable.forEach((loot, lIndex) => {
                        const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                        if (eq) {
                            const slotInfo = getSlotInfo(eq);
                            const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                            const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                            doorLootHtml += `
                                <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                    <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;"><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span style="color:#94a3b8; font-size:0.8rem;">(${loot.probability}%)</span></span>
                                    <button class="text-error" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                </div>
                            `;
                        }
                    });
                }
                doorLootHtml += `</div>
                    <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                        <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${90 - rIndex}; margin: 0;">
                            <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted">category</span> Objet...</span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                `;
                pageState.allEquipments.forEach(eq => {
                    const slotInfo = getSlotInfo(eq);
                    const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#ef4444';
                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                    doorLootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
                });
                doorLootHtml += `
                            </div>
                            <input type="hidden" id="room_loot_select_${rIndex}" value="">
                        </div>
                        <input type="number" id="room_loot_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="0.1" min="0" max="100">
                        <button class="flex-center text-sm" type="button" onclick="addLootToRoom(${rIndex})" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                        </button>
                    </div></div>
                `;

                let outcomesHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                if (room.doorOutcomes.length === 0) {
                    outcomesHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucune issue configurée.</div>`;
                } else {
                    room.doorOutcomes.forEach((outcome, oIndex) => {
                        const outcomeConfig = {
                            'BOSS': { icon: 'skull', color: '#ef4444', text: 'Boss' },
                            'ITEM': { icon: 'redeem', color: '#8b5cf6', text: 'Item' },
                            'AUTEL': { icon: 'hand_bones', color: '#f97316', text: 'Autel Sacrificiel' },
                            'TRESOR': { icon: 'crown', color: '#eab308', text: 'Trésor' },
                            'PIEGE': { icon: 'bomb', color: '#f87171', text: 'Piège' },
                            'RIEN': { icon: 'door_front', color: '#94a3b8', text: 'Rien' }
                        };
                        const conf = outcomeConfig[outcome.type] || { icon: 'help', color: '#94a3b8', text: outcome.type };

                        let extraHtml = '';
                        if (outcome.type === 'BOSS') {
                            if (!outcome.monsters) outcome.monsters = [];
                            let monstersHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                            if (outcome.monsters.length === 0) {
                                monstersHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun boss configuré.</div>`;
                            } else {
                                outcome.monsters.forEach((mId, mIndex) => {
                                    const m = pageState.allMonsters.find(x => x.id === mId);
                                    if (m) {
                                        monstersHtml += `
                                            <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                                <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;"><span class="text-muted" style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                                <button class="text-error" type="button" onclick="removeMonsterFromBoss(${rIndex}, ${oIndex}, ${mIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                            </div>
                                        `;
                                    }
                                });
                            }
                            monstersHtml += `</div>
                                <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                                    <div class="custom-select-wrapper" id="room_door_boss_wrapper_${rIndex}_${oIndex}" style="flex: 1; z-index: ${150 - (rIndex * 10 + oIndex * 3)}; margin: 0;">
                                        <div class="custom-select-trigger" onclick="toggleDoorBossSelect(${rIndex}, ${oIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                            <span class="cs-label" id="room_door_boss_label_${rIndex}_${oIndex}"><span class="material-symbols-outlined cs-icon text-muted">pest_control</span> Sélectionner un boss...</span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="room_door_boss_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${pageState.allMonsters.map(m => `
                                                <div class="custom-option" onclick="selectDoorBossOption(${rIndex}, ${oIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})">
                                                    ${getSecretIconOnlyHtml(m)}<span class="material-symbols-outlined cs-icon text-error">pest_control</span> ${m.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${m.level || 1})</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                        <input type="hidden" id="room_door_boss_select_${rIndex}_${oIndex}" value="">
                                    </div>
                                    <button class="flex-center text-sm" type="button" onclick="addMonsterToBoss(${rIndex}, ${oIndex})" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                                    </button>
                                </div>
                            `;
                            if (!outcome.globalBuffs) outcome.globalBuffs = [];
                            let buffsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                            if (outcome.globalBuffs.length === 0) {
                                buffsHtml += `<div class="text-muted" style="font-size:0.8rem;">Aucun buff global configuré.</div>`;
                            } else {
                                outcome.globalBuffs.forEach((buff, bIndex) => {
                                    let buffLabel = '';
                                    if (buff.type === 'HP_PCT') buffLabel = `+${buff.value}% PV Max`;
                                    else if (buff.type === 'SHIELD_PCT') buffLabel = `Bouclier ${buff.value}% PV Max (${buff.duration} tours)`;
                                    else if (buff.type === 'ARMOR_FLAT') buffLabel = `+${buff.value} Armure (${buff.duration} tours)`;
                                    else if (buff.type === 'RESIST_FLAT') buffLabel = `+${buff.value} Résistance (${buff.duration} tours)`;
                                    else if (buff.type === 'BURN_ON_HIT') buffLabel = `Brûlure au touché : ${buff.value} dgts (${buff.duration} tours)`;
                                    else if (buff.type === 'POISON_ON_HIT') buffLabel = `Poison au touché : ${buff.value} dgts (${buff.duration} tours)`;

                                    buffsHtml += `
                                        <div class="flex-between" style="align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                            <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;">
                                                <span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">upgrade</span>
                                                ${buffLabel}
                                            </span>
                                            <button class="text-error" type="button" onclick="removeGlobalBuffFromBoss(${rIndex}, ${oIndex}, ${bIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                        </div>
                                    `;
                                });
                            }
                            buffsHtml += `</div>
                            <div class="relative" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
                                <div style="flex: 2; min-width: 120px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Type de buff</label>
                                    <select id="room_door_boss_buff_type_${rIndex}_${oIndex}" class="form-control text-xs" style="width: 100%;">
                                        <option value="HP_PCT">+ PV Max (%)</option>
                                        <option value="SHIELD_PCT">Bouclier (% PV)</option>
                                        <option value="ARMOR_FLAT">+ Armure</option>
                                        <option value="RESIST_FLAT">+ Résistance</option>
                                        <option value="BURN_ON_HIT">Brûlure au touché</option>
                                        <option value="POISON_ON_HIT">Poison au touché</option>
                                    </select>
                                </div>
                                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Stat (Valeur)</label>
                                    <input type="number" id="room_door_boss_buff_val_${rIndex}_${oIndex}" class="form-control" style="width: 100%;" value="10">
                                </div>
                                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label class="text-muted" style="font-size: 0.7rem; margin: 0; padding-left: 0.2rem;">Durée (Tours)</label>
                                    <input type="number" id="room_door_boss_buff_dur_${rIndex}_${oIndex}" class="form-control" style="width: 100%;" value="4">
                                </div>
                                <button class="flex-center text-sm" type="button" onclick="addGlobalBuffToBoss(${rIndex}, ${oIndex})" style="height: 38px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                                </button>
                            </div>`;

                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs text-error">Configuration du Boss</label>
                                    ${monstersHtml}
                                </div>
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs" style="color: #3b82f6;">Buffs Globaux du Boss</label>
                                    ${buffsHtml}
                                </div>
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs" style="color: #f59e0b;">Récompenses du Boss (Fin de combat)</label>
                                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                        <div style="flex: 1;">
                                            <label class="text-muted" style="font-size: 0.75rem;"><span class="material-symbols-outlined text-sm align-middle" style="color: #fbbf24;">monetization_on</span> Or bonus</label>
                                            <input type="number" id="room_door_boss_gold_${rIndex}_${oIndex}" class="form-control" value="${outcome.bossRewardGold || 0}" min="0" onchange="updateDoorBossField(${rIndex}, ${oIndex}, 'bossRewardGold', this.value)">
                                        </div>
                                        <div style="flex: 1;">
                                            <label class="text-muted" style="font-size: 0.75rem;"><span class="material-symbols-outlined text-sm align-middle" style="color: #8b5cf6;">blur_on</span> XP Spirit. bonus</label>
                                            <input type="number" id="room_door_boss_xp_${rIndex}_${oIndex}" class="form-control" value="${outcome.bossRewardSpiritualXp || 0}" min="0" onchange="updateDoorBossField(${rIndex}, ${oIndex}, 'bossRewardSpiritualXp', this.value)">
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (outcome.type === 'ITEM') {
                            extraHtml = doorLootHtml;
                        } else if (outcome.type === 'AUTEL') {
                            if (!outcome.altarSpirituality) outcome.altarSpirituality = 'TENEBRES';
                            if (!outcome.altarRewardType) outcome.altarRewardType = 'GOLD';
                            if (outcome.altarRewardValue === undefined) outcome.altarRewardValue = 100;

                            let rewardValueHtml = '';
                            if (outcome.altarRewardType === 'ITEM') {
                                const selEq = pageState.allEquipments.find(e => e.id == outcome.altarRewardValue) || pageState.allEquipments[0];

                                const getEqHtml = (eq) => {
                                    if (!eq) return 'Choisir un objet';
                                    const slotInfo = getSlotInfo(eq);
                                    const rarityColor = RARITY_COLORS[typeof eq.rarity === 'object' ? eq.rarity.name : eq.rarity] || '#94a3b8';
                                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                    return `<span style="display:flex; align-items:center; gap:0.4rem;"><span class="material-symbols-outlined${extraClass}" style="font-size:1.1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span></span>`;
                                };

                                rewardValueHtml = `
                                    <div class="custom-select-wrapper" id="altar_rewardval_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger" onclick="toggleAltarRewardValSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                            <span class="cs-label" id="altar_rewardval_label_${rIndex}_${oIndex}" style="width: 100%; margin-right: 0.5rem;">
                                                ${getEqHtml(selEq)}
                                            </span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_rewardval_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${pageState.allEquipments.map(eq => `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardValue', ${eq.id})">
                                                    ${getEqHtml(eq)}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            } else {
                                rewardValueHtml = `<input type="number" class="form-control" value="${outcome.altarRewardValue}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardValue', this.value)" style="padding: 0.5rem; font-size: 0.85rem; margin-top: 0.2rem;" min="1">`;
                            }

                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs" style="color: #f97316;">Configuration du Sacrifice</label>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Spiritualité acceptée</label>
                                            <div class="custom-select-wrapper" id="altar_spirituality_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${152 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger" onclick="toggleAltarSpiritualitySelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                                    <span class="cs-label" id="altar_spirituality_label_${rIndex}_${oIndex}">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: ${getSpiritualiteColor(outcome.altarSpirituality || 'TENEBRES')}; font-size: 1.1rem; margin-right: 4px;">${getSpiritualiteIcon(outcome.altarSpirituality || 'TENEBRES')}</span> ${outcome.altarSpirituality || 'Ténèbres'}
                                                    </span>
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                                <div class="custom-select-options" id="altar_spirituality_options_${rIndex}_${oIndex}">
                                                    ${(window.ALL_SPIRITUALITIES || ['TENEBRES', 'ESPRIT', 'KARMA', 'VIOLENCE', 'TRAHISON', 'SURETE', 'RAISON', 'DESTRUCTION', 'CREATION', 'CONVICTION', 'CONSOLIDATION']).map(sp => `
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarSpirituality', '${sp}')">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: ${getSpiritualiteColor(sp)}; font-size: 1.1rem; margin-right: 4px;">${getSpiritualiteIcon(sp)}</span> ${sp}
                                                    </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Type de récompense</label>
                                            <div class="custom-select-wrapper" id="altar_reward_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${151 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger" onclick="toggleAltarRewardSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                                    <span class="cs-label" id="altar_reward_label_${rIndex}_${oIndex}">
                                                        ${outcome.altarRewardType === 'XP' ? '<span class="material-symbols-outlined cs-icon align-middle" style="color: #38bdf8; font-size: 1.1rem; margin-right: 4px;">auto_awesome</span> XP Spiritualité' : outcome.altarRewardType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon align-middle" style="color: #8b5cf6; font-size: 1.1rem; margin-right: 4px;">redeem</span> Équipement' : '<span class="material-symbols-outlined cs-icon align-middle" style="color: #eab308; font-size: 1.1rem; margin-right: 4px;">monetization_on</span> Or (Gold)'}
                                                    </span>
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                                <div class="custom-select-options" id="altar_reward_options_${rIndex}_${oIndex}">
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'GOLD')">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: #eab308; font-size: 1.1rem; margin-right: 4px;">monetization_on</span> Or (Gold)
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'XP')">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: #38bdf8; font-size: 1.1rem; margin-right: 4px;">auto_awesome</span> XP Spiritualité
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'ITEM')">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: #8b5cf6; font-size: 1.1rem; margin-right: 4px;">redeem</span> Équipement
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="grid-column: span 2;">
                                            <label class="text-muted" style="font-size: 0.75rem;">Valeur de la récompense</label>
                                            ${rewardValueHtml}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (outcome.type === 'TRESOR') {
                            if (!outcome.treasureAnomalieId) outcome.treasureAnomalieId = pageState.allAnomalies.length > 0 ? pageState.allAnomalies[0].id : '';
                            const selAnomalie = pageState.allAnomalies.find(a => a.id == outcome.treasureAnomalieId) || pageState.allAnomalies[0];
                            let selAnColor = getSpiritualiteColor(selAnomalie?.spiritualite);
                            let selCatIcon = 'star';
                            if (selAnomalie) {
                                selCatIcon = selAnomalie.category ? (getCategoryIcon(selAnomalie.category)) : 'star';
                            }
                            const selAnHtml = selAnomalie ? `<span class="material-symbols-outlined cs-icon align-middle" style="color: ${selAnColor}; font-size: 1.1rem; margin-right: 4px;">${selCatIcon}</span>${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>` : 'Aucune anomalie disponible';

                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs" style="color: #eab308;">Anomalie (Trésor)</label>
                                    <div class="custom-select-wrapper" id="altar_treasure_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger" onclick="toggleAltarTreasureSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                            <span class="cs-label" id="altar_treasure_label_${rIndex}_${oIndex}">
                                                ${selAnHtml}
                                            </span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_treasure_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${pageState.allAnomalies.map(an => {
                                let anColor = getSpiritualiteColor(an.spiritualite);
                                return `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'treasureAnomalieId', ${an.id})">
                                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: ${anColor}; font-size: 1.1rem; margin-right: 4px;">${an.category ? (getCategoryIcon(an.category)) : 'star'}</span>${an.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${an.level || 1})</span>
                                                </div>
                                                `;
                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (outcome.type === 'PIEGE') {
                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label class="text-xs" style="color: #f87171;">Configuration du Piège</label>
                                    
                                    <div style="margin-top: 0.5rem;">
                                        <label class="text-muted" style="font-size: 0.75rem;">Texte du piège</label>
                                        <input type="text" class="form-control" value="${outcome.trapText || ''}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapText', this.value)">
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;">
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Perte PV (% max)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageHpPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Perte Mana (% max)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageManaPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Perte PV (Fixe)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageHpFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                        <div>
                                            <label class="text-muted" style="font-size: 0.75rem;">Perte Mana (Fixe)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageManaFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                    </div>
                                    
                                    <div class="flex-center" style="margin-top: 1rem; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                                            <span class="flex-center text-sm font-medium" style="color: #f8fafc; gap: 0.4rem;">
                                                <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 1.1rem;">auto_fix</span> Option Corde d'évitement
                                            </span>
                                            <span class="text-muted" style="font-size: 0.75rem;">Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                                        </div>
                                        <label class="flex-shrink-0 relative" style="display: block; width: 40px; height: 24px; margin: 0;">
                                            <input type="checkbox" style="opacity: 0; width: 0; height: 0;" ${outcome.trapHasRopeOption ? 'checked' : ''} onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
                                            <span class="absolute" style="cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${outcome.trapHasRopeOption ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}; transition: .3s; border-radius: 24px;">
                                                <span class="absolute" style="content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; transform: ${outcome.trapHasRopeOption ? 'translateX(16px)' : 'translateX(0)'}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            `;
                        }

                        outcomesHtml += `
                            <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.3); padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                                <div class="flex-between" style="align-items: center;">
                                    <span class="flex-center" style="font-size: 0.85rem; color: #f8fafc; gap: 0.4rem;">
                                        <span class="material-symbols-outlined" style="color: ${conf.color}; font-size: 1.1rem;">${conf.icon}</span> 
                                        ${conf.text} 
                                        <span style="color:#fbbf24; font-size:0.8rem; margin-left: 0.2rem;">(${outcome.probability}%)</span>
                                    </span>
                                    <button class="text-error" type="button" onclick="removeDoorOutcome(${rIndex}, ${oIndex})" style="background: none; border: none; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                </div>
                                ${extraHtml}
                            </div>
                        `;
                    });
                }
                outcomesHtml += `</div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch;">
                        <div class="custom-select-wrapper" id="room_door_outcome_wrapper_${rIndex}" style="flex: 2; z-index: ${50 - rIndex}; margin: 0;">
                            <div class="custom-select-trigger" onclick="toggleDoorOutcomeSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_door_outcome_label_${rIndex}">
                                    <span class="material-symbols-outlined cs-icon text-error align-middle" style="font-size: 1.1rem; margin-right: 4px;">skull</span> Boss
                                </span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_door_outcome_options_${rIndex}">
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'BOSS', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #ef4444; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>skull</span> Boss')">
                                    <span class="material-symbols-outlined cs-icon text-error align-middle" style="font-size: 1.1rem; margin-right: 4px;">skull</span> Boss
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'ITEM', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>redeem</span> Item')">
                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: #8b5cf6; font-size: 1.1rem; margin-right: 4px;">redeem</span> Item
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'AUTEL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f97316; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>hand_bones</span> Autel Sacrificiel')">
                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: #f97316; font-size: 1.1rem; margin-right: 4px;">hand_bones</span> Autel Sacrificiel
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'TRESOR', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>crown</span> Trésor')">
                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: #eab308; font-size: 1.1rem; margin-right: 4px;">crown</span> Trésor
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'PIEGE', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f87171; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>bomb</span> Piège')">
                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: #f87171; font-size: 1.1rem; margin-right: 4px;">bomb</span> Piège
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'RIEN', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>door_front</span> Rien')">
                                    <span class="material-symbols-outlined cs-icon text-muted align-middle" style="font-size: 1.1rem; margin-right: 4px;">door_front</span> Rien
                                </div>
                            </div>
                            <input type="hidden" id="room_door_outcome_${rIndex}" value="BOSS">
                        </div>
                        <input type="number" id="room_door_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="1" min="0" max="100">
                        <button class="flex-center text-sm" type="button" onclick="addDoorOutcome(${rIndex})" style="background: linear-gradient(135deg, #fbbf24, #d97706); color: white; border: none; padding: 0 1.2rem; font-weight: 600; border-radius: 8px; cursor: pointer; gap: 0.3rem;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                        </button>
                    </div>
                `;

                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label class="text-xs text-muted">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${outcomesHtml}
                `;
            }
        }

        div.innerHTML = `
            <button class="text-error absolute" type="button" onclick="removeRoom(${rIndex})" style="top: 0.5rem; right: 0.5rem; background: none; border: none; cursor: pointer; padding: 0.2rem;"><span class="material-symbols-outlined">delete</span></button>
            <div class="flex-center" style="font-family: 'Outfit'; font-weight: 600; color: ${headerColor}; gap: 0.5rem;">
                <span class="material-symbols-outlined" style="font-size: 1.2rem;">${headerIcon}</span>
                Étape ${rIndex + 1} : ${headerTitle}
            </div>
            ${contentHtml}
        `;

        container.appendChild(div);
    });

    window.scrollTo(0, currentScroll);
}

async function loadMonsters() {
    try {
        const res = await globalFetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            pageState.allMonsters = sortMonstersBySecret(monsters);
            renderMonstersList();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadAnomalies() {
    try {
        const res = await globalFetch('/api/anomalies/all');
        if (res.ok) {
            let data = await res.json();
            const uniqueNames = new Set();
            pageState.allAnomalies = data.filter(a => {
                if (uniqueNames.has(a.name)) return false;
                uniqueNames.add(a.name);
                return true;
            }).sort((a, b) => {
                const spiriA = a.spiritualite || 'ZZZ';
                const spiriB = b.spiritualite || 'ZZZ';
                if (spiriA !== spiriB) return spiriA.localeCompare(spiriB);
                const lvlA = a.level || 1;
                const lvlB = b.level || 1;
                if (lvlA !== lvlB) return lvlA - lvlB;
                return a.name.localeCompare(b.name);
            });
            renderRooms();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadEquipments() {
    try {
        const res1 = await globalFetch('/api/shop/templates');
        const res2 = await globalFetch('/api/equipments/all');

        let templates = [];
        let instances = [];

        if (res1.ok) templates = await res1.json();
        if (res2.ok) instances = await res2.json();

        // Merge and deduplicate by name, preferring templates
        let merged = [...templates, ...instances];
        let map = new Map();
        merged.forEach(eq => {
            if (!map.has(eq.name)) {
                map.set(eq.name, eq);
            }
        });

        // Sort by rarity, then name
        const rarityOrder = { 'MAUDIT': 1, 'RELIQUE': 2, 'EPIQUE': 3, 'LEGENDAIRE': 4, 'MYTHIQUE': 5, 'RARE': 6, 'INHABITUEL': 7, 'COMMUN': 8 };
        pageState.allEquipments = Array.from(map.values()).sort((a, b) => {
            const rNameA = typeof a.rarity === 'object' ? a.rarity?.name : a.rarity;
            const rNameB = typeof b.rarity === 'object' ? b.rarity?.name : b.rarity;
            const rA = rarityOrder[rNameA] ?? 100;
            const rB = rarityOrder[rNameB] ?? 100;
            if (rA !== rB) return rA - rB;

            const tA = typeof (a.slot?.name || a.slot) === 'object' ? a.slot?.name : a.slot;
            const tB = typeof (b.slot?.name || b.slot) === 'object' ? b.slot?.name : b.slot;
            if (tA !== tB) return (tA || '').localeCompare(tB || '');

            return a.name.localeCompare(b.name);
        });
    } catch (e) {
        console.error(e);
    }
}

window.toggleFilterLevelSelect = function () {
    document.getElementById('mLevelFilterWrapper').classList.toggle('open');
};

window.selectFilterLevelOption = function (val, label, color, icon) {
    document.getElementById('monsterLevelFilter').value = val;
    document.getElementById('mLevelFilterTrigger').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:center;">${label}</span>`;
    document.getElementById('mLevelFilterWrapper').classList.remove('open');
    window.renderMonstersList();
};

window.toggleSortSelect = function () {
    document.getElementById('mSortWrapper').classList.toggle('open');
};

window.selectSortOption = function (val, label, icon, color) {
    document.getElementById('monsterSort').value = val;
    let extraStyle = '';
    if (val === 'name_desc') extraStyle = 'transform: scaleY(-1);';
    document.getElementById('mSortTrigger').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem; ${extraStyle}">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined text-muted" style="font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
    document.getElementById('mSortWrapper').classList.remove('open');
    window.renderMonstersList();
};

window.renderMonstersList = function () {
    const list = document.getElementById('monstersList');
    if (!list) return;

    let filtered = [...pageState.allMonsters];
    const search = document.getElementById('monsterSearch');
    if (search && search.value) {
        const q = search.value.toLowerCase();
        filtered = filtered.filter(m => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
    }

    const searchLvl = document.getElementById('monsterLevelFilter');
    if (searchLvl && searchLvl.value) {
        const lvl = parseInt(searchLvl.value);
        filtered = filtered.filter(m => (m.level || 1) === lvl);
    }

    const sort = document.getElementById('monsterSort');
    if (sort) {
        switch (sort.value) {
            case 'name_asc': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name_desc': filtered.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'lvl_desc': filtered.sort((a, b) => (b.level || 1) - (a.level || 1)); break;
            case 'lvl_asc': filtered.sort((a, b) => (a.level || 1) - (b.level || 1)); break;
            case 'secret': sortMonstersBySecret(filtered); break;
        }
    }

    list.innerHTML = '';
    filtered.forEach(m => {
        let secretBadgeHtml = getSecretBadgeHtml(m);

        let mutationsHtml = '';
        if (m.mutations && m.mutations.length > 0) {
            mutationsHtml = `<div class="flex-shrink-0" style="display: flex; flex-direction: column; gap: 0.5rem; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 0.8rem; margin-left: 0.8rem; justify-content: center;">`;
            m.mutations.forEach(mut => {
                mutationsHtml += `<div class="flex-center" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="width: 32px; height: 32px; border-radius: 6px; background: rgba(255,255,255,0.05); justify-content: center; border: 1px solid ${mut.color || '#e879f9'}; cursor: help;">
                    <template class="tooltip-data">
                        <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${mut.color || '#e879f9'}; border-bottom: 1px solid ${mut.color || '#e879f9'}; padding-bottom: 4px;">${mut.nom} (Lvl ${mut.level || 1})</div>
                        <div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 250px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${mut.description}</div>
                    </template>
                    <span class="material-symbols-outlined" style="font-size: 1.2rem; color: ${mut.color || '#e879f9'};">${mut.icon || 'pets'}</span>
                </div>`;
            });
            mutationsHtml += `</div>`;
        }

        let mTypeObj = typeof m.monsterType === 'object' ? m.monsterType : null;
        let mTypeName = mTypeObj ? mTypeObj.name : m.monsterType;
        let mTypeLabel = mTypeObj && mTypeObj.label ? mTypeObj.label : mTypeName;
        let mTypeDesc = mTypeObj && mTypeObj.description ? mTypeObj.description : '';
        let mTypeIcon = mTypeObj && mTypeObj.icon ? mTypeObj.icon : 'check_box_outline_blank';

        let mBehaviorObj = typeof m.behavior === 'object' ? m.behavior : null;
        let mBehaviorName = mBehaviorObj ? mBehaviorObj.name : m.behavior;
        let mBehaviorLabel = mBehaviorObj && mBehaviorObj.label ? mBehaviorObj.label : mBehaviorName;
        let mBehaviorDesc = mBehaviorObj && mBehaviorObj.description ? mBehaviorObj.description : '';
        let mBehaviorIcon = mBehaviorObj && mBehaviorObj.icon ? mBehaviorObj.icon : 'check_box_outline_blank';

        list.innerHTML += `
            <div class="monster-card">
                <div class="absolute" style="top: -0.8rem; left: -0.8rem; display: flex; gap: 0.4rem; z-index: 10;">
                    ${secretBadgeHtml}
                    <div class="monster-level-badge" style="position: relative; top: 0; left: 0; margin: 0;">Lvl ${m.level || 1}</div>
                </div>
                
                <div class="flex-between" style="align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div class="monster-card-title" style="margin-bottom: 0;">${m.name}</div>
                    <div class="flex-shrink-0" style="display: flex; gap: 0.2rem;">
                        <button class="delete-btn" style="position: static; padding: 0.2rem; color: #3b82f6;" onclick="editMonster(${m.id})" title="Modifier">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="delete-btn text-error" onclick="deleteMonster(${m.id})" title="Supprimer" style="position: static; padding: 0.2rem;">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: stretch;">
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                        <div class="text-xs text-muted" style="margin-bottom: 0.5rem;">${m.description || ''}</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                            ${mTypeName && mTypeName !== 'NORMAL' ? `<span class="text-error" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="cursor: help; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:#ef4444; border-bottom: 1px solid #ef4444; padding-bottom: 4px;">${mTypeLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${mTypeDesc}</div></template><span class="material-symbols-outlined text-sm">${mTypeIcon}</span>${mTypeLabel}</span>` : ''}
                            ${mBehaviorName && mBehaviorName !== 'NORMAL' ? `<span onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="cursor: help; font-size: 0.75rem; background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:#8b5cf6; border-bottom: 1px solid #8b5cf6; padding-bottom: 4px;">${mBehaviorLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${mBehaviorDesc}</div></template><span class="material-symbols-outlined text-sm">${mBehaviorIcon}</span>${mBehaviorLabel}</span>` : ''}
                        </div>
                        <div class="monster-card-stats">
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #ec4899;">favorite</span> PV: ${m.healthMax}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #38bdf8;">water_drop</span> Mana: ${m.manaMax || 0}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f472b6;">healing</span> R. PV: ${m.regenHp || 0}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #7dd3fc;">opacity</span> R. MP: ${m.regenMana || 0}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;">bolt</span> Vit: ${m.speed}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined text-error" style="font-size: 1rem;">gps_fixed</span> Crit: ${m.crit || 0}%</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f43f5e;">fitness_center</span> For: ${m.strength}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #a855f7;">auto_awesome</span> Pui: ${m.power}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">shield</span> Arm: ${m.armor}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined text-success" style="font-size: 1rem;">shield</span> Rés: ${m.resistance}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;">monetization_on</span> Or: ${m.rewardGold}</span>
                            <span class="flex-center" style="gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #fcd34d;">stars</span> XP: ${m.rewardExp}</span>
                        </div>
                    </div>
                    ${mutationsHtml}
                </div>
            </div>
        `;
    });
};

async function editMonster(id) {
    try {
        const res = await globalFetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            const m = monsters.find(x => x.id === id);
            if (!m) return;

            pageState.editingMonsterId = id;
            document.getElementById('mName').value = m.name;
            document.getElementById('mDesc').value = m.description || '';
            const lvl = m.level || 1;
            document.getElementById('mLevel').value = lvl;
            const lvlTrigger = document.getElementById('mLevelTrigger');
            let color = '#94a3b8';
            if (lvl === 2) color = '#10b981';
            if (lvl === 3) color = '#3b82f6';
            if (lvl === 4) color = '#a855f7';
            if (lvl === 5) color = '#f59e0b';
            if (lvlTrigger) lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">${lvl}</span>`;

            document.getElementById('mHp').value = m.healthMax;
            document.getElementById('mRegenHp').value = m.regenHp || 0;
            document.getElementById('mStartHpPct').value = m.startHpPct !== undefined && m.startHpPct !== 0 ? m.startHpPct : 100;
            document.getElementById('mMana').value = m.manaMax || 0;
            document.getElementById('mRegenMana').value = m.regenMana || 0;
            document.getElementById('mStartManaPct').value = m.startManaPct !== undefined && m.startManaPct !== 0 ? m.startManaPct : 100;
            document.getElementById('mSpeed').value = m.speed;
            document.getElementById('mCrit').value = m.crit || 0;
            document.getElementById('mStrength').value = m.strength;
            document.getElementById('mPower').value = m.power;
            document.getElementById('mArmor').value = m.armor;
            document.getElementById('mResist').value = m.resistance;
            document.getElementById('mGold').value = m.rewardGold;
            document.getElementById('mXp').value = m.rewardExp;
            document.getElementById('mNativeSecret').value = m.nativeSecret || '';
            pageState.selectedMutationIds = m.mutations ? m.mutations.map(mu => mu.id) : [];
            renderMutationsSelector();

            const mtObj = m.monsterType || 'NORMAL';
            const mt = typeof mtObj === 'object' ? mtObj.name : mtObj;
            const mbObj = m.behavior || 'NORMAL';
            const mb = typeof mbObj === 'object' ? mbObj.name : mbObj;

            const tMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'DEMON': { l: 'Démon', i: 'rib_cage', c: '#ef4444' },
                'REPTILE': { l: 'Reptile', i: 'grass', c: '#10b981' },
                'MORT_VIVANT': { l: 'Mort-vivant', i: 'skull', c: '#94a3b8' },
                'HYBRIDE': { l: 'Hybride', i: 'network_node', c: '#3b82f6' },
                'VAMPIRE': { l: 'Vampire', i: 'bloodtype', c: '#e11d48' },
                'ECTOPLASME': { l: 'Ectoplasme', i: 'candle', c: '#a855f7' }
            };
            const bMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'PREDATEUR': { l: 'Prédateur', i: 'track_changes', c: '#f59e0b' },
                'CORRUPTEUR': { l: 'Corrupteur', i: 'allergy', c: '#8b5cf6' },
                'LEADER': { l: 'Leader', i: 'crown', c: '#fcd34d' },
                'ASSASSIN': { l: 'Assassin', i: 'gps_fixed', c: '#ef4444' },
                'BRUTAL': { l: 'Brutal', i: 'shield', c: '#9ca3af' },
                'TRANSCENDANT': { l: 'Transcendant', i: 'grid_view', c: '#fbbf24' }
            };

            const tData = tMap[mt] || tMap['NORMAL'];
            const bData = bMap[mb] || bMap['NORMAL'];

            window.selectMonsterType(mt, tData.l, tData.i, tData.c);
            window.selectMonsterBehavior(mb, bData.l, bData.i, bData.c);

            document.getElementById('btnSubmitMonster').textContent = "Modifier le monstre";
            document.getElementById('btnCancelMonster').style.display = 'block';
            document.getElementById('monsterFormPanel').classList.add('editing-glow');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
    }
}

window.cancelMonsterEdit = function () {
    pageState.editingMonsterId = null;
    document.getElementById('monsterForm').reset();
    document.getElementById('mLevel').value = 1;
    document.getElementById('mNativeSecret').value = '';
    const lvlTrigger = document.getElementById('mLevelTrigger');
    if (lvlTrigger) {
        lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" style="font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">1</span>`;
    }
    const secretTrigger = document.getElementById('mNativeSecretWrapper')?.querySelector('.cs-label');
    if (secretTrigger) {
        secretTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #64748b; font-size: 1.1rem;">close</span>Aucun (Optionnel)`;
    }
    pageState.selectedMutationIds = [];
    renderMutationsSelector();
    document.getElementById('btnSubmitMonster').textContent = "Créer le monstre";
    document.getElementById('btnCancelMonster').style.display = 'none';
    document.getElementById('monsterFormPanel').classList.remove('editing-glow');
    window.selectMonsterType('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
    window.selectMonsterBehavior('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
};

async function deleteMonster(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce monstre ?')) return;
    try {
        const res = await globalFetch('/api/admin/pve/monsters/' + id, { method: 'DELETE' });
        if (res.ok) {
            loadMonsters();
            loadDungeons();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadDungeons() {
    try {
        const res = await globalFetch('/api/admin/pve/dungeons');
        if (res.ok) {
            pageState.allDungeons = await res.json();
            window.renderDungeonsList();
        }
    } catch (e) {
        console.error(e);
    }
}

window.renderDungeonsList = function () {
    const list = document.getElementById('dungeonsList');
    if (!list) return;

    list.innerHTML = '';
    const filterSelect = document.getElementById('dungeonSecretFilter');
    const filterVal = filterSelect ? filterSelect.value : '';

    let filtered = pageState.allDungeons;
    if (filterVal) {
        if (filterVal === 'Aucun') {
            filtered = filtered.filter(d => !d.requiredSecret);
        } else {
            filtered = filtered.filter(d => d.requiredSecret === filterVal);
        }
    }

    const lvlSelect = document.getElementById('dungeonLevelFilter');
    const lvlVal = lvlSelect ? lvlSelect.value : '';

    if (lvlVal) {
        const lvl = parseInt(lvlVal);
        filtered = filtered.filter(d => (d.recommendedLevel || 1) === lvl);
    }

    filtered.forEach((d, index) => {
        let totalSalles = d.salles ? d.salles.length : 0;
        let combats = 0, bosses = 0, treasures = 0, alterations = 0, rencontres = 0, pieges = 0, portes = 0, totalMobs = 0, totalBossMobs = 0;
        if (d.salles) {
            d.salles.forEach(s => {
                if (s.type === 'COMBAT') {
                    combats++;
                    totalMobs += (s.monsters ? s.monsters.length : 0);
                } else if (s.type === 'BOSS') {
                    bosses++;
                    totalBossMobs += (s.monsters ? s.monsters.length : 0);
                }
                else if (s.type === 'TREASURE') { treasures++; }
                else if (s.type === 'EVENT') {
                    if (s.eventSubType === 'RENCONTRE') rencontres++;
                    else if (s.eventSubType === 'PIEGE') pieges++;
                    else if (s.eventSubType === 'PORTE_ETRANGE') portes++;
                    else alterations++;
                }
            });
        }

        let eventDetails = '';
        if (alterations > 0) eventDetails += `<span style="color: #8b5cf6; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined text-sm">blur_on</span>${alterations}</span>`;
        if (rencontres > 0) eventDetails += `<span class="text-success" style="display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined text-sm">storefront</span>${rencontres}</span>`;
        if (pieges > 0) eventDetails += `<span style="color: #f87171; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined text-sm">warning</span>${pieges}</span>`;
        if (portes > 0) eventDetails += `<span style="color: #fbbf24; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined text-sm">door_front</span>${portes}</span>`;

        let secretMeta = { icon: "key", color: "#f59e0b" };
        if (d.requiredSecret) {
            
            secretMeta = window.DEFAULT_SECRETS_META.find(s => s.name === d.requiredSecret) || secretMeta;
        }

        list.innerHTML += `
            <div class="monster-card">
                <div class="absolute" style="top: -0.8rem; left: -0.8rem; display: flex; gap: 0.4rem; z-index: 10;">
                    ${d.requiredSecret ? `<div class="flex-center" title="${d.requiredSecret}" style="background: rgba(15, 23, 42, 0.9); color: ${secretMeta.color}; padding: 0.2rem 0.4rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); border: 1px solid ${secretMeta.color}60; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 1.1rem;">${secretMeta.icon}</span></div>` : ''}
                    <div class="monster-level-badge" style="position: relative; top: 0; left: 0; margin: 0;">Lvl ${d.recommendedLevel || 1}</div>
                </div>
                <div class="flex-between" style="align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div class="monster-card-title" style="margin-bottom: 0;">${d.name}</div>
                    <div class="flex-shrink-0" style="display: flex; gap: 0.2rem;">
                        ${index > 0 ? `<button class="delete-btn text-success" onclick="moveDungeonOrder(${d.id}, -1)" title="Monter" style="position: static; padding: 0.2rem;">
                            <span class="material-symbols-outlined">arrow_upward</span>
                        </button>` : ''}
                        ${index < filtered.length - 1 ? `<button class="delete-btn" style="position: static; padding: 0.2rem; color: #f59e0b;" onclick="moveDungeonOrder(${d.id}, 1)" title="Descendre">
                            <span class="material-symbols-outlined">arrow_downward</span>
                        </button>` : ''}
                        <button class="delete-btn" style="position: static; padding: 0.2rem; color: #3b82f6;" onclick="editDungeon(${d.id})" title="Modifier">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="delete-btn text-error" onclick="deleteDungeon(${d.id})" title="Supprimer" style="position: static; padding: 0.2rem;">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                <div class="text-xs text-muted" style="margin-bottom: 0.5rem;">${d.description || ''}</div>
                <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: grid; gap: 0.4rem;">
                    ${d.requiredSecret ? `<div class="flex-center text-muted" style="gap: 0.4rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${secretMeta.color};">${secretMeta.icon}</span> <span><strong style="color:${secretMeta.color};">${d.requiredSecret}</strong> (Lvl ${d.requiredSecretLevel || 1})</span></div>` : ''}
                    <div><span style="font-weight: 600;">Salles totales :</span> ${totalSalles}</div>
                    ${combats > 0 ? `<div class="flex-center text-error" style="margin-left: 0.5rem; gap: 0.3rem;">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                    </div>` : ''}
                    ${bosses > 0 ? `<div class="flex-center" style="color: #dc2626; margin-left: 0.5rem; gap: 0.3rem;">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                    </div>` : ''}
                    ${treasures > 0 ? `<div class="flex-center" style="color: #f59e0b; margin-left: 0.5rem; gap: 0.3rem;">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Trésors : ${treasures}
                    </div>` : ''}
                    ${eventDetails ? `<div class="flex-center" style="margin-left: 0.5rem; gap: 0.3rem; flex-wrap: wrap;">Événements : ${eventDetails}</div>` : ''}
                </div>
            </div>
        `;
    });
}

async function moveDungeonOrder(id, direction) {
    const index = pageState.allDungeons.findIndex(d => d.id === id);
    if (index === -1) return;
    if (index + direction < 0 || index + direction >= pageState.allDungeons.length) return;

    // Swap in array
    const temp = pageState.allDungeons[index];
    pageState.allDungeons[index] = pageState.allDungeons[index + direction];
    pageState.allDungeons[index + direction] = temp;

    const orderedIds = pageState.allDungeons.map(d => d.id);

    try {
        const res = await globalFetch('/api/admin/pve/dungeons/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderedIds)
        });

        if (res.ok) {
            renderDungeonsList();
        } else {
            showNotif("Erreur lors du changement d'ordre.", true);
        }
    } catch (e) {
        console.error(e);
        showNotif("Erreur réseau.", true);
    }
}

async function editDungeon(id) {
    try {
        const res = await globalFetch('/api/admin/pve/dungeons');
        if (res.ok) {
            const dungeons = await res.json();
            const d = dungeons.find(x => x.id === id);
            if (!d) return;

            pageState.editingDungeonId = id;
            document.getElementById('dName').value = d.name;
            document.getElementById('dDesc').value = d.description || '';
            document.getElementById('dLevel').value = d.recommendedLevel;
            document.getElementById('dMaxHeroes').value = d.maxHeroes || 1;
            document.getElementById('dUnlockCost').value = d.unlockCostGold || 0;
            document.getElementById('dEntryCost').value = d.entryCostGold || 0;
            document.getElementById('dRequiredSecret').value = d.requiredSecret || '';
            document.getElementById('dRequiredSecretLevel').value = d.requiredSecretLevel || 1;

            pageState.selectedRooms = d.salles.map(s => {
                const room = { type: s.type };
                if (s.type === 'COMBAT') {
                    room.monsters = s.monsters.map(m => m.id);
                } else if (s.type === 'BOSS') {
                    room.monsters = s.monsters.map(m => m.id);
                    if (s.globalBuffs) {
                        try {
                            room.globalBuffs = typeof s.globalBuffs === 'string' ? JSON.parse(s.globalBuffs) : s.globalBuffs;
                        } catch (e) {
                            room.globalBuffs = [];
                        }
                    } else {
                        room.globalBuffs = [];
                    }
                    room.bossRewardSpiritualXp = s.bossRewardSpiritualXp || 0;
                    room.bossRewardGold = s.bossRewardGold || 0;
                } else if (s.type === 'TREASURE') {
                    room.treasureGold = s.treasureGold;
                    room.treasureExp = s.treasureExp;
                    if (s.lootTable) {
                        room.lootTable = s.lootTable.map(l => ({
                            equipmentId: l.equipment ? l.equipment.id : l.equipmentId,
                            probability: l.probability,
                            priceGold: l.priceGold,
                            priceSpecialItemName: l.priceSpecialItemName,
                            specialItemName: l.specialItemName
                        }));
                    } else {
                        room.lootTable = [];
                    }
                } else if (s.type === 'EVENT') {
                    room.eventSubType = s.eventSubType || 'ALTERATION';
                    room.eventText = s.eventText;
                    room.eventEffectAmount = s.eventEffectAmount;
                    room.alterationType = s.alterationType || 'VIE_XP';
                    room.alterationHpAmount = s.alterationHpAmount || 0;
                    room.alterationExpAmount = s.alterationExpAmount || 0;
                    room.alterationRewardType = s.alterationRewardType || 'SPIRITUAL_XP';
                    room.alterationSpiritualXpReward = s.alterationSpiritualXpReward || 0;
                    room.alterationSpecialItemReward = s.alterationSpecialItemReward || null;
                    room.alterationRequiredItem = s.alterationRequiredItem || null;
                    room.trapType = s.trapType;
                    room.trapAmount = s.trapAmount || 0;
                    room.trapHasRopeOption = s.trapHasRopeOption || false;
                    room.trapDamageHpPct = s.trapDamageHpPct || 0;
                    room.trapDamageManaPct = s.trapDamageManaPct || 0;
                    room.trapDamageHpFixed = s.trapDamageHpFixed || 0;
                    room.trapDamageManaFixed = s.trapDamageManaFixed || 0;

                    if (s.doorOutcomes) {
                        try {
                            room.doorOutcomes = typeof s.doorOutcomes === 'string' ? JSON.parse(s.doorOutcomes) : s.doorOutcomes;
                        } catch (e) {
                            room.doorOutcomes = [];
                        }
                    } else {
                        room.doorOutcomes = [];
                    }

                    if (s.lootTable) {
                        room.lootTable = s.lootTable.map(l => ({
                            equipmentId: l.equipment ? l.equipment.id : l.equipmentId,
                            probability: l.probability,
                            priceGold: l.priceGold,
                            priceSpecialItemName: l.priceSpecialItemName,
                            specialItemName: l.specialItemName
                        }));
                    } else {
                        room.lootTable = [];
                    }
                }
                return room;
            });
            renderRooms();

            renderRooms();

            document.getElementById('btnSubmitDungeon').textContent = "Modifier le donjon";
            document.getElementById('btnCancelDungeon').style.display = 'block';
            document.getElementById('dungeonFormPanel').classList.add('editing-glow');
            document.getElementById('dungeonFormPanel').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
    }
}

window.cancelDungeonEdit = function () {
    pageState.editingDungeonId = null;
    document.getElementById('dungeonForm').reset();
    pageState.selectedRooms = [];
    renderRooms();
    document.getElementById('btnSubmitDungeon').textContent = "Créer le donjon";
    document.getElementById('btnCancelDungeon').style.display = 'none';
    document.getElementById('dungeonFormPanel').classList.remove('editing-glow');
};

async function deleteDungeon(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce donjon ?')) return;
    try {
        const res = await globalFetch('/api/admin/pve/dungeons/' + id, { method: 'DELETE' });
        if (res.ok) {
            loadDungeons();
        }
    } catch (e) {
        console.error(e);
    }
}

window.toggleLootSelect = function (rIndex) {
    const wrapper = document.getElementById('room_loot_select_wrapper_' + rIndex);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectLootOption = function (rIndex, eqId, eqName, icon, iconColor, rarityColor, extraClass) {
    document.getElementById('room_loot_select_' + rIndex).value = eqId;
    const cls = extraClass ? ` ${extraClass}` : '';
    document.getElementById('room_loot_label_' + rIndex).innerHTML = `<span class="material-symbols-outlined cs-icon${cls}" style="color: ${iconColor};">${icon}</span> <span style="color: ${rarityColor};">${eqName}</span>`;
    document.getElementById('room_loot_select_wrapper_' + rIndex).classList.remove('open');
};

window.toggleMerchantItemType = function (rIndex, type) {
    const eqWrapper = document.getElementById('room_loot_select_wrapper_' + rIndex);
    const specInput = document.getElementById('room_merchant_special_wrapper_' + rIndex);
    if (type === 'EQ') {
        eqWrapper.style.display = 'block';
        specInput.style.display = 'none';
    } else {
        eqWrapper.style.display = 'none';
        specInput.style.display = 'block';
    }
};

window.toggleMerchantTypeSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_merchant_type_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectMerchantType = function (rIndex, value, labelStr) {
    const select = document.getElementById(`room_merchant_type_${rIndex}`);
    if (select) select.value = value;

    const label = document.getElementById(`room_merchant_type_label_${rIndex}`);
    if (label) label.innerHTML = labelStr;

    document.getElementById(`room_merchant_type_wrapper_${rIndex}`).classList.remove('open');
    toggleMerchantItemType(rIndex, value);
};

window.toggleMerchantSpecialSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_merchant_special_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectMerchantSpecial = function (rIndex, value, labelStr, color = '#d946ef', level = 1) {
    const select = document.getElementById(`room_merchant_special_${rIndex}`);
    if (select) select.value = value;

    const label = document.getElementById(`room_merchant_special_label_${rIndex}`);
    if (label) {
        if (!value) {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">star</span> ${labelStr}`;
        } else {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${labelStr} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${level})</span>`;
        }
    }

    document.getElementById(`room_merchant_special_wrapper_${rIndex}`).classList.remove('open');
};

window.toggleMerchantCostSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_merchant_cost_item_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectMerchantCost = function (rIndex, value, labelStr, color = '#f472b6', level = 1) {
    const select = document.getElementById(`room_merchant_cost_item_${rIndex}`);
    if (select) select.value = value;

    const label = document.getElementById(`room_merchant_cost_label_${rIndex}`);
    if (label) {
        if (!value) {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">star</span> ${labelStr}`;
        } else {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${labelStr} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${level})</span>`;
        }
    }

    document.getElementById(`room_merchant_cost_item_wrapper_${rIndex}`).classList.remove('open');
};

window.addMerchantItemToRoom = function (rIndex) {
    const type = document.getElementById('room_merchant_type_' + rIndex).value;
    const goldCost = parseInt(document.getElementById('room_merchant_gold_' + rIndex).value) || 0;
    const itemCost = document.getElementById('room_merchant_cost_item_' + rIndex).value.trim();

    if (!pageState.selectedRooms[rIndex].lootTable) pageState.selectedRooms[rIndex].lootTable = [];

    let newItem = {
        probability: 0,
        priceGold: goldCost > 0 ? goldCost : null,
        priceSpecialItemName: itemCost ? itemCost : null
    };

    if (type === 'EQ') {
        const eqId = document.getElementById('room_loot_select_' + rIndex).value;
        if (!eqId) {
            showNotif('Veuillez sélectionner un équipement.', true);
            return;
        }
        newItem.equipmentId = parseInt(eqId);
    } else {
        const specName = document.getElementById('room_merchant_special_' + rIndex).value.trim();
        if (!specName) {
            showNotif('Veuillez entrer le nom de l\'item spécial.', true);
            return;
        }
        newItem.specialItemName = specName;
    }

    pageState.selectedRooms[rIndex].lootTable.push(newItem);
    renderRooms();
};

window.addLootToRoom = function (rIndex) {
    const eqId = document.getElementById('room_loot_select_' + rIndex).value;
    const prob = parseFloat(document.getElementById('room_loot_prob_' + rIndex).value);
    if (!eqId || isNaN(prob) || prob < 0 || prob > 100) {
        showNotif('Veuillez sélectionner un équipement et une probabilité (0-100).', true);
        return;
    }
    if (!pageState.selectedRooms[rIndex].lootTable) pageState.selectedRooms[rIndex].lootTable = [];
    pageState.selectedRooms[rIndex].lootTable.push({ equipmentId: parseInt(eqId), probability: prob });
    renderRooms();
};

window.removeLootFromRoom = function (rIndex, lIndex) {
    pageState.selectedRooms[rIndex].lootTable.splice(lIndex, 1);
    renderRooms();
};

window.addDoorOutcome = function (rIndex) {
    const typeEl = document.getElementById('room_door_outcome_' + rIndex);
    const probEl = document.getElementById('room_door_prob_' + rIndex);
    const type = typeEl ? typeEl.value : '';
    const prob = parseFloat(probEl ? probEl.value : 0);
    if (!type || isNaN(prob) || prob <= 0 || prob > 100) {
        showNotif('Veuillez sélectionner un type et une probabilité (1-100).', true);
        return;
    }
    if (!pageState.selectedRooms[rIndex].doorOutcomes) pageState.selectedRooms[rIndex].doorOutcomes = [];

    const currentTotal = pageState.selectedRooms[rIndex].doorOutcomes.reduce((sum, o) => sum + o.probability, 0);
    if (currentTotal + prob > 100) {
        showNotif(`Impossible : le total dépasse 100% (actuel: ${currentTotal}%). Reste disponible : ${100 - currentTotal}%`, true);
        return;
    }

    pageState.selectedRooms[rIndex].doorOutcomes.push({ type, probability: prob });
    renderRooms();
};

window.removeDoorOutcome = function (rIndex, oIndex) {
    pageState.selectedRooms[rIndex].doorOutcomes.splice(oIndex, 1);
    renderRooms();
};

window.updateAltarField = function (rIndex, oIndex, field, value) {
    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (field === 'altarRewardType') {
        outcome.altarRewardType = value;
        outcome.altarRewardValue = value === 'ITEM' ? (pageState.allEquipments.length > 0 ? pageState.allEquipments[0].id : '') : 100;
    } else {
        if (field === 'altarRewardValue' && outcome.altarRewardType !== 'ITEM') {
            value = parseInt(value) || 0;
        }
        outcome[field] = value;
    }
    renderRooms();
};

window.showNotif = function (message, isError = false) {
    const notif = document.getElementById('pveNotif');
    if (!notif) return;
    notif.textContent = message;
    notif.classList.remove('error');
    if (isError) notif.classList.add('error');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
};


window.toggleDoorOutcomeSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_door_outcome_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectDoorOutcome = function (rIndex, val, label) {
    const input = document.getElementById(`room_door_outcome_${rIndex}`);
    if (input) input.value = val;
    const triggerLabel = document.getElementById(`room_door_outcome_label_${rIndex}`);
    if (triggerLabel) triggerLabel.innerHTML = label;
    const wrapper = document.getElementById(`room_door_outcome_wrapper_${rIndex}`);
    if (wrapper) wrapper.classList.remove('open');
};

window.toggleAltarSpiritualitySelect = function (rIndex, oIndex) {
    const wrapper = document.getElementById(`altar_spirituality_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleAltarRewardSelect = function (rIndex, oIndex) {
    const wrapper = document.getElementById(`altar_reward_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleAltarRewardValSelect = function (rIndex, oIndex) {
    const wrapper = document.getElementById(`altar_rewardval_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleAltarTreasureSelect = function (rIndex, oIndex) {
    const wrapper = document.getElementById(`altar_treasure_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleDoorBossSelect = function (rIndex, oIndex) {
    const wrapper = document.getElementById(`room_door_boss_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectDoorBossOption = function (rIndex, oIndex, val, label, level) {
    const input = document.getElementById(`room_door_boss_select_${rIndex}_${oIndex}`);
    if (input) input.value = val;
    const triggerLabel = document.getElementById(`room_door_boss_label_${rIndex}_${oIndex}`);
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon text-error">pest_control</span> ${label} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${level})</span>`;
    const wrapper = document.getElementById(`room_door_boss_wrapper_${rIndex}_${oIndex}`);
    if (wrapper) wrapper.classList.remove('open');
};

window.addMonsterToBoss = function (rIndex, oIndex) {
    const input = document.getElementById(`room_door_boss_select_${rIndex}_${oIndex}`);
    if (!input || !input.value) {
        showNotif('Veuillez sélectionner un boss.', true);
        return;
    }
    const mId = parseInt(input.value);
    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (!outcome.monsters) outcome.monsters = [];
    outcome.monsters.push(mId);

    // Clear selection
    input.value = '';
    const triggerLabel = document.getElementById(`room_door_boss_label_${rIndex}_${oIndex}`);
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted">pest_control</span> Sélectionner un boss...`;

    renderRooms();
};

window.removeMonsterFromBoss = function (rIndex, oIndex, mIndex) {
    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (outcome && outcome.monsters) {
        outcome.monsters.splice(mIndex, 1);
        renderRooms();
    }
};

window.addGlobalBuffToRoomBoss = function (rIndex) {
    const typeEl = document.getElementById(`room_boss_buff_type_${rIndex}`);
    const valEl = document.getElementById(`room_boss_buff_val_${rIndex}`);
    const durEl = document.getElementById(`room_boss_buff_dur_${rIndex}`);

    if (!typeEl || !valEl || !durEl) return;

    const type = typeEl.value;
    const val = parseInt(valEl.value) || 0;
    const dur = parseInt(durEl.value) || 0;

    if (val <= 0) {
        showNotif('La valeur doit être positive.', true);
        return;
    }

    const room = pageState.selectedRooms[rIndex];
    if (!room.globalBuffs) room.globalBuffs = [];
    room.globalBuffs.push({ type: type, value: val, duration: dur });

    renderRooms();
};

window.removeGlobalBuffFromRoomBoss = function (rIndex, bIndex) {
    const room = pageState.selectedRooms[rIndex];
    if (room && room.globalBuffs) {
        room.globalBuffs.splice(bIndex, 1);
        renderRooms();
    }
};

window.addGlobalBuffToBoss = function (rIndex, oIndex) {
    const typeEl = document.getElementById(`room_door_boss_buff_type_${rIndex}_${oIndex}`);
    const valEl = document.getElementById(`room_door_boss_buff_val_${rIndex}_${oIndex}`);
    const durEl = document.getElementById(`room_door_boss_buff_dur_${rIndex}_${oIndex}`);

    if (!typeEl || !valEl || !durEl) return;

    const type = typeEl.value;
    const val = parseInt(valEl.value) || 0;
    const dur = parseInt(durEl.value) || 0;

    if (val <= 0) {
        showNotif('La valeur doit être positive.', true);
        return;
    }

    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (!outcome.globalBuffs) outcome.globalBuffs = [];
    outcome.globalBuffs.push({ type: type, value: val, duration: dur });

    // reset inputs partially
    valEl.value = '';

    renderRooms();
};

window.removeGlobalBuffFromBoss = function (rIndex, oIndex, bIndex) {
    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (outcome && outcome.globalBuffs) {
        outcome.globalBuffs.splice(bIndex, 1);
        renderRooms();
    }
};

window.updateDoorBossField = function (rIndex, oIndex, fieldName, value) {
    const outcome = pageState.selectedRooms[rIndex].doorOutcomes[oIndex];
    if (outcome) {
        outcome[fieldName] = parseInt(value) || 0;
    }
};

// Add click outside listener
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }
});

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
}

window.hideTooltipFixed = function () {
    let tooltip = document.getElementById('globalFixedTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// --- MUTATIONS ---
async function loadMutations() {
    try {
        const res = await globalFetch('/api/admin/pve/mutations');
        if (res.ok) {
            pageState.allMutations = await res.json();
            renderMutationsList();
            renderMutationsSelector();
        }
    } catch (e) { console.error('Erreur chargement mutations:', e); }
}

function renderMutationsList() {
    const list = document.getElementById('mutationsList');
    if (!list) return;
    if (pageState.allMutations.length === 0) {
        list.innerHTML = `<div class="font-italic" style="text-align:center; padding: 2rem; color: #64748b;">Aucune mutation trouvée</div>`;
        return;
    }

    let html = '';
    pageState.allMutations.forEach(mut => {
        const mHex = mut.color || '#e879f9';
        const mIcon = mut.icon || 'pets';
        html += `
        <div class="list-item flex-between" style="border-left: 3px solid ${mHex}; align-items: center; padding: 0.8rem; background: rgba(15, 23, 42, 0.4); border-radius: 8px; margin-bottom: 0.5rem;">
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <div class="flex-center" style="gap: 0.5rem;">
                    <span class="material-symbols-outlined" style="color: ${mHex};">${mIcon}</span>
                    <span style="font-weight: 600; color: #f8fafc;">${mut.nom}</span>
                    <span class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 0.75rem;">Lvl ${mut.level}</span>
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1;">${mut.description}</div>
            </div>
            <div class="flex-shrink-0" style="display: flex; gap: 0.2rem;">
                <button type="button" class="delete-btn" style="position: static; padding: 0.2rem; color: #3b82f6;" onclick="editMutation(${mut.id})" title="Modifier">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="delete-btn text-error" onclick="deleteMutation(${mut.id})" title="Supprimer" style="position: static; padding: 0.2rem;">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

window.editMutation = (id) => {
    const mut = pageState.allMutations.find(m => m.id === id);
    if (!mut) return;
    pageState.editingMutationId = id;
    document.getElementById('mutName').value = mut.nom;
    document.getElementById('mutDesc').value = mut.description;
    document.getElementById('mutLevel').value = mut.level;
    document.getElementById('mutColor').value = mut.color || '#e879f9';
    document.getElementById('mutIcon').value = mut.icon || 'pets';
    document.getElementById('btnSubmitMutation').textContent = 'Modifier la mutation';
    document.getElementById('btnCancelMutation').style.display = 'inline-block';
    document.getElementById('mutationFormPanel').classList.add('editing-glow');
    document.getElementById('mutationFormPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteMutation = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cette mutation ?')) return;
    try {
        const res = await globalFetch(`/api/admin/pve/mutations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showNotif('Mutation supprimée');
            if (pageState.editingMutationId === id) window.cancelMutationEdit();
            loadMutations();
        } else showNotif('Erreur lors de la suppression', true);
    } catch (e) { showNotif("Erreur: " + e.message, true); }
};

window.cancelMutationEdit = () => {
    pageState.editingMutationId = null;
    document.getElementById('mutationForm').reset();
    document.getElementById('btnSubmitMutation').textContent = 'Créer la mutation';
    document.getElementById('btnCancelMutation').style.display = 'none';
    document.getElementById('mutationFormPanel').classList.remove('editing-glow');
};

document.getElementById('mutationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mut = {
        nom: document.getElementById('mutName').value,
        description: document.getElementById('mutDesc').value,
        level: parseInt(document.getElementById('mutLevel').value) || 1,
        color: document.getElementById('mutColor').value,
        icon: document.getElementById('mutIcon').value
    };
    try {
        let url = '/api/admin/pve/mutations';
        let method = 'POST';
        if (pageState.editingMutationId) { url = `/api/admin/pve/mutations/${pageState.editingMutationId}`; method = 'PUT'; }
        const res = await globalFetch(url, {
            method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mut)
        });
        if (res.ok) {
            showNotif(pageState.editingMutationId ? 'Mutation modifiée' : 'Mutation créée');
            window.cancelMutationEdit();
            loadMutations();
        } else { showNotif("Erreur lors de l'enregistrement", true); }
    } catch (e) { showNotif("Erreur: " + e.message, true); }
});

function renderMutationsSelector() {
    const container = document.getElementById('mMutationsContainer');
    if (!container) return;
    if (pageState.allMutations.length === 0) {
        container.innerHTML = `<span class="text-sm font-italic" style="color: #64748b;">Aucune mutation disponible. Créez-en une d'abord.</span>`;
        return;
    }

    let html = '';
    pageState.allMutations.forEach(mut => {
        const isSelected = pageState.selectedMutationIds.includes(mut.id);
        const mHex = mut.color || '#e879f9';
        const mIcon = mut.icon || 'pets';
        const bg = isSelected ? `rgba(232, 121, 249, 0.2)` : 'rgba(15, 23, 42, 0.6)';
        const border = isSelected ? `1px solid ${mHex}` : '1px solid rgba(255,255,255,0.1)';
        const opacity = isSelected ? '1' : '0.6';
        const shadow = isSelected ? `box-shadow: 0 0 8px rgba(232, 121, 249, 0.4);` : '';

        html += `
        <div onclick="toggleMutationSelection(${mut.id})" style="cursor: pointer; padding: 0.3rem 0.6rem; border-radius: 6px; background: ${bg}; border: ${border}; opacity: ${opacity}; ${shadow} display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" title="${mut.description}">
            <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${mHex};">${mIcon}</span>
            <span style="font-size: 0.85rem; color: #f8fafc;">${mut.nom} <span style="opacity: 0.7; font-size: 0.75rem;">(Niv. ${mut.level || 1})</span></span>
        </div>`;
    });
    container.innerHTML = html;
}

window.toggleMutationSelection = (id) => {
    if (pageState.selectedMutationIds.includes(id)) {
        pageState.selectedMutationIds = pageState.selectedMutationIds.filter(x => x !== id);
    } else {
        if (pageState.selectedMutationIds.length >= 4) {
            showNotif("Un monstre ne peut avoir que 4 mutations maximum", true);
            return;
        }
        pageState.selectedMutationIds.push(id);
    }
    renderMutationsSelector();
};

window.toggleBuffCombobox = function (rIndex) {
    const menu = document.getElementById(`room_boss_buff_menu_${rIndex}`);
    if (menu.style.display === 'none' || menu.style.display === '') {
        document.querySelectorAll('.custom-combobox-menu').forEach(el => el.style.display = 'none');
        menu.style.display = 'flex';
    } else {
        menu.style.display = 'none';
    }
};

window.selectBuffType = function (rIndex, value, label, icon, iconColorClass) {
    document.getElementById(`room_boss_buff_type_${rIndex}`).value = value;
    document.getElementById(`room_boss_buff_label_${rIndex}`).innerHTML = `<span class="material-symbols-outlined ${iconColorClass}" style="font-size: 1.1rem;">${icon}</span> <span>${label}</span>`;
    document.getElementById(`room_boss_buff_menu_${rIndex}`).style.display = 'none';
};

document.addEventListener('click', function (e) {
    if (!e.target.closest('.custom-combobox')) {
        document.querySelectorAll('.custom-combobox-menu').forEach(el => el.style.display = 'none');
    }
});
