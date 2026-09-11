import { pageState, setButtonsProcessing } from './combat-state.js';
import { updateUI } from './combat-ui.js?v=203';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../utils/filters.js';


export function initiateCombatCast(spellId) {
    if (!pageState.currentSessionData) return;

    let needsEnemy = false;
    let needsAlly = false;
    let targetType = 'ENNEMI'; // default

    const enemyCards = document.querySelectorAll('.fighter-enemy:not(.dead)');
    const allyCards = document.querySelectorAll('.fighter-player:not(.dead)'); // Now includes active player!

    let requiresEnemySelection = false;
    let requiresAllySelection = false;
    let hasAlly = false;
    let hasAllAllies = false;
    let hasEveryone = false;
    let hasCaster = false;

    if (spellId) {
        const sp = pageState.currentSessionData.availableSpells.find(s => s.id === spellId);
        if (!sp) return;

        const choiceSelect = document.getElementById(`choice-select-${spellId}`);
        const currentChoiceKey = choiceSelect ? choiceSelect.value : null;

        const effects = sp.effects || [];
        const activeEffects = effects.filter(e => {
            if (e.requiredChoiceKey == null) return true;
            return String(e.requiredChoiceKey) === String(currentChoiceKey);
        });

        // Verifier si les effets actifs consomment plus de chaleur que ce que le joueur possède
        let requiredHeatFromEffects = 0;
        activeEffects.forEach(e => {
            const rawType = e.effectType || e.effect_type || '';
            if (rawType === 'HEAT_FIXED' || rawType === 'HeatFixedEffect') {
                if ((e.amount || 0) < 0) {
                    requiredHeatFromEffects += Math.abs(e.amount);
                }
            } else if (rawType === 'HEAT_PERCENTAGE' || rawType === 'HeatPercentageEffect') {
                if ((e.percentage || 0) < 0) {
                    const src = e.source || 'TARGET_HEALTH_MAX';
                    let srcVal = 1;
                    if (pageState.currentSessionData && pageState.currentSessionData.activePlayer) {
                        if (src === 'CASTER_HEALTH_MAX') srcVal = pageState.currentSessionData.activePlayer.hpMax || 1;
                        if (src === 'CASTER_MANA_MAX') srcVal = pageState.currentSessionData.activePlayer.manaMax || 1;
                        if (src === 'CASTER_POWER') srcVal = pageState.currentSessionData.activePlayer.power || 1;
                        if (src === 'CASTER_STRENGTH') srcVal = pageState.currentSessionData.activePlayer.strength || 1;
                        if (src === 'CASTER_ARMOR') srcVal = pageState.currentSessionData.activePlayer.armor || 1;
                        if (src === 'CASTER_RESISTANCE') srcVal = pageState.currentSessionData.activePlayer.resistance || 1;
                        if (src === 'CASTER_SPEED') srcVal = pageState.currentSessionData.activePlayer.speed || 1;
                    }
                    requiredHeatFromEffects += Math.floor(Math.abs(e.percentage) * srcVal);
                }
            }
        });

        const playerHeat = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['destruction_heat'] || 0) : 0;
        const totalHeatCost = (sp.heatCost || 0) + requiredHeatFromEffects;

        if (playerHeat < totalHeatCost) {
            addCombatLog(`Chaleur insuffisante pour cette option (${playerHeat}/${totalHeatCost})`, 'system');
            return;
        }

        const actualSeedCost = sp.seedCost || 0;
        const currentBuds = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['creation_buds'] || 0) : 0;
        const usedThisTurn = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['creation_used_this_turn'] || 0) : 0;
        const willPassiveTrigger = currentBuds > 0 && usedThisTurn === 0;
        const requiredBuds = actualSeedCost + (willPassiveTrigger ? 1 : 0);

        if (currentBuds < requiredBuds) {
            addCombatLog(`Graines insuffisantes pour cette option (${currentBuds}/${requiredBuds})`, 'system');
            return;
        }

        if (activeEffects.length > 0) {
            targetType = activeEffects[0].effectTarget || activeEffects[0].effect_target;
        }

        const targets = activeEffects.map(e => e.effectTarget || e.effect_target);
        const hasTarget = targets.includes('TARGET');
        hasAlly = targets.includes('ALLY');
        const hasAllEnemies = targets.includes('ALL_ENEMIES');
        hasAllAllies = targets.includes('ALL_ALLIES');
        hasEveryone = targets.includes('ALL_COMBATANTS');
        hasCaster = targets.includes('CASTER');

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
    pageState.pendingCastSpellId = spellId;
    pageState.pendingNeedsEnemy = needsEnemy;
    pageState.pendingNeedsAlly = needsAlly;

    // Reset target selections for dual-target spells to avoid stale values
    if (needsEnemy && needsAlly) {
        pageState.selectedTargetIndex = null;
        pageState.selectedAllyIndex = -1;
    }

    const cardEl = spellId ? document.getElementById(`spell-card-${spellId}`) : document.getElementById('btnAttack');

    // Disable all other buttons
    document.querySelectorAll('.combat-spell-card, .action-btn, .filter-radio, .filter-chip').forEach(btn => {
        if (btn !== cardEl) {
            btn.classList.add('disabled');
            btn.classList.add('disabled');
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
            const dualTarget = requiresEnemySelection && requiresAllySelection;
            const promptText = dualTarget
                ? 'Sélectionnez un ennemi et un allié'
                : (requiresEnemySelection ? 'Sélectionnez un ennemi' : 'Sélectionnez un allié');
            overlay.innerHTML = `
                <span class="text-sm font-semibold text-subtle" id="castPromptText" >${promptText}</span>
                <div class="text-muted" id="castTargetStatus" style="font-size: 0.75rem; display: ${dualTarget ? 'block' : 'none'};"></div>
                <button class="btn-combat-danger" type="button" onclick="event.stopPropagation(); cancelCombatCast()" >Annuler</button>
            `;
        } else {
            overlay.innerHTML = `
                <div class="flex-center gap-sm">
                    <button class="btn-combat-success" type="button" onclick="event.stopPropagation(); confirmCombatCast(null, 'direct')" >Lancer</button>
                    <button class="btn-combat-danger" type="button" onclick="event.stopPropagation(); cancelCombatCast()" >Annuler</button>
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
            cardEl.innerHTML = `<div class="flex-col items-center gap-xs"><span class="text-xs text-subtle">Ciblez un ennemi</span> <button class="btn-combat-danger" onclick="event.stopPropagation(); cancelCombatCast()" >Annuler</button></div>`;
        } else {
            cardEl.innerHTML = `
                <div class="flex-center gap-sm">
                    <button class="btn-combat-success" onclick="event.stopPropagation(); confirmCombatCast(null, 'direct')" >Lancer</button>
                    <button class="btn-combat-danger" onclick="event.stopPropagation(); cancelCombatCast()" >Annuler</button>
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
            // Prevent selecting the caster (active player) if the effect strictly targets an ALLY
            if (hasAlly && !hasAllAllies && !hasEveryone && card.classList.contains('active')) {
                return;
            }
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

export function confirmCombatCast(index, type) {
    if (type === 'enemy') {
        pageState.selectedTargetIndex = index;
    } else if (type === 'ally') {
        pageState.selectedAllyIndex = index;
    }

    // Dual-target: need both enemy AND ally &mdash; wait if one is still missing
    // Skip when type is 'direct' (Lancer button click, auto-targeting handles it)
    if (pageState.pendingNeedsEnemy && pageState.pendingNeedsAlly && type !== 'direct') {
        const hasEnemy = pageState.selectedTargetIndex !== null;
        const hasAlly = pageState.selectedAllyIndex !== -1;

        // Update visual feedback on selected cards
        if (type === 'enemy' && index !== null) {
            document.querySelectorAll('.fighter-enemy.target-selected').forEach(c => c.classList.remove('target-selected'));
            const card = document.querySelector(`.fighter-enemy[data-index="${index}"]`);
            if (card) card.classList.add('target-selected');
        }
        if (type === 'ally' && index !== -1) {
            document.querySelectorAll('.fighter-player.target-selected').forEach(c => c.classList.remove('target-selected'));
            const cards = document.querySelectorAll('.fighter-player:not(.dead)');
            if (cards[index]) cards[index].classList.add('target-selected');
        }

        // Update status text in overlay
        const statusEl = document.getElementById('castTargetStatus');
        const promptEl = document.getElementById('castPromptText');
        if (statusEl) {
            const parts = [];
            if (hasEnemy) parts.push('✅ Ennemi sélectionné');
            else parts.push('⬜ Sélectionnez un ennemi');
            if (hasAlly) parts.push('✅ Allié sélectionné');
            else parts.push('⬜ Sélectionnez un allié');
            statusEl.innerHTML = parts.join(' &nbsp;Â·&nbsp; ');
        }

        if (!hasEnemy || !hasAlly) {
            // Still waiting for second target &mdash; update prompt and return
            if (promptEl) {
                promptEl.textContent = !hasEnemy ? 'Sélectionnez un ennemi' : 'Sélectionnez un allié';
            }
            return;
        }
    }

    const spellId = pageState.pendingCastSpellId;
    cancelCombatCast();
    doAction(spellId);
}

export function cancelCombatCast() {
    const enemyCards = document.querySelectorAll('.fighter-enemy');
    enemyCards.forEach(card => {
        card.classList.remove('target-selectable', 'target-highlight', 'target-selected');
        if (card.dataset.oldOnClick) {
            card.setAttribute('onclick', card.dataset.oldOnClick);
        } else {
            card.removeAttribute('onclick');
        }
    });

    const allyCards = document.querySelectorAll('.fighter-player');
    allyCards.forEach(card => {
        card.classList.remove('target-selectable', 'target-highlight', 'target-selected');
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
        btn.classList.remove('disabled');
    });

    // Attack button specific disable check
    const btnAttack = document.getElementById('btnAttack');
    const isPlayerChanneling = pageState.currentSessionData && pageState.currentSessionData.activePlayer && pageState.currentSessionData.activePlayer.remainingChannelingTurns > 0;
    if (btnAttack && pageState.currentSessionData && pageState.currentSessionData.activePlayer && (pageState.currentSessionData.activePlayer.banalSpellCastThisTurn || isPlayerChanneling)) {
        btnAttack.classList.add('disabled');
        btnAttack.classList.add('disabled');
    }

    pageState.pendingCastSpellId = null;
    pageState.pendingNeedsEnemy = false;
    pageState.pendingNeedsAlly = false;
}

export async function doAction(spellId = null) {
    if (!pageState.sessionId || !pageState.currentSessionData || pageState.isProcessing) return;
    pageState.isProcessing = true;

    // Ensure we have a valid target
    if (pageState.currentSessionData.enemies.length > 0 && (pageState.selectedTargetIndex === null || pageState.currentSessionData.enemies[pageState.selectedTargetIndex].dead)) {
        // Auto select first alive target
        pageState.selectedTargetIndex = pageState.currentSessionData.enemies.findIndex(e => !e.dead);
        if (pageState.selectedTargetIndex === -1) {
            pageState.isProcessing = false;
            return; // All dead
        }
    }

    let choiceKey = null;
    if (spellId) {
        const choiceSelect = document.getElementById(`choice-select-${spellId}`);
        if (choiceSelect) {
            choiceKey = choiceSelect.value;
        }
    }

    setButtonsProcessing(true);

    // Animation attack
    const activePlayerCard = document.querySelector('.fighter-player.active');
    if (activePlayerCard) {
        activePlayerCard.style.transform = 'translateX(50px)';
        setTimeout(() => { activePlayerCard.style.transform = 'none'; }, 200);
    }

    try {
        let url = `/api/pve/combat/${pageState.sessionId}/action?targetIndex=${pageState.selectedTargetIndex}`;
        if (pageState.selectedAllyIndex !== -1) url += `&allyTargetIndex=${pageState.selectedAllyIndex}`;
        if (spellId) url += `&spellId=${spellId}`;
        if (choiceKey !== null) url += `&choiceKey=${choiceKey}`;

        const res = await globalFetch(url, { method: 'POST' });
        if (!res.ok) {
            const errText = await res.text();
            console.error('Server error:', errText);
            window.showNotif(errText || "Erreur serveur", true);
            pageState.isProcessing = false;
            setButtonsProcessing(false);
            return;
        }
        const data = await res.json();

        // Let user read log by adding a small delay before full UI update
        setTimeout(() => {
            pageState.selectedAllyIndex = -1; // Reset after action completes
            pageState.isProcessing = false;
            setButtonsProcessing(false);
            updateUI(data);
        }, 600);

    } catch (e) {
        console.error(e);
        window.showNotif("Erreur de connexion", true);
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export let currentSpellsTab = 'VOIE';