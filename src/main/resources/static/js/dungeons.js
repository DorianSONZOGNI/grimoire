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
            const list = document.getElementById('dungeonsList');
            list.innerHTML = '';

            if (dungeons.length === 0) {
                list.innerHTML = `<div style="color: var(--text-muted);">Aucun donjon disponible pour le moment.</div>`;
                return;
            }

            dungeons.forEach(d => {
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

                list.innerHTML += `
                    <div class="dungeon-card" onclick="openPrepInterface(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${sallesData}', ${d.maxHeroes || 1})">
                        <div class="dungeon-title">
                            <span class="material-symbols-outlined">castle</span>
                            ${d.name}
                        </div>
                        <div class="dungeon-level">Niveau ${d.recommendedLevel}</div>
                        <div class="dungeon-desc">${d.description || 'Affrontez les dangers qui rôdent.'}</div>
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
                            <div style="color: #8b5cf6; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> Événements : ${events}
                            </div>
                        </div>
                    </div>
                `;
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
                list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">Vous n'avez aucun personnage. Allez dans le Grimoire pour en créer un.</div>`;
                return;
            }

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
                    iconsHtml += `<span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${si.c}; margin-left: 0.3rem;" title="Spiritualité : ${c.spiritualite.nom}">${si.i}</span>`;
                }
                list.innerHTML += `
                    <div class="char-card" id="charCard_${c.id}" onclick="selectCharacter(${c.id})">
                        <div class="char-avatar">${c.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="color: #f8fafc; font-weight: 600; font-family: 'Outfit'; font-size: 1.1rem; display: flex; align-items: center;">
                                ${c.name} ${iconsHtml}
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.85rem;">Niv. ${c.level || 1} • ${c.healthMax} PV max</div>
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

    // Counter
    const counterHtml = `<div style="text-align: center; margin-bottom: 0.8rem; font-size: 0.85rem; color: ${selectedConsumableIds.length >= MAX_CONSUMABLES ? '#ef4444' : '#94a3b8'};">
        <span class="material-symbols-outlined" style="font-size: 0.9rem; vertical-align: middle;">backpack</span>
        ${selectedConsumableIds.length} / ${MAX_CONSUMABLES} sélectionnés
    </div>`;

    if (availableConsumables.length === 0) {
        list.innerHTML = counterHtml + `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Vous n'avez aucun consommable dans votre coffre.</div>`;
        return;
    }

    let cardsHtml = '';
    availableConsumables.forEach(c => {
        const isSelected = selectedConsumableIds.includes(c.id);
        const selIndex = selectedConsumableIds.indexOf(c.id);
        const badgeHtml = isSelected ? `<div style="position: absolute; top: 50%; transform: translateY(-50%); right: 10px; background: #10b981; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">${selIndex + 1}</div>` : '';
        cardsHtml += `
            <div class="consumable-card ${isSelected ? 'selected' : ''}" onclick="selectConsumable(${c.id})" style="position: relative;">
                <span class="material-symbols-outlined" style="font-size: 1.5rem; color: ${isSelected ? '#10b981' : '#854c4c'};">inventory_2</span>
                <div style="flex: 1;">
                    <div style="color: #f8fafc; font-weight: 600; font-size: 0.9rem;">${c.name}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">
                        ${c.bonusHealthMax ? `+${c.bonusHealthMax} PV ` : ''}
                        ${c.bonusManaMax ? `+${c.bonusManaMax} Mana ` : ''}
                        ${c.bonusPower ? `+${c.bonusPower} Pui ` : ''}
                    </div>
                </div>
                ${badgeHtml}
            </div>
        `;
    });
    list.innerHTML = counterHtml + cardsHtml;
}

