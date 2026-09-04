
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
    return `<div class="admin-monster-badge" title="${m.nativeSecret}" style="color: ${sm.color}; border: 1px solid ${sm.color}60;"><span class="material-symbols-outlined text-lg" >${sm.icon}</span></div>`;
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
            document.getElementById('adminWarning').classList.remove('hidden');
            setTimeout(() => { window.location.href = '/'; }, 2000);
            return;
        }

        document.getElementById('adminContent').classList.remove('hidden');
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
            startShield: parseInt(document.getElementById('mStartShield').value) || 0,
            startShieldDuration: parseInt(document.getElementById('mStartShieldDuration').value) || 0,
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
            const r = pageState.selectedRooms[i]; if (r.type === 'EVENT' && r.eventSubType === 'PORTE_ETRANGE') {
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
        label.innerHTML = `<span class="material-symbols-outlined cs-icon text-error" >pest_control</span> ${monsterName} (Lvl ${monsterLvl})`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color || '#38bdf8'}; font-size: 1.1rem;">star</span> <span class="flex-1 text-center" >${lvl}</span>`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span class="flex-1 text-left" >${label}</span> <span class="material-symbols-outlined text-muted text-lg pointer-events-none" >expand_more</span>`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span class="flex-1 text-left" >${label}</span> <span class="material-symbols-outlined text-muted text-lg pointer-events-none" >expand_more</span>`;
    }
    const wrapper = document.getElementById('mBehaviorWrapper');
    if (wrapper) wrapper.classList.remove('open');
};


