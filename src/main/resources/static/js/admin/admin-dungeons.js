import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';


export function renderRooms() {
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

export async function loadDungeons() {
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

export async function moveDungeonOrder(id, direction) {
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

export async function editDungeon(id) {
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

export async function deleteDungeon(id) {
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