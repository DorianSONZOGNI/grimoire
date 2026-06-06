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
                    <div class="dungeon-card" onclick="openPrepModal(${d.id}, '${d.name.replace(/'/g, "\\'")}', '${sallesData}')">
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

window.openPrepModal = function(id, name, sallesData) {
    currentDungeonId = id;
    document.getElementById('prepDungeonName').textContent = name;
    
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
