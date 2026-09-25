import { shakeStyle } from './combat-utils.js';
import { initMultiSSE } from './combat-socket.js';
import { updateUI, renderSpells } from './combat-ui.js';
import { currentSpellsTab, setCurrentSpellsTab, initiateCombatCast, confirmCombatCast, cancelCombatCast, doAction } from './combat-spells.js';
import { endTurn, nextRoom, openStrangeDoor, acceptAlteration, useRope, buyMerchantItem, openBuyModal, closeBuyModal, addLootedConsumable, openChest } from './combat-actions.js';
import { loadAnomaliesCombat, resumeCombat, startCombat, fetchCombatEquipments } from './combat-init.js';
import * as ui from '../ui.js';
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
    selectedItemType: null,
    combatEquipments: {},
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
    
    // Timers
    combatWarningTimer: null,
    combatCountdownInterval: null,
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
        if (isProc) {
            btn.disabled = true;
            btn.classList.add('disabled');
        } else {
            if (!btn.classList.contains('waiting-ready')) {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        }
    });
}

window.showGlobalTooltip = ui.showGlobalTooltip;
window.hideGlobalTooltip = ui.hideGlobalTooltip;

window.doAction = doAction;
window.endTurn = endTurn;
window.nextRoom = nextRoom;
window.openStrangeDoor = openStrangeDoor;
window.openChest = openChest;
window.acceptAlteration = acceptAlteration;
window.useRope = useRope;
window.addLootedConsumable = addLootedConsumable;
window.buyMerchantItem = buyMerchantItem;
window.initiateCombatCast = initiateCombatCast;
window.confirmCombatCast = confirmCombatCast;
window.cancelCombatCast = cancelCombatCast;

