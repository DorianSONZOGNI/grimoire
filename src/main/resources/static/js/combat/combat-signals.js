import { pageState } from './combat-state.js';
import { fetchCombatSignalsConfig, postCombatSignal } from '../services/api.js';

let signalsConfig = null;
let signalsConfigPromise = null;
const processedSignalIds = new Set();

/**
 * Charge et met en cache la configuration des signaux (SSOT backend).
 */
export async function getSignalsConfig() {
    if (signalsConfig) return signalsConfig;
    if (signalsConfigPromise) return signalsConfigPromise;
    signalsConfigPromise = (async () => {
        try {
            signalsConfig = await fetchCombatSignalsConfig();
            return signalsConfig;
        } catch (e) {
            console.warn('[Signals] Impossible de charger la configuration:', e);
            return null;
        }
    })();
    return signalsConfigPromise;
}

/**
 * Synthèse audio Web Audio API pour les retours sonores sans latence.
 */
function playSignalAudio(actionName) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        if (actionName === 'ATTACK') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1760, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (actionName === 'FEAR') {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(311.13, now + 0.12);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (actionName === 'HEAL' || actionName === 'SHIELD' || actionName === 'BUFF') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'sine';
            const baseFreq = actionName === 'HEAL' ? 523.25 : (actionName === 'SHIELD' ? 440 : 659.25);
            osc1.frequency.setValueAtTime(baseFreq, now);
            osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.2);
            osc2.frequency.setValueAtTime(baseFreq * 1.25, now);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain);
            osc2.connect(gain);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
        } else {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (_) {}
}

/**
 * Envoie un signal au serveur backend.
 */
export async function dispatchSignal(actionName, targetIndex, targetName) {
    const sId = pageState.sessionId;
    if (!sId) return;

    try {
        const payload = {
            action: actionName,
            targetIndex: targetIndex !== undefined && targetIndex !== null ? targetIndex : null,
            targetName: targetName || null
        };
        const result = await postCombatSignal(sId, payload);
        if (result && result.id) {
            handleSignalReceived(result);
        }
    } catch (err) {
        console.error('[Signals] Erreur envoi signal:', err);
        if (typeof window.showNotif !== 'undefined') {
            window.showNotif(err.message || 'Erreur lors du signal.', true);
        }
    }
}

/**
 * Traite la réception d'un signal (provenant du SSE ou en retour direct).
 */
export function handleSignalReceived(signal) {
    if (!signal || !signal.id) return;
    if (processedSignalIds.has(signal.id)) return;
    processedSignalIds.add(signal.id);
    if (processedSignalIds.size > 200) {
        const first = processedSignalIds.values().next().value;
        processedSignalIds.delete(first);
    }

    const action = signal.action;
    const actionName = (typeof action === 'object' && action) ? action.name : action;
    const badge = (typeof action === 'object' && action) ? action.badge : '';
    const label = (typeof action === 'object' && action) ? action.label : actionName;
    const actionType = signal.type ? (typeof signal.type === 'object' ? signal.type.name : signal.type) : 'EMOTE';

    playSignalAudio(actionName);
    appendSignalLog(signal);

    if (actionType === 'MOB_PING' && signal.targetIndex != null) {
        showMobPingVisual(signal.targetIndex, actionName, badge, label, signal.senderUsername);
    } else if (actionType === 'HERO_PING' && signal.targetIndex != null) {
        showHeroPingVisual(signal.targetIndex, actionName, badge, label, signal.senderUsername);
    } else {
        showEmoteVisual(actionName, badge, label, signal.senderUsername);
    }
}

/**
 * Ajoute une entrée stylisée au journal de combat.
 */
function appendSignalLog(signal) {
    const logContainer = document.getElementById('combatLog');
    if (!logContainer) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry log-entry-signal';

    const textSpan = document.createElement('span');
    textSpan.className = 'log-signal-text';
    textSpan.textContent = signal.formattedMessage || 'Signal';

    entry.appendChild(textSpan);
    logContainer.prepend(entry);
}

