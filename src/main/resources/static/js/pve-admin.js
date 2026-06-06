let editingMonsterId = null;
let editingDungeonId = null;
let allMonsters = [];
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
            rewardExp: parseInt(document.getElementById('mXp').value)
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
                alert(editingMonsterId ? 'Monstre modifié avec succès' : 'Monstre créé avec succès');
                document.getElementById('monsterForm').reset();
                editingMonsterId = null;
                document.querySelector('#monsterForm button[type="submit"]').textContent = "Créer le monstre";
                loadMonsters();
            } else {
                alert("Erreur lors de l'enregistrement du monstre");
            }
        } catch (err) {
            console.error(err);
        }
    });

    document.getElementById('dungeonForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (selectedRooms.length === 0) {
            alert("Veuillez ajouter au moins une salle au donjon.");
            return;
        }

        const donjon = {
            name: document.getElementById('dName').value,
            description: document.getElementById('dDesc').value,
            recommendedLevel: parseInt(document.getElementById('dLevel').value),
            salles: selectedRooms.map(r => {
                const s = { type: r.type };
                if (r.type === 'COMBAT') {
                    s.monsters = r.monsters.map(mId => ({ id: mId }));
                } else if (r.type === 'TREASURE') {
                    s.treasureGold = r.treasureGold || 0;
                    s.treasureExp = r.treasureExp || 0;
                } else if (r.type === 'EVENT') {
                    s.eventText = r.eventText || "Événement mystérieux";
                    s.eventEffectAmount = r.eventEffectAmount || 0;
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
                alert(editingDungeonId ? 'Donjon modifié avec succès' : 'Donjon créé avec succès');
                document.getElementById('dungeonForm').reset();
                editingDungeonId = null;
                selectedRooms = [];
                renderRooms();
                document.querySelector('#dungeonForm button[type="submit"]').textContent = "Créer le donjon";
                loadDungeons();
            } else {
                alert("Erreur lors de l'enregistrement du donjon");
            }
        } catch (err) {
            console.error(err);
        }
    });
});

window.addRoom = function (type) {
    if (type === 'COMBAT') {
        selectedRooms.push({ type: 'COMBAT', monsters: [] });
    } else if (type === 'TREASURE') {
        selectedRooms.push({ type: 'TREASURE', treasureGold: 50, treasureExp: 10 });
    } else if (type === 'EVENT') {
        selectedRooms.push({ type: 'EVENT', eventText: 'Un marchand ambulant', eventEffectAmount: 0 });
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

window.toggleLevelSelect = function() {
    const wrapper = document.getElementById('mLevelWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.toggleFilterLevelSelect = function() {
    const wrapper = document.getElementById('mLevelFilterWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectLevelOption = function(lvl, color) {
    document.getElementById('mLevel').value = lvl;
    const trigger = document.getElementById('mLevelTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color || '#38bdf8'}; font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">${lvl}</span>`;
    }
    const wrapper = document.getElementById('mLevelWrapper');
    if (wrapper) wrapper.classList.remove('open');
};

window.selectFilterLevelOption = function(lvl, label, color, icon) {
    document.getElementById('monsterLevelFilter').value = lvl;
    const trigger = document.getElementById('mLevelFilterTrigger');
    if (trigger) {
        trigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">${icon}</span> <span style="flex:1; text-align:center;">${label}</span>`;
    }
    const wrapper = document.getElementById('mLevelFilterWrapper');
    if (wrapper) wrapper.classList.remove('open');
    
    if (window.renderMonstersList) window.renderMonstersList();
};

window.toggleSortSelect = function() {
    const wrapper = document.getElementById('mSortWrapper');
    if (wrapper) {
        // close other open wrappers
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    }
};

window.selectSortOption = function(val, label, icon, color) {
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
        div.style.cssText = 'background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; position: relative;';

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

        } else if (room.type === 'TREASURE') {
            headerIcon = 'shopping_bag'; headerColor = '#f59e0b'; headerTitle = 'Salle de Trésor';
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
            `;
        } else if (room.type === 'EVENT') {
            headerIcon = 'auto_awesome'; headerColor = '#8b5cf6'; headerTitle = "Salle d'Événement";
            contentHtml = `
                <div style="margin-top: 1rem;">
                    <label style="font-size: 0.8rem; color: #94a3b8;">Texte de l'événement</label>
                    <input type="text" class="form-control" value="${room.eventText}" onchange="updateRoomField(${rIndex}, 'eventText', this.value)">
                </div>
            `;
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

window.renderMonstersList = function() {
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
        switch(sort.value) {
            case 'name_asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
            case 'name_desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
            case 'lvl_desc': filtered.sort((a,b) => (b.level||1) - (a.level||1)); break;
            case 'lvl_asc': filtered.sort((a,b) => (a.level||1) - (b.level||1)); break;
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
            if(lvlTrigger) lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">star</span> <span style="flex:1; text-align:center;">${lvl}</span>`;
            
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

            document.querySelector('#monsterForm button[type="submit"]').textContent = "Modifier le monstre";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
    }
}

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
                            <div style="color: #ef4444; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">swords</span> Combats : ${combats} (avec ${totalMobs} mob${totalMobs > 1 ? 's' : ''})
                            </div>
                            <div style="color: #f59e0b; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">shopping_bag</span> Trésors : ${treasures}
                            </div>
                            <div style="color: #8b5cf6; margin-left: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span> Event : ${events}
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

            selectedRooms = d.salles.map(s => {
                const room = { type: s.type };
                if (s.type === 'COMBAT') {
                    room.monsters = s.monsters.map(m => m.id);
                } else if (s.type === 'TREASURE') {
                    room.treasureGold = s.treasureGold;
                    room.treasureExp = s.treasureExp;
                } else if (s.type === 'EVENT') {
                    room.eventText = s.eventText;
                    room.eventEffectAmount = s.eventEffectAmount;
                }
                return room;
            });
            renderRooms();

            document.querySelector('#dungeonForm button[type="submit"]').textContent = "Modifier le donjon";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
    }
}

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
