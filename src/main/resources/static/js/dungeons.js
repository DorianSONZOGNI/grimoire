window.switchDungeonTab = function(tabName) {
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




function getMaxWeight() {
    return 10 + 5 * pageState.selectedCharIds.length;
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
    };

    if (window.currentUser !== undefined) {
        checkAuth();
    } else {
        window.addEventListener('authLoaded', checkAuth);
    }
});

function showNotif(message, isError = false) {
    const notif = document.getElementById('dungeonNotif');
    const text = document.getElementById('dungeonNotifText');
    const icon = document.getElementById('dungeonNotifIcon');
    text.textContent = message;

    if (isError) {
        icon.textContent = 'error_outline';
        notif.style.background = '#ef4444';
        notif.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.3)';
    } else {
        icon.textContent = 'check_circle';
        notif.style.background = '#10b981';
        notif.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
    }

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(100px)';
    }, 3000);
}

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
                return;
            } else {
                document.getElementById('noDungeonsMsg').style.display = 'none';
                tabsHeader.style.display = 'flex';
            }

            const categories = new Map();
            // Force Libre to be the first key in the map to guarantee tab order
            categories.set('free', { id: 'free', label: 'Libres', icon: 'public', color: '#38bdf8', dungeons: [] });

            const DEFAULT_SECRETS_META = [
                { name: "Secret du Chaos", icon: "local_fire_department", color: "#ff0000" },
                { name: "Secret de l'Abondance", icon: "eco", color: "#10b981" },
                { name: "Secret de la Préservation", icon: "foundation", color: "#99674c" },
                { name: "Secret de la Sérénité", icon: "water_drop", color: "#00e5cc" },
                { name: "Secret de la Chasse", icon: "visibility_off", color: "#ed5677" },
                { name: "Secret du Carnage", icon: "explosion", color: "#a70740" },
                { name: "Secret de la Joie", icon: "volcano", color: "#b74c0b" },
                { name: "Secret du Savoir", icon: "psychology", color: "#3b82f6" },
                { name: "Secret du Destin", icon: "all_inclusive", color: "#e7d198" },
                { name: "Secret de l'Éther", icon: "blur_on", color: "#38bdf8" },
                { name: "Secret des Abysses", icon: "dark_mode", color: "#c084fc" }
            ];

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
                    
                    const meta = DEFAULT_SECRETS_META.find(s => s.name.toLowerCase() === d.requiredSecret.toLowerCase()) || { icon: "key", color: "#f59e0b" };
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
                                <span class="material-symbols-outlined opacity-80" style="font-size: 3.5rem; margin-bottom: 0.5rem;">lock</span>
                                <div style="font-family: 'Outfit'; font-size: 1.2rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.3rem;">Accès Verrouillé</div>
                                <div style="font-size: 0.95rem; color: #fca5a5;">Secret requis : <strong style="color: #f8fafc;">${d.requiredSecret}</strong> (Niv. ${reqLevel})</div>
                            </div>`;
                        }
                    }

                    if (!isLocked && d.unlockCostGold > 0) {
                        if (!userDungeons.includes(d.id)) {
                            isLocked = true;
                            lockedHtml = `<div class="dungeon-lock-overlay" style="background: rgba(15, 23, 42, 0.75); color: #f59e0b;">
                                <span class="material-symbols-outlined opacity-80" style="font-size: 3.5rem; margin-bottom: 0.5rem;">lock</span>
                                <div style="font-family: 'Outfit'; font-size: 1.2rem; font-weight: 700; color: #f8fafc; margin-bottom: 1rem;">Donjon Verrouillé</div>
                                <button class="btn btn-primary flex-center" onclick="event.stopPropagation(); unlockDungeon(${d.id}, ${d.unlockCostGold}, event)" style="width: 80%; justify-content: center; gap: 0.4rem; padding: 0.6rem; border-radius: 8px; border: none; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);"><span class="material-symbols-outlined" style="font-size: 1.1rem;">lock_open</span> D\u00e9bloquer (${d.unlockCostGold} Or)</button>
                            </div>`;
                        }
                    }

                    const entryCostHtml = d.entryCostGold > 0 ? `<div class="text-sm" style="color: #f59e0b; font-weight: 600; margin-top: 0.5rem;"><span class="material-symbols-outlined align-middle" style="font-size: 1rem;">monetization_on</span> Co\u00fbt d'entr\u00e9e : ${d.entryCostGold} Or</div>` : '';

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
                            <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: grid; gap: 0.4rem;">
                                <div class="flex-center" style="color: #0ea5e9; font-weight: 600; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">group</span> H\u00e9ros max : ${d.maxHeroes || 1}
                                </div>
                                <div><span style="font-weight: 600;">Salles totales :</span> ${totalSalles}</div>
                                ${combats > 0 ? `<div class="flex-center text-error" style="margin-left: 0.5rem; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${bosses > 0 ? `<div class="flex-center" style="color: #dc2626; margin-left: 0.5rem; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${treasures > 0 ? `<div class="flex-center" style="color: #f59e0b; margin-left: 0.5rem; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Tr\u00e9sors : ${treasures}
                                </div>` : ''}
                                <div class="flex-center" style="color: #8b5cf6; margin-left: 0.5rem; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> \u00c9v\u00e9nements : ${events}
                                </div>
                            </div>
                        </div>
                    `;

                    grid.innerHTML += cardHtml;
                });

                firstTab = false;
            });
        }
    } catch (e) {
        console.error(e);
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

            const getVIcon = (nom) => {
                const n = nom.toLowerCase();
                if (n.includes('raison')) return { c: '#3b82f6', i: 'psychology' };
                if (n.includes('s\u00fbret\u00e9') || n.includes('surete')) return { c: '#00e5cc', i: 'water_drop' };
                if (n.includes('trahison')) return { c: '#ed5677', i: 'visibility_off' };
                if (n.includes('consolidation')) return { c: '#99674c', i: 'foundation' };
                if (n.includes('conviction')) return { c: '#b74c0b', i: 'volcano' };
                if (n.includes('cr\u00e9ation') || n.includes('creation')) return { c: '#10b981', i: 'eco' };
                if (n.includes('destruction')) return { c: '#ff0000', i: 'local_fire_department' };
                if (n.includes('violence')) return { c: '#a70740', i: 'explosion' };
                return { c: '#94a3b8', i: 'route' };
            };
            const getSIcon = (nom) => {
                const n = nom.toLowerCase();
                if (n.includes('esprit')) return { c: '#38bdf8', i: 'blur_on' };
                if (n.includes('t\u00e9n\u00e8bres') || n.includes('tenebres')) return { c: '#c084fc', i: 'dark_mode' };
                if (n.includes('karma')) return { c: '#e7d198', i: 'all_inclusive' };
                return { c: '#a78bfa', i: 'psychology' };
            };

            pageState.userCharacters.forEach(c => {
                let iconsHtml = '';
                if (c.voie && c.voie.nom) {
                    const vi = getVIcon(c.voie.nom);
                    iconsHtml += `<span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${vi.c}; margin-left: 0.5rem;" title="Voie : ${c.voie.nom}">${vi.i}</span>`;
                }
                if (c.spiritualite && c.spiritualite.nom) {
                    const si = getSIcon(c.spiritualite.nom);
                    iconsHtml += `<span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${si.c}; margin-left: 0.3rem;" title="Spiritualit\u00e9 : ${c.spiritualite.nom}">${si.i}</span>`;
                }
                list.innerHTML += `
                    <div class="char-card" id="charCard_${c.id}" onclick="selectCharacter(${c.id})">
                        <div class="char-avatar">${c.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="flex-center" style="color: #f8fafc; font-weight: 600; font-family: 'Outfit'; font-size: 1.1rem;">
                                ${c.name} ${iconsHtml}
                            </div>
                            <div class="text-muted" style="font-size: 0.85rem;">Niv. ${c.voieLevel || 1} &bull; ${c.healthMax} PV max</div>
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



window.toggleConsumableFilter = function(btn, type) {
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

    const counterHtml = `<div class="text-center" style="margin-bottom: 0.8rem; font-size: 0.85rem; color: ${isOverweight ? '#ef4444' : '#94a3b8'};">
        <span class="material-symbols-outlined text-sm align-middle">scale</span>
        Poids: ${curWeight % 1 === 0 ? curWeight : curWeight.toFixed(1)} / ${maxWeight}
    </div>`;

    if (pageState.availableConsumables.length === 0) {
        list.innerHTML = counterHtml + `<div class="text-muted text-center" style="font-size: 0.85rem; padding: 1rem;">Vous n'avez aucun consommable dans votre coffre.</div>`;
        return;
    }

    let filteredConsumables = pageState.availableConsumables;
    const hasFilter = pageState.activeConsumableFilters.hp || pageState.activeConsumableFilters.mana || pageState.activeConsumableFilters.util;
    
    if (hasFilter) {
        filteredConsumables = pageState.availableConsumables.filter(c => {
            const isHp = (c.consumableHpPercent && c.consumableHpPercent > 0) || 
                         (c.consumableMissingHpPercent && c.consumableMissingHpPercent > 0) || 
                         (c.bonusHealthMax && c.bonusHealthMax > 0) ||
                         c.consumableCategory === 'POTION_ROUGE' || 
                         c.consumableCategory === 'POTION_ROSE' || 
                         c.consumableCategory === 'NOURRITURE';
            
            const isMana = (c.consumableManaPercent && c.consumableManaPercent > 0) || 
                           (c.consumableMissingManaPercent && c.consumableMissingManaPercent > 0) || 
                           (c.bonusManaMax && c.bonusManaMax > 0) ||
                           c.consumableCategory === 'POTION_BLEUE' || 
                           c.consumableCategory === 'POTION_VIOLETTE';
            
            const isUtil = !isHp && !isMana;

            return (pageState.activeConsumableFilters.hp && isHp) || 
                   (pageState.activeConsumableFilters.mana && isMana) || 
                   (pageState.activeConsumableFilters.util && isUtil);
        });
    }

    if (filteredConsumables.length === 0) {
        list.innerHTML = counterHtml + `<div class="text-muted text-center" style="font-size: 0.85rem; padding: 1rem;">Aucun consommable ne correspond à ces filtres.</div>`;
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
        const badgeHtml = isSelected ? `<div class="flex-center text-xxs absolute" style="top: -6px; right: -6px; background: #10b981; color: white; width: 18px; height: 18px; border-radius: 50%; justify-content: center; font-weight: 700; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">${selIndex + 1}</div>` : '';
        cardsHtml += `
            <div class="consumable-card ${isSelected ? 'selected' : ''} relative" onclick="selectConsumable(${c.id})" style="overflow: visible;">
                <span class="material-symbols-outlined flex-shrink-0" style="font-size: 1.1rem; color: ${isSelected ? '#10b981' : iconColor};">${iconName}</span>
                <div style="flex: 1; min-width: 0;">
                    <div class="flex-between" style="align-items: center;">
                        <div class="whitespace-nowrap" title="${c.name}" style="color: #f8fafc; font-weight: 600; font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis;">${c.name}</div>
                        <div class="text-xxs font-bold text-muted" style="background: rgba(0,0,0,0.3); padding: 0.1rem 0.3rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.1rem;"><span class="material-symbols-outlined" style="font-size: 0.7rem;">scale</span>${c.weight % 1 === 0 ? c.weight : Number(c.weight).toFixed(1)}</div>
                    </div>
                    <div class="text-muted" style="font-size: 0.75rem; display: flex; gap: 0.4rem; flex-wrap: wrap; overflow: visible; align-items: center; margin-top: 2px;">
                        ${c.bonusHealthMax ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV">+${c.bonusHealthMax}<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">favorite</span></span>` : ''}
                        ${c.bonusManaMax ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana">+${c.bonusManaMax}<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">water_drop</span></span>` : ''}
                        ${c.consumableHpPercent ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV Max">+${c.consumableHpPercent}%<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">favorite</span></span>` : ''}
                        ${c.consumableManaPercent ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana Max">+${c.consumableManaPercent}%<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">water_drop</span></span>` : ''}
                        ${c.consumableMissingHpPercent ? `<span style="display:inline-flex; align-items:center; color:#f43f5e;" title="PV Manq">+${c.consumableMissingHpPercent}%<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">healing</span></span>` : ''}
                        ${c.consumableMissingManaPercent ? `<span style="display:inline-flex; align-items:center; color:#a855f7;" title="Mana Manq">+${c.consumableMissingManaPercent}%<span class="material-symbols-outlined" style="font-size:0.8rem; margin-left:1px;">cyclone</span></span>` : ''}
                    </div>
                </div>
                ${badgeHtml}
            </div>
        `;
    });
    list.innerHTML = counterHtml + `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">${cardsHtml}</div>`;
}

window.selectConsumable = function (id) {
    const idx = pageState.selectedConsumableIds.indexOf(id);
    if (idx !== -1) {
        pageState.selectedConsumableIds.splice(idx, 1);
    } else {
        const c = pageState.availableConsumables.find(item => item.id === id);
        const itemWeight = c ? (c.weight || 0) : 0;
        if (getCurrentWeight() + itemWeight > getMaxWeight()) {
            showNotif(`Le poids maximum serait d\u00e9pass\u00e9 !`, true);
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
            showNotif(`Inventaire r\u00e9initialis\u00e9 car le poids max a diminu\u00e9.`, true);
        }
    } else {
        if (pageState.selectedCharIds.length >= pageState.currentMaxHeroes) {
            showNotif(`Ce donjon est limit\u00e9 \u00e0 ${pageState.currentMaxHeroes} h\u00e9ros maximum.`, true);
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
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
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

    document.getElementById('prepStatEmpty').style.display = 'none';
    const grid = document.getElementById('prepStatGrid');
    grid.style.display = 'grid';
    grid.innerHTML = `
        <div class="stat-item" style="color: #ec4899;"><span class="material-symbols-outlined">favorite</span> ${totalStats.healthMax} PV</div>
        <div class="stat-item" style="color: #38bdf8;"><span class="material-symbols-outlined">water_drop</span> ${totalStats.manaMax} Mana</div>
        <div class="stat-item" style="color: #ec4899;"><span class="material-symbols-outlined">healing</span> ${totalStats.regenHealthPerTurn > 0 ? '+' : ''}${totalStats.regenHealthPerTurn} Régen PV</div>
        <div class="stat-item" style="color: #38bdf8;"><span class="material-symbols-outlined">cyclone</span> ${totalStats.regenManaPerTurn > 0 ? '+' : ''}${totalStats.regenManaPerTurn} Régen Mana</div>
        <div class="stat-item" style="color: #a855f7;"><span class="material-symbols-outlined">auto_awesome</span> ${totalStats.power} Puissance</div>
        <div class="stat-item" style="color: #f43f5e;"><span class="material-symbols-outlined">fitness_center</span> ${totalStats.strength} Force</div>
        <div class="stat-item" style="color: #3b82f6;"><span class="material-symbols-outlined">shield</span> ${totalStats.armor} Armure</div>
        <div class="stat-item text-success"><span class="material-symbols-outlined">shield</span> ${totalStats.resistance} R\u00e9sist</div>
        <div class="stat-item" style="color: #f59e0b;"><span class="material-symbols-outlined">bolt</span> ${totalStats.speed} Vitesse</div>
        <div class="stat-item text-error"><span class="material-symbols-outlined">gps_fixed</span> ${totalStats.crit}% Crit</div>
    `;

    const equipList = document.getElementById('prepEquipList');
    equipList.innerHTML = '';
    if (equipments.length === 0) {
        equipList.innerHTML = `<div class="text-sm text-muted">Aucun \u00e9quipement port\u00e9.</div>`;
    } else {
        const colorMap = {
            'COMMUN': '#94a3b8', 'INHABITUEL': '#22c55e', 'RARE': '#3b82f6', 'MYTHIQUE': '#f97316', 'LEGENDAIRE': '#eab308',
            'EPIQUE': '#ef4444', 'RELIQUE': '#a855f7', 'MAUDIT': '#6b5252'
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
                        <div class="text-muted" style="font-size: 0.75rem;">${slotName}</div>
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

    updateHeroCountDisplay();

    document.getElementById('prepDungeonTitle').textContent = `${name} (Max: ${pageState.currentMaxHeroes} h\u00e9ros)`;

    const btnEnter = document.getElementById('btnEnterDungeon');
    if (window.currentDungeonEntryCost > 0) {
        btnEnter.innerHTML = `<span class="material-symbols-outlined">swords</span> Payer ${window.currentDungeonEntryCost} Or & Entrer`;
    } else {
        btnEnter.innerHTML = `<span class="material-symbols-outlined">swords</span> ENTRER DANS LE DONJON`;
    }

    const salles = JSON.parse(decodeURIComponent(sallesData) || '[]');
    const list = document.getElementById('prepMonstersList');

    if (salles.length === 0) {
        list.innerHTML = "Aucune salle configur\u00e9e.";
    } else {
        let html = '';
        salles.forEach((s, index) => {
            if (s.type === 'COMBAT' || s.type === 'BOSS') {
                html += `<div class="flex-center text-error" style="margin-bottom: 0.5rem; font-weight: 600; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">${s.type === 'BOSS' ? 'skull' : 'swords'}</span> \u00c9tape ${index + 1} : ${s.type === 'BOSS' ? 'Boss' : 'Combat'}</div>`;
                if (!s.monsters || s.monsters.length === 0) {
                    html += `<div class="text-muted" style="margin-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.85rem;">Aucun ennemi d\u00e9tect\u00e9</div>`;
                } else {
                    const count = s.monsters.length;
                    html += `<div style="margin-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: #f8fafc;">${count} ennemi${count > 1 ? 's' : ''}</div>`;
                }
            } else if (s.type === 'TREASURE') {
                html += `<div class="flex-center" style="margin-bottom: 0.5rem; color: #f59e0b; font-weight: 600; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> \u00c9tape ${index + 1} : Tr\u00e9sor</div>`;
            } else if (s.type === 'EVENT') {
                html += `<div class="flex-center" style="margin-bottom: 0.5rem; color: #8b5cf6; font-weight: 600; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> \u00c9tape ${index + 1} : \u00c9v\u00e9nement</div>`;
            }
        });
        list.innerHTML = html;
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

    document.getElementById('prepStatEmpty').style.display = 'flex';
    document.getElementById('prepStatGrid').style.display = 'none';
    document.getElementById('prepEquipList').innerHTML = '<div class="text-sm text-muted">Aucun équipement à afficher.</div>';

    const btn = document.getElementById('btnEnterDungeon');
    if (btn) {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
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
        showNotif("Veuillez s\u00e9lectionner au moins un personnage.", true);
        return;
    }

    if (window.currentDungeonEntryCost > 0) {
        if (window.currentUser && window.currentUser.monnaie < window.currentDungeonEntryCost) {
            showNotif(`Fonds insuffisants. Il vous faut ${window.currentDungeonEntryCost} Or.`, true);
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
            showNotif("Donjon d\u00e9bloqu\u00e9 !");
            const authRes = await globalFetch('/api/auth/me', { credentials: 'same-origin' });
            if (authRes.ok) window.currentUser = await authRes.json();
            loadDungeons();
        } else {
            const err = await res.text();
            showNotif(err, true);
        }
    } catch (e) {
        showNotif("Erreur serveur", true);
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