/**
 * Indicateur visuel sur une carte de monstre.
 */
function showMobPingVisual(targetIndex, actionName, badge, label, sender) {
    const card = document.querySelector(`.fighter-enemy[data-index="${targetIndex}"]`);
    if (!card) return;

    const pulseClass = (actionName === 'FEAR') ? 'ping-pulse-fear' : 'ping-pulse-attack';
    card.classList.add(pulseClass);

    const overlay = document.createElement('div');
    overlay.className = `fighter-ping-overlay ${actionName === 'FEAR' ? 'ping-type-fear' : 'ping-type-attack'}`;

    const badgeEl = document.createElement('span');
    badgeEl.className = 'fighter-ping-badge';
    badgeEl.textContent = badge || '⚔️';

    const labelEl = document.createElement('span');
    labelEl.className = 'fighter-ping-label';
    labelEl.textContent = `${label.toUpperCase()} !`;

    const senderEl = document.createElement('span');
    senderEl.className = 'fighter-ping-sender';
    senderEl.textContent = sender ? `(${sender})` : '';

    overlay.appendChild(badgeEl);
    overlay.appendChild(labelEl);
    if (sender) overlay.appendChild(senderEl);

    card.appendChild(overlay);

    setTimeout(() => {
        card.classList.remove(pulseClass);
        overlay.classList.add('ping-fading');
        setTimeout(() => overlay.remove(), 400);
    }, 4000);
}

/**
 * Indicateur visuel sur une carte de héros.
 */
function showHeroPingVisual(targetIndex, actionName, badge, label, sender) {
    const cards = document.querySelectorAll('.fighter-player');
    const card = cards[targetIndex];
    if (!card) return;

    let pulseClass = 'ping-pulse-heal';
    if (actionName === 'SHIELD') pulseClass = 'ping-pulse-shield';
    else if (actionName === 'BUFF') pulseClass = 'ping-pulse-buff';

    card.classList.add(pulseClass);

    const overlay = document.createElement('div');
    overlay.className = `fighter-ping-overlay ping-type-${actionName.toLowerCase()}`;

    const badgeEl = document.createElement('span');
    badgeEl.className = 'fighter-ping-badge';
    badgeEl.textContent = badge || '🛡️';

    const labelEl = document.createElement('span');
    labelEl.className = 'fighter-ping-label';
    labelEl.textContent = `${label.toUpperCase()} !`;

    const senderEl = document.createElement('span');
    senderEl.className = 'fighter-ping-sender';
    senderEl.textContent = sender ? `(${sender})` : '';

    overlay.appendChild(badgeEl);
    overlay.appendChild(labelEl);
    if (sender) overlay.appendChild(senderEl);

    card.appendChild(overlay);

    setTimeout(() => {
        card.classList.remove(pulseClass);
        overlay.classList.add('ping-fading');
        setTimeout(() => overlay.remove(), 400);
    }, 4000);
}

/**
 * Détermine l'index du héros qui doit jouer l'émote :
 * - Appartient au joueur (senderUsername)
 * - Priorité au prochain héros devant jouer selon l'ordre des tours (turnOrder)
 */
