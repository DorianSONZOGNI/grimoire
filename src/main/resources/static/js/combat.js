let sessionId = null;
let currentSessionData = null;
let selectedTargetIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dungeonId = urlParams.get('dungeonId');
    const characterId = urlParams.get('characterId');
    
    if (!dungeonId || !characterId) {
        alert("Paramètres de combat manquants.");
        window.location.href = '/vault.html';
        return;
    }
    
    startCombat(characterId, dungeonId);
});

async function startCombat(characterId, dungeonId) {
    try {
        const res = await fetch(`/api/pve/combat/start?characterId=${characterId}&dungeonId=${dungeonId}`, {
            method: 'POST'
        });
        
        if (!res.ok) {
            alert("Erreur lors de l'initialisation du donjon.");
            window.location.href = '/vault.html';
            return;
        }
        
        const data = await res.json();
        sessionId = data.sessionId;
        updateUI(data);
    } catch (e) {
        console.error(e);
        alert("Erreur de connexion.");
    }
}

function selectTarget(index) {
    if (!currentSessionData || !currentSessionData.enemies[index]) return;
    if (currentSessionData.enemies[index].dead) return;
    
    selectedTargetIndex = index;
    renderEnemies(currentSessionData.enemies);
}

async function doAction(spellId = null) {
    if (!sessionId || !currentSessionData) return;
    
    // Ensure we have a valid target
    if (currentSessionData.enemies.length > 0 && currentSessionData.enemies[selectedTargetIndex].dead) {
        // Auto select first alive target
        selectedTargetIndex = currentSessionData.enemies.findIndex(e => !e.dead);
        if (selectedTargetIndex === -1) return; // All dead
    }
    
    document.getElementById('btnAttack').disabled = true;
    
    // Animation attack
    const playerCard = document.getElementById('playerCard');
    playerCard.style.transform = 'translateX(50px)';
    setTimeout(() => { playerCard.style.transform = 'none'; }, 200);
    
    try {
        let url = `/api/pve/combat/${sessionId}/action?targetIndex=${selectedTargetIndex}`;
        if (spellId) {
            url += `&spellId=${spellId}`;
        }
        
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        
        // Let user read log by adding a small delay before full UI update
        setTimeout(() => {
            updateUI(data);
            if (!data.finished && data.currentRoom.type === 'COMBAT') {
                document.getElementById('btnAttack').disabled = false;
            }
        }, 600);
        
    } catch (e) {
        console.error(e);
        document.getElementById('btnAttack').disabled = false;
    }
}

async function nextRoom() {
    if (!sessionId) return;
    document.getElementById('eventOverlay').classList.remove('show');
    
    try {
        const res = await fetch(`/api/pve/combat/${sessionId}/next-room`, { method: 'POST' });
        const data = await res.json();
        updateUI(data);
    } catch (e) {
        console.error(e);
    }
}

