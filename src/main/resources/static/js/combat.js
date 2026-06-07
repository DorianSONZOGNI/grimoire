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
    document.getElementById('playerCard').innerHTML = generateFighterHtml(p, true);
    
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

const GLOBAL_STAT_LABELS = {
    'SPEED': 'Vitesse', 'MANA': 'Mana Max', 'HEALTH': 'PV Max', 'CRIT': 'Critique',
    'ARMURE': 'Armure', 'RESISTANCE': 'Résistance', 'POWER': 'Puissance Mag.', 'STRENGTH': 'Force Phys.',
    'BURN': 'Brûlure', 'POISON': 'Poison', 'DAMAGE_TAKEN_MAGIC': 'Dégâts Mag. Subis',
    'DAMAGE_TAKEN_PHYSIC': 'Dégâts Phys. Subis', 'DAMAGE_TAKEN_BRUT': 'Dégâts Bruts Subis',
    'DAMAGE_GIVEN_MAGIC': 'Dégâts Mag. Infligés', 'DAMAGE_GIVEN_PHYSIC': 'Dégâts Phys. Infligés',
    'DAMAGE_GIVEN_BRUT': 'Dégâts Bruts Infligés',
    'HEAL_RECEIVED': 'Soin Reçu', 'SHIELD_RECEIVED': 'Bouclier Reçu',
    'HEAL_GIVEN': 'Soin Donné', 'SHIELD_GIVEN': 'Bouclier Donné',
    'DAMAGE_GIVEN_MAGIC_TO_SHIELD': 'Dég. Mag. au Bouclier',
    'DAMAGE_GIVEN_PHYSIC_TO_SHIELD': 'Dég. Phys. au Bouclier',
    'SHIELD_PENETRATION': 'Perce-Bouclier',
    'SHIELD_PIERCED': 'Bouclier Percé'
};

function formatStat(stat) {
    return GLOBAL_STAT_LABELS[stat] || stat;
}

function generateFighterHtml(c, isHero) {
    const roleLabel = isHero ? ' (Lanceur)' : '';
    const hpPct = c.healthMax > 0 ? Math.max(0, Math.min(100, (c.healthCurrent / c.healthMax) * 100)) : 0;
    let hpLabel = `${c.healthCurrent} / ${c.healthMax}`;
    if (c.shieldTotal > 0) hpLabel += ` (+${c.shieldTotal} 🛡️)`;

    const manaPct = c.manaMax > 0 ? Math.max(0, Math.min(100, (c.manaCurrent / c.manaMax) * 100)) : 0;
    let manaHtml = `
        <div class="gauge-container" style="margin-top: 0.5rem; text-align: left;">
            <div class="gauge-label"><span>Mana</span><span>${c.manaCurrent} / ${c.manaMax}</span></div>
            <div class="gauge-track"><div class="gauge-fill mana" style="width: ${manaPct}%;"></div></div>
        </div>`;

    const pui = c.power !== undefined ? c.power : 0;
    const forPhy = c.strength !== undefined ? c.strength : 0;
    const arm = c.armor !== undefined ? c.armor : 0;
    const res = c.resistance !== undefined ? c.resistance : 0;
    const vit = c.speed !== undefined ? c.speed : 0;
    const crit = (c.critDerived !== null && c.critDerived !== undefined) ? c.critDerived : (c.crit || 0);

    let statsHtml = `<div class="hero-stats-row" style="margin-bottom: 0.5rem; justify-content: center; display: flex; flex-wrap: wrap; gap: 0.3rem;">`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${pui} Pui</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f43f5e;">fitness_center</span>${forPhy} For</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${arm} Arm</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${res} Rés</span>`;
    if (vit > 0) statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${vit} Vit</span>`;
    if (crit > 0) statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${crit}% Crit</span>`;
    statsHtml += `</div>`;

    // Karma (if it exists)
    let passiveBadges = '';
    if (c.hasKarma) {
        let bg, border, color, icon, text, title;
        if (c.karmaLocked) {
            bg = 'rgba(239, 68, 68, 0.25)'; border = '1px solid #ef4444'; color = '#f87171'; icon = 'block';
            text = 'Karma Brisé';
        } else if (c.karmaHarmony) {
            bg = 'rgba(100, 116, 139, 0.25)'; border = '1px solid #cbd5e1'; color = '#cbd5e1'; icon = 'brightness_medium';
            text = 'Harmonie';
        } else if (c.karmaGauge < 0) {
            bg = 'rgba(147, 51, 234, 0.25)'; border = '1px solid #c084fc'; color = '#c084fc'; icon = 'dark_mode';
            text = `Ténèbres (${Math.abs(c.karmaGauge)})`;
        } else if (c.karmaGauge > 0) {
            bg = 'rgba(234, 179, 8, 0.25)'; border = '1px solid #fde047'; color = '#fde047'; icon = 'light_mode';
            text = `Lumière (${c.karmaGauge})`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)'; border = '1px dashed #6b7280'; color = '#9ca3af'; icon = 'balance';
            text = 'Karma Neutre';
        }
        passiveBadges += `<div class="sandbox-status-badge karma" style="background: ${bg}; color: ${color}; border: ${border};">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color};">${icon}</span>
            <span>${text}</span>
        </div>`;
    }

    return `
        <div class="fighter-name" style="color: ${isHero ? '#f8fafc' : '#ef4444'}; font-size: 1.2rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            ${isHero ? '🧙‍♂️' : '👹'} ${c.name}${roleLabel}
        </div>
        ${statsHtml}
        <div class="gauge-container" style="text-align: left;">
            <div class="gauge-label"><span>Santé (PV)</span><span>${hpLabel}</span></div>
            <div class="gauge-track"><div class="gauge-fill hp" style="width: ${hpPct}%;"></div></div>
        </div>
        ${manaHtml}
        <div class="sandbox-status-list" style="justify-content: center;">${passiveBadges}</div>
        <div class="sandbox-status-list" style="justify-content: center;">${renderBuffsHtml(c.buffs)}</div>
    `;
}

function renderEnemies(enemies) {
    const container = document.getElementById('enemiesContainer');
    container.innerHTML = '';
    
    enemies.forEach((activeMonster, index) => {
        const m = activeMonster.base;
        const pMonster = activeMonster.asPersonnage || activeMonster; // Fallback just in case
        const isSelected = index === selectedTargetIndex && !activeMonster.dead;
        
        // Use pMonster logic to override maxHp/currentHp if necessary
        pMonster.name = m.name;
        if (typeof activeMonster.currentHp !== 'undefined') pMonster.healthCurrent = activeMonster.currentHp;
        if (typeof activeMonster.maxHp !== 'undefined') pMonster.healthMax = activeMonster.maxHp;
        
        const div = document.createElement('div');
        div.className = `fighter fighter-enemy enemy-card ${isSelected ? 'selected' : ''} ${activeMonster.dead ? 'dead' : ''}`;
        div.onclick = () => selectTarget(index);
        
        div.innerHTML = generateFighterHtml(pMonster, false);
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
        const icon = isNegativeValue ? 'trending_down' : 'trending_up';

        let text = '';
        if (b.flatValue) text += `${b.flatValue > 0 ? '+' : ''}${b.flatValue} ${formatStat(b.statAffected)}`;
        if (b.modifier) {
            if (text) text += ' / ';
            text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}% ${formatStat(b.statAffected)}`;
        }
        if (!text) text = `Modif. de ${formatStat(b.statAffected)}`;

        return `<div class="sandbox-status-badge ${badgeClass}" title="Source: ${b.sourceName}">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">${icon}</span>
            <span>${text} (${b.duration}t)</span>
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
