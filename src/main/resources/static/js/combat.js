import * as ui from './ui.js';
import { getSpellEffectsSummaryHtml } from './grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from './filters.js';

function getSpellColor(sp) {
    if (sp.voie && sp.voie.nom) {
        return getVoieButtonColor(sp.voie);
    }
    if (sp.spiritualite && sp.spiritualite.nom) {
        return getSpiritButtonColor(sp.spiritualite);
    }
    return '#ffffff';
}


let sessionId = null;
let currentSessionData = null;
let selectedTargetIndex = null;
let selectedAllyIndex = -1;

window.doAction = doAction;
window.endTurn = endTurn;
window.nextRoom = nextRoom;
window.showGlobalTooltip = ui.showGlobalTooltip;
window.hideGlobalTooltip = ui.hideGlobalTooltip;
window.initiateCombatCast = initiateCombatCast;
window.confirmCombatCast = confirmCombatCast;
window.cancelCombatCast = cancelCombatCast;

let currentSpellFilter = 'ALL';
window.filterSpells = function (filter) {
    currentSpellFilter = filter;
    if (currentSessionData) {
        renderSpells(currentSessionData.availableSpells);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dungeonId = urlParams.get('dungeonId');
    const characterIds = urlParams.get('characterIds');

    if (!dungeonId || !characterIds) {
        alert("Paramètres de combat manquants.");
        window.location.href = '/vault.html';
        return;
    }

    startCombat(characterIds, dungeonId);
});

async function startCombat(characterIds, dungeonId) {
    try {
        const res = await fetch(`/api/pve/combat/start?characterIds=${characterIds}&dungeonId=${dungeonId}`, {
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



// Ally target selection is now handled entirely within the combat prompt mode
// ===== Target Selection for Cast =====
let pendingCastSpellId = null;

function initiateCombatCast(spellId) {
    if (!currentSessionData) return;
    
    let needsEnemy = false;
    let needsAlly = false;
    let targetType = 'ENNEMI'; // default
    
    const enemyCards = document.querySelectorAll('.fighter-enemy:not(.dead)');
    const allyCards = document.querySelectorAll('.fighter-player:not(.dead)'); // Now includes active player!
    
    let requiresEnemySelection = false;
    let requiresAllySelection = false;

    if (spellId) {
        const sp = currentSessionData.availableSpells.find(s => s.id === spellId);
        if (!sp) return;

        const choiceSelect = document.getElementById(`choice-select-${spellId}`);
        const currentChoiceKey = choiceSelect ? choiceSelect.value : null;

        const effects = sp.effects || [];
        const activeEffects = effects.filter(e => {
            if (e.requiredChoiceKey == null) return true;
            return String(e.requiredChoiceKey) === String(currentChoiceKey);
        });

        if (activeEffects.length > 0) {
            targetType = activeEffects[0].effectTarget || activeEffects[0].effect_target;
        }

        const targets = activeEffects.map(e => e.effectTarget || e.effect_target);
        const hasTarget = targets.includes('TARGET');
        const hasAlly = targets.includes('ALLY');
        const hasAllEnemies = targets.includes('ALL_ENEMIES');
        const hasAllAllies = targets.includes('ALL_ALLIES');
        const hasEveryone = targets.includes('EVERYONE');
        const hasCaster = targets.includes('CASTER');

        needsEnemy = hasTarget || hasAllEnemies || hasEveryone;
        needsAlly = hasAlly || hasAllAllies || hasEveryone;
        
        requiresEnemySelection = hasTarget && enemyCards.length > 1;
        requiresAllySelection = hasAlly && allyCards.length > 1;
    } else {
        // Basic attack
        needsEnemy = true;
        requiresEnemySelection = enemyCards.length > 1;
    }

    const multiEnemy = requiresEnemySelection;
    const multiAlly = requiresAllySelection;

    cancelCombatCast(); // Clean previous state
    pendingCastSpellId = spellId;
    
    const cardEl = spellId ? document.getElementById(`spell-card-${spellId}`) : document.getElementById('btnAttack');
    
    // Disable all other buttons
    document.querySelectorAll('.combat-spell-card, .action-btn, .filter-radio, .filter-chip').forEach(btn => {
        if (btn !== cardEl) {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
        }
    });

    if (cardEl) cardEl.classList.add('pending-cast');

    if (spellId !== null && cardEl) {
        const overlay = document.createElement('div');
        overlay.className = 'spell-cast-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(2px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            border-radius: inherit; z-index: 20; gap: 0.5rem;
        `;
        
        if (multiEnemy || multiAlly) {
            overlay.innerHTML = `
                <span style="font-size: 0.9rem; font-weight: 600; color: #e2e8f0;">Sélectionnez une cible</span>
                <button type="button" onclick="event.stopPropagation(); cancelCombatCast()" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.3rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-family: 'Outfit', sans-serif;">Annuler</button>
            `;
        } else {
            overlay.innerHTML = `
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="event.stopPropagation(); confirmCombatCast(null, 'direct')" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); padding: 0.4rem 1rem; border-radius: 4px; font-size: 0.9rem; cursor: pointer; font-family: 'Outfit', sans-serif; font-weight: bold;">Lancer</button>
                    <button type="button" onclick="event.stopPropagation(); cancelCombatCast()" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.4rem 1rem; border-radius: 4px; font-size: 0.9rem; cursor: pointer; font-family: 'Outfit', sans-serif; font-weight: bold;">Annuler</button>
                </div>
            `;
            if (needsEnemy) enemyCards.forEach(card => card.classList.add('target-highlight'));
            if (needsAlly) allyCards.forEach(card => card.classList.add('target-highlight'));
            if (targetType === 'LANCEUR') {
                const activeCard = document.querySelector('.fighter-player.active');
                if (activeCard) activeCard.classList.add('target-highlight');
            }
        }
        cardEl.appendChild(overlay);
    } else if (cardEl) {
        // Attack button
        cardEl.dataset.originalHtml = cardEl.innerHTML;
        if (multiEnemy) {
            cardEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;"><span style="font-size:0.8rem; color:#e2e8f0;">Ciblez un ennemi</span> <button onclick="event.stopPropagation(); cancelCombatCast()" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); padding: 0.2rem 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button></div>`;
        } else {
            cardEl.innerHTML = `
                <div style="display:flex;gap:0.5rem;">
                    <button onclick="event.stopPropagation(); confirmCombatCast(null, 'direct')" style="background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); padding: 0.2rem 0.6rem; border-radius:4px; cursor:pointer; font-weight:bold;">Lancer</button>
                    <button onclick="event.stopPropagation(); cancelCombatCast()" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); padding: 0.2rem 0.6rem; border-radius:4px; cursor:pointer; font-weight:bold;">Annuler</button>
                </div>
            `;
            enemyCards.forEach(card => card.classList.add('target-highlight'));
        }
    }

    // ALWAYS make valid targets selectable, even if there's only 1 target
    if (needsEnemy) {
        enemyCards.forEach(card => {
            card.classList.add('target-selectable');
            card.dataset.oldOnClick = card.getAttribute('onclick');
            card.setAttribute('onclick', `confirmCombatCast(${card.dataset.index}, 'enemy')`);
        });
    }
    
    if (needsAlly) {
        allyCards.forEach(card => {
            card.classList.add('target-selectable');
            card.dataset.oldOnClick = card.getAttribute('onclick');
            const idx = Array.from(card.parentNode.children).indexOf(card);
            card.setAttribute('onclick', `confirmCombatCast(${idx}, 'ally')`);
        });
    }
    
    if (targetType === 'LANCEUR') {
        const activePlayerCard = document.querySelector('.fighter-player.active');
        if (activePlayerCard) {
            activePlayerCard.classList.add('target-selectable');
            activePlayerCard.dataset.oldOnClick = activePlayerCard.getAttribute('onclick');
            const idx = Array.from(activePlayerCard.parentNode.children).indexOf(activePlayerCard);
            activePlayerCard.setAttribute('onclick', `confirmCombatCast(${idx}, 'ally')`);
        }
    }
}

function confirmCombatCast(index, type) {
    if (type === 'enemy') {
        selectedTargetIndex = index;
    } else if (type === 'ally') {
        selectedAllyIndex = index;
    }
    const spellId = pendingCastSpellId;
    cancelCombatCast();
    doAction(spellId);
}

function cancelCombatCast() {
    const enemyCards = document.querySelectorAll('.fighter-enemy');
    enemyCards.forEach(card => {
        card.classList.remove('target-selectable', 'target-highlight');
        if (card.dataset.oldOnClick) {
            card.setAttribute('onclick', card.dataset.oldOnClick);
        } else {
            card.removeAttribute('onclick');
        }
    });

    const allyCards = document.querySelectorAll('.fighter-player');
    allyCards.forEach(card => {
        card.classList.remove('target-selectable', 'target-highlight');
        if (card.dataset.oldOnClick) {
            card.setAttribute('onclick', card.dataset.oldOnClick);
        } else {
            card.removeAttribute('onclick');
        }
    });

    const prompt = document.getElementById('combatTargetPrompt');
    if (prompt) prompt.remove();

    // Remove pending-cast styles and restore buttons
    document.querySelectorAll('.pending-cast').forEach(el => {
        el.classList.remove('pending-cast');
        const overlay = el.querySelector('.spell-cast-overlay');
        if (overlay) overlay.remove();
        
        // Restore original content if we replaced it (for attack button)
        if (el.id === 'btnAttack' && el.dataset.originalHtml) {
            el.innerHTML = el.dataset.originalHtml;
        }
    });
    
    // Enable all buttons
    document.querySelectorAll('.combat-spell-card, .action-btn, .filter-radio').forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    });
    
    // Attack button specific disable check
    const btnAttack = document.getElementById('btnAttack');
    if (btnAttack && currentSessionData && currentSessionData.activePlayer && currentSessionData.activePlayer.banalSpellCastThisTurn) {
        btnAttack.classList.add('disabled');
        btnAttack.style.pointerEvents = 'none';
        btnAttack.style.opacity = '0.5';
    }

    pendingCastSpellId = null;
}

