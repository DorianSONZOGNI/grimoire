import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';


export const pageState = {
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

export const SECRETS_META = [
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

window.cancelDungeonEdit = function () {
    pageState.editingDungeonId = null;
    document.getElementById('dungeonForm').reset();
    pageState.selectedRooms = [];
    renderRooms();
    document.getElementById('btnSubmitDungeon').textContent = "Créer le donjon";
    document.getElementById('btnCancelDungeon').classList.add('hidden');
    document.getElementById('dungeonFormPanel').classList.remove('editing-glow');
};

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

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }
});

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

export const inputEl = document.getElementById('dRequiredSecret');

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

export const mInputEl = document.getElementById('mNativeSecret');

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