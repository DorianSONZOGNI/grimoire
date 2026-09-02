window.switchDungeonTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    document.getElementById(`${tabName}DungeonsSection`).classList.add('active');
};

const pageState = {
    currentDungeonId: null,
    selectedCharIds: null,
    currentMaxHeroes: null,
    selectedConsumableIds: null,
    userCharacters: null,
    availableConsumables: null,
    activeConsumableFilters: null,
};
pageState.currentDungeonId = null;
pageState.selectedCharIds = [];
pageState.currentMaxHeroes = 1;
pageState.selectedConsumableIds = [];
pageState.userCharacters = [];
pageState.availableConsumables = [];
pageState.activeConsumableFilters = { hp: false, mana: false, util: false };
pageState.allAnomalies = [];

function collectDungeonAnomaliesLocal(salles) {
    const names = new Set();
    (salles || []).forEach(s => {
        if (s.alterationSpecialItemReward) names.add(s.alterationSpecialItemReward);
        if (s.lootTable) s.lootTable.forEach(e => { if (e.specialItemName) names.add(e.specialItemName); });
        if (s.eventSubType === 'PORTE_ETRANGE' && s.doorOutcomes) {
            let outcomes = s.doorOutcomes;
            if (typeof outcomes === 'string') { try { outcomes = JSON.parse(outcomes); } catch (_) { outcomes = []; } }
            outcomes.forEach(o => {
                if (o.type === 'TRESOR' && o.treasureAnomalieId) {
                    const an = pageState.allAnomalies.find(a => a.id == o.treasureAnomalieId);
                    if (an) names.add(an.name);
                }
            });
        }
    });
    return Array.from(names);
}




function getMaxWeight() {
    const toggle = document.getElementById('coopModeToggle');
    const isCoop = toggle && toggle.checked;
    const heroCount = isCoop ? (pageState.currentMaxHeroes || 1) : pageState.selectedCharIds.length;
    return 10 + 5 * heroCount;
}

function getCurrentWeight() {
    return pageState.availableConsumables
        .filter(c => pageState.selectedConsumableIds.includes(c.id))
        .reduce((sum, c) => sum + (c.weight || 0), 0);
}

function updateHeroCountDisplay() {
    const el = document.getElementById('heroCountDisplay');
    if (el) {
        el.innerText = `(${pageState.selectedCharIds.length} / ${pageState.currentMaxHeroes})`;
        el.style.color = pageState.selectedCharIds.length === pageState.currentMaxHeroes ? '#10b981' : '#94a3b8';
    }
}




document.addEventListener('DOMContentLoaded', () => {
    const checkAuth = async () => {
        if (!window.currentUser) {
            document.getElementById('authWarning').style.display = 'block';
            return;
        }

        if (window.initAppMeta) await window.initAppMeta();

        document.getElementById('dungeonsContent').style.display = 'block';
        await loadCharacters();
        await loadDungeons();
        loadConsumables();
        loadAnomalies();
    };

    if (window.currentUser !== undefined) {
        checkAuth();
    } else {
        window.addEventListener('authLoaded', checkAuth);
    }
});



