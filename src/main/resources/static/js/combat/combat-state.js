import { shakeStyle } from './combat-utils.js';
import { initMultiSSE } from './combat-socket.js';
import { updateUI, renderSpells } from './combat-ui.js';
import { currentSpellsTab, initiateCombatCast, confirmCombatCast, cancelCombatCast, doAction } from './combat-spells.js';
import { endTurn, nextRoom, openStrangeDoor, acceptAlteration, useRope, buyMerchantItem, openBuyModal, closeBuyModal, addLootedConsumable, openChest } from './combat-actions.js';
import { loadAnomaliesCombat, resumeCombat, startCombat } from './combat-init.js';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../utils/filters.js';


if (!window.allAnomaliesCombat || !Array.isArray(window.allAnomaliesCombat)) {
    window.allAnomaliesCombat = [];
    window.globalFetch('/api/anomalies/all-templates').then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
    }).then(data => {
        if (Array.isArray(data)) {
            window.allAnomaliesCombat = data;
        } else {
            console.warn("Expected array for anomalies but got", data);
        }
    }).catch(err => {
        console.error("Failed to load anomalies templates:", err);
    });
}

shakeStyle.innerHTML = `
@keyframes shake-error {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-10px); color: #f87171; }
    40%, 80% { transform: translateX(10px); color: #f87171; }
}
.shake-animation {
    animation: shake-error 0.5s ease-in-out;
}
`;

document.head.appendChild(shakeStyle);

export const pageState = {
    lastCombatLogCount: null,
    sessionId: null,
    currentSessionData: null,
    isProcessing: null,
    selectedTargetIndex: null,
    selectedAllyIndex: null,
    previousPlayerXP: null,
    previousPlayerSpiritXP: null,
    isFleeing: null,
    currentSpellFilter: null,
    hasAnimatedOpening: null,
    pendingCastSpellId: null,
    pendingNeedsEnemy: null,
    pendingNeedsAlly: null,
    // Co-op multi
    isMulti: false,
    multiRole: null,   // 'host' | 'guest'
    multiId: null,
    currentUsername: null,  // rempli au chargement
};

pageState.lastCombatLogCount = 0;

pageState.previousPlayerXP = {};

pageState.previousPlayerSpiritXP = {};

pageState.isProcessing = false;

pageState.isFleeing = false;

pageState.hasAnimatedOpening = false;

pageState.currentSpellFilter = 'ALL';

pageState.selectedAllyIndex = -1;

pageState.pendingNeedsEnemy = false;

pageState.pendingNeedsAlly = false;

