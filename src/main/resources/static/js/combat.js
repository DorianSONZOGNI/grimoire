import * as ui from './ui.js';
import { getSpellEffectsSummaryHtml } from './grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from './filters.js';

const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau Gauche', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau Droit', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' }
};

const RARITY_COLORS = {
    COMMUN: '#94a3b8',
    RARE: '#3b82f6',
    LEGENDAIRE: '#f59e0b',
    EPIQUE: '#c084fc',
    RELIQUE: '#ef4444'
};

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
let previousPlayerXP = {};
let previousPlayerSpiritXP = {};

function getExpStats(exp) {
    let level = 1;
    if (exp >= 1000) level = 5;
    else if (exp >= 600) level = 4;
    else if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;
    
    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = 600; }
    else if (level === 4) { currentLvlXp = 600; nextLvlXp = 1000; }
    else if (level === 5) { currentLvlXp = 1000; nextLvlXp = exp; }
    
    let progress = 100;
    if (level < 5) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}

function getSpiritExpStats(exp) {
    let level = 1;
    if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;
    
    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = exp; }
    
    let progress = 100;
    if (level < 3) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}

function renderAndAnimateXPCards(containerId, players, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.display = 'flex';
    
    let cardsHtml = '';
    players.forEach(p => {
        let oldExp = previousPlayerXP[p.id] !== undefined ? previousPlayerXP[p.id] : p.experience;
        let oldStats = getExpStats(oldExp);
        let oldSpiritExp = previousPlayerSpiritXP[p.id] !== undefined ? previousPlayerSpiritXP[p.id] : (p.spiritualiteExperience || 0);
        let oldSpiritStats = getSpiritExpStats(oldSpiritExp);

        cardsHtml += `
            <div id="${prefix}-xp-card-${p.id}" style="background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); text-align: center; width: 180px; position: relative; overflow: hidden; transition: all 0.5s; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8); display: flex; flex-direction: column; gap: 0.3rem;">
                <div style="color: #e2e8f0; font-weight: bold; margin-bottom: 0.3rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.name}</div>
                
                <div id="${prefix}-xp-lvl-${p.id}" style="color: #38bdf8; font-size: 0.8rem; font-weight: 600; transition: color 0.3s, transform 0.3s;">Voie Niv. ${oldStats.level}</div>
                <div style="width: 100%; background: #334155; border-radius: 4px; height: 6px;">
                    <div id="${prefix}-xp-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldStats.progress)}%; background: #10b981; transition: box-shadow 0.3s;"></div>
                </div>
                <div id="${prefix}-xp-text-${p.id}" style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">${oldExp} / ${oldStats.level === 5 ? 'MAX' : oldStats.nextLvlXp} XP</div>
                
                <div style="margin-top: 0.2rem;"></div>
                <div id="${prefix}-spirit-lvl-${p.id}" style="color: #fb923c; font-size: 0.8rem; font-weight: 600; transition: color 0.3s, transform 0.3s;">Spirit Niv. ${oldSpiritStats.level}</div>
                <div style="width: 100%; background: #334155; border-radius: 4px; height: 6px;">
                    <div id="${prefix}-spirit-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldSpiritStats.progress)}%; background: #f59e0b; transition: box-shadow 0.3s;"></div>
                </div>
                <div id="${prefix}-spirit-text-${p.id}" style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">${oldSpiritExp} / ${oldSpiritStats.level === 3 ? 'MAX' : oldSpiritStats.nextLvlXp} XP</div>
            </div>
        `;
    });
    
    container.innerHTML += cardsHtml;
    
    players.forEach(p => {
        let oldExp = previousPlayerXP[p.id] !== undefined ? previousPlayerXP[p.id] : p.experience;
        let endExp = p.experience;
        let oldSpiritExp = previousPlayerSpiritXP[p.id] !== undefined ? previousPlayerSpiritXP[p.id] : (p.spiritualiteExperience || 0);
        let endSpiritExp = p.spiritualiteExperience || 0;
        
        setTimeout(() => {
            let startTime = null;
            const duration = 1500;
            
            const bar = document.getElementById(`${prefix}-xp-fill-${p.id}`);
            const text = document.getElementById(`${prefix}-xp-text-${p.id}`);
            const lvlText = document.getElementById(`${prefix}-xp-lvl-${p.id}`);
            
            const spiritBar = document.getElementById(`${prefix}-spirit-fill-${p.id}`);
            const spiritText = document.getElementById(`${prefix}-spirit-text-${p.id}`);
            const spiritLvlText = document.getElementById(`${prefix}-spirit-lvl-${p.id}`);
            
            function animate(currentTime) {
                if (!startTime) startTime = currentTime;
                let t = (currentTime - startTime) / duration;
                if (t > 1) t = 1;
                
                let easeT = t * (2 - t);
                
                let currentExp = Math.floor(oldExp + (endExp - oldExp) * easeT);
                let stats = getExpStats(currentExp);
                if (bar && text && lvlText) {
                    bar.style.width = Math.min(100, stats.progress) + "%";
                    text.innerText = currentExp + " / " + (stats.level === 5 ? 'MAX' : stats.nextLvlXp) + " XP";
                    if (lvlText.innerText !== "Voie Niv. " + stats.level) {
                        lvlText.innerText = "Voie Niv. " + stats.level;
                        lvlText.style.color = "#f59e0b";
                        lvlText.style.transform = "scale(1.2)";
                        const card = document.getElementById(`${prefix}-xp-card-${p.id}`);
                        if (card) {
                            card.style.boxShadow = "0 0 20px 5px rgba(16, 185, 129, 0.4)";
                            card.style.borderColor = "#10b981";
                        }
                    }
                }
                
                let currentSpiritExp = Math.floor(oldSpiritExp + (endSpiritExp - oldSpiritExp) * easeT);
                let spiritStats = getSpiritExpStats(currentSpiritExp);
                if (spiritBar && spiritText && spiritLvlText) {
                    spiritBar.style.width = Math.min(100, spiritStats.progress) + "%";
                    spiritText.innerText = currentSpiritExp + " / " + (spiritStats.level === 3 ? 'MAX' : spiritStats.nextLvlXp) + " XP";
                    if (spiritLvlText.innerText !== "Spirit Niv. " + spiritStats.level) {
                        spiritLvlText.innerText = "Spirit Niv. " + spiritStats.level;
                        spiritLvlText.style.color = "#f59e0b";
                        spiritLvlText.style.transform = "scale(1.2)";
                        const card = document.getElementById(`${prefix}-xp-card-${p.id}`);
                        if (card) {
                            card.style.boxShadow = "0 0 20px 5px rgba(245, 158, 11, 0.4)";
                            card.style.borderColor = "#f59e0b";
                        }
                    }
                }
                
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    if (bar && oldExp !== endExp) {
                        bar.style.boxShadow = "0 0 10px 2px rgba(16, 185, 129, 0.5)";
                        setTimeout(() => { if(bar) bar.style.boxShadow = "none"; }, 500);
                    }
                    if (spiritBar && oldSpiritExp !== endSpiritExp) {
                        spiritBar.style.boxShadow = "0 0 10px 2px rgba(245, 158, 11, 0.5)";
                        setTimeout(() => { if(spiritBar) spiritBar.style.boxShadow = "none"; }, 500);
                    }
                }
            }
            requestAnimationFrame(animate);
        }, 600);
    });
    
    // Ensure popIn keyframes exist
    if (!document.getElementById('chestAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'chestAnimStyle';
        style.innerHTML = `@keyframes popIn { to { opacity: 1; transform: scale(1); } }`;
        document.head.appendChild(style);
    }
    
    players.forEach(p => {
        previousPlayerXP[p.id] = p.experience;
        previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
    });
}

