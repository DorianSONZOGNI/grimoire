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
let selectedTargetIndex = 0;

window.doAction = doAction;
window.endTurn = endTurn;
window.nextRoom = nextRoom;
window.showGlobalTooltip = ui.showGlobalTooltip;
window.hideGlobalTooltip = ui.hideGlobalTooltip;
window.initiateCombatCast = initiateCombatCast;
window.confirmCombatCast = confirmCombatCast;
window.cancelCombatCast = cancelCombatCast;

let currentSpellFilter = 'ALL';
window.filterSpells = function(filter) {
    currentSpellFilter = filter;
    if (currentSessionData) {
        renderSpells(currentSessionData.availableSpells);
    }
};
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
    
    // Only allow manual selection if not currently casting a spell
    if (pendingCastSpellId) return;
    
    selectedTargetIndex = index;
    renderEnemies(currentSessionData.enemies);
}

// ===== Target Selection for Cast =====
let pendingCastSpellId = null;

function initiateCombatCast(spellId) {
    if (!currentSessionData) return;
    const sp = currentSessionData.availableSpells.find(s => s.id === spellId);
    if (!sp) return;

    const choiceSelect = document.getElementById(`choice-select-${spellId}`);
    const currentChoiceKey = choiceSelect ? choiceSelect.value : null;

    const effects = sp.effects || [];
    const activeEffects = effects.filter(e => {
        if (e.requiredChoiceKey == null) return true;
        return String(e.requiredChoiceKey) === String(currentChoiceKey);
    });

    const needsEnemy = activeEffects.some(e => (e.effectTarget || e.effect_target) === 'TARGET');

    const enemyCards = document.querySelectorAll('.fighter-enemy:not(.dead)');
    const multiEnemy = needsEnemy && enemyCards.length > 1;

    if (!multiEnemy) {
        // Direct cast
        doAction(spellId);
        return;
    }

    // Enter target selection mode
    pendingCastSpellId = spellId;
    
    // Highlight enemies for selection
    enemyCards.forEach(card => {
        card.classList.add('target-selectable');
        card.dataset.oldOnClick = card.getAttribute('onclick');
        card.setAttribute('onclick', `confirmCombatCast(${card.dataset.index})`);
    });
    
    showCombatTargetPrompt();
}

function showCombatTargetPrompt() {
    const existing = document.getElementById('combatTargetPrompt');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.id = 'combatTargetPrompt';
    prompt.style.cssText = 'background: linear-gradient(135deg, rgba(220, 38, 38, 0.25), rgba(153, 27, 27, 0.2)); border: 1px solid #ef4444; border-radius: 8px; padding: 0.6rem 2rem; margin: 0 2rem 1rem 2rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 1rem; color: #fca5a5;';
    prompt.innerHTML = `
        <span>🎯 Sélectionnez un ennemi cible pour lancer le sort.</span>
        <button type="button" onclick="cancelCombatCast()" style="background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); padding: 0.4rem 1rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer; font-family: 'Outfit', sans-serif;">Annuler</button>
    `;

    const actionBar = document.getElementById('actionBar');
    if (actionBar) actionBar.parentNode.insertBefore(prompt, actionBar);
}

function confirmCombatCast(enemyIndex) {
    selectedTargetIndex = enemyIndex;
    const spellId = pendingCastSpellId;
    cancelCombatCast();
    doAction(spellId);
}

function cancelCombatCast() {
    const enemyCards = document.querySelectorAll('.fighter-enemy');
    enemyCards.forEach(card => {
        card.classList.remove('target-selectable');
        if (card.dataset.oldOnClick) {
            card.setAttribute('onclick', card.dataset.oldOnClick);
        } else {
            card.removeAttribute('onclick');
        }
    });
    const prompt = document.getElementById('combatTargetPrompt');
    if (prompt) prompt.remove();
    pendingCastSpellId = null;
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
    const btnEnd = document.getElementById('btnEndTurn');
    if (btnEnd) btnEnd.disabled = true;
    const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
    spellButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });
    
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