export function findEmoteTargetHeroIndex(senderUsername) {
    const session = pageState.currentSessionData;
    if (!session || !session.players || session.players.length === 0) return 0;

    const players = session.players;
    const turnOrder = session.turnOrder || [];
    const currentTurnIndex = session.currentTurnIndex || 0;

    // 1. Priorité au prochain héros appartenant à senderUsername dans l'ordre du tour
    if (turnOrder.length > 0) {
        const len = turnOrder.length;
        for (let offset = 0; offset < len; offset++) {
            const entryIndex = (currentTurnIndex + offset) % len;
            const entry = turnOrder[entryIndex];
            const isEntryPlayer = entry && (entry.player || entry.isPlayer);
            if (isEntryPlayer && entry.index !== undefined && entry.index !== null) {
                const p = players[entry.index];
                if (p) {
                    const owner = p.ownerUsername || p.user?.username;
                    const isAlive = (p.healthCurrent !== undefined ? p.healthCurrent : p.hpCurrent) > 0;
                    if (owner === senderUsername && isAlive) {
                        return entry.index;
                    }
                }
            }
        }
    }

    // 2. Si aucun héros vivant trouvé dans l'ordre de jeu (ex: hors combat), premier héros vivant du joueur
    const aliveIdx = players.findIndex(p => {
        const owner = p.ownerUsername || p.user?.username;
        const isAlive = (p.healthCurrent !== undefined ? p.healthCurrent : p.hpCurrent) > 0;
        return owner === senderUsername && isAlive;
    });
    if (aliveIdx !== -1) return aliveIdx;

    // 3. Si tous ses héros sont morts, premier héros du joueur
    const anyOwnerIdx = players.findIndex(p => {
        const owner = p.ownerUsername || p.user?.username;
        return owner === senderUsername;
    });
    if (anyOwnerIdx !== -1) return anyOwnerIdx;

    // 4. Si senderUsername inconnu ou en solo, héros actif ou 0
    if (session.activePlayer) {
        const activeIdx = players.findIndex(p => p.id === session.activePlayer.id);
        if (activeIdx !== -1) return activeIdx;
    }
    return 0;
}

/**
 * Bulle d'émote animée sur le prochain héros du joueur émetteur.
 * Clamping garanti : ne passe JAMAIS derrière le header.
 */
function showEmoteVisual(actionName, badge, label, sender) {
    const targetHeroIndex = findEmoteTargetHeroIndex(sender);
    let targetCard = document.querySelector(`.fighter-player[data-index="${targetHeroIndex}"]`);
    if (!targetCard) {
        const cards = document.querySelectorAll('.fighter-player');
        if (cards.length > targetHeroIndex) {
            targetCard = cards[targetHeroIndex];
        } else if (cards.length > 0) {
            targetCard = cards[0];
        }
    }

    const bubble = document.createElement('div');
    bubble.className = `combat-speech-bubble emote-${actionName.toLowerCase()}`;

    const badgeEl = document.createElement('span');
    badgeEl.className = 'bubble-badge';
    badgeEl.textContent = badge || '💬';

    const labelEl = document.createElement('span');
    labelEl.className = 'bubble-label';
    labelEl.textContent = label;

    bubble.appendChild(badgeEl);
    bubble.appendChild(labelEl);

    // Positionnement procédural fixed au-dessus de la carte, clampé sous le header
    const headerEl = document.querySelector('.combat-header');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 70;

    if (targetCard) {
        const rect = targetCard.getBoundingClientRect();
        const idealTop = rect.top - 48;
        const bubbleTop = Math.max(headerBottom + 10, idealTop);
        const bubbleLeft = rect.left + rect.width / 2;

        bubble.style.position = 'fixed';
        bubble.style.top = `${bubbleTop}px`;
        bubble.style.left = `${bubbleLeft}px`;
        bubble.style.transform = 'translateX(-50%)';
        bubble.style.zIndex = '99999';
    } else {
        bubble.style.position = 'fixed';
        bubble.style.top = `${headerBottom + 20}px`;
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.style.zIndex = '99999';
    }

    document.body.appendChild(bubble);

    setTimeout(() => {
        bubble.classList.add('bubble-fading');
        setTimeout(() => bubble.remove(), 400);
    }, 3500);
}

/**
 * Ouvre ou ferme le panneau d'émotes dans le header.
 */