window.selectConsumable = function (id) {
    const idx = selectedConsumableIds.indexOf(id);
    if (idx !== -1) {
        selectedConsumableIds.splice(idx, 1); // deselect
    } else {
        if (selectedConsumableIds.length >= MAX_CONSUMABLES) {
            showNotif(`Vous ne pouvez sélectionner que ${MAX_CONSUMABLES} consommables maximum.`, true);
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
            showNotif(`Ce donjon est limité à ${currentMaxHeroes} héros maximum.`, true);
            return;
        }
        selectedCharIds.push(id);
    }

    // Update visual selection
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    selectedCharIds.forEach(cid => {
        const card = document.getElementById('charCard_' + cid);
        if (card) card.classList.add('selected');
    });

    // Enable enter button if at least one character is selected
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

    // Fetch character equipments
    let equipments = [];
    try {
        const res = await fetch(`/api/equipment/personnage/${id}`);
        if (res.ok) {
            equipments = await res.json();
        }
    } catch (e) { console.error(e); }

    const char = userCharacters.find(c => c.id === id);
    if (!char) return;

    // Calculate total stats
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

    // Render Stats
    document.getElementById('prepStatEmpty').style.display = 'none';
    const grid = document.getElementById('prepStatGrid');
    grid.style.display = 'grid';
    grid.innerHTML = `
        <div class="stat-item" style="color: #ec4899;"><span class="material-symbols-outlined">favorite</span> ${totalStats.healthMax} PV</div>
        <div class="stat-item" style="color: #38bdf8;"><span class="material-symbols-outlined">water_drop</span> ${totalStats.manaMax} Mana</div>
        <div class="stat-item" style="color: #a855f7;"><span class="material-symbols-outlined">auto_awesome</span> ${totalStats.power} Puissance</div>
        <div class="stat-item" style="color: #f43f5e;"><span class="material-symbols-outlined">fitness_center</span> ${totalStats.strength} Force</div>
        <div class="stat-item" style="color: #3b82f6;"><span class="material-symbols-outlined">shield</span> ${totalStats.armor} Armure</div>
        <div class="stat-item" style="color: #10b981;"><span class="material-symbols-outlined">shield</span> ${totalStats.resistance} Résist</div>
        <div class="stat-item" style="color: #f59e0b;"><span class="material-symbols-outlined">bolt</span> ${totalStats.speed} Vitesse</div>
        <div class="stat-item" style="color: #ef4444;"><span class="material-symbols-outlined">gps_fixed</span> ${totalStats.crit}% Crit</div>
    `;

    // Render Equipments
    const equipList = document.getElementById('prepEquipList');
    equipList.innerHTML = '';
    if (equipments.length === 0) {
        equipList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">Aucun équipement porté.</div>`;
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

window.openPrepInterface = function (id, name, sallesData, maxHeroes) {
    currentDungeonId = id;
    selectedCharIds = [];
    selectedConsumableIds = [];
    currentMaxHeroes = maxHeroes || 1;

    document.getElementById('prepDungeonTitle').textContent = `${name} (Max: ${currentMaxHeroes} héros)`;

    const salles = JSON.parse(decodeURIComponent(sallesData) || '[]');
    const list = document.getElementById('prepMonstersList');

    if (salles.length === 0) {
        list.innerHTML = "Aucune salle configurée.";
    } else {
        let html = '';
        salles.forEach((s, index) => {
            if (s.type === 'COMBAT' || s.type === 'BOSS') {
                html += `<div style="margin-bottom: 0.5rem; color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">${s.type === 'BOSS' ? 'skull' : 'swords'}</span> Étape ${index + 1} : ${s.type === 'BOSS' ? 'Boss' : 'Combat'}</div>`;
                if (!s.monsters || s.monsters.length === 0) {
                    html += `<div style="margin-left: 1.5rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.85rem;">Aucun ennemi détecté</div>`;
                } else {
                    const count = s.monsters.length;
                    html += `<div style="margin-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; color: #f8fafc;">${count} ennemi${count > 1 ? 's' : ''}</div>`;
                }
            } else if (s.type === 'TREASURE') {
                html += `<div style="margin-bottom: 0.5rem; color: #f59e0b; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Étape ${index + 1} : Trésor</div>`;
            } else if (s.type === 'EVENT') {
                html += `<div style="margin-bottom: 0.5rem; color: #8b5cf6; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> Étape ${index + 1} : Événement</div>`;
            }
        });
        list.innerHTML = html;
    }

    // Reset UI
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('prepStatEmpty').style.display = 'flex';
    document.getElementById('prepStatGrid').style.display = 'none';
    document.getElementById('prepEquipList').innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Aucun équipement à afficher.</div>';

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

window.startCombat = function () {
    if (selectedCharIds.length === 0) {
        showNotif("Veuillez sélectionner au moins un personnage.", true);
        return;
    }

    const charIdsStr = selectedCharIds.join(',');
    let url = `/combat.html?dungeonId=${currentDungeonId}&characterIds=${charIdsStr}`;
    if (selectedConsumableIds.length > 0) {
        url += `&consumableIds=${selectedConsumableIds.join(',')}`;
    }

    window.location.href = url;
};