window.selectFilterLevelOption = function (lvl, label, color, icon) {
    document.getElementById('monsterLevelFilter').value = lvl;
    const trigger = document.getElementById('mLevelFilterTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span class="flex-1 text-center" >${label}</span>`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem; ${transformStr}">${icon}</span> <span class="flex-1 text-left" >${label}</span> <span class="material-symbols-outlined text-muted text-lg pointer-events-none" >expand_more</span>`;
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
            optionsHtml += `<div class="custom-option" data-value="${m.id}" onclick="selectMonsterOption(${rIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})">${getSecretIconOnlyHtml(m)}<span class="material-symbols-outlined cs-icon text-error" >pest_control</span> ${m.name} <span class="text-muted text-xs ml-1" >(Lvl ${m.level || 1})</span></div>`;
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
            let monstersHtml = '<div class="flex-col gap-2 mt-4" >';
            if (room.monsters.length === 0) {
                monstersHtml += `<div class="text-muted text-xs" >Aucun monstre dans cette salle.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = pageState.allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div class="room-entity-row" >
                                <span class="flex-center text-sm text-slate-50 gap-1" ><span class="text-muted badge-lvl" >Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button class="text-error btn-icon" type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div class="room-select-row" >
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; min-width: 0; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger custom-select-larger" onclick="toggleMonsterSelect(${rIndex})" >
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >pest_control</span> Sélectionner un monstre...</span>
                            <span class="material-symbols-outlined" >expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button class="btn-room-add" type="button" onclick="addMonsterToRoom(${rIndex})">
                        +
                    </button>
                </div>
            `;
            contentHtml = monstersHtml;

        } else if (room.type === 'BOSS') {
            headerIcon = 'local_fire_department'; headerColor = '#e11d48'; headerTitle = 'Salle de Boss';

            // Monsters inside the room
            let monstersHtml = '<div class="flex-col gap-2 mt-4" >';
            if (room.monsters.length === 0) {
                monstersHtml += `<div class="text-muted text-xs" >Aucun monstre configuré pour le boss.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = pageState.allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div class="room-entity-row" >
                                <span class="flex-center text-sm text-slate-50 gap-1" ><span class="text-muted badge-lvl" >Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button class="text-error btn-icon" type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div class="room-select-row" >
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; min-width: 0; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger custom-select-larger" onclick="toggleMonsterSelect(${rIndex})" >
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >pest_control</span> Sélectionner un boss/monstre...</span>
                            <span class="material-symbols-outlined" >expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button class="btn-room-add-boss" type="button" onclick="addMonsterToRoom(${rIndex})">
                        +
                    </button>
                </div>
            `;

            // Global Buffs HTML
            if (!room.globalBuffs) room.globalBuffs = [];
            let buffsHtml = '<div class="flex-col gap-2 mt-4" >';
            if (room.globalBuffs.length === 0) {
                buffsHtml += `<div class="text-muted text-xs" >Aucun buff global configuré.</div>`;
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
                        <div class="room-entity-row" >
                            <span class="flex-center text-sm text-slate-50 gap-1" >
                                <span class="material-symbols-outlined text-base text-blue-500" >upgrade</span>
                                ${buffLabel}
                            </span>
                            <button class="text-error btn-icon" type="button" onclick="removeGlobalBuffFromRoomBoss(${rIndex}, ${bIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                        </div>
                    `;
                });
            }
            buffsHtml += `</div>
            <div class="room-select-row-wrap" >
                <div class="room-buff-col-lg" >
                    <label class="text-muted text-xxs m-0 pl-1" >Type de buff</label>
                    <div class="custom-combobox relative w-full" >
                        <input type="hidden" id="room_boss_buff_type_${rIndex}" value="HP_PCT">
                        <button class="buff-combobox-btn form-control text-xs" type="button" onclick="toggleBuffCombobox(${rIndex})" id="room_boss_buff_btn_${rIndex}">
                            <span class="flex items-center gap-2" id="room_boss_buff_label_${rIndex}" ><span class="material-symbols-outlined text-green-400 text-lg" >favorite</span> <span>+ PV Max (%)</span></span>
                            <span class="material-symbols-outlined text-lg text-muted" >expand_more</span>
                        </button>
                        <div class="buff-combobox-menu custom-combobox-menu hidden" id="room_boss_buff_menu_${rIndex}" >
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'HP_PCT', '+ PV Max (%)', 'favorite', 'text-green-400')">
                                <span class="material-symbols-outlined text-green-400 text-lg" >favorite</span>
                                <span>+ PV Max (%)</span>
                            </div>
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'SHIELD_PCT', 'Bouclier (% PV)', 'shield', 'text-blue-400')">
                                <span class="material-symbols-outlined text-blue-400 text-lg" >shield</span>
                                <span>Bouclier (% PV)</span>
                            </div>
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'ARMOR_FLAT', '+ Armure', 'security', 'text-gray-300')">
                                <span class="material-symbols-outlined text-gray-300 text-lg" >security</span>
                                <span>+ Armure</span>
                            </div>
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'RESIST_FLAT', '+ Résistance', 'gpp_maybe', 'text-purple-400')">
                                <span class="material-symbols-outlined text-purple-400 text-lg" >gpp_maybe</span>
                                <span>+ Résistance</span>
                            </div>
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'BURN_ON_HIT', 'Brûlure au touché', 'local_fire_department', 'text-orange-500')">
                                <span class="material-symbols-outlined text-orange-500 text-lg" >local_fire_department</span>
                                <span>Brûlure au touché</span>
                            </div>
                            <div class="combobox-item buff-combobox-item" onclick="selectBuffType(${rIndex}, 'POISON_ON_HIT', 'Poison au touché', 'coronavirus', 'text-green-500')">
                                <span class="material-symbols-outlined text-green-500 text-lg" >coronavirus</span>
                                <span>Poison au touché</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="room-buff-col-sm" >
                    <label class="text-muted text-xxs m-0 pl-1" >Stat (Valeur)</label>
                    <input class="form-control w-full" type="number" id="room_boss_buff_val_${rIndex}" value="10">
                </div>
                <div class="room-buff-col-sm" >
                    <label class="text-muted text-xxs m-0 pl-1" >Durée (Tours)</label>
                    <input class="form-control w-full" type="number" id="room_boss_buff_dur_${rIndex}" value="4">
                </div>
                <button class="btn-room-add-boss" type="button" onclick="addGlobalBuffToRoomBoss(${rIndex})" >
                    <span class="material-symbols-outlined text-lg" >add</span>
                </button>
            </div>`;

            contentHtml = `
                ${monstersHtml}
                <div class="section-divider mt-4 pt-4 border-t-dashed" >
                    <label class="text-xs text-info" >Buffs Globaux du Boss</label>
                    ${buffsHtml}
                </div>
                <div class="section-divider mt-4 pt-4 border-t-dashed" >
                    <label class="flex-center text-xs text-rose-600 gap-1 mb-2" >
                        <span class="material-symbols-outlined icon-sm" >emoji_events</span>
                        Récompenses de fin de combat (Boss vaincu)
                    </label>
                    <div class="flex gap-4" >
                        <div class="flex-1" >
                            <label class="flex-center text-xs text-violet-500 gap-1 mb-1" >
                                <span class="material-symbols-outlined text-sm" >blur_on</span>
                                XP Spiritualité
                            </label>
                            <input class="form-control" type="number" min="0" value="${room.bossRewardSpiritualXp || 0}" onchange="updateRoomField(${rIndex}, 'bossRewardSpiritualXp', parseInt(this.value) || 0)">
                        </div>
                        <div class="flex-1" >
                            <label class="flex-center text-xs text-amber-500 gap-1 mb-1" >
                                <span class="material-symbols-outlined text-sm" >paid</span>
                                Or bonus
                            </label>
                            <input class="form-control" type="number" min="0" value="${room.bossRewardGold || 0}" onchange="updateRoomField(${rIndex}, 'bossRewardGold', parseInt(this.value) || 0)">
                        </div>
                    </div>
                </div>
            `;

        } else if (room.type === 'TREASURE') {
            headerIcon = 'shopping_bag'; headerColor = '#f59e0b'; headerTitle = 'Salle de Trésor';

            if (!room.lootTable) room.lootTable = [];

            let lootHtml = '<div class="flex-col gap-2 mt-4" >';
            if (room.lootTable.length === 0) {
                lootHtml += `<div class="text-muted text-xs" >Aucun loot configuré.</div>`;
            } else {
                room.lootTable.forEach((loot, lIndex) => {
                    const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                    if (eq) {
                        const slotInfo = getSlotInfo(eq);
                        const rarityColor = getRarityColor(eq.rarity);
                        const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                        lootHtml += `
                            <div class="room-entity-row" >
                                <span class="flex-center text-sm text-slate-50 gap-1" ><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span class="text-muted text-xs" >(${loot.probability}%)</span></span>
                                <button class="text-error btn-icon" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                            </div>
                        `;
                    }
                });
            }
            lootHtml += `</div>
                <div class="room-select-row" >
                    <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger custom-select-larger" onclick="toggleLootSelect(${rIndex})" >
                            <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >category</span> Objet...</span>
                            <span class="material-symbols-outlined" >expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_loot_options_${rIndex}">
            `;
            pageState.allEquipments.forEach(eq => {
                const slotInfo = getSlotInfo(eq);
                const rarityColor = getRarityColor(eq.rarity);
                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                lootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
            });
            lootHtml += `
                        </div>
                        <input type="hidden" id="room_loot_select_${rIndex}" value="">
                    </div>
                    <input class="form-control flex-1 min-w-60" type="number" id="room_loot_prob_${rIndex}" placeholder="Prob (%)" step="0.1" min="0" max="100">
                    <button class="btn-room-add-treasure" type="button" onclick="addLootToRoom(${rIndex})" >
                        <span class="material-symbols-outlined text-lg" >add</span>
                    </button>
                </div>
            `;

            contentHtml = `
                <div class="flex gap-4 mt-4" >
                    <div class="flex-1" >
                        <label class="text-xs text-muted" >Or</label>
                        <input class="form-control" type="number" value="${room.treasureGold}" onchange="updateRoomField(${rIndex}, 'treasureGold', parseInt(this.value))">
                    </div>
                    <div class="flex-1" >
                        <label class="text-xs text-muted" >Expérience</label>
                        <input class="form-control" type="number" value="${room.treasureExp}" onchange="updateRoomField(${rIndex}, 'treasureExp', parseInt(this.value))">
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
                    <div class="mt-4" >
                        <label class="text-xs text-muted" >Texte de l'événement</label>
                        <input class="form-control" type="text" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div class="mt-3" >
                        <label class="text-xs text-muted" >Possibilité offerte</label>
                        <div class="custom-select-wrapper" id="room_alt_type_wrapper_${rIndex}" style="z-index: ${102 - rIndex}; margin: 0; margin-top: 0.2rem;">
                            <div class="custom-select-trigger custom-select-larger" onclick="const w = document.getElementById('room_alt_type_wrapper_${rIndex}'); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== w) el.classList.remove('open'); }); w.classList.toggle('open');" >
                                <span class="cs-label" id="room_alt_type_label_${rIndex}">
                                    ${altType === 'VIE_XP' ? '<span class="material-symbols-outlined cs-icon text-error" >favorite</span> Don de vie et/ou d\'xp' :
                        (altType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon text-fuchsia-500" >diamond</span> Don d\'un item spécial' :
                            '<span class="material-symbols-outlined cs-icon text-muted" >block</span> Ne rien faire')}
                                </span>
                                <span class="material-symbols-outlined" >expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_alt_type_options_${rIndex}">
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'VIE_XP'); renderRooms();"><span class="material-symbols-outlined cs-icon text-error" >favorite</span> Don de vie et/ou d'xp</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'ITEM'); renderRooms();"><span class="material-symbols-outlined cs-icon text-fuchsia-500" >diamond</span> Don d'un item spécial</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'RIEN'); renderRooms();"><span class="material-symbols-outlined cs-icon text-muted" >block</span> Ne rien faire</div>
                            </div>
                        </div>
                    </div>
                `;

                if (altType === 'VIE_XP') {
                    const rewType = room.alterationRewardType || 'SPIRITUAL_XP';
                    contentHtml += `
                    <div class="flex gap-4 mt-3" >
                        <div class="flex-1" >
                            <label class="text-xs text-muted" >Effet PV (+ soin, - perte)</label>
                            <input class="form-control" type="number" value="${room.alterationHpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationHpAmount', parseInt(this.value))">
                        </div>
                        <div class="flex-1" >
                            <label class="text-xs text-muted" >Effet XP (+ gain, - perte)</label>
                            <input class="form-control" type="number" value="${room.alterationExpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationExpAmount', parseInt(this.value))">
                        </div>
                    </div>
                    <div class="mt-3 bg-black/20 p-2 rounded" >
                        <label class="text-xs text-warning" >Récompense en échange</label>
                        <div class="custom-select-wrapper" id="room_alt_reward_type_wrapper_${rIndex}" style="z-index: ${105 - rIndex}; margin: 0; margin-top: 0.2rem; margin-bottom: 0.5rem;">
                            <div class="custom-select-trigger custom-select-larger" onclick="const w = document.getElementById('room_alt_reward_type_wrapper_${rIndex}'); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== w) el.classList.remove('open'); }); w.classList.toggle('open');" >
                                <span class="cs-label" id="room_alt_reward_type_label_${rIndex}">
                                    ${rewType === 'SPIRITUAL_XP' ? '<span class="material-symbols-outlined cs-icon text-violet-500" >blur_on</span> XP de Spiritualité' :
                            '<span class="material-symbols-outlined cs-icon text-fuchsia-500" >diamond</span> Item Spécial'}
                                </span>
                                <span class="material-symbols-outlined" >expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_alt_reward_type_options_${rIndex}">
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRewardType', 'SPIRITUAL_XP'); renderRooms();"><span class="material-symbols-outlined cs-icon text-violet-500" >blur_on</span> XP de Spiritualité</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRewardType', 'SPECIAL_ITEM'); renderRooms();"><span class="material-symbols-outlined cs-icon text-fuchsia-500" >diamond</span> Item Spécial</div>
                            </div>
                        </div>
                        ${rewType === 'SPIRITUAL_XP' ? `
                            <label class="text-xs text-muted" >Gain XP Spiritualité</label>
                            <input class="form-control" type="number" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                        ` : `
                            <label class="text-xs text-muted" >Item Spécial Donné en récompense</label>
                            ${(() => {
                            const selAnomalie = pageState.allAnomalies.find(a => a.name === room.alterationSpecialItemReward);
                            let selHtml = '<span class="material-symbols-outlined cs-icon text-muted" >star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                let color = getSpiritualiteColor(selAnomalie.spiritualite);
                                const icon = getCategoryIcon(selAnomalie.category);
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${selAnomalie.name} <span class="text-muted text-xs ml-1" >(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                                <div class="custom-select-wrapper" id="room_alt_reward_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${103 - rIndex};">
                                    <div class="custom-select-trigger custom-select-larger p-2 text-sm rounded-lg" onclick="document.getElementById('room_alt_reward_wrapper_${rIndex}').classList.toggle('open')" >
                                        <span class="cs-label" id="room_alt_reward_label_${rIndex}">${selHtml}</span>
                                        <span class="material-symbols-outlined" >expand_more</span>
                                    </div>
                                    <div class="custom-select-options" >
                                        ${pageState.allAnomalies.map(a => {
                                let color = getSpiritualiteColor(a.spiritualite);
                                const icon = getCategoryIcon(a.category);
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationSpecialItemReward', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span class="text-muted text-xs ml-1" >(Lvl ${a.level || 1})</span></div>`;
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
                    <div class="mt-3" >
                        <label class="text-xs text-muted" >Item Spécial Requis (que le joueur donne)</label>
                        ${(() => {
                            const selAnomalie = pageState.allAnomalies.find(a => a.name === room.alterationRequiredItem);
                            let selHtml = '<span class="material-symbols-outlined cs-icon text-muted" >star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                let color = getSpiritualiteColor(selAnomalie.spiritualite);
                                const icon = getCategoryIcon(selAnomalie.category);
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${selAnomalie.name} <span class="text-muted text-xs ml-1" >(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                            <div class="custom-select-wrapper" id="room_alt_req_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${100 - rIndex};">
                                <div class="custom-select-trigger p-2 text-sm rounded-lg" onclick="document.getElementById('room_alt_req_wrapper_${rIndex}').classList.toggle('open')" >
                                    <span class="cs-label" id="room_alt_req_label_${rIndex}">${selHtml}</span>
                                    <span class="material-symbols-outlined" >expand_more</span>
                                </div>
                                <div class="custom-select-options" >
                                    ${pageState.allAnomalies.map(a => {
                                let color = getSpiritualiteColor(a.spiritualite);
                                const icon = getCategoryIcon(a.category);
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRequiredItem', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span class="text-muted text-xs ml-1" >(Lvl ${a.level || 1})</span></div>`;
                            }).join('')}
                                </div>
                            </div>
                            `;
                        })()}
                    </div>
                    <div class="mt-2" >
                        <label class="text-xs text-warning" >Récompense (XP Spiritualité)</label>
                        <input class="form-control" type="number" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                    </div>
                    `;
                }
            } else if (subType === 'RENCONTRE') {
                headerIcon = 'storefront'; headerColor = '#10b981'; headerTitle = 'Rencontre';

                if (!room.lootTable) room.lootTable = [];

                let shopHtml = '<div class="flex-col gap-2 mt-4" >';
                if (room.lootTable.length === 0) {
                    shopHtml += `<div class="text-muted text-xs" >Aucun objet en vente.</div>`;
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
                            const tooltipDataHtml = getAnomalyTooltipHTML(an, loot.specialItemName);
                            nameHtml = `<span class="anomaly-badge" style="border-color: ${color}; background: ${color}25; color: ${color}; cursor: help;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipDataHtml.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; color: ${color};">${icon}</span>
                            </span>`;
                        } else {
                            const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                            if (eq) {
                                const slotInfo = getSlotInfo(eq);
                                const rarityColor = getRarityColor(eq.rarity);
                                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                nameHtml = `<span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span>`;
                            } else {
                                nameHtml = `Inconnu`;
                            }
                        }

                        let priceHtml = '';
                        if (loot.priceGold > 0) priceHtml += `<span class="text-amber-500 text-xs ml-1" >${loot.priceGold} Or</span>`;
                        else if (!loot.priceGold && loot.probability > 0) priceHtml += `<span class="text-amber-500 text-xs ml-1" >${loot.probability} Or</span>`;
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
                            const tooltipDataHtml2 = getAnomalyTooltipHTML(anPrice, loot.priceSpecialItemName);
                            priceHtml += `<span class="anomaly-badge" style="border-color: ${priceColor}; background: ${priceColor}25; color: ${priceColor}; margin-left: 0.5rem; cursor: help; display: inline-flex; align-items: center; gap: 0.2rem;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipDataHtml2.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined text-sm align-middle" style="color: ${priceColor};">${priceIcon}</span> 1x
                            </span>`;
                        }

                        shopHtml += `
                            <div class="room-entity-row" >
                                <span class="flex-center text-sm text-slate-50 gap-1" >
                                    ${nameHtml}
                                </span>
                                <div class="flex-center gap-3" >
                                    <span class="flex-center" >
                                        ${priceHtml}
                                    </span>
                                    <button class="text-error btn-icon" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                                </div>
                            </div>
                        `;
                    });
                }
                shopHtml += `</div>
                    <div class="flex flex-col gap-2 mt-2 bg-black/20 p-3 rounded-md" >
                        <div class="relative flex flex-col gap-2" >
                            <div class="custom-select-wrapper" id="room_merchant_type_wrapper_${rIndex}" style="z-index: ${102 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleMerchantTypeSelect(${rIndex})" >
                                    <span class="cs-label" id="room_merchant_type_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >category</span> Équipement</span>
                                    <span class="material-symbols-outlined" >expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_type_options_${rIndex}">
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'EQ', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8;\\'>category</span> Équipement')"><span class="material-symbols-outlined cs-icon text-muted" >category</span> Équipement</div>
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'SPECIAL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #d946ef;\\'>diamond</span> Item Spécial')"><span class="material-symbols-outlined cs-icon text-fuchsia-500" >diamond</span> Item Spécial</div>
                                </div>
                                <input type="hidden" id="room_merchant_type_${rIndex}" value="EQ">
                            </div>
                            
                            <!-- Mode Equipement -->
                            <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="z-index: ${101 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger custom-select-larger" onclick="toggleLootSelect(${rIndex})" >
                                    <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >category</span> Objet...</span>
                                    <span class="material-symbols-outlined" >expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_loot_options_${rIndex}">
                `;
                pageState.allEquipments.forEach(eq => {
                    const slotInfo = getSlotInfo(eq);
                    const rarityColor = getRarityColor(eq.rarity);
                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                    shopHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
                });
                shopHtml += `
                                </div>
                                <input type="hidden" id="room_loot_select_${rIndex}" value="">
                            </div>
                            
                            <!-- Mode Spécial -->
                            <div class="custom-select-wrapper" id="room_merchant_special_wrapper_${rIndex}" style="display: none; z-index: ${101 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger custom-select-larger" onclick="toggleMerchantSpecialSelect(${rIndex})" >
                                    <span class="cs-label" id="room_merchant_special_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >diamond</span> Choisir un item spécial...</span>
                                    <span class="material-symbols-outlined" >expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_special_options_${rIndex}">
                                    <div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '', 'Choisir un item spécial...')"><span class="material-symbols-outlined cs-icon text-muted" >diamond</span> Choisir un item spécial...</div>
                                    ${pageState.allAnomalies.map(a => {
                    let color = getSpiritualiteColor(a.spiritualite);
                    const icon = getCategoryIcon(a.category);
                    return `<div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}', '${icon}', ${a.level || 1})"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span class="text-muted text-xs ml-1" >(Lvl ${a.level || 1})</span></div>`;
                }).join('')}
                                </div>
                                <input type="hidden" id="room_merchant_special_${rIndex}" value="">
                            </div>
                        </div>
                        <div class="flex flex-col gap-3 mt-3" >
                            <div>
                                <label class="text-xs text-muted block mb-1" >Prix en Or</label>
                                <input class="form-control w-full m-0" type="number" id="room_merchant_gold_${rIndex}" placeholder="0" min="0">
                            </div>
                            <div class="relative" style="z-index: ${99 - rIndex};">
                                <label class="text-xs text-muted block mb-1" >Ou Prix en Item Spécial</label>
                                <div class="custom-select-wrapper m-0" id="room_merchant_cost_item_wrapper_${rIndex}" >
                                    <div class="custom-select-trigger custom-select-larger" onclick="toggleMerchantCostSelect(${rIndex})" >
                                        <span class="cs-label" id="room_merchant_cost_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >diamond</span> Sélectionner (Optionnel)</span>
                                        <span class="material-symbols-outlined" >expand_more</span>
                                    </div>
                                    <div class="custom-select-options" id="room_merchant_cost_options_${rIndex}">
                                        <div class="custom-option" onclick="selectMerchantCost(${rIndex}, '', 'Sélectionner (Optionnel)')"><span class="material-symbols-outlined cs-icon text-muted" >diamond</span> Sélectionner (Optionnel)</div>
                                        ${pageState.allAnomalies.map(a => {
                    let color = getSpiritualiteColor(a.spiritualite);
                    const icon = getCategoryIcon(a.category);
                    return `<div class="custom-option" onclick="selectMerchantCost(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}', '${icon}', ${a.level || 1})"><span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${a.name} <span class="text-muted text-xs ml-1" >(Lvl ${a.level || 1})</span></div>`;
                }).join('')}
                                    </div>
                                    <input type="hidden" id="room_merchant_cost_item_${rIndex}" value="">
                                </div>
                            </div>
                            <button class="btn btn-success flex-center w-full mt-2 justify-center" type="button" onclick="addMerchantItemToRoom(${rIndex})" >
                                <span class="material-symbols-outlined text-lg mr-2" >add_shopping_cart</span> Ajouter cet objet
                            </button>
                        </div>
                    </div>
                `;

                contentHtml = `
                    <div class="mt-4" >
                        <label class="text-xs text-muted" >Texte de l'événement</label>
                        <input class="form-control" type="text" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${shopHtml}
                `;
            } else if (subType === 'PIEGE') {
                headerIcon = 'warning'; headerColor = '#f87171'; headerTitle = 'Piège';
                contentHtml = `
                    <div class="mt-4" >
                        <label class="text-xs text-muted" >Texte du piège</label>
                        <input class="form-control" type="text" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-3" >
                        <div>
                            <label class="text-muted text-xs" >Perte PV (% max)</label>
                            <input class="form-control" type="number" value="${room.trapDamageHpPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label class="text-muted text-xs" >Perte Mana (% max)</label>
                            <input class="form-control" type="number" value="${room.trapDamageManaPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label class="text-muted text-xs" >Perte PV (Fixe)</label>
                            <input class="form-control" type="number" value="${room.trapDamageHpFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                        <div>
                            <label class="text-muted text-xs" >Perte Mana (Fixe)</label>
                            <input class="form-control" type="number" value="${room.trapDamageManaFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                    </div>
                    <div class="flex-center flex justify-between mt-4 p-3 bg-black/20 border border-amber-500/30 rounded-lg" >
                        <div class="flex flex-col gap-1" >
                            <span class="flex-center text-sm font-medium text-slate-50 gap-1" >
                                <span class="material-symbols-outlined text-amber-500 text-lg" >auto_fix</span> Option Corde d'évitement
                            </span>
                            <span class="text-muted text-xs" >Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                        </div>
                        <label class="flex-shrink-0 relative block m-0" style="width: 40px; height: 24px;" >
                            <input class="opacity-0 w-0 h-0" type="checkbox" style="opacity: 0; width: 0; height: 0;" ${room.trapHasRopeOption ? 'checked' : ''} onchange="updateRoomField(${rIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
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

                let doorLootHtml = `<div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                    <label class="text-xs text-violet-500 block mb-2" style="color: #8b5cf6;" >Loot possible si l'issue "Item" est choisie</label>
                    <div class="flex flex-col gap-2 mt-2" >`;
                if (room.lootTable.length === 0) {
                    doorLootHtml += `<div class="text-muted text-xs" >Aucun loot configuré.</div>`;
                } else {
                    room.lootTable.forEach((loot, lIndex) => {
                        const eq = pageState.allEquipments.find(x => x.id === loot.equipmentId);
                        if (eq) {
                            const slotInfo = getSlotInfo(eq);
                            const rarityColor = getRarityColor(eq.rarity);
                            const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                            doorLootHtml += `
                                <div class="room-entity-row" >
                                    <span class="flex-center text-sm text-slate-50 gap-1" ><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span class="text-muted text-xs" >(${loot.probability}%)</span></span>
                                    <button class="text-error btn-icon" type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                                </div>
                            `;
                        }
                    });
                }
                doorLootHtml += `</div>
                    <div class="room-select-row" >
                        <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${90 - rIndex}; margin: 0;">
                            <div class="custom-select-trigger custom-select-larger" onclick="toggleLootSelect(${rIndex})" >
                                <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon text-muted" >category</span> Objet...</span>
                                <span class="material-symbols-outlined" >expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_loot_options_${rIndex}">
                `;
                pageState.allEquipments.forEach(eq => {
                    const slotInfo = getSlotInfo(eq);
                    const rarityColor = getRarityColor(eq.rarity);
                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                    doorLootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
                });
                doorLootHtml += `
                            </div>
                            <input type="hidden" id="room_loot_select_${rIndex}" value="">
                        </div>
                        <input class="form-control flex-1 min-w-60" type="number" id="room_loot_prob_${rIndex}" placeholder="Prob (%)" step="0.1" min="0" max="100">
                        <button class="btn-room-add-treasure" type="button" onclick="addLootToRoom(${rIndex})" >
                            <span class="material-symbols-outlined text-lg" >add</span>
                        </button>
                    </div></div>
                `;

                let outcomesHtml = '<div class="flex-col gap-2 mt-4" >';
                if (room.doorOutcomes.length === 0) {
                    outcomesHtml += `<div class="text-muted text-xs" >Aucune issue configurée.</div>`;
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
                            let monstersHtml = '<div class="flex-col gap-2 mt-4" >';
                            if (outcome.monsters.length === 0) {
                                monstersHtml += `<div class="text-muted text-xs" >Aucun boss configuré.</div>`;
                            } else {
                                outcome.monsters.forEach((mId, mIndex) => {
                                    const m = pageState.allMonsters.find(x => x.id === mId);
                                    if (m) {
                                        monstersHtml += `
                                            <div class="room-entity-row" >
                                                <span class="flex-center text-sm text-slate-50 gap-1" ><span class="text-muted badge-lvl" >Lvl ${m.level || 1}</span> ${m.name}</span>
                                                <button class="text-error btn-icon" type="button" onclick="removeMonsterFromBoss(${rIndex}, ${oIndex}, ${mIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                                            </div>
                                        `;
                                    }
                                });
                            }
                            monstersHtml += `</div>
                                <div class="room-select-row" >
                                    <div class="custom-select-wrapper" id="room_door_boss_wrapper_${rIndex}_${oIndex}" style="flex: 1; z-index: ${150 - (rIndex * 10 + oIndex * 3)}; margin: 0;">
                                        <div class="custom-select-trigger custom-select-larger" onclick="toggleDoorBossSelect(${rIndex}, ${oIndex})" >
                                            <span class="cs-label" id="room_door_boss_label_${rIndex}_${oIndex}"><span class="material-symbols-outlined cs-icon text-muted" >pest_control</span> Sélectionner un boss...</span>
                                            <span class="material-symbols-outlined" >expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="room_door_boss_options_${rIndex}_${oIndex}">
                                            ${pageState.allMonsters.map(m => `
                                                <div class="custom-option" onclick="selectDoorBossOption(${rIndex}, ${oIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})">
                                                    ${getSecretIconOnlyHtml(m)}<span class="material-symbols-outlined cs-icon text-error" >pest_control</span> ${m.name} <span class="text-muted text-xs ml-1" >(Lvl ${m.level || 1})</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                        <input type="hidden" id="room_door_boss_select_${rIndex}_${oIndex}" value="">
                                    </div>
                                    <button class="btn-room-add-boss" type="button" onclick="addMonsterToBoss(${rIndex}, ${oIndex})" >
                                        <span class="material-symbols-outlined text-lg" >add</span>
                                    </button>
                                </div>
                            `;
                            if (!outcome.globalBuffs) outcome.globalBuffs = [];
                            let buffsHtml = '<div class="flex-col gap-2 mt-4" >';
                            if (outcome.globalBuffs.length === 0) {
                                buffsHtml += `<div class="text-muted text-xs" >Aucun buff global configuré.</div>`;
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
                                        <div class="room-entity-row" >
                                            <span class="flex-center text-sm text-slate-50 gap-1" >
                                                <span class="material-symbols-outlined text-base text-blue-500" >upgrade</span>
                                                ${buffLabel}
                                            </span>
                                            <button class="text-error btn-icon" type="button" onclick="removeGlobalBuffFromBoss(${rIndex}, ${oIndex}, ${bIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                                        </div>
                                    `;
                                });
                            }
                            buffsHtml += `</div>
                            <div class="room-select-row-wrap" >
                                <div class="room-buff-col-lg" >
                                    <label class="text-muted text-xxs m-0 pl-1" >Type de buff</label>
                                    <select class="form-control text-xs w-full" id="room_door_boss_buff_type_${rIndex}_${oIndex}" >
                                        <option value="HP_PCT">+ PV Max (%)</option>
                                        <option value="SHIELD_PCT">Bouclier (% PV)</option>
                                        <option value="ARMOR_FLAT">+ Armure</option>
                                        <option value="RESIST_FLAT">+ Résistance</option>
                                        <option value="BURN_ON_HIT">Brûlure au touché</option>
                                        <option value="POISON_ON_HIT">Poison au touché</option>
                                    </select>
                                </div>
                                <div class="room-buff-col-sm" >
                                    <label class="text-muted text-xxs m-0 pl-1" >Stat (Valeur)</label>
                                    <input class="form-control w-full" type="number" id="room_door_boss_buff_val_${rIndex}_${oIndex}" value="10">
                                </div>
                                <div class="room-buff-col-sm" >
                                    <label class="text-muted text-xxs m-0 pl-1" >Durée (Tours)</label>
                                    <input class="form-control w-full" type="number" id="room_door_boss_buff_dur_${rIndex}_${oIndex}" value="4">
                                </div>
                                <button class="btn-room-add-boss" type="button" onclick="addGlobalBuffToBoss(${rIndex}, ${oIndex})" >
                                    <span class="material-symbols-outlined text-lg" >add</span>
                                </button>
                            </div>`;

                            extraHtml = `
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-error block mb-2" >Configuration du Boss</label>
                                    ${monstersHtml}
                                </div>
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-info block mb-2" >Buffs Globaux du Boss</label>
                                    ${buffsHtml}
                                </div>
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-warning block mb-2" >Récompenses du Boss (Fin de combat)</label>
                                    <div class="flex gap-2 mt-2" >
                                        <div class="flex-1" >
                                            <label class="text-muted text-xs" ><span class="material-symbols-outlined text-sm align-middle text-warning" >monetization_on</span> Or bonus</label>
                                            <input class="form-control" type="number" id="room_door_boss_gold_${rIndex}_${oIndex}" value="${outcome.bossRewardGold || 0}" min="0" onchange="updateDoorBossField(${rIndex}, ${oIndex}, 'bossRewardGold', this.value)">
                                        </div>
                                        <div class="flex-1" >
                                            <label class="text-muted text-xs" ><span class="material-symbols-outlined text-sm align-middle text-violet-500" >blur_on</span> XP Spirit. bonus</label>
                                            <input class="form-control" type="number" id="room_door_boss_xp_${rIndex}_${oIndex}" value="${outcome.bossRewardSpiritualXp || 0}" min="0" onchange="updateDoorBossField(${rIndex}, ${oIndex}, 'bossRewardSpiritualXp', this.value)">
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
                                    const rarityColor = getRarityColor(eq.rarity);
                                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                    return `<span class="flex items-center gap-1" ><span class="material-symbols-outlined${extraClass}" style="font-size:1.1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span></span>`;
                                };

                                rewardValueHtml = `
                                    <div class="custom-select-wrapper" id="altar_rewardval_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger custom-select-larger p-2 text-sm rounded-lg" onclick="toggleAltarRewardValSelect(${rIndex}, ${oIndex})" >
                                            <span class="cs-label w-full mr-2" id="altar_rewardval_label_${rIndex}_${oIndex}" >
                                                ${getEqHtml(selEq)}
                                            </span>
                                            <span class="material-symbols-outlined" >expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_rewardval_options_${rIndex}_${oIndex}">
                                            ${pageState.allEquipments.map(eq => `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardValue', ${eq.id})">
                                                    ${getEqHtml(eq)}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            } else {
                                rewardValueHtml = `<input class="form-control p-2 text-sm mt-1" type="number" value="${outcome.altarRewardValue}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardValue', this.value)" min="1">`;
                            }

                            extraHtml = `
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-orange-500 block mb-2" style="color: #f97316;" >Configuration du Sacrifice</label>
                                    <div class="grid grid-cols-2 gap-2 mt-2 items-end" >
                                        <div class="min-w-0" >
                                            <label class="text-muted text-xs" >Spiritualité acceptée</label>
                                            <div class="custom-select-wrapper" id="altar_spirituality_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${152 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger p-2 text-sm rounded-lg min-w-0" onclick="toggleAltarSpiritualitySelect(${rIndex}, ${oIndex})" >
                                                    <span class="cs-label" id="altar_spirituality_label_${rIndex}_${oIndex}">
                                                        <span class="material-symbols-outlined cs-icon align-middle" style="color: ${getSpiritualiteColor(outcome.altarSpirituality || 'TENEBRES')}; font-size: 1.1rem; margin-right: 4px; flex-shrink: 0;">${getSpiritualiteIcon(outcome.altarSpirituality || 'TENEBRES')}</span>
                                                        <span class="whitespace-nowrap overflow-hidden text-ellipsis block" >${outcome.altarSpirituality || 'Ténèbres'}</span>
                                                    </span>
                                                    <span class="material-symbols-outlined shrink-0" >expand_more</span>
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
                                        <div class="min-w-0" >
                                            <label class="text-muted text-xs" >Type de récompense</label>
                                            <div class="custom-select-wrapper" id="altar_reward_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${151 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger p-2 text-sm rounded-lg min-w-0" onclick="toggleAltarRewardSelect(${rIndex}, ${oIndex})" >
                                                    <span class="cs-label" id="altar_reward_label_${rIndex}_${oIndex}">
                                                        ${outcome.altarRewardType === 'XP' ? '<span class="material-symbols-outlined cs-icon align-middle text-cyan-400 text-lg mr-1 shrink-0" >auto_awesome</span> <span class="whitespace-nowrap overflow-hidden text-ellipsis block" >XP Spiritualité</span>' : outcome.altarRewardType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon align-middle text-violet-500 text-lg mr-1 shrink-0" >redeem</span> <span class="whitespace-nowrap overflow-hidden text-ellipsis block" >Équipement</span>' : '<span class="material-symbols-outlined cs-icon align-middle text-yellow-500 text-lg mr-1 shrink-0" >monetization_on</span> <span class="whitespace-nowrap overflow-hidden text-ellipsis block" >Or (Gold)</span>'}
                                                    </span>
                                                    <span class="material-symbols-outlined shrink-0" >expand_more</span>
                                                </div>
                                                <div class="custom-select-options" id="altar_reward_options_${rIndex}_${oIndex}">
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'GOLD')">
                                                        <span class="material-symbols-outlined cs-icon align-middle text-yellow-500 text-lg mr-1" >monetization_on</span> Or (Gold)
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'XP')">
                                                        <span class="material-symbols-outlined cs-icon align-middle text-cyan-400 text-lg mr-1" >auto_awesome</span> XP Spiritualité
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'ITEM')">
                                                        <span class="material-symbols-outlined cs-icon align-middle text-violet-500 text-lg mr-1" >redeem</span> Équipement
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-span-2" >
                                            <label class="text-muted text-xs" >Valeur de la récompense</label>
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
                            const selAnHtml = selAnomalie ? `<span class="material-symbols-outlined cs-icon align-middle" style="color: ${selAnColor}; font-size: 1.1rem; margin-right: 4px;">${selCatIcon}</span>${selAnomalie.name} <span class="text-muted text-xs ml-1" >(Lvl ${selAnomalie.level || 1})</span>` : 'Aucune anomalie disponible';

                            extraHtml = `
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-yellow-500 block mb-2" style="color: #eab308;" >Anomalie (Trésor)</label>
                                    <div class="custom-select-wrapper" id="altar_treasure_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger p-2 text-sm rounded-lg" onclick="toggleAltarTreasureSelect(${rIndex}, ${oIndex})" >
                                            <span class="cs-label" id="altar_treasure_label_${rIndex}_${oIndex}">
                                                ${selAnHtml}
                                            </span>
                                            <span class="material-symbols-outlined" >expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_treasure_options_${rIndex}_${oIndex}">
                                            ${pageState.allAnomalies.map(an => {
                                let anColor = getSpiritualiteColor(an.spiritualite);
                                return `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'treasureAnomalieId', ${an.id})">
                                                    <span class="material-symbols-outlined cs-icon align-middle" style="color: ${anColor}; font-size: 1.1rem; margin-right: 4px;">${an.category ? (getCategoryIcon(an.category)) : 'star'}</span>${an.name} <span class="text-muted text-xs ml-1" >(Lvl ${an.level || 1})</span>
                                                </div>
                                                `;
                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (outcome.type === 'PIEGE') {
                            extraHtml = `
                                <div class="mt-3 p-3 bg-black/20 rounded-lg border border-dashed border-white/15 w-full" >
                                    <label class="text-xs text-red-400 block mb-2" style="color: #f87171;" >Configuration du Piège</label>
                                    
                                    <div class="mt-2" >
                                        <label class="text-muted text-xs" >Texte du piège</label>
                                        <input class="form-control" type="text" value="${outcome.trapText || ''}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapText', this.value)">
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-2 mt-3" >
                                        <div>
                                            <label class="text-muted text-xs" >Perte PV (% max)</label>
                                            <input class="form-control" type="number" value="${outcome.trapDamageHpPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label class="text-muted text-xs" >Perte Mana (% max)</label>
                                            <input class="form-control" type="number" value="${outcome.trapDamageManaPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label class="text-muted text-xs" >Perte PV (Fixe)</label>
                                            <input class="form-control" type="number" value="${outcome.trapDamageHpFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                        <div>
                                            <label class="text-muted text-xs" >Perte Mana (Fixe)</label>
                                            <input class="form-control" type="number" value="${outcome.trapDamageManaFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                    </div>
                                    
                                    <div class="flex-center flex justify-between mt-4 p-3 bg-black/20 border border-amber-500/30 rounded-lg" >
                                        <div class="flex flex-col gap-1" >
                                            <span class="flex-center text-sm font-medium text-slate-50 gap-1" >
                                                <span class="material-symbols-outlined text-amber-500 text-lg" >auto_fix</span> Option Corde d'évitement
                                            </span>
                                            <span class="text-muted text-xs" >Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                                        </div>
                                        <label class="flex-shrink-0 relative block m-0" style="width: 40px; height: 24px;" >
                                            <input class="opacity-0 w-0 h-0" type="checkbox" style="opacity: 0; width: 0; height: 0;" ${outcome.trapHasRopeOption ? 'checked' : ''} onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
                                            <span class="absolute" style="cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${outcome.trapHasRopeOption ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}; transition: .3s; border-radius: 24px;">
                                                <span class="absolute" style="content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; transform: ${outcome.trapHasRopeOption ? 'translateX(16px)' : 'translateX(0)'}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            `;
                        }

                        outcomesHtml += `
                            <div class="flex flex-col bg-black/30 p-2 rounded-md border border-white/5" >
                                <div class="flex-between items-center" >
                                    <span class="flex-center text-sm text-slate-50 gap-1" >
                                        <span class="material-symbols-outlined" style="color: ${conf.color}; font-size: 1.1rem;">${conf.icon}</span> 
                                        ${conf.text} 
                                        <span class="text-amber-400 text-xs ml-1" >(${outcome.probability}%)</span>
                                    </span>
                                    <button class="text-error btn-icon" type="button" onclick="removeDoorOutcome(${rIndex}, ${oIndex})" ><span class="material-symbols-outlined icon-sm" >close</span></button>
                                </div>
                                ${extraHtml}
                            </div>
                        `;
                    });
                }
                outcomesHtml += `</div>
                    <div class="flex gap-2 mt-2 items-stretch" >
                        <div class="custom-select-wrapper" id="room_door_outcome_wrapper_${rIndex}" style="flex: 2; z-index: ${50 - rIndex}; margin: 0;">
                            <div class="custom-select-trigger" onclick="toggleDoorOutcomeSelect(${rIndex})" >
                                <span class="cs-label" id="room_door_outcome_label_${rIndex}">
                                    <span class="material-symbols-outlined cs-icon text-error align-middle text-lg mr-1" >skull</span> Boss
                                </span>
                                <span class="material-symbols-outlined" >expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_door_outcome_options_${rIndex}">
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'BOSS', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #ef4444; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>skull</span> Boss')">
                                    <span class="material-symbols-outlined cs-icon text-error align-middle text-lg mr-1" >skull</span> Boss
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'ITEM', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>redeem</span> Item')">
                                    <span class="material-symbols-outlined cs-icon align-middle text-violet-500 text-lg mr-1" >redeem</span> Item
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'AUTEL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f97316; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>hand_bones</span> Autel Sacrificiel')">
                                    <span class="material-symbols-outlined cs-icon align-middle text-orange-500 text-lg mr-1" >hand_bones</span> Autel Sacrificiel
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'TRESOR', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>crown</span> Trésor')">
                                    <span class="material-symbols-outlined cs-icon align-middle text-yellow-500 text-lg mr-1" >crown</span> Trésor
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'PIEGE', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f87171; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>bomb</span> Piège')">
                                    <span class="material-symbols-outlined cs-icon align-middle text-red-400 text-lg mr-1" >bomb</span> Piège
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'RIEN', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>door_front</span> Rien')">
                                    <span class="material-symbols-outlined cs-icon text-muted align-middle text-lg mr-1" >door_front</span> Rien
                                </div>
                            </div>
                            <input type="hidden" id="room_door_outcome_${rIndex}" value="BOSS">
                        </div>
                        <input class="form-control flex-1 min-w-60" type="number" id="room_door_prob_${rIndex}" placeholder="Prob (%)" step="1" min="0" max="100">
                        <button class="btn-room-add-treasure" type="button" onclick="addDoorOutcome(${rIndex})" >
                            <span class="material-symbols-outlined text-lg" >add</span>
                        </button>
                    </div>
                `;

                contentHtml = `
                    <div class="mt-4" >
                        <label class="text-xs text-muted" >Texte de l'événement</label>
                        <input class="form-control" type="text" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${outcomesHtml}
                `;
            }
        }

        div.innerHTML = `
            <button class="delete-btn" type="button" onclick="removeRoom(${rIndex})" ><span class="material-symbols-outlined" >delete</span></button>
            <div class="flex-center" style="font-family: 'Outfit'; font-weight: 600; color: ${headerColor}; gap: 0.5rem;">
                <span class="material-symbols-outlined icon-md" >${headerIcon}</span>
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
    pageState.allAnomalies = await api.loadAnomalies({ source: '/api/anomalies/all', deduplicate: true });
    renderRooms();
}

async function loadEquipments() {
    try {
        let merged = await window.api.loadEquipments({ sources: ['/api/shop/templates', '/api/equipments/all'] });

        // Sort by rarity, then name
        const rarityOrder = { 'MAUDIT': 1, 'RELIQUE': 2, 'EPIQUE': 3, 'LEGENDAIRE': 4, 'MYTHIQUE': 5, 'RARE': 6, 'INHABITUEL': 7, 'COMMUN': 8 };
        pageState.allEquipments = merged.sort((a, b) => {
            const rNameA = getRarityName(a.rarity);
            const rNameB = getRarityName(b.rarity);
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

window.toggleMonsterSecretSelect = function () {
    document.getElementById('mListSecretFilterWrapper').classList.toggle('open');
};

window.selectMonsterSecretOption = function (val, label, icon, color) {
    document.getElementById('monsterSecretFilter').value = val;
    document.getElementById('mListSecretFilterTrigger').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span class="flex-1 text-left" >${label}</span> <span class="material-symbols-outlined text-muted text-lg pointer-events-none" >expand_more</span>`;
    document.getElementById('mListSecretFilterWrapper').classList.remove('open');
    window.renderMonstersList();
};

