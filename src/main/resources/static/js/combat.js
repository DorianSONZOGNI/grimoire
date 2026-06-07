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
    
    let choiceKey = null;
    if (spellId) {
        const choiceSelect = document.getElementById(`choice-select-${spellId}`);
        if (choiceSelect) {
            choiceKey = choiceSelect.value;
        }
    }
    
    document.getElementById('btnAttack').disabled = true;
    const spellButtons = document.querySelectorAll('.spell-btn');
    spellButtons.forEach(btn => btn.disabled = true);
    
    // Animation attack
    const playerCard = document.getElementById('playerCard');
    playerCard.style.transform = 'translateX(50px)';
    setTimeout(() => { playerCard.style.transform = 'none'; }, 200);
    
    try {
        let url = `/api/pve/combat/${sessionId}/action?targetIndex=${selectedTargetIndex}`;
        if (spellId) url += `&spellId=${spellId}`;
        if (choiceKey !== null) url += `&choiceKey=${choiceKey}`;
        
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
    
    document.getElementById('playerArmor').textContent = `🛡️ Arm: ${p.armor}`;
    document.getElementById('playerResist').textContent = `✨ Rés: ${p.resistance}`;
    
    // Buffs player
    const playerBuffsContainer = document.getElementById('playerBuffs');
    if (playerBuffsContainer) {
        playerBuffsContainer.innerHTML = renderBuffsHtml(p.buffs || []);
    }
    
    // Render Spells
    if (data.availableSpells) {
        renderSpells(data.availableSpells);
    }
    
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
        const pMonster = activeMonster.asPersonnage || activeMonster; // Fallback just in case
        const isSelected = index === selectedTargetIndex && !activeMonster.dead;
        
        const currentHp = typeof activeMonster.currentHp !== 'undefined' ? activeMonster.currentHp : pMonster.healthCurrent;
        const maxHp = typeof activeMonster.maxHp !== 'undefined' ? activeMonster.maxHp : pMonster.healthMax;
        
        const div = document.createElement('div');
        div.className = `fighter fighter-enemy enemy-card ${isSelected ? 'selected' : ''} ${activeMonster.dead ? 'dead' : ''}`;
        div.onclick = () => selectTarget(index);
        
        div.innerHTML = `
            <div class="fighter-name" style="color: #ef4444; font-size: 1.2rem;">${m.name}</div>
            <div class="health-bar-bg" style="height: 15px;">
                <div class="health-bar-fill" style="width: ${Math.max(0, (currentHp / maxHp) * 100)}%;"></div>
                <div class="health-text" style="font-size: 0.7rem;">${currentHp} / ${maxHp}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem; color: #94a3b8; text-align: left; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 8px;">
                <div>🛡️ Arm: ${pMonster.armor || m.armor}</div>
                <div>✨ Rés: ${pMonster.resistance || m.resistance}</div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.2rem; margin-top: 0.3rem;">
                ${renderBuffsHtml(pMonster.buffs || [])}
            </div>
        `;
        
        container.appendChild(div);
    });
}

function renderBuffsHtml(buffList) {
    if (!buffList || buffList.length === 0) return '';
    return buffList.map(b => {
        const inverseStats = ['DAMAGE_TAKEN_MAGIC', 'DAMAGE_TAKEN_PHYSIC', 'DAMAGE_TAKEN_BRUT', 'SHIELD_PIERCED', 'BURN', 'POISON'];
        const isInverse = inverseStats.includes(b.statAffected);
        const isNegativeValue = b.modifier < 0 || b.flatValue < 0;

        let isBad = isNegativeValue;
        if (isInverse) isBad = !isNegativeValue;

        const badgeClass = isBad ? 'debuff' : 'buff';
        const color = isBad ? '#ef4444' : '#10b981';
        const bg = isBad ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        const icon = isNegativeValue ? 'trending_down' : 'trending_up';

        let text = '';
        if (b.flatValue) text += `${b.flatValue > 0 ? '+' : ''}${b.flatValue}`;
        if (b.modifier) {
            if (text) text += ' / ';
            text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}%`;
        }

        return `<div title="${b.sourceName} (${b.duration}t)" style="background: ${bg}; color: ${color}; border: 1px solid ${color}; font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.1rem;">
            <span class="material-symbols-outlined" style="font-size: 0.7rem;">${icon}</span>
            <span>${text}</span>
        </div>`;
    }).join('');
}

function getSpellColor(spell) {
    if (spell.voie && spell.voie.nom) {
        const n = spell.voie.nom.toLowerCase();
        if (n.includes('feu') || n.includes('pyro')) return '#ef4444';
        if (n.includes('eau') || n.includes('hydro')) return '#3b82f6';
        if (n.includes('terre') || n.includes('géo')) return '#eab308';
        if (n.includes('vent') || n.includes('anémo')) return '#10b981';
        if (n.includes('foudre') || n.includes('électro')) return '#8b5cf6';
        return '#64748b';
    }
    return '#94a3b8';
}

function renderSpells(spells) {
    const container = document.getElementById('spellsContainer');
    if (!container) return;
    
    if (spells.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic; align-self: center;">Aucun sort débloqué</div>';
        return;
    }
    
    let html = '';
    spells.forEach(sp => {
        const color = getSpellColor(sp);
        
        // Choice Key if variants exist
        let optionHtml = '';
        const choiceKeys = [];
        if (sp.effects) {
            sp.effects.forEach(e => {
                if (e.requiredChoiceKey != null && !choiceKeys.includes(e.requiredChoiceKey)) {
                    choiceKeys.push(e.requiredChoiceKey);
                }
            });
        }
        
        if (choiceKeys.length > 0) {
            optionHtml = `<select id="choice-select-${sp.id}" style="margin-bottom: 0.3rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; border-radius: 4px; font-size: 0.7rem; padding: 0.1rem;" onclick="event.stopPropagation()">
                ${choiceKeys.map(k => `<option value="${k}">Option ${k}</option>`).join('')}
            </select>`;
        }
        
        let costs = [];
        if (sp.manaCost > 0) costs.push(`<span style="color:#38bdf8;">${sp.manaCost} MP</span>`);
        if (sp.healCost > 0) costs.push(`<span style="color:#f43f5e;">${sp.healCost} PV</span>`);
        if (sp.heatCost > 0) costs.push(`<span style="color:#f97316;">${sp.heatCost} Ch</span>`);
        const costStr = costs.join(' | ');
        
        html += `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                ${optionHtml}
                <button class="action-btn spell-btn" onclick="doAction(${sp.id})" style="border-color: ${color}; flex-direction: column; padding: 0.5rem 1rem; gap: 0.2rem; min-width: 100px;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: #f8fafc;">${sp.nom}</span>
                    <span style="font-size: 0.75rem; font-weight: normal; color: rgba(255,255,255,0.7);">${costStr}</span>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
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