export async function toggleEmotesPopover(anchorBtn) {
    const popover = document.getElementById('combatEmotesPopover');
    if (!popover) return;

    if (popover.classList.contains('is-visible')) {
        hideEmotesPopover();
        return;
    }

    const config = await getSignalsConfig();
    if (!config || !config.emoteActions) return;

    const grid = document.getElementById('combatEmotesGrid');
    if (grid) {
        grid.innerHTML = '';
        config.emoteActions.forEach(action => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'combat-emote-choice-btn';
            btn.setAttribute('data-action-name', action.name);
            btn.setAttribute('title', action.description);

            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'combat-emote-choice-badge';
            badgeSpan.textContent = action.badge || '💬';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'combat-emote-choice-label';
            labelSpan.textContent = action.label;

            btn.appendChild(badgeSpan);
            btn.appendChild(labelSpan);

            btn.addEventListener('click', () => {
                hideEmotesPopover();
                dispatchSignal(action.name, null, null);
            });

            grid.appendChild(btn);
        });
    }

    if (anchorBtn) {
        const rect = anchorBtn.getBoundingClientRect();
        popover.style.left = `${Math.max(10, Math.min(window.innerWidth - 340, rect.left - 80))}px`;
        popover.style.top = `${rect.bottom + 8}px`;
    }

    popover.classList.remove('is-hidden');
    popover.classList.add('is-visible');
}

export function hideEmotesPopover() {
    const popover = document.getElementById('combatEmotesPopover');
    if (!popover) return;
    popover.classList.remove('is-visible');
    popover.classList.add('is-hidden');
}

/**
 * Ouvre le menu contextuel de ping pour monstres ou héros.
 */
export async function showFighterPingMenu(e, type, targetIndex, targetName) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const menu = document.getElementById('combatPingMenu');
    if (!menu) return;

    const config = await getSignalsConfig();
    if (!config) return;

    const actions = (type === 'mob') ? config.mobActions : config.heroActions;
    const titleEl = document.getElementById('combatPingMenuTitle');
    const itemsEl = document.getElementById('combatPingMenuItems');

    if (titleEl) {
        titleEl.textContent = (type === 'mob')
            ? `Signaler : ${targetName || 'Monstre'}`
            : `Assistance : ${targetName || 'Héros'}`;
    }

    if (itemsEl) {
        itemsEl.innerHTML = '';
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `combat-ping-item-btn ping-type-${action.name.toLowerCase()}`;
            btn.setAttribute('title', action.description);

            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'ping-item-badge';
            badgeSpan.textContent = action.badge;

            const textSpan = document.createElement('span');
            textSpan.className = 'ping-item-label';
            textSpan.textContent = action.label;

            btn.appendChild(badgeSpan);
            btn.appendChild(textSpan);

            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                hideFighterPingMenu();
                dispatchSignal(action.name, targetIndex, targetName);
            });

            itemsEl.appendChild(btn);
        });
    }

    const posX = e ? e.clientX : window.innerWidth / 2;
    const posY = e ? e.clientY : window.innerHeight / 2;
    menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 240, posX - 20))}px`;
    menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 240, posY - 20))}px`;

    menu.classList.remove('is-hidden');
    menu.classList.add('is-visible');
}

export function hideFighterPingMenu() {
    const menu = document.getElementById('combatPingMenu');
    if (!menu) return;
    menu.classList.remove('is-visible');
    menu.classList.add('is-hidden');
}

/**
 * Initialise les écouteurs globaux pour fermer les popups lors d'un clic extérieur.
 */
export function initCombatSignals() {
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('combatEmotesPopover');
        const emotesBtn = document.getElementById('btnCombatEmotes');
        if (popover && popover.classList.contains('is-visible')) {
            if (!popover.contains(e.target) && (!emotesBtn || !emotesBtn.contains(e.target))) {
                hideEmotesPopover();
            }
        }

        const pingMenu = document.getElementById('combatPingMenu');
        if (pingMenu && pingMenu.classList.contains('is-visible')) {
            if (!pingMenu.contains(e.target) && !e.target.closest('.fighter-ping-btn')) {
                hideFighterPingMenu();
            }
        }
    });

    document.addEventListener('contextmenu', (e) => {
        const pingMenu = document.getElementById('combatPingMenu');
        if (pingMenu && pingMenu.classList.contains('is-visible') && !pingMenu.contains(e.target)) {
            hideFighterPingMenu();
        }
    });

    const emotesBtn = document.getElementById('btnCombatEmotes');
    if (emotesBtn) {
        emotesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleEmotesPopover(emotesBtn);
        });
    }

    getSignalsConfig();
}