async function loadDungeons() {
    try {
        const res = await globalFetch('/api/pve/dungeons');
        if (res.ok) {
            const dungeons = await res.json();
            const tabsHeader = document.getElementById('dungeonsTabs');
            const contentContainer = document.getElementById('dungeonsSectionsContainer');

            // Find current active tab
            let activeTabId = null;
            const activeBtn = tabsHeader.querySelector('.tab-btn.active');
            if (activeBtn) {
                activeTabId = activeBtn.id.replace('tab-btn-', '');
            }

            tabsHeader.innerHTML = '';
            contentContainer.innerHTML = '';

            if (dungeons.length === 0) {
                document.getElementById('noDungeonsMsg').style.display = 'block';
                tabsHeader.style.display = 'none';
                document.getElementById('loadingDungeonsMsg').style.display = 'none';
                return;
            } else {
                document.getElementById('noDungeonsMsg').style.display = 'none';
                tabsHeader.style.display = 'flex';
                document.getElementById('loadingDungeonsMsg').style.display = 'none';
            }

            const categories = new Map();
            // Force Libre to be the first key in the map to guarantee tab order
            categories.set('free', { id: 'free', label: 'Libres', icon: 'public', color: '#38bdf8', dungeons: [] });



            dungeons.forEach(d => {
                let catId, label, icon, color;

                // Check hero levels
                if (pageState.userCharacters.length > 0) {
                    const hasMatchingHero = pageState.userCharacters.some(c => (c.voieLevel || 1) >= (d.recommendedLevel || 1));
                    if (!hasMatchingHero) return; // Skip if no hero has exactly this level or higher
                }

                if (d.requiredSecret && d.requiredSecret.trim() !== '') {
                    const userSecrets = window.currentUser?.unlockedSecrets || {};
                    const userLevel = userSecrets[d.requiredSecret] || 0;
                    if (userLevel < (d.requiredSecretLevel || 1)) {
                        return;
                    }

                    catId = 'secret-' + d.requiredSecret.replace(/\s+/g, '-').toLowerCase();
                    label = d.requiredSecret.replace(/^Secret (de la |du |de l'|des |d'|de )/i, '');
                    label = label.charAt(0).toUpperCase() + label.slice(1);

                    const meta = window.DEFAULT_SECRETS_META.find(s => s.name.toLowerCase() === d.requiredSecret.toLowerCase()) || { icon: "key", color: "#f59e0b" };
                    icon = meta.icon;
                    color = meta.color;
                } else {
                    catId = 'free';
                    label = 'Libres';
                    icon = 'public';
                    color = '#38bdf8';
                }

                if (!categories.has(catId)) {
                    categories.set(catId, { id: catId, label, icon, color, dungeons: [] });
                }
                categories.get(catId).dungeons.push(d);
            });

            if (categories.get('free').dungeons.length === 0) {
                categories.delete('free');
            }

            if (activeTabId && !categories.has(activeTabId)) {
                activeTabId = null; // Fallback if the tab category no longer exists
            }

            let firstTab = true;
            categories.forEach(cat => {
                const isActive = activeTabId ? cat.id === activeTabId : firstTab;

                // Generate Tab Button
                const btn = document.createElement('button');
                btn.className = `tab-btn ${isActive ? 'active' : ''}`;
                btn.id = `tab-btn-${cat.id}`;
                // Apply a specific class for the colored active state
                if (cat.id === 'free') btn.classList.add('tab-free');
                else if (cat.id === 'gold') btn.classList.add('tab-gold');
                else btn.classList.add('tab-secret'); // Use secret style for all secret tabs

                // Add inline style for custom active color
                btn.innerHTML = `<span class="material-symbols-outlined" style="color: ${cat.color};">${cat.icon}</span> ${cat.label} <span class="tab-badge">${cat.dungeons.length}</span>`;
                btn.onclick = () => switchDungeonTab(cat.id);
                tabsHeader.appendChild(btn);

                // Generate Content Section
                const section = document.createElement('div');
                section.className = `tab-content ${isActive ? 'active' : ''}`;
                section.id = `${cat.id}DungeonsSection`;

                const grid = document.createElement('div');
                grid.className = 'dungeons-grid';
                section.appendChild(grid);
                contentContainer.appendChild(section);

                // Populate Grid
                cat.dungeons.forEach(d => {
                    let totalSalles = d.salles ? d.salles.length : 0;
                    let combats = 0, bosses = 0, treasures = 0, events = 0, totalMobs = 0, totalBossMobs = 0;
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
                            else if (s.type === 'EVENT') { events++; }
                        });
                    }

                    const sallesData = encodeURIComponent(JSON.stringify(d.salles || [])).replace(/'/g, "%27");

                    let lockedHtml = '';
                    let isLocked = false;
                    const userSecrets = window.currentUser?.unlockedSecrets || {};
                    const userDungeons = window.currentUser?.unlockedDungeons || [];

                    if (d.requiredSecret && d.requiredSecret.trim() !== '') {
                        const userLevel = userSecrets[d.requiredSecret] || 0;
                        const reqLevel = d.requiredSecretLevel || 1;
                        if (userLevel < reqLevel) {
                            isLocked = true;
                            lockedHtml = `<div class="dungeon-lock-overlay">
                                <span class="material-symbols-outlined opacity-80 mb-2 text-[3.5rem]">lock</span>
                                <div class="font-outfit text-[1.2rem] font-bold text-slate-50 mb-1">Accès Verrouillé</div>
                                <div class="text-[0.95rem] text-red-300">Secret requis : <strong class="text-slate-50">${d.requiredSecret}</strong> (Niv. ${reqLevel})</div>
                            </div>`;
                        }
                    }

                    if (!isLocked && d.unlockCostGold > 0) {
                        if (!userDungeons.includes(d.id)) {
                            isLocked = true;
                            lockedHtml = `<div class="dungeon-lock-overlay bg-slate-900/75 text-amber-500">
                                <span class="material-symbols-outlined opacity-80 mb-2 text-[3.5rem]">lock</span>
                                <div class="font-outfit text-[1.2rem] font-bold text-slate-50 mb-4">Donjon Verrouillé</div>
                                <button class="btn btn-primary flex-center btn-unlock-dungeon" onclick="event.stopPropagation(); unlockDungeon(${d.id}, ${d.unlockCostGold}, event)"><span class="material-symbols-outlined text-lg">lock_open</span> Débloquer (${d.unlockCostGold} Or)</button>
                            </div>`;
                        }
                    }

                    const entryCostHtml = d.entryCostGold > 0 ? `<div class="text-sm text-warning font-semibold mt-2"><span class="material-symbols-outlined align-middle icon-sm">monetization_on</span> Coût d'entrée : ${d.entryCostGold} Or</div>` : '';

                    const cardHtml = `
                        <div class="dungeon-card ${isLocked ? 'locked' : ''}" ${isLocked ? '' : `onclick="openPrepInterface(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${sallesData}', ${d.maxHeroes || 1}, ${d.entryCostGold || 0}, ${d.recommendedLevel || 1})"`}>
                            ${lockedHtml}
                            <div class="dungeon-title">
                                <span class="material-symbols-outlined">castle</span>
                                ${d.name}
                            </div>
                            <div class="dungeon-level">Niveau ${d.recommendedLevel}</div>
                            <div class="dungeon-desc">${d.description || 'Affrontez les dangers qui r\u00f4dent.'}</div>
                            ${entryCostHtml}
                            <div class="text-sm text-slate-50 mt-2 pt-2 border-t border-white/10 grid gap-1.5">
                                <div class="flex-center text-sky-500 font-semibold gap-1">
                                    <span class="material-symbols-outlined text-lg">group</span> Héros max : ${d.maxHeroes || 1}
                                </div>
                                <div><span class="font-semibold">Salles totales :</span> ${totalSalles}</div>
                                ${combats > 0 ? `<div class="flex-center text-error ml-2 gap-[0.3rem]">
                                    <span class="material-symbols-outlined icon-sm">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${bosses > 0 ? `<div class="flex-center text-danger ml-2 gap-[0.3rem]">
                                    <span class="material-symbols-outlined icon-sm">skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${treasures > 0 ? `<div class="flex-center text-warning ml-2 gap-[0.3rem]">
                                    <span class="material-symbols-outlined icon-sm">shopping_bag</span> Trésors : ${treasures}
                                </div>` : ''}
                                <div class="flex-center text-purple ml-2 gap-[0.3rem]">
                                    <span class="material-symbols-outlined icon-sm">auto_awesome</span> Événements : ${events}
                                </div>
                            </div>
                        </div>
                    `;

                    grid.innerHTML += cardHtml;
                });

                firstTab = false;
            });
        } else {
            console.error('Failed to load dungeons');
            const msg = document.getElementById('loadingDungeonsMsg');
            if (msg) msg.style.display = 'none';
        }
    } catch (e) {
        console.error('Error loading dungeons:', e);
        const msg = document.getElementById('loadingDungeonsMsg');
        if (msg) msg.style.display = 'none';
    }
}