async function doAction(spellId = null) {
    if (!sessionId || !currentSessionData) return;

    // Ensure we have a valid target
    if (currentSessionData.enemies.length > 0 && (selectedTargetIndex === null || currentSessionData.enemies[selectedTargetIndex].dead)) {
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
    const btnEnd = document.getElementById('btnEndTurn');
    if (btnEnd) btnEnd.disabled = true;
    const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
    spellButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });

    // Animation attack
    const activePlayerCard = document.querySelector('.fighter-player.active');
    if (activePlayerCard) {
        activePlayerCard.style.transform = 'translateX(50px)';
        setTimeout(() => { activePlayerCard.style.transform = 'none'; }, 200);
    }

    try {
        let url = `/api/pve/combat/${sessionId}/action?targetIndex=${selectedTargetIndex}`;
        if (selectedAllyIndex !== -1) url += `&allyTargetIndex=${selectedAllyIndex}`;
        if (spellId) url += `&spellId=${spellId}`;
        if (choiceKey !== null) url += `&choiceKey=${choiceKey}`;

        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        // Let user read log by adding a small delay before full UI update
        setTimeout(() => {
            selectedAllyIndex = -1; // Reset after action completes
            updateUI(data);
            if (!data.finished && data.currentRoom.type === 'COMBAT') {
                document.getElementById('btnAttack').disabled = false;
                const btnEnd = document.getElementById('btnEndTurn');
                if (btnEnd) btnEnd.disabled = false;
            }
        }, 600);

    } catch (e) {
        console.error(e);
        document.getElementById('btnAttack').disabled = false;
        const btnEnd = document.getElementById('btnEndTurn');
        if (btnEnd) btnEnd.disabled = false;
    }
}

