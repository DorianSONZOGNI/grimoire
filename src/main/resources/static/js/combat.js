let sessionId = null;
let currentSessionData = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dungeonId = urlParams.get('dungeonId');
    const characterId = urlParams.get('characterId');
    
    if (!dungeonId || !characterId) {
        alert("Paramètres de combat manquants.");
        window.location.href = '/dungeons.html';
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
            alert("Erreur lors de l'initialisation du combat.");
            window.location.href = '/dungeons.html';
            return;
        }
        
        const data = await res.json();
        sessionId = data.sessionId;
        updateUI(data);
        
        document.getElementById('btnAttack').disabled = false;
    } catch (e) {
        console.error(e);
        alert("Erreur de connexion.");
    }
}

async function doAction(spellId = null) {
    if (!sessionId) return;
    
    document.getElementById('btnAttack').disabled = true;
    
    // Animation attack
    const playerCard = document.getElementById('playerCard');
    playerCard.style.transform = 'translateX(50px)';
    setTimeout(() => { playerCard.style.transform = 'none'; }, 200);
    
    try {
        let url = `/api/pve/combat/${sessionId}/action`;
        if (spellId) {
            url += `?spellId=${spellId}`;
        }
        
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        
        // Shake enemy
        const enemyCard = document.getElementById('enemyCard');
        enemyCard.classList.add('shake');
        setTimeout(() => enemyCard.classList.remove('shake'), 500);
        
        // Let user read log by adding a small delay before full UI update
        setTimeout(() => {
            updateUI(data);
            if (!data.finished) {
                document.getElementById('btnAttack').disabled = false;
            }
        }, 600);
        
    } catch (e) {
        console.error(e);
        document.getElementById('btnAttack').disabled = false;
    }
}

function updateUI(data) {
    currentSessionData = data;
    
    document.getElementById('turnCounter').textContent = data.turnNumber;
    
    // Player
    const p = data.player;
    document.getElementById('playerName').textContent = p.name;
    document.getElementById('playerHpText').textContent = `${p.healthCurrent} / ${p.healthMax}`;
    document.getElementById('playerHpFill').style.width = `${Math.max(0, (p.healthCurrent / p.healthMax) * 100)}%`;
    document.getElementById('playerMpFill').style.width = `${Math.max(0, (p.manaCurrent / p.manaMax) * 100)}%`;
    
    document.getElementById('playerArmor').textContent = `🛡️ Arm: ${p.baseArmor}`; // Simplifying for UI
    document.getElementById('playerResist').textContent = `✨ Rés: ${p.baseResistance}`;
    
    // Enemy
    const e = data.enemyBase;
    document.getElementById('enemyName').textContent = e.name;
    document.getElementById('enemyHpText').textContent = `${data.enemyCurrentHp} / ${data.enemyMaxHp}`;
    document.getElementById('enemyHpFill').style.width = `${Math.max(0, (data.enemyCurrentHp / data.enemyMaxHp) * 100)}%`;
    
    document.getElementById('enemyArmor').textContent = `🛡️ Arm: ${e.armor}`;
    document.getElementById('enemyResist').textContent = `✨ Rés: ${e.resistance}`;
    
    // Logs
    const logContainer = document.getElementById('combatLog');
    logContainer.innerHTML = '';
    data.combatLog.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        // Colorize names
        let text = log;
        text = text.replace(new RegExp(p.name, 'g'), `<span style="color:#10b981;font-weight:600;">${p.name}</span>`);
        text = text.replace(new RegExp(e.name, 'g'), `<span style="color:#ef4444;font-weight:600;">${e.name}</span>`);
        // Colorize damages numbers
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

function showResult(playerWon) {
    document.getElementById('btnAttack').disabled = true;
    
    setTimeout(() => {
        const overlay = document.getElementById('resultOverlay');
        const title = document.getElementById('resultTitle');
        const desc = document.getElementById('resultDesc');
        
        overlay.classList.add('show');
        
        if (playerWon) {
            title.textContent = "VICTOIRE";
            title.className = "result-title victory";
            desc.textContent = "Vous avez vaincu le monstre.";
        } else {
            title.textContent = "DÉFAITE";
            title.className = "result-title defeat";
            desc.textContent = "Votre personnage est tombé au combat.";
        }
    }, 1000);
}
