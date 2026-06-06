let editingMonsterId = null;

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
        
        const select = document.getElementById('dMonsters');
        const selectedMonsterIds = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
        
        const donjon = {
            name: document.getElementById('dName').value,
            description: document.getElementById('dDesc').value,
            recommendedLevel: parseInt(document.getElementById('dLevel').value),
            monsters: selectedMonsterIds.map(id => ({ id: id }))
        };

        try {
            const res = await fetch('/api/admin/pve/dungeons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(donjon)
            });
            if (res.ok) {
                alert('Donjon créé avec succès');
                document.getElementById('dungeonForm').reset();
                loadDungeons();
            } else {
                alert('Erreur lors de la création du donjon');
            }
        } catch (err) {
            console.error(err);
        }
    });
});

async function loadMonsters() {
    try {
        const res = await fetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            const list = document.getElementById('monstersList');
            const select = document.getElementById('dMonsters');
            list.innerHTML = '';
            select.innerHTML = '';
            
            monsters.forEach(m => {
                list.innerHTML += `
                    <div class="monster-card">
                        <button class="delete-btn" onclick="deleteMonster(${m.id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        <button class="delete-btn" style="right: 3rem; color: #3b82f6;" onclick="editMonster(${m.id})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <div class="monster-card-title">${m.name}</div>
                        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">${m.description || ''}</div>
                        <div class="monster-card-stats">
                            <span>❤️ PV: ${m.healthMax}</span>
                            <span>💧 Mana: ${m.manaMax || 0}</span>
                            <span>⚡ Vit: ${m.speed}</span>
                            <span>🎯 Crit: ${m.crit || 0}%</span>
                            <span>⚔️ For: ${m.strength}</span>
                            <span>🔮 Pui: ${m.power}</span>
                            <span>🛡️ Arm: ${m.armor}</span>
                            <span>✨ Rés: ${m.resistance}</span>
                            <span>💰 Or: ${m.rewardGold}</span>
                            <span>🌟 XP: ${m.rewardExp}</span>
                        </div>
                    </div>
                `;
                select.innerHTML += `<option value="${m.id}">${m.name} (PV: ${m.healthMax})</option>`;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

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
                const monstersText = d.monsters && d.monsters.length > 0 
                    ? d.monsters.map(m => m.name).join(', ') 
                    : 'Aucun monstre';
                    
                list.innerHTML += `
                    <div class="monster-card">
                        <button class="delete-btn" onclick="deleteDungeon(${d.id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        <div class="monster-card-title">${d.name} <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; margin-left: 0.5rem;">Lvl ${d.recommendedLevel}</span></div>
                        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">${d.description || ''}</div>
                        <div style="font-size: 0.85rem; color: #f8fafc; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                            <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle;">pest_control</span>
                            ${monstersText}
                        </div>
                    </div>
                `;
            });
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