window.doAction = doAction;
window.endTurn = endTurn;
window.nextRoom = nextRoom;
window.openChest = openChest;
window.acceptAlteration = acceptAlteration;
window.buyMerchantItem = buyMerchantItem;
window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;
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

let hasAnimatedOpening = false;

window.showNotif = function(message, isError = false) {
    const notif = document.getElementById('combatNotif');
    const text = document.getElementById('combatNotifText');
    if (!notif || !text) return;
    text.textContent = message;
    notif.classList.remove('error');
    if (isError) notif.classList.add('error');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
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
        
        // Initialize previous XP for the first room
        data.players.forEach(p => {
            previousPlayerXP[p.id] = p.experience;
            previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });
        
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
        const hasEveryone = targets.includes('ALL_COMBATANTS');
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
            if (targetType === 'CASTER') {
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
    
    if (targetType === 'CASTER') {
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
    const vicOverlay = document.getElementById('combatVictoryOverlay');
    if (vicOverlay) vicOverlay.classList.remove('show');

    try {
        const res = await fetch(`/api/pve/combat/${sessionId}/next-room`, { method: 'POST' });
        const data = await res.json();
        
        // Track the current XP so animations in new rooms start from this baseline
        data.players.forEach(p => {
            previousPlayerXP[p.id] = p.experience;
            previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });
        
        updateUI(data);
    } catch (e) {
        console.error(e);
    }
}

async function acceptAlteration() {
    if (!sessionId) return;
    try {
        const res = await fetch(`/api/pve/combat/${sessionId}/alteration-accept`, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.text();
            showNotif(err || "Action impossible", true);
            return;
        }
        const data = await res.json();
        updateUI(data);
        
        const lootContainer = document.getElementById('eventLootContainer');
        if (lootContainer) {
            lootContainer.innerHTML = '';
            renderAndAnimateXPCards('eventLootContainer', data.players, 'alt');
            lootContainer.style.display = 'flex';
        }
    } catch (err) {
        console.error(err);
    }
}

async function buyMerchantItem(lootIndex) {
    if (!sessionId || !currentSessionData || !currentSessionData.players || currentSessionData.players.length === 0) return;
    const charId = currentSessionData.players[0].id;
    
    try {
        const btn = document.getElementById(`btn_buy_${lootIndex}`);
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';
        
        const res = await fetch(`/api/pve/combat/${sessionId}/merchant-buy?lootIndex=${lootIndex}&characterId=${charId}`, { method: 'POST' });
        if (!res.ok) {
            alert("Vous n'avez pas les ressources nécessaires, ou cet objet n'est plus disponible.");
            if (btn) btn.innerHTML = 'Acheter';
            return;
        }
        const data = await res.json();
        updateUI(data);
    } catch(e) {
        console.error(e);
        alert("Erreur lors de l'achat.");
    }
}

function openBuyModal(idx, itemName) {
    const modal = document.getElementById('buyConfirmModal');
    const targetName = document.getElementById('buyTargetName');
    const confirmBtn = document.getElementById('buyConfirmBtn');
    if (modal && targetName && confirmBtn) {
        targetName.innerHTML = itemName;
        confirmBtn.onclick = function() {
            closeBuyModal();
            buyMerchantItem(idx);
        };
        modal.classList.add('show');
    }
}

function closeBuyModal() {
    const modal = document.getElementById('buyConfirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;

async function openChest() {
    if (!sessionId) return;
    try {
        const btn = document.getElementById('btnOpenChest');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined spin">sync</span> Ouverture...`;
        }
        
        const res = await fetch(`/api/pve/combat/${sessionId}/open-chest`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.text();
            alert("Erreur : " + err);
            return;
        }
        
        const data = await res.json();
        
        // Handle custom animation for XP + Items in eventLootContainer
        const lootContainer = document.getElementById('eventLootContainer');
        if (lootContainer) {
            lootContainer.style.display = 'flex';
            lootContainer.innerHTML = '';
            

            
            // Also show gained items (check logs for "Vous avez trouvé un objet")
            let gainedItemsHtml = '';
            let goldAmount = 0;
            if (data.combatLog) {
                let chestLogs = [];
                for (let i = data.combatLog.length - 1; i >= 0; i--) {
                    const log = data.combatLog[i];
                    chestLogs.unshift(log);
                    if (log.includes("Vous avez ouvert le coffre !")) {
                        const goldMatch = log.match(/trouvez (\d+) Or/);
                        if (goldMatch) goldAmount = parseInt(goldMatch[1]);
                        break;
                    }
                }
                
                chestLogs.forEach(log => {
                    const itemNameMatch = log.match(/Vous avez trouvé un objet : (.*) !/);
                    if (itemNameMatch) {
                        const eqName = itemNameMatch[1];
                        
                        let eq = null;
                        if (data.currentRoom && data.currentRoom.lootTable) {
                            const entry = data.currentRoom.lootTable.find(l => l.equipment && l.equipment.name === eqName);
                            if (entry) eq = entry.equipment;
                        }

                        const slotInfo = eq ? (SLOT_LABELS[eq.slot] || { icon: 'help', color: '#94a3b8' }) : { icon: 'swords', color: '#f59e0b' };
                        const rarityColor = eq ? (RARITY_COLORS[eq.rarity] || '#ef4444') : '#f59e0b';
                        const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';

                        gainedItemsHtml += `
                            <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid ${rarityColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${rarityColor}; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                <span class="material-symbols-outlined${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> ${eqName}
                            </div>
                        `;
                    }
                });
                
                if (goldAmount > 0) {
                    gainedItemsHtml = `
                        <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid #f59e0b80; padding: 0.8rem 1rem; border-radius: 8px; color: #f59e0b; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                            <span class="material-symbols-outlined" style="color: #f59e0b;">monetization_on</span> +${goldAmount} Or
                        </div>
                    ` + gainedItemsHtml;
                }
            }
            if (gainedItemsHtml) {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.gap = '1rem';
                wrapper.style.flexWrap = 'wrap';
                wrapper.style.justifyContent = 'center';
                wrapper.style.marginTop = '1rem';
                wrapper.style.width = '100%';
                wrapper.innerHTML = gainedItemsHtml;
                
                lootContainer.appendChild(wrapper);
            }
        }
        
        // Then call updateUI
        updateUI(data);

    } catch (e) {
        console.error(e);
        alert("Erreur lors de l'ouverture du coffre.");
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
            
            const allEnemiesDead = !data.enemies || data.enemies.length === 0 || data.enemies.every(e => e.dead || e.currentHp <= 0);
            
            if (allEnemiesDead && !data.finished) {
                document.getElementById('btnAttack').disabled = true;
                const vicOverlay = document.getElementById('combatVictoryOverlay');
                if (vicOverlay) {
                    vicOverlay.classList.add('show');
                    const xpContainer = document.getElementById('combatVictoryXpContainer');
                    if (xpContainer) {
                        xpContainer.innerHTML = '';
                        
                        let goldAmount = 0;
                        if (data.combatLog) {
                            for (let i = data.combatLog.length - 1; i >= 0; i--) {
                                const log = data.combatLog[i];
                                if (log.includes("Les monstres vaincus ont lâché")) {
                                    const goldMatch = log.match(/lâché (\d+) Or/);
                                    if (goldMatch) goldAmount = parseInt(goldMatch[1]);
                                    break;
                                }
                                if (log.includes("Vous entrez dans")) break;
                            }
                        }
                        
                        if (goldAmount > 0) {
                            xpContainer.innerHTML += `
                                <div style="width: 100%; text-align: center; margin-bottom: 1rem; animation: popIn 0.5s ease-out forwards;">
                                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.4); border: 1px solid #f59e0b80; padding: 0.5rem 1rem; border-radius: 8px; color: #f59e0b; font-weight: bold; font-size: 1.2rem;">
                                        <span class="material-symbols-outlined" style="color: #f59e0b;">monetization_on</span> +${goldAmount} Or
                                    </div>
                                </div>
                            `;
                        }
                        
                        renderAndAnimateXPCards('combatVictoryXpContainer', data.players, 'vic');
                    }
                }
            } else {
                const vicOverlay = document.getElementById('combatVictoryOverlay');
                if (vicOverlay) vicOverlay.classList.remove('show');
                
                document.getElementById('btnAttack').disabled = false;
                renderEnemies(data.enemies);
                
                // Track previous XP to animate next time
                data.players.forEach(p => {
                    previousPlayerXP[p.id] = p.experience;
                });
            }
        } else {
            // TREASURE OR EVENT
            document.getElementById('btnAttack').disabled = true;
            document.getElementById('enemiesContainer').innerHTML = ''; // Clear enemies

            const overlay = document.getElementById('eventOverlay');
            const icon = document.getElementById('eventIcon');
            const title = document.getElementById('eventTitle');
            const desc = document.getElementById('eventDesc');

            const btnOpen = document.getElementById('btnOpenChest');
            const btnCont = document.getElementById('btnContinueEvent');
            const lootContainer = document.getElementById('eventLootContainer');

            if (data.currentRoom.type === 'TREASURE') {
                icon.textContent = data.roomEventCompleted ? 'lock_open' : 'lock';
                icon.style.color = '#f59e0b';
                title.textContent = 'Salle des Trésors';
                
                if (data.roomEventCompleted) {
                    desc.textContent = `Vous avez ouvert le coffre !`;
                    btnOpen.style.display = 'none';
                    btnCont.style.display = 'block';
                    lootContainer.style.display = 'flex';
                } else {
                    desc.textContent = `Un coffre mystérieux se trouve au centre de la pièce...`;
                    btnOpen.style.display = 'block';
                    btnCont.style.display = 'none';
                    lootContainer.style.display = 'none';
                    lootContainer.innerHTML = ''; // reset
                }
            } else if (data.currentRoom.type === 'EVENT') {
                const subType = data.currentRoom.eventSubType || 'ALTERATION';
                
                if (subType === 'ALTERATION') {
                    icon.textContent = 'blur_on';
                    icon.style.color = '#8b5cf6';
                    title.textContent = 'Altération';
                    desc.innerHTML = data.currentRoom.eventText || 'Une force mystérieuse vous entoure...';
                    
                    btnOpen.style.display = 'none';
                    
                    if (!data.roomEventCompleted && data.currentRoom.alterationType !== 'RIEN') {
                        let btnText = "Toucher";
                        let warningHtml = '';
                        let specialItemHtml = '';
                        if (data.currentRoom.alterationType === 'VIE_XP') {
                            let parts = [];
                            
                            let hp = data.currentRoom.alterationHpAmount || 0;
                            if (hp !== 0) {
                                parts.push(hp > 0 ? `+${hp} PV` : `${hp} PV`);
                            }
                            
                            let xp = data.currentRoom.alterationExpAmount || 0;
                            if (xp !== 0) {
                                parts.push(xp > 0 ? `+${xp} XP` : `${xp} XP`);
                            }
                            
                            if (data.currentRoom.alterationRewardType === 'SPIRITUAL_XP') {
                                parts.push(`+${data.currentRoom.alterationSpiritualXpReward || 0} XP Spirit.`);
                            } else if (data.currentRoom.alterationRewardType === 'SPECIAL_ITEM') {
                                specialItemHtml = `<div style="color: #d946ef; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; background: rgba(217, 70, 239, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(217, 70, 239, 0.3);"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle;">star</span> <strong>Récompense :</strong> Vous obtiendrez l'item spécial "${data.currentRoom.alterationSpecialItemReward || 'Item'}" !</div>`;
                            }
                            
                            if (parts.length > 0) {
                                btnText = `Toucher (${parts.join(', ')})`;
                            } else {
                                btnText = `Toucher`;
                            }
                        } else if (data.currentRoom.alterationType === 'ITEM') {
                            btnText = `Donner l'item et Toucher`;
                            warningHtml = `<div style="color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle;">warning</span> <strong>Attention :</strong> L'item "${data.currentRoom.alterationRequiredItem || 'spécial'}" sera définitivement détruit de l'inventaire d'un de vos héros s'il accepte cette offre.</div>`;
                        }
                        
                        btnCont.style.display = 'none';
                        lootContainer.style.display = 'flex';
                        lootContainer.innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: center; max-width: 600px; width: 100%;">
                                ${warningHtml}
                                ${specialItemHtml}
                                <div style="display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; width: 100%;">
                                    <button class="btn" style="flex: 1; max-width: 250px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onclick="acceptAlteration()">${btnText}</button>
                                    <button class="btn" style="flex: 1; max-width: 250px; background: rgba(255, 255, 255, 0.05); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onclick="nextRoom()">Ignorer et passer</button>
                                </div>
                            </div>
                        `;
                    } else {
                        btnCont.style.display = 'block';
                        btnCont.textContent = 'Continuer';
                        lootContainer.style.display = 'none';
                    }
                } else if (subType === 'RENCONTRE') {
                    icon.textContent = 'storefront';
                    icon.style.color = '#10b981';
                    title.textContent = 'Rencontre';
                    desc.innerHTML = data.currentRoom.eventText || 'Un marchand ambulant vous interpelle...';
                    
                    btnOpen.style.display = 'none';
                    btnCont.style.display = 'block';
                    
                    if (data.currentRoom.lootTable && data.currentRoom.lootTable.length > 0) {
                        lootContainer.style.display = 'flex';
                        lootContainer.innerHTML = '';
                        
                        data.currentRoom.lootTable.forEach((entry, idx) => {
                            let nameHtml = '';
                            let iconHtml = '';
                            let rarityColor = '#10b981';
                            
                            if (entry.specialItemName) {
                                nameHtml = entry.specialItemName;
                                iconHtml = '<span class="material-symbols-outlined" style="color: #d946ef; font-size: 1.2rem;">star</span>';
                                rarityColor = '#d946ef';
                            } else if (entry.equipment) {
                                const eq = entry.equipment;
                                const slotInfo = SLOT_LABELS[eq.slot] || { icon: 'help', color: '#94a3b8' };
                                rarityColor = RARITY_COLORS[eq.rarity] || '#ef4444';
                                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                nameHtml = eq.name;
                                iconHtml = `<span class="material-symbols-outlined${extraClass}" style="color: ${slotInfo.color}; font-size: 1.2rem;">${slotInfo.icon}</span>`;
                            }

                            let priceHtml = '';
                            const goldPrice = entry.priceGold != null ? entry.priceGold : (entry.probability || 0);
                            
                            if (goldPrice > 0) {
                                priceHtml += `<span style="color: #f59e0b; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem;">monetization_on</span>${goldPrice}</span>`;
                            }
                            if (entry.priceSpecialItemName) {
                                priceHtml += `<span style="color: #d946ef; display: flex; align-items: center; gap: 0.3rem; margin-left: ${goldPrice > 0 ? '0.8rem' : '0'};"><span class="material-symbols-outlined" style="font-size: 1.1rem;">star</span>1x ${entry.priceSpecialItemName}</span>`;
                            }
                            
                            if (priceHtml === '') {
                                priceHtml = `<span style="color: #10b981; display: flex; align-items: center; gap: 0.3rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem;">sell</span>Gratuit</span>`;
                            }

                            lootContainer.innerHTML += `
                                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${rarityColor}50; padding: 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 48%; min-width: 350px; flex: 1 1 auto; max-width: 500px; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="width: 48px; height: 48px; border-radius: 8px; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border: 1px solid ${rarityColor}30;">
                                            ${iconHtml}
                                        </div>
                                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                                            <span style="color: ${rarityColor}; font-weight: 700; font-size: 1.1rem; text-shadow: 0 0 10px ${rarityColor}40;">${nameHtml}</span>
                                            <div style="display: flex; align-items: center; font-size: 0.9rem; font-weight: 600; background: rgba(0,0,0,0.3); padding: 0.2rem 0.6rem; border-radius: 4px; width: fit-content; margin-top: 0.2rem;">
                                                ${priceHtml}
                                            </div>
                                        </div>
                                    </div>
                                    <button id="btn_buy_${idx}" type="button" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);" onclick="openBuyModal(${idx}, \`${nameHtml.replace(/'/g, "\\'").replace(/"/g, '&quot;')}\`)" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">
                                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">shopping_cart</span>
                                        Acheter
                                    </button>
                                </div>
                            `;
                        });
                    } else {
                        lootContainer.style.display = 'none';
                    }
                } else if (subType === 'PIEGE') {
                    icon.textContent = 'warning';
                    icon.style.color = '#f87171';
                    title.textContent = 'Piège !';
                    
                    let trapDesc = data.currentRoom.eventText || 'Un piège se déclenche !';
                    const trapType = data.currentRoom.trapType || 'PV';
                    const trapAmount = data.currentRoom.trapAmount || 0;
                    
                    if (trapType === 'PV') {
                        trapDesc += `<br><br><span style="color:#ef4444;">⚠️ Perte de ${trapAmount} PV</span>`;
                    } else if (trapType === 'MANA') {
                        trapDesc += `<br><br><span style="color:#38bdf8;">⚠️ Perte de ${trapAmount} Mana</span>`;
                    } else if (trapType === 'CORDE') {
                        trapDesc += `<br><br><span style="color:#f59e0b;">🪢 Nécessite une Corde pour éviter le piège</span>`;
                    }
                    
                    desc.innerHTML = trapDesc;
                    btnOpen.style.display = 'none';
                    btnCont.style.display = 'block';
                    lootContainer.style.display = 'none';
                } else if (subType === 'PORTE_ETRANGE') {
                    icon.textContent = 'door_front';
                    icon.style.color = '#fbbf24';
                    title.textContent = 'Porte Étrange';
                    desc.innerHTML = data.currentRoom.eventText || 'Une porte mystérieuse se dresse devant vous...';
                    
                    btnOpen.style.display = 'none';
                    btnCont.style.display = 'block';
                    lootContainer.style.display = 'none';
                    
                    // Show door outcomes info
                    if (data.currentRoom.doorOutcomes) {
                        let outcomes;
                        try {
                            outcomes = typeof data.currentRoom.doorOutcomes === 'string' ? JSON.parse(data.currentRoom.doorOutcomes) : data.currentRoom.doorOutcomes;
                        } catch(e) { outcomes = []; }
                        
                        if (outcomes.length > 0) {
                            lootContainer.style.display = 'flex';
                            lootContainer.innerHTML = `
                                <div style="color: #94a3b8; font-size: 0.85rem; text-align: center; width: 100%;">
                                    <span style="color: #fbbf24; font-weight: 600;">Que se cache-t-il derrière ?</span><br>
                                    Le résultat sera révélé si vous passez la porte...
                                </div>
                            `;
                        }
                    }
                }
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

    let specialItemsHtml = '';
    if (isHero && c.specialItems) {
        const specialItemKeys = Object.keys(c.specialItems).filter(k => c.specialItems[k] > 0);
        if (specialItemKeys.length > 0) {
            specialItemsHtml = `<div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: center;">`;
            specialItemKeys.forEach(k => {
                specialItemsHtml += `<span class="hero-stat-chip" title="Item Spécial : ${k}" style="border-color: rgba(217, 70, 239, 0.4); color: #d946ef;"><span class="material-symbols-outlined" style="color: inherit; font-size: 1rem;">star</span>${c.specialItems[k]}x ${k}</span>`;
            });
            specialItemsHtml += `</div>`;
        }
    }

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
        ${specialItemsHtml}
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
    const overlay = document.getElementById('resultOverlay');
    const title = document.getElementById('resultTitle');
    const desc = document.getElementById('resultDesc');
    
    if (playerWon) {
        title.textContent = "VICTOIRE";
        title.style.color = "#10b981";
        desc.textContent = "Le donjon a été complété.";
    } else {
        title.textContent = "DÉFAITE";
        title.style.color = "#ef4444";
        desc.textContent = "Votre équipe a été anéantie.";
    }
    
    overlay.classList.add('show');
}

function showNotif(msg, isError = false) {
    const notif = document.getElementById('combatNotif');
    const notifText = document.getElementById('combatNotifText');
    const notifIcon = notif.querySelector('.notif-icon');
    
    notifText.textContent = msg;
    if (isError) {
        notif.style.background = 'rgba(239, 68, 68, 0.9)';
        notifIcon.textContent = 'error';
    } else {
        notif.style.background = 'rgba(16, 185, 129, 0.9)';
        notifIcon.textContent = 'check_circle';
    }
    
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}