function updateUI(data) {
    currentSessionData = data;
    
    document.getElementById('headerDungeonName').textContent = data.donjon.name + " - Étape " + (data.currentRoomIndex + 1);
    document.getElementById('turnCounter').textContent = data.turnNumber;
    
    // Player
    const p = data.player;
    document.getElementById('playerName').textContent = p.name;
    document.getElementById('playerHpText').textContent = `${p.healthCurrent} / ${p.healthMax}`;
    document.getElementById('playerHpFill').style.width = `${Math.max(0, (p.healthCurrent / p.healthMax) * 100)}%`;
    document.getElementById('playerMpFill').style.width = `${Math.max(0, (p.manaCurrent / p.manaMax) * 100)}%`;
    
    document.getElementById('playerArmor').textContent = `🛡️ Arm: ${p.baseArmor}`;
    document.getElementById('playerResist').textContent = `✨ Rés: ${p.baseResistance}`;
    
    // Auto-select first alive target if current is dead
    if (data.enemies && data.enemies.length > 0) {
        if (!data.enemies[selectedTargetIndex] || data.enemies[selectedTargetIndex].dead) {
            selectedTargetIndex = Math.max(0, data.enemies.findIndex(e => !e.dead));
        }
    }
    
    // Room logic
    if (data.currentRoom) {
        if (data.currentRoom.type === 'COMBAT') {
            document.getElementById('eventOverlay').classList.remove('show');
            document.getElementById('btnAttack').disabled = false;
            renderEnemies(data.enemies);
        } else {
            // TREASURE OR EVENT
            document.getElementById('btnAttack').disabled = true;
            document.getElementById('enemiesContainer').innerHTML = ''; // Clear enemies
            
            const overlay = document.getElementById('eventOverlay');
            const icon = document.getElementById('eventIcon');
            const title = document.getElementById('eventTitle');
            const desc = document.getElementById('eventDesc');
            
            if (data.currentRoom.type === 'TREASURE') {
                icon.textContent = 'money_bag';
                icon.style.color = '#f59e0b';
                title.textContent = 'Trésor !';
                desc.textContent = `Vous avez trouvé ${data.currentRoom.treasureGold} Or et ${data.currentRoom.treasureExp} XP.`;
            } else if (data.currentRoom.type === 'EVENT') {
                icon.textContent = 'auto_awesome';
                icon.style.color = '#8b5cf6';
                title.textContent = 'Événement';
                let effectText = "";
                if (data.currentRoom.eventEffectAmount > 0) effectText = `<br><br><span style="color:#10b981;">(Soin : ${data.currentRoom.eventEffectAmount} PV)</span>`;
                else if (data.currentRoom.eventEffectAmount < 0) effectText = `<br><br><span style="color:#ef4444;">(Dégâts : ${-data.currentRoom.eventEffectAmount} PV)</span>`;
                desc.innerHTML = data.currentRoom.eventText + effectText;
            }
            
            overlay.classList.add('show');
        }
    }
    
    // Logs
    const logContainer = document.getElementById('combatLog');
    logContainer.innerHTML = '';
    data.combatLog.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        let text = log;
        text = text.replace(new RegExp(p.name, 'g'), `<span style="color:#10b981;font-weight:600;">${p.name}</span>`);
        text = text.replace(/inflige (\d+) dégâts/g, 'inflige <span style="color:#f59e0b;font-weight:bold;">$1</span> dégâts');
        
        div.innerHTML = text;
        logContainer.appendChild(div);
    });
    
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Check finish
    if (data.finished) {
        showResult(data.playerWon);
    }
}

function renderEnemies(enemies) {
    const container = document.getElementById('enemiesContainer');
    container.innerHTML = '';
    
    enemies.forEach((activeMonster, index) => {
        const m = activeMonster.base;
        const isSelected = index === selectedTargetIndex && !activeMonster.dead;
        
        const div = document.createElement('div');
        div.className = `fighter fighter-enemy enemy-card ${isSelected ? 'selected' : ''} ${activeMonster.dead ? 'dead' : ''}`;
        div.onclick = () => selectTarget(index);
        
        div.innerHTML = `
            <div class="fighter-name" style="color: #ef4444; font-size: 1.2rem;">${m.name}</div>
            <div class="health-bar-bg" style="height: 15px;">
                <div class="health-bar-fill" style="width: ${Math.max(0, (activeMonster.currentHp / activeMonster.maxHp) * 100)}%;"></div>
                <div class="health-text" style="font-size: 0.7rem;">${activeMonster.currentHp} / ${activeMonster.maxHp}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem; color: #94a3b8; text-align: left; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 8px;">
                <div>🛡️ Arm: ${m.armor}</div>
                <div>✨ Rés: ${m.resistance}</div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function showResult(playerWon) {
    document.getElementById('btnAttack').disabled = true;
    document.getElementById('eventOverlay').classList.remove('show');
    
    setTimeout(() => {
        const overlay = document.getElementById('resultOverlay');
        const title = document.getElementById('resultTitle');
        const desc = document.getElementById('resultDesc');
        
        overlay.classList.add('show');
        
        if (playerWon) {
            title.textContent = "VICTOIRE";
            title.className = "result-title victory";
            desc.textContent = "Le donjon a été complété.";
        } else {
            title.textContent = "DÉFAITE";
            title.className = "result-title defeat";
            desc.textContent = "Votre personnage est tombé au combat.";
        }
    }, 1000);
}