// Removed GLOBAL_STAT_LABELS and formatStat (imported from ui.js)

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

    const getEffectiveStat = (statName) => {
        let base = 0;
        switch(statName) {
            case 'POWER': base = c.power || 0; break;
            case 'STRENGTH': base = c.strength || 0; break;
            case 'ARMURE': base = c.armor || 0; break;
            case 'RESISTANCE': base = c.resistance || 0; break;
            case 'SPEED': base = c.speed || 0; break;
            case 'CRIT': base = (c.critDerived !== null && c.critDerived !== undefined) ? c.critDerived : (c.crit || 0); break;
        }
        
        let flatBonus = 0;
        let multiplier = 1.0;
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
        <div class="sandbox-status-list" style="justify-content: center;">${renderBuffsHtml(c.activeBuffs || c.buffs)}</div>
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
        div.dataset.index = index;
        div.onclick = () => selectTarget(index);
        
        div.innerHTML = generateFighterHtml(pMonster, false);
        container.appendChild(div);
    });
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
        
        const entryHtml = `
            <div style="display:flex; align-items:flex-start; gap:0.4rem; font-size:0.85rem;">
                <div style="flex-shrink:0; background-color: ${indicatorColor}; width: 8px; height: 8px; border-radius: 50%; margin-top: 5px;"></div>
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

function renderSpells(spells) {
    const container = document.getElementById('spellsContainer');
    const filterContainer = document.getElementById('spellFiltersBar');
    if (!container) return;
    
    // First, determine all available categories
    let categories = new Set();
    spells.forEach(sp => {
        if (sp.voie && sp.voie.nom) categories.add('VOIE_' + sp.voie.nom);
        if (sp.spiritualite && sp.spiritualite.nom) categories.add('SPIRIT_' + sp.spiritualite.nom);
        if (sp.castingType) categories.add('CAST_' + sp.castingType);
    });

    if (filterContainer) {
        let filterHtml = `<button class="filter-chip ${currentSpellFilter === 'ALL' ? 'active' : ''}" onclick="filterSpells('ALL')">Tous (${spells.length})</button>`;
        
        // Define display names
        const catMap = {};
        spells.forEach(sp => {
            if (sp.voie && sp.voie.nom) catMap['VOIE_' + sp.voie.nom] = sp.voie.nom;
            if (sp.spiritualite && sp.spiritualite.nom) catMap['SPIRIT_' + sp.spiritualite.nom] = sp.spiritualite.nom;
            if (sp.castingType) {
                if (sp.castingType === 'INSTANTANE') catMap['CAST_' + sp.castingType] = 'Instantané';
                if (sp.castingType === 'CANALISE') catMap['CAST_' + sp.castingType] = 'Canalisé';
            }
        });

        // Add filter buttons alphabetically
        [...categories].sort().forEach(cat => {
            if (catMap[cat]) {
                const count = spells.filter(s => {
                    if (cat.startsWith('VOIE_')) return s.voie && s.voie.nom === cat.replace('VOIE_', '');
                    if (cat.startsWith('SPIRIT_')) return s.spiritualite && s.spiritualite.nom === cat.replace('SPIRIT_', '');
                    if (cat.startsWith('CAST_')) return s.castingType === cat.replace('CAST_', '');
                    return false;
                }).length;
                filterHtml += `<button class="filter-chip ${currentSpellFilter === cat ? 'active' : ''}" onclick="filterSpells('${cat}')">${catMap[cat]} (${count})</button>`;
            }
        });
        filterContainer.innerHTML = filterHtml;
    }

    let filteredSpells = spells;
    if (currentSpellFilter !== 'ALL') {
        filteredSpells = spells.filter(sp => {
            if (currentSpellFilter.startsWith('VOIE_')) return sp.voie && sp.voie.nom === currentSpellFilter.replace('VOIE_', '');
            if (currentSpellFilter.startsWith('SPIRIT_')) return sp.spiritualite && sp.spiritualite.nom === currentSpellFilter.replace('SPIRIT_', '');
            if (currentSpellFilter.startsWith('CAST_')) return sp.castingType === currentSpellFilter.replace('CAST_', '');
            return false;
        });
    }

    if (filteredSpells.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic; align-self: center; padding: 1rem; width: 100%; text-align: center;">Aucun sort pour ce filtre</div>';
        return;
    }
    
    container.innerHTML = filteredSpells.map(sp => {
        const titleColor = getSpellColor(sp);

        const effectsList = sp.effects || [];
        const choiceKeys = [...new Set(effectsList.map(e => e.requiredChoiceKey).filter(k => k != null))];

        let optionSelectorHtml = '';
        if (choiceKeys.length > 0) {
            optionSelectorHtml = `
                        <div class="sandbox-spell-options">
                            <select id="choice-select-${sp.id}" onclick="event.stopPropagation()">
                                ${choiceKeys.map(k => `<option value="${k}">Option ${k}</option>`).join('')}
                            </select>
                        </div>
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

        return `
            <div class="combat-spell-card spell-btn" style="border-top: 2px solid ${titleColor};" onclick="initiateCombatCast(${sp.id})" ${tooltipAttrs}>
                <div class="combat-spell-header">
                    <div class="combat-spell-name" title="${sp.nom}" style="color: ${titleColor};">${sp.nom}</div>
                    <div class="combat-spell-level">Lvl ${sp.niveau}</div>
                </div>
                <div class="combat-spell-icons">
                    ${castingTypeHtml}
                    ${voieHtml}
                    ${spiritHtml}
                </div>
                ${optionSelectorHtml ? `<div class="combat-spell-options" onclick="event.stopPropagation()">${optionSelectorHtml}</div>` : ''}
                <div class="combat-spell-cost">
                    ${costDetails}
                </div>
                ${effectsSummary ? `<template class="tooltip-data">${effectsSummary}</template>` : ''}
            </div>
        `;
    }).join('');
    
    // Reset scroll position on render
    container.scrollTop = 0;
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
