import { showFloatingTextOnElement } from './combat-utils.js';
import { pageState } from './combat-state.js';
import { updateUI } from './combat-ui.js';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../filters.js';


export function processNewDeathLogs(combatLogs) {
    if (!combatLogs) return;
    if (combatLogs.length < pageState.lastCombatLogCount) {
        pageState.lastCombatLogCount = 0; // Combat was reset
    }
    for (let i = pageState.lastCombatLogCount; i < combatLogs.length; i++) {
        const log = combatLogs[i];
        const match = log.match(/☠️ (.*?) succombe à ses blessures et perd (\d+) XP/);
        if (match) {
            const heroName = match[1];
            const xpLost = match[2];
            const heroCards = document.querySelectorAll('.fighter-player');
            heroCards.forEach(card => {
                if (card.innerHTML.includes(heroName)) {
                    showFloatingTextOnElement(card, `-${xpLost} XP`, '#f87171');
                }
            });
        }
    }
    pageState.lastCombatLogCount = combatLogs.length;
}

export let _multiSSE = null;

export function initMultiSSE(sessionId) {
    if (_multiSSE) { _multiSSE.close(); _multiSSE = null; }
    _multiSSE = new EventSource(`/api/pve/combat/${sessionId}/events`);

    _multiSSE.addEventListener('combat-update', (e) => {
        try {
            const data = JSON.parse(e.data);
            // Ne pas re-renderer si on est en train de traiter une action locale
            if (!pageState.isProcessing) {
                updateUI(data);
            }
        } catch (err) {
            console.error('[SSE] parse error', err);
        }
    });

    _multiSSE.onerror = () => {
        // La connexion SSE se reconnecte automatiquement — pas d'alerte
    };
}

export function updateMultiTurnBanner(data) {
    const banner = document.getElementById('multiTurnBanner');
    if (!banner) return;

    if (!data || !data.multi || data.finished) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'flex';

    const isCombatRoom = data.currentRoom && (data.currentRoom.type === 'COMBAT' || data.currentRoom.type === 'BOSS');
    const allEnemiesDead = !data.enemies || data.enemies.length === 0 || data.enemies.every(e => e.dead || e.currentHp <= 0);

    if (!isCombatRoom || allEnemiesDead) {
        banner.innerHTML = `<span class="material-symbols-outlined text-[#a855f7]">explore</span>
            <span class="text-[#a855f7] font-semibold">Exploration en cours</span>`;
        setMultiActionsEnabled(true);
        return;
    }

    const activePlayer = data.activePlayer;
    const ownerUsername = activePlayer?.ownerUsername || null;
    const isMyTurn = ownerUsername === pageState.currentUsername;
    const isEnemyTurn = !data.turnOrder?.[data.currentTurnIndex]?.player;

    if (isEnemyTurn) {
        banner.innerHTML = `<span class="material-symbols-outlined text-[#f87171]">swords</span>
            <span class="text-[#f87171] font-semibold">Tour ennemi</span>`;
        setMultiActionsEnabled(false);
    } else if (isMyTurn) {
        banner.innerHTML = `<span class="material-symbols-outlined text-[#4ade80]">person</span>
            <span class="text-[#4ade80] font-semibold">👤 Votre tour — ${activePlayer?.name || ''}</span>`;
        setMultiActionsEnabled(true);
    } else {
        const otherName = ownerUsername || 'Allié';
        banner.innerHTML = `<span class="material-symbols-outlined" style="color:#38bdf8;">hourglass_top</span>
            <span style="color:#94a3b8;">⏳ Tour de <strong style="color:#38bdf8;">${activePlayer?.name || otherName}</strong> (${otherName})...</span>`;
        setMultiActionsEnabled(false);
    }
}

export function setMultiActionsEnabled(enabled) {
    const selectors = ['#btnAttack', '#btnEndTurn', '.combat-spell-card', '.action-btn'];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (enabled) {
                el.classList.remove('multi-disabled');
                el.style.pointerEvents = '';
                el.style.opacity = '';
            } else {
                el.classList.add('multi-disabled');
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.35';
            }
        });
    });
}