window.promptFlee = function () {
    console.log("promptFlee called", pageState.sessionId, pageState.currentSessionData);
    if (!pageState.sessionId || !pageState.currentSessionData || pageState.currentSessionData.finished) {
        console.log("promptFlee aborted due to missing data or finished session");
        return;
    }
    
    const roomsCount = Math.max(1, pageState.currentSessionData.totalRooms || 1);
    const nbHeroes = Math.max(1, (pageState.currentSessionData.players || []).length);
    const xpLossPerHero = Math.floor((10 * roomsCount) / nbHeroes);
    const goldLoss = 10 * roomsCount;
    
    const penaltyHtml = `Perte d'xp et Or : <span style="color: #f87171;">-${xpLossPerHero} XP normal</span> (par perso) et <span class="text-warning">-${goldLoss} Or</span> (au total).`;

    ui.showModal({
        title: 'Fuir le combat ?',
        body: `Êtes-vous sûr de vouloir fuir ?<br><br><span id="fleePenaltyText" class="text-sm text-error">${penaltyHtml}</span>`,
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

        // Charger les équipements pour le multijoueur (initialisation)
        await fetchCombatEquipments(directSessionId);

        updateUI(data);
        return;
    }

    // ─── Mode solo classique
    let savedCombatId = localStorage.getItem('activeCombatId');
    
    if (!savedCombatId && !urlParams.get('dungeonId') && !urlParams.get('multiId')) {
        // If we have no local session and no startup parameters, we might have been redirected here.
        // Let's ask the server if we have an ongoing combat session.
        try {
            const res = await window.globalFetch('/api/pve/combat/current');
            if (res.ok) {
                const data = await res.json();
                if (data && data.sessionId) {
                    savedCombatId = data.sessionId;
                    localStorage.setItem('activeCombatId', savedCombatId);
                    if (data.isMulti) {
                        window.location.href = `/combat.html?sessionId=${data.sessionId}&multiId=${data.multiId}`;
                        return;
                    }
                }
            }
        } catch(e) {
            console.warn("Impossible de récupérer la session de combat active depuis le serveur", e);
        }
    }

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

window.switchSpellTab = function (tab) {
    setCurrentSpellsTab(tab);
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

window.toggleSidePanel = function(overlayPrefix, tabName) {
    const wrapper = document.getElementById(`${overlayPrefix}SidePanelWrapper`);
    if (!wrapper) return;

    const invContent = document.getElementById(`${overlayPrefix}InventoryContent`);
    const mapContent = document.getElementById(`${overlayPrefix}MapContent`);
    const invBtn = document.getElementById(`${overlayPrefix}InventoryTabBtn`);
    const mapBtn = document.getElementById(`${overlayPrefix}MapTabBtn`);

    const isWrapperClosed = wrapper.classList.contains('-translate-x-full');
    
    if (tabName === 'inventory') {
        if (!invContent.classList.contains('hidden') && !isWrapperClosed) {
            // Already on inventory and open -> close it
            wrapper.classList.add('-translate-x-full');
        } else {
            // Switch to inventory and open
            invContent.classList.remove('hidden');
            mapContent.classList.add('hidden');
            invBtn.classList.remove('opacity-50');
            invBtn.classList.add('opacity-100');
            mapBtn.classList.add('opacity-50');
            mapBtn.classList.remove('opacity-100');
            wrapper.classList.remove('-translate-x-full');
        }
    } else if (tabName === 'map') {
        if (!mapContent.classList.contains('hidden') && !isWrapperClosed) {
            // Already on map and open -> close it
            wrapper.classList.add('-translate-x-full');
        } else {
            // Switch to map and open
            mapContent.classList.remove('hidden');
            invContent.classList.add('hidden');
            mapBtn.classList.remove('opacity-50');
            mapBtn.classList.add('opacity-100');
            invBtn.classList.add('opacity-50');
            invBtn.classList.remove('opacity-100');
            wrapper.classList.remove('-translate-x-full');
        }
    }
};

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
        const wrapper = list.closest('.absolute.inset-y-0.left-0');
        if (wrapper && !wrapper.classList.contains('-translate-x-full')) {
            const prefix = containerId.includes('event') ? 'event' : 'combatVictory';
            const invContent = document.getElementById(`${prefix}InventoryContent`);
            if (invContent && !invContent.classList.contains('hidden')) {
                wrapper.classList.add('-translate-x-full');
            }
        }
        return;
    }

    // Automatically open the inventory if there are consumables
    const wrapper = list.closest('.absolute.inset-y-0.left-0');
    if (wrapper) {
        const prefix = containerId.includes('event') ? 'event' : (containerId.includes('combatMain') ? 'combatMain' : 'combatVictory');
        const invContent = document.getElementById(`${prefix}InventoryContent`);
        // Only auto-open if it is closed, and never auto-open the combatMain wrapper (during combat)
        if (wrapper.classList.contains('-translate-x-full') && prefix !== 'combatMain') {
            if (typeof window.toggleSidePanel === 'function') {
                window.toggleSidePanel(prefix, 'inventory');
            } else {
                wrapper.classList.remove('-translate-x-full');
            }
        }
    }

    window.combatConsumeSelections = window.combatConsumeSelections || {};
    window.incrementConsumeSelection = function(name, maxQty, cId) {
        if (!window.combatConsumeSelections[name]) window.combatConsumeSelections[name] = 0;
        if (window.combatConsumeSelections[name] < maxQty) {
            window.combatConsumeSelections[name]++;
            window.renderOverlayInventory(cId);
        }
    };
    window.decrementConsumeSelection = function(name, cId) {
        if (!window.combatConsumeSelections[name]) window.combatConsumeSelections[name] = 0;
        if (window.combatConsumeSelections[name] > 0) {
            window.combatConsumeSelections[name]--;
            window.renderOverlayInventory(cId);
        }
    };
    window.openGroupedConsumeModal = function(name) {
        const qty = window.combatConsumeSelections[name] || 0;
        if (qty <= 0) return;
        const groupItems = pageState.currentSessionData.activeConsumables.filter(c => c.name === name);
        if (!groupItems.length) return;
        const selectedIds = groupItems.slice(0, qty).map(c => c.id);
        window.openConsumeModal(name, selectedIds);
    };

    const groupedConsumables = {};
    pageState.currentSessionData.activeConsumables.forEach(c => {
        if (!groupedConsumables[c.name]) {
            groupedConsumables[c.name] = { base: c, ids: [] };
        }
        groupedConsumables[c.name].ids.push(c.id);
    });

    const isCombat = pageState.currentSessionData && 
                     (pageState.currentSessionData.currentRoom.type === 'COMBAT' || pageState.currentSessionData.currentRoom.type === 'BOSS') && 
                     !pageState.currentSessionData.finished &&
                     !(pageState.currentSessionData.enemies && pageState.currentSessionData.enemies.every(e => e.dead || e.currentHp <= 0));

    Object.values(groupedConsumables).forEach(group => {
        const c = group.base;
        const total = group.ids.length;
        const selCount = window.combatConsumeSelections[c.name] || 0;
        
        const isConsumableEffect = Boolean(c.bonusHealthMax || c.bonusManaMax || c.consumableHpPercent || c.consumableManaPercent || c.consumableMissingHpPercent || c.consumableMissingManaPercent);
        const canConsume = !isCombat && isConsumableEffect;
        
        const onClickAttr = canConsume ? `onclick="window.incrementConsumeSelection('${c.name.replace(/'/g, "\\'")}', ${total}, '${containerId}')"` : '';
        const cursorStyle = canConsume ? 'cursor: pointer;' : '';
        const hoverClass = canConsume ? 'consumable-hover' : '';
        const slotInfo = getSlotInfo(c);

        let badgeHtml = '';
        if (total > 1 || selCount > 0) {
            badgeHtml = `<div class="flex-center text-xs absolute font-bold ${selCount > 0 ? 'text-emerald-400' : 'text-muted'} shadow-sm" style="bottom: -5px; right: -5px; background: rgba(15,23,42,0.9); padding: 3px 6px; border-radius: 6px; border: 1px solid #334155; z-index: 5;">${selCount}/${total}</div>`;
        }

        let actionHtml = '';
        if (selCount > 0 && !isCombat) {
            actionHtml = `<div class="flex items-center gap-2 mt-3 w-full" style="animation: popIn 0.2s ease-out;">
                <button onclick="event.stopPropagation(); window.decrementConsumeSelection('${c.name.replace(/'/g, "\\'")}', '${containerId}')" 
                    class="flex-center" 
                    style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;" 
                    onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" 
                    onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">remove</span>
                </button>
                <button onclick="event.stopPropagation(); window.openGroupedConsumeModal('${c.name.replace(/'/g, "\\'")}')" 
                    class="flex-1 flex-center gap-1" 
                    style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.4rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;"
                    onmouseover="this.style.background='rgba(16, 185, 129, 0.2)'"
                    onmouseout="this.style.background='rgba(16, 185, 129, 0.1)'">
                    <span class="material-symbols-outlined" style="font-size: 1.2rem;">science</span> Consommer (${selCount})
                </button>
            </div>`;
        }

        const destroyIds = selCount > 0 ? group.ids.slice(0, selCount) : [group.ids[0]];
        const destroyIdsJson = JSON.stringify(destroyIds);
        
        let destroyBtnHtml = '';
        if (!isCombat) {
            destroyBtnHtml = `<button class="destroy-item-btn" onclick="event.stopPropagation(); window.confirmDestroyItem(${destroyIdsJson}, '${c.name.replace(/'/g, "\\'")}')" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: transform 0.2s;" title="Détruire (${destroyIds.length}x)">
                    <span class="material-symbols-outlined" style="font-size: 14px; font-weight: bold;">close</span>
                </button>`;
        }

        let combatLockHtml = '';
        if (isCombat) {
            combatLockHtml = '<div class="font-medium" style="color: #64748b; font-size: 0.75rem;"><span class="material-symbols-outlined" style="font-size:0.85rem; vertical-align:-1px;">lock</span> Utilisable hors combat</div>';
        }

        list.innerHTML += `
            <div class="${hoverClass} flex-center" ${onClickAttr} style="background: rgba(30, 41, 59, 0.5); border: ${selCount > 0 ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)'}; border-radius: 8px; padding: 0.8rem; gap: 0.8rem; margin-bottom: 0.5rem; transition: all 0.2s; ${cursorStyle}; position: relative;">
                ${destroyBtnHtml}
                ${badgeHtml}
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                    <span class="material-symbols-outlined" style="font-size: 1.5rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm truncate" style="color: #f8fafc; font-weight: 600;">${c.name}</div>
                    <div class="text-xs text-muted" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-bottom: 4px;">
                        ${c.bonusHealthMax ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV">+${c.bonusHealthMax}<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">favorite</span></span>` : ''}
                        ${c.bonusManaMax ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana">+${c.bonusManaMax}<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">water_drop</span></span>` : ''}
                        ${c.consumableHpPercent ? `<span style="display:inline-flex; align-items:center; color:#ec4899;" title="PV Max">+${c.consumableHpPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">favorite</span></span>` : ''}
                        ${c.consumableManaPercent ? `<span style="display:inline-flex; align-items:center; color:#38bdf8;" title="Mana Max">+${c.consumableManaPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">water_drop</span></span>` : ''}
                        ${c.consumableMissingHpPercent ? `<span style="display:inline-flex; align-items:center; color:#f43f5e;" title="PV Manq">+${c.consumableMissingHpPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">healing</span></span>` : ''}
                        ${c.consumableMissingManaPercent ? `<span style="display:inline-flex; align-items:center; color:#a855f7;" title="Mana Manq">+${c.consumableMissingManaPercent}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">cyclone</span></span>` : ''}
                        ${c.consumableCategory === 'CLE' && c.specialEffectValue ? `<span style="display:inline-flex; align-items:center; color:#fbbf24;" title="Bonus Butin">+${c.specialEffectValue}%<span class="material-symbols-outlined" style="font-size:0.85rem; margin-left:2px;">diamond</span></span>` : ''}
                    </div>
                    ${actionHtml || (canConsume ? '<div class="font-medium" style="color: #0ea5e9; font-size: 0.75rem;">Cliquer pour préparer</div>' : combatLockHtml)}
                </div>
            </div>
        `;
    });
};

window.renderOverlayMap = function (containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    if (!pageState.currentSessionData || !pageState.currentSessionData.salles) {
        list.innerHTML = `<div class="text-muted text-center text-sm" style="padding: 1rem;">Carte indisponible.</div>`;
        return;
    }

    const salles = pageState.currentSessionData.salles;
    const currentIndex = pageState.currentSessionData.currentRoomIndex || 0;

    let html = '<div class="relative pl-4 border-l-2 border-slate-700 ml-4 mt-2">';
    
    salles.forEach((s, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;
        
        let icon = 'help';
        let color = '#94a3b8'; // default
        let label = 'Étape ' + (index + 1);
        
        if (s.type === 'COMBAT') {
            icon = 'swords';
            color = '#ef4444'; // red
            label += ' : Combat';
        } else if (s.type === 'BOSS') {
            icon = 'skull';
            color = '#dc2626'; // darker red
            label += ' : Boss';
        } else if (s.type === 'TREASURE') {
            icon = 'lock';
            color = '#f59e0b'; // amber
            label += ' : Trésor';
        } else if (s.type === 'EVENT') {
            icon = 'auto_awesome';
            color = '#a855f7'; // purple
            label += ' : Événement';
        }

        let dotColor = isCurrent ? '#38bdf8' : (isPast ? '#10b981' : '#475569');
        let opacity = isPast ? '0.5' : (isFuture ? '0.7' : '1');
        let fontWeight = isCurrent ? '700' : '500';
        let borderColor = isCurrent ? 'border-sky-400' : 'border-transparent';
        
        html += `
            <div class="relative mb-6" style="opacity: ${opacity};">
                <div class="absolute -left-[1.35rem] top-2 w-4 h-4 rounded-full" style="background: ${dotColor}; box-shadow: 0 0 8px ${dotColor}80;"></div>
                <div class="flex items-center gap-3 p-2 rounded-lg border ${borderColor}" style="background: rgba(30, 41, 59, 0.5);">
                    <span class="material-symbols-outlined" style="color: ${color}; font-size: 1.5rem;">${icon}</span>
                    <div class="flex-1">
                        <div style="color: ${isCurrent ? '#f8fafc' : '#cbd5e1'}; font-weight: ${fontWeight}; font-size: 0.95rem;">${label}</div>
                        ${isCurrent ? `<div class="text-sky-400 text-xs mt-1">Vous êtes ici</div>` : ''}
                        ${isPast ? `<div class="text-emerald-400 text-xs mt-1">Terminé</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    list.innerHTML = html;
};

window.openConsumeModal = function (consumableName, consumableIds) {
    const qty = consumableIds.length;
    const c = pageState.currentSessionData.activeConsumables.find(item => item.id === consumableIds[0]);
    let selectedPlayerId = null;

    const renderPlayers = () => {
        let btnContainerHtml = '';
        pageState.currentSessionData.players.forEach(p => {
            let previewHp = p.healthCurrent;
            let previewMp = p.manaCurrent;
            
            let hpGain = 0;
            let mpGain = 0;
            
            if (c && selectedPlayerId === p.id) {
                hpGain = ((c.bonusHealthMax || 0) 
                    + (c.consumableHpPercent ? Math.floor(p.healthMax * c.consumableHpPercent / 100) : 0)
                    + (c.consumableMissingHpPercent ? Math.floor((p.healthMax - p.healthCurrent) * c.consumableMissingHpPercent / 100) : 0)) * qty;
                    
                mpGain = ((c.bonusManaMax || 0)
                    + (c.consumableManaPercent ? Math.floor(p.manaMax * c.consumableManaPercent / 100) : 0)
                    + (c.consumableMissingManaPercent ? Math.floor((p.manaMax - p.manaCurrent) * c.consumableMissingManaPercent / 100) : 0)) * qty;
                
                previewHp = Math.min(p.healthMax, Math.max(0, p.healthCurrent + hpGain));
                previewMp = Math.min(p.manaMax, Math.max(0, p.manaCurrent + mpGain));
            }

            let hpColor = p.healthCurrent <= 0 ? '#ef4444' : (p.healthCurrent < p.healthMax ? '#f59e0b' : '#10b981');
            let mpColor = p.manaCurrent < p.manaMax ? '#3b82f6' : '#60a5fa';

            let hpGainHtml = '';
            let mpGainHtml = '';

            if (selectedPlayerId === p.id) {
                if (hpGain > 0) {
                    hpColor = '#f472b6'; // rose
                    hpGainHtml = ` <span style="font-size: 0.75rem; opacity: 0.9;">(+${hpGain})</span>`;
                } else if (hpGain < 0) {
                    hpColor = '#ff2a2a'; // rouge agressif
                    hpGainHtml = ` <span style="font-size: 0.75rem; opacity: 0.9;">(${hpGain})</span>`;
                }
                
                if (mpGain > 0) {
                    mpColor = '#38bdf8'; // bleu clair
                    mpGainHtml = ` <span style="font-size: 0.75rem; opacity: 0.9;">(+${mpGain})</span>`;
                } else if (mpGain < 0) {
                    mpColor = '#b026ff'; // mauve agressif (violet vif)
                    mpGainHtml = ` <span style="font-size: 0.75rem; opacity: 0.9;">(${mpGain})</span>`;
                }
            }
            
            const isSelected = selectedPlayerId === p.id;
            const borderStyle = isSelected ? 'border: 1px solid rgba(244, 114, 182, 0.5); background: rgba(244, 114, 182, 0.1);' : 'border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.8);';

            btnContainerHtml += `
                <button class="flex-between w-100" onclick="window.selectConsumeTarget(${p.id})"
                    ${p.healthCurrent <= 0 ? 'disabled' : ''}
                    style="align-items: center; ${borderStyle} color: #fff; padding: 0.8rem; border-radius: 8px; cursor: ${p.healthCurrent <= 0 ? 'not-allowed' : 'pointer'}; opacity: ${p.healthCurrent <= 0 ? '0.5' : '1'}; transition: all 0.2s ease; margin-bottom: 8px; width: 100%;">
                    <span style="font-weight: 600;">${p.name}</span>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
                        <span style="font-size: 0.85rem; color: ${hpColor}; transition: color 0.3s;"><b>${previewHp}</b>${hpGainHtml} / ${p.healthMax} PV</span>
                        <span style="font-size: 0.85rem; color: ${mpColor}; transition: color 0.3s;"><b>${previewMp}</b>${mpGainHtml} / ${p.manaMax} MP</span>
                    </div>
                </button>
            `;
        });
        return btnContainerHtml;
    };

    window.selectConsumeTarget = function(playerId) {
        selectedPlayerId = playerId;
        const listContainer = document.getElementById('consumePlayersList');
        if (listContainer) {
            listContainer.innerHTML = renderPlayers();
        }
        
        const confirmBtn = document.getElementById('appModalConfirmBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        }
    };

    ui.showModal({
        title: 'Consommer un objet',
        body: `Qui doit utiliser <strong class="text-white">${qty}x ${consumableName}</strong> ?<br><br><div id="consumePlayersList" style="display: flex; flex-direction: column; width: 100%;">${renderPlayers()}</div>`,
        icon: 'science',
        hideConfirm: false,
        confirmText: 'Confirmer',
        cancelText: 'Fermer',
        onConfirm: () => {
            if (selectedPlayerId) {
                window.confirmConsumeItem(consumableIds, selectedPlayerId, consumableName);
            }
        }
    });

    setTimeout(() => {
        const confirmBtn = document.getElementById('appModalConfirmBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
    }, 10);
};

window.confirmConsumeItem = async function (consumableIds, characterId, consumableName) {
    if (!pageState.sessionId) return;
    try {
        let lastRes = null;
        for (const cId of consumableIds) {
            lastRes = await globalFetch(`/api/pve/combat/${pageState.sessionId}/consume/${cId}/target/${characterId}`, {
                method: 'POST'
            });
            if (!lastRes.ok) {
                const err = await lastRes.text();
                ui.showNotif("Erreur: " + err, true);
                return;
            }
        }
        if (lastRes && lastRes.ok) {
            pageState.currentSessionData = await lastRes.json();
            ui.showNotif(`${consumableIds.length}x ${consumableName} consommé(s) avec succès !`);
            
            if (window.combatConsumeSelections) {
                window.combatConsumeSelections[consumableName] = 0;
            }
            
            updateUI(pageState.currentSessionData);
            if (typeof window.renderOverlayInventory === 'function') {
                window.renderOverlayInventory('eventOverlayInventoryList');
                window.renderOverlayInventory('combatVictoryInventoryList');
                window.renderOverlayInventory('combatMainInventoryList');
            }
            if (typeof window.renderOverlayMap === 'function') {
                window.renderOverlayMap('eventMapList');
                window.renderOverlayMap('combatVictoryMapList');
                window.renderOverlayMap('combatMainMapList');
            }
        }
    } catch (e) {
        console.error(e);
        ui.showNotif("Erreur lors de la consommation.", true);
    }
};

window.confirmDestroyItem = function (consumableIds, consumableName) {
    const qty = consumableIds.length;
    ui.showModal({
        title: 'Détruire un objet',
        body: `Êtes-vous sûr de vouloir détruire <strong class="text-white">${qty}x ${consumableName}</strong> ?<br><br>Cet objet sera <strong class="text-red-400">perdu définitivement</strong>.`,
        icon: 'delete',
        confirmText: 'Détruire',
        confirmStyle: 'danger',
        cancelText: 'Annuler',
        onConfirm: async () => {
            if (!pageState.sessionId) return;
            try {
                let lastRes = null;
                for (const cId of consumableIds) {
                    lastRes = await globalFetch(`/api/pve/combat/${pageState.sessionId}/consumable/${cId}`, {
                        method: 'DELETE'
                    });
                    if (!lastRes.ok) {
                        const err = await lastRes.text();
                        ui.showNotif("Erreur: " + err, true);
                        return;
                    }
                }
                if (lastRes && lastRes.ok) {
                    pageState.currentSessionData = await lastRes.json();
                    ui.showNotif(`${qty}x ${consumableName} détruit(s).`);
                    
                    if (window.combatConsumeSelections) {
                        window.combatConsumeSelections[consumableName] = 0;
                    }
                    
                    updateUI(pageState.currentSessionData);
                    if (typeof window.renderOverlayInventory === 'function') {
                        window.renderOverlayInventory('eventOverlayInventoryList');
                        window.renderOverlayInventory('combatVictoryInventoryList');
                    }
                    if (typeof window.renderOverlayMap === 'function') {
                        window.renderOverlayMap('eventMapList');
                        window.renderOverlayMap('combatVictoryMapList');
                    }
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

window.showHeroEquipmentTooltip = function (el, characterId) {
    const tooltip = document.getElementById('heroEquipmentTooltip');
    const content = document.getElementById('heroEquipmentTooltipContent');
    if (!tooltip || !content) return;

    let eqs = pageState.combatEquipments[characterId];
    if (!eqs || eqs.length === 0) {
        content.innerHTML = '<div style="color:#cbd5e1; font-size:0.9rem; text-align:center;">Aucun équipement</div>';
    } else {
        let html = '<div class="equip-slots-grid" style="width: 100%; min-width: 500px;">';

        const slots = Object.keys(window.SLOT_LABELS || {}).filter(s => s !== 'CONSOMMABLE' && s !== 'ANOMALIE' && s !== 'ARME_DEUX_MAINS' && s !== 'ARME' && s !== 'ANNEAU');

        // If SLOT_LABELS isn't loaded for some reason, fallback to basic list
        if (slots.length === 0) {
            slots.push('CASQUE', 'PLASTRON', 'ARME_GAUCHE', 'ANNEAU_GAUCHE', 'ANNEAU_DROIT', 'ARME_DROITE', 'BOTTES', 'CAPE');
        }

        slots.forEach(slotKey => {
            const slotInfo = window.SLOT_LABELS && window.SLOT_LABELS[slotKey] ? window.SLOT_LABELS[slotKey] : { icon: 'help', color: '#94a3b8', label: slotKey };

            let equipped = eqs.find(e => e.slot === slotKey);
            const twoHanded = eqs.find(e => e.slot === 'ARME_DEUX_MAINS');

            if (slotKey === 'ARME_GAUCHE' && twoHanded) {
                equipped = twoHanded;
            }
            if (slotKey === 'ARME_DROITE' && twoHanded) {
                equipped = twoHanded;
            }

            if (equipped) {
                const rarityName = typeof getRarityName === 'function' ? getRarityName(equipped.rarity) : '';
                const rarityClass = rarityName ? `rarity-${rarityName}` : '';

                let statsChips = '';
                if (typeof STAT_DEFS !== 'undefined') {
                    statsChips = STAT_DEFS
                        .filter(s => equipped[s.key] && equipped[s.key] !== 0)
                        .map(s => {
                            const val = equipped[s.key];
                            const sign = val > 0 ? '+' : '';
                            const isMalus = val < 0;
                            const suffix = s.isPercent ? '%' : '';
                            return `<span class="eq-stat-mini ${isMalus ? 'malus' : ''}" title="${s.label}"><span class="material-symbols-outlined text-xs" style="color:${isMalus ? '#ef4444' : s.color};">${s.icon}</span>${sign}${val}${suffix}</span>`;
                        }).join('');
                } else {
                    let statsHtml = '';
                    if (equipped.power > 0) statsHtml += `<span style="color:#a855f7;">${equipped.power} Pui</span> `;
                    if (equipped.strength > 0) statsHtml += `<span style="color:#f43f5e;">${equipped.strength} For</span> `;
                    if (equipped.armor > 0) statsHtml += `<span style="color:#3b82f6;">${equipped.armor} Arm</span> `;
                    if (equipped.resistance > 0) statsHtml += `<span style="color:#10b981;">${equipped.resistance} Rés</span> `;
                    if (equipped.speed > 0) statsHtml += `<span style="color:#eab308;">${equipped.speed} Vit</span> `;
                    if (equipped.crit > 0) statsHtml += `<span style="color:#ef4444;">${equipped.crit}% Crit</span> `;
                    statsChips = statsHtml;
                }

                let specialEffectHtml = '';
                if (equipped.specialEffect && equipped.specialEffect !== 'NONE' && equipped.specialEffect !== 'AUCUN') {
                    const label = window.EFFECT_LABELS ? (window.EFFECT_LABELS[equipped.specialEffect] || equipped.specialEffect) : equipped.specialEffect;
                    const isCursed = equipped.specialEffect.startsWith('CURSED_');
                    const icon = isCursed ? 'skull' : 'auto_awesome';
                    const color = isCursed ? '#9b2d2d' : '#c084fc';
                    const bg = isCursed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(168, 85, 247, 0.1)';

                    specialEffectHtml = `<div style="margin-top: 0.3rem; font-size: 0.7rem; color: ${color}; background: ${bg}; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem; border: ${isCursed ? '1px solid rgba(156, 163, 175, 0.2)' : 'none'};">
                        <span class="material-symbols-outlined text-xs">${icon}</span>
                        ${label} : ${equipped.specialEffectValue || ''} ${window.getEffectInfoIconHtml ? window.getEffectInfoIconHtml(equipped.specialEffect) : ''}
                    </div>`;
                }

                html += `
                    <div class="equip-slot-card equipped" data-slot="${slotKey}">
                        <div class="equip-slot-header">
                            <span class="equip-slot-label">
                                <span class="material-symbols-outlined text-lg ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                ${slotInfo.label || slotKey}
                            </span>
                        </div>
                        <div class="equip-slot-item-name ${rarityClass}">${equipped.name}</div>
                        <div class="equip-slot-stats">
                            ${statsChips || '<span class="opacity-40">Aucun bonus</span>'}
                            ${specialEffectHtml}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="equip-slot-card empty" data-slot="${slotKey}">
                        <div class="equip-slot-header" style="justify-content: center; opacity: 0.5;">
                            <span class="equip-slot-label">
                                <span class="material-symbols-outlined text-lg ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                ${slotInfo.label || slotKey}
                            </span>
                        </div>
                    </div>
                `;
            }
        });
        html += '</div>';
        content.innerHTML = html;
    }

    const rect = el.getBoundingClientRect();
    tooltip.style.display = 'block';

    // Position tooltip to the right or left of the avatar depending on screen space
    let top = rect.top + window.scrollY;
    let left = rect.right + 10;

    if (left + 750 > window.innerWidth) {
        left = rect.left - 760;
    }

    // Ensure left is not negative
    if (left < 10) {
        left = 10;
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
};

window.hideHeroEquipmentTooltip = function () {
    const tooltip = document.getElementById('heroEquipmentTooltip');
    if (tooltip) tooltip.style.display = 'none';
};