window.selectFilterLevelOption = function (val, label, color, icon) {
    document.getElementById('monsterLevelFilter').value = val;
    document.getElementById('mLevelFilterTrigger').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span class="flex-1 text-center" >${label}</span>`;
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
    document.getElementById('mSortTrigger').innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem; ${extraStyle}">${icon}</span> <span class="flex-1 text-left" >${label}</span> <span class="material-symbols-outlined text-muted text-lg pointer-events-none" >expand_more</span>`;
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

    const searchSecret = document.getElementById('monsterSecretFilter');
    if (searchSecret && searchSecret.value) {
        if (searchSecret.value === 'Aucun') {
            filtered = filtered.filter(m => !m.nativeSecret || m.nativeSecret === '');
        } else {
            filtered = filtered.filter(m => m.nativeSecret === searchSecret.value);
        }
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

    let html = '';
    filtered.forEach(m => {
        let secretBadgeHtml = getSecretBadgeHtml(m);

        let mutationsHtml = '';
        if (m.mutations && m.mutations.length > 0) {
            mutationsHtml = `<div class="flex-shrink-0" style="display: flex; flex-direction: column; gap: 0.5rem; border-left: 1px solid rgba(255, 255, 255, 0.1); padding-left: 0.8rem; margin-left: 0.8rem; justify-content: center;">`;
            m.mutations.forEach(mut => {
                mutationsHtml += `<div class="flex-center" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="width: 32px; height: 32px; border-radius: 6px; background: rgba(255,255,255,0.05); justify-content: center; border: 1px solid ${mut.color || '#e879f9'}; cursor: help;">
                    <template class="tooltip-data" >
                        <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${mut.color || '#e879f9'}; border-bottom: 1px solid ${mut.color || '#e879f9'}; padding-bottom: 4px;">${mut.nom} (Lvl ${mut.level || 1})</div>
                        <div class="italic text-slate-300 mt-2 leading-relaxed" style="width: max-content; max-width: 500px; white-space: normal !important; word-wrap: break-word;">${mut.description}</div>
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

        html += `
            <div class="monster-card" >
                <div class="absolute" style="top: -0.8rem; left: -0.8rem; display: flex; gap: 0.4rem; z-index: 10;">
                    ${secretBadgeHtml}
                    <div class="monster-level-badge" style="position: relative; top: 0; left: 0; margin: 0;">Lvl ${m.level || 1}</div>
                </div>
                
                <div class="flex-between items-start gap-2 mb-2" >
                    <div class="monster-card-title mb-0" >${m.name}</div>
                    <div class="flex-shrink-0 flex gap-1" >
                        <button class="btn-icon p-1 text-info" onclick="editMonster(${m.id})" title="Modifier">
                            <span class="material-symbols-outlined" >edit</span>
                        </button>
                        <button class="btn-icon p-1 text-error" onclick="deleteMonster(${m.id})" title="Supprimer" >
                            <span class="material-symbols-outlined" >delete</span>
                        </button>
                    </div>
                </div>

                <div class="flex items-stretch" >
                    <div class="flex-1 min-w-0 flex flex-col" >
                        <div class="text-xs text-muted mb-2" >${m.description || ''}</div>
                        <div class="flex gap-2 flex-wrap mb-2" >
                            ${mTypeName && mTypeName !== 'NORMAL' ? `<span class="text-error badge-danger inline-flex items-center gap-1 cursor-help" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" ><template class="tooltip-data" ><div class="font-bold text-base mb-1 text-red-500 border-b border-red-500 pb-1" >${mTypeLabel}</div><div class="italic text-slate-300 mt-2 max-w-[350px] leading-relaxed whitespace-normal break-words" >${mTypeDesc}</div></template><span class="material-symbols-outlined text-sm" >${mTypeIcon}</span>${mTypeLabel}</span>` : ''}
                            ${mBehaviorName && mBehaviorName !== 'NORMAL' ? `<span class="badge-violet inline-flex items-center gap-1 cursor-help" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" ><template class="tooltip-data" ><div class="font-bold text-base mb-1 text-violet-500 border-b border-violet-500 pb-1" >${mBehaviorLabel}</div><div class="italic text-slate-300 mt-2 max-w-[350px] leading-relaxed whitespace-normal break-words" >${mBehaviorDesc}</div></template><span class="material-symbols-outlined text-sm" >${mBehaviorIcon}</span>${mBehaviorLabel}</span>` : ''}
                        </div>
                        <div class="monster-card-stats" >
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-pink-500" >favorite</span> PV: ${m.healthMax}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-cyan-400" >water_drop</span> Mana: ${m.manaMax || 0}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-pink-400" >healing</span> R. PV: ${m.regenHp || 0}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-sky-300" >opacity</span> R. MP: ${m.regenMana || 0}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-amber-500" >bolt</span> Vit: ${m.speed}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-red-500 icon-sm" >gps_fixed</span> Crit: ${m.crit || 0}%</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-rose-500" >fitness_center</span> For: ${m.strength}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-purple-500" >auto_awesome</span> Pui: ${m.power}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-blue-500" >shield</span> Arm: ${m.armor}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-success icon-sm" >shield</span> Rés: ${m.resistance}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-amber-500" >monetization_on</span> Or: ${m.rewardGold}</span>
                            <span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-amber-300" >stars</span> XP: ${m.rewardExp}</span>
                            ${m.startShield > 0 ? `<span class="flex-center gap-1" ><span class="material-symbols-outlined text-base text-info" >security</span> Shield: ${m.startShield}</span>` : ''}
                        </div>
                    </div>
                    ${mutationsHtml}
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
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
            if (lvlTrigger) lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">star</span> <span class="flex-1 text-center" >${lvl}</span>`;

            document.getElementById('mHp').value = m.healthMax;
            document.getElementById('mRegenHp').value = m.regenHp || 0;
            document.getElementById('mStartHpPct').value = m.startHpPct !== undefined && m.startHpPct !== 0 ? m.startHpPct : 100;
            document.getElementById('mMana').value = m.manaMax || 0;
            document.getElementById('mRegenMana').value = m.regenMana || 0;
            document.getElementById('mStartManaPct').value = m.startManaPct !== undefined && m.startManaPct !== 0 ? m.startManaPct : 100;
            document.getElementById('mStartShield').value = m.startShield || 0;
            document.getElementById('mStartShieldDuration').value = m.startShieldDuration || -1;
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
            document.getElementById('btnCancelMonster').classList.remove('hidden');
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
        lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted text-lg" >star</span> <span class="flex-1 text-center" >1</span>`;
    }
    const secretTrigger = document.getElementById('mNativeSecretWrapper')?.querySelector('.cs-label');
    if (secretTrigger) {
        secretTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted text-lg" >close</span>Aucun (Optionnel)`;
    }
    pageState.selectedMutationIds = [];
    renderMutationsSelector();
    document.getElementById('btnSubmitMonster').textContent = "Créer le monstre";
    document.getElementById('btnCancelMonster').classList.add('hidden');
    document.getElementById('monsterFormPanel').classList.remove('editing-glow');
    window.selectMonsterType('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
    window.selectMonsterBehavior('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
};

async function deleteMonster(id) {
    const confirmed = await window.showModal({
        title: 'Suppression',
        body: 'Voulez-vous vraiment supprimer ce monstre ?',
        icon: 'warning',
        confirmText: 'Supprimer'
    });
    if (!confirmed) return;
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

/**
 * Scan all rooms of a dungeon and collect the names of anomalies that
 * can be obtained (rewards from alterations, merchant stock, door outcomes).
 * Items *required* from the player (alterationRequiredItem) are excluded.
 * Returns a deduplicated array of anomaly names.
 */
function collectDungeonAnomalies(dungeon) {
    const names = new Set();
    if (!dungeon.salles) return [];
    dungeon.salles.forEach(s => {
        // Alteration reward (SPECIAL_ITEM)
        if (s.alterationSpecialItemReward) {
            names.add(s.alterationSpecialItemReward);
        }
        // Merchant and Strange Door ITEM loot tables
        if (s.lootTable) {
            s.lootTable.forEach(entry => {
                if (entry.specialItemName) {
                    names.add(entry.specialItemName);
                }
            });
        }
        // Strange Door -> TRESOR outcome: anomalie stored by ID
        if (s.eventSubType === 'PORTE_ETRANGE' && s.doorOutcomes) {
            let outcomes = s.doorOutcomes;
            if (typeof outcomes === 'string') {
                try { outcomes = JSON.parse(outcomes); } catch (e) { outcomes = []; }
            }
            outcomes.forEach(outcome => {
                if (outcome.type === 'TRESOR' && outcome.treasureAnomalieId) {
                    const an = pageState.allAnomalies.find(a => a.id == outcome.treasureAnomalieId);
                    if (an) names.add(an.name);
                }
            });
        }
    });
    return Array.from(names);
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

    let html = '';
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
        if (alterations > 0) eventDetails += `<span class="text-violet-500 inline-flex items-center gap-1 mr-2" ><span class="material-symbols-outlined text-sm" >blur_on</span>${alterations}</span>`;
        if (rencontres > 0) eventDetails += `<span class="text-success inline-flex items-center gap-1 mr-2" ><span class="material-symbols-outlined text-sm" >storefront</span>${rencontres}</span>`;
        if (pieges > 0) eventDetails += `<span class="text-red-400 inline-flex items-center gap-1 mr-2" ><span class="material-symbols-outlined text-sm" >warning</span>${pieges}</span>`;
        if (portes > 0) eventDetails += `<span class="text-amber-400 inline-flex items-center gap-1 mr-2" ><span class="material-symbols-outlined text-sm" >door_front</span>${portes}</span>`;

        let secretMeta = { icon: "key", color: "#f59e0b" };
        if (d.requiredSecret) {

            secretMeta = window.DEFAULT_SECRETS_META.find(s => s.name === d.requiredSecret) || secretMeta;
        }

        html += `
            <div class="monster-card" >
                <div class="absolute" style="top: -0.8rem; left: -0.8rem; display: flex; gap: 0.4rem; z-index: 10;">
                    ${d.requiredSecret ? `<div class="flex-center" title="${d.requiredSecret}" style="background: rgba(15, 23, 42, 0.9); color: ${secretMeta.color}; padding: 0.2rem 0.4rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); border: 1px solid ${secretMeta.color}60; justify-content: center;"><span class="material-symbols-outlined text-lg" >${secretMeta.icon}</span></div>` : ''}
                    <div class="monster-level-badge" style="position: relative; top: 0; left: 0; margin: 0;">Lvl ${d.recommendedLevel || 1}</div>
                </div>
                <div class="flex-between items-start gap-2 mb-2" >
                    <div class="monster-card-title mb-0" >${d.name}</div>
                    <div class="flex-shrink-0 flex gap-1" >
                        ${index > 0 ? `<button class="btn-icon p-1 text-success" onclick="moveDungeonOrder(${d.id}, -1)" title="Monter" >
                            <span class="material-symbols-outlined" >arrow_upward</span>
                        </button>` : ''}
                        ${index < filtered.length - 1 ? `<button class="btn-icon p-1 text-slate-300" onclick="moveDungeonOrder(${d.id}, 1)" title="Descendre">
                            <span class="material-symbols-outlined text-amber" >arrow_downward</span>
                        </button>` : ''}
                        <button class="btn-icon p-1 text-info" onclick="editDungeon(${d.id})" title="Modifier">
                            <span class="material-symbols-outlined" >edit</span>
                        </button>
                        <button class="btn-icon p-1 text-error" onclick="deleteDungeon(${d.id})" title="Supprimer" >
                            <span class="material-symbols-outlined" >delete</span>
                        </button>
                    </div>
                </div>
                <div class="text-xs text-muted mb-2" >${d.description || ''}</div>
                <div class="text-sm text-slate-50 mt-2 pt-2 border-t border-white/10 grid gap-1" >
                    ${d.requiredSecret ? `<div class="flex-center text-muted gap-1" ><span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${secretMeta.color};">${secretMeta.icon}</span> <span><strong style="color:${secretMeta.color};">${d.requiredSecret}</strong> (Lvl ${d.requiredSecretLevel || 1})</span></div>` : ''}
                    <div><span class="font-semibold" >Salles totales :</span> ${totalSalles}</div>
                    ${combats > 0 ? `<div class="flex-center text-error ml-2 gap-1" >
                        <span class="material-symbols-outlined icon-sm" >swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                    </div>` : ''}
                    ${bosses > 0 ? `<div class="flex-center text-red-600 ml-2 gap-1" >
                        <span class="material-symbols-outlined icon-sm" >skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                    </div>` : ''}
                    ${treasures > 0 ? `<div class="flex-center text-amber-500 ml-2 gap-1" >
                        <span class="material-symbols-outlined icon-sm" >shopping_bag</span> Trésors : ${treasures}
                    </div>` : ''}
                    ${eventDetails ? `<div class="flex-center text-purple ml-2 gap-1 flex-wrap" >Événements : ${eventDetails}</div>` : ''}
                    ${(() => {
                const anomalyNames = collectDungeonAnomalies(d);
                if (anomalyNames.length === 0) return '';
                const badges = anomalyNames.map(name => {
                    const an = pageState.allAnomalies.find(a => a.name === name);
                    const color = an ? getSpiritualiteColor(an.spiritualite) : '#d946ef';
                    const icon = an ? getCategoryIcon(an.category) : 'star';
                    const tooltipHtml = getAnomalyTooltipHTML(an, name);
                    return `<span class="anomaly-badge" style="border-color:${color}; background:${color}20; color:${color}; cursor:help; font-size:0.75rem; padding:0.15rem 0.4rem; gap:0.2rem;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipHtml.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined text-sm" >${icon}</span>${name}
                            </span>`;
                }).join('');
                return `<div class="mt-1 pt-1 border-t border-white/5 flex flex-wrap gap-1 items-center" >
                            <span class="text-muted text-xs shrink-0" ><span class="material-symbols-outlined text-sm align-middle" >auto_awesome</span> Anomalies :</span>
                            ${badges}
                        </div>`;
            })()}
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
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
            document.getElementById('btnCancelDungeon').classList.remove('hidden');
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
    document.getElementById('btnCancelDungeon').classList.add('hidden');
    document.getElementById('dungeonFormPanel').classList.remove('editing-glow');
};

async function deleteDungeon(id) {
    const confirmed = await window.showModal({
        title: 'Suppression',
        body: 'Voulez-vous vraiment supprimer ce donjon ?',
        icon: 'warning',
        confirmText: 'Supprimer'
    });
    if (!confirmed) return;
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

window.selectMerchantSpecial = function (rIndex, value, labelStr, color = '#d946ef', icon = 'star', level = 1) {
    const select = document.getElementById(`room_merchant_special_${rIndex}`);
    if (select) select.value = value;

    const label = document.getElementById(`room_merchant_special_label_${rIndex}`);
    if (label) {
        if (!value) {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" >diamond</span> ${labelStr}`;
        } else {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${labelStr} <span class="text-muted text-xs ml-1" >(Lvl ${level})</span>`;
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

window.selectMerchantCost = function (rIndex, value, labelStr, color = '#f472b6', icon = 'star', level = 1) {
    const select = document.getElementById(`room_merchant_cost_item_${rIndex}`);
    if (select) select.value = value;

    const label = document.getElementById(`room_merchant_cost_label_${rIndex}`);
    if (label) {
        if (!value) {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" >star</span> ${labelStr}`;
        } else {
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">${icon}</span> ${labelStr} <span class="text-muted text-xs ml-1" >(Lvl ${level})</span>`;
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

    if (field !== 'trapHasRopeOption') {
        renderRooms();
    }
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
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon text-error" >pest_control</span> ${label} <span class="text-muted text-xs ml-1" >(Lvl ${level})</span>`;
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
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" >pest_control</span> Sélectionner un boss...`;

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

    if (val <= 0) { showNotif('La valeur doit être positive.', true); return; }
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
                <button type="button" class="btn-icon text-info p-1" onclick="editMutation(${mut.id})" title="Modifier">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="btn-icon text-error p-1" onclick="deleteMutation(${mut.id})" title="Supprimer">
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
    document.getElementById('btnCancelMutation').classList.remove('hidden');
    document.getElementById('mutationFormPanel').classList.add('editing-glow');
    document.getElementById('mutationFormPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteMutation = async (id) => {
    const confirmed = await window.showModal({
        title: 'Suppression',
        body: 'Voulez-vous vraiment supprimer cette mutation ?',
        icon: 'warning',
        confirmText: 'Supprimer'
    });
    if (!confirmed) return;
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
    document.getElementById('btnCancelMutation').classList.add('hidden');
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
        container.innerHTML = `<span class="text-sm font-italic text-muted" >Aucune mutation disponible. Créez-en une d'abord.</span>`;
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
            <span class="text-sm text-slate-50" >${mut.nom} <span class="opacity-70 text-xs" >(Niv. ${mut.level || 1})</span></span>
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
    if (menu.classList.contains('hidden')) {
        document.querySelectorAll('.custom-combobox-menu').forEach(el => el.classList.add('hidden'));
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
};

window.selectBuffType = function (rIndex, value, label, icon, iconColorClass) {
    document.getElementById(`room_boss_buff_type_${rIndex}`).value = value;
    document.getElementById(`room_boss_buff_label_${rIndex}`).innerHTML = `<span class="material-symbols-outlined ${iconColorClass} text-lg" >${icon}</span> <span>${label}</span>`;
    document.getElementById(`room_boss_buff_menu_${rIndex}`).classList.add('hidden');
};

document.addEventListener('click', function (e) {
    if (!e.target.closest('.custom-combobox')) {
        document.querySelectorAll('.custom-combobox-menu').forEach(el => el.classList.add('hidden'));
    }
});

// Global click listener for custom-select handled by ui.js

// Intercept assignments to dRequiredSecret to update the UI
const inputEl = document.getElementById('dRequiredSecret');
if (inputEl) {
    const originalSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    Object.defineProperty(inputEl, 'value', {
        set: function (val) {
            originalSet.call(this, val);
            const wrapper = this.closest('.custom-select-wrapper');
            if (wrapper) {
                const labelEl = wrapper.querySelector('.cs-label');
                const options = wrapper.querySelectorAll('.custom-option');
                let found = false;
                options.forEach(opt => {
                    if (opt.getAttribute('data-value') === (val || '')) {
                        labelEl.innerHTML = opt.innerHTML;
                        found = true;
                    }
                });
                if (!found && val) {
                    labelEl.innerHTML = `<span class="material-symbols-outlined cs-icon text-warning" >key</span> ${val}`;
                } else if (!val && !found) {
                    labelEl.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" >close</span> Aucun (Optionnel)`;
                }
            }
        },
        get: function () {
            return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(this);
        }
    });
}

// Intercept assignments to mNativeSecret to update the UI
const mInputEl = document.getElementById('mNativeSecret');
if (mInputEl) {
    const originalSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    Object.defineProperty(mInputEl, 'value', {
        set: function (val) {
            originalSet.call(this, val);
            const wrapper = this.closest('.custom-select-wrapper');
            if (wrapper) {
                const labelEl = wrapper.querySelector('.cs-label');
                const options = wrapper.querySelectorAll('.custom-option');
                let found = false;
                options.forEach(opt => {
                    if (opt.getAttribute('data-value') === (val || '')) {
                        labelEl.innerHTML = opt.innerHTML;
                        found = true;
                    }
                });
                if (!found && val) {
                    labelEl.innerHTML = `<span class="material-symbols-outlined cs-icon text-warning" >explore</span> ${val}`;
                } else if (!val && !found) {
                    labelEl.innerHTML = `<span class="material-symbols-outlined cs-icon text-muted" >close</span> Aucun (Optionnel)`;
                }
            }
        },
        get: function () {
            return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(this);
        }
    });
}