export function setButtonsProcessing(isProc) {
    const buttons = document.querySelectorAll('.action-btn, .btn');
    buttons.forEach(btn => {
        btn.disabled = isProc;
        if (isProc) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

window.showGlobalTooltip = ui.showGlobalTooltip;
window.hideGlobalTooltip = ui.hideGlobalTooltip;

window.promptFlee = function () {
    ui.showModal({
        title: 'Fuir le combat ?',
        body: `Êtes-vous sûr de vouloir fuir ?<br><br><span id="fleePenaltyText" class="text-sm text-error">Calcul de la pénalité...</span>`,
        icon: 'directions_run',
        confirmText: 'Oui, fuir',
        onConfirm: async () => {
            try {
                pageState.isFleeing = true;
                const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/flee`, { method: 'POST' });
                if (!res.ok) {
                    pageState.isFleeing = false;
                    const err = await res.text();
                    ui.showNotif("Erreur lors de la fuite : " + err, true);
                    return;
                }
                localStorage.removeItem('activeCombatId');
                window.location.href = '/dungeons.html';
            } catch (e) {
                console.error(e);
                localStorage.removeItem('activeCombatId');
                window.location.href = '/dungeons.html';
            }
        }
    });

    // Populate penalty text
    setTimeout(() => {
        if (!pageState.sessionId || !pageState.currentSessionData || pageState.currentSessionData.finished) return;
        const roomsCount = Math.max(1, pageState.currentSessionData.totalRooms || 1);
        const nbHeroes = Math.max(1, (pageState.currentSessionData.players || []).length);
        const xpLossPerHero = Math.floor((10 * roomsCount) / nbHeroes);
        const goldLoss = 10 * roomsCount;
        const fleePenaltySpan = document.getElementById('fleePenaltyText');
        if (fleePenaltySpan) {
            fleePenaltySpan.innerHTML = `Perte d'xp et Or : <span style="color: #f87171;">-${xpLossPerHero} XP normal</span> (par perso) et <span class="text-warning">-${goldLoss} Or</span> (au total).`;
        }
    }, 100);
};



document.addEventListener('DOMContentLoaded', async () => {
    window.dungeonMusic = null;

    const tryPlayMusic = () => {
        if (window.dungeonMusic && window.dungeonMusic.paused) {
            window.dungeonMusic.play().catch(e => console.log("Music auto-play blocked", e));
        }
        document.removeEventListener('click', tryPlayMusic);
    };
    tryPlayMusic();
    document.addEventListener('click', tryPlayMusic);

    try { if (window.initAppMeta) await window.initAppMeta(); } catch (e) { console.warn('Meta loading skipped:', e); }

    // Charger le username actuel
    try {
        const meRes = await globalFetch('/api/auth/me', { credentials: 'same-origin' });
        if (meRes.ok) {
            const meData = await meRes.json();
            pageState.currentUsername = meData.username || null;
        }
    } catch (_) { }

    await loadAnomaliesCombat();

    const urlParams = new URLSearchParams(window.location.search);
    const multiId = urlParams.get('multiId');
    const role = urlParams.get('role');
    const directSessionId = urlParams.get('sessionId');

    // ─── Mode multi : sessionId fourni directement (join ou host après lobby-ready)
    if (directSessionId) {
        pageState.isMulti = true;
        pageState.multiRole = role || 'guest';
        pageState.multiId = multiId;
        pageState.sessionId = directSessionId;
        localStorage.setItem('activeCombatId', directSessionId);
        window.history.replaceState({}, document.title, window.location.pathname);

        // Ouvrir SSE pour les mises à jour en temps réel
        initMultiSSE(directSessionId);

        // Charger l'état initial
        const res = await globalFetch(`/api/pve/combat/${directSessionId}/resume`, { method: 'POST' });
        if (!res.ok) {
            window.showNotif('Session introuvable ou expirée.', true);
            window.location.href = '/dungeons.html';
            return;
        }
        const data = await res.json();
        data.players.forEach(p => {
            pageState.previousPlayerXP[p.id] = p.experience;
            pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });
        updateUI(data);
        return;
    }

    // ─── Mode solo classique
    const savedCombatId = localStorage.getItem('activeCombatId');
    if (savedCombatId) {
        resumeCombat(savedCombatId);
        return;
    }

    const dungeonId = urlParams.get('dungeonId');
    const characterIds = urlParams.get('characterIds');
    const consumableIds = urlParams.get('consumableIds');

    if (!dungeonId || !characterIds) {
        if (typeof showNotif !== 'undefined') window.showNotif("Paramètres de combat manquants.", true);
        else ui.showNotif("Paramètres de combat manquants.", true);
        window.location.href = '/dungeons.html';
        return;
    }

    startCombat(characterIds, dungeonId, consumableIds);
});

window.addEventListener('beforeunload', function (e) {
    if (!pageState.isFleeing && pageState.sessionId && pageState.currentSessionData && !pageState.currentSessionData.finished) {
        e.preventDefault();
        e.returnValue = "Vous êtes en combat ! Quitter maintenant comptera comme une défaite ou un abandon pénalisé.";
        return e.returnValue;
    }
});

window.updateSpellCardState = function (spellId) {
    if (!pageState.currentSessionData) return;
    const sp = pageState.currentSessionData.availableSpells.find(s => s.id === spellId);
    if (!sp) return;

    const availabilityList = pageState.currentSessionData.spellAvailability || [];
    const avail = availabilityList.find(a => a.spellId === sp.id);
    let isCastable = !avail || avail.castable;
    let dynamicReason = null;

    const choiceSelect = document.getElementById(`choice-select-${spellId}`);
    if (isCastable) {
        let activeEffects = sp.effects || [];

        if (choiceSelect) {
            const currentChoiceKey = choiceSelect.value;
            activeEffects = activeEffects.filter(e => {
                if (e.requiredChoiceKey == null) return true;
                return String(e.requiredChoiceKey) === String(currentChoiceKey);
            });
        }

        let requiredHeatFromEffects = 0;
        let requiredManaFromEffects = 0;

        activeEffects.forEach(e => {
            const rawType = e.effectType || e.effect_type || '';

            if (rawType === 'HEAT_FIXED' || rawType === 'HeatFixedEffect') {
                if ((e.amount || 0) < 0) {
                    requiredHeatFromEffects += Math.abs(e.amount);
                }
            } else if (rawType === 'HEAT_PERCENTAGE' || rawType === 'HeatPercentageEffect') {
                if ((e.percentage || 0) < 0) {
                    const src = e.source || 'TARGET_HEALTH_MAX';
                    let srcVal = 1; // Default
                    if (pageState.currentSessionData && pageState.currentSessionData.activePlayer) {
                        if (src === 'CASTER_HEALTH_MAX') srcVal = pageState.currentSessionData.activePlayer.hpMax || 1;
                        if (src === 'CASTER_MANA_MAX') srcVal = pageState.currentSessionData.activePlayer.manaMax || 1;
                        if (src === 'CASTER_POWER') srcVal = pageState.currentSessionData.activePlayer.power || 1;
                        if (src === 'CASTER_STRENGTH') srcVal = pageState.currentSessionData.activePlayer.strength || 1;
                        if (src === 'CASTER_ARMOR') srcVal = pageState.currentSessionData.activePlayer.armor || 1;
                        if (src === 'CASTER_RESISTANCE') srcVal = pageState.currentSessionData.activePlayer.resistance || 1;
                        if (src === 'CASTER_SPEED') srcVal = pageState.currentSessionData.activePlayer.speed || 1;
                    }
                    requiredHeatFromEffects += Math.floor((Math.abs(e.percentage) / 100) * srcVal);
                }
            }

            const isImmediateOrT1 = !e.channelingTurns || e.channelingTurns.length === 0 || e.channelingTurns.includes(1);
            const targetsCaster = (e.effectTarget || e.effect_target) === 'CASTER';
            if (isImmediateOrT1 && targetsCaster) {
                if (rawType === 'FIXED_MANA' || rawType === 'ManaFixedEffect' || rawType === 'MANA_OVER_TIME' || rawType === 'ManaOverTimeEffect') {
                    const amt = e.manaAmount || e.mana_amount || e.fixedManaPerTick || e.fixed_mana_per_tick || e.amount || 0;
                    if (amt < 0) {
                        requiredManaFromEffects += Math.abs(amt);
                    }
                }

                if (rawType === 'PERCENTAGE_MANA' || rawType === 'ManaPercentageEffect' || rawType === 'MANA_OVER_TIME' || rawType === 'ManaOverTimeEffect') {
                    const pct = e.percentage || e.percentageManaPerTick || e.percentage_mana_per_tick || 0;
                    if (pct < 0) {
                        const src = e.source || e.manaSource || e.mana_source || 'TARGET_MANA_MAX';
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
                        requiredManaFromEffects += Math.floor((Math.abs(pct) / 100) * srcVal);
                    }
                }
            }
        });

        const playerHeat = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['destruction_heat'] || 0) : 0;
        const totalHeatCost = (avail && avail.finalHeatCost !== undefined ? avail.finalHeatCost : (sp.heatCost || 0)) + requiredHeatFromEffects;

        if (playerHeat < totalHeatCost) {
            isCastable = false;
            dynamicReason = 'HEAT';
        }

        const playerMana = pageState.currentSessionData.activePlayer ? pageState.currentSessionData.activePlayer.manaCurrent : 0;
        const totalManaCost = (avail && avail.finalManaCost !== undefined ? avail.finalManaCost : (sp.manaCost || 0)) + requiredManaFromEffects;

        if (isCastable && playerMana < totalManaCost) {
            isCastable = false;
            dynamicReason = 'MANA';
        }

        const actualSeedCost = sp.seedCost || 0;
        const currentBuds = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['creation_buds'] || 0) : 0;
        const usedThisTurn = pageState.currentSessionData.activePlayer?.passiveStates ? (pageState.currentSessionData.activePlayer.passiveStates['creation_used_this_turn'] || 0) : 0;
        const willPassiveTrigger = currentBuds > 0 && usedThisTurn === 0;
        const requiredBuds = actualSeedCost + (willPassiveTrigger ? 1 : 0);

        if (currentBuds < requiredBuds) {
            isCastable = false;
            dynamicReason = 'SEEDS';
        }

        // Dynamic NO_OTHER_ALLY check
        const targetsOnlyAlly = activeEffects.length > 0 && activeEffects.every(e => {
            const t = e.effectTarget || e.effect_target;
            return t === 'ALLY';
        });

        if (targetsOnlyAlly && isCastable) {
            const hasOtherAlly = pageState.currentSessionData.players && pageState.currentSessionData.activePlayer && pageState.currentSessionData.players.some(p => p.healthCurrent > 0 && p.id !== pageState.currentSessionData.activePlayer.id);
            if (!hasOtherAlly) {
                isCastable = false;
                dynamicReason = 'NO_OTHER_ALLY';
            }
        }
    }

    const card = document.getElementById(`spell-card-${spellId}`);
    if (card) {
        if (isCastable) {
            card.classList.remove('spell-disabled');
            card.setAttribute('onclick', `initiateCombatCast(${spellId})`);
            const dynamicBadge = card.querySelector('.dynamic-spell-disabled-badge');
            if (dynamicBadge) dynamicBadge.remove();
        } else {
            card.classList.add('spell-disabled');
            card.setAttribute('onclick', '');

            if (dynamicReason === 'HEAT' && !card.querySelector('.spell-disabled-badge.dynamic-spell-disabled-badge')) {
                const dynamicBadge = card.querySelector('.dynamic-spell-disabled-badge');
                if (dynamicBadge) dynamicBadge.remove();

                const badge = document.createElement('div');
                badge.className = 'spell-disabled-badge badge-resource dynamic-spell-disabled-badge';
                badge.title = 'Chaleur insuffisante pour cette option';
                badge.innerHTML = '<span class="material-symbols-outlined">local_fire_department</span>';
                card.appendChild(badge);
            } else if (dynamicReason === 'MANA' && !card.querySelector('.spell-disabled-badge.dynamic-spell-disabled-badge')) {
                const dynamicBadge = card.querySelector('.dynamic-spell-disabled-badge');
                if (dynamicBadge) dynamicBadge.remove();

                const badge = document.createElement('div');
                badge.className = 'spell-disabled-badge badge-resource dynamic-spell-disabled-badge';
                badge.title = 'Mana insuffisant pour cette option';
                badge.innerHTML = '<span class="material-symbols-outlined" style="color: #38bdf8;">water_drop</span>';
                card.appendChild(badge);
            } else if (dynamicReason === 'SEEDS' && !card.querySelector('.spell-disabled-badge.dynamic-spell-disabled-badge')) {
                const dynamicBadge = card.querySelector('.dynamic-spell-disabled-badge');
                if (dynamicBadge) dynamicBadge.remove();

                const badge = document.createElement('div');
                badge.className = 'spell-disabled-badge badge-resource dynamic-spell-disabled-badge';
                badge.style.color = '#6ee7b7';
                badge.title = 'Graines insuffisantes pour cette option';
                badge.innerHTML = '<span class="material-symbols-outlined">yard</span>';
                card.appendChild(badge);
            } else if (dynamicReason === 'NO_OTHER_ALLY' && !card.querySelector('.spell-disabled-badge.dynamic-spell-disabled-badge')) {
                const dynamicBadge = card.querySelector('.dynamic-spell-disabled-badge');
                if (dynamicBadge) dynamicBadge.remove();

                const badge = document.createElement('div');
                badge.className = 'spell-disabled-badge badge-condition dynamic-spell-disabled-badge';
                badge.title = 'Nécessite un autre allié en vie sur le terrain.';
                badge.innerHTML = '<span class="material-symbols-outlined">group_off</span>';
                card.appendChild(badge);
            }
        }
    }
};

window.openBuyModal = openBuyModal;

window.closeBuyModal = closeBuyModal;

export let combatWarningTimer = null;

export let combatCountdownInterval = null;

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
    if (pageState.currentSessionData && pageState.currentSessionData.availableSpells) {
        renderSpells(pageState.currentSessionData.availableSpells);
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

    if (pageState.currentSessionData && pageState.currentSessionData.availableSpells) {
        renderSpells(pageState.currentSessionData.availableSpells);
    }
}

window.renderOverlayInventory = function (containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    let totalWeight = 0;
    if (pageState.currentSessionData && pageState.currentSessionData.activeConsumables) {
        pageState.currentSessionData.activeConsumables.forEach(c => {
            if (c.weight !== undefined) {
                totalWeight += c.weight;
            } else if (c.baseWeight !== undefined) {
                totalWeight += c.baseWeight;
            }
        });
    }
    let maxWeight = 10;
    if (pageState.currentSessionData && pageState.currentSessionData.players) {
        maxWeight = 10 + 5 * pageState.currentSessionData.players.length;
    }

    if (list.parentElement) {
        const weightSpan = list.parentElement.querySelector('.inventory-weight-display');
        if (weightSpan) {
            weightSpan.textContent = `(${+Number(totalWeight).toFixed(1)} / ${maxWeight} kg)`;
            weightSpan.style.color = totalWeight > maxWeight ? '#ef4444' : '#94a3b8';
        }
    }

    // Add Gold reminder
    let goldAmount = 0;
    if (pageState.currentSessionData && pageState.currentSessionData.players && pageState.currentSessionData.players.length > 0) {
        const myPlayer = pageState.currentSessionData.players.find(p => p.ownerUsername === pageState.currentUsername) || pageState.currentSessionData.players[0];
        goldAmount = myPlayer.gold || 0;
    }
    list.innerHTML += `
        <div class="flex-center" style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 0.8rem; gap: 0.8rem; margin-bottom: 0.5rem;">
            <span class="material-symbols-outlined" style="font-size: 1.5rem; color: #f59e0b;">monetization_on</span>
            <div class="flex-1">
                <div class="text-sm text-white font-semibold" >Or du compte</div>
                <div style="color: #f59e0b; font-weight: 700; font-size: 1.1rem;">${goldAmount}</div>
            </div>
        </div>
    `;

    if (!pageState.currentSessionData || !pageState.currentSessionData.activeConsumables || pageState.currentSessionData.activeConsumables.length === 0) {
        list.innerHTML += `<div class="text-muted text-center text-sm" style="padding: 1rem;">Aucun objet dans l'inventaire.</div>`;
        return;
    }

    pageState.currentSessionData.activeConsumables.forEach(c => {
        const canConsume = Boolean(c.bonusHealthMax || c.bonusManaMax || c.consumableHpPercent || c.consumableManaPercent || c.consumableMissingHpPercent || c.consumableMissingManaPercent);
        const onClickAttr = canConsume ? `onclick="window.openConsumeModal(${c.id}, '${c.name.replace(/'/g, "\\'")}')"` : '';
        const cursorStyle = canConsume ? 'cursor: pointer;' : '';
        const hoverClass = canConsume ? 'consumable-hover' : '';
        const slotInfo = getSlotInfo(c);

        list.innerHTML += `
            <div class="${hoverClass} flex-center" ${onClickAttr} style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.8rem; gap: 0.8rem; margin-bottom: 0.5rem; transition: all 0.2s; ${cursorStyle}; position: relative;">
                <button class="destroy-item-btn" onclick="event.stopPropagation(); window.confirmDestroyItem(${c.id}, '${c.name.replace(/'/g, "\\'")}')" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: transform 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 14px; font-weight: bold;">close</span>
                </button>
                <span class="material-symbols-outlined" style="font-size: 1.5rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                <div class="flex-1">
                    <div class="text-sm" style="color: #f8fafc; font-weight: 600;">${c.name}</div>
                    <div class="text-xs text-muted" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-bottom: 4px;">
                        ${c.bonusHealthMax ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV">+${c.bonusHealthMax}<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">favorite</span></span>` : ''}
                        ${c.bonusManaMax ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana">+${c.bonusManaMax}<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">water_drop</span></span>` : ''}
                        ${c.consumableHpPercent ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV Max">+${c.consumableHpPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">favorite</span></span>` : ''}
                        ${c.consumableManaPercent ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana Max">+${c.consumableManaPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">water_drop</span></span>` : ''}
                        ${c.consumableMissingHpPercent ? `<span style="display:inline-flex; align-items:center; color:#f43f5e;" title="PV Manq">+${c.consumableMissingHpPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">healing</span></span>` : ''}
                        ${c.consumableMissingManaPercent ? `<span style="display:inline-flex; align-items:center; color:#a855f7;" title="Mana Manq">+${c.consumableMissingManaPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">cyclone</span></span>` : ''}
                    </div>
                    ${canConsume ? '<div class="font-medium" style="color: #0ea5e9; font-size: 0.75rem;">Cliquable pour utiliser</div>' : ''}
                </div>
            </div>
        `;
    });
};

window.openConsumeModal = function (consumableId, consumableName) {
    let btnContainerHtml = '';
    pageState.currentSessionData.players.forEach(p => {
        let hpColor = p.healthCurrent <= 0 ? '#ef4444' : (p.healthCurrent < p.healthMax ? '#f59e0b' : '#10b981');
        let mpColor = p.manaCurrent < p.manaMax ? '#3b82f6' : '#60a5fa';
        btnContainerHtml += `
            <button class="flex-between w-100" onclick="document.querySelector('app-modal').hide(false); window.confirmConsumeItem(${consumableId}, ${p.id})"
                ${p.healthCurrent <= 0 ? 'disabled' : ''}
                style="align-items: center; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.8rem; border-radius: 8px; cursor: ${p.healthCurrent <= 0 ? 'not-allowed' : 'pointer'}; opacity: ${p.healthCurrent <= 0 ? '0.5' : '1'}; transition: all 0.2s ease; margin-bottom: 8px; width: 100%;">
                <span style="font-weight: 600;">${p.name}</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
                    <span style="font-size: 0.85rem; color: ${hpColor};"><b>${p.healthCurrent}</b> / ${p.healthMax} PV</span>
                    <span style="font-size: 0.85rem; color: ${mpColor};"><b>${p.manaCurrent}</b> / ${p.manaMax} MP</span>
                </div>
            </button>
        `;
    });

    ui.showModal({
        title: 'Consommer un objet',
        body: `Qui doit utiliser <strong class="text-white">${consumableName}</strong> ?<br><br><div style="display: flex; flex-direction: column; width: 100%;">${btnContainerHtml}</div>`,
        icon: 'science',
        hideConfirm: true,
        cancelText: 'Fermer'
    });
};

window.confirmConsumeItem = async function (consumableId, characterId) {
    if (!pageState.sessionId) return;
    try {
        const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/consume/${consumableId}/target/${characterId}`, {
            method: 'POST'
        });
        if (res.ok) {
            pageState.currentSessionData = await res.json();
            ui.showNotif("Objet consommé avec succès !");
            updateUI(pageState.currentSessionData);
            if (typeof window.renderOverlayInventory === 'function') {
                window.renderOverlayInventory('eventOverlayInventoryList');
                window.renderOverlayInventory('combatVictoryInventoryList');
            }
        } else {
            const err = await res.text();
            ui.showNotif("Erreur: " + err, true);
        }
    } catch (e) {
        console.error(e);
        ui.showNotif("Erreur lors de la consommation.", true);
    }
};

window.confirmDestroyItem = function (consumableId, consumableName) {
    ui.showModal({
        title: 'Détruire un objet',
        body: `Êtes-vous sûr de vouloir détruire <strong class="text-white">${consumableName}</strong> ?<br><br>Cet objet sera <strong class="text-red-400">perdu définitivement</strong>.`,
        icon: 'delete',
        confirmText: 'Détruire',
        confirmStyle: 'danger',
        cancelText: 'Annuler',
        onConfirm: async () => {
            if (!pageState.sessionId) return;
            try {
                const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/consumable/${consumableId}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    pageState.currentSessionData = await res.json();
                    ui.showNotif("Objet détruit.");
                    updateUI(pageState.currentSessionData);
                    if (typeof window.renderOverlayInventory === 'function') {
                        window.renderOverlayInventory('eventOverlayInventoryList');
                        window.renderOverlayInventory('combatVictoryInventoryList');
                    }
                } else {
                    const err = await res.text();
                    ui.showNotif("Erreur: " + err, true);
                }
            } catch (e) {
                console.error(e);
                ui.showNotif("Erreur lors de la destruction de l'objet.", true);
            }
        }
    });
};

window.toggleMusic = function () {
    if (!window.dungeonMusic) return;
    const btn = document.getElementById('musicToggleBtn');
    if (window.dungeonMusic.muted) {
        window.dungeonMusic.muted = false;
        if (btn) {
            btn.textContent = 'volume_up';
            btn.classList.add('text-success');
        }
        localStorage.setItem('grimoire_music_muted', 'false');
    } else {
        window.dungeonMusic.muted = true;
        if (btn) {
            btn.textContent = 'volume_off';
            btn.classList.add('text-error');
        }
        localStorage.setItem('grimoire_music_muted', 'true');
    }
};

window.changeMusicVolume = function (value) {
    if (window.dungeonMusic) {
        window.dungeonMusic.volume = value / 100;
    }
    localStorage.setItem('grimoire_music_volume', value);
};