async function loadCharacters() {
    try {
        const res = await globalFetch('/api/personnages');
        if (res.ok) {
            pageState.userCharacters = await res.json();
            const list = document.getElementById('prepCharList');
            list.innerHTML = '';

            if (pageState.userCharacters.length === 0) {
                list.innerHTML = `<div class="text-sm text-muted">Vous n'avez aucun personnage. Allez dans le Grimoire pour en cr\u00e9er un.</div>`;
                return;
            }

            pageState.userCharacters.forEach(c => {
                let iconsHtml = '';
                if (c.voie && c.voie.nom) {
                    const cColor = window.getSpiritualiteColor ? window.getSpiritualiteColor(c.voie.nom) : '#94a3b8';
                    const cIcon = window.getSpiritualiteIcon ? window.getSpiritualiteIcon(c.voie.nom) : 'route';
                    iconsHtml += `<span class="material-symbols-outlined text-[1.1rem] ml-2" style="color: ${cColor};" title="Voie : ${c.voie.nom}">${cIcon}</span>`;
                }
                if (c.spiritualite && c.spiritualite.nom) {
                    const sColor = window.getSpiritualiteColor ? window.getSpiritualiteColor(c.spiritualite.nom) : '#a78bfa';
                    const sIcon = window.getSpiritualiteIcon ? window.getSpiritualiteIcon(c.spiritualite.nom) : 'psychology';
                    iconsHtml += `<span class="material-symbols-outlined text-[1.1rem] ml-1" style="color: ${sColor};" title="Spiritualité : ${c.spiritualite.nom}">${sIcon}</span>`;
                }
                let avatarName = '';
                if (c.voie && c.voie.nom) {
                    const vNom = c.voie.nom.toLowerCase();
                    if (vNom.includes('consolidation')) avatarName = 'consolidation';
                    else if (vNom.includes('conviction')) avatarName = 'conviction';
                    else if (vNom.includes('création') || vNom.includes('creation')) avatarName = 'creation';
                    else if (vNom.includes('destruction')) avatarName = 'destruction';
                    else if (vNom.includes('raison')) avatarName = 'raison';
                    else if (vNom.includes('sûreté') || vNom.includes('surete')) avatarName = 'surete';
                    else if (vNom.includes('trahison')) avatarName = 'trahison';
                    else if (vNom.includes('violence')) avatarName = 'violence';
                }
                
                let avatarHtml = c.name.charAt(0).toUpperCase();
                let avatarStyle = "";
                if (avatarName) {
                    avatarHtml = `<img src="/images/avatar/${avatarName}.png" alt="${avatarName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    avatarStyle = "background: transparent; box-shadow: none;";
                }

                list.innerHTML += `
                    <div class="char-card" id="charCard_${c.id}" onclick="selectCharacter(${c.id})">
                        <div class="char-avatar" style="${avatarStyle}">${avatarHtml}</div>
                        <div>
                            <div class="flex-center text-slate-50 font-semibold font-outfit text-lg">
                                ${c.name} ${iconsHtml}
                            </div>
                            <div class="text-muted text-sm">Niv. ${c.voieLevel || 1} &bull; ${c.totalHealthMax !== undefined ? c.totalHealthMax : c.healthMax} PV max</div>
                        </div>
                    </div>
                `;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadConsumables() {
    try {
        const res = await globalFetch('/api/equipments/unassigned');
        if (res.ok) {
            const allUnassigned = await res.json();
            pageState.availableConsumables = allUnassigned
                .filter(eq => (eq.slot?.name || eq.slot) === 'CONSOMMABLE')
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadAnomalies() {
    try {
        const res = await globalFetch('/api/anomalies/all-templates');
        if (res.ok) pageState.allAnomalies = await res.json();
    } catch (e) { console.error(e); }
}



window.toggleConsumableFilter = function (btn, type) {
    pageState.activeConsumableFilters[type] = !pageState.activeConsumableFilters[type];

    if (pageState.activeConsumableFilters[type]) {
        btn.style.opacity = '1';
        btn.style.boxShadow = '0 0 8px currentColor';
    } else {
        btn.style.opacity = '0.4';
        btn.style.boxShadow = 'none';
    }

    renderConsumablesList();
};

function renderConsumablesList() {
    const list = document.getElementById('prepConsumableList');
    list.innerHTML = '';

    const curWeight = getCurrentWeight();
    const maxWeight = getMaxWeight();
    const isOverweight = curWeight > maxWeight;

    const counterHtml = `<div class="text-center mb-3 text-sm ${isOverweight ? 'text-error' : 'text-muted'}">
        <span class="material-symbols-outlined text-sm align-middle">scale</span>
        Poids: ${+Number(curWeight).toFixed(1)} / ${maxWeight}
    </div>`;

    const weightContainer = document.getElementById('prepWeightCounter');
    if (weightContainer) weightContainer.innerHTML = counterHtml;

    if (pageState.availableConsumables.length === 0) {
        list.innerHTML = `<div class="text-muted text-center text-sm p-4">Vous n'avez aucun consommable dans votre coffre.</div>`;
        return;
    }

    let filteredConsumables = pageState.availableConsumables;
    const hasFilter = pageState.activeConsumableFilters.hp || pageState.activeConsumableFilters.mana || pageState.activeConsumableFilters.util;

    if (hasFilter) {
        filteredConsumables = pageState.availableConsumables.filter(c => {
            const hasHp = (c.consumableHpPercent && c.consumableHpPercent > 0) ||
                (c.consumableMissingHpPercent && c.consumableMissingHpPercent > 0) ||
                (c.bonusHealthMax && c.bonusHealthMax > 0) ||
                c.consumableCategory === 'POTION_ROUGE' ||
                c.consumableCategory === 'POTION_ROSE' ||
                c.consumableCategory === 'NOURRITURE';

            const hasMana = (c.consumableManaPercent && c.consumableManaPercent > 0) ||
                (c.consumableMissingManaPercent && c.consumableMissingManaPercent > 0) ||
                (c.bonusManaMax && c.bonusManaMax > 0) ||
                c.consumableCategory === 'POTION_BLEUE' ||
                c.consumableCategory === 'POTION_VIOLETTE';

            const hasUtil = !hasHp && !hasMana;

            let match = true;
            if (pageState.activeConsumableFilters.hp !== hasHp) match = false;
            if (pageState.activeConsumableFilters.mana !== hasMana) match = false;
            if (pageState.activeConsumableFilters.util !== hasUtil) match = false;

            return match;
        });
    }

    if (filteredConsumables.length === 0) {
        list.innerHTML = `<div class="text-muted text-center text-sm p-4">Aucun consommable ne correspond à ces filtres.</div>`;
        return;
    }

    let cardsHtml = '';
    filteredConsumables.forEach(c => {
        const catIcons = { POTION_ROSE: 'science', POTION_BLEUE: 'science', POTION_ROUGE: 'science', POTION_VIOLETTE: 'science', CLE: 'vpn_key', CORDE: 'gesture', PARCHEMIN: 'history_edu', NOURRITURE: 'restaurant', OUTIL: 'construction', AUTRE: 'inventory_2' };
        const catColors = { POTION_ROSE: '#ec4899', POTION_BLEUE: '#0ea5e9', POTION_ROUGE: '#ef4444', POTION_VIOLETTE: '#a855f7', CLE: '#eab308', CORDE: '#8b4513', PARCHEMIN: '#f59e0b', NOURRITURE: '#f43f5e', OUTIL: '#64748b', AUTRE: '#94a3b8' };
        const iconName = c.consumableCategory ? (catIcons[c.consumableCategory] || 'inventory_2') : 'inventory_2';
        const iconColor = c.consumableCategory ? (catColors[c.consumableCategory] || '#854c4c') : '#854c4c';
        const isSelected = pageState.selectedConsumableIds.includes(c.id);
        const selIndex = pageState.selectedConsumableIds.indexOf(c.id);
        const badgeHtml = isSelected ? `<div class="flex-center text-xxs absolute sel-badge">${selIndex + 1}</div>` : '';
        cardsHtml += `
            <div class="consumable-card ${isSelected ? 'selected' : ''} relative overflow-visible" onclick="selectConsumable(${c.id})">
                <span class="material-symbols-outlined flex-shrink-0" style="font-size: 1.1rem; color: ${isSelected ? '#10b981' : iconColor};">${iconName}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex-between items-center">
                        <div class="whitespace-nowrap text-slate-50 font-semibold text-[0.7rem] truncate" title="${c.name}">${c.name}</div>
                        <div class="text-xxs font-bold text-muted bg-black/30 px-1 py-0.5 rounded inline-flex items-center gap-1"><span class="material-symbols-outlined" style="font-size: 0.7rem;">scale</span>${+Number(c.weight).toFixed(1)}</div>
                    </div>
                    <div class="text-muted text-xs flex gap-1.5 flex-wrap overflow-visible items-center mt-[2px]">
                        ${c.bonusHealthMax ? `<span class="inline-flex items-center text-pink-500" title="PV">+${c.bonusHealthMax}<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">favorite</span></span>` : ''}
                        ${c.bonusManaMax ? `<span class="inline-flex items-center text-sky-500" title="Mana">+${c.bonusManaMax}<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">water_drop</span></span>` : ''}
                        ${c.consumableHpPercent ? `<span class="inline-flex items-center text-pink-500" title="PV Max">+${c.consumableHpPercent}%<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">favorite</span></span>` : ''}
                        ${c.consumableManaPercent ? `<span class="inline-flex items-center text-sky-500" title="Mana Max">+${c.consumableManaPercent}%<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">water_drop</span></span>` : ''}
                        ${c.consumableMissingHpPercent ? `<span class="inline-flex items-center text-red-500" title="PV Manq">+${c.consumableMissingHpPercent}%<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">healing</span></span>` : ''}
                        ${c.consumableMissingManaPercent ? `<span class="inline-flex items-center text-purple-500" title="Mana Manq">+${c.consumableMissingManaPercent}%<span class="material-symbols-outlined text-[0.8rem] ml-[1px]">cyclone</span></span>` : ''}
                    </div>
                </div>
                ${badgeHtml}
            </div>
        `;
    });
    list.innerHTML = `<div class="grid grid-cols-2 gap-2">${cardsHtml}</div>`;
}

window.selectConsumable = function (id) {
    const idx = pageState.selectedConsumableIds.indexOf(id);
    if (idx !== -1) {
        pageState.selectedConsumableIds.splice(idx, 1);
    } else {
        const c = pageState.availableConsumables.find(item => item.id === id);
        const itemWeight = c ? (c.weight || 0) : 0;
        if (getCurrentWeight() + itemWeight > getMaxWeight()) {
            window.showNotif(`Le poids maximum serait d\u00e9pass\u00e9 !`, true);
            return;
        }
        pageState.selectedConsumableIds.push(id);
    }
    renderConsumablesList();
};

window.selectCharacter = async function (id) {
    if (pageState.selectedCharIds.includes(id)) {
        pageState.selectedCharIds = pageState.selectedCharIds.filter(cid => cid !== id);
        if (getCurrentWeight() > getMaxWeight()) {
            pageState.selectedConsumableIds = [];
            window.showNotif(`Inventaire r\u00e9initialis\u00e9 car le poids max a diminu\u00e9.`, true);
        }
    } else {
        if (pageState.selectedCharIds.length >= pageState.currentMaxHeroes) {
            window.showNotif(`Ce donjon est limit\u00e9 \u00e0 ${pageState.currentMaxHeroes} h\u00e9ros maximum.`, true);
            return;
        }
        pageState.selectedCharIds.push(id);
    }

    renderConsumablesList();
    updateHeroCountDisplay();

    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    pageState.selectedCharIds.forEach(cid => {
        const card = document.getElementById('charCard_' + cid);
        if (card) card.classList.add('selected');
    });

    const btn = document.getElementById('btnEnterDungeon');
    if (btn) {
        if (pageState.selectedCharIds.length > 0) {
          if (btn) btn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
          if (btn) btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    let equipments = [];
    try {
        const res = await globalFetch(`/api/equipments/personnage/${id}`);
        if (res.ok) {
            equipments = await res.json();
        }
    } catch (e) { console.error(e); }

    const char = pageState.userCharacters.find(c => c.id === id);
    if (!char) return;

    let totalStats = {
        healthMax: char.totalHealthMax !== undefined ? char.totalHealthMax : char.healthMax || 0,
        manaMax: char.totalManaMax !== undefined ? char.totalManaMax : char.manaMax || 0,
        power: char.totalPower !== undefined ? char.totalPower : char.power || 0,
        strength: char.totalStrength !== undefined ? char.totalStrength : char.strength || 0,
        armor: char.totalArmor !== undefined ? char.totalArmor : char.armor || 0,
        resistance: char.totalResistance !== undefined ? char.totalResistance : char.resistance || 0,
        speed: char.totalSpeed !== undefined ? char.totalSpeed : char.speed || 0,
        crit: char.totalCrit !== undefined ? char.totalCrit : char.crit || 0,
        regenHealthPerTurn: char.regenHp || 0,
        regenManaPerTurn: char.regenMana || 0
    };

    equipments.forEach(eq => {
        if (char.totalHealthMax === undefined) totalStats.healthMax += (eq.bonusHealthMax || 0);
        if (char.totalManaMax === undefined) totalStats.manaMax += (eq.bonusManaMax || 0);
        if (char.totalPower === undefined) totalStats.power += (eq.bonusPower || 0);
        if (char.totalStrength === undefined) totalStats.strength += (eq.bonusStrength || 0);
        if (char.totalArmor === undefined) totalStats.armor += (eq.bonusArmor || 0);
        if (char.totalResistance === undefined) totalStats.resistance += (eq.bonusResistance || 0);
        if (char.totalSpeed === undefined) totalStats.speed += (eq.bonusSpeed || 0);
        if (char.totalCrit === undefined) totalStats.crit += (eq.bonusCrit || 0);

        totalStats.regenHealthPerTurn += (eq.regenHealthPerTurn || 0);
        totalStats.regenManaPerTurn += (eq.regenManaPerTurn || 0);
    });

    document.getElementById('prepStatEmpty').classList.add('hidden');
    const grid = document.getElementById('prepStatGrid');
    grid.classList.remove('hidden');
    grid.style.display = '';
    grid.innerHTML = `
        <div class="stat-item text-pink-500"><span class="material-symbols-outlined">favorite</span> ${totalStats.healthMax} PV</div>
        <div class="stat-item text-info"><span class="material-symbols-outlined">water_drop</span> ${totalStats.manaMax} Mana</div>
        <div class="stat-item text-pink-500"><span class="material-symbols-outlined">healing</span> ${totalStats.regenHealthPerTurn > 0 ? '+' : ''}${totalStats.regenHealthPerTurn} Régen PV</div>
        <div class="stat-item text-info"><span class="material-symbols-outlined">cyclone</span> ${totalStats.regenManaPerTurn > 0 ? '+' : ''}${totalStats.regenManaPerTurn} Régen Mana</div>
        <div class="stat-item text-purple"><span class="material-symbols-outlined">auto_awesome</span> ${totalStats.power} Puissance</div>
        <div class="stat-item text-rose-500"><span class="material-symbols-outlined">fitness_center</span> ${totalStats.strength} Force</div>
        <div class="stat-item text-blue-500"><span class="material-symbols-outlined">shield</span> ${totalStats.armor} Armure</div>
        <div class="stat-item text-success"><span class="material-symbols-outlined">shield</span> ${totalStats.resistance} R\u00e9sist</div>
        <div class="stat-item text-warning"><span class="material-symbols-outlined">bolt</span> ${totalStats.speed} Vitesse</div>
        <div class="stat-item text-error"><span class="material-symbols-outlined">gps_fixed</span> ${totalStats.crit}% Crit</div>
    `;

    const equipList = document.getElementById('prepEquipList');
    equipList.innerHTML = '';
    if (equipments.length === 0) {
        equipList.innerHTML = `<div class="text-sm text-muted">Aucun \u00e9quipement port\u00e9.</div>`;
    } else {
        const colorMap = {
            'COMMUN': '#94a3b8', 'INHABITUEL': '#22c55e', 'RARE': '#3b82f6', 'MYTHIQUE': '#f97316', 'LEGENDAIRE': '#eab308',
            'EPIQUE': '#ef4444', 'RELIQUE': '#a855f7', 'MAUDIT': '#7f1d1d'
        };
        equipments.forEach(eq => {
            const slotName = eq.slot?.name || eq.slot;
            const slotInfo = Object.assign({}, window.SLOT_LABELS && window.SLOT_LABELS[slotName] ? window.SLOT_LABELS[slotName] : { label: slotName, icon: 'help', color: '#94a3b8', extraClass: '' });
            const rarityName = eq.rarity?.name || eq.rarity;
            const rarityColor = colorMap[rarityName] || '#f8fafc';
            equipList.innerHTML += `
                <div class="equip-slot" style="border-left: 3px solid ${rarityColor};">
                    <div class="equip-slot-icon"><span class="material-symbols-outlined ${slotInfo.extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span></div>
                    <div class="equip-slot-content">
                        <div class="text-sm" style="color: ${rarityColor}; font-weight: 600;">${eq.name}</div>
                    </div>
                </div>
            `;
        });
    }
};

window.openPrepInterface = function (id, name, sallesData, maxHeroes, entryCost, reqLevel) {
    pageState.currentDungeonId = id;
    pageState.selectedCharIds = [];
    pageState.selectedConsumableIds = [];
    pageState.currentMaxHeroes = maxHeroes || 1;
    window.currentDungeonEntryCost = entryCost || 0;
    window.currentDungeonReqLevel = reqLevel || 1;

    const coopSection = document.getElementById('coopToggleSection');
    if (coopSection) {
        if (pageState.currentMaxHeroes <= 1) {
            coopSection.style.display = 'none';
            const toggle = document.getElementById('coopModeToggle');
            if (toggle && toggle.checked) {
                toggle.checked = false;
                if (typeof window.onCoopToggleChange === 'function') {
                    window.onCoopToggleChange();
                }
            }
        } else {
            coopSection.style.display = 'block'; // Or flex, if changed
        }
    }

    updateHeroCountDisplay();

    document.getElementById('prepDungeonTitle').textContent = `${name} (Max: ${pageState.currentMaxHeroes} h\u00e9ros)`;

    const btnEnter = document.getElementById('btnEnterDungeon');
    const btnCreateLobby = document.getElementById('btnCreateLobby');
    if (window.currentDungeonEntryCost > 0) {
        btnEnter.innerHTML = `<span class="material-symbols-outlined">swords</span> Payer ${window.currentDungeonEntryCost} Or & Entrer`;
        if (btnCreateLobby) btnCreateLobby.innerHTML = `<span class="material-symbols-outlined">group</span> Créer le lobby (${window.currentDungeonEntryCost} Or)`;
    } else {
        btnEnter.innerHTML = `<span class="material-symbols-outlined">swords</span> ENTRER DANS LE DONJON`;
        if (btnCreateLobby) btnCreateLobby.innerHTML = `<span class="material-symbols-outlined">group</span> CRÉER LE LOBBY CO-OP`;
    }

    const salles = JSON.parse(decodeURIComponent(sallesData) || '[]');
    const list = document.getElementById('prepMonstersList');

    if (salles.length === 0) {
        list.innerHTML = "Aucune salle configur\u00e9e.";
    } else {
        let html = '';
        salles.forEach((s, index) => {
            if (s.type === 'COMBAT' || s.type === 'BOSS') {
                html += `<div class="flex-center text-error mb-2 font-semibold gap-[0.3rem]"><span class="material-symbols-outlined icon-sm">${s.type === 'BOSS' ? 'skull' : 'swords'}</span> Étape ${index + 1} : ${s.type === 'BOSS' ? 'Boss' : 'Combat'}</div>`;
                if (!s.monsters || s.monsters.length === 0) {
                    html += `<div class="text-muted ml-6 mb-2 text-sm">Aucun ennemi détecté</div>`;
                } else {
                    const count = s.monsters.length;
                    html += `<div class="ml-6 mb-2 text-sm text-slate-50">${count} ennemi${count > 1 ? 's' : ''}</div>`;
                }
            } else if (s.type === 'TREASURE') {
                html += `<div class="flex-center text-warning mb-2 font-semibold gap-[0.3rem]"><span class="material-symbols-outlined icon-sm">shopping_bag</span> Étape ${index + 1} : Trésor</div>`;
            } else if (s.type === 'EVENT') {
                html += `<div class="flex-center text-purple mb-2 font-semibold gap-[0.3rem]"><span class="material-symbols-outlined icon-sm">auto_awesome</span> Étape ${index + 1} : Événement</div>`;
            }
        });
        list.innerHTML = html;
    }

    // Anomaly recap
    const anomalyNames = collectDungeonAnomaliesLocal(salles);
    const anomalySection = document.getElementById('prepAnomaliesList');
    if (anomalySection) {
        if (anomalyNames.length === 0) {
            anomalySection.style.display = 'none';
            anomalySection.innerHTML = '';
        } else {
            const badges = anomalyNames.map(name => {
                const an = pageState.allAnomalies.find(a => a.name === name);
                const color = an && window.getSpiritualiteColor ? window.getSpiritualiteColor(an.spiritualite) : '#d946ef';
                const icon = an && window.getCategoryIcon ? window.getCategoryIcon(an.category) : 'star';
                const tooltipHtml = (an && window.getAnomalyTooltipHTML) ? window.getAnomalyTooltipHTML(an, name) : name;
                return `<span class="anomaly-badge" style="border-color:${color}; background:${color}20; color:${color};" onmouseenter="window.showGlobalTooltip && window.showGlobalTooltip(this)" onmouseleave="window.hideGlobalTooltip && window.hideGlobalTooltip()" data-tooltip-html="${tooltipHtml.replace(/"/g, '&quot;')}">
                    <span class="material-symbols-outlined text-[0.9rem]">${icon}</span>${name}
                </span>`;
            }).join('');
            anomalySection.style.display = '';
            anomalySection.innerHTML = `
                <div class="font-semibold text-[0.8rem] text-purple-400 mb-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[0.9rem]">auto_awesome</span> ANOMALIES TROUVABLE
                </div>
                <div class="flex flex-wrap gap-1">${badges}</div>`;
        }
    }

    document.querySelectorAll('.char-card').forEach(c => {
        c.classList.remove('selected');
        c.classList.remove('locked');
        c.style.opacity = '1';
        c.style.pointerEvents = 'all';
    });

    // Grey out characters with level < window.currentDungeonReqLevel
    pageState.userCharacters.forEach(c => {
        const charLevel = c.voieLevel || 1;
        if (charLevel < window.currentDungeonReqLevel) {
            const card = document.getElementById('charCard_' + c.id);
            if (card) {
                card.classList.add('locked');
                card.style.opacity = '0.4';
                card.style.pointerEvents = 'none';
                card.title = `Niveau ${window.currentDungeonReqLevel} requis`;
            }
        }
    });

    document.getElementById('prepStatEmpty').classList.remove('hidden');
    document.getElementById('prepStatEmpty').style.display = '';
    document.getElementById('prepStatGrid').classList.add('hidden');
    document.getElementById('prepEquipList').innerHTML = '<div class="text-sm text-muted">Aucun équipement à afficher.</div>';

    const btn = document.getElementById('btnEnterDungeon');
    if (btn) {
        btn.classList.remove('pointer-events-none');
        btn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    renderConsumablesList();

    document.getElementById('dungeonsContent').style.display = 'none';
    document.getElementById('prepInterface').style.display = 'block';
};

window.closePrepInterface = function () {
    document.getElementById('prepInterface').style.display = 'none';
    document.getElementById('dungeonsContent').style.display = 'block';
    pageState.currentDungeonId = null;
    pageState.selectedCharIds = [];
    pageState.selectedConsumableIds = [];
};

window.startCombat = async function () {
    if (pageState.selectedCharIds.length === 0) {
        window.showNotif("Veuillez s\u00e9lectionner au moins un personnage.", true);
        return;
    }

    if (window.currentDungeonEntryCost > 0) {
        if (window.currentUser && window.currentUser.monnaie < window.currentDungeonEntryCost) {
            window.showNotif(`Fonds insuffisants. Il vous faut ${window.currentDungeonEntryCost} Or.`, true);
            return;
        }
        const confirmed = await showEntryModal(window.currentDungeonEntryCost);
        if (!confirmed) return;
    }

    const charIdsStr = pageState.selectedCharIds.join(',');
    let url = `/combat.html?dungeonId=${pageState.currentDungeonId}&characterIds=${charIdsStr}`;
    if (pageState.selectedConsumableIds.length > 0) {
        url += `&consumableIds=${pageState.selectedConsumableIds.join(',')}`;
    }
    window.location.href = url;
};

window.unlockDungeon = async function (id, cost, event) {
    const overlay = event ? (event.currentTarget || event.target).closest('.dungeon-lock-overlay') : null;
    const confirmed = await showUnlockModal(cost);
    if (!confirmed) return;

    try {
        const res = await globalFetch(`/api/pve/dungeons/${id}/unlock`, { method: 'POST' });
        if (res.ok) {
            if (overlay) {
                overlay.classList.add('unlocking');
                await new Promise(r => setTimeout(r, 800));
            }
            window.showNotif("Donjon d\u00e9bloqu\u00e9 !");
            const authRes = await globalFetch('/api/auth/me', { credentials: 'same-origin' });
            if (authRes.ok) window.currentUser = await authRes.json();
            loadDungeons();
        } else {
            const err = await res.text();
            window.showNotif(err, true);
        }
    } catch (e) {
        window.showNotif("Erreur serveur", true);
        console.error(e);
    }
};

function showUnlockModal(cost) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('unlockModal');
        const costEl = document.getElementById('unlockModalCost');
        const confirmBtn = document.getElementById('unlockModalConfirmBtn');

        costEl.textContent = cost;
        overlay.classList.add('active');

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };
        const onCancel = () => {
            cleanup();
            resolve(false);
        };
        const onOverlayClick = (e) => {
            if (e.target === overlay) onCancel();
        };
        const onKeydown = (e) => {
            if (e.key === 'Escape') onCancel();
        };

        function cleanup() {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeydown);
        }

        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeydown);
    });
}

window.closeUnlockModal = function () {
    document.getElementById('unlockModal').classList.remove('active');
};

function showEntryModal(cost) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('entryModal');
        const costEl = document.getElementById('entryModalCost');
        const confirmBtn = document.getElementById('entryModalConfirmBtn');

        costEl.textContent = cost;
        overlay.classList.add('active');

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };
        const onCancel = () => {
            cleanup();
            resolve(false);
        };
        const onOverlayClick = (e) => {
            if (e.target === overlay) onCancel();
        };
        const onKeydown = (e) => {
            if (e.key === 'Escape') onCancel();
        };

        function cleanup() {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeydown);
        }

        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeydown);
    });
}

window.closeEntryModal = function () {
    document.getElementById('entryModal').classList.remove('active');
};

// ═══════════════════════════════════════════════════════════════════════════
// CO-OP LOBBY
// ═══════════════════════════════════════════════════════════════════════════

let coopLobbyId = null;       // multiSessionId du lobby actif (hôte)
let coopLobbySSE = null;      // SSE EventSource pour les events du lobby

// ─── Toggle co-op / solo ────────────────────────────────────────────────────

window.onCoopToggleChange = function () {
    const isCoopMode = document.getElementById('coopModeToggle').checked;
    const btnSolo = document.getElementById('btnEnterDungeon');
    const btnCoop = document.getElementById('btnCreateLobby');

    if (isCoopMode) {
        btnSolo.classList.add('hidden');
        btnCoop.classList.remove('hidden');
    } else {
        btnSolo.classList.remove('hidden');
        btnCoop.classList.add('hidden');
    }
    
    // Mettre à jour le poids (qui dépend du mode Co-op)
    if (typeof renderConsumablesList === 'function') {
        renderConsumablesList();
    }
};

// ─── Synchroniser l'état du bouton co-op avec la sélection ─────────────────
// (appelé par updateHeroCountDisplay ou directement)
const _origUpdateHeroCount = window.updateHeroCountDisplay;
window.updateHeroCountDisplay = function () {
    if (_origUpdateHeroCount) _origUpdateHeroCount();
    const btnCoop = document.getElementById('btnCreateLobby');
    if (!btnCoop) return;
    const hasChars = pageState.selectedCharIds.length > 0;
    const isFull = pageState.selectedCharIds.length >= pageState.currentMaxHeroes;
    
    if (hasChars && !isFull) {
        btnCoop.classList.remove('opacity-50', 'cursor-not-allowed');
        btnCoop.title = "";
    } else {
        btnCoop.classList.add('opacity-50', 'cursor-not-allowed');
        if (isFull) {
            btnCoop.title = "Laissez une place libre au minimum pour créer le lobby";
        }
    }
};

// ─── Création du lobby (hôte) ────────────────────────────────────────────────

window.createCoopLobby = async function () {
    if (pageState.selectedCharIds.length === 0) {
        window.showNotif('Sélectionnez au moins un personnage.', true);
        return;
    }
    const isFull = pageState.selectedCharIds.length >= pageState.currentMaxHeroes;
    if (isFull) {
        window.showNotif('Laissez une place libre au minimum pour créer le lobby.', true);
        return;
    }

    if (window.currentDungeonEntryCost > 0) {
        if (window.currentUser && window.currentUser.monnaie < window.currentDungeonEntryCost) {
            window.showNotif(`Fonds insuffisants. Il vous faut ${window.currentDungeonEntryCost} Or pour entrer dans ce donjon.`, true);
            return;
        }
    }

    const charIdsParam = pageState.selectedCharIds.join(',');
    let url = `/api/pve/multi/create?characterIds=${charIdsParam}&dungeonId=${pageState.currentDungeonId}`;
    if (pageState.selectedConsumableIds.length > 0) {
        url += `&consumableIds=${pageState.selectedConsumableIds.join(',')}`;
    }

    try {
        const res = await globalFetch(url, { method: 'POST' });
        if (!res.ok) {
            const err = await res.text();
            window.showNotif(err || 'Erreur lors de la création du lobby.', true);
            return;
        }
        const lobby = await res.json();
        coopLobbyId = lobby.multiSessionId;

        // Afficher l'overlay d'attente
        document.getElementById('lobbyShortCode').textContent = lobby.shortCode;
        
        const costWarning = document.getElementById('lobbyCostWarning');
        const costAmount = document.getElementById('lobbyCostAmount');
        if (costWarning && costAmount) {
            if (window.currentDungeonEntryCost > 0) {
                costAmount.textContent = window.currentDungeonEntryCost;
                costWarning.style.display = 'block';
            } else {
                costWarning.style.display = 'none';
            }
        }

        document.getElementById('lobbyWaitingStatus').innerHTML =
            '<span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle; animation: spin 1s linear infinite;">autorenew</span> En attente du joueur 2...';
        const overlay = document.getElementById('lobbyWaitingOverlay');
        overlay.style.display = 'flex';

        // Ouvrir SSE sur ce multiSessionId pour recevoir "lobby-ready"
        coopLobbySSE = new EventSource(`/api/pve/multi/${coopLobbyId}/events`);
        coopLobbySSE.addEventListener('lobby-ready', (e) => {
            const data = JSON.parse(e.data);
            onLobbyReady(data);
        });
        coopLobbySSE.addEventListener('lobby-cancelled', () => {
            window.showNotif('Lobby annulé.', true);
            closeLobbyOverlay();
        });
        coopLobbySSE.onerror = () => {
            // SSE silently reconnects; only show error if lobby is gone
        };
    } catch (err) {
        console.error(err);
        window.showNotif('Erreur serveur.', true);
    }
};

function onLobbyReady(lobby) {
    if (coopLobbySSE) { coopLobbySSE.close(); coopLobbySSE = null; }
    document.getElementById('lobbyWaitingStatus').innerHTML =
        '<span style="color:#4ade80; font-size:1rem;">✔ Joueur 2 connecté ! Lancement...</span>';

    // Courte pause puis redirect vers combat.html en tant qu'hôte
    setTimeout(() => {
        closeLobbyOverlay();
        window.location.href = `/combat.html?sessionId=${lobby.combatSessionId}&multiId=${lobby.multiSessionId}&role=host`;
    }, 1200);
}

// ─── Annulation du lobby ─────────────────────────────────────────────────────

window.cancelCoopLobby = async function () {
    if (!coopLobbyId) { closeLobbyOverlay(); return; }
    try {
        await globalFetch(`/api/pve/multi/${coopLobbyId}/cancel`, { method: 'DELETE' });
    } catch (_) {}
    if (coopLobbySSE) { coopLobbySSE.close(); coopLobbySSE = null; }
    coopLobbyId = null;
    closeLobbyOverlay();
};

function closeLobbyOverlay() {
    document.getElementById('lobbyWaitingOverlay').style.display = 'none';
}

// ─── Modal Rejoindre un lobby ─────────────────────────────────────────────────

let joinSelectedCharIds = [];

window.openJoinLobbyModal = function () {
    joinSelectedCharIds = [];
    const modal = document.getElementById('joinLobbyModal');
    modal.style.display = 'flex';

    // Reset input and info
    const input = document.getElementById('joinLobbyCodeInput');
    if (input) input.value = '';
    const infoContainer = document.getElementById('joinLobbyInfoContainer');
    if (infoContainer) infoContainer.style.display = 'none';
    window.maxSelectableJoinChars = 4;

    // Remplir la liste de persos du joueur
    const container = document.getElementById('joinLobbyCharSelect');
    if (!pageState.userCharacters || pageState.userCharacters.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem;">Aucun personnage disponible.</div>';
        return;
    }
    container.innerHTML = pageState.userCharacters.map(c => {
        let iconsHtml = '';
        if (c.voie && c.voie.nom) {
            const cColor = window.getSpiritualiteColor ? window.getSpiritualiteColor(c.voie.nom) : '#94a3b8';
            const cIcon = window.getSpiritualiteIcon ? window.getSpiritualiteIcon(c.voie.nom) : 'route';
            iconsHtml += `<span class="material-symbols-outlined text-[0.95rem] ml-1.5 align-middle" style="color: ${cColor};" title="Voie : ${c.voie.nom}">${cIcon}</span>`;
        }
        if (c.spiritualite && c.spiritualite.nom) {
            const sColor = window.getSpiritualiteColor ? window.getSpiritualiteColor(c.spiritualite.nom) : '#a78bfa';
            const sIcon = window.getSpiritualiteIcon ? window.getSpiritualiteIcon(c.spiritualite.nom) : 'psychology';
            iconsHtml += `<span class="material-symbols-outlined text-[0.95rem] ml-0.5 align-middle" style="color: ${sColor};" title="Spiritualité : ${c.spiritualite.nom}">${sIcon}</span>`;
        }
        
        let avatarName = '';
        if (c.voie && c.voie.nom) {
            const vNom = c.voie.nom.toLowerCase();
            if (vNom.includes('consolidation')) avatarName = 'consolidation';
            else if (vNom.includes('conviction')) avatarName = 'conviction';
            else if (vNom.includes('création') || vNom.includes('creation')) avatarName = 'creation';
            else if (vNom.includes('destruction')) avatarName = 'destruction';
            else if (vNom.includes('raison')) avatarName = 'raison';
            else if (vNom.includes('sûreté') || vNom.includes('surete')) avatarName = 'surete';
            else if (vNom.includes('trahison')) avatarName = 'trahison';
            else if (vNom.includes('violence')) avatarName = 'violence';
        }

        let avatarHtml = `<span class="material-symbols-outlined" style="font-size:1.1rem; color:#818cf8;">person</span>`;
        if (avatarName) {
            avatarHtml = `<img src="/images/avatar/${avatarName}.png" alt="${avatarName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }

        return `
            <div id="joinChar_${c.id}"
                onclick="toggleJoinChar(${c.id})"
                style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.75rem; border-radius:0.6rem; border:1px solid rgba(255,255,255,0.1); margin-bottom:0.5rem; cursor:pointer; transition:all 0.2s;">
                <div style="width:2.2rem; height:2.2rem; border-radius:50%; background:rgba(99,102,241,0.2); display:flex; flex-shrink:0; align-items:center; justify-content:center;">
                    ${avatarHtml}
                </div>
                <div style="min-width:0; flex:1;">
                    <div style="font-weight:600; color:#e2e8f0; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${c.name} ${iconsHtml}
                    </div>
                    <div style="color:#64748b; font-size:0.75rem;">Niv. ${c.voieLevel || 1} &bull; ${c.totalHealthMax !== undefined ? c.totalHealthMax : c.healthMax} PV max</div>
                </div>
            </div>
        `;
    }).join('');
};

window.maxSelectableJoinChars = 4; // Default safe limit, will be updated by API

window.toggleJoinChar = function (charId) {
    const el = document.getElementById(`joinChar_${charId}`);
    const idx = joinSelectedCharIds.indexOf(charId);
    if (idx === -1) {
        if (joinSelectedCharIds.length >= window.maxSelectableJoinChars) {
            window.showNotif(`Vous ne pouvez sélectionner que ${window.maxSelectableJoinChars} héros pour ce lobby.`, true);
            return;
        }
        joinSelectedCharIds.push(charId);
        el.style.borderColor = 'rgba(14,165,233,0.6)';
        el.style.background = 'rgba(14,165,233,0.1)';
    } else {
        joinSelectedCharIds.splice(idx, 1);
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.background = '';
    }
};

window.closeJoinLobbyModal = function () {
    document.getElementById('joinLobbyModal').style.display = 'none';
};

window.updateJoinCharAvailability = function (minLevel) {
    if (!pageState.userCharacters) return;
    pageState.userCharacters.forEach(c => {
        const el = document.getElementById(`joinChar_${c.id}`);
        if (!el) return;
        
        const lvl = c.voieLevel || 1;
        if (lvl < minLevel) {
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
            // Unselect if currently selected
            const idx = joinSelectedCharIds.indexOf(c.id);
            if (idx !== -1) {
                window.toggleJoinChar(c.id);
            }
        } else {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('joinLobbyCodeInput');
    const infoContainer = document.getElementById('joinLobbyInfoContainer');

    if (input) {
        input.addEventListener('input', async (e) => {
            const code = e.target.value.trim().toUpperCase();
            if (code.length === 6) {
                try {
                    const res = await window.globalFetch(`/api/pve/multi/lobby/${code}/info`);
                    if (res.ok) {
                        const info = await res.json();
                        window.maxSelectableJoinChars = info.availableSlots;
                        
                        let hostHeroesHtml = '';
                        if (info.hostHeroInfos && info.hostHeroInfos.length > 0) {
                            const getVIcon = (nom) => {
                                const n = nom.toLowerCase();
                                if (n.includes('raison')) return { c: '#3b82f6', i: 'psychology' };
                                if (n.includes('sûreté') || n.includes('surete')) return { c: '#00e5cc', i: 'water_drop' };
                                if (n.includes('trahison')) return { c: '#ed5677', i: 'visibility_off' };
                                if (n.includes('consolidation')) return { c: '#99674c', i: 'foundation' };
                                if (n.includes('conviction')) return { c: '#b74c0b', i: 'volcano' };
                                if (n.includes('création') || n.includes('creation')) return { c: '#10b981', i: 'eco' };
                                if (n.includes('destruction')) return { c: '#ff0000', i: 'local_fire_department' };
                                if (n.includes('violence')) return { c: '#a70740', i: 'explosion' };
                                return { c: '#94a3b8', i: 'route' };
                            };
                            const getSIcon = (nom) => {
                                const n = nom.toLowerCase();
                                if (n.includes('esprit')) return { c: '#38bdf8', i: 'blur_on' };
                                if (n.includes('ténèbres') || n.includes('tenebres')) return { c: '#c084fc', i: 'dark_mode' };
                                if (n.includes('karma')) return { c: '#e7d198', i: 'all_inclusive' };
                                return { c: '#94a3b8', i: 'star' };
                            };

                            hostHeroesHtml = '<div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">' +
                                '<div style="font-size:0.75rem; color:#64748b; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;">Héros de l\'hôte</div>' +
                                '<div style="display:flex; flex-wrap:wrap; gap:0.4rem;">' +
                                info.hostHeroInfos.map(h => {
                                    let vHtml = '';
                                    if (h.voieName) {
                                        const v = getVIcon(h.voieName);
                                        vHtml = `<span class="material-symbols-outlined" style="font-size:0.9rem; color:${v.c};" title="${h.voieName}">${v.i}</span>`;
                                    }
                                    let sHtml = '';
                                    if (h.spiritualiteName) {
                                        const s = getSIcon(h.spiritualiteName);
                                        sHtml = `<span class="material-symbols-outlined" style="font-size:0.9rem; color:${s.c};" title="${h.spiritualiteName}">${s.i}</span>`;
                                    }
                                    return `
                                    <div style="flex:1 1 calc(50% - 0.2rem); background:rgba(0,0,0,0.2); padding:0.4rem 0.6rem; border-radius:0.4rem; border:1px solid rgba(255,255,255,0.05);">
                                        <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.15rem;">
                                            <div style="font-weight:600; color:#f8fafc; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${h.name}</div>
                                            <div style="display:flex; align-items:center; gap:0.25rem;">${vHtml}${sHtml}</div>
                                        </div>
                                        <div style="color:#94a3b8; font-size:0.75rem; white-space:nowrap;">
                                            Niv. ${h.level} &bull; ${h.healthMax} PV max
                                        </div>
                                    </div>`;
                                }).join('') +
                                '</div></div>';
                        }

                        infoContainer.style.display = 'block';
                        infoContainer.innerHTML = `
                            <div style="font-weight:600; color:#e2e8f0; margin-bottom:0.25rem;">Hôte : <span style="color:#38bdf8;">${info.hostUsername}</span></div>
                            <div style="color:#94a3b8; font-size:0.85rem; margin-bottom:0.5rem;">Donjon : ${info.dungeonName} (Niv. ${info.recommendedLevel})</div>
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                                <span style="color:#cbd5e1;">Héros maximum : ${info.maxHeroes}</span>
                                <span style="color:${info.availableSlots > 0 ? '#10b981' : '#f43f5e'}; font-weight:600;">Places restantes : ${info.availableSlots}</span>
                            </div>
                            ${hostHeroesHtml}
                        `;

                        window.updateJoinCharAvailability(info.dungeonLevel);

                        // Auto-unselect characters if we are over the new limit
                        while (joinSelectedCharIds.length > window.maxSelectableJoinChars) {
                            const removedId = joinSelectedCharIds[joinSelectedCharIds.length - 1];
                            window.toggleJoinChar(removedId);
                        }

                    } else {
                        infoContainer.style.display = 'none';
                        window.maxSelectableJoinChars = 4;
                        window.updateJoinCharAvailability(1);
                    }
                } catch (err) {
                    console.error("Erreur lors de la récupération des infos du lobby", err);
                    infoContainer.style.display = 'none';
                    window.maxSelectableJoinChars = 4;
                    window.updateJoinCharAvailability(1);
                }
            } else {
                infoContainer.style.display = 'none';
                window.maxSelectableJoinChars = 4;
                window.updateJoinCharAvailability(1);
            }
        });
    }
});

window.submitJoinLobby = async function () {
    const code = document.getElementById('joinLobbyCodeInput').value.trim().toUpperCase();
    if (code.length < 4) {
        window.showNotif('Entrez un code valide (6 caractères).', true);
        return;
    }
    if (joinSelectedCharIds.length === 0) {
        window.showNotif('Sélectionnez au moins un personnage.', true);
        return;
    }

    const btn = document.getElementById('btnSubmitJoin');
    btn.disabled = true;
    btn.textContent = 'Connexion...';

    try {
        // 1. Trouver le lobby par code court
        const findRes = await globalFetch(`/api/pve/multi/find/${code}`);
        if (!findRes.ok) {
            window.showNotif('Lobby introuvable ou déjà démarré.', true);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">login</span> Rejoindre';
            return;
        }
        const lobby = await findRes.json();

        // 2. Rejoindre
        const joinRes = await globalFetch(
            `/api/pve/multi/${lobby.multiSessionId}/join?characterIds=${joinSelectedCharIds.join(',')}`,
            { method: 'POST' }
        );
        if (!joinRes.ok) {
            const err = await joinRes.text();
            window.showNotif(err || 'Erreur lors du join.', true);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">login</span> Rejoindre';
            return;
        }
        const result = await joinRes.json();

        // 3. Redirect vers combat.html en tant que guest
        window.location.href = `/combat.html?sessionId=${result.sessionId}&multiId=${result.multiSessionId}&role=guest`;
    } catch (err) {
        console.error(err);
        window.showNotif(err.message || 'Erreur serveur.', true);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">login</span> Rejoindre';
    }
};
window.closeEntryModal = function () {
    document.getElementById('entryModal').classList.remove('active');
};



