let editingMonsterId = null;
const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau Gauche', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau Droit', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' }
};

const RARITY_COLORS = {
    COMMUN: '#94a3b8',
    RARE: '#3b82f6',
    LEGENDAIRE: '#f59e0b',
    EPIQUE: '#c084fc',
    RELIQUE: '#ef4444'
};

let editingDungeonId = null;
let allMonsters = [];
let allEquipments = [];
let allAnomalies = [];
let selectedRooms = [];

document.addEventListener('DOMContentLoaded', () => {
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
            healthMax: parseInt(document.getElementById('mHp').value),
            manaMax: parseInt(document.getElementById('mMana').value),
            speed: parseInt(document.getElementById('mSpeed').value),
            crit: parseInt(document.getElementById('mCrit').value),
            strength: parseInt(document.getElementById('mStrength').value),
            power: parseInt(document.getElementById('mPower').value),
            armor: parseInt(document.getElementById('mArmor').value),
            resistance: parseInt(document.getElementById('mResist').value),
            rewardGold: parseInt(document.getElementById('mGold').value),
            rewardExp: parseInt(document.getElementById('mXp').value),
            monsterType: document.getElementById('mType').value,
            behavior: document.getElementById('mBehavior').value
        };

        try {
            let url = '/api/admin/pve/monsters';
            let method = 'POST';

            if (editingMonsterId) {
                url = `/api/admin/pve/monsters/${editingMonsterId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monstre)
            });
            if (res.ok) {
                showNotif(editingMonsterId ? 'Monstre modifié avec succès' : 'Monstre créé avec succès');
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

        if (selectedRooms.length === 0) {
            showNotif("Veuillez ajouter au moins une salle au donjon.", true);
            return;
        }

        for (let i = 0; i < selectedRooms.length; i++) {
            const r = selectedRooms[i];
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
            salles: selectedRooms.map(r => {
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

            if (editingDungeonId) {
                url = `/api/admin/pve/dungeons/${editingDungeonId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(donjon)
            });
            if (res.ok) {
                showNotif(editingDungeonId ? 'Donjon modifié avec succès' : 'Donjon créé avec succès');
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
        selectedRooms.push({ type: 'COMBAT', monsters: [] });
    } else if (type === 'BOSS') {
        selectedRooms.push({
            type: 'BOSS',
            monsters: [],
            globalBuffs: [],
            bossRewardSpiritualXp: 0,
            bossRewardGold: 0
        });
    } else if (type === 'TREASURE') {
        selectedRooms.push({ type: 'TREASURE', treasureGold: 50, treasureExp: 10 });
    } else if (type === 'ALTERATION') {
        selectedRooms.push({ type: 'EVENT', eventSubType: 'ALTERATION', eventText: 'Une aura mystérieuse émane des murs...', alterationType: 'VIE_XP', alterationHpAmount: 0, alterationExpAmount: 0, alterationRewardType: 'SPIRITUAL_XP', alterationSpiritualXpReward: 0, alterationSpecialItemReward: null, alterationRequiredItem: null });
    } else if (type === 'RENCONTRE') {
        selectedRooms.push({ type: 'EVENT', eventSubType: 'RENCONTRE', eventText: 'Un marchand ambulant vous interpelle...', lootTable: [] });
    } else if (type === 'PIEGE') {
        selectedRooms.push({ type: 'EVENT', eventSubType: 'PIEGE', eventText: 'Un piège se déclenche !', trapType: 'PV', trapAmount: 10, trapHasRopeOption: false });
    } else if (type === 'PORTE_ETRANGE') {
        selectedRooms.push({ type: 'EVENT', eventSubType: 'PORTE_ETRANGE', eventText: 'Une porte étrange se dresse devant vous...', doorOutcomes: [] });
    }
    renderRooms();
};

window.removeRoom = function (index) {
    selectedRooms.splice(index, 1);
    renderRooms();
};

window.addMonsterToRoom = function (roomIndex) {
    const select = document.getElementById(`room_monster_select_${roomIndex}`);
    if (select && select.value) {
        selectedRooms[roomIndex].monsters.push(parseInt(select.value));
        renderRooms();
    }
};

window.removeMonsterFromRoom = function (roomIndex, monsterIndex) {
    selectedRooms[roomIndex].monsters.splice(monsterIndex, 1);
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
        label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #ef4444;">pest_control</span> ${monsterName} (Lvl ${monsterLvl})`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined" style="color: #94a3b8; font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined" style="color: #94a3b8; font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
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
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem; ${transformStr}">${icon}</span> <span style="flex:1; text-align:left;">${label}</span> <span class="material-symbols-outlined" style="color: #94a3b8; font-size: 1.2rem; pointer-events: none;">expand_more</span>`;
    }
    const wrapper = document.getElementById('mSortWrapper');
    if (wrapper) wrapper.classList.remove('open');

    if (window.renderMonstersList) window.renderMonstersList();
};

window.updateRoomField = function (roomIndex, field, value) {
    selectedRooms[roomIndex][field] = value;
};

