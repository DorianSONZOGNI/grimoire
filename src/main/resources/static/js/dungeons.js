window.switchDungeonTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    document.getElementById(`${tabName}DungeonsSection`).classList.add('active');
};

let currentDungeonId = null;
let selectedCharIds = [];
let currentMaxHeroes = 1;
let selectedConsumableIds = [];
const MAX_CONSUMABLES = 4;
let userCharacters = [];
let availableConsumables = [];

document.addEventListener('DOMContentLoaded', () => {
    const checkAuth = () => {
        if (!window.currentUser) {
            document.getElementById('authWarning').style.display = 'block';
            return;
        }

        document.getElementById('dungeonsContent').style.display = 'block';
        loadDungeons();
        loadCharacters();
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
        const res = await fetch('/api/pve/dungeons');
        if (res.ok) {
            const dungeons = await res.json();
            const tabsHeader = document.getElementById('dungeonsTabs');
            const contentContainer = document.getElementById('dungeonsSectionsContainer');
            
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
                
                if (d.requiredSecret && d.requiredSecret.trim() !== '') {
                    catId = 'secret-' + d.requiredSecret.replace(/\s+/g, '-').toLowerCase();
                    label = d.requiredSecret;
                    
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

            let firstTab = true;
            categories.forEach(cat => {
                // Generate Tab Button
                const btn = document.createElement('button');
                btn.className = `tab-btn ${firstTab ? 'active' : ''}`;
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
                section.className = `tab-content ${firstTab ? 'active' : ''}`;
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
                                <span class="material-symbols-outlined" style="font-size: 3.5rem; margin-bottom: 0.5rem; opacity: 0.8;">lock</span>
                                <div style="font-family: 'Outfit'; font-size: 1.2rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.3rem;">Accès Verrouillé</div>
                                <div style="font-size: 0.95rem; color: #fca5a5;">Secret requis : <strong style="color: #f8fafc;">${d.requiredSecret}</strong> (Niv. ${reqLevel})</div>
                            </div>`;
                        }
                    }

                    if (!isLocked && d.unlockCostGold > 0) {
                        if (!userDungeons.includes(d.id)) {
                            isLocked = true;
                            lockedHtml = `<div class="dungeon-lock-overlay" style="background: rgba(15, 23, 42, 0.75); color: #f59e0b;">
                                <span class="material-symbols-outlined" style="font-size: 3.5rem; margin-bottom: 0.5rem; opacity: 0.8;">lock</span>
                                <div style="font-family: 'Outfit'; font-size: 1.2rem; font-weight: 700; color: #f8fafc; margin-bottom: 1rem;">Donjon Verrouillé</div>
                                <button class="btn btn-primary" onclick="event.stopPropagation(); unlockDungeon(${d.id}, ${d.unlockCostGold})" style="width: 80%; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem; border-radius: 8px; border: none; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);"><span class="material-symbols-outlined" style="font-size: 1.1rem;">lock_open</span> D\u00e9bloquer (${d.unlockCostGold} Or)</button>
                            </div>`;
                        }
                    }

                    const entryCostHtml = d.entryCostGold > 0 ? `<div style="color: #f59e0b; font-weight: 600; font-size: 0.9rem; margin-top: 0.5rem;"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle;">monetization_on</span> Co\u00fbt d'entr\u00e9e : ${d.entryCostGold} Or</div>` : '';

                    const cardHtml = `
                        <div class="dungeon-card ${isLocked ? 'locked' : ''}" ${isLocked ? '' : `onclick="openPrepInterface(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${sallesData}', ${d.maxHeroes || 1}, ${d.entryCostGold || 0})"`}>
                            ${lockedHtml}
                            <div class="dungeon-title">
                                <span class="material-symbols-outlined">castle</span>
                                ${d.name}
                            </div>
                            <div class="dungeon-level">Niveau ${d.recommendedLevel}</div>
                            <div class="dungeon-desc">${d.description || 'Affrontez les dangers qui r\u00f4dent.'}</div>
                            ${entryCostHtml}
                            <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: grid; gap: 0.4rem;">
                                <div><span style="font-weight: 600;">Salles totales :</span> ${totalSalles}</div>
                                ${combats > 0 ? `<div style="color: #ef4444; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${bosses > 0 ? `<div style="color: #dc2626; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">skull</span> Boss : ${bosses} (avec ${totalBossMobs} mob${totalBossMobs > 1 ? 's' : ''})
                                </div>` : ''}
                                ${treasures > 0 ? `<div style="color: #f59e0b; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                    <span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Tr\u00e9sors : ${treasures}
                                </div>` : ''}
                                <div style="color: #8b5cf6; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
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
        const res = await fetch('/api/personnages');
        if (res.ok) {
            userCharacters = await res.json();
            const list = document.getElementById('prepCharList');
            list.innerHTML = '';

            if (userCharacters.length === 0) {
                list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">Vous n'avez aucun personnage. Allez dans le Grimoire pour en cr\u00e9er un.</div>`;
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

            userCharacters.forEach(c => {
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
                            <div style="color: #f8fafc; font-weight: 600; font-family: 'Outfit'; font-size: 1.1rem; display: flex; align-items: center;">
                                ${c.name} ${iconsHtml}
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.85rem;">Niv. ${c.level || 1} \u2022 ${c.healthMax} PV max</div>
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
        const res = await fetch('/api/equipment/unassigned');
        if (res.ok) {
            const allUnassigned = await res.json();
            availableConsumables = allUnassigned.filter(eq => eq.slot === 'CONSOMMABLE');
        }
    } catch (e) {
        console.error(e);
    }
}

function renderConsumablesList() {
    const list = document.getElementById('prepConsumableList');
    list.innerHTML = '';

    const counterHtml = `<div style="text-align: center; margin-bottom: 0.8rem; font-size: 0.85rem; color: ${selectedConsumableIds.length >= MAX_CONSUMABLES ? '#ef4444' : '#94a3b8'};">
        <span class="material-symbols-outlined" style="font-size: 0.9rem; vertical-align: middle;">backpack</span>
        ${selectedConsumableIds.length} / ${MAX_CONSUMABLES} s\u00e9lectionn\u00e9s
    </div>`;

    if (availableConsumables.length === 0) {
        list.innerHTML = counterHtml + `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Vous n'avez aucun consommable dans votre coffre.</div>`;
        return;
    }

    let cardsHtml = '';
    availableConsumables.forEach(c => {
        const isSelected = selectedConsumableIds.includes(c.id);
        const selIndex = selectedConsumableIds.indexOf(c.id);
        const badgeHtml = isSelected ? `<div style="position: absolute; top: -6px; right: -6px; background: #10b981; color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">${selIndex + 1}</div>` : '';
        cardsHtml += `
            <div class="consumable-card ${isSelected ? 'selected' : ''}" onclick="selectConsumable(${c.id})" style="position: relative; overflow: visible;">
                <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${isSelected ? '#10b981' : '#854c4c'}; flex-shrink: 0;">inventory_2</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="color: #f8fafc; font-weight: 600; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.name}">${c.name}</div>
                    <div style="color: var(--text-muted); font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${c.bonusHealthMax ? `+${c.bonusHealthMax} PV ` : ''}
                        ${c.bonusManaMax ? `+${c.bonusManaMax} Mana ` : ''}
                        ${c.bonusPower ? `+${c.bonusPower} Pui ` : ''}
                    </div>
                </div>
                ${badgeHtml}
            </div>
        `;
    });
    list.innerHTML = counterHtml + `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">${cardsHtml}</div>`;
}

window.selectConsumable = function (id) {
    const idx = selectedConsumableIds.indexOf(id);
    if (idx !== -1) {
        selectedConsumableIds.splice(idx, 1);
    } else {
        if (selectedConsumableIds.length >= MAX_CONSUMABLES) {
            showNotif(`Vous ne pouvez s\u00e9lectionner que ${MAX_CONSUMABLES} consommables maximum.`, true);
            return;
        }
        selectedConsumableIds.push(id);
    }
    renderConsumablesList();
};

window.selectCharacter = async function (id) {
    if (selectedCharIds.includes(id)) {
        selectedCharIds = selectedCharIds.filter(cid => cid !== id);
    } else {
        if (selectedCharIds.length >= currentMaxHeroes) {
            showNotif(`Ce donjon est limit\u00e9 \u00e0 ${currentMaxHeroes} h\u00e9ros maximum.`, true);
            return;
        }
        selectedCharIds.push(id);
    }

    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    selectedCharIds.forEach(cid => {
        const card = document.getElementById('charCard_' + cid);
        if (card) card.classList.add('selected');
    });

    const btn = document.getElementById('btnEnterDungeon');
    if (btn) {
        if (selectedCharIds.length > 0) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        }
    }

    let equipments = [];
    try {
        const res = await fetch(`/api/equipment/personnage/${id}`);
        if (res.ok) {
            equipments = await res.json();
        }
    } catch (e) { console.error(e); }

    const char = userCharacters.find(c => c.id === id);
    if (!char) return;

    let totalStats = {
        healthMax: char.healthMax || 0,
        manaMax: char.manaMax || 0,
        power: char.power || 0,
        strength: char.strength || 0,
        armor: char.armor || 0,
        resistance: char.resistance || 0,
        speed: char.speed || 0,
        crit: char.crit || 0,
        regenHealthPerTurn: char.regenHealthPerTurn || 0,
        regenManaPerTurn: char.regenManaPerTurn || 0
    };

    equipments.forEach(eq => {
        totalStats.healthMax += (eq.bonusHealthMax || 0);
        totalStats.manaMax += (eq.bonusManaMax || 0);
        totalStats.power += (eq.bonusPower || 0);
        totalStats.strength += (eq.bonusStrength || 0);
        totalStats.armor += (eq.bonusArmor || 0);
        totalStats.resistance += (eq.bonusResistance || 0);
        totalStats.speed += (eq.bonusSpeed || 0);
        totalStats.crit += (eq.bonusCrit || 0);
        totalStats.regenHealthPerTurn += (eq.regenHealthPerTurn || 0);
        totalStats.regenManaPerTurn += (eq.regenManaPerTurn || 0);
    });

    document.getElementById('prepStatEmpty').style.display = 'none';
    const grid = document.getElementById('prepStatGrid');
    grid.style.display = 'grid';
    grid.innerHTML = `
        <div class="stat-item" style="color: #ec4899;"><span class="material-symbols-outlined">favorite</span> ${totalStats.healthMax} PV</div>
        <div class="stat-item" style="color: #38bdf8;"><span class="material-symbols-outlined">water_drop</span> ${totalStats.manaMax} Mana</div>
        <div class="stat-item" style="color: #a855f7;"><span class="material-symbols-outlined">auto_awesome</span> ${totalStats.power} Puissance</div>
        <div class="stat-item" style="color: #f43f5e;"><span class="material-symbols-outlined">fitness_center</span> ${totalStats.strength} Force</div>
        <div class="stat-item" style="color: #3b82f6;"><span class="material-symbols-outlined">shield</span> ${totalStats.armor} Armure</div>
        <div class="stat-item" style="color: #10b981;"><span class="material-symbols-outlined">shield</span> ${totalStats.resistance} R\u00e9sist</div>
        <div class="stat-item" style="color: #f59e0b;"><span class="material-symbols-outlined">bolt</span> ${totalStats.speed} Vitesse</div>
        <div class="stat-item" style="color: #ef4444;"><span class="material-symbols-outlined">gps_fixed</span> ${totalStats.crit}% Crit</div>
    `;

    const equipList = document.getElementById('prepEquipList');
    equipList.innerHTML = '';
    if (equipments.length === 0) {
        equipList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">Aucun \u00e9quipement port\u00e9.</div>`;
    } else {
        const iconMap = {
            'CASQUE': 'masks', 'PLASTRON': 'shield', 'BOTTES': 'footprint',
            'ANNEAU_GAUCHE': 'diamond', 'ANNEAU_DROIT': 'diamond', 'CAPE': 'carpenter'
        };
        const colorMap = {
            'COMMUN': '#94a3b8', 'RARE': '#3b82f6', 'LEGENDAIRE': '#f59e0b',
            'EPIQUE': '#ef4444', 'RELIQUE': '#c084fc'
        };
        equipments.forEach(eq => {
            const icon = iconMap[eq.slot] || 'help';
            const color = colorMap[eq.rarity] || '#f8fafc';
            const extraClass = icon === 'masks' ? 'flip-icon' : '';
            equipList.innerHTML += `
                <div class="equip-slot" style="border-left: 3px solid ${color};">
                    <div class="equip-slot-icon"><span class="material-symbols-outlined ${extraClass}">${icon}</span></div>
                    <div>
                        <div style="color: ${color}; font-weight: 600; font-size: 0.9rem;">${eq.name}</div>
                        <div style="color: var(--text-muted); font-size: 0.75rem;">${eq.slot}</div>
                    </div>
                </div>
            `;
        });
    }
};

window.openPrepInterface = function (id, name, sallesData, maxHeroes, entryCost) {
    currentDungeonId = id;
    selectedCharIds = [];
    selectedConsumableIds = [];
    currentMaxHeroes = maxHeroes || 1;
    window.currentDungeonEntryCost = entryCost || 0;

    document.getElementById('prepDungeonTitle').textContent = `${name} (Max: ${currentMaxHeroes} h\u00e9ros)`;

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
                html += `<div style="margin-bottom: 0.5rem; color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">${s.type === 'BOSS' ? 'skull' : 'swords'}</span> \u00c9tape ${index + 1} : ${s.type === 'BOSS' ? 'Boss' : 'Combat'}</div>`;
                if (!s.monsters || s.monsters.length === 0) {
                    html += `<div style="margin-left: 1.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.85rem;">Aucun ennemi d\u00e9tect\u00e9</div>`;
                } else {
                    const count = s.monsters.length;
                    html += `<div style="margin-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: #f8fafc;">${count} ennemi${count > 1 ? 's' : ''}</div>`;
                }
            } else if (s.type === 'TREASURE') {
                html += `<div style="margin-bottom: 0.5rem; color: #f59e0b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> \u00c9tape ${index + 1} : Tr\u00e9sor</div>`;
            } else if (s.type === 'EVENT') {
                html += `<div style="margin-bottom: 0.5rem; color: #8b5cf6; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> \u00c9tape ${index + 1} : \u00c9v\u00e9nement</div>`;
            }
        });
        list.innerHTML = html;
    }

    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('prepStatEmpty').style.display = 'flex';
    document.getElementById('prepStatGrid').style.display = 'none';
    document.getElementById('prepEquipList').innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Aucun \u00e9quipement \u00e0 afficher.</div>';

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
    currentDungeonId = null;
    selectedCharIds = [];
    selectedConsumableIds = [];
};

window.startCombat = async function () {
    if (selectedCharIds.length === 0) {
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

    const charIdsStr = selectedCharIds.join(',');
    let url = `/combat.html?dungeonId=${currentDungeonId}&characterIds=${charIdsStr}`;
    if (selectedConsumableIds.length > 0) {
        url += `&consumableIds=${selectedConsumableIds.join(',')}`;
    }
    window.location.href = url;
};

window.unlockDungeon = async function (id, cost) {
    const confirmed = await showUnlockModal(cost);
    if (!confirmed) return;

    try {
        const res = await fetch(`/api/pve/dungeons/${id}/unlock`, { method: 'POST' });
        if (res.ok) {
            showNotif("Donjon d\u00e9bloqu\u00e9 !");
            const authRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
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
