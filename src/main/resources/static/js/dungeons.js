let currentDungeonId = null;
let userCharacters = [];

document.addEventListener('DOMContentLoaded', () => {
    const checkAuth = () => {
        if (!window.currentUser) {
            document.getElementById('authWarning').style.display = 'block';
            return;
        }
        
        document.getElementById('dungeonsContent').style.display = 'block';
        loadDungeons();
        loadCharacters();
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
                const monstersData = JSON.stringify(d.monsters).replace(/"/g, '&quot;');
                
                list.innerHTML += `
                    <div class="dungeon-card" onclick="openPrepModal(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${monstersData}')">
                        <div class="dungeon-title">
                            <span class="material-symbols-outlined">castle</span>
                            ${d.name}
                        </div>
                        <div class="dungeon-level">Niveau ${d.recommendedLevel}</div>
                        <div class="dungeon-desc">${d.description || 'Affrontez les dangers qui rôdent.'}</div>
                        <div style="color: #ef4444; font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 0.3rem;">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">pest_control</span>
                            ${d.monsters ? d.monsters.length : 0} Monstre(s)
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
            const select = document.getElementById('charSelect');
            select.innerHTML = '';
            
            if (userCharacters.length === 0) {
                select.innerHTML = `<option value="">Vous n'avez aucun personnage</option>`;
                return;
            }
            
            userCharacters.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name} (PV: ${c.healthMax})</option>`;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

window.openPrepModal = function(id, name, monstersData) {
    currentDungeonId = id;
    document.getElementById('prepDungeonName').textContent = name;
    
    const monsters = JSON.parse(monstersData || '[]');
    const list = document.getElementById('prepMonstersList');
    if (monsters.length === 0) {
        list.innerHTML = "Aucun monstre configuré.";
    } else {
        list.innerHTML = monsters.map(m => `• ${m.name} (PV: ${m.healthMax})`).join('<br>');
    }
    
    document.getElementById('prepModalOverlay').classList.add('show');
};

window.closePrepModal = function() {
    document.getElementById('prepModalOverlay').classList.remove('show');
    currentDungeonId = null;
};

window.startCombat = function() {
    const charId = document.getElementById('charSelect').value;
    if (!charId) {
        alert("Veuillez sélectionner un personnage.");
        return;
    }
    
    // Redirect to combat page with parameters
    window.location.href = `/combat.html?dungeonId=${currentDungeonId}&characterId=${charId}`;
};