function renderRooms() {
    const currentScroll = window.scrollY;

    const container = document.getElementById('selectedRoomsContainer');
    const emptyMsg = document.getElementById('emptyRoomsMsg');

    // Remove all room elements except the empty message
    const elements = container.querySelectorAll('.room-card');
    elements.forEach(c => c.remove());

    if (selectedRooms.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    selectedRooms.forEach((room, rIndex) => {
        let optionsHtml = '';
        allMonsters.forEach(m => {
            optionsHtml += `<div class="custom-option" data-value="${m.id}" onclick="selectMonsterOption(${rIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})"><span class="material-symbols-outlined cs-icon" style="color: #ef4444;">pest_control</span> ${m.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${m.level || 1})</span></div>`;
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
                monstersHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun monstre dans cette salle.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;"><span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px; color: #94a3b8;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch; position: relative;">
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleMonsterSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">pest_control</span> Sélectionner un monstre...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button type="button" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);" onclick="addMonsterToRoom(${rIndex})" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.5)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.3)';">
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
                monstersHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun monstre configuré pour le boss.</div>`;
            } else {
                room.monsters.forEach((mId, mIndex) => {
                    const m = allMonsters.find(x => x.id === mId);
                    if (m) {
                        monstersHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;"><span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px; color: #94a3b8;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                <button type="button" onclick="removeMonsterFromRoom(${rIndex}, ${mIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            monstersHtml += `</div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch; position: relative;">
                    <div class="custom-select-wrapper" id="room_select_wrapper_${rIndex}" style="flex: 1; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleMonsterSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_select_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">pest_control</span> Sélectionner un boss/monstre...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_select_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="room_monster_select_${rIndex}" value="">
                    </div>
                    <button type="button" style="background: linear-gradient(135deg, #e11d48, #be123c); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addMonsterToRoom(${rIndex})">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span> Ajouter
                    </button>
                </div>
            `;

            // Global Buffs HTML
            if (!room.globalBuffs) room.globalBuffs = [];
            let buffsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
            if (room.globalBuffs.length === 0) {
                buffsHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun buff global configuré.</div>`;
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
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                            <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">upgrade</span>
                                ${buffLabel}
                            </span>
                            <button type="button" onclick="removeGlobalBuffFromRoomBoss(${rIndex}, ${bIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                        </div>
                    `;
                });
            }
            buffsHtml += `</div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: flex-end; position: relative; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 120px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Type de buff</label>
                    <select id="room_boss_buff_type_${rIndex}" class="form-control" style="font-size: 0.8rem; width: 100%;">
                        <option value="HP_PCT">+ PV Max (%)</option>
                        <option value="SHIELD_PCT">Bouclier (% PV)</option>
                        <option value="ARMOR_FLAT">+ Armure</option>
                        <option value="RESIST_FLAT">+ Résistance</option>
                        <option value="BURN_ON_HIT">Brûlure au touché</option>
                        <option value="POISON_ON_HIT">Poison au touché</option>
                    </select>
                </div>
                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Stat (Valeur)</label>
                    <input type="number" id="room_boss_buff_val_${rIndex}" class="form-control" style="width: 100%;" value="10">
                </div>
                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Durée (Tours)</label>
                    <input type="number" id="room_boss_buff_dur_${rIndex}" class="form-control" style="width: 100%;" value="4">
                </div>
                <button type="button" style="height: 38px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addGlobalBuffToRoomBoss(${rIndex})">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                </button>
            </div>`;

            contentHtml = `
                ${monstersHtml}
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.15);">
                    <label style="font-size: 0.8rem; color: #3b82f6;">Buffs Globaux du Boss</label>
                    ${buffsHtml}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.15);">
                    <label style="font-size: 0.8rem; color: #e11d48; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.6rem;">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">emoji_events</span>
                        Récompenses de fin de combat (Boss vaincu)
                    </label>
                    <div style="display: flex; gap: 1rem;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; color: #8b5cf6; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 0.9rem;">blur_on</span>
                                XP Spiritualité
                            </label>
                            <input type="number" class="form-control" min="0" value="${room.bossRewardSpiritualXp || 0}" onchange="updateRoomField(${rIndex}, 'bossRewardSpiritualXp', parseInt(this.value) || 0)">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; color: #f59e0b; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 0.9rem;">paid</span>
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
                lootHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun loot configuré.</div>`;
            } else {
                room.lootTable.forEach((loot, lIndex) => {
                    const eq = allEquipments.find(x => x.id === loot.equipmentId);
                    if (eq) {
                        const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                        const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                        const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                        lootHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;"><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span style="color:#94a3b8; font-size:0.8rem;">(${loot.probability}%)</span></span>
                                <button type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    }
                });
            }
            lootHtml += `</div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch; position: relative;">
                    <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${100 - rIndex}; margin: 0;">
                        <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                            <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">category</span> Objet...</span>
                            <span class="material-symbols-outlined">expand_more</span>
                        </div>
                        <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
            `;
            allEquipments.forEach(eq => {
                const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                lootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
            });
            lootHtml += `
                        </div>
                        <input type="hidden" id="room_loot_select_${rIndex}" value="">
                    </div>
                    <input type="number" id="room_loot_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="0.1" min="0" max="100">
                    <button type="button" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addLootToRoom(${rIndex})">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                    </button>
                </div>
            `;

            contentHtml = `
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Or</label>
                        <input type="number" class="form-control" value="${room.treasureGold}" onchange="updateRoomField(${rIndex}, 'treasureGold', parseInt(this.value))">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Expérience</label>
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
                        <label style="font-size: 0.8rem; color: #94a3b8;">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div style="margin-top: 0.75rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Possibilité offerte</label>
                        <div class="custom-select-wrapper" id="room_alt_type_wrapper_${rIndex}" style="width: 100%; z-index: ${102 - rIndex}; margin: 0; margin-top: 0.2rem;">
                            <div class="custom-select-trigger" onclick="const w = document.getElementById('room_alt_type_wrapper_${rIndex}'); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== w) el.classList.remove('open'); }); w.classList.toggle('open');" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_alt_type_label_${rIndex}">
                                    ${altType === 'VIE_XP' ? '<span class="material-symbols-outlined cs-icon" style="color: #ef4444;">favorite</span> Don de vie et/ou d\'xp' :
                        (altType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Don d\'un item spécial' :
                            '<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">block</span> Ne rien faire')}
                                </span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_alt_type_options_${rIndex}">
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'VIE_XP'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #ef4444;">favorite</span> Don de vie et/ou d'xp</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'ITEM'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Don d'un item spécial</div>
                                <div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationType', 'RIEN'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">block</span> Ne rien faire</div>
                            </div>
                        </div>
                    </div>
                `;

                if (altType === 'VIE_XP') {
                    const rewType = room.alterationRewardType || 'SPIRITUAL_XP';
                    contentHtml += `
                    <div style="display: flex; gap: 1rem; margin-top: 0.75rem;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem; color: #94a3b8;">Effet PV (+ soin, - perte)</label>
                            <input type="number" class="form-control" value="${room.alterationHpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationHpAmount', parseInt(this.value))">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem; color: #94a3b8;">Effet XP (+ gain, - perte)</label>
                            <input type="number" class="form-control" value="${room.alterationExpAmount || 0}" onchange="updateRoomField(${rIndex}, 'alterationExpAmount', parseInt(this.value))">
                        </div>
                    </div>
                    <div style="margin-top: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px;">
                        <label style="font-size: 0.8rem; color: #fbbf24;">Récompense en échange</label>
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
                            <label style="font-size: 0.8rem; color: #94a3b8;">Gain XP Spiritualité</label>
                            <input type="number" class="form-control" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                        ` : `
                            <label style="font-size: 0.8rem; color: #94a3b8;">Item Spécial Donné en récompense</label>
                            ${(() => {
                            const selAnomalie = allAnomalies.find(a => a.name === room.alterationSpecialItemReward);
                            let selHtml = '<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                const color = selAnomalie.spiritualite === 'TENEBRES' ? '#d946ef' : selAnomalie.spiritualite === 'ESPRIT' ? '#3b82f6' : selAnomalie.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                                <div class="custom-select-wrapper" id="room_alt_reward_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${103 - rIndex};">
                                    <div class="custom-select-trigger" onclick="document.getElementById('room_alt_reward_wrapper_${rIndex}').classList.toggle('open')" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                        <span class="cs-label" id="room_alt_reward_label_${rIndex}">${selHtml}</span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options" style="max-height: 200px; overflow-y: auto;">
                                        ${allAnomalies.map(a => {
                                const color = a.spiritualite === 'TENEBRES' ? '#d946ef' : a.spiritualite === 'ESPRIT' ? '#3b82f6' : a.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationSpecialItemReward', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
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
                        <label style="font-size: 0.8rem; color: #94a3b8;">Item Spécial Requis (que le joueur donne)</label>
                        ${(() => {
                            const selAnomalie = allAnomalies.find(a => a.name === room.alterationRequiredItem);
                            let selHtml = '<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">star</span> Choisir une anomalie...';
                            if (selAnomalie) {
                                const color = selAnomalie.spiritualite === 'TENEBRES' ? '#d946ef' : selAnomalie.spiritualite === 'ESPRIT' ? '#3b82f6' : selAnomalie.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                                selHtml = `<span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>`;
                            }
                            return `
                            <div class="custom-select-wrapper" id="room_alt_req_wrapper_${rIndex}" style="margin-top: 0.2rem; z-index: ${100 - rIndex};">
                                <div class="custom-select-trigger" onclick="document.getElementById('room_alt_req_wrapper_${rIndex}').classList.toggle('open')" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_alt_req_label_${rIndex}">${selHtml}</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" style="max-height: 200px; overflow-y: auto;">
                                    ${allAnomalies.map(a => {
                                const color = a.spiritualite === 'TENEBRES' ? '#d946ef' : a.spiritualite === 'ESPRIT' ? '#3b82f6' : a.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                                return `<div class="custom-option" onclick="updateRoomField(${rIndex}, 'alterationRequiredItem', '${a.name.replace(/'/g, "\\'")}'); renderRooms();"><span class="material-symbols-outlined cs-icon" style="color: ${color};">star</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                            }).join('')}
                                </div>
                            </div>
                            `;
                        })()}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <label style="font-size: 0.8rem; color: #fbbf24;">Récompense (XP Spiritualité)</label>
                        <input type="number" class="form-control" value="${room.alterationSpiritualXpReward || 0}" onchange="updateRoomField(${rIndex}, 'alterationSpiritualXpReward', parseInt(this.value))">
                    </div>
                    `;
                }
            } else if (subType === 'RENCONTRE') {
                headerIcon = 'storefront'; headerColor = '#10b981'; headerTitle = 'Rencontre';

                if (!room.lootTable) room.lootTable = [];

                let shopHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                if (room.lootTable.length === 0) {
                    shopHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun objet en vente.</div>`;
                } else {
                    room.lootTable.forEach((loot, lIndex) => {
                        let nameHtml = '';
                        if (loot.specialItemName) {
                            nameHtml = `<span style="color:#d946ef; font-weight: 600;">${loot.specialItemName}</span>`;
                        } else {
                            const eq = allEquipments.find(x => x.id === loot.equipmentId);
                            if (eq) {
                                const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                                const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                nameHtml = `<span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span>`;
                            } else {
                                nameHtml = `Inconnu`;
                            }
                        }

                        let priceHtml = '';
                        if (loot.priceGold > 0) priceHtml += `<span style="color:#f59e0b; font-size:0.8rem; margin-left: 0.3rem;">(${loot.priceGold} Or)</span>`;
                        else if (!loot.priceGold && loot.probability > 0) priceHtml += `<span style="color:#f59e0b; font-size:0.8rem; margin-left: 0.3rem;">(${loot.probability} Or)</span>`;
                        if (loot.priceSpecialItemName) priceHtml += `<span style="color:#d946ef; font-size:0.8rem; margin-left: 0.3rem;">(1x ${loot.priceSpecialItemName})</span>`;

                        shopHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                                    ${nameHtml} ${priceHtml}
                                </span>
                                <button type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                            </div>
                        `;
                    });
                }
                shopHtml += `</div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 6px;">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; position: relative;">
                            <div class="custom-select-wrapper" id="room_merchant_type_wrapper_${rIndex}" style="width: 100%; z-index: ${102 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleMerchantTypeSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_merchant_type_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">category</span> Équipement</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_type_options_${rIndex}">
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'EQ', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8;\\'>category</span> Équipement')"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">category</span> Équipement</div>
                                    <div class="custom-option" onclick="selectMerchantType(${rIndex}, 'SPECIAL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #d946ef;\\'>diamond</span> Item Spécial')"><span class="material-symbols-outlined cs-icon" style="color: #d946ef;">diamond</span> Item Spécial</div>
                                </div>
                                <input type="hidden" id="room_merchant_type_${rIndex}" value="EQ">
                            </div>
                            
                            <!-- Mode Equipement -->
                            <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="width: 100%; z-index: ${101 - rIndex}; margin: 0;">
                                <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                    <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">category</span> Objet...</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                `;
                allEquipments.forEach(eq => {
                    const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                    const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
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
                                    <span class="cs-label" id="room_merchant_special_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">diamond</span> Choisir un item spécial...</span>
                                    <span class="material-symbols-outlined">expand_more</span>
                                </div>
                                <div class="custom-select-options" id="room_merchant_special_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                                    <div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '', 'Choisir un item spécial...')"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">diamond</span> Choisir un item spécial...</div>
                                    ${allAnomalies.map(a => {
                    const color = a.spiritualite === 'TENEBRES' ? '#d946ef' : a.spiritualite === 'ESPRIT' ? '#3b82f6' : a.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                    return `<div class="custom-option" onclick="selectMerchantSpecial(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}')"><span class="material-symbols-outlined cs-icon" style="color: ${color};">diamond</span> ${a.name}</div>`;
                }).join('')}
                                </div>
                                <input type="hidden" id="room_merchant_special_${rIndex}" value="">
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 0.8rem;">
                            <div>
                                <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.3rem;">Prix en Or</label>
                                <input type="number" id="room_merchant_gold_${rIndex}" class="form-control" style="width: 100%; margin: 0;" placeholder="0" min="0">
                            </div>
                            <div style="position: relative; z-index: ${99 - rIndex};">
                                <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.3rem;">Ou Prix en Item Spécial</label>
                                <div class="custom-select-wrapper" id="room_merchant_cost_item_wrapper_${rIndex}" style="width: 100%; margin: 0;">
                                    <div class="custom-select-trigger" onclick="toggleMerchantCostSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                        <span class="cs-label" id="room_merchant_cost_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">diamond</span> Sélectionner (Optionnel)</span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options" id="room_merchant_cost_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                                        <div class="custom-option" onclick="selectMerchantCost(${rIndex}, '', 'Sélectionner (Optionnel)')"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">diamond</span> Sélectionner (Optionnel)</div>
                                        ${allAnomalies.map(a => {
                    const color = a.spiritualite === 'TENEBRES' ? '#d946ef' : a.spiritualite === 'ESPRIT' ? '#3b82f6' : a.spiritualite === 'KARMA' ? '#f59e0b' : '#94a3b8';
                    return `<div class="custom-option" onclick="selectMerchantCost(${rIndex}, '${a.name.replace(/'/g, "\\'")}', '${a.name.replace(/'/g, "\\'")}', '${color}')"><span class="material-symbols-outlined cs-icon" style="color: ${color};">diamond</span> ${a.name}</div>`;
                }).join('')}
                                    </div>
                                    <input type="hidden" id="room_merchant_cost_item_${rIndex}" value="">
                                </div>
                            </div>
                            <button type="button" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 100%; transition: all 0.2s ease; margin-top: 0.5rem;" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'" onclick="addMerchantItemToRoom(${rIndex})">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem; margin-right: 0.5rem;">add_shopping_cart</span> Ajouter cet objet
                            </button>
                        </div>
                    </div>
                `;

                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${shopHtml}
                `;
            } else if (subType === 'PIEGE') {
                headerIcon = 'warning'; headerColor = '#f87171'; headerTitle = 'Piège';
                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Texte du piège</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte PV (% max)</label>
                            <input type="number" class="form-control" value="${room.trapDamageHpPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte Mana (% max)</label>
                            <input type="number" class="form-control" value="${room.trapDamageManaPct || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte PV (Fixe)</label>
                            <input type="number" class="form-control" value="${room.trapDamageHpFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte Mana (Fixe)</label>
                            <input type="number" class="form-control" value="${room.trapDamageManaFixed || 0}" onchange="updateRoomField(${rIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                            <span style="font-size: 0.9rem; color: #f8fafc; font-weight: 500; display: flex; align-items: center; gap: 0.4rem;">
                                <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 1.1rem;">auto_fix</span> Option Corde d'évitement
                            </span>
                            <span style="font-size: 0.75rem; color: #94a3b8;">Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                        </div>
                        <label style="position: relative; display: block; width: 40px; height: 24px; margin: 0; flex-shrink: 0;">
                            <input type="checkbox" style="opacity: 0; width: 0; height: 0;" ${room.trapHasRopeOption ? 'checked' : ''} onchange="updateRoomField(${rIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${room.trapHasRopeOption ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}; transition: .3s; border-radius: 24px;">
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; transform: ${room.trapHasRopeOption ? 'translateX(16px)' : 'translateX(0)'}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                            </span>
                        </label>
                    </div>
                `;
            } else if (subType === 'PORTE_ETRANGE') {
                headerIcon = 'door_front'; headerColor = '#fbbf24'; headerTitle = 'Porte Étrange';

                if (!room.doorOutcomes) room.doorOutcomes = [];
                if (!room.lootTable) room.lootTable = [];

                let doorLootHtml = `<div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                    <label style="font-size: 0.8rem; color: #8b5cf6;">Loot possible si l'issue "Item" est choisie</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">`;
                if (room.lootTable.length === 0) {
                    doorLootHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun loot configuré.</div>`;
                } else {
                    room.lootTable.forEach((loot, lIndex) => {
                        const eq = allEquipments.find(x => x.id === loot.equipmentId);
                        if (eq) {
                            const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                            const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                            const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                            doorLootHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                    <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;"><span class="material-symbols-outlined${extraClass}" style="font-size:1rem; color:${slotInfo.color};">${slotInfo.icon}</span> <span style="color:${rarityColor};">${eq.name}</span> <span style="color:#94a3b8; font-size:0.8rem;">(${loot.probability}%)</span></span>
                                    <button type="button" onclick="removeLootFromRoom(${rIndex}, ${lIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                </div>
                            `;
                        }
                    });
                }
                doorLootHtml += `</div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch; position: relative;">
                        <div class="custom-select-wrapper" id="room_loot_select_wrapper_${rIndex}" style="flex: 2; z-index: ${90 - rIndex}; margin: 0;">
                            <div class="custom-select-trigger" onclick="toggleLootSelect(${rIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                <span class="cs-label" id="room_loot_label_${rIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">category</span> Objet...</span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_loot_options_${rIndex}" style="max-height: 200px; overflow-y: auto;">
                `;
                allEquipments.forEach(eq => {
                    const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
                    const rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                    const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                    doorLootHtml += `<div class="custom-option" onclick="selectLootOption(${rIndex}, ${eq.id}, '${eq.name.replace(/'/g, "\\'")}', '${slotInfo.icon}', '${slotInfo.color}', '${rarityColor}', '${slotInfo.extraClass || ''}')"><span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="color: ${rarityColor};">${eq.name}</span></div>`;
                });
                doorLootHtml += `
                            </div>
                            <input type="hidden" id="room_loot_select_${rIndex}" value="">
                        </div>
                        <input type="number" id="room_loot_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="0.1" min="0" max="100">
                        <button type="button" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addLootToRoom(${rIndex})">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                        </button>
                    </div></div>
                `;

                let outcomesHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                if (room.doorOutcomes.length === 0) {
                    outcomesHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucune issue configurée.</div>`;
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
                                monstersHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun boss configuré.</div>`;
                            } else {
                                outcome.monsters.forEach((mId, mIndex) => {
                                    const m = allMonsters.find(x => x.id === mId);
                                    if (m) {
                                        monstersHtml += `
                                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                                <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;"><span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 3px; color: #94a3b8;">Lvl ${m.level || 1}</span> ${m.name}</span>
                                                <button type="button" onclick="removeMonsterFromBoss(${rIndex}, ${oIndex}, ${mIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                            </div>
                                        `;
                                    }
                                });
                            }
                            monstersHtml += `</div>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: stretch; position: relative;">
                                    <div class="custom-select-wrapper" id="room_door_boss_wrapper_${rIndex}_${oIndex}" style="flex: 1; z-index: ${150 - (rIndex * 10 + oIndex * 3)}; margin: 0;">
                                        <div class="custom-select-trigger" onclick="toggleDoorBossSelect(${rIndex}, ${oIndex})" style="padding: 0.6rem 1rem; border-radius: 8px;">
                                            <span class="cs-label" id="room_door_boss_label_${rIndex}_${oIndex}"><span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">pest_control</span> Sélectionner un boss...</span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="room_door_boss_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${allMonsters.map(m => `
                                                <div class="custom-option" onclick="selectDoorBossOption(${rIndex}, ${oIndex}, ${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.level || 1})">
                                                    <span class="material-symbols-outlined cs-icon" style="color: #ef4444;">pest_control</span> ${m.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${m.level || 1})</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                        <input type="hidden" id="room_door_boss_select_${rIndex}_${oIndex}" value="">
                                    </div>
                                    <button type="button" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addMonsterToBoss(${rIndex}, ${oIndex})">
                                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                                    </button>
                                </div>
                            `;
                            if (!outcome.globalBuffs) outcome.globalBuffs = [];
                            let buffsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">';
                            if (outcome.globalBuffs.length === 0) {
                                buffsHtml += `<div style="font-size:0.8rem; color: #94a3b8;">Aucun buff global configuré.</div>`;
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
                                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px;">
                                            <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                                                <span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">upgrade</span>
                                                ${buffLabel}
                                            </span>
                                            <button type="button" onclick="removeGlobalBuffFromBoss(${rIndex}, ${oIndex}, ${bIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
                                        </div>
                                    `;
                                });
                            }
                            buffsHtml += `</div>
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: flex-end; position: relative; flex-wrap: wrap;">
                                <div style="flex: 2; min-width: 120px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Type de buff</label>
                                    <select id="room_door_boss_buff_type_${rIndex}_${oIndex}" class="form-control" style="font-size: 0.8rem; width: 100%;">
                                        <option value="HP_PCT">+ PV Max (%)</option>
                                        <option value="SHIELD_PCT">Bouclier (% PV)</option>
                                        <option value="ARMOR_FLAT">+ Armure</option>
                                        <option value="RESIST_FLAT">+ Résistance</option>
                                        <option value="BURN_ON_HIT">Brûlure au touché</option>
                                        <option value="POISON_ON_HIT">Poison au touché</option>
                                    </select>
                                </div>
                                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Stat (Valeur)</label>
                                    <input type="number" id="room_door_boss_buff_val_${rIndex}_${oIndex}" class="form-control" style="width: 100%;" value="10">
                                </div>
                                <div style="flex: 1; min-width: 60px; display: flex; flex-direction: column; gap: 0.2rem;">
                                    <label style="font-size: 0.7rem; color: #94a3b8; margin: 0; padding-left: 0.2rem;">Durée (Tours)</label>
                                    <input type="number" id="room_door_boss_buff_dur_${rIndex}_${oIndex}" class="form-control" style="width: 100%;" value="4">
                                </div>
                                <button type="button" style="height: 38px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addGlobalBuffToBoss(${rIndex}, ${oIndex})">
                                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                                </button>
                            </div>`;

                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label style="font-size: 0.8rem; color: #ef4444;">Configuration du Boss</label>
                                    ${monstersHtml}
                                </div>
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label style="font-size: 0.8rem; color: #3b82f6;">Buffs Globaux du Boss</label>
                                    ${buffsHtml}
                                </div>
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label style="font-size: 0.8rem; color: #f59e0b;">Récompenses du Boss (Fin de combat)</label>
                                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                        <div style="flex: 1;">
                                            <label style="font-size: 0.75rem; color: #94a3b8;"><span class="material-symbols-outlined" style="font-size: 0.9rem; vertical-align: middle; color: #fbbf24;">monetization_on</span> Or bonus</label>
                                            <input type="number" id="room_door_boss_gold_${rIndex}_${oIndex}" class="form-control" value="${outcome.bossRewardGold || 0}" min="0" onchange="updateDoorBossField(${rIndex}, ${oIndex}, 'bossRewardGold', this.value)">
                                        </div>
                                        <div style="flex: 1;">
                                            <label style="font-size: 0.75rem; color: #94a3b8;"><span class="material-symbols-outlined" style="font-size: 0.9rem; vertical-align: middle; color: #8b5cf6;">blur_on</span> XP Spirit. bonus</label>
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
                                const selEq = allEquipments.find(e => e.id == outcome.altarRewardValue) || allEquipments[0];
                                rewardValueHtml = `
                                    <div class="custom-select-wrapper" id="altar_rewardval_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger" onclick="toggleAltarRewardValSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                            <span class="cs-label" id="altar_rewardval_label_${rIndex}_${oIndex}">
                                                ${selEq ? selEq.name : 'Choisir un objet'}
                                            </span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_rewardval_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${allEquipments.map(eq => `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardValue', ${eq.id})">
                                                    ${eq.name}
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
                                    <label style="font-size: 0.8rem; color: #f97316;">Configuration du Sacrifice</label>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Spiritualité acceptée</label>
                                            <div class="custom-select-wrapper" id="altar_spirituality_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${152 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger" onclick="toggleAltarSpiritualitySelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                                    <span class="cs-label" id="altar_spirituality_label_${rIndex}_${oIndex}">
                                                        ${outcome.altarSpirituality === 'ESPRIT' ? '<span class="material-symbols-outlined cs-icon" style="color: #3b82f6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">blur_on</span> Esprit' : outcome.altarSpirituality === 'KARMA' ? '<span class="material-symbols-outlined cs-icon" style="color: #f59e0b; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">all_inclusive</span> Karma' : '<span class="material-symbols-outlined cs-icon" style="color: #d946ef; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">dark_mode</span> Ténèbres'}
                                                    </span>
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                                <div class="custom-select-options" id="altar_spirituality_options_${rIndex}_${oIndex}">
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarSpirituality', 'TENEBRES')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #d946ef; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">dark_mode</span> Ténèbres
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarSpirituality', 'ESPRIT')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #3b82f6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">blur_on</span> Esprit
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarSpirituality', 'KARMA')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #f59e0b; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">all_inclusive</span> Karma
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Type de récompense</label>
                                            <div class="custom-select-wrapper" id="altar_reward_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${151 - (rIndex * 10 + oIndex * 3)};">
                                                <div class="custom-select-trigger" onclick="toggleAltarRewardSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                                    <span class="cs-label" id="altar_reward_label_${rIndex}_${oIndex}">
                                                        ${outcome.altarRewardType === 'XP' ? '<span class="material-symbols-outlined cs-icon" style="color: #38bdf8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">auto_awesome</span> XP Spiritualité' : outcome.altarRewardType === 'ITEM' ? '<span class="material-symbols-outlined cs-icon" style="color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">redeem</span> Équipement' : '<span class="material-symbols-outlined cs-icon" style="color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">monetization_on</span> Or (Gold)'}
                                                    </span>
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                                <div class="custom-select-options" id="altar_reward_options_${rIndex}_${oIndex}">
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'GOLD')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">monetization_on</span> Or (Gold)
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'XP')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #38bdf8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">auto_awesome</span> XP Spiritualité
                                                    </div>
                                                    <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'altarRewardType', 'ITEM')">
                                                        <span class="material-symbols-outlined cs-icon" style="color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">redeem</span> Équipement
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="grid-column: span 2;">
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Valeur de la récompense</label>
                                            ${rewardValueHtml}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (outcome.type === 'TRESOR') {
                            if (!outcome.treasureAnomalieId) outcome.treasureAnomalieId = allAnomalies.length > 0 ? allAnomalies[0].id : '';
                            const selAnomalie = allAnomalies.find(a => a.id == outcome.treasureAnomalieId) || allAnomalies[0];
                            const CATEGORY_ICONS = {
                                'PIERRE': 'landslide', 'METAL': 'hardware', 'COEUR': 'favorite',
                                'ORBE': 'lens', 'CRISTAL': 'diamond', 'PLUME': 'history_edu',
                                'ECAILLE': 'waves', 'AUTRE': 'category'
                            };
                            let selAnColor = '#94a3b8';
                            let selCatIcon = 'star';
                            if (selAnomalie) {
                                if (selAnomalie.spiritualite === 'TENEBRES') selAnColor = '#a855f7';
                                else if (selAnomalie.spiritualite === 'ESPRIT') selAnColor = '#38bdf8';
                                else if (selAnomalie.spiritualite === 'KARMA') selAnColor = '#f59e0b';
                                selCatIcon = selAnomalie.category ? (CATEGORY_ICONS[selAnomalie.category] || 'category') : 'star';
                            }
                            const selAnHtml = selAnomalie ? `<span class="material-symbols-outlined cs-icon" style="color: ${selAnColor}; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">${selCatIcon}</span>${selAnomalie.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${selAnomalie.level || 1})</span>` : 'Aucune anomalie disponible';

                            extraHtml = `
                                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%;">
                                    <label style="font-size: 0.8rem; color: #eab308;">Anomalie (Trésor)</label>
                                    <div class="custom-select-wrapper" id="altar_treasure_wrapper_${rIndex}_${oIndex}" style="margin-top: 0.2rem; z-index: ${150 - (rIndex * 10 + oIndex * 3)};">
                                        <div class="custom-select-trigger" onclick="toggleAltarTreasureSelect(${rIndex}, ${oIndex})" style="padding: 0.5rem; font-size: 0.85rem; border-radius: 8px;">
                                            <span class="cs-label" id="altar_treasure_label_${rIndex}_${oIndex}">
                                                ${selAnHtml}
                                            </span>
                                            <span class="material-symbols-outlined">expand_more</span>
                                        </div>
                                        <div class="custom-select-options" id="altar_treasure_options_${rIndex}_${oIndex}" style="max-height: 200px; overflow-y: auto;">
                                            ${allAnomalies.map(an => {
                                let anColor = '#94a3b8';
                                if (an.spiritualite === 'TENEBRES') anColor = '#a855f7';
                                else if (an.spiritualite === 'ESPRIT') anColor = '#38bdf8';
                                else if (an.spiritualite === 'KARMA') anColor = '#f59e0b';
                                return `
                                                <div class="custom-option" onclick="updateAltarField(${rIndex}, ${oIndex}, 'treasureAnomalieId', ${an.id})">
                                                    <span class="material-symbols-outlined cs-icon" style="color: ${anColor}; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">${an.category ? (CATEGORY_ICONS[an.category] || 'category') : 'star'}</span>${an.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${an.level || 1})</span>
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
                                    <label style="font-size: 0.8rem; color: #f87171;">Configuration du Piège</label>
                                    
                                    <div style="margin-top: 0.5rem;">
                                        <label style="font-size: 0.75rem; color: #94a3b8;">Texte du piège</label>
                                        <input type="text" class="form-control" value="${outcome.trapText || ''}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapText', this.value)">
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;">
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte PV (% max)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageHpPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte Mana (% max)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageManaPct || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaPct', parseInt(this.value) || 0)" min="0" max="100">
                                        </div>
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte PV (Fixe)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageHpFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageHpFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                        <div>
                                            <label style="font-size: 0.75rem; color: #94a3b8;">Perte Mana (Fixe)</label>
                                            <input type="number" class="form-control" value="${outcome.trapDamageManaFixed || 0}" onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapDamageManaFixed', parseInt(this.value) || 0)" min="0">
                                        </div>
                                    </div>
                                    
                                    <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                                            <span style="font-size: 0.9rem; color: #f8fafc; font-weight: 500; display: flex; align-items: center; gap: 0.4rem;">
                                                <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 1.1rem;">auto_fix</span> Option Corde d'évitement
                                            </span>
                                            <span style="font-size: 0.75rem; color: #94a3b8;">Permet aux héros d'utiliser une Corde pour ignorer ce piège.</span>
                                        </div>
                                        <label style="position: relative; display: block; width: 40px; height: 24px; margin: 0; flex-shrink: 0;">
                                            <input type="checkbox" style="opacity: 0; width: 0; height: 0;" ${outcome.trapHasRopeOption ? 'checked' : ''} onchange="updateAltarField(${rIndex}, ${oIndex}, 'trapHasRopeOption', this.checked); this.nextElementSibling.style.backgroundColor = this.checked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'; this.nextElementSibling.children[0].style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';">
                                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${outcome.trapHasRopeOption ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}; transition: .3s; border-radius: 24px;">
                                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; transform: ${outcome.trapHasRopeOption ? 'translateX(16px)' : 'translateX(0)'}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            `;
                        }

                        outcomesHtml += `
                            <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.3); padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.85rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                                        <span class="material-symbols-outlined" style="color: ${conf.color}; font-size: 1.1rem;">${conf.icon}</span> 
                                        ${conf.text} 
                                        <span style="color:#fbbf24; font-size:0.8rem; margin-left: 0.2rem;">(${outcome.probability}%)</span>
                                    </span>
                                    <button type="button" onclick="removeDoorOutcome(${rIndex}, ${oIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;"><span class="material-symbols-outlined" style="font-size: 1rem;">close</span></button>
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
                                    <span class="material-symbols-outlined cs-icon" style="color: #ef4444; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">skull</span> Boss
                                </span>
                                <span class="material-symbols-outlined">expand_more</span>
                            </div>
                            <div class="custom-select-options" id="room_door_outcome_options_${rIndex}">
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'BOSS', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #ef4444; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>skull</span> Boss')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #ef4444; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">skull</span> Boss
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'ITEM', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>redeem</span> Item')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #8b5cf6; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">redeem</span> Item
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'AUTEL', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f97316; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>hand_bones</span> Autel Sacrificiel')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #f97316; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">hand_bones</span> Autel Sacrificiel
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'TRESOR', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>crown</span> Trésor')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #eab308; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">crown</span> Trésor
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'PIEGE', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #f87171; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>bomb</span> Piège')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #f87171; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">bomb</span> Piège
                                </div>
                                <div class="custom-option" onclick="selectDoorOutcome(${rIndex}, 'RIEN', '<span class=\\'material-symbols-outlined cs-icon\\' style=\\'color: #94a3b8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;\\'>door_front</span> Rien')">
                                    <span class="material-symbols-outlined cs-icon" style="color: #94a3b8; font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">door_front</span> Rien
                                </div>
                            </div>
                            <input type="hidden" id="room_door_outcome_${rIndex}" value="BOSS">
                        </div>
                        <input type="number" id="room_door_prob_${rIndex}" class="form-control" style="flex: 1; min-width: 60px;" placeholder="Prob (%)" step="1" min="0" max="100">
                        <button type="button" style="background: linear-gradient(135deg, #fbbf24, #d97706); color: white; border: none; padding: 0 1.2rem; font-size: 0.9rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;" onclick="addDoorOutcome(${rIndex})">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">add</span>
                        </button>
                    </div>
                `;

                contentHtml = `
                    <div style="margin-top: 1rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8;">Texte de l'événement</label>
                        <input type="text" class="form-control" value="${room.eventText || ''}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                    </div>
                    ${outcomesHtml}
                `;
            }
        }

        div.innerHTML = `
            <button type="button" onclick="removeRoom(${rIndex})" style="position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.2rem;"><span class="material-symbols-outlined">delete</span></button>
            <div style="font-family: 'Outfit'; font-weight: 600; color: ${headerColor}; display: flex; align-items: center; gap: 0.5rem;">
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
        const res = await fetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            allMonsters = monsters;
            renderMonstersList();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadAnomalies() {
    try {
        const res = await fetch('/api/anomalies');
        if (res.ok) {
            allAnomalies = await res.json();
            renderRooms();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadEquipments() {
    try {
        const res1 = await fetch('/api/shop/templates');
        const res2 = await fetch('/api/equipment');

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
        const rarityOrder = { 'COMMUN': 1, 'RARE': 2, 'EPIQUE': 3, 'LEGENDAIRE': 4, 'RELIQUE': 5 };
        allEquipments = Array.from(map.values()).sort((a, b) => {
            const rA = rarityOrder[a.rarity] || 0;
            const rB = rarityOrder[b.rarity] || 0;
            if (rA !== rB) return rA - rB;
            return a.name.localeCompare(b.name);
        });
    } catch (e) {
        console.error(e);
    }
}

window.renderMonstersList = function () {
    const list = document.getElementById('monstersList');
    if (!list) return;

    let filtered = [...allMonsters];
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
        }
    }

    list.innerHTML = '';
    filtered.forEach(m => {
        list.innerHTML += `
            <div class="monster-card">
                <button class="delete-btn" onclick="deleteMonster(${m.id})">
                    <span class="material-symbols-outlined">delete</span>
                </button>
                <button class="delete-btn" style="right: 3rem; color: #3b82f6;" onclick="editMonster(${m.id})">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <div class="monster-card-title">${m.name} <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; margin-left: 0.5rem;">Lvl ${m.level || 1}</span></div>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">${m.description || ''}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                    ${m.monsterType && m.monsterType !== 'NORMAL' ? `<span title="${{ 'DEMON': 'Démon : 10% des dégâts infligés le sont en dégâts bruts supplémentaires.', 'REPTILE': 'Reptile : Réduit les dégâts physiques subis de 15%.', 'MORT_VIVANT': 'Mort-vivant : Régénère 5% de ses PV max au début de son tour.', 'HYBRIDE': 'Hybride : Utilise la plus haute valeur entre Force et Puissance pour attaquer.', 'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.' }[m.monsterType] || ''}" style="cursor: help; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">${{ 'DEMON': 'rib_cage', 'REPTILE': 'grass', 'MORT_VIVANT': 'skull', 'HYBRIDE': 'network_node', 'VAMPIRE': 'bloodtype' }[m.monsterType] || 'check_box_outline_blank'}</span>${{ 'DEMON': 'Démon', 'REPTILE': 'Reptile', 'MORT_VIVANT': 'Mort-vivant', 'HYBRIDE': 'Hybride', 'VAMPIRE': 'Vampire' }[m.monsterType] || m.monsterType}</span>` : ''}
                    ${m.behavior && m.behavior !== 'NORMAL' ? `<span title="${{ 'PREDATEUR': 'Prédateur : Verrouille une cible et l&apos;attaque jusqu&apos;à sa mort.', 'CORRUPTEUR': 'Corrupteur : Cible toujours le joueur avec le plus de Mana.', 'LEADER': 'Leader : Ordonne à tous les autres monstres d&apos;attaquer sa cible.', 'ASSASSIN': 'Assassin : Vise systématiquement le joueur avec le moins de Résistance.', 'INSENSIBLE': 'Insensible : Ses attaques infligent des dégâts bruts (ignore l&apos;armure).' }[m.behavior] || ''}" style="cursor: help; font-size: 0.75rem; background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">${{ 'PREDATEUR': 'track_changes', 'CORRUPTEUR': 'allergy', 'LEADER': 'crown', 'ASSASSIN': 'gps_fixed', 'INSENSIBLE': 'shield' }[m.behavior] || 'check_box_outline_blank'}</span>${{ 'PREDATEUR': 'Prédateur', 'CORRUPTEUR': 'Corrupteur', 'LEADER': 'Leader', 'ASSASSIN': 'Assassin', 'INSENSIBLE': 'Insensible' }[m.behavior] || m.behavior}</span>` : ''}
                </div>
                <div class="monster-card-stats">
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #ec4899;">favorite</span> PV: ${m.healthMax}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #38bdf8;">water_drop</span> Mana: ${m.manaMax || 0}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;">bolt</span> Vit: ${m.speed}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #ef4444;">gps_fixed</span> Crit: ${m.crit || 0}%</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f43f5e;">fitness_center</span> For: ${m.strength}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #a855f7;">auto_awesome</span> Pui: ${m.power}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;">shield</span> Arm: ${m.armor}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #10b981;">shield</span> Rés: ${m.resistance}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;">monetization_on</span> Or: ${m.rewardGold}</span>
                    <span style="display: flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1rem; color: #fcd34d;">stars</span> XP: ${m.rewardExp}</span>
                </div>
            </div>
        `;
    });
};

async function editMonster(id) {
    try {
        const res = await fetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            const m = monsters.find(x => x.id === id);
            if (!m) return;

            editingMonsterId = id;
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
            document.getElementById('mMana').value = m.manaMax || 0;
            document.getElementById('mSpeed').value = m.speed;
            document.getElementById('mCrit').value = m.crit || 0;
            document.getElementById('mStrength').value = m.strength;
            document.getElementById('mPower').value = m.power;
            document.getElementById('mArmor').value = m.armor;
            document.getElementById('mResist').value = m.resistance;
            document.getElementById('mGold').value = m.rewardGold;
            document.getElementById('mXp').value = m.rewardExp;
            const mt = m.monsterType || 'NORMAL';
            const mb = m.behavior || 'NORMAL';

            const tMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'DEMON': { l: 'Démon', i: 'rib_cage', c: '#ef4444' },
                'REPTILE': { l: 'Reptile', i: 'grass', c: '#10b981' },
                'MORT_VIVANT': { l: 'Mort-vivant', i: 'skull', c: '#94a3b8' },
                'HYBRIDE': { l: 'Hybride', i: 'network_node', c: '#3b82f6' },
                'VAMPIRE': { l: 'Vampire', i: 'bloodtype', c: '#e11d48' }
            };
            const bMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'PREDATEUR': { l: 'Prédateur', i: 'track_changes', c: '#f59e0b' },
                'CORRUPTEUR': { l: 'Corrupteur', i: 'allergy', c: '#8b5cf6' },
                'LEADER': { l: 'Leader', i: 'crown', c: '#fcd34d' },
                'ASSASSIN': { l: 'Assassin', i: 'gps_fixed', c: '#ef4444' },
                'INSENSIBLE': { l: 'Insensible', i: 'shield', c: '#9ca3af' }
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
    editingMonsterId = null;
    document.getElementById('monsterForm').reset();
    document.getElementById('mLevel').value = 1;
    const lvlTrigger = document.getElementById('mLevelTrigger');
    if (lvlTrigger) {
        lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8; font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">1</span>`;
    }
    document.getElementById('btnSubmitMonster').textContent = "Créer le monstre";
    document.getElementById('btnCancelMonster').style.display = 'none';
    document.getElementById('monsterFormPanel').classList.remove('editing-glow');
    window.selectMonsterType('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
    window.selectMonsterBehavior('NORMAL', 'Normal', 'check_box_outline_blank', '#94a3b8');
};

async function deleteMonster(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce monstre ?')) return;
    try {
        const res = await fetch('/api/admin/pve/monsters/' + id, { method: 'DELETE' });
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
        const res = await fetch('/api/admin/pve/dungeons');
        if (res.ok) {
            const dungeons = await res.json();
            const list = document.getElementById('dungeonsList');
            list.innerHTML = '';

            dungeons.forEach(d => {
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
                if (alterations > 0) eventDetails += `<span style="color: #8b5cf6; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">blur_on</span>${alterations}</span>`;
                if (rencontres > 0) eventDetails += `<span style="color: #10b981; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">storefront</span>${rencontres}</span>`;
                if (pieges > 0) eventDetails += `<span style="color: #f87171; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">warning</span>${pieges}</span>`;
                if (portes > 0) eventDetails += `<span style="color: #fbbf24; display: inline-flex; align-items: center; gap: 0.2rem; margin-right: 0.5rem;"><span class="material-symbols-outlined" style="font-size: 0.9rem;">door_front</span>${portes}</span>`;

                list.innerHTML += `
                    <div class="monster-card">
                        <button class="delete-btn" onclick="deleteDungeon(${d.id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        <button class="delete-btn" style="right: 3rem; color: #3b82f6;" onclick="editDungeon(${d.id})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <div class="monster-card-title">${d.name} <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; margin-left: 0.5rem;">Lvl ${d.recommendedLevel}</span></div>
                        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">${d.description || ''}</div>
                        <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: grid; gap: 0.4rem;">
                            <div><span style="font-weight: 600;">Salles totales :</span> ${totalSalles}</div>
                            ${combats > 0 ? `<div style="color: #ef4444; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                            </div>` : ''}
                            ${bosses > 0 ? `<div style="color: #dc2626; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                            </div>` : ''}
                            <div style="color: #f59e0b; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Trésors : ${treasures}
                            </div>
                            ${eventDetails ? `<div style="margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;">Événements : ${eventDetails}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function editDungeon(id) {
    try {
        const res = await fetch('/api/admin/pve/dungeons');
        if (res.ok) {
            const dungeons = await res.json();
            const d = dungeons.find(x => x.id === id);
            if (!d) return;

            editingDungeonId = id;
            document.getElementById('dName').value = d.name;
            document.getElementById('dDesc').value = d.description || '';
            document.getElementById('dLevel').value = d.recommendedLevel;
            document.getElementById('dMaxHeroes').value = d.maxHeroes || 1;

            selectedRooms = d.salles.map(s => {
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
    editingDungeonId = null;
    document.getElementById('dungeonForm').reset();
    selectedRooms = [];
    renderRooms();
    document.getElementById('btnSubmitDungeon').textContent = "Créer le donjon";
    document.getElementById('btnCancelDungeon').style.display = 'none';
    document.getElementById('dungeonFormPanel').classList.remove('editing-glow');
};

async function deleteDungeon(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce donjon ?')) return;
    try {
        const res = await fetch('/api/admin/pve/dungeons/' + id, { method: 'DELETE' });
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
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">star</span> ${labelStr}`;
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
            label.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">star</span> ${labelStr}`;
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

    if (!selectedRooms[rIndex].lootTable) selectedRooms[rIndex].lootTable = [];

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

    selectedRooms[rIndex].lootTable.push(newItem);
    renderRooms();
};

window.addLootToRoom = function (rIndex) {
    const eqId = document.getElementById('room_loot_select_' + rIndex).value;
    const prob = parseFloat(document.getElementById('room_loot_prob_' + rIndex).value);
    if (!eqId || isNaN(prob) || prob < 0 || prob > 100) {
        showNotif('Veuillez sélectionner un équipement et une probabilité (0-100).', true);
        return;
    }
    if (!selectedRooms[rIndex].lootTable) selectedRooms[rIndex].lootTable = [];
    selectedRooms[rIndex].lootTable.push({ equipmentId: parseInt(eqId), probability: prob });
    renderRooms();
};

window.removeLootFromRoom = function (rIndex, lIndex) {
    selectedRooms[rIndex].lootTable.splice(lIndex, 1);
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
    if (!selectedRooms[rIndex].doorOutcomes) selectedRooms[rIndex].doorOutcomes = [];

    const currentTotal = selectedRooms[rIndex].doorOutcomes.reduce((sum, o) => sum + o.probability, 0);
    if (currentTotal + prob > 100) {
        showNotif(`Impossible : le total dépasse 100% (actuel: ${currentTotal}%). Reste disponible : ${100 - currentTotal}%`, true);
        return;
    }

    selectedRooms[rIndex].doorOutcomes.push({ type, probability: prob });
    renderRooms();
};

window.removeDoorOutcome = function (rIndex, oIndex) {
    selectedRooms[rIndex].doorOutcomes.splice(oIndex, 1);
    renderRooms();
};

window.updateAltarField = function (rIndex, oIndex, field, value) {
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
    if (field === 'altarRewardType') {
        outcome.altarRewardType = value;
        outcome.altarRewardValue = value === 'ITEM' ? (allEquipments.length > 0 ? allEquipments[0].id : '') : 100;
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

window.toggleTrapTypeSelect = function (rIndex) {
    const wrapper = document.getElementById(`room_trap_type_wrapper_${rIndex}`);
    if (wrapper) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el !== wrapper) el.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectTrapType = function (rIndex, val, label) {
    updateRoomField(rIndex, 'trapType', val);
    const triggerLabel = document.getElementById(`room_trap_type_label_${rIndex}`);
    if (triggerLabel) triggerLabel.innerHTML = label;
    const wrapper = document.getElementById(`room_trap_type_wrapper_${rIndex}`);
    if (wrapper) wrapper.classList.remove('open');
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
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #ef4444;">pest_control</span> ${label} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${level})</span>`;
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
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
    if (!outcome.monsters) outcome.monsters = [];
    outcome.monsters.push(mId);

    // Clear selection
    input.value = '';
    const triggerLabel = document.getElementById(`room_door_boss_label_${rIndex}_${oIndex}`);
    if (triggerLabel) triggerLabel.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: #94a3b8;">pest_control</span> Sélectionner un boss...`;

    renderRooms();
};

window.removeMonsterFromBoss = function (rIndex, oIndex, mIndex) {
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
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

    const room = selectedRooms[rIndex];
    if (!room.globalBuffs) room.globalBuffs = [];
    room.globalBuffs.push({ type: type, value: val, duration: dur });

    renderRooms();
};

window.removeGlobalBuffFromRoomBoss = function (rIndex, bIndex) {
    const room = selectedRooms[rIndex];
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

    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
    if (!outcome.globalBuffs) outcome.globalBuffs = [];
    outcome.globalBuffs.push({ type: type, value: val, duration: dur });

    // reset inputs partially
    valEl.value = '';

    renderRooms();
};

window.removeGlobalBuffFromBoss = function (rIndex, oIndex, bIndex) {
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
    if (outcome && outcome.globalBuffs) {
        outcome.globalBuffs.splice(bIndex, 1);
        renderRooms();
    }
};

window.removeGlobalBuffFromBoss = function (rIndex, oIndex, bIndex) {
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
    if (outcome && outcome.globalBuffs) {
        outcome.globalBuffs.splice(bIndex, 1);
        renderRooms();
    }
};

window.updateDoorBossField = function (rIndex, oIndex, fieldName, value) {
    const outcome = selectedRooms[rIndex].doorOutcomes[oIndex];
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
