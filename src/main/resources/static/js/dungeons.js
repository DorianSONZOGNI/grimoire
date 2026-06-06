let currentDungeonId = null;
let selectedCharId = null;
let selectedConsumableId = null;
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
                let combats = 0, treasures = 0, events = 0, totalMobs = 0;
                if (d.salles) {
                    d.salles.forEach(s => {
                        if (s.type === 'COMBAT') {
                            combats++;
                            totalMobs += (s.monsters ? s.monsters.length : 0);
                        }
                        else if (s.type === 'TREASURE') { treasures++; }
                        else if (s.type === 'EVENT') { events++; }
                    });
                }

                const sallesData = JSON.stringify(d.salles || []).replace(/"/g, '&quot;');

                list.innerHTML += `
                    <div class="dungeon-card" onclick="openPrepInterface(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${sallesData}')">
                        <div class="dungeon-title">
                            <span class="material-symbols-outlined">castle</span>
                            ${d.name}
                        </div>
                        <div class="dungeon-level">Niveau ${d.recommendedLevel}</div>
                        <div class="dungeon-desc">${d.description || 'Affrontez les dangers qui rôdent.'}</div>
                        <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: grid; gap: 0.4rem;">
                            <div><span style="font-weight: 600;">Salles totales :</span> ${totalSalles}</div>
                            <div style="color: #ef4444; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                            </div>
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

            userCharacters.forEach(c => {
                list.innerHTML += `
                    <div class="char-card" id="charCard_${c.id}" onclick="selectCharacter(${c.id})">
                        <div class="char-avatar">${c.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="color: #f8fafc; font-weight: 600; font-family: 'Outfit'; font-size: 1.1rem;">${c.name}</div>
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

    if (availableConsumables.length === 0) {
        list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Vous n'avez aucun consommable dans votre coffre.</div>`;
        return;
    }

    availableConsumables.forEach(c => {
        const isSelected = selectedConsumableId === c.id;
        list.innerHTML += `
            <div class="consumable-card ${isSelected ? 'selected' : ''}" onclick="selectConsumable(${c.id})">
                <span class="material-symbols-outlined" style="font-size: 2rem; color: ${isSelected ? '#10b981' : '#854c4c'}; margin-bottom: 0.5rem;">inventory_2</span>
                <div style="color: #f8fafc; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem;">${c.name}</div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">
                    ${c.bonusHealthMax ? `+${c.bonusHealthMax} PV ` : ''}
                    ${c.bonusManaMax ? `+${c.bonusManaMax} Mana ` : ''}
                    ${c.bonusPower ? `+${c.bonusPower} Pui ` : ''}
                </div>
            </div>
        `;
    });
}

window.selectConsumable = function (id) {
    if (selectedConsumableId === id) {
        selectedConsumableId = null; // deselect
    } else {
        selectedConsumableId = id;
    }
    renderConsumablesList();
};

window.selectCharacter = async function (id) {
    selectedCharId = id;

    // Update visual selection
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById('charCard_' + id);
    if (card) card.classList.add('selected');

    // Enable enter button
    const btn = document.getElementById('btnEnterDungeon');
    if (btn) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'all';
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

window.openPrepInterface = function (id, name, sallesData) {
    currentDungeonId = id;
    selectedCharId = null;
    selectedConsumableId = null;

    document.getElementById('prepDungeonTitle').textContent = name;

    const salles = JSON.parse(sallesData || '[]');
    const list = document.getElementById('prepMonstersList');

    if (salles.length === 0) {
        list.innerHTML = "Aucune salle configurée.";
    } else {
        let html = '';
        salles.forEach((s, index) => {
            if (s.type === 'COMBAT') {
                html += `<div style="margin-bottom: 0.5rem; color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Étape ${index + 1} : Combat</div>`;
                if (!s.monsters || s.monsters.length === 0) {
                    html += `<div style="margin-left: 1.5rem; color: #94a3b8; font-size: 0.85rem;">Aucun monstre</div>`;
                } else {
                    s.monsters.forEach(m => {
                        html += `<div style="margin-left: 1.5rem; font-size: 0.85rem; color: #f8fafc;">• ${m.name} (Lvl ${m.level || 1} - PV: ${m.healthMax})</div>`;
                    });
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
    document.getElementById('prepStatEmpty').style.display = 'block';
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
    selectedCharId = null;
    selectedConsumableId = null;
};

window.startCombat = function () {
    if (!selectedCharId) {
        alert("Veuillez sélectionner un personnage.");
        return;
    }

    let url = `/combat.html?dungeonId=${currentDungeonId}&characterId=${selectedCharId}`;
    if (selectedConsumableId) {
        url += `&consumableId=${selectedConsumableId}`;
    }

    window.location.href = url;
};