async function endTurn() {
    if (!sessionId || !currentSessionData) return;

    document.getElementById('btnEndTurn').disabled = true;
    document.getElementById('btnAttack').disabled = true;
    const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
    spellButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });

    try {
        let url = `/api/pve/combat/${sessionId}/end-turn`;
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        setTimeout(() => {
            updateUI(data);
            if (!data.finished && data.currentRoom.type === 'COMBAT') {
                document.getElementById('btnEndTurn').disabled = false;
                document.getElementById('btnAttack').disabled = false;
            }
        }, 600);

    } catch (e) {
        console.error(e);
        document.getElementById('btnEndTurn').disabled = false;
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

    let isActiveEnemy = false;
    let activeEnemyIndex = -1;

    if (data.turnOrder && data.turnOrder.length > data.currentTurnIndex && !data.finished) {
        const currentTurn = data.turnOrder[data.currentTurnIndex];
        if (!currentTurn.player) {
            isActiveEnemy = true;
            activeEnemyIndex = currentTurn.index;
        }
    }

    document.getElementById('headerDungeonName').textContent = data.donjon.name + " - Étape " + (data.currentRoomIndex + 1);
    document.getElementById('turnCounter').textContent = data.turnNumber;

    // Players
    const playersContainer = document.getElementById('playersContainer');
    if (playersContainer) {
        playersContainer.innerHTML = '';
        data.players.forEach((p, index) => {
            let isActive = false;
            if (data.turnOrder && data.turnOrder.length > data.currentTurnIndex) {
                const currentTurn = data.turnOrder[data.currentTurnIndex];
                if (currentTurn.player && currentTurn.index === index) {
                    isActive = true;
                }
            }
            
            const isDead = p.healthCurrent <= 0;
            const isAllySelected = index === selectedAllyIndex;

            const div = document.createElement('div');
            div.className = `fighter fighter-player ${isActive ? 'active' : ''} ${isAllySelected ? 'selected-ally' : ''} ${isDead ? 'dead' : ''}`;

            if (isAllySelected) {
                div.style.borderColor = '#10b981';
                div.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                div.style.transform = 'scale(1.02)';
            } else if (isActive) {
                div.style.borderColor = '#38bdf8';
                div.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.4)';
                div.style.transform = 'scale(1.05)';
            } else if (isDead) {
                div.style.opacity = '0.4';
                div.style.filter = 'grayscale(1)';
            } else {
                div.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                div.style.transform = 'scale(0.95)';
            }
            div.innerHTML = generateFighterHtml(p, true);
            playersContainer.appendChild(div);
        });
    }

    // Render Spells
    if (data.availableSpells) {
        renderSpells(data.availableSpells);
    }

    // Auto-select first alive target if current is dead
    if (data.enemies && data.enemies.length > 0 && selectedTargetIndex !== null) {
        if (!data.enemies[selectedTargetIndex] || data.enemies[selectedTargetIndex].dead) {
            selectedTargetIndex = data.enemies.findIndex(e => !e.dead);
            if (selectedTargetIndex === -1) selectedTargetIndex = null;
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
        data.players.forEach(p => {
            text = text.replace(new RegExp(p.name, 'g'), `<span style="color:#10b981;font-weight:600;">${p.name}</span>`);
        });
        text = text.replace(/inflige (\d+) dégâts/g, 'inflige <span style="color:#f59e0b;font-weight:bold;">$1</span> dégâts');

        div.innerHTML = text;
        logContainer.appendChild(div);
    });

    logContainer.scrollTop = logContainer.scrollHeight;

    // Check finish
    if (data.finished) {
        showResult(data.playerWon);
    } else if (isActiveEnemy) {
        // Disable UI
        document.getElementById('btnAttack').disabled = true;
        const btnEnd = document.getElementById('btnEndTurn');
        if (btnEnd) btnEnd.disabled = true;
        const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
        spellButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
        });

        // Trigger animation and auto-turn
        setTimeout(() => {
            const activeEnemyCard = document.querySelector(`.fighter-enemy[data-index="${activeEnemyIndex}"]`);
            if (activeEnemyCard) {
                activeEnemyCard.style.transform = 'translateX(-50px)';
                setTimeout(() => { 
                    if (activeEnemyCard.classList.contains('active')) {
                        activeEnemyCard.style.transform = 'scale(1.05)';
                    } else {
                        activeEnemyCard.style.transform = 'none';
                    }
                }, 200);
            }
            
            setTimeout(async () => {
                try {
                    const res = await fetch(`/api/pve/combat/${sessionId}/auto-turn`, { method: 'POST' });
                    const newData = await res.json();
                    updateUI(newData);
                } catch (e) {
                    console.error(e);
                }
            }, 600); // Fetch next turn
        }, 500); // Pause before attack animation
    } else {
        // Player turn: enable buttons
        const btnAttack = document.getElementById('btnAttack');
        if (btnAttack) {
            const canAttack = data.activePlayer && !data.activePlayer.banalSpellCastThisTurn;
            btnAttack.disabled = !canAttack;
            if (!canAttack) {
                btnAttack.classList.add('disabled');
                btnAttack.style.pointerEvents = 'none';
                btnAttack.style.opacity = '0.5';
            } else {
                btnAttack.classList.remove('disabled');
                btnAttack.style.pointerEvents = 'auto';
                btnAttack.style.opacity = '1';
            }
        }

        const btnEnd = document.getElementById('btnEndTurn');
        if (btnEnd) btnEnd.disabled = false;
    }
}

// Removed GLOBAL_STAT_LABELS and formatStat (imported from ui.js)

function generateFighterHtml(c, isHero) {
    const hpPct = c.healthMax > 0 ? Math.max(0, Math.min(100, (c.healthCurrent / c.healthMax) * 100)) : 0;
    let hpLabel = `${c.healthCurrent} / ${c.healthMax}`;
    if (c.shieldTotal > 0) hpLabel += ` (+${c.shieldTotal} 🛡️)`;

    const manaPct = c.manaMax > 0 ? Math.max(0, Math.min(100, (c.manaCurrent / c.manaMax) * 100)) : 0;
    let manaHtml = `
        <div class="gauge-container" style="margin-top: 0.5rem; text-align: left;">
            <div class="gauge-label"><span>Mana</span><span>${c.manaCurrent} / ${c.manaMax}</span></div>
            <div class="gauge-track"><div class="gauge-fill mana" style="width: ${manaPct}%;"></div></div>
        </div>`;

    const getEffectiveStat = (statName) => {
        let base = 0;
        switch (statName) {
            case 'POWER': base = c.power || 0; break;
            case 'STRENGTH': base = c.strength || 0; break;
            case 'ARMURE': base = c.armor || 0; break;
            case 'RESISTANCE': base = c.resistance || 0; break;
            case 'SPEED': base = c.speed || 0; break;
            case 'CRIT': base = (c.critDerived !== null && c.critDerived !== undefined) ? c.critDerived : (c.crit || 0); break;
        }

        let flatBonus = 0;
        let multiplier = 1.0;

        if (c.passiveStates && c.passiveStates['stat_flat_' + statName]) {
            flatBonus += c.passiveStates['stat_flat_' + statName];
        }

        const buffs = c.activeBuffs || c.buffs || [];
        buffs.forEach(b => {
            if (b.statAffected === statName) {
                if (b.flatValue) flatBonus += b.flatValue;
                if (b.modifier) multiplier += b.modifier;
            }
        });

        return Math.round((base + flatBonus) * Math.max(0, multiplier));
    };

    const pui = getEffectiveStat('POWER');
    const forPhy = getEffectiveStat('STRENGTH');
    const arm = getEffectiveStat('ARMURE');
    const res = getEffectiveStat('RESISTANCE');
    const vit = getEffectiveStat('SPEED');
    const crit = getEffectiveStat('CRIT');

    let statsHtml = `<div class="hero-stats-row" style="margin-bottom: 0.5rem; justify-content: center; display: flex; flex-wrap: wrap; gap: 0.3rem;">`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${pui} Pui</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f43f5e;">fitness_center</span>${forPhy} For</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${arm} Arm</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${res} Rés</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${vit} Vit</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${crit}% Crit</span>`;

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('destruction')) {
        let heat = 0;
        if (c.passiveStates && c.passiveStates['destruction_heat'] !== undefined) {
            heat = c.passiveStates['destruction_heat'];
        }
        statsHtml += `<span class="hero-stat-chip" title="Chaleur accumulée" style="border-color: rgba(249, 115, 22, 0.4);"><span class="material-symbols-outlined" style="color: #f97316;">local_fire_department</span>${heat}/100</span>`;
    }

    if (c.voie && c.voie.nom && (c.voie.nom.toLowerCase().includes('surete') || c.voie.nom.toLowerCase().includes('sûreté'))) {
        let suretePoints = 0;
        if (c.passiveStates && c.passiveStates['surete_points'] !== undefined) {
            suretePoints = c.passiveStates['surete_points'];
        }
        statsHtml += `<span class="hero-stat-chip" title="Points de Sûreté" style="border-color: rgba(20, 184, 166, 0.4);"><span class="material-symbols-outlined" style="color: #14b8a6;">security</span>${suretePoints}</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('violence')) {
        let insp = 0, exp = 0;
        if (c.passiveStates) {
            if (c.passiveStates['violence_inspiration'] !== undefined) insp = c.passiveStates['violence_inspiration'];
            if (c.passiveStates['violence_expiration'] !== undefined) exp = c.passiveStates['violence_expiration'];
        }
        statsHtml += `<span class="hero-stat-chip" title="Inspiration (Violence)" style="border-color: rgba(220, 38, 38, 0.4);"><span class="material-symbols-outlined" style="color: #dc2626;">storm</span>${insp} Insp</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Expiration (Violence)" style="border-color: rgba(217, 70, 239, 0.4);"><span class="material-symbols-outlined" style="color: #d946ef;">air</span>${exp} Exp</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('raison')) {
        let raisonStacks = 0;
        if (c.passiveStates && c.passiveStates['raison_speed_stacks'] !== undefined) {
            raisonStacks = c.passiveStates['raison_speed_stacks'];
        }
        statsHtml += `<span class="hero-stat-chip" title="Cumuls de Vitesse (Raison)" style="border-color: rgba(234, 179, 8, 0.4);"><span class="material-symbols-outlined" style="color: #eab308;">speed</span>${raisonStacks}</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('trahison')) {
        let baseAvail = !(c.passiveStates && c.passiveStates['trahison_used_this_turn']);
        let lowHpAvail = !(c.passiveStates && c.passiveStates['trahison_low_hp_used_this_turn']);
        let debuffAvail = !(c.passiveStates && c.passiveStates['trahison_debuff_used_this_turn']);

        let styleBase = baseAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        let styleLowHp = lowHpAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        let styleDebuff = debuffAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';

        statsHtml += `<span class="hero-stat-chip" title="1er attaque physique du tour (+10% dégâts physiques)" style="${styleBase}"><span class="material-symbols-outlined" style="color: inherit;">bolt</span>+10%</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Cible < 50% PV (+15% dégâts physiques)" style="${styleLowHp}"><span class="material-symbols-outlined" style="color: inherit;">heart_broken</span>+15%</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Cible avec Débuff (+10% dégâts physiques)" style="${styleDebuff}"><span class="material-symbols-outlined" style="color: inherit;">trending_down</span>+10%</span>`;
    }

    if (c.voie && c.voie.nom && (c.voie.nom.toLowerCase().includes('création') || c.voie.nom.toLowerCase().includes('creation'))) {
        let isAvail = !(c.passiveStates && c.passiveStates['creation_spells_cast'] > 0);
        let styleCreation = isAvail ? 'border-color: rgba(16, 185, 129, 0.6); color: #10b981;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        statsHtml += `<span class="hero-stat-chip" title="Bonus sur le premier sort" style="${styleCreation}"><span class="material-symbols-outlined" style="color: inherit;">auto_awesome</span>Graine</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('consolidation')) {
        let level = 0;
        if (c.passiveStates && c.passiveStates['consolidation_active_level'] !== undefined) {
            level = c.passiveStates['consolidation_active_level'];
        }

        let icon = 'shield', color = '#9ca3af', borderColor = 'rgba(156, 163, 175, 0.4)', text = '+5% Armure', title = "Consolidation (Défaut)";
        if (level === 1) {
            icon = 'speed'; color = '#f59e0b'; borderColor = 'rgba(245, 158, 11, 0.4)'; text = '+1 Vit'; title = "Consolidation (Niveau 1)";
        } else if (level === 2) {
            icon = 'shield'; color = '#10b981'; borderColor = 'rgba(16, 185, 129, 0.4)'; text = '+10% Armure'; title = "Consolidation (Niveau 2)";
        } else if (level === 3) {
            icon = 'security'; color = '#a855f7'; borderColor = 'rgba(168, 85, 247, 0.4)'; text = '+10% Résist'; title = "Consolidation (Niveau 3)";
        } else if (level === 4) {
            icon = 'water_drop'; color = '#3b82f6'; borderColor = 'rgba(59, 130, 246, 0.4)'; text = '-20% Coût'; title = "Consolidation (Niveau 4)";
        } else if (level === 5) {
            icon = 'gpp_good'; color = '#eab308'; borderColor = 'rgba(234, 179, 8, 0.4)'; text = '+8% Arm/Rés'; title = "Consolidation (Niveau 5)";
        }

        statsHtml += `<span class="hero-stat-chip" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    const hasKarma = c.hasKarma || (c.spiritualite && c.spiritualite.nom && c.spiritualite.nom.toLowerCase().includes('karma'));
    if (hasKarma) {
        let karmaLocked = c.karmaLocked || (c.passiveStates && c.passiveStates['karma_locked'] === 1);
        let karmaHarmony = c.karmaHarmony || (c.passiveStates && c.passiveStates['karma_harmony'] === 1);
        let karmaGauge = c.karmaGauge !== undefined ? c.karmaGauge : (c.passiveStates && c.passiveStates['karma_gauge'] !== undefined ? c.passiveStates['karma_gauge'] : 0);

        let borderColor, color, icon, text, title;
        if (karmaLocked) {
            borderColor = 'rgba(239, 68, 68, 0.4)'; color = '#f87171'; icon = 'block';
            text = 'Brisé'; title = "Karma Brisé (Voie désactivée)";
        } else if (karmaHarmony) {
            borderColor = 'rgba(100, 116, 139, 0.4)'; color = '#cbd5e1'; icon = 'brightness_medium';
            text = 'Harmonie'; title = "Karma en Harmonie";
        } else if (karmaGauge < 0) {
            borderColor = 'rgba(168, 85, 247, 0.4)'; color = '#c084fc'; icon = 'dark_mode';
            text = `${karmaGauge}/3`; title = "Karma Ténèbres";
        } else if (karmaGauge > 0) {
            borderColor = 'rgba(253, 224, 71, 0.4)'; color = '#fde047'; icon = 'light_mode';
            text = `+${karmaGauge}/3`; title = "Karma Lumière";
        } else {
            borderColor = 'rgba(156, 163, 175, 0.4)'; color = '#9ca3af'; icon = 'balance';
            text = `0/3`; title = "Karma Neutre";
        }
        statsHtml += `<span class="hero-stat-chip" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    const isEsprit = c.spiritualite && c.spiritualite.nom && c.spiritualite.nom.toLowerCase().includes('esprit');
    if (isEsprit) {
        const hp = c.hpCurrent !== undefined ? c.hpCurrent : c.healthCurrent;
        const maxHp = c.hpMax !== undefined ? c.hpMax : c.healthMax;
        const canCast = hp >= maxHp * 0.20 && c.manaCurrent >= c.manaMax * 0.20;
        const color = canCast ? '#38bdf8' : '#ef4444';
        const borderColor = canCast ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        const icon = canCast ? 'psychology' : 'block';
        const text = canCast ? 'Éveillé' : 'Bloqué';
        const title = "Condition Esprit : >= 20% PV ET Mana";
        statsHtml += `<span class="hero-stat-chip" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    const isTenebres = c.spiritualite && c.spiritualite.nom && (c.spiritualite.nom.toLowerCase().includes('ténèbres') || c.spiritualite.nom.toLowerCase().includes('tenebres'));
    if (isTenebres) {
        const hp = c.hpCurrent !== undefined ? c.hpCurrent : c.healthCurrent;
        const maxHp = c.hpMax !== undefined ? c.hpMax : c.healthMax;
        const canCast = hp <= maxHp * 0.80 || c.manaCurrent <= c.manaMax * 0.80;
        const color = canCast ? '#c084fc' : '#ef4444';
        const borderColor = canCast ? 'rgba(192, 132, 252, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        const icon = canCast ? 'nightlight_round' : 'block';
        const text = canCast ? 'Assombri' : 'Bloqué';
        const title = "Condition Ténèbres : <= 80% PV ou Mana";
        statsHtml += `<span class="hero-stat-chip" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    statsHtml += `</div>`;

    let passiveBadges = '';

    let titleIconsHtml = '';
    if (c.voie && c.voie.nom) {
        const vColor = getVoieButtonColor(c.voie);
        const vIcon = ui.getVoieIcon(c.voie.nom);
        titleIconsHtml += `<span class="material-symbols-outlined" style="font-size: 1.2rem; color: ${vColor};" title="${c.voie.nom}">${vIcon}</span>`;
    }
    if (c.spiritualite && c.spiritualite.nom) {
        const sColor = getSpiritButtonColor(c.spiritualite);
        const sIcon = ui.getSpiritIcon(c.spiritualite.nom);
        titleIconsHtml += `<span class="material-symbols-outlined" style="font-size: 1.2rem; color: ${sColor};" title="${c.spiritualite.nom}">${sIcon}</span>`;
    }

    return `
        <div class="fighter-name" style="color: ${isHero ? '#f8fafc' : '#ef4444'}; font-size: 1.2rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            ${isHero ? '🧙‍♂️' : '👹'} ${titleIconsHtml} ${c.name}
        </div>
        ${statsHtml}
        <div class="gauge-container" style="text-align: left;">
            <div class="gauge-label"><span>Santé (PV)</span><span>${hpLabel}</span></div>
            <div class="gauge-track"><div class="gauge-fill hp" style="width: ${hpPct}%;"></div></div>
        </div>
        ${manaHtml}
        <div class="sandbox-status-list" style="justify-content: center;">${passiveBadges}</div>
        <div class="sandbox-status-list" style="justify-content: center;">
            ${renderShieldsHtml(c.activeShields)}
            ${renderBuffsHtml(c.activeBuffs || c.buffs)}
        </div>
    `;
}

function renderEnemies(enemies) {
    const container = document.getElementById('enemiesContainer');
    container.innerHTML = '';

    enemies.forEach((activeMonster, index) => {
        const m = activeMonster.base;
        const pMonster = activeMonster.asPersonnage || activeMonster; // Fallback just in case
        
        let isActive = false;
        if (currentSessionData && currentSessionData.turnOrder && currentSessionData.turnOrder.length > currentSessionData.currentTurnIndex && !currentSessionData.finished) {
            const currentTurn = currentSessionData.turnOrder[currentSessionData.currentTurnIndex];
            if (!currentTurn.player && currentTurn.index === index) {
                isActive = true;
            }
        }

        // Use pMonster logic to override maxHp/currentHp if necessary
        pMonster.name = m.name;
        if (typeof activeMonster.currentHp !== 'undefined') pMonster.healthCurrent = activeMonster.currentHp;
        if (typeof activeMonster.maxHp !== 'undefined') pMonster.healthMax = activeMonster.maxHp;

        const div = document.createElement('div');
        div.className = `fighter fighter-enemy enemy-card ${isActive ? 'active' : ''} ${activeMonster.dead ? 'dead' : ''}`;
        div.dataset.index = index;
        
        if (isActive) {
            div.style.borderColor = '#ef4444';
            div.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
            div.style.transform = 'scale(1.05)';
        } else if (!activeMonster.dead) {
            div.style.borderColor = 'rgba(220, 38, 38, 0.4)'; // Default enemy border
            div.style.boxShadow = 'none';
            div.style.transform = 'scale(0.95)';
        }

        div.innerHTML = generateFighterHtml(pMonster, false);
        container.appendChild(div);
    });
}

function renderShieldsHtml(shieldList) {
    if (!shieldList || shieldList.length === 0) return '';

    const shieldEntries = [];
    let totalShield = 0;

    shieldList.forEach(s => {
        totalShield += s.amount;
        const entryHtml = `
            <div style="display:flex; align-items:flex-start; gap:0.4rem; font-size:0.85rem;">
                <span class="material-symbols-outlined" style="flex-shrink:0; font-size:1.1rem; color:#38bdf8;">security</span>
                <span style="font-weight:600; color:#fff;">[${s.sourceName || 'Inconnu'}]</span>
                <span style="color:#38bdf8; font-weight:500;">Bouclier</span>
                <span style="color:#e2e8f0;">➔ ${s.amount} PV absorpt. (${s.duration} tours)</span>
            </div>
        `;
        shieldEntries.push(entryHtml);
    });

    if (shieldEntries.length === 0) return '';

    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    return `<div class="sandbox-status-badge buff" ${tooltipAttrs} style="cursor: help; position: relative; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; background: rgba(56, 189, 248, 0.1);">
        <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span>
        <span>Boucliers (${totalShield})</span>
        <template class="tooltip-data">
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                ${shieldEntries.join('')}
            </div>
        </template>
    </div>`;
}

function renderBuffsHtml(buffList) {
    if (!buffList || buffList.length === 0) return '';

    const goodBuffs = [];
    const badBuffs = [];

    buffList.forEach(b => {
        const inverseStats = ['DAMAGE_TAKEN_MAGIC', 'DAMAGE_TAKEN_PHYSIC', 'DAMAGE_TAKEN_BRUT', 'SHIELD_PIERCED', 'BURN', 'POISON'];
        const isInverse = inverseStats.includes(b.statAffected);
        const isNegativeValue = b.modifier < 0 || b.flatValue < 0;

        let isBad = isNegativeValue;
        if (isInverse) isBad = !isNegativeValue;

        let text = '';
        if (b.flatValue) text += `${b.flatValue > 0 ? '+' : ''}${b.flatValue} ${ui.formatStat(b.statAffected)}`;
        if (b.modifier) {
            if (text) text += ' et ';
            text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}% ${ui.formatStat(b.statAffected)}`;
        }
        if (!text) text = `Modifie ${ui.formatStat(b.statAffected)}`;

        const typeStr = (b.statAffected === 'POISON' || b.statAffected === 'BURN') ? ui.formatStat(b.statAffected) : 'Buff/Débuff';
        const indicatorColor = isBad ? '#f43f5e' : '#10b981';

        let iconName = isBad ? 'trending_down' : 'trending_up';
        if (b.statAffected === 'POISON') iconName = 'coronavirus';
        if (b.statAffected === 'BURN') iconName = 'local_fire_department';

        let statIconHtml = '';
        if (b.statAffected && b.statAffected !== 'POISON' && b.statAffected !== 'BURN') {
            const sa = b.statAffected.toUpperCase();
            let statIcon = { icon: 'star', color: '#94a3b8' };
            if (sa.includes('SPEED')) statIcon = { icon: 'bolt', color: '#f59e0b' };
            else if (sa.includes('MANA')) statIcon = { icon: 'water_drop', color: '#38bdf8' };
            else if (sa.includes('HEALTH') || sa.includes('HP') || sa.includes('LIFE')) statIcon = { icon: 'favorite', color: '#ec4899' };
            else if (sa.includes('CRIT')) statIcon = { icon: 'gps_fixed', color: '#ef4444' };
            else if (sa.includes('ARMOR') || sa.includes('ARMURE')) statIcon = { icon: 'shield', color: '#3b82f6' };
            else if (sa.includes('RESISTANCE')) statIcon = { icon: 'shield', color: '#10b981' };
            else if (sa.includes('PHYSICAL_POWER') || sa.includes('STRENGTH')) statIcon = { icon: 'fitness_center', color: '#f43f5e' };
            else if (sa.includes('POWER')) statIcon = { icon: 'auto_awesome', color: '#a855f7' };
            else if (sa.includes('HEAL_RECEIVED')) statIcon = { icon: 'health_and_safety', color: '#10b981' };
            else if (sa.includes('SHIELD_RECEIVED')) statIcon = { icon: 'security', color: '#06b6d4' };
            else if (sa.includes('HEAL_GIVEN')) statIcon = { icon: 'healing', color: '#34d399' };
            else if (sa.includes('SHIELD_GIVEN')) statIcon = { icon: 'add_moderator', color: '#22d3ee' };
            else if (sa === 'SHIELD_PIERCED') statIcon = { icon: 'heart_broken', color: '#ef4444' };
            else if (sa === 'SHIELD_PENETRATION') statIcon = { icon: 'heart_broken', color: '#fb923c' };
            else if (sa === 'DAMAGE_TAKEN_MAGIC') statIcon = { icon: 'explosion', color: '#a855f7' };
            else if (sa === 'DAMAGE_TAKEN_PHYSIC') statIcon = { icon: 'explosion', color: '#ef4444' };
            else if (sa === 'DAMAGE_TAKEN_BRUT') statIcon = { icon: 'explosion', color: '#b91c1c' };
            else if (sa === 'DAMAGE_GIVEN_MAGIC') statIcon = { icon: 'auto_awesome', color: '#a855f7' };
            else if (sa === 'DAMAGE_GIVEN_PHYSIC') statIcon = { icon: 'swords', color: '#f43f5e' };
            else if (sa === 'DAMAGE_GIVEN_BRUT') statIcon = { icon: 'bloodtype', color: '#ef4444' };
            else if (sa === 'DAMAGE_GIVEN_MAGIC_TO_SHIELD') statIcon = { icon: 'gavel', color: '#d946ef' };
            else if (sa === 'DAMAGE_GIVEN_PHYSIC_TO_SHIELD') statIcon = { icon: 'gavel', color: '#f43f5e' };
            else if (sa.includes('DAMAGE_TAKEN')) statIcon = { icon: 'explosion', color: '#ef4444' };
            else if (sa.includes('DAMAGE_GIVEN')) statIcon = { icon: 'swords', color: '#f43f5e' };
            else if (sa.includes('PIERCED') || sa.includes('PIERCING')) statIcon = { icon: 'heart_broken', color: '#fb923c' };

            statIconHtml = `<span class="material-symbols-outlined" style="flex-shrink:0; font-size:1.1rem; color:${statIcon.color}; margin-left:-0.1rem;">${statIcon.icon}</span>`;
        }

        const entryHtml = `
            <div style="display:flex; align-items:flex-start; gap:0.4rem; font-size:0.85rem;">
                <span class="material-symbols-outlined" style="flex-shrink:0; font-size:1.1rem; color:${indicatorColor};">${iconName}</span>
                ${statIconHtml}
                <span style="font-weight:600; color:#fff;">[Cible]</span>
                <span style="color:#38bdf8; font-weight:500;">${typeStr}</span>
                <span style="color:#e2e8f0;">➔ ${text} (${b.duration} tours)</span>
            </div>
        `;

        if (isBad) badBuffs.push(entryHtml);
        else goodBuffs.push(entryHtml);
    });

    let html = '';
    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    if (goodBuffs.length > 0) {
        html += `<div class="sandbox-status-badge buff" ${tooltipAttrs} style="cursor: help; position: relative;">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">trending_up</span>
            <span>Buffs (${goodBuffs.length})</span>
            <template class="tooltip-data">
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                    ${goodBuffs.join('')}
                </div>
            </template>
        </div>`;
    }
    if (badBuffs.length > 0) {
        html += `<div class="sandbox-status-badge debuff" ${tooltipAttrs} style="cursor: help; position: relative;">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">trending_down</span>
            <span>Débuffs (${badBuffs.length})</span>
            <template class="tooltip-data">
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                    ${badBuffs.join('')}
                </div>
            </template>
        </div>`;
    }

    return html;
}

let currentSpellsTab = 'VOIE';

window.switchSpellTab = function (tab) {
    currentSpellsTab = tab;
    // Update tab UI
    document.querySelectorAll('.csp-tab').forEach(t => t.classList.remove('active'));
    const tabEl = document.querySelector(`.csp-tab[data-target="${tab}"]`);
    if (tabEl) tabEl.classList.add('active');

    // Reset secondary filters on tab change
    const typeAll = document.querySelector('input[name="filterCastingType"][value="ALL"]');
    if (typeAll) typeAll.checked = true;
    const levelAll = document.querySelector('input[name="filterLevel"][value="ALL"]');
    if (levelAll) levelAll.checked = true;

    // Re-render
    if (currentSessionData && currentSessionData.availableSpells) {
        renderSpells(currentSessionData.availableSpells);
    }
}

window.applySpellFilters = function (clickedEl) {
    if (clickedEl && clickedEl.name === 'filterLevel') {
        if (clickedEl.value === 'ALL' && clickedEl.checked) {
            // Uncheck all other levels
            document.querySelectorAll('input[name="filterLevel"]:not([value="ALL"])').forEach(el => el.checked = false);
        } else if (clickedEl.value !== 'ALL' && clickedEl.checked) {
            // Uncheck ALL
            const allEl = document.querySelector('input[name="filterLevel"][value="ALL"]');
            if (allEl) allEl.checked = false;
        }

        // If everything is unchecked, check ALL automatically
        const anyChecked = document.querySelector('input[name="filterLevel"]:checked');
        if (!anyChecked) {
            const allEl = document.querySelector('input[name="filterLevel"][value="ALL"]');
            if (allEl) allEl.checked = true;
        }
    }

    if (currentSessionData && currentSessionData.availableSpells) {
        renderSpells(currentSessionData.availableSpells);
    }
}

function renderSpells(spells) {
    const container = document.getElementById('spellsContainer');
    if (!container) return;

    // Filter spells based on currentSpellsTab
    let filteredSpells = [];
    if (currentSpellsTab === 'VOIE') {
        filteredSpells = spells.filter(s => s.voie != null);
    } else if (currentSpellsTab === 'SPIRIT') {
        filteredSpells = spells.filter(s => s.spiritualite != null);
    } else if (currentSpellsTab === 'ALL') {
        filteredSpells = spells;
    }

    // Update counts
    const countVOIE = document.getElementById('countVOIE');
    if (countVOIE) countVOIE.textContent = spells.filter(s => s.voie != null).length;
    const countSPIRIT = document.getElementById('countSPIRIT');
    if (countSPIRIT) countSPIRIT.textContent = spells.filter(s => s.spiritualite != null).length;
    const countALL = document.getElementById('countALL');
    if (countALL) countALL.textContent = spells.length;

    // Apply secondary filters
    const typeFilterEl = document.querySelector('input[name="filterCastingType"]:checked');
    const levelCheckboxes = Array.from(document.querySelectorAll('input[name="filterLevel"]:checked'));

    if (typeFilterEl && typeFilterEl.value !== 'ALL') {
        filteredSpells = filteredSpells.filter(s => s.castingType === typeFilterEl.value);
    }

    const isAllLevels = levelCheckboxes.some(cb => cb.value === 'ALL');
    if (!isAllLevels && levelCheckboxes.length > 0) {
        const selectedLevels = levelCheckboxes.map(cb => parseInt(cb.value, 10));
        filteredSpells = filteredSpells.filter(s => selectedLevels.includes(s.niveau || 1));
    }

    if (filteredSpells.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-style: italic; padding: 2rem; text-align: center;">Aucun sort dans cette catégorie.</div>';
        return;
    }

    // Group spells by category instead of level
    const groupsMap = new Map();
    filteredSpells.forEach(sp => {
        let groupKey = '';
        if (currentSpellsTab === 'VOIE') {
            if (sp.voie && sp.voie.nom) {
                groupKey = sp.voie.nom.toLowerCase().startsWith('voie') ? sp.voie.nom : `Voie de ${sp.voie.nom}`;
            } else {
                groupKey = 'Autres';
            }
        } else if (currentSpellsTab === 'SPIRIT') {
            if (sp.spiritualite && sp.spiritualite.nom) {
                groupKey = sp.spiritualite.nom.toLowerCase().startsWith('spiritualité') || sp.spiritualite.nom.toLowerCase().startsWith('spiritualite') 
                    ? sp.spiritualite.nom 
                    : `Spiritualité de ${sp.spiritualite.nom}`;
            } else {
                groupKey = 'Autres';
            }
        } else {
            groupKey = ''; // No title for ALL
        }
        
        if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, []);
        groupsMap.get(groupKey).push(sp);
    });

    let html = '';
    const sortedGroups = Array.from(groupsMap.keys()).sort();
    
    sortedGroups.forEach(groupKey => {
        const groupSpells = groupsMap.get(groupKey);
        // Sort spells by level inside the group
        groupSpells.sort((a, b) => (a.niveau || 1) - (b.niveau || 1));

        html += `
            <div class="csp-level-group">
                ${groupKey ? `<div class="csp-level-title">${groupKey}</div>` : ''}
                <div class="csp-grid">
                    ${groupSpells.map(sp => renderSpellCard(sp)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderSpellCard(sp) {
    const titleColor = getSpellColor(sp);

    const effectsList = sp.effects || [];
    const choiceKeys = [...new Set(effectsList.map(e => e.requiredChoiceKey).filter(k => k != null))];

    let optionSelectorHtml = '';
    if (choiceKeys.length > 0) {
        optionSelectorHtml = `
            <select class="spell-choice-mini" id="choice-select-${sp.id}" onclick="event.stopPropagation()" style="background: rgba(15, 23, 42, 0.8); color: #e2e8f0; border: 1px solid var(--glass-border); border-radius: 4px; padding: 0 0.2rem; font-size: 0.75rem; height: 1.2rem; margin-left: auto; outline: none; cursor: pointer;">
                ${choiceKeys.map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
        `;
    }

    const getSrcIcon = (src) => {
        const s = src || '';
        if (s.includes('MANA')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #38bdf8; vertical-align: middle;" title="${ui.formatSrc(s)}">water_drop</span>`;
        if (s.includes('HEALTH') || s.includes('PV')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f43f5e; vertical-align: middle;" title="${ui.formatSrc(s)}">bloodtype</span>`;
        if (s.includes('POWER') || s.includes('Puiss')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #a855f7; vertical-align: middle;" title="${ui.formatSrc(s)}">auto_awesome</span>`;
        if (s.includes('PHYSICAL') || s.includes('Force Phy')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f43f5e; vertical-align: middle;" title="${ui.formatSrc(s)}">fitness_center</span>`;
        return `(${ui.formatSrc(s)})`;
    };

    let costDetailsHtml = [];
    if (sp.manaCost > 0 || sp.percentManaCost > 0) {
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #38bdf8;" title="Mana">water_drop</span><span style="border-bottom: 1px solid rgba(56, 189, 248, 0.5); padding-bottom: 0.05rem;">${sp.manaCost}${sp.percentManaCost > 0 ? ` + ${sp.percentManaCost}% ${getSrcIcon(sp.percentManaCostSource || 'CASTER_MANA_MAX')}` : ''}</span></span>`);
    }
    if (sp.healCost > 0 || sp.percentHealCost > 0) {
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f43f5e;" title="PV">bloodtype</span><span style="border-bottom: 1px solid rgba(244, 63, 94, 0.5); padding-bottom: 0.05rem;">${sp.healCost}${sp.percentHealCost > 0 ? ` + ${sp.percentHealCost}% ${getSrcIcon(sp.percentHealCostSource || 'CASTER_HEALTH_MAX')}` : ''}</span></span>`);
    }
    if (sp.heatCost > 0 || sp.percentHeatCost > 0) {
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f97316;" title="Chaleur">local_fire_department</span><span style="border-bottom: 1px solid rgba(249, 115, 22, 0.5); padding-bottom: 0.05rem;">${sp.heatCost}${sp.percentHeatCost > 0 ? ` + ${sp.percentHeatCost}%` : ''}</span></span>`);
    }
    let costDetails = costDetailsHtml.join('<span style="color:rgba(255,255,255,0.2); margin:0 0.2rem;">|</span>');
    if (costDetailsHtml.length === 0) costDetails = `<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #38bdf8;" title="Mana">water_drop</span><span>0</span></span>`;

    let castingTypeHtml = '';
    if (sp.castingType === 'INSTANTANE') {
        castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;" title="Action Instantanée">bolt</span>';
    } else if (sp.castingType === 'CANALISE') {
        castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #8b5cf6;" title="Action Canalisée">cyclone</span>';
        castingTypeHtml += sp.allowInstantDuringChanneling ?
            '<span class="material-symbols-outlined" style="font-size: 1rem; color: #f59e0b;" title="Instantanés autorisés pendant la canalisation">bolt</span>' :
            '<span style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1rem; height: 1rem;" title="Instantanés interdits pendant la canalisation"><span class="material-symbols-outlined" style="font-size: 1rem; color: #64748b;">bolt</span><span style="position: absolute; width: 100%; height: 2px; background: #ef4444; transform: rotate(-45deg);"></span></span>';
    } else {
        castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #3b82f6;" title="Action Banale">hourglass_empty</span>';
    }

    let categoryHtml = '';
    if (sp.category === 'INSPIRATION') {
        categoryHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #dc2626;" title="Sort d\'Inspiration">storm</span>';
    } else if (sp.category === 'EXPIRATION') {
        categoryHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #d946ef;" title="Sort d\'Expiration">air</span>';
    }

    let karmaAlignHtml = '';
    if (sp.karmaAlignment === 'OFFENSIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #c084fc;" title="Sort des Ténèbres (Offensif)">dark_mode</span>';
    } else if (sp.karmaAlignment === 'PROTECTIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #fde047;" title="Sort de Lumière (Protecteur)">light_mode</span>';
    } else if (sp.karmaAlignment === 'RESTORATIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined" style="font-size: 1rem; color: #cbd5e1;" title="Sort d\'Harmonie (Restaurateur)">brightness_medium</span>';
    }

    const generatesHeat = (sp.heatGenerated > 0) || (sp.effects && sp.effects.some(e => {
        const rawType = e.effectType || e.effect_type || '';
        return ['HEAT_FIXED', 'HeatFixedEffect', 'HEAT_PERCENTAGE', 'HeatPercentageEffect', 'HEAT_OVER_TIME', 'HeatOverTimeEffect', 'HEAT', 'HeatEffect'].includes(rawType);
    }));

    let heatGenHtml = '';
    if (generatesHeat) {
        heatGenHtml = `<span class="material-symbols-outlined" style="font-size: 1rem; color: #f97316;" title="Sort Générateur de Chaleur">local_fire_department</span>`;
    }

    let voieHtml = '';
    if (sp.voie && sp.voie.nom) {
        const vColor = getVoieButtonColor(sp.voie);
        const vIcon = ui.getVoieIcon(sp.voie.nom);
        voieHtml = `<span class="material-symbols-outlined" style="font-size: 1rem; color: ${vColor};" title="${sp.voie.nom}">${vIcon}</span>`;
    }

    let spiritHtml = '';
    if (sp.spiritualite && sp.spiritualite.nom) {
        const sColor = getSpiritButtonColor(sp.spiritualite);
        const sIcon = ui.getSpiritIcon(sp.spiritualite.nom);
        spiritHtml = `<span class="material-symbols-outlined" style="font-size: 1rem; color: ${sColor};" title="${sp.spiritualite.nom}">${sIcon}</span>`;
    }

    let effectsSummary = getSpellEffectsSummaryHtml(sp);

    const tooltipAttrs = effectsSummary ? 'onmouseenter="window.showGlobalTooltip(this)" onmouseleave="window.hideGlobalTooltip()"' : '';

    // Check spell availability
    const availabilityList = currentSessionData.spellAvailability || [];
    const avail = availabilityList.find(a => a.spellId === sp.id);
    const isCastable = !avail || avail.castable;
    const disabledClass = isCastable ? '' : ' spell-disabled';
    const onClickAttr = isCastable ? `onclick="initiateCombatCast(${sp.id})"` : '';

    // Build disabled badge HTML
    let disabledBadgeHtml = '';
    if (!isCastable && avail) {
        let badgeClass = 'badge-resource';
        let badgeIcon = 'water_drop';
        if (avail.reason === 'CONDITION') {
            badgeClass = 'badge-condition';
            badgeIcon = 'block';
        } else if (avail.reason === 'ACTION_LIMIT') {
            badgeClass = 'badge-action';
            badgeIcon = 'hourglass_disabled';
        } else if (avail.reason === 'CHANNELING') {
            badgeClass = 'badge-channeling';
            badgeIcon = 'cyclone';
        }
        disabledBadgeHtml = `<div class="spell-disabled-badge ${badgeClass}" title="${avail.tooltip || ''}"><span class="material-symbols-outlined">${badgeIcon}</span></div>`;
    }

    return `
        <div id="spell-card-${sp.id}" class="combat-spell-card spell-btn${disabledClass}" style="border-top: 2px solid ${titleColor};" ${onClickAttr} ${tooltipAttrs}>
            <div class="combat-spell-header">
                <div class="combat-spell-name" title="${sp.nom}" style="color: ${titleColor};">${sp.nom}</div>
                <div class="combat-spell-level">Lvl ${sp.niveau}</div>
            </div>
            <div class="combat-spell-icons" style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem;">
                ${castingTypeHtml}
                ${categoryHtml}
                ${karmaAlignHtml}
                ${heatGenHtml}
                ${voieHtml}
                ${spiritHtml}
                ${optionSelectorHtml}
            </div>
            <div class="combat-spell-cost">
                ${costDetails}
            </div>
            ${disabledBadgeHtml}
            ${effectsSummary ? `<template class="tooltip-data">${effectsSummary}</template>` : ''}
        </div>
    `;
}



function showResult(playerWon) {
    document.getElementById('btnAttack').disabled = true;
    const btnEnd = document.getElementById('btnEndTurn');
    if (btnEnd) btnEnd.disabled = true;
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
