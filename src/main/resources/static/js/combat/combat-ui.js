import { createAnomalyBadgeHtml, getExpStats, getSpiritExpStats } from './combat-utils.js';
import { pageState } from './combat-state.js';
import { processNewDeathLogs, updateMultiTurnBanner } from './combat-socket.js';
import { currentSpellsTab, initiateCombatCast } from './combat-spells.js';
import { nextRoom, openStrangeDoor, acceptAlteration, useRope, openBuyModal, addLootedConsumable, openChest, resetCombatTimeoutWarning, playDungeonMusic, GAME_TIPS } from './combat-actions.js';
import * as ui from '../ui.js';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../utils/filters.js';


export function renderAndAnimateXPCards(containerId, players, prefix, isFirstClear = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.remove('hidden'); container.classList.add('flex');

    let maxGainedExp = 0;
    players.forEach(p => {
        let oldExp = pageState.previousPlayerXP[p.id] !== undefined ? pageState.previousPlayerXP[p.id] : p.experience;
        let gainedExp = Math.max(0, p.experience - oldExp);
        if (gainedExp > maxGainedExp) maxGainedExp = gainedExp;
    });

    let cardsHtml = '';
    players.forEach(p => {
        let oldExp = pageState.previousPlayerXP[p.id] !== undefined ? pageState.previousPlayerXP[p.id] : p.experience;
        let oldStats = getExpStats(oldExp, p.voieLevel);
        let oldSpiritExp = pageState.previousPlayerSpiritXP[p.id] !== undefined ? pageState.previousPlayerSpiritXP[p.id] : (p.spiritualiteExperience || 0);
        let oldSpiritStats = getSpiritExpStats(oldSpiritExp, p.spiritualiteLevel);

        let gainedExp = p.experience - oldExp;
        let x2Badge = '';
        if (isFirstClear && gainedExp > 0 && gainedExp === maxGainedExp && (prefix === 'vic' || prefix === 'treasure')) {
            x2Badge = `<span class="material-symbols-outlined text-amber-500" style="font-size: 1.1rem; vertical-align: middle; margin-left: 2px;" title="Bonus Première Complétion (x2)">star</span>`;
        }
        let gainedHtml = '';
        if (gainedExp > 0) {
            gainedHtml = `<div class="text-info font-bold flex items-center justify-center" style="font-size: 0.95rem; text-shadow: 0 0 5px rgba(56, 189, 248, 0.5); margin-bottom: 0.4rem;">+${gainedExp} XP ${x2Badge}</div>`;
        } else if (gainedExp < 0) {
            gainedHtml = `<div class="text-danger font-bold flex items-center justify-center" style="font-size: 0.95rem; text-shadow: 0 0 5px rgba(239, 68, 68, 0.5); margin-bottom: 0.4rem;">${gainedExp} XP</div>`;
        }

        let cardsHtmlPart = `
            <div class="text-center relative" id="${prefix}-xp-card-${p.id}" style="background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: 180px; overflow: hidden; transition: all 0.5s; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8); display: flex; flex-direction: column; gap: 0.3rem;">
                <div class="font-bold whitespace-nowrap text-subtle" style="margin-bottom: 0.1rem; text-overflow: ellipsis; overflow: hidden;">${p.name}</div>
                ${gainedHtml}
                
                <div class="text-xs" id="${prefix}-xp-lvl-${p.id}" style="color: #38bdf8; font-weight: 600; transition: color 0.3s, transform 0.3s;">Voie Niv. ${oldStats.level}</div>
                <div class="progress-track">
                    <div id="${prefix}-xp-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldStats.progress)}%; background: #10b981; transition: box-shadow 0.3s;"></div>
                </div>
                <div class="text-muted" id="${prefix}-xp-text-${p.id}" style="font-size: 0.7rem; font-family: monospace;">${oldExp} / ${oldStats.level === 10 ? 'MAX' : oldStats.nextLvlXp} XP</div>
        `;

        let gainedSpiritExp = (p.spiritualiteExperience || 0) - oldSpiritExp;
        let gainedSpiritHtml = '';
        if (gainedSpiritExp > 0) {
            gainedSpiritHtml = `<div class="text-warning font-bold flex items-center justify-center" style="font-size: 0.85rem; text-shadow: 0 0 5px rgba(245, 158, 11, 0.5); margin-bottom: 0.2rem;">+${gainedSpiritExp} Spirit XP</div>`;
        } else if (gainedSpiritExp < 0) {
            gainedSpiritHtml = `<div class="text-danger font-bold flex items-center justify-center" style="font-size: 0.85rem; text-shadow: 0 0 5px rgba(239, 68, 68, 0.5); margin-bottom: 0.2rem;">${gainedSpiritExp} Spirit XP</div>`;
        }

        if (oldSpiritExp > 0 || (p.spiritualiteExperience || 0) > 0 || prefix === 'treasure') {
            cardsHtmlPart += `
                <div class="mt-xs"></div>
                ${gainedSpiritHtml}
                <div class="text-xs" id="${prefix}-spirit-lvl-${p.id}" style="color: #fb923c; font-weight: 600; transition: color 0.3s, transform 0.3s;">Spirit Niv. ${oldSpiritStats.level}</div>
                <div class="progress-track">
                    <div id="${prefix}-spirit-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldSpiritStats.progress)}%; background: #f59e0b; transition: box-shadow 0.3s;"></div>
                </div>
                <div class="text-muted" id="${prefix}-spirit-text-${p.id}" style="font-size: 0.7rem; font-family: monospace;">${oldSpiritExp} / ${oldSpiritStats.level === 10 ? 'MAX' : oldSpiritStats.nextLvlXp} XP</div>
            `;
        }

        cardsHtmlPart += `</div>`;
        cardsHtml += cardsHtmlPart;
    });

    container.innerHTML += cardsHtml;

    players.forEach(p => {
        let oldExp = pageState.previousPlayerXP[p.id] !== undefined ? pageState.previousPlayerXP[p.id] : p.experience;
        let endExp = p.experience;
        let oldSpiritExp = pageState.previousPlayerSpiritXP[p.id] !== undefined ? pageState.previousPlayerSpiritXP[p.id] : (p.spiritualiteExperience || 0);
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
                let stats = getExpStats(currentExp, p.voieLevel);
                if (bar && text && lvlText) {
                    bar.style.width = Math.min(100, stats.progress) + "%";
                    text.innerText = currentExp + " / " + (stats.level === 10 ? 'MAX' : stats.nextLvlXp) + " XP";
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
                let spiritStats = getSpiritExpStats(currentSpiritExp, p.spiritualiteLevel);
                if (spiritBar && spiritText && spiritLvlText) {
                    spiritBar.style.width = Math.min(100, spiritStats.progress) + "%";
                    spiritText.innerText = currentSpiritExp + " / " + (spiritStats.level === 10 ? 'MAX' : spiritStats.nextLvlXp) + " XP";
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
                        setTimeout(() => { if (bar) bar.style.boxShadow = "none"; }, 500);
                    }
                    if (spiritBar && oldSpiritExp !== endSpiritExp) {
                        spiritBar.style.boxShadow = "0 0 10px 2px rgba(245, 158, 11, 0.5)";
                        setTimeout(() => { if (spiritBar) spiritBar.style.boxShadow = "none"; }, 500);
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
        pageState.previousPlayerXP[p.id] = p.experience;
        pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
    });
}

export function updateUI(data) {
    if (ui.hideGlobalTooltip) {
        ui.hideGlobalTooltip();
    }

    if (pageState.currentSessionData && data && !data.error) {
        const old = pageState.currentSessionData;
        const isStale = (
            data.currentRoomIndex < old.currentRoomIndex ||
            (data.currentRoomIndex === old.currentRoomIndex && data.turnNumber < old.turnNumber) ||
            (data.currentRoomIndex === old.currentRoomIndex && data.turnNumber === old.turnNumber && data.combatLog && old.combatLog && data.combatLog.length < old.combatLog.length)
        );
        if (isStale) {
            console.log('Ignored stale data update (likely delayed HTTP response).');
            return;
        }
    }

    let turnMap = { players: {}, enemies: {} };
    if (data.turnOrder) {
        data.turnOrder.forEach((entry, i) => {
            if (entry.player) turnMap.players[entry.index] = i + 1;
            else turnMap.enemies[entry.index] = i + 1;
        });
    }

    const oldStats = {};
    document.querySelectorAll('.fighter').forEach((el) => {
        let fId = el.dataset.fighterId;
        if (!fId) return;
        const hpTextEl = el.querySelector('.hp-text-val');
        const manaTextEl = el.querySelector('.mana-text-val');
        let hp = null, mana = null;
        if (hpTextEl) {
            const m = hpTextEl.textContent.match(/(\d+)/);
            if (m) hp = parseInt(m[1], 10);
        }
        if (manaTextEl) {
            const m = manaTextEl.textContent.match(/(\d+)/);
            if (m) mana = parseInt(m[1], 10);
        }
        oldStats[fId] = { hp, mana };
    });
    window.combatOldStats = oldStats;

    resetCombatTimeoutWarning(data.finished);

    if (pageState.currentSessionData && pageState.currentSessionData.activePlayer && data.activePlayer) {
        if (pageState.currentSessionData.activePlayer.name !== data.activePlayer.name) {
            const typeAll = document.querySelector('input[name="filterCastingType"][value="ALL"]');
            if (typeAll) typeAll.checked = true;
            const levelAll = document.querySelector('input[name="filterLevel"][value="ALL"]');
            if (levelAll) levelAll.checked = true;
        }
    }

    pageState.currentSessionData = data;

    if (data.finished) {
        localStorage.removeItem('activeCombatId');
        if (window.dungeonMusic) {
            window.dungeonMusic.pause();
        }
    }
    let isActiveEnemy = false;
    let activeEnemyIndex = -1;

    if (data.turnOrder && data.turnOrder.length > data.currentTurnIndex && !data.finished) {
        const currentTurn = data.turnOrder[data.currentTurnIndex];
        if (!currentTurn.player) {
            isActiveEnemy = true;
            activeEnemyIndex = currentTurn.index;
        }
    }

    if (data.donjonName) {
        document.getElementById('headerDungeonName').textContent = data.donjonName + " - Étape " + (data.currentRoomIndex + 1);
        if (!data.finished) {
            playDungeonMusic(data);
        }
    }
    document.getElementById('turnCounter').textContent = data.turnNumber;

    // Update flee penalty text
    const fleePenaltySpan = document.getElementById('fleePenaltyText');
    if (fleePenaltySpan && data.players) {
        const nbHeroes = Math.max(1, data.players.length);
        const nbRooms = Math.max(1, data.totalRooms || 1);
        const totalXpLoss = 10 * nbRooms;
        const xpLossPerHero = Math.floor(totalXpLoss / nbHeroes);
        const goldLoss = 10 * nbRooms;
        fleePenaltySpan.innerHTML = `Perte d'xp et Or : <span style="color: #f87171;">-${xpLossPerHero} XP normal</span> (par perso) et <span class="text-warning">-${goldLoss} Or</span> (au total).`;
    }

    // Players
    const playersContainer = document.getElementById('playersContainer');
    if (playersContainer) {
        playersContainer.innerHTML = '';
        data.players.forEach((p, index) => {
            let actualHp = p.healthCurrent;
            let preHp = p.hpCurrentBeforeTurnStart;
            let needsDelay = preHp !== undefined && preHp !== null && preHp < actualHp;

            if (needsDelay) {
                p.healthCurrent = preHp;
            }

            let isActive = false;
            if (data.turnOrder && data.turnOrder.length > data.currentTurnIndex) {
                const currentTurn = data.turnOrder[data.currentTurnIndex];
                if (currentTurn.player && currentTurn.index === index) {
                    isActive = true;
                }
            }

            const isDead = p.healthCurrent <= 0;
            const isAllySelected = index === pageState.selectedAllyIndex;

            const div = document.createElement('div');
            div.className = `fighter fighter-player ${isActive ? 'active' : ''} ${isAllySelected ? 'selected-ally' : ''} ${isDead ? 'dead' : ''}`;
            div.dataset.fighterId = `hero-${p.id || index}`;

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
            let timerHtml = '';
            if (pageState.isMulti && isActive && data.turnStartTime) {
                timerHtml = `<div class="turn-timer-badge" id="timerBadge_${index}" style="position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); border: 1px solid #38bdf8; color: #38bdf8; padding: 4px 14px; border-radius: 8px; font-weight: bold; box-shadow: 0 0 12px rgba(56, 189, 248, 0.5); z-index: 10; display: flex; align-items: center; gap: 6px; letter-spacing: 0.5px;">⏳ Calcul...</div>`;
            }
            const fId = div.dataset.fighterId;
            let forcedHp = null;
            let forcedMana = null;
            if (window.combatOldStats && window.combatOldStats[fId]) {
                forcedHp = window.combatOldStats[fId].hp;
                forcedMana = window.combatOldStats[fId].mana;
            }

            div.innerHTML = timerHtml + generateFighterHtml(p, true, false, forcedHp, forcedMana, turnMap.players[index] || null);
            playersContainer.appendChild(div);

            // Animate bars with JS loop
            const hpBar = div.querySelector('.gauge-fill.hp');
            const hpTextEl = div.querySelector('.hp-text-val');
            const manaBar = div.querySelector('.gauge-fill.mana');
            const manaTextEl = div.querySelector('.mana-text-val');

            if (forcedHp !== null && forcedHp !== p.healthCurrent) {
                // DEBUG
                const log = document.getElementById('combatLog');
                if (log) {
                    const el = document.createElement('div');
                    el.className = 'log-entry';
                    el.style.color = 'yellow';
                    el.innerText = `[DEBUG] Player ${fId} HP: ${forcedHp} -> ${p.healthCurrent}`;
                    log.prepend(el);
                }

                animateGaugeJS(hpBar, hpTextEl, forcedHp, p.healthCurrent, p.healthMax, 800);
            } else if (forcedHp === p.healthCurrent) {
                // DEBUG
                const log = document.getElementById('combatLog');
                if (log) {
                    const el = document.createElement('div');
                    el.className = 'log-entry';
                    el.style.color = 'orange';
                    el.innerText = `[DEBUG] Player ${fId} skipped HP anim (same val: ${forcedHp})`;
                    log.prepend(el);
                }
            } else if (forcedHp === null) {
                // DEBUG
                const log = document.getElementById('combatLog');
                if (log) {
                    const el = document.createElement('div');
                    el.className = 'log-entry';
                    el.style.color = 'red';
                    el.innerText = `[DEBUG] Player ${fId} skipped HP anim (forcedHp is NULL)`;
                    log.prepend(el);
                }
            }
            if (forcedMana !== null && forcedMana !== p.manaCurrent) {
                animateGaugeJS(manaBar, manaTextEl, forcedMana, p.manaCurrent, p.manaMax, 800);
            }

            if (needsDelay) {
                p.healthCurrent = actualHp;
                setTimeout(() => {
                    const hpBar = div.querySelector('.gauge-fill.hp');
                    const hpLabel = div.querySelector('.gauge-label span:nth-child(2)');
                    if (hpBar) {
                        hpBar.style.width = (p.healthMax > 0 ? Math.max(0, Math.min(100, (actualHp / p.healthMax) * 100)) : 0) + '%';
                    }
                    if (hpLabel) {
                        let labelText = `${actualHp} / ${p.healthMax}`;
                        if (p.shieldTotal > 0) labelText += ` (+${p.shieldTotal} 🛡️)`;
                        hpLabel.textContent = labelText;
                    }
                }, 800);
            }
        });
    }

    if (window.multiplayerTurnInterval) {
        clearInterval(window.multiplayerTurnInterval);
        window.multiplayerTurnInterval = null;
    }

    if (pageState.isMulti && !data.finished && data.turnStartTime) {
        window.multiplayerTurnInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - data.turnStartTime) / 1000);
            const maxTime = data.currentTurnTimeLimit ? Math.floor(data.currentTurnTimeLimit / 1000) : 90;
            let remaining = Math.max(0, maxTime - elapsed);

            document.querySelectorAll('.turn-timer-badge').forEach(badge => {
                badge.textContent = `⏳ ${remaining}s`;
                if (remaining <= 10) {
                    if (window.combatIsMyTurn) {
                        const turnId = `${data.turnNumber}-${data.currentTurnIndex}`;
                        if (window.lastWarningTurnId !== turnId) {
                            window.lastWarningTurnId = turnId;
                            try {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.type = 'triangle';
                                osc.frequency.setValueAtTime(880, ctx.currentTime);
                                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
                                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                                osc.connect(gain);
                                gain.connect(ctx.destination);
                                osc.start();
                                osc.stop(ctx.currentTime + 0.3);
                            } catch (e) { }
                        }
                    }
                    badge.style.background = 'rgba(69, 10, 10, 0.9)';
                    badge.style.borderColor = '#ef4444';
                    badge.style.color = '#ef4444';
                    badge.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';
                } else {
                    badge.style.background = 'rgba(15, 23, 42, 0.9)';
                    badge.style.borderColor = '#38bdf8';
                    badge.style.color = '#38bdf8';
                    badge.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.5)';
                }
            });

            if (remaining <= 0 && window.multiplayerTurnInterval) {
                clearInterval(window.multiplayerTurnInterval);
            }
        }, 1000);
    }

    // Render Spells
    if (data.availableSpells) {
        renderSpells(data.availableSpells);
    }

    // Mettre à jour le bandeau co-op APRÈS le rendu des sorts pour qu'ils soient bien grisés
    if (pageState.isMulti) {
        updateMultiTurnBanner(data);
    }

    // Auto-select first alive target if current is dead
    if (data.enemies && data.enemies.length > 0 && pageState.selectedTargetIndex !== null) {
        if (!data.enemies[pageState.selectedTargetIndex] || data.enemies[pageState.selectedTargetIndex].dead) {
            pageState.selectedTargetIndex = data.enemies.findIndex(e => !e.dead);
            if (pageState.selectedTargetIndex === -1) pageState.selectedTargetIndex = null;
        }
    }

    // Room logic
    if (data.currentRoom) {
        if (data.currentRoom.type === 'COMBAT' || data.currentRoom.type === 'BOSS') {
            document.getElementById('eventOverlay').classList.remove('show');

            if (typeof window.renderOverlayInventory === 'function') {
                window.renderOverlayInventory('combatMainInventoryList');
            }
            if (typeof window.renderOverlayMap === 'function') {
                window.renderOverlayMap('combatMainMapList');
            }

            // Auto fold when a new combat starts
            if (window.lastCombatRoomIndex !== data.currentRoomIndex) {
                const wrapper = document.getElementById('combatMainSidePanelWrapper');
                if (wrapper && !wrapper.classList.contains('-translate-x-full')) {
                    wrapper.classList.add('-translate-x-full');
                }
                window.lastCombatRoomIndex = data.currentRoomIndex;
            }

            const allEnemiesDead = !data.enemies || data.enemies.length === 0 || data.enemies.every(e => e.dead || e.currentHp <= 0);

            if (allEnemiesDead && !data.finished) {
                document.getElementById('btnAttack').disabled = true;
                const vicOverlay = document.getElementById('combatVictoryOverlay');
                if (vicOverlay) {
                    if (typeof window.renderOverlayInventory === 'function') {
                        window.renderOverlayInventory('combatVictoryInventoryList');
                        window.renderOverlayInventory('combatMainInventoryList');
                    }
                    if (typeof window.renderOverlayMap === 'function') {
                        window.renderOverlayMap('combatVictoryMapList');
                        window.renderOverlayMap('combatMainMapList');
                    }
                    vicOverlay.classList.add('show');
                    const xpContainer = document.getElementById('combatVictoryXpContainer');
                    if (xpContainer) {
                        xpContainer.innerHTML = '';

                        // Base Gold and XP accumulated over the CURRENT room
                        const totalGold = data.roomGoldAccumulated || 0;
                        const totalRawXp = data.roomExpAccumulated || 0;
                        const nbPlayers = Math.max(1, (data.players || []).length);
                        const xpPerHero = Math.floor(totalRawXp / nbPlayers);

                        const bossBonusGold = data.bossBonusGold || 0;
                        const bossBonusSpiritXp = data.bossBonusSpiritualXp || 0;

                        // Soustraire l'or du boss pour n'afficher que l'or des monstres dans la section de base
                        let goldAmount = Math.max(0, totalGold - bossBonusGold);
                        let xpAmount = xpPerHero;

                        // Display base Gold only
                        if (goldAmount > 0) {
                            let baseContent = `
                                <span class="material-symbols-outlined text-warning">monetization_on</span>
                                <span class="text-warning">+${goldAmount} Or</span>
                            `;
                            xpContainer.innerHTML += `
                                <div class="victory-xp-block">
                                    <div class="victory-xp-block-inner victory-xp-base">
                                        ${baseContent}
                                    </div>
                                </div>
                            `;
                        }

                        // On vérifie si le boss donne au moins un des deux bonus
                        if (bossBonusGold > 0 || bossBonusSpiritXp > 0) {

                            // Base du contenu avec le tag BOSS
                            let innerContent = `
                                <span class="material-symbols-outlined text-error" >local_fire_department</span>
                                <span class="text-error" style="margin-right: 0.5rem;">BOSS</span>
                            `;

                            // Ajout de l'Or si présent
                            if (bossBonusGold > 0) {
                                innerContent += `
                                    <span class="material-symbols-outlined text-warning">monetization_on</span>
                                    <span class="text-warning">+${bossBonusGold} Or</span>
                                `;
                            }

                            // Séparateur visuel si on a les DEUX bonus en même temps
                            if (bossBonusGold > 0 && bossBonusSpiritXp > 0) {
                                innerContent += `<span class="text-muted" style="margin: 0 0.2rem;">|</span>`;
                            }

                            // Ajout de l'XP Spirituelle si présente
                            if (bossBonusSpiritXp > 0) {
                                const perHero = Math.floor(bossBonusSpiritXp / Math.max(1, (data.players || []).length));
                                innerContent += `
                                    <span class="material-symbols-outlined text-gold" >stars</span>
                                    <span class="text-gold">+${perHero} XP Spiritualité</span>
                                `;
                            }

                            // Injection dans le container (une seule fois)
                            xpContainer.innerHTML += `
                                <div class="victory-xp-block">
                                    <div class="victory-xp-block-inner victory-xp-boss">
                                        ${innerContent}
                                    </div>
                                </div>
                            `;
                        }

                        renderAndAnimateXPCards('combatVictoryXpContainer', data.players, 'vic', data.firstClear);
                    }
                }
            } else {
                const vicOverlay = document.getElementById('combatVictoryOverlay');
                if (vicOverlay) vicOverlay.classList.remove('show');

                document.getElementById('btnAttack').disabled = false;
                renderEnemies(data.enemies, turnMap);

                // Track previous XP to animate next time
                data.players.forEach(p => {
                    pageState.previousPlayerXP[p.id] = p.experience;
                });
            }
        } else {
            // TREASURE OR EVENT
            const vicOverlay = document.getElementById('combatVictoryOverlay');
            if (vicOverlay) vicOverlay.classList.remove('show');

            document.getElementById('btnAttack').disabled = true;
            document.getElementById('enemiesContainer').innerHTML = ''; // Clear enemies

            // Reset les textes originaux des boutons pour ne pas garder ceux de la salle précédente
            document.querySelectorAll('button[onclick*="nextRoom"]').forEach(btn => {
                delete btn.dataset.origText;
            });

            const overlay = document.getElementById('eventOverlay');
            const icon = document.getElementById('eventIcon');
            const title = document.getElementById('eventTitle');
            const desc = document.getElementById('eventDesc');

            const btnOpen = document.getElementById('btnOpenChest');
            const btnCont = document.getElementById('btnContinueEvent');
            const lootContainer = document.getElementById('eventLootContainer');

            // Reset loot when room event is not yet completed
            if (!data.roomEventCompleted) {
                delete lootContainer.dataset.filled;
                lootContainer.innerHTML = '';
                const oldRightPanel = document.getElementById('othersLootPanel');
                if (oldRightPanel) oldRightPanel.remove();
            }

            // Reset default onclick to prevent previous events (like PORTE_ETRANGE) from overriding it
            if (btnCont) {
                btnCont.onclick = nextRoom;
            }

            const actionContainer = document.getElementById('eventActionContainer');
            if (actionContainer) {
                actionContainer.querySelectorAll('.dynamic-key-btn').forEach(b => b.remove());
                const oldKeys = document.getElementById('keysContainer');
                if (oldKeys) oldKeys.remove();
            }


            const myChoice = data.playerRoomChoices ? data.playerRoomChoices[pageState.currentUsername] : null;
            function applyChoiceStyle(btn, isChosen, isMulti, readyCount, totalCount) {
                if (!btn) return;

                // Clear old styles first
                btn.style.opacity = '1';
                btn.classList.remove('bg-green-600', 'text-white', 'opacity-50');

                // Remove previous counter if exists
                const existingCounter = btn.querySelector('.ready-counter');
                if (existingCounter) existingCounter.remove();

                if (isMulti) {
                    const counter = document.createElement('span');
                    counter.className = 'ready-counter text-xs opacity-75 ml-2';
                    counter.textContent = `(${readyCount}/${totalCount})`;
                    btn.appendChild(counter);
                }

                if (isChosen) {
                    btn.classList.add('bg-green-600', 'text-white');
                    btn.classList.remove('bg-dark-surface', 'bg-dark-hover'); // in case it has these
                } else if (myChoice) {
                    // if they chose something else, dim this button
                    btn.classList.add('opacity-50');
                }
            }

            const activeUsersCount = new Set((data.players || []).filter(p => p.healthCurrent > 0 && p.ownerUsername).map(p => p.ownerUsername)).size;
            const readyUsersCount = data.playerRoomChoices ? Object.keys(data.playerRoomChoices).length : 0;
            if (data.currentRoom.type === 'TREASURE') {
                icon.textContent = data.roomEventCompleted ? 'lock_open' : 'lock';
                icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-gold';
                title.textContent = 'Salle des Trésors';

                if (data.roomEventCompleted) {
                    desc.textContent = `Vous avez ouvert le coffre !`;
                    btnOpen.classList.add('hidden');
                    if (document.getElementById('btnOpenChestKey')) document.getElementById('btnOpenChestKey').classList.add('hidden');
                    btnCont.classList.remove('hidden');
                    lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');

                    // Allow filling if it contains only comments or whitespace
                    if (!lootContainer.dataset.filled) {
                        lootContainer.dataset.filled = 'true';
                        lootContainer.innerHTML = ''; // Clear comments

                        renderAndAnimateXPCards('eventLootContainer', data.players, 'treasure', data.firstClear);

                        let gainedItemsHtml = '';
                        let othersLootHtml = '';
                        let goldAmount = 0;
                        let expAmount = 0;
                        if (data.interactionResults) {
                            for (let user in data.interactionResults) {
                                let lines = data.interactionResults[user];
                                let userOtherItemsHtml = '';

                                lines.forEach(log => {
                                    if (user === pageState.currentUsername) {
                                        if (log.includes("trouvez")) {
                                            const goldMatch = log.match(/trouvez (\d+) Or/);
                                            if (goldMatch) goldAmount += parseInt(goldMatch[1]);
                                            const expMatch = log.match(/gagnez (\d+) XP/);
                                            if (expMatch) expAmount += parseInt(expMatch[1]);
                                        }
                                    }

                                    if (log.includes("Objet trouvé :")) {
                                        const itemNameMatch = log.match(/Objet trouvé : (.*?) \(/);
                                        if (itemNameMatch) {
                                            const eqName = itemNameMatch[1].trim();
                                            let eq = null;
                                            let an = null;
                                            if (data.currentRoom && data.currentRoom.lootTable) {
                                                const entry = data.currentRoom.lootTable.find(l => l.equipment && l.equipment.name === eqName);
                                                if (entry) eq = entry.equipment;
                                            }
                                            if (!eq && Array.isArray(window.allAnomaliesCombat)) {
                                                an = window.allAnomaliesCombat.find(a => a.name === eqName);
                                            }

                                            const slotInfo = eq ? (getSlotInfo(eq) || { icon: 'help', color: '#94a3b8' }) : (an ? { icon: (an.category ? (getCategoryIcon(an.category)) : 'star'), color: getSpiritualiteColor(an.spiritualite) } : { icon: 'swords', color: '#f59e0b' });
                                            const rarityColor = eq ? (getRarityColor(eq.rarity)) : (an ? getSpiritualiteColor(an.spiritualite) : '#f59e0b');
                                            const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';

                                            let tooltipDataHtml = '';
                                            if (eq && typeof window.getEquipmentTooltipHTML === 'function') {
                                                tooltipDataHtml = window.getEquipmentTooltipHTML(eq);
                                            } else if (an && typeof getAnomalyTooltipHTML === 'function') {
                                                tooltipDataHtml = getAnomalyTooltipHTML(an, eqName);
                                            }
                                            const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';

                                            if (user === pageState.currentUsername) {
                                                let inventoryStatus = (log.includes("ajouté à l'équipe") || log.includes("ajouté à l'inventaire")) ? 'in_inventory' : (log.includes("coffre") ? 'in_vault' : 'unknown');
                                                let inventoryIconHtml = '';
                                                if (eq && eq.slot === 'CONSOMMABLE') {
                                                    if (inventoryStatus === 'in_inventory') {
                                                        inventoryIconHtml = `<span class="material-symbols-outlined" style="position: absolute; top: 0.2rem; left: 0.2rem; font-size: 1.2rem; color: #10b981;" title="Dans l'inventaire du groupe">inventory_2</span>`;
                                                    } else if (inventoryStatus === 'in_vault') {
                                                        const safeName = eqName.replace(/'/g, "\\'");
                                                        inventoryIconHtml = `<span class="material-symbols-outlined vault-to-inv-icon" data-itemname="${eqName}" onclick="addLootedConsumable('${safeName}', this)" style="position: absolute; top: 0.2rem; left: 0.2rem; font-size: 1.2rem; color: #64748b; cursor: pointer; transition: color 0.2s;" title="Cliquer pour ajouter à l'inventaire" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#64748b'">inventory_2</span>`;
                                                    }
                                                }

                                                gainedItemsHtml += `
                                                    <div class="flex-center relative" ${tooltipAttrs} style="cursor: ${tooltipDataHtml ? 'help' : 'default'}; background: rgba(0, 0, 0, 0.4); border: 1px solid ${rarityColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${rarityColor}; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        ${inventoryIconHtml}
                                                        ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                                        <span class="material-symbols-outlined${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="${tooltipDataHtml ? `border-bottom: 1px dashed ${rarityColor};` : ''}">${eqName}</span>
                                                    </div>
                                                `;
                                            } else {
                                                userOtherItemsHtml += `
                                                    <div class="flex items-center gap-2 mb-2 p-2 rounded relative" style="background: rgba(0,0,0,0.3); border: 1px solid ${rarityColor}50; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.9);">
                                                        <span class="material-symbols-outlined text-sm${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                                        <span class="text-sm font-semibold relative" style="color: ${rarityColor}; ${tooltipDataHtml ? `border-bottom: 1px dashed ${rarityColor}; cursor: help;` : ''}" ${tooltipAttrs}>
                                                            ${eqName}
                                                            ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                                        </span>
                                                    </div>
                                                `;
                                            }
                                        }
                                    }
                                });

                                if (user !== pageState.currentUsername && userOtherItemsHtml) {
                                    othersLootHtml += `
                                        <div class="mb-4">
                                            <div class="text-sm text-muted mb-2 font-bold uppercase tracking-wider text-center" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Loot de <span style="color: #10b981;">${user}</span></div>
                                            <div class="flex flex-col gap-3">
                                                ${userOtherItemsHtml}
                                            </div>
                                        </div>
                                    `;
                                }
                            }

                            if (expAmount > 0) {
                                gainedItemsHtml = `
                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #38bdf880; padding: 0.8rem 1rem; border-radius: 8px; color: #38bdf8; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8); animation-delay: 0.1s;">
                                        <span class="material-symbols-outlined text-info">upgrade</span> +${expAmount} XP
                                    </div>
                                ` + gainedItemsHtml;
                            }

                            if (goldAmount > 0) {
                                gainedItemsHtml = `
                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #f59e0b80; padding: 0.8rem 1rem; border-radius: 8px; color: #f59e0b; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                        <span class="material-symbols-outlined text-warning">monetization_on</span> +${goldAmount} Or
                                    </div>
                                ` + gainedItemsHtml;
                            }
                        }

                        // We removed the custom HTML XP block because renderAndAnimateXPCards does it beautifully.

                        // If no items/gold/xp but we opened a chest, show something at least
                        if (!gainedItemsHtml && expAmount === 0) {
                            gainedItemsHtml = `
                                <div class="flex-center text-muted" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #94a3b880; padding: 0.8rem 1rem; border-radius: 8px; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                    Le coffre était vide...
                                </div>
                            `;
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

                        // Remove old independent panel if it exists
                        const existingRightPanel = document.getElementById('othersLootPanel');
                        if (existingRightPanel) existingRightPanel.remove();

                        if (othersLootHtml) {
                            const rightPanel = document.createElement('div');
                            rightPanel.id = 'othersLootPanel';
                            rightPanel.className = 'bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col overflow-y-auto custom-scrollbar shrink-0';

                            rightPanel.style.width = '280px';
                            rightPanel.style.maxHeight = '100%';

                            rightPanel.innerHTML = othersLootHtml;
                            const wrapperEl = document.getElementById('eventModalWrapper');
                            if (wrapperEl) wrapperEl.appendChild(rightPanel);
                        }
                    }
                } else {
                    const oldRightPanel = document.getElementById('othersLootPanel');
                    if (oldRightPanel) oldRightPanel.remove();

                    desc.textContent = `Un coffre mystérieux se trouve au centre de la pièce...`;
                    btnOpen.classList.remove('hidden');
                    btnCont.classList.add('hidden'); // No pass button for chests

                    lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');

                    let openVotes = 0;
                    if (data.playerRoomChoices) {
                        for (let user in data.playerRoomChoices) {
                            if (data.playerRoomChoices[user].actionType === 'OPEN') {
                                openVotes++;
                            }
                        }
                    }

                    const isMainChosen = myChoice && myChoice.actionType === 'OPEN';
                    applyChoiceStyle(btnOpen, isMainChosen, activeUsersCount > 1, openVotes, activeUsersCount);

                    const actionContainer = document.getElementById('eventActionContainer');
                    if (actionContainer && btnCont) {
                        actionContainer.classList.add('flex-wrap', 'justify-center');

                        const keys = data.activeConsumables ? data.activeConsumables.filter(eq => eq.consumableCategory === 'CLE') : [];

                        let keysContainer = document.getElementById('keysContainer');
                        if (!keysContainer) {
                            keysContainer = document.createElement('div');
                            keysContainer.id = 'keysContainer';
                            keysContainer.className = 'flex gap-3 justify-center flex-wrap w-full mt-2';
                            actionContainer.appendChild(keysContainer);
                        } else {
                            keysContainer.innerHTML = '';
                        }

                        const keyGroups = {};
                        keys.forEach(k => {
                            if (!keyGroups[k.name]) {
                                keyGroups[k.name] = {
                                    name: k.name,
                                    bonus: k.specialEffectValue > 0 ? k.specialEffectValue : 10,
                                    ids: [],
                                    eq: k
                                };
                            }
                            keyGroups[k.name].ids.push(k.id);
                        });

                        Object.values(keyGroups).forEach(group => {
                            let groupLocks = 0;
                            let myLockedId = null;
                            let lockedIds = new Set();

                            if (data.playerRoomChoices) {
                                for (let user in data.playerRoomChoices) {
                                    const choice = data.playerRoomChoices[user];
                                    if (choice.actionType === 'OPEN_KEY') {
                                        lockedIds.add(choice.itemId);
                                        if (group.ids.includes(choice.itemId)) {
                                            groupLocks++;
                                            if (user === pageState.currentUsername) {
                                                myLockedId = choice.itemId;
                                            }
                                        }
                                    }
                                }
                            }

                            const eq = group.eq;
                            const rarityColor = typeof getRarityColor === 'function' ? getRarityColor(eq.rarity) : '#94a3b8';
                            let tooltipDataHtml = '';
                            if (typeof window.getEquipmentTooltipHTML === 'function') {
                                tooltipDataHtml = window.getEquipmentTooltipHTML(eq);
                            }

                            const btn = document.createElement('button');
                            btn.className = 'flex items-center gap-2 p-1.5 px-3 rounded-full border relative transition-all duration-300 hover:scale-105 shadow-md';

                            const isChosen = myLockedId !== null;

                            if (isChosen) {
                                btn.style.background = 'rgba(22, 163, 74, 0.4)';
                                btn.style.borderColor = '#4ade80';
                                btn.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.3)';
                            } else if (myChoice) {
                                btn.style.background = 'rgba(30, 41, 59, 0.8)';
                                btn.style.borderColor = `${rarityColor}80`;
                                btn.style.opacity = '0.5';
                            } else {
                                btn.style.background = 'rgba(30, 41, 59, 0.8)';
                                btn.style.borderColor = `${rarityColor}80`;
                            }

                            if (!isChosen && groupLocks >= group.ids.length) {
                                btn.disabled = true;
                                btn.style.opacity = '0.5';
                                btn.style.filter = 'grayscale(100%)';
                                btn.title = "Toutes les clés de ce type sont déjà sélectionnées.";
                                btn.style.cursor = 'not-allowed';
                                btn.classList.remove('hover:scale-105');
                            }

                            btn.onclick = () => {
                                if (btn.disabled) return;
                                let idToSend = myLockedId;
                                if (!idToSend) {
                                    idToSend = group.ids.find(id => !lockedIds.has(id)) || group.ids[0];
                                }
                                openChest(idToSend, 'OPEN_KEY');
                            };

                            if (tooltipDataHtml) {
                                btn.setAttribute('onmouseenter', 'window.showGlobalTooltip ? window.showGlobalTooltip(this) : null');
                                btn.setAttribute('onmouseleave', 'window.hideGlobalTooltip ? window.hideGlobalTooltip() : null');
                            }

                            btn.innerHTML = `
                                ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                <span class="material-symbols-outlined" style="color: ${rarityColor}; font-size: 1.5rem;">vpn_key</span>
                                <div class="flex flex-col items-start leading-tight">
                                    <span style="color: ${rarityColor}; font-weight: bold; font-size: 0.9em;">${group.name}</span>
                                    <span style="color: ${rarityColor}; opacity: 0.8; font-size: 0.8em;">+${group.bonus}% butin</span>
                                </div>
                                <div class="ml-1 bg-black/50 rounded px-1.5 py-0.5 text-xs font-bold" style="color: #cbd5e1;">${groupLocks}/${group.ids.length}</div>
                            `;

                            keysContainer.appendChild(btn);
                        });
                        const btnKey = document.getElementById('btnOpenChestKey');
                        if (btnKey) btnKey.classList.add('hidden');
                    }
                }
            } else if (data.currentRoom.type === 'EVENT') {
                const subType = data.currentRoom.eventSubType || 'ALTERATION';

                if (subType === 'ALTERATION') {
                    if (data.currentRoom.alterationType === 'AUTEL') {
                        icon.textContent = 'hand_bones';
                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-orange';
                        title.textContent = 'Autel Sacrificiel';
                    } else {
                        icon.textContent = 'blur_on';
                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-violet-500';
                        title.textContent = 'Altération';
                    }
                    desc.innerHTML = data.currentRoom.eventText || 'Une force mystérieuse vous entoure...';

                    btnOpen.classList.add('hidden');

                    if (!data.roomEventCompleted && data.currentRoom.alterationType !== 'RIEN') {
                        delete lootContainer.dataset.filled;
                        let btnText = "Toucher";
                        let warningHtml = '';
                        let specialItemHtml = '';
                        if (data.currentRoom.alterationType === 'VIE_XP') {
                            let hp = data.currentRoom.alterationHpAmount || 0;
                            let xp = data.currentRoom.alterationExpAmount || 0;

                            warningHtml = '';
                            if (hp < 0) {
                                warningHtml += `<div class="text-error text-center reward-notice" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">favorite</span> <strong>Coût :</strong> ${hp} PV (par héros)</div>`;
                            } else if (hp > 0) {
                                warningHtml += `<div class="text-success text-center reward-notice" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">favorite</span> <strong>Gain :</strong> +${hp} PV (par héros)</div>`;
                            }

                            if (xp > 0) {
                                warningHtml += `<div class="text-center text-sky-medium reward-notice" style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Récompense :</strong> +${xp} XP de Voie (par héros)</div>`;
                            } else if (xp < 0) {
                                warningHtml += `<div class="text-error text-center reward-notice" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Perte :</strong> ${xp} XP de Voie (par héros)</div>`;
                            }

                            if (data.currentRoom.alterationRewardType === 'SPIRITUAL_XP') {
                                specialItemHtml = `<div class="text-center text-purple reward-notice" style="background: rgba(192, 132, 252, 0.1); border: 1px solid rgba(192, 132, 252, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Récompense :</strong> Vous obtiendrez +${data.currentRoom.alterationSpiritualXpReward || 0} XP Spirituel !</div>`;
                            } else if (data.currentRoom.alterationRewardType === 'SPECIAL_ITEM') {
                                let badge = data.currentRoom.alterationSpecialItemReward ? createAnomalyBadgeHtml(data.currentRoom.alterationSpecialItemReward) : '"Item"';
                                specialItemHtml = `<div class="text-center reward-notice" style="color: #d946ef; background: rgba(217, 70, 239, 0.1); border: 1px solid rgba(217, 70, 239, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Récompense :</strong> Vous obtiendrez l'item spécial ${badge}</div>`;
                            }

                            btnText = `Accepter`;
                        } else if (data.currentRoom.alterationType === 'ITEM') {
                            btnText = `Donner l'item et Toucher`;
                            let reqBadge = data.currentRoom.alterationRequiredItem ? createAnomalyBadgeHtml(data.currentRoom.alterationRequiredItem) : '"spécial"';
                            warningHtml = `<div class="text-error text-center reward-notice" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">warning</span> <strong>Attention :</strong> L'item ${reqBadge} sera définitivement détruit de l'inventaire.</div>`;

                            let rewType = 'SPIRITUAL_XP'; // ITEM alteration always gives spiritual XP in the backend

                            if (rewType === 'SPIRITUAL_XP') {
                                specialItemHtml = `<div class="text-center text-sky-medium reward-notice" style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Récompense :</strong> Vous obtiendrez +${data.currentRoom.alterationSpiritualXpReward || 0} XP Spirituel !</div>`;
                            } else if (rewType === 'SPECIAL_ITEM') {
                                let badge = data.currentRoom.alterationSpecialItemReward ? createAnomalyBadgeHtml(data.currentRoom.alterationSpecialItemReward) : '"Item"';
                                specialItemHtml = `<div class="text-center reward-notice" style="color: #d946ef; background: rgba(217, 70, 239, 0.1); border: 1px solid rgba(217, 70, 239, 0.3);"><span class="material-symbols-outlined align-middle icon-sm">star</span> <strong>Récompense :</strong> Vous obtiendrez l'item spécial ${badge}</div>`;
                            }

                            specialItemHtml += `<div class="text-center mt-4 w-full" id="itemAlterationCheckContainer">
                                <span class="material-symbols-outlined spin">sync</span> Vérification de votre inventaire...
                            </div>`;
                            globalFetch('/api/anomalies').then(res => {
                                if (!res.ok) throw new Error("API responded with " + res.status);
                                return res.json();
                            }).then(anomalies => {
                                if (!Array.isArray(anomalies)) anomalies = [];
                                const container = document.getElementById('itemAlterationCheckContainer');
                                if (!container) return;
                                const reqItem = data.currentRoom.alterationRequiredItem;
                                const ownsItem = anomalies.some(a => a.name === reqItem);
                                if (!ownsItem) {
                                    container.innerHTML = `<div id="itemAlterationMissingText" class="font-bold text-error bg-error-soft text-center" style="padding: 0.5rem; border-radius: 8px;">Vous ne possédez pas cet item.</div>`;
                                } else {
                                    container.innerHTML = '';
                                }
                            }).catch(err => {
                                console.error(err);
                                const container = document.getElementById('itemAlterationCheckContainer');
                                if (container) container.innerHTML = `<div class="text-error">Erreur lors du chargement de l'inventaire.</div>`;
                            });
                        } else if (data.currentRoom.alterationType === 'AUTEL') {
                            btnText = `Sacrifier l'Objet`;
                            let spColor = getSpiritualiteColor(data.currentRoom.altarRequiredSpirituality);
                            warningHtml = `<div class="text-center" style="color: ${spColor}; font-size: 0.85rem; margin-top: 0.5rem; background: ${spColor}1A; padding: 0.5rem; border-radius: 6px; border: 1px solid ${spColor}4D;"><span class="material-symbols-outlined align-middle icon-sm">warning</span> <strong>Offrande :</strong> Cet autel réclame le sacrifice d'un <strong>Magique</strong> de spiritualité <strong>${data.currentRoom.altarRequiredSpirituality}</strong>.</div>`;

                            let altarRewardHtml = '';
                            if (data.currentRoom.altarRewardType === 'GOLD') {
                                altarRewardHtml = `<div class="font-bold text-center" style="color: #fbbf24; margin-top: 0.5rem; background: rgba(251, 191, 36, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.3);"><span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; margin-right: 0.2rem;">paid</span> <strong>Récompense :</strong> +<span id="altarDynamicRewardValue" data-type="GOLD" data-base-value="${data.currentRoom.altarRewardValue}">${data.currentRoom.altarRewardValue}</span> Or</div>`;
                            } else if (data.currentRoom.altarRewardType === 'XP') {
                                altarRewardHtml = `<div class="font-bold text-center" style="color: #38bdf8; margin-top: 0.5rem; background: rgba(56, 189, 248, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3);"><span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; margin-right: 0.2rem;">star</span> <strong>Récompense :</strong> +<span id="altarDynamicRewardValue" data-type="XP" data-base-value="${data.currentRoom.altarRewardValue}">${data.currentRoom.altarRewardValue}</span> XP de Spiritualité (par héros)</div>`;
                            } else if (data.currentRoom.altarRewardType === 'ITEM') {
                                const eq = data.currentRoom.altarRewardEquipment;
                                if (eq) {
                                    const rarityColors = { 'COMMUN': '#94a3b8', 'INHABITUEL': '#22c55e', 'RARE': '#3b82f6', 'MYTHIQUE': '#f97316', 'LEGENDAIRE': '#eab308', 'EPIQUE': '#ef4444', 'RELIQUE': '#a855f7', 'MAUDIT': '#7f1d1d' };
                                    const rarityColor = getRarityColor(eq.rarity);
                                    const tooltipDataHtml = typeof window.getEquipmentTooltipHTML === 'function' ? window.getEquipmentTooltipHTML(eq) : '';
                                    const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';
                                    const slotInfo = typeof getSlotInfo === 'function' ? getSlotInfo(eq) : { icon: 'help' };
                                    const eqIcon = slotInfo.icon;
                                    const sName = typeof eq.slot === 'object' ? eq.slot?.name : eq.slot;
                                    const flipStyle = (sName === 'CASQUE' || eq.category === 'HELMET' || eq.type === 'HELMET') ? 'transform: rotateX(180deg);' : '';
                                    altarRewardHtml = `<div class="flex items-center justify-center flex-wrap" style="margin-top: 0.5rem; background: rgba(192, 132, 252, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.3);"><span style="color: #cbd5e1; margin-right: 0.5rem;"><strong>Récompense :</strong></span> <span class="material-symbols-outlined align-middle" style="color: ${slotInfo.color || rarityColor}; font-size: 1.2rem; margin-right: 4px; ${flipStyle}">${eqIcon}</span> <span class="font-bold relative" ${tooltipAttrs} style="color: ${rarityColor}; cursor: help; border-bottom: 1px dashed ${rarityColor};">${eq.name}${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}</span> <span class="text-sm font-bold" id="altarDropChance" style="margin-left: 0.5rem;"></span></div>`;
                                } else {
                                    altarRewardHtml = `<div class="font-bold text-center" style="color: #c084fc; margin-top: 0.5rem; background: rgba(192, 132, 252, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.3);"><span class="material-symbols-outlined align-middle" style="font-size: 1.1rem; margin-right: 0.2rem;">star</span> <strong>Récompense :</strong> Équipement mystère</div>`;
                                }
                            }
                            warningHtml += altarRewardHtml;

                            specialItemHtml = `<div class="text-center mt-4 w-full" id="altarAnomalySelectContainer">
                                <span class="material-symbols-outlined spin">sync</span> Chargement de vos objets magiques...
                            </div>`;

                            globalFetch('/api/anomalies').then(res => {
                                if (!res.ok) throw new Error("API responded with " + res.status);
                                return res.json();
                            }).then(anomalies => {
                                if (!Array.isArray(anomalies)) {
                                    anomalies = [];
                                    console.warn("Expected array for anomalies but got", anomalies);
                                }
                                const uniqueNames = new Set();
                                const anomalyCounts = {};
                                anomalies.forEach(a => {
                                    anomalyCounts[a.name] = (anomalyCounts[a.name] || 0) + 1;
                                });
                                const eligible = anomalies.filter(a => {
                                    if (!a.magicObject || a.spiritualite !== data.currentRoom.altarRequiredSpirituality) return false;
                                    if (uniqueNames.has(a.name)) return false;
                                    uniqueNames.add(a.name);
                                    a.stock = anomalyCounts[a.name];
                                    return true;
                                });
                                const container = document.getElementById('altarAnomalySelectContainer');
                                if (!container) return;

                                if (eligible.length === 0) {
                                    container.innerHTML = `<div id="altarAlterationMissingText" class="font-bold text-error bg-error-soft text-center" style="padding: 0.5rem; border-radius: 8px;">Vous ne possédez aucun objet magique de cette spiritualité.</div>`;
                                    return;
                                }

                                const btn = document.getElementById('btnAcceptAlteration');
                                if (btn) {
                                    btn.removeAttribute('disabled');
                                    btn.classList.remove('disabled');
                                }

                                const first = eligible[0];
                                let firstCatIcon = first.category ? (getCategoryIcon(first.category)) : 'star';
                                let selectHtml = `
                                <div class="custom-select-wrapper" id="altarAnomalySelectWrapper" style="max-width: 350px; margin: 0 auto; z-index: 100;">
                                    <div class="custom-select-trigger" onclick="document.getElementById('altarAnomalySelectWrapper').classList.toggle('open')" style="padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid ${spColor}; text-align: left; background: rgba(0,0,0,0.5);">
                                        <span class="cs-label" id="altarAnomalySelectLabel">
                                            <span class="material-symbols-outlined cs-icon" style="color: ${spColor};">${firstCatIcon}</span> ${first.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${first.level || 1}) (Stock: ${first.stock || 1})</span>
                                        </span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options">
                                `;
                                eligible.forEach(a => {
                                    let catIcon = a.category ? (getCategoryIcon(a.category)) : 'star';
                                    selectHtml += `<div class="custom-option" onclick="document.getElementById('altarAnomalySelectLabel').innerHTML = this.innerHTML; document.getElementById('altarAnomalySelect').value = '${a.id}'; document.getElementById('altarAnomalySelectWrapper').classList.remove('open'); if(window.updateAltarDropChance) window.updateAltarDropChance(${a.level || 1});"><span class="material-symbols-outlined cs-icon" style="color: ${spColor};">${catIcon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1}) (Stock: ${a.stock || 1})</span></div>`;
                                });
                                selectHtml += `
                                    </div>
                                </div>
                                <input type="hidden" id="altarAnomalySelect" value="${first.id}">
                                `;
                                window.updateAltarDropChance = function (level) {
                                    const el = document.getElementById('altarDropChance');
                                    if (el) {
                                        let baseChance = Math.round(90 - 65 * Math.exp(-0.64 * (level - 1)));
                                        let rarityMult = 1.0;
                                        if (data && data.currentRoom && data.currentRoom.altarRewardEquipment && data.currentRoom.altarRewardEquipment.rarity) {
                                            switch (data.currentRoom.altarRewardEquipment.rarity) {
                                                case "COMMUN": rarityMult = 1.5; break;
                                                case "INHABITUEL": rarityMult = 1.3; break;
                                                case "RARE": rarityMult = 1.15; break;
                                                case "MYTHIQUE": rarityMult = 1.0; break;
                                                case "EPIQUE": rarityMult = 0.85; break;
                                                case "LEGENDAIRE": rarityMult = 0.70; break;
                                                case "RELIQUE": rarityMult = 0.55; break;
                                                case "MAUDIT": rarityMult = 0.40; break;
                                            }
                                        }
                                        let chance = Math.round(baseChance * rarityMult);
                                        if (chance > 100) chance = 100;
                                        if (chance < 1) chance = 1;

                                        el.textContent = `(${chance}%)`;
                                        el.style.color = chance >= 85 ? '#10b981' : (chance >= 55 ? '#fbbf24' : '#ef4444');
                                    }
                                    const valEl = document.getElementById('altarDynamicRewardValue');
                                    if (valEl) {
                                        let multiplier = level === 1 ? 1.0 : (level === 2 ? 1.6 : 2.4);
                                        let baseVal = parseInt(valEl.getAttribute('data-base-value'), 10);
                                        let finalVal = Math.round(baseVal * multiplier);

                                        if (valEl.getAttribute('data-type') === 'XP') {
                                            let aliveHeroes = 1;
                                            if (data && data.players) {
                                                aliveHeroes = data.players.filter(p => p.healthCurrent > 0).length;
                                            }
                                            if (aliveHeroes < 1) aliveHeroes = 1;
                                            finalVal = Math.floor(finalVal / aliveHeroes);
                                        }

                                        valEl.textContent = finalVal;
                                    }
                                };
                                container.innerHTML = selectHtml;
                                if (window.updateAltarDropChance) window.updateAltarDropChance(first.level || 1);
                            }).catch(err => {
                                console.error("Failed to load anomalies:", err);
                                const container = document.getElementById('altarAnomalySelectContainer');
                                if (container) {
                                    container.innerHTML = `<div class="font-bold text-error bg-error-soft">Erreur lors du chargement de vos objets magiques.</div>`;
                                }
                                const btn = document.getElementById('btnAcceptAlteration');
                                if (btn) {
                                    btn.disabled = true;
                                    btn.classList.add('disabled');
                                }
                            });
                        }

                        btnCont.classList.add('hidden');
                        lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');

                        let disabledState = '';
                        let acceptSelectedStyle = '';
                        let passSelectedStyle = '';
                        let waitingHtml = '';

                        let totalUsers = 1;
                        if (data.players && data.players.length > 0) {
                            totalUsers = new Set(data.players.map(p => p.ownerUsername)).size;
                        }

                        let acceptVotes = 0;
                        let passVotes = 0;
                        let isMulti = totalUsers > 1;

                        if (data.playerRoomChoices) {
                            for (let user in data.playerRoomChoices) {
                                const choice = data.playerRoomChoices[user];
                                if (choice.actionType === 'PASS') {
                                    passVotes++;
                                } else {
                                    acceptVotes++;
                                }
                            }

                            const myChoice = data.playerRoomChoices[pageState.currentUsername];
                            if (myChoice) {
                                if (myChoice.actionType === 'PASS') {
                                    passSelectedStyle = 'box-shadow: 0 0 15px rgba(255,255,255,0.4); background: rgba(255,255,255,0.15) !important; border-color: rgba(255,255,255,0.8) !important;';
                                } else {
                                    acceptSelectedStyle = 'box-shadow: 0 0 15px rgba(168, 85, 247, 0.6); background: rgba(168, 85, 247, 0.25) !important; border-color: rgba(168, 85, 247, 0.8) !important;';
                                }
                                if (isMulti) {
                                    waitingHtml = `<div class="text-center w-full mt-2 text-sm text-sky-medium animate-pulse">En attente des autres joueurs...</div>`;
                                }
                            }
                        }

                        let acceptVoteText = isMulti ? ` <span style="opacity: 0.7; font-size: 0.9em;">(${acceptVotes}/${totalUsers})</span>` : '';
                        let passVoteText = isMulti ? ` <span style="opacity: 0.7; font-size: 0.9em;">(${passVotes}/${totalUsers})</span>` : '';

                        lootContainer.innerHTML = `
                            <div class="flex-col items-center w-full" style="max-width: 600px;">
                                ${warningHtml}
                                ${specialItemHtml}
                                <div class="btn-row">
                                    <button type="button" id="btnAcceptAlteration" class="btn" style="flex: 1; max-width: 250px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${acceptSelectedStyle}" ${disabledState} onclick="event.preventDefault(); acceptAlteration();">${btnText}${acceptVoteText}</button>
                                    <button type="button" class="btn text-muted" onclick="event.preventDefault(); acceptAlteration(true);" style="flex: 1; max-width: 250px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${passSelectedStyle}">Ignorer et passer${passVoteText}</button>
                                </div>
                                ${waitingHtml}
                            </div>
                        `;
                    } else {
                        btnCont.classList.remove('hidden');
                        btnCont.textContent = 'Continuer';

                        if (!lootContainer.dataset.filled) {
                            lootContainer.dataset.filled = 'true';
                            lootContainer.innerHTML = ''; // Clear previous content

                            renderAndAnimateXPCards('eventLootContainer', data.players, 'alt', false);

                            let gainedItemsHtml = '';
                            let othersLootHtml = '';

                            if (data.interactionResults) {
                                for (let user in data.interactionResults) {
                                    let logs = data.interactionResults[user];
                                    let userOtherItemsHtml = '';

                                    logs.forEach(log => {
                                        let logHtml = '';

                                        if (log.includes("Effet appliqu")) {
                                            const effetMatch = log.match(/Effet appliqu. : ([-+0-9]+) PV et ([-+0-9]+) XP/);
                                            if (effetMatch) {
                                                const pv = parseInt(effetMatch[1]);
                                                const xp = parseInt(effetMatch[2]);
                                                let pvHtml = pv !== 0 ? `<span class="${pv > 0 ? 'text-success' : 'text-error'} font-bold">${pv > 0 ? '+' : ''}${pv} PV</span>` : '';
                                                let xpHtml = xp !== 0 ? `<span class="${xp > 0 ? 'text-xp' : 'text-error'} font-bold">${xp > 0 ? '+' : ''}${xp} XP</span>` : '';
                                                let both = [pvHtml, xpHtml].filter(Boolean).join(' et ');
                                                if (both) {
                                                    logHtml = `
                                                        <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.2); padding: 0.8rem 1rem; border-radius: 8px; color: #e2e8f0; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                            ${both}
                                                        </div>
                                                    `;
                                                }
                                            }
                                        } else if (log.includes("a offert l'équipement") || log.includes("a offert l'\u00e9quipement")) {
                                            const equipMatch = log.match(/a offert l'.quipement : (.*) !/) || log.match(/a offert l'.quipement : (.*) \(ajout. au groupe\)\./) || log.match(/a offert l'.quipement : (.*) \(envoy. au coffre\)\./);
                                            if (equipMatch) {
                                                const eqName = equipMatch[1].trim();
                                                logHtml = `
                                                    <div class="flex-center relative" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #10b98180; padding: 0.8rem 1rem; border-radius: 8px; color: #10b981; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        <span class="material-symbols-outlined" style="color: #10b981;">shield</span> <span style="border-bottom: 1px dashed #10b981;">${eqName}</span>
                                                    </div>
                                                `;
                                            }
                                        } else if (log.includes("a offert l'anomalie") || log.includes("Objet trouv")) {
                                            const itemNameMatch = log.match(/Objet trouv. : (.*?) \(/) || log.match(/a offert l'anomalie : (.*)\./);
                                            if (itemNameMatch) {
                                                const eqName = itemNameMatch[1].trim();
                                                let eq = null;
                                                let an = null;

                                                if (Array.isArray(window.allAnomaliesCombat)) {
                                                    an = window.allAnomaliesCombat.find(a => a.name === eqName);
                                                }
                                                if (!an && data.currentRoom && data.currentRoom.altarRewardEquipment && data.currentRoom.altarRewardEquipment.name === eqName) {
                                                    eq = data.currentRoom.altarRewardEquipment;
                                                }

                                                let slotIcon = 'help';
                                                let slotColor = '#94a3b8';
                                                let rarityColor = '#d946ef';
                                                let tooltipDataHtml = '';

                                                if (eq) {
                                                    rarityColor = typeof getRarityColor === 'function' ? getRarityColor(eq.rarity) : '#eab308';
                                                    slotColor = rarityColor;
                                                    const slotInfo = typeof getSlotInfo === 'function' ? getSlotInfo(eq) : { icon: 'star' };
                                                    slotIcon = slotInfo.icon;
                                                    if (typeof window.getEquipmentTooltipHTML === 'function') {
                                                        tooltipDataHtml = window.getEquipmentTooltipHTML(eq);
                                                    }
                                                } else if (an && typeof getCategoryIcon === 'function') {
                                                    slotIcon = an.category ? getCategoryIcon(an.category) : 'star';
                                                    slotColor = typeof getSpiritualiteColor === 'function' ? getSpiritualiteColor(an.spiritualite) : '#d946ef';
                                                    rarityColor = slotColor;
                                                    if (typeof window.getAnomalyTooltipHTML === 'function') {
                                                        tooltipDataHtml = window.getAnomalyTooltipHTML(an, true);
                                                    }
                                                } else if (an) {
                                                    slotIcon = 'star';
                                                    slotColor = '#d946ef';
                                                    rarityColor = slotColor;
                                                }

                                                const extraClass = '';
                                                const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';

                                                logHtml = `
                                                    <div class="flex-center relative" ${tooltipAttrs} style="cursor: ${tooltipDataHtml ? 'help' : 'default'}; background: rgba(0, 0, 0, 0.4); border: 1px solid ${rarityColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${rarityColor}; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                                        <span class="material-symbols-outlined${extraClass}" style="color: ${slotColor};">${slotIcon}</span> <span style="${tooltipDataHtml ? `border-bottom: 1px dashed ${rarityColor};` : ''}">${eqName}</span>
                                                    </div>
                                                `;
                                            }
                                        } else if (log.includes("sacrifi")) {
                                            const sacMatch = log.match(/sacrifi. l'item : (.*) !/) || log.match(/sacrifi. l'anomalie : (.*)\./);
                                            if (sacMatch) {
                                                const itemName = sacMatch[1].trim();
                                                logHtml = `
                                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #ef444480; padding: 0.8rem 1rem; border-radius: 8px; color: #ef4444; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        <span class="material-symbols-outlined" style="color: #ef4444;">local_fire_department</span> -1 ${itemName}
                                                    </div>
                                                `;
                                            }
                                        } else if (log.includes("offert") && log.includes("Or")) {
                                            const orMatch = log.match(/offert (\d+) Or/);
                                            if (orMatch) {
                                                const amount = orMatch[1];
                                                logHtml = `
                                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #eab30880; padding: 0.8rem 1rem; border-radius: 8px; color: #eab308; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        <span class="material-symbols-outlined" style="color: #eab308;">toll</span> +${amount} Or
                                                    </div>
                                                `;
                                            }
                                        } else if (log.includes("XP de Spiritualit")) {
                                            const spXpMatch = log.match(/accorde (\d+) XP de Spiritualit./);
                                            const spXpLossMatch = log.match(/retire (\d+) XP de Spiritualit./);
                                            if (spXpMatch) {
                                                const amount = spXpMatch[1];
                                                logHtml = `
                                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #8b5cf680; padding: 0.8rem 1rem; border-radius: 8px; color: #8b5cf6; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        <span class="material-symbols-outlined" style="color: #8b5cf6;">auto_awesome</span> +${amount} Sp-XP
                                                    </div>
                                                `;
                                            } else if (spXpLossMatch) {
                                                const amount = spXpLossMatch[1];
                                                logHtml = `
                                                    <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid #ef444480; padding: 0.8rem 1rem; border-radius: 8px; color: #ef4444; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                        <span class="material-symbols-outlined" style="color: #ef4444;">auto_awesome</span> -${amount} Sp-XP
                                                    </div>
                                                `;
                                            }
                                        }

                                        if (logHtml) {
                                            if (user === pageState.currentUsername) {
                                                gainedItemsHtml += logHtml;
                                            } else {
                                                userOtherItemsHtml += logHtml;
                                            }
                                        }
                                    });

                                    if (user !== pageState.currentUsername && userOtherItemsHtml) {
                                        othersLootHtml += `
                                            <div class="mb-4">
                                                <div class="text-sm text-muted mb-2 font-bold uppercase tracking-wider text-center" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Loot de <span style="color: #10b981;">${user}</span></div>
                                                <div class="flex flex-col gap-3">
                                                    ${userOtherItemsHtml}
                                                </div>
                                            </div>
                                        `;
                                    }
                                }
                            }

                            if (gainedItemsHtml) {
                                const wrapper = document.createElement('div');
                                wrapper.className = 'btn-row';
                                wrapper.style.flexWrap = 'wrap';
                                wrapper.style.marginTop = '1rem';
                                wrapper.innerHTML = gainedItemsHtml;
                                lootContainer.appendChild(wrapper);
                            }

                            const existingRightPanel = document.getElementById('othersLootPanel');
                            if (existingRightPanel) existingRightPanel.remove();

                            if (othersLootHtml) {
                                const rightPanel = document.createElement('div');
                                rightPanel.id = 'othersLootPanel';
                                rightPanel.className = 'bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col overflow-y-auto custom-scrollbar shrink-0';
                                rightPanel.style.width = '280px';
                                rightPanel.style.maxHeight = '100%';
                                rightPanel.innerHTML = othersLootHtml;
                                const wrapperEl = document.getElementById('eventModalWrapper');
                                if (wrapperEl) wrapperEl.appendChild(rightPanel);
                            }
                        }

                        lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                    }
                } else if (subType === 'RENCONTRE') {
                    icon.textContent = 'storefront';
                    icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-success';
                    title.textContent = 'Rencontre';
                    desc.innerHTML = data.currentRoom.eventText || 'Un marchand ambulant vous interpelle...';

                    btnOpen.classList.add('hidden');
                    btnCont.classList.remove('hidden');
                    btnCont.textContent = 'Continuer';
                    btnCont.onclick = nextRoom;

                    if (data.currentRoom.lootTable && data.currentRoom.lootTable.length > 0) {
                        lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                        lootContainer.innerHTML = '';

                        data.currentRoom.lootTable.forEach((entry, idx) => {
                            if (!data.availableMerchantItems || !data.availableMerchantItems.includes(idx)) return;

                            let nameHtml = '';
                            let rawName = '';
                            let iconHtml = '';
                            let rarityColor = '#10b981';

                            if (entry.specialItemName) {
                                nameHtml = entry.specialItemName;
                                rawName = entry.specialItemName;
                                rarityColor = '#d946ef';
                                let catIcon = 'star';
                                if (Array.isArray(window.allAnomaliesCombat)) {
                                    const an = window.allAnomaliesCombat.find(a => a.name === entry.specialItemName);
                                    if (an) {
                                        rarityColor = getSpiritualiteColor(an.spiritualite);
                                        catIcon = an.category ? (getCategoryIcon(an.category)) : 'star';
                                    }
                                }
                                iconHtml = `<span class="material-symbols-outlined" style="color: ${rarityColor}; font-size: 1.2rem;">${catIcon}</span>`;
                            } else if (entry.equipment) {
                                const eq = entry.equipment;
                                const slotInfo = getSlotInfo(eq);
                                rarityColor = getRarityColor(eq.rarity);
                                const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
                                nameHtml = eq.name;
                                rawName = eq.name;
                                if (eq.specialEffect && eq.specialEffect !== 'NONE') {
                                    nameHtml += window.getEffectInfoIconHtml(eq.specialEffect);
                                }
                                iconHtml = `<span class="material-symbols-outlined${extraClass}" style="color: ${slotInfo.color}; font-size: 1.2rem;">${slotInfo.icon}</span>`;
                            }

                            let priceHtml = '';
                            const goldPrice = entry.priceGold != null ? entry.priceGold : (entry.probability || 0);

                            if (goldPrice > 0) {
                                priceHtml += `<span class="flex-center" style="color: #f59e0b; gap: 0.3rem;"><span class="material-symbols-outlined text-lg">monetization_on</span>${goldPrice}</span>`;
                            }
                            if (entry.priceSpecialItemName) {
                                let priceColor = '#d946ef';
                                let priceIcon = 'star';
                                let priceTooltipHtml = '';
                                if (Array.isArray(window.allAnomaliesCombat)) {
                                    const anPrice = window.allAnomaliesCombat.find(a => a.name === entry.priceSpecialItemName);
                                    if (anPrice) {
                                        priceColor = getSpiritualiteColor(anPrice.spiritualite);
                                        priceIcon = anPrice.category ? (getCategoryIcon(anPrice.category)) : 'star';
                                        if (typeof getAnomalyTooltipHTML === 'function') {
                                            priceTooltipHtml = getAnomalyTooltipHTML(anPrice, entry.priceSpecialItemName);
                                        }
                                    }
                                }
                                const tooltipAttrs = priceTooltipHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';
                                priceHtml += `<span class="flex-center relative" ${tooltipAttrs} style="color: ${priceColor}; gap: 0.3rem; margin-left: ${goldPrice > 0 ? '0.8rem' : '0'}; cursor: help; border-bottom: 1px dashed ${priceColor};"><span class="material-symbols-outlined text-lg">${priceIcon}</span>1x ${entry.priceSpecialItemName}${priceTooltipHtml ? `<template class="tooltip-data">${priceTooltipHtml}</template>` : ''}</span>`;
                            }

                            if (priceHtml === '') {
                                priceHtml = `<span class="flex-center text-success" style="gap: 0.3rem;"><span class="material-symbols-outlined text-lg">sell</span>Gratuit</span>`;
                            }

                            let isPurchased = false;
                            if (data.purchasedMerchantItems && data.purchasedMerchantItems.includes(idx)) {
                                isPurchased = true;
                            }

                            let canAfford = true;
                            const myPlayer = (data.players && data.players.length > 0) ? (data.players.find(p => p.ownerUsername === pageState.currentUsername) || data.players[0]) : null;
                            let playerGold = myPlayer ? (myPlayer.gold || 0) : 0;
                            if (goldPrice > 0 && playerGold < goldPrice) {
                                canAfford = false;
                            }
                            if (entry.priceSpecialItemName) {
                                let qte = 0;
                                if (window.myGlobalAnomalies && Array.isArray(window.myGlobalAnomalies)) {
                                    qte = window.myGlobalAnomalies.filter(a => a.name === entry.priceSpecialItemName).length;
                                }
                                if (qte < 1) {
                                    canAfford = false;
                                }
                            }

                            let buttonHtml = '';
                            if (isPurchased) {
                                buttonHtml = `<button class="flex-center" id="btn_buy_${idx}" type="button" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 1rem; cursor: not-allowed; gap: 0.5rem; opacity: 0.7;">
                                                  <span class="material-symbols-outlined icon-md">remove_shopping_cart</span>
                                                  Vendu
                                              </button>`;
                            } else if (!canAfford) {
                                buttonHtml = `<button class="flex-center" id="btn_buy_${idx}" type="button" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 1rem; cursor: not-allowed; gap: 0.5rem; transition: all 0.2s ease;" title="Fonds insuffisants">
                                                  <span class="material-symbols-outlined icon-md">shopping_cart</span>
                                                  Acheter
                                              </button>`;
                            } else {
                                let specialItemNameArg = entry.priceSpecialItemName ? `'${entry.priceSpecialItemName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}'` : 'null';
                                buttonHtml = `<button class="flex-center" id="btn_buy_${idx}" type="button" onclick="openBuyModal(${idx}, '${rawName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${goldPrice}, ${specialItemNameArg})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 1rem; cursor: pointer; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
                                                  <span class="material-symbols-outlined icon-md">shopping_cart</span>
                                                  Acheter
                                              </button>`;
                            }

                            let tooltipDataHtml = '';
                            if (entry.equipment) {
                                tooltipDataHtml = window.getEquipmentTooltipHTML(entry.equipment);
                            } else if (entry.specialItemName) {
                                let tooltipTitle = 'Objet Spécial';
                                let tooltipDesc = 'Cet objet aura un effet unique !';
                                let tColor = '#d946ef';
                                let anomLevel = 1;
                                let anomSpiri = 'Inconnu';
                                let catIcon2 = 'star';
                                let isMagic = false;

                                if (Array.isArray(window.allAnomaliesCombat)) {
                                    const an = window.allAnomaliesCombat.find(a => a.name === entry.specialItemName);
                                    if (an) {
                                        tooltipDataHtml = getAnomalyTooltipHTML(an, entry.specialItemName);
                                    }
                                }
                            }

                            const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';
                            const extraAttrs = entry.specialItemName ? `data-color="${rarityColor}"` : '';

                            lootContainer.innerHTML += `
                                <div class="flex-center relative" ${tooltipAttrs} ${extraAttrs} onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';" style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${rarityColor}50; padding: 1rem; border-radius: 12px; justify-content: space-between; gap: 1rem; width: 48%; min-width: 400px; flex: 1 1 auto; max-width: 500px; transition: all 0.2s ease;">
                                    ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                    <div class="flex-center gap-4" >
                                        <div class="flex-center" style="width: 48px; height: 48px; border-radius: 8px; background: rgba(0,0,0,0.5); justify-content: center; border: 1px solid ${rarityColor}30;">
                                            ${iconHtml}
                                        </div>
                                        <div class="flex-col" style="gap: 0.2rem;">
                                            <span style="color: ${rarityColor}; font-weight: 700; font-size: 1.1rem; text-shadow: 0 0 10px ${rarityColor}40;">${nameHtml}</span>
                                            <div class="flex-center text-sm" style="font-weight: 600; background: rgba(0,0,0,0.3); padding: 0.2rem 0.6rem; border-radius: 4px; width: fit-content; margin-top: 0.2rem;">
                                                ${priceHtml}
                                            </div>
                                        </div>
                                    </div>
                                    ${buttonHtml}
                                </div>
                            `;
                        });
                    } else {
                        lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');
                    }
                } else if (subType === 'PIEGE') {
                    icon.textContent = 'warning';
                    icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-error';
                    title.textContent = 'Piège !';

                    let trapDesc = data.currentRoom.eventText || 'Un piège se déclenche !';

                    if (data.roomEventCompleted) {
                        trapDesc += `<br><br><span class="text-success">🪢 Piège évité grâce à une Corde !</span>`;
                        desc.innerHTML = trapDesc;
                        btnOpen.classList.add('hidden');
                        btnCont.classList.remove('hidden');
                        btnCont.textContent = 'Continuer';
                        lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');
                    } else {
                        let trapDetails = [];
                        if (data.currentRoom.trapDamageHpPct > 0) trapDetails.push(`<span style="color:#ef4444;">${data.currentRoom.trapDamageHpPct}% PV Max</span>`);
                        if (data.currentRoom.trapDamageManaPct > 0) trapDetails.push(`<span style="color:#38bdf8;">${data.currentRoom.trapDamageManaPct}% Mana Max</span>`);
                        if (data.currentRoom.trapDamageHpFixed > 0) trapDetails.push(`<span style="color:#ef4444;">${data.currentRoom.trapDamageHpFixed} PV</span>`);
                        if (data.currentRoom.trapDamageManaFixed > 0) trapDetails.push(`<span style="color:#38bdf8;">${data.currentRoom.trapDamageManaFixed} Mana</span>`);

                        // Legacy support
                        if (trapDetails.length === 0 && data.currentRoom.trapAmount > 0) {
                            if (data.currentRoom.trapType === 'PV') {
                                trapDetails.push(`<span style="color:#ef4444;">${data.currentRoom.trapAmount} PV</span>`);
                            } else if (data.currentRoom.trapType === 'MANA') {
                                trapDetails.push(`<span style="color:#38bdf8;">${data.currentRoom.trapAmount} Mana</span>`);
                            }
                        }

                        if (trapDetails.length > 0) {
                            trapDesc += `<br><br>⚠️ Perte de : ` + trapDetails.join(' et ');
                        }

                        desc.innerHTML = trapDesc;
                        btnOpen.classList.add('hidden');

                        if (data.currentRoom.trapHasRopeOption) {
                            const ropes = data.activeConsumables ? data.activeConsumables.filter(eq => eq.consumableCategory === 'CORDE') : [];
                            const hasRope = ropes.length > 0;

                            // Multi-player voting state
                            let totalUsers = 1;
                            if (data.players && data.players.length > 0) {
                                totalUsers = new Set(data.players.filter(p => p.healthCurrent > 0 && p.ownerUsername).map(p => p.ownerUsername)).size;
                            }
                            const isMulti = totalUsers > 1;

                            let ropeVotes = 0;
                            let acceptVotes = 0;
                            let ropeSelectedStyle = '';
                            let acceptSelectedStyle = '';
                            let waitingHtml = '';

                            if (data.playerRoomChoices) {
                                for (let user in data.playerRoomChoices) {
                                    const choice = data.playerRoomChoices[user];
                                    if (choice.actionType === 'ROPE') {
                                        ropeVotes++;
                                    } else if (choice.actionType === 'ACCEPT') {
                                        acceptVotes++;
                                    }
                                }

                                const myChoice = data.playerRoomChoices[pageState.currentUsername];
                                if (myChoice) {
                                    if (myChoice.actionType === 'ROPE') {
                                        ropeSelectedStyle = 'box-shadow: 0 0 15px rgba(245, 158, 11, 0.6); background: rgba(245, 158, 11, 0.25) !important; border-color: rgba(245, 158, 11, 0.8) !important;';
                                    } else if (myChoice.actionType === 'ACCEPT') {
                                        acceptSelectedStyle = 'box-shadow: 0 0 15px rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.15) !important; border-color: rgba(255, 255, 255, 0.8) !important;';
                                    }
                                    if (isMulti) {
                                        waitingHtml = `<div class="text-center w-full mt-2 text-sm text-sky-medium animate-pulse">En attente des autres joueurs...</div>`;
                                    }
                                }
                            }

                            let ropeVoteText = isMulti ? ` <span class="ready-counter" style="opacity: 0.7; font-size: 0.9em;">(${ropeVotes}/${totalUsers})</span>` : '';
                            let acceptVoteText = isMulti ? ` <span class="ready-counter" style="opacity: 0.7; font-size: 0.9em;">(${acceptVotes}/${totalUsers})</span>` : '';

                            let ropeButtonHtml;
                            if (hasRope) {
                                ropeButtonHtml = `<button type="button" class="btn" onclick="event.preventDefault(); useRope(null, 'ROPE');" style="flex: 1; max-width: 250px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${ropeSelectedStyle}"><span class="material-symbols-outlined text-[1.1rem] align-middle mr-1">gesture</span> Utiliser une Corde${ropeVoteText}</button>`;
                            } else {
                                ropeButtonHtml = `<button type="button" class="btn" disabled title="Vous n'avez pas de corde" style="flex: 1; max-width: 250px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: not-allowed; opacity: 0.5; transition: all 0.2s ease;"><span class="material-symbols-outlined text-[1.1rem] align-middle mr-1">gesture</span> Utiliser une Corde</button>`;
                            }

                            lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                            lootContainer.innerHTML = `
                                <div class="flex-col items-center w-full">
                                    <div class="flex-col items-center w-full" style="display:flex;">
                                        ${ropeButtonHtml}
                                    </div>
                                    <div class="btn-row" style="margin-top: 1rem;">
                                        <button type="button" class="btn text-muted" onclick="event.preventDefault(); useRope(null, 'ACCEPT');" style="flex: 1; max-width: 250px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${acceptSelectedStyle}">Subir le piège et passer${acceptVoteText}</button>
                                    </div>
                                    ${waitingHtml}
                                </div>
                            `;
                            btnCont.classList.add('hidden');
                        } else {
                            btnCont.classList.remove('hidden');
                            btnCont.textContent = 'Subir le piège et passer';
                            lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');
                        }
                    }
                } else if (subType === 'PORTE_ETRANGE') {
                    icon.textContent = 'door_front';
                    title.textContent = 'Porte Étrange';

                    if (data.roomEventCompleted) {
                        title.textContent = 'Rien...';
                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-slate'; // Gris foncé pour bien marquer "Rien"
                        icon.style.textShadow = 'none';
                        desc.innerHTML = data.currentRoom.eventText || 'Vous avez ouvert la porte... mais il n\'y a absolument rien derrière.';
                        btnOpen.classList.add('hidden');
                        btnCont.classList.remove('hidden');
                        btnCont.textContent = 'Continuer';
                        btnCont.onclick = nextRoom;

                        let anomalyHtml = '';
                        if (data.combatLog) {
                            for (let i = data.combatLog.length - 1; i >= Math.max(0, data.combatLog.length - 5); i--) {
                                const log = data.combatLog[i];
                                const match = log.match(/a obtenu l'item : (.*?) !/);
                                if (match && Array.isArray(window.allAnomaliesCombat)) {
                                    const eqName = match[1];
                                    const an = window.allAnomaliesCombat.find(a => a.name === eqName);
                                    if (an) {
                                        icon.textContent = 'crown';
                                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-gold';
                                        title.textContent = 'Trésor';

                                        const spColor = getSpiritualiteColor(an.spiritualite);
                                        const catIcon = an.category ? getCategoryIcon(an.category) : 'star';
                                        let tooltipDataHtml = '';
                                        if (typeof getAnomalyTooltipHTML === 'function') {
                                            tooltipDataHtml = getAnomalyTooltipHTML(an, eqName);
                                        }
                                        const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';

                                        anomalyHtml += `
                                            <div class="flex-center relative" ${tooltipAttrs} style="cursor: ${tooltipDataHtml ? 'help' : 'default'}; background: rgba(0, 0, 0, 0.4); border: 1px solid ${spColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${spColor}; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; transform: scale(0.8);">
                                                ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                                <span class="material-symbols-outlined" style="color: ${spColor};">${catIcon}</span> <span style="${tooltipDataHtml ? `border-bottom: 1px dashed ${spColor};` : ''}">${eqName}</span>
                                            </div>
                                        `;
                                    }
                                }
                            }
                        }

                        if (anomalyHtml) {
                            lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                            lootContainer.innerHTML = `
                                <div class="btn-row" style="flex-wrap: wrap;">
                                    ${anomalyHtml}
                                </div>
                            `;
                        } else {
                            lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');
                        }
                    } else {
                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-gold'; // Jaune
                        desc.innerHTML = data.currentRoom.eventText || 'Une porte mystérieuse se dresse devant vous...';
                        btnOpen.classList.add('hidden');
                        btnCont.classList.remove('hidden');
                        btnCont.textContent = 'Passer la porte';
                        btnCont.onclick = openStrangeDoor;
                        lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');

                        // Show door outcomes info
                        if (data.currentRoom.doorOutcomes) {
                            let outcomes;
                            try {
                                outcomes = typeof data.currentRoom.doorOutcomes === 'string' ? JSON.parse(data.currentRoom.doorOutcomes) : data.currentRoom.doorOutcomes;
                            } catch (e) { outcomes = []; }

                            if (outcomes.length > 0) {
                                lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                                lootContainer.innerHTML = `
                                    <div class="text-muted text-center text-sm w-full" >
                                        <span class="text-gold font-semibold">Que se cache-t-il derrière ?</span><br>
                                        Le résultat sera révélé si vous passez la porte...
                                    </div>
                                `;
                            }
                        }
                    }
                }
            }

            if (typeof window.renderOverlayInventory === 'function') {
                window.renderOverlayInventory('eventOverlayInventoryList');
                window.renderOverlayInventory('combatMainInventoryList');
            }
            if (typeof window.renderOverlayMap === 'function') {
                window.renderOverlayMap('eventMapList');
                window.renderOverlayMap('combatMainMapList');
            }
            overlay.classList.add('show');
        }
    }

    // Logs
    const logContainer = document.getElementById('combatLog');
    logContainer.innerHTML = '';
    data.combatLog.forEach(log => {
        const div = document.createElement('div');
        let text = log;
        let isUseless = false;

        data.players.forEach(p => {
            // Un peu de regex pour ne pas remplacer dans les attributs HTML si p.name correspond
            text = text.replace(new RegExp(`\\b${p.name}\\b`, 'g'), `<span class="log-player-name">${p.name}</span>`);
        });

        // 1. Turn Separator
        if (text.startsWith("--- Tour de ")) {
            div.className = 'log-entry log-turn-separator';
            text = text.replace(/--- Tour de (.*?) ---/, '🏁 <strong>Tour de $1</strong>');
        }
        // 2. Damage (Crit or Normal)
        else if (text.includes("inflige") && text.includes("dégâts")) {
            if (text.includes("Coup Critique")) {
                div.className = 'log-entry log-damage-crit';
                // Couvre 'dégâts', 'dégâts magiques', etc. derrière le chiffre
                text = text.replace(/inflige (\d+) dégâts(.*?)(?=\s|\(|<|$)/g, 'inflige <span class="log-val-crit">$1</span> dégâts$2');
                text = text.replace("Coup Critique", '<span class="log-crit-text">Coup Critique</span>');
            } else if (text.includes("magiques")) {
                div.className = 'log-entry log-damage-magic';
                text = text.replace(/inflige (\d+) dégâts magiques/g, 'inflige <span class="log-val-magic">$1</span> dégâts <span class="log-val-magic">magiques</span>');
            } else if (text.includes("physiques")) {
                div.className = 'log-entry log-damage-physic';
                text = text.replace(/inflige (\d+) dégâts physiques/g, 'inflige <span class="log-val-physic">$1</span> dégâts <span class="log-val-physic">physiques</span>');
            } else if (text.includes("bruts")) {
                div.className = 'log-entry log-damage-brut';
                text = text.replace(/inflige (\d+) dégâts bruts/g, 'inflige <span class="log-val-brut">$1</span> dégâts <span class="log-val-brut">bruts</span>');
            } else {
                div.className = 'log-entry log-damage-normal';
                text = text.replace(/inflige (\d+) dégâts/g, 'inflige <span class="log-val-dmg">$1</span> dégâts');
            }
        }
        // 3. Subit des dégâts (Dot, pièges...)
        else if (text.includes("subit") && text.includes("dégâts")) {
            if (text.includes("magiques")) {
                div.className = 'log-entry log-damage-magic';
                text = text.replace(/subit (\d+) dégâts magiques/g, 'subit <span class="log-val-magic">$1</span> dégâts <span class="log-val-magic">magiques</span>');
            } else if (text.includes("physiques")) {
                div.className = 'log-entry log-damage-physic';
                text = text.replace(/subit (\d+) dégâts physiques/g, 'subit <span class="log-val-physic">$1</span> dégâts <span class="log-val-physic">physiques</span>');
            } else if (text.includes("bruts")) {
                div.className = 'log-entry log-damage-brut';
                text = text.replace(/subit (\d+) dégâts bruts/g, 'subit <span class="log-val-brut">$1</span> dégâts <span class="log-val-brut">bruts</span>');
            } else if (text.includes("Brûlure")) {
                div.className = 'log-entry log-damage-burn';
                text = text.replace(/subit (\d+) dégâts de Brûlure/g, 'subit <span class="log-val-burn">$1</span> dégâts de <span class="log-val-burn">Brûlure</span>');
            } else if (text.includes("Poison")) {
                div.className = 'log-entry log-damage-poison';
                text = text.replace(/subit (\d+) dégâts de Poison/g, 'subit <span class="log-val-poison">$1</span> dégâts de <span class="log-val-poison">Poison</span>');
            } else {
                div.className = 'log-entry log-damage-normal';
                text = text.replace(/subit (\d+) dégâts/g, 'subit <span class="log-val-dmg">$1</span> dégâts');
            }
        }
        // 4. Healing (HP)
        else if (text.includes("soigné") || (text.includes("récupère") && text.includes("PV"))) {
            div.className = 'log-entry log-heal-hp';
            text = text.replace(/(\d+) PV/g, '<span class="log-val-hp">$1 PV</span>');
        }
        // 5. Healing (Mana)
        else if (text.toLowerCase().includes("mana") && (text.includes("récupère") || text.includes("régénère"))) {
            div.className = 'log-entry log-heal-mana';
            text = text.replace(/(\d+) (?:points de )?[mM]ana/g, '<span class="log-val-mana">$1 Mana</span>');
            // Gérer aussi "Mana actuelle : X" pour cette ligne
            text = text.replace(/Mana actuelle : (\d+)/g, 'Mana actuelle : <span class="log-val-mana">$1</span>');
        }
        // 6. Deaths
        else if (text.includes("succombe") || text.includes("terrassé") || text.includes("mort") || text.includes("est vaincu")) {
            div.className = 'log-entry log-death';
        }
        // 7. Dodge / Miss
        else if (text.includes("esquive") || text.includes("rate") || text.includes("bloque")) {
            div.className = 'log-entry log-miss';
        }
        // 8. Default
        else {
            div.className = 'log-entry log-generic';
        }

        // Global value replacements
        text = text.replace(/Init: (\d+)/g, 'Init: <span class="log-val-init">$1</span>');
        text = text.replace(/Vitesse: (\d+)/g, 'Vitesse: <span class="log-val-speed">$1</span>');
        text = text.replace(/PV restants : (\d+)/g, 'PV restants : <span class="log-val-hp">$1</span>');
        text = text.replace(/Vie actuelle : (\d+)/g, 'Vie actuelle : <span class="log-val-hp">$1</span>');
        text = text.replace(/soigné de (\d+) points/g, 'soigné de <span class="log-val-hp">$1</span> points');
        text = text.replace(/reçoit un bouclier de (\d+)/g, 'reçoit un <span class="log-val-shield">bouclier</span> de <span class="log-val-shield">$1</span>');

        const getStatClass = (statName) => {
            let cssClass = 'log-val-stat'; // Default generic stat color
            const lower = statName.toLowerCase();
            if (lower.includes("brûlure")) cssClass = 'log-val-burn';
            else if (lower.includes("poison")) cssClass = 'log-val-poison';
            else if (lower.includes("vitesse")) cssClass = 'log-val-speed';
            else if (lower.includes("critique")) cssClass = 'log-val-crit';
            else if (lower.includes("mana")) cssClass = 'log-val-mana';
            else if (lower.includes("vie") || lower.includes("soins")) cssClass = 'log-val-hp';
            else if (lower.includes("armure")) cssClass = 'log-val-armor';
            else if (lower.includes("résistance")) cssClass = 'log-val-resist';
            else if (lower.includes("bouclier")) cssClass = 'log-val-shield';
            else if (lower.includes("magique") || lower.includes("puissance")) cssClass = 'log-val-magic';
            else if (lower.includes("physique") || lower.includes("force")) cssClass = 'log-val-physic';
            else if (lower.includes("brut")) cssClass = 'log-val-brut';
            return cssClass;
        };

        // Buffs & Gains
        text = text.replace(/\+(\d+) de ([a-zA-Zéèàçûîôâê]+)/gi, function (match, amount, statName) {
            const cssClass = getStatClass(statName);
            return `+<span class="${cssClass}">${amount}</span> de <span class="${cssClass}">${statName}</span>`;
        });

        // Passifs spécifiques
        text = text.replace(/\+(\d+)% d'armure/gi, '+<span class="log-val-armor">$1%</span> d\'<span class="log-val-armor">armure</span>');
        text = text.replace(/\+(\d+)% de résistance magique/gi, '+<span class="log-val-resist">$1%</span> de <span class="log-val-resist">résistance magique</span>');
        text = text.replace(/\-(\d+)% sur le coût des sorts/gi, '-<span class="log-val-mana">$1%</span> sur le <span class="log-val-mana">coût des sorts</span>');
        text = text.replace(/\+(\d+) Vitesse/gi, '+<span class="log-val-speed">$1</span> <span class="log-val-speed">Vitesse</span>');

        // Passifs Voies & Spiritualités (Mots clés et Phrases)
        // Destruction
        text = text.replace(/🔥 \[Destruction\]/g, '<span style="color:#ef4444;font-weight:bold;">🔥 [Destruction]</span>');
        text = text.replace(/chaleur/gi, '<span style="color:#f97316;font-weight:bold;">chaleur</span>');

        // Création
        text = text.replace(/🌱 \[Création\]/g, '<span style="color:#10b981;font-weight:bold;">🌱 [Création]</span>');
        text = text.replace(/✨ \[Création\]/g, '<span style="color:#10b981;font-weight:bold;">✨ [Création]</span>');
        text = text.replace(/bourgeon/gi, '<span style="color:#10b981;font-weight:bold;">bourgeon</span>');
        text = text.replace(/instantané/gi, '<span style="color:#a855f7;font-weight:bold;">instantané</span>');

        // Sûreté
        text = text.replace(/stocke (\d+) points de sûreté/gi, 'stocke <span class="log-val-shield">$1</span> <span class="log-val-shield">points de sûreté</span>');
        text = text.replace(/\(Sûreté\)/g, '(<span class="log-val-shield">Sûreté</span>)');
        text = text.replace(/\(Sûreté passive\)/g, '(<span class="log-val-shield">Sûreté passive</span>)');
        text = text.replace(/\+(\d+)% de critique/gi, '+<span class="log-val-crit">$1%</span> de <span class="log-val-crit">critique</span>');

        // Raison
        text = text.replace(/de la Raison/g, 'de la <span class="log-val-magic">Raison</span>');
        text = text.replace(/\(Raison\)/g, '(<span class="log-val-magic">Raison</span>)');
        text = text.replace(/cumuls de Vitesse/g, 'cumuls de <span class="log-val-speed">Vitesse</span>');

        // Violence
        text = text.replace(/stacks de Violence/g, 'stacks de <span class="log-val-brut">Violence</span>');

        // Karma (Spiritualité)
        text = text.replace(/✨ Harmonie Karmique/gi, '<span style="color:#d946ef;font-weight:bold;">✨ Harmonie Karmique</span>');
        text = text.replace(/✨ Le Karma/gi, '<span style="color:#d946ef;font-weight:bold;">✨ Le Karma</span>');
        text = text.replace(/✨ Équilibre Karmique Parfait atteint !/gi, '<span style="color:#d946ef;font-weight:bold;">✨ Équilibre Karmique Parfait atteint !</span>');
        text = text.replace(/🌑 Le Karma/gi, '<span style="color:#64748b;font-weight:bold;">🌑 Le Karma</span>');
        text = text.replace(/🌕 Le Karma/gi, '<span style="color:#fcd34d;font-weight:bold;">🌕 Le Karma</span>');
        text = text.replace(/🌗 Le Karma/gi, '<span style="color:#a1a1aa;font-weight:bold;">🌗 Le Karma</span>');
        text = text.replace(/🌗 Acte de rééquilibrage/gi, '<span style="color:#a1a1aa;font-weight:bold;">🌗 Acte de rééquilibrage</span>');
        text = text.replace(/💥 Le Karma/gi, '<span style="color:#ef4444;font-weight:bold;">💥 Le Karma</span>');
        text = text.replace(/⏳ Le Karma/gi, '<span style="color:#f59e0b;font-weight:bold;">⏳ Le Karma</span>');
        text = text.replace(/⚖️/gi, '<span style="color:#d946ef;font-weight:bold;">⚖️</span>');

        // Jauge et Fractions
        text = text.replace(/(\d+)\/100/g, '<span style="color:#ef4444;font-weight:bold;">$1/100</span>');
        text = text.replace(/Jauge: ([\-\d]+)/gi, 'Jauge: <span style="color:#d946ef;font-weight:bold;">$1</span>');

        // Effets sur la durée (traductions)
        text = text.replace(/Soins sur la durée/g, '<span class="log-val-hp">Soins sur la durée</span>');
        text = text.replace(/Régénération de mana sur la durée/g, '<span class="log-val-mana">Régénération de mana sur la durée</span>');
        text = text.replace(/Dégâts sur la durée/g, '<span class="log-val-dmg">Dégâts sur la durée</span>');

        text = text.replace(/\(Critique\)/g, '<span class="log-crit-text">(Critique)</span>');
        text = text.replace(/fixe: ([\-\+\d\.]+)/g, 'fixe: <span style="color:#fbbf24;font-weight:bold;">$1</span>');
        text = text.replace(/mult: ([\-\+\d\.]+)/g, 'mult: <span style="color:#fbbf24;font-weight:bold;">$1</span>');

        // Tous les effets de buffs/debuffs
        text = text.replace(/effet sur (.*?) \(/g, function (match, statName) {
            return `effet sur <span class="${getStatClass(statName)}">${statName}</span> (`;
        });

        if (!isUseless) {
            div.innerHTML = text;
            logContainer.appendChild(div);
        }
    });

    logContainer.scrollTop = logContainer.scrollHeight;

    // Check finish
    if (data.finished) {
        showResult(data);
    } else if (isActiveEnemy) {
        // Disable UI
        document.getElementById('btnAttack').disabled = true;
        const btnEnd = document.getElementById('btnEndTurn');
        if (btnEnd) btnEnd.disabled = true;
        const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
        spellButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.classList.add('disabled');
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
                    const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/auto-turn`, { method: 'POST' });
                    const newData = await res.json();
                    updateUI(newData);
                } catch (e) {
                    console.error('Auto-turn error:', e);
                    // Retry: re-fetch current state to unblock UI
                    try {
                        const retryRes = await globalFetch(`/api/pve/combat/${pageState.sessionId}/resume`, { method: 'POST' });
                        const retryData = await retryRes.json();
                        updateUI(retryData);
                    } catch (e2) {
                        console.error('Auto-turn recovery failed:', e2);
                        // Last resort: re-enable buttons so user isn't stuck
                        const btnAttack = document.getElementById('btnAttack');
                        if (btnAttack) { btnAttack.disabled = false; btnAttack.classList.remove('disabled'); }
                        const btnEnd = document.getElementById('btnEndTurn');
                        if (btnEnd) { btnEnd.disabled = false; }
                        const spellButtons = document.querySelectorAll('.spell-btn, .filter-chip');
                        spellButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('disabled'); btn.classList.remove('disabled'); });
                        window.showNotif("Erreur de synchronisation. Veuillez réessayer.", true);
                    }
                }
            }, 600); // Fetch next turn
        }, 500); // Pause before attack animation
    } else {
        // Player turn: enable buttons
        const btnAttack = document.getElementById('btnAttack');
        if (btnAttack) {
            const isChanneling = data.activePlayer && data.activePlayer.remainingChannelingTurns > 0;
            const canAttack = data.activePlayer && !data.activePlayer.banalSpellCastThisTurn && !isChanneling;
            btnAttack.disabled = !canAttack;
            if (!canAttack) {
                btnAttack.classList.add('disabled');
            } else {
                btnAttack.classList.remove('disabled');
            }
        }

        const btnEnd = document.getElementById('btnEndTurn');
        if (btnEnd) btnEnd.disabled = false;
    }

    processNewDeathLogs(data.combatLog);
    updateNextRoomButtons(data);
}

function updateNextRoomButtons(data) {
    if (!data.multi) return;

    const activeUsers = new Set();
    if (data.players) {
        data.players.forEach(p => {
            if (p.healthCurrent > 0 && !(data.fledUsernames && data.fledUsernames.includes(p.ownerUsername))) {
                if (p.ownerUsername) activeUsers.add(p.ownerUsername);
            }
        });
    }
    const totalActive = activeUsers.size;
    if (totalActive <= 1) return; // Only show for 2+ active players

    const readyUsers = data.readyForNextRoomUsers || [];
    const readyCount = readyUsers.length;
    const isMeReady = readyUsers.includes(pageState.currentUsername);

    document.querySelectorAll('button[onclick*="nextRoom"]').forEach(btn => {
        let origText = btn.dataset.origText || btn.textContent.trim().replace(/\s*\(\d+\/\d+\)$/, '');
        btn.dataset.origText = origText;

        let newText = isMeReady ? `En attente (${readyCount}/${totalActive})` : `${origText} (${readyCount}/${totalActive})`;
        btn.textContent = newText;
        btn.disabled = isMeReady;
        btn.classList.toggle('waiting-ready', isMeReady);
        if (isMeReady) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
        btn.style.opacity = isMeReady ? '0.5' : '1';
    });
}

export function getBossChallengesHtml(activeChallenges) {
    if (!activeChallenges || activeChallenges.length === 0) return '';

    let html = '';
    activeChallenges.forEach(chall => {
        let challLabel = '';
        if (chall.type === 'MAX_HEROES') challLabel = `Max Héros : ${chall.value}`;
        else if (chall.type === 'MAX_HP_LOSS_PCT') challLabel = `Max PV perdus : ${chall.value}%`;
        else if (chall.type === 'MIN_HP_LOSS_PCT') challLabel = `Min PV perdus : ${chall.value}%`;

        let rewLabel = '';
        if (chall.rewardType === 'BONUS_SPIRIT_XP') rewLabel = `+${chall.rewardValue} XP Spirit.`;
        else if (chall.rewardType === 'BONUS_GOLD') rewLabel = `+${chall.rewardValue} Or`;
        else if (chall.rewardType === 'REGEN_HP_MANA') rewLabel = `+${chall.rewardValue}% Régénération`;
        else if (chall.rewardType === 'EXTRA_LOOT') rewLabel = `+${chall.rewardValue} Loot Sup.`;

        const tooltipContent = `
            <div style="font-size: 0.85rem;">
                <div class="text-amber-400 font-bold mb-1">Challenge : ${challLabel}</div>
                <div class="text-green-400">Récompense : ${rewLabel}</div>
                ${chall.failed ? '<div class="text-error font-bold mt-2">❌ Challenge Échoué</div>' : '<div class="text-success font-bold mt-2">✅ Challenge En cours</div>'}
            </div>
        `;
        const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

        const badgeStyle = chall.failed ? 'border-color: rgba(239, 68, 68, 0.4); color: #ef4444; background: rgba(239, 68, 68, 0.1); text-decoration: line-through;' : 'border-color: rgba(245, 158, 11, 0.4); color: #f59e0b; background: rgba(245, 158, 11, 0.1);';
        const iconStyle = chall.failed ? 'text-error' : 'text-warning';
        const iconName = chall.failed ? 'cancel' : 'military_tech';

        html += `
            <div class="sandbox-status-badge buff relative" ${tooltipAttrs} style="cursor: help; ${badgeStyle}">
                <span class="material-symbols-outlined text-sm ${iconStyle}">${iconName}</span>
                <span>${challLabel}</span>
                <template class="tooltip-data">
                    <div class="flex-col-xs">
                        ${tooltipContent}
                    </div>
                </template>
            </div>
        `;
    });

    return html;
}

export function getBossBuffsHtml(c) {
    if (!c.passiveStates) return '';

    let html = '';
    const hasArmorBuff = (c.activeBuffs || c.buffs || []).some(b => b.statAffected === 'ARMURE' && b.flatValue === c.passiveStates['BOSS_BUFF_ARMOR']);
    const hasResistBuff = (c.activeBuffs || c.buffs || []).some(b => b.statAffected === 'RESISTANCE' && b.flatValue === c.passiveStates['BOSS_BUFF_RESIST']);

    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    function makeBadge(val, colorHex, rgbStr, icon, label, description) {
        if (!val) return '';
        return `<span ${tooltipAttrs} style="cursor: help; font-size: 0.75rem; background: rgba(${rgbStr}, 0.15); color: ${colorHex}; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(${rgbStr}, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;">` +
            `<template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${colorHex}; border-bottom: 1px solid ${colorHex}; padding-bottom: 4px;">${label}</div>` +
            `<div style="color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${description}</div></template>` +
            `<span class="material-symbols-outlined text-sm">${icon}</span>${label}</span>`;
    }

    if (c.passiveStates['BOSS_BUFF_HP']) html += makeBadge(c.passiveStates['BOSS_BUFF_HP'], '#10b981', '16, 185, 129', 'favorite', `+${c.passiveStates['BOSS_BUFF_HP']}% PV`, `Le Boss possède ${c.passiveStates['BOSS_BUFF_HP']}% de points de vie maximum supplémentaires.`);
    if (c.passiveStates['BOSS_BUFF_SHIELD'] && c.shieldTotal > 0) html += makeBadge(c.passiveStates['BOSS_BUFF_SHIELD'], '#38bdf8', '56, 189, 248', 'shield', `+${c.passiveStates['BOSS_BUFF_SHIELD']}% Boucl.`, `Le Boss commence le combat avec un bouclier égal à ${c.passiveStates['BOSS_BUFF_SHIELD']}% de ses PV max.`);
    if (c.passiveStates['BOSS_BUFF_ARMOR'] && hasArmorBuff) html += makeBadge(c.passiveStates['BOSS_BUFF_ARMOR'], '#8b5cf6', '139, 92, 246', 'security', `+${c.passiveStates['BOSS_BUFF_ARMOR']} Arm.`, `Le Boss possède ${c.passiveStates['BOSS_BUFF_ARMOR']} points d'Armure.`);
    if (c.passiveStates['BOSS_BUFF_RESIST'] && hasResistBuff) html += makeBadge(c.passiveStates['BOSS_BUFF_RESIST'], '#d946ef', '217, 70, 239', 'health_and_safety', `+${c.passiveStates['BOSS_BUFF_RESIST']} Rés.`, `Le Boss possède ${c.passiveStates['BOSS_BUFF_RESIST']} points de Résistance magique.`);
    if (c.passiveStates['BOSS_BUFF_BURN']) html += makeBadge(c.passiveStates['BOSS_BUFF_BURN'], '#ef4444', '239, 68, 68', 'local_fire_department', `Brûlure`, `Inflige l'altération Brûlure à la cible lors d'une attaque réussie.`);
    if (c.passiveStates['BOSS_BUFF_POISON']) html += makeBadge(c.passiveStates['BOSS_BUFF_POISON'], '#22c55e', '34, 197, 94', 'pest_control', `Poison`, `Inflige l'altération Poison à la cible lors d'une attaque réussie.`);

    if (c.passiveStates['BOSS_BUFF_DAMAGE_REFLECTION']) html += makeBadge(c.passiveStates['BOSS_BUFF_DAMAGE_REFLECTION'], '#f43f5e', '244, 63, 94', 'all_out', `Miroir Épineux`, `Renvoie ${c.passiveStates['BOSS_BUFF_DAMAGE_REFLECTION']}% des dégâts subis directement à l'attaquant.`);
    if (c.passiveStates['BOSS_BUFF_PHYSICAL_SHROUD']) html += makeBadge(c.passiveStates['BOSS_BUFF_PHYSICAL_SHROUD'], '#cbd5e1', '203, 213, 225', 'blur_on', `Voile Éthéré`, `Réduit les dégâts physiques subis de ${c.passiveStates['BOSS_BUFF_PHYSICAL_SHROUD']}%.`);
    if (c.passiveStates['BOSS_BUFF_MAGIC_SHROUD']) html += makeBadge(c.passiveStates['BOSS_BUFF_MAGIC_SHROUD'], '#818cf8', '129, 140, 248', 'blur_off', `Silencieux`, `Réduit les dégâts magiques subis de ${c.passiveStates['BOSS_BUFF_MAGIC_SHROUD']}%.`);
    if (c.passiveStates['BOSS_BUFF_FRENZY']) html += makeBadge(c.passiveStates['BOSS_BUFF_FRENZY'], '#ef4444', '239, 68, 68', 'swords', `Rage Sang.`, `Augmente tous les dégâts infligés de ${c.passiveStates['BOSS_BUFF_FRENZY']}%.`);
    if (c.passiveStates['BOSS_BUFF_LIFESTEAL_AURA']) html += makeBadge(c.passiveStates['BOSS_BUFF_LIFESTEAL_AURA'], '#dc2626', '220, 38, 38', 'water_drop', `Vampirisme`, `Soigne le Boss de ${c.passiveStates['BOSS_BUFF_LIFESTEAL_AURA']}% des dégâts qu'il inflige.`);
    if (c.passiveStates['BOSS_BUFF_REGENERATION']) html += makeBadge(c.passiveStates['BOSS_BUFF_REGENERATION'], '#34d399', '52, 211, 153', 'healing', `Régén.`, `Soigne le Boss de ${c.passiveStates['BOSS_BUFF_REGENERATION']}% de ses PV Max au début de son tour.`);
    if (c.passiveStates['BOSS_BUFF_MANA_OPPRESSION']) html += makeBadge(c.passiveStates['BOSS_BUFF_MANA_OPPRESSION'], '#a855f7', '168, 85, 247', 'do_not_disturb', `O. Magique`, `Réduit le mana actuel des joueurs de ${c.passiveStates['BOSS_BUFF_MANA_OPPRESSION']}% à chaque début de tour.`);
    if (c.passiveStates['BOSS_BUFF_FREEZE_ON_HIT']) html += makeBadge(c.passiveStates['BOSS_BUFF_FREEZE_ON_HIT'], '#22d3ee', '34, 211, 238', 'ac_unit', `Gel`, `Réduit la vitesse de la cible de ${c.passiveStates['BOSS_BUFF_FREEZE_ON_HIT']} lors d'une attaque subie ou infligée.`);

    return html;
}

export function generateFighterHtml(c, isHero, skipBadges = false, forcedHp = null, forcedMana = null, turnOrderNum = null) {
    const hpToRender = forcedHp !== null && !isNaN(forcedHp) ? forcedHp : c.healthCurrent;
    const hpPct = c.healthMax > 0 ? Math.max(0, Math.min(100, (hpToRender / c.healthMax) * 100)) : 0;
    let hpLabel = `${hpToRender} / ${c.healthMax}`;
    let computedShieldTotal = c.shieldTotal || 0;
    if (!computedShieldTotal && c.activeShields && Array.isArray(c.activeShields)) {
        computedShieldTotal = c.activeShields.reduce((acc, s) => acc + (s.amount || 0), 0);
    }
    let shieldBadgeHtml = '';
    if (computedShieldTotal > 0) {
        let shieldEntriesHtml = '';
        if (c.activeShields && Array.isArray(c.activeShields)) {
            const shieldEntries = c.activeShields.map(s => `
                <div class="flex justify-center items-center gap-1 w-full text-sm">
                    <span class="material-symbols-outlined icon-sm-shrink text-base text-sky-300">security</span>
                    <span class="font-bold text-white">[${s.sourceName || 'Inconnu'}]</span>
                    <span class="text-sky-medium">Bouclier</span>
                    <span class="text-subtle">→ ${s.amount} PV absorpt. (${s.duration} tours)</span>
                </div>
            `);
            if (shieldEntries.length > 0) {
                shieldEntriesHtml = `<template class="tooltip-data"><div class="flex-col-xs">${shieldEntries.join('')}</div></template>`;
            }
        }
        const tooltipAttrs = shieldEntriesHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';
        shieldBadgeHtml = `<span class="sandbox-status-badge buff relative" style="cursor: help; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 0.1rem 0.4rem; font-size: 0.75rem; border-radius: 4px; border: 1px solid rgba(56,189,248,0.4); display: flex; align-items: center; gap: 0.2rem;" ${tooltipAttrs}>
            <span class="material-symbols-outlined" style="font-size: 1.1em;">security</span>
            <span style="font-weight: 600;">+${computedShieldTotal}</span>
            ${shieldEntriesHtml}
        </span>`;
    }

    const manaToRender = forcedMana !== null && !isNaN(forcedMana) ? forcedMana : c.manaCurrent;
    const manaPct = c.manaMax > 0 ? Math.max(0, Math.min(100, (manaToRender / c.manaMax) * 100)) : 0;
    let manaHtml = `
        <div class="gauge-container mt-4" style="text-align: left;">
            <div class="gauge-label"><span style="display:flex; align-items:center;">Mana</span><span class="mana-text-val">${manaToRender} / ${c.manaMax}</span></div>
            <div class="gauge-track"><div class="gauge-fill mana" style="width: ${manaPct}%;"></div></div>
        </div>`;

    const getEffectiveStat = (statName) => {
        let hasTotal = false;
        let base = 0;
        switch (statName) {
            case 'POWER':
                if (c.totalPower !== undefined) { base = c.totalPower; hasTotal = true; } else { base = c.power || 0; }
                break;
            case 'STRENGTH':
                if (c.totalStrength !== undefined) { base = c.totalStrength; hasTotal = true; } else { base = c.strength || 0; }
                break;
            case 'ARMURE':
                if (c.totalArmor !== undefined) { base = c.totalArmor; hasTotal = true; } else { base = c.armor || 0; }
                break;
            case 'RESISTANCE':
                if (c.totalResistance !== undefined) { base = c.totalResistance; hasTotal = true; } else { base = c.resistance || 0; }
                break;
            case 'SPEED':
                if (c.totalSpeed !== undefined) { base = c.totalSpeed; hasTotal = true; } else { base = c.speed || 0; }
                break;
            case 'CRIT':
                if (c.totalCrit !== undefined) {
                    base = c.totalCrit;
                    hasTotal = true;
                } else if (c.critDerived !== null && c.critDerived !== undefined) {
                    base = c.critDerived;
                    hasTotal = true; // critDerived also includes buffs usually
                } else if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('raison')) {
                    // For Voie de la Raison, crit is based on speed. We'll handle this specially.
                    let effSpeed = getEffectiveStat('SPEED');
                    base = (c.crit || 0) + (effSpeed * 2);
                } else {
                    base = c.crit || 0;
                }
                break;
        }

        // If the backend already provided the total stat (which includes buffs/passives), return it directly.
        if (hasTotal && statName !== 'CRIT') {
            return base;
        }
        if (hasTotal && statName === 'CRIT' && c.totalCrit !== undefined) {
            return base;
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

    let statsHtml = `<div class="hero-stats-row">`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-purple">auto_awesome</span>${pui} Pui</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-rose-500">fitness_center</span>${forPhy} For</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-blue-500">shield</span>${arm} Arm</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-success">shield</span>${res} Rés</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-warning">bolt</span>${vit} Vit</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-error">gps_fixed</span>${crit}% Crit</span>`;

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('destruction')) {
        let heat = 0;
        if (c.passiveStates && c.passiveStates['destruction_heat'] !== undefined) {
            heat = c.passiveStates['destruction_heat'];
        }
        let heatDangerClass = heat >= 100 ? ' destruction-danger' : '';
        statsHtml += `<span class="hero-stat-chip chip-destruction${heatDangerClass}" title="Chaleur accumulée"><span class="material-symbols-outlined text-destruction">local_fire_department</span>${heat}/100</span>`;
    }

    if (c.voie && c.voie.nom && (c.voie.nom.toLowerCase().includes('surete') || c.voie.nom.toLowerCase().includes('sûreté'))) {
        let suretePoints = 0;
        if (c.passiveStates && c.passiveStates['surete_points'] !== undefined) {
            suretePoints = c.passiveStates['surete_points'];
        }
        statsHtml += `<span class="hero-stat-chip chip-surete" title="Points de Sûreté"><span class="material-symbols-outlined text-surete">security</span>${suretePoints}</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('violence')) {
        let insp = 0, exp = 0;
        if (c.passiveStates) {
            if (c.passiveStates['violence_inspiration'] !== undefined) insp = c.passiveStates['violence_inspiration'];
            if (c.passiveStates['violence_expiration'] !== undefined) exp = c.passiveStates['violence_expiration'];
        }
        let inspDanger = insp >= 6 ? ' violence-danger' : '';
        let expDanger = exp >= 6 ? ' violence-danger' : '';
        statsHtml += `<span class="hero-stat-chip violence-insp-chip${inspDanger}" title="Inspiration (Violence)"><span class="material-symbols-outlined violence-insp-icon">storm</span>${insp}/7 Insp</span>`;
        statsHtml += `<span class="hero-stat-chip violence-exp-chip${expDanger}" title="Expiration (Violence)"><span class="material-symbols-outlined violence-exp-icon">air</span>${exp}/7 Exp</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('raison')) {
        let raisonStacks = 0;
        if (c.passiveStates && c.passiveStates['raison_speed_stacks'] !== undefined) {
            raisonStacks = c.passiveStates['raison_speed_stacks'];
        }
        statsHtml += `<span class="hero-stat-chip chip-raison" title="Cumuls de Vitesse (Raison)"><span class="material-symbols-outlined text-raison">speed</span>${raisonStacks}</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('trahison')) {
        let baseAvail = !(c.passiveStates && c.passiveStates['trahison_used_this_turn']);
        let lowHpAvail = !(c.passiveStates && c.passiveStates['trahison_low_hp_used_this_turn']);
        let debuffAvail = !(c.passiveStates && c.passiveStates['trahison_debuff_used_this_turn']);

        let styleBase = baseAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        let styleLowHp = lowHpAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        let styleDebuff = debuffAvail ? 'border-color: rgba(168, 85, 247, 0.6); color: #c084fc;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';

        statsHtml += `<span class="hero-stat-chip" title="1er attaque physique du tour (+10% dégâts physiques)" style="${styleBase}"><span class="material-symbols-outlined" style="color: inherit;">bolt</span>+10%</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Cible < 50% PV (+20% dégâts physiques)" style="${styleLowHp}"><span class="material-symbols-outlined" style="color: inherit;">heart_broken</span>+20%</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Cible avec Débuff (+15% dégâts physiques)" style="${styleDebuff}"><span class="material-symbols-outlined" style="color: inherit;">trending_down</span>+15%</span>`;
    }

    if (c.voie && c.voie.nom && (c.voie.nom.toLowerCase().includes('création') || c.voie.nom.toLowerCase().includes('creation'))) {
        let buds = (c.passiveStates && c.passiveStates['creation_buds']) || 0;
        let hasBuds = buds > 0;
        let styleCreation = hasBuds ? 'border-color: rgba(16, 185, 129, 0.6); color: #10b981;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        statsHtml += `<span class="hero-stat-chip" title="Bourgeons : ${buds}" style="${styleCreation}"><span class="material-symbols-outlined" style="color: inherit;">yard</span>${buds}</span>`;
    }


    const hasKarma = c.hasKarma || (c.spiritualite && c.spiritualite.nom && c.spiritualite.nom.toLowerCase().includes('karma'));
    if (hasKarma) {
        let karmaLocked = c.karmaLocked || (c.passiveStates && c.passiveStates['karma_locked'] === 1);
        let karmaHarmony = c.karmaHarmony || (c.passiveStates && c.passiveStates['karma_harmony'] === 1);
        let karmaGauge = c.karmaGauge !== undefined ? c.karmaGauge : (c.passiveStates && c.passiveStates['karma_gauge'] !== undefined ? c.passiveStates['karma_gauge'] : 0);

        let karmaLockedDuration = c.passiveStates && c.passiveStates['karma_locked_duration'] !== undefined ? c.passiveStates['karma_locked_duration'] : 0;

        let borderColor, color, icon, text, title, extraClass = '';
        if (karmaLocked) {
            borderColor = 'rgba(239, 68, 68, 0.4)'; color = '#f87171'; icon = 'block';
            text = `Brisé (${karmaLockedDuration})`; title = "Karma Brisé (Voie désactivée)";
        } else if (karmaHarmony) {
            borderColor = 'rgba(100, 116, 139, 0.4)'; color = '#cbd5e1'; icon = 'brightness_medium';
            text = 'Harmonie'; title = "Karma en Harmonie";
        } else if (karmaGauge < 0) {
            borderColor = 'rgba(168, 85, 247, 0.4)'; color = '#c084fc'; icon = 'dark_mode';
            text = `${karmaGauge}/3`; title = "Karma Ténèbres";
            if (karmaGauge <= -3) extraClass = ' karma-dark-danger';
        } else if (karmaGauge > 0) {
            borderColor = 'rgba(253, 224, 71, 0.4)'; color = '#fde047'; icon = 'light_mode';
            text = `+${karmaGauge}/3`; title = "Karma Lumière";
            if (karmaGauge >= 3) extraClass = ' karma-light-danger';
        } else {
            borderColor = 'rgba(156, 163, 175, 0.4)'; color = '#9ca3af'; icon = 'all_inclusive';
            text = `0/3`; title = "Karma Neutre";
        }
        statsHtml += `<span class="hero-stat-chip${extraClass}" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    const isEsprit = c.spiritualite && c.spiritualite.nom && c.spiritualite.nom.toLowerCase().includes('esprit');
    if (isEsprit) {
        const hp = c.hpCurrent !== undefined ? c.hpCurrent : c.healthCurrent;
        const maxHp = c.hpMax !== undefined ? c.hpMax : c.healthMax;
        const canCast = hp >= maxHp * 0.20 && c.manaCurrent >= c.manaMax * 0.20;
        const color = canCast ? '#38bdf8' : '#ef4444';
        const borderColor = canCast ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        const icon = canCast ? 'blur_on' : 'block';
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

    const ameDetacheeBuff = (c.activeBuffs || c.buffs || []).find(b => b.statAffected === 'AME_DETACHEE' || b.effectType === 'AME_DETACHEE');
    if (ameDetacheeBuff) {
        const turns = ameDetacheeBuff.duration;
        statsHtml += `<span class="hero-stat-chip" title="Âme Détachée (+5 Dégâts Phys. et +40% Dégâts Phys.) - Reste ${turns} tour(s)" style="border-color: rgba(244, 63, 94, 0.4); color: #fda4af;"><span class="material-symbols-outlined" style="color: inherit;">hand_bones</span>${turns}</span>`;
    }

    statsHtml += `</div>`;

    let specialItemsHtml = '';

    let passiveBadges = '';

    let titleIconsHtml = '';
    if (c.voie && c.voie.nom) {
        const vColor = getVoieButtonColor(c.voie);
        const vIcon = ui.getVoieIcon(c.voie.nom);
        const vFull = window.state?.metaData?.voies?.find(v => v.id == c.voie.id) || c.voie;
        titleIconsHtml += `<span class="relative" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="cursor: help; display: inline-flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 1.2rem; color: ${vColor};">${vIcon}</span>
            <template class="tooltip-data">
                <div class="text-sm font-medium" style="margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.3rem; color: ${vColor};">
                    <span class="material-symbols-outlined" style="font-size:1.1rem;">${vIcon}</span>
                    ${vFull.nom}
                </div>
                <div class="text-xs" style="color: #cbd5e1; margin-bottom: 0.5rem;">${vFull.description || 'Description générique.'}</div>
                <div class="flex-start-gap text-xs" style="color: #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${vColor};">bolt</span>
                    <span class="font-italic" style="white-space: pre-wrap;">${formatRichText(vFull.passiveDescription) || 'Passif spécifique.'}</span>
                </div>
            </template>
        </span>`;
    }
    if (c.spiritualite && c.spiritualite.nom) {
        const sColor = getSpiritButtonColor(c.spiritualite);
        const sIcon = ui.getSpiritIcon(c.spiritualite.nom);
        const sFull = window.state?.metaData?.spiritualites?.find(s => s.id == c.spiritualite.id) || c.spiritualite;
        titleIconsHtml += `<span class="relative" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="cursor: help; display: inline-flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 1.2rem; color: ${sColor};">${sIcon}</span>
            <template class="tooltip-data">
                <div class="text-sm font-medium" style="margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.3rem; color: ${sColor};">
                    <span class="material-symbols-outlined" style="font-size:1.1rem;">${sIcon}</span>
                    ${sFull.nom}
                </div>
                <div class="text-xs" style="color: #cbd5e1; margin-bottom: 0.5rem;">${sFull.description || 'Description générique.'}</div>
                <div class="flex-start-gap text-xs" style="color: #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${sColor};">bolt</span>
                    <span class="font-italic" style="white-space: pre-wrap;">${formatRichText(sFull.passiveDescription) || 'Passif spécifique.'}</span>
                </div>
            </template>
        </span>`;
    }

    let channelingBadgeHtml = '';
    if (c.remainingChannelingTurns > 0) {
        let spellInfoHtml = '';
        if (c.channeledSpell) {
            spellInfoHtml = `
                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid rgba(139, 92, 246, 0.3);">
                    <div class="font-bold text-sm" style="color:#c4b5fd; margin-bottom: 0.25rem;">${c.channeledSpell.nom}</div>
                    <div style="font-size:0.8rem; line-height:1.4;">${getSpellEffectsSummaryHtml(c.channeledSpell, true)}</div>
                </div>
            `;
        }

        channelingBadgeHtml = `<div class="flex-center absolute" onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null" style="top: -10px; right: -10px; z-index: 10; cursor: help; justify-content: center; background: #1e293b; border-radius: 50%; padding: 4px; box-shadow: 0 0 10px rgba(139, 92, 246, 0.6); border: 2px solid #8b5cf6;">
            <span class="material-symbols-outlined" style="font-size: 1.5rem; color: #8b5cf6;">cyclone</span>
            <span class="flex-center font-bold absolute" style="bottom: -2px; right: -2px; background: #ef4444; color: white; font-size: 0.75rem; border-radius: 50%; width: 16px; height: 16px; justify-content: center; border: 1px solid #1e293b;">${c.remainingChannelingTurns}</span>
            <template class="tooltip-data">
                <div class="text-sm font-medium" style="margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.3rem; color: #8b5cf6;">
                    <span class="material-symbols-outlined" style="font-size:1.1rem;">cyclone</span>
                    Canalisation en cours
                </div>
                <div class="text-xs" style="color: #cbd5e1; margin-bottom: 0.5rem;">Un sort est en cours de préparation. Ses effets se déclencheront à la fin du compte à rebours.</div>
                <div class="flex-start-gap text-xs" style="color: #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #8b5cf6;">hourglass_top</span>
                    <span class="font-italic">Temps restant : ${c.remainingChannelingTurns} tour(s)</span>
                </div>
                ${spellInfoHtml}
            </template>
        </div>`;
    }

    let monsterBadgesHtml = '';
    if (!isHero) {
        monsterBadgesHtml += `<div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.5rem;">`;

        if (!skipBadges && c.passiveStates) {
            monsterBadgesHtml += getBossBuffsHtml(c);
        }

        let typeName = typeof c.monsterType === 'object' ? c.monsterType?.name : c.monsterType;
        if (typeName && typeName !== 'NORMAL') {
            const tTitle = typeof c.monsterType === 'object' ? c.monsterType.description : '';
            const tIcon = typeof c.monsterType === 'object' ? c.monsterType.icon : 'check_box_outline_blank';
            const tLabel = typeof c.monsterType === 'object' ? c.monsterType.label : typeName;
            const tColor = typeof c.monsterType === 'object' && c.monsterType.color ? c.monsterType.color : '#ef4444';
            const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

            monsterBadgesHtml += `<span class="text-error" ${tooltipAttrs} style="cursor: help; font-size: 0.75rem; background: ${tColor}20; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid ${tColor}60; font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem; color: ${tColor};"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${tColor}; border-bottom: 1px solid ${tColor}; padding-bottom: 4px;">${tLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${tTitle}</div></template><span class="material-symbols-outlined text-sm">${tIcon}</span>${tLabel}</span>`;
        }
        let behaviorName = typeof c.behavior === 'object' ? c.behavior?.name : c.behavior;
        if (behaviorName && behaviorName !== 'NORMAL') {
            const bTitle = typeof c.behavior === 'object' ? c.behavior.description : '';
            const bIcon = typeof c.behavior === 'object' ? c.behavior.icon : 'check_box_outline_blank';
            const bLabel = typeof c.behavior === 'object' ? c.behavior.label : behaviorName;
            const bColor = typeof c.behavior === 'object' && c.behavior.color ? c.behavior.color : '#f59e0b';
            const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

            monsterBadgesHtml += `<span class="text-warning" ${tooltipAttrs} style="cursor: help; font-size: 0.75rem; background: ${bColor}20; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid ${bColor}60; font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem; color: ${bColor};"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${bColor}; border-bottom: 1px solid ${bColor}; padding-bottom: 4px;">${bLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${bTitle}</div></template><span class="material-symbols-outlined text-sm">${bIcon}</span>${bLabel}</span>`;
        }
        monsterBadgesHtml += `</div>`;
    }

    let mutationsHtml = '';
    if (!isHero && c.mutations && c.mutations.length > 0) {
        mutationsHtml = `<div class="absolute" style="right: -1rem; top: 4rem; display: flex; flex-direction: column; gap: 0.6rem; z-index: 10;">`;
        c.mutations.forEach(mut => {
            const icon = mut.icon || 'pets';
            const color = mut.color || '#e879f9';
            const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';
            const mutLevel = mut.level || 1;
            mutationsHtml += `
                <div class="flex-center combat-mutation shadow-sm relative" ${tooltipAttrs} style="width: 38px; height: 38px; border-radius: 8px; background: #0f172a; justify-content: center; border: 1px solid ${color}; color: ${color}; cursor: help; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">
                    <template class="tooltip-data">
                        ${window.generateMutationTooltipHtml ? window.generateMutationTooltipHtml(mut) : ''}
                    </template>
                    <span class="material-symbols-outlined" style="font-size: 1.4rem; color: ${color};">${icon}</span>
                    <span class="absolute" style="bottom: -6px; right: -6px; background: ${color}; color: #000; font-size: 0.7rem; font-weight: 900; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 2px solid #0f172a;">${mutLevel}</span>
                </div>
            `;
        });
        mutationsHtml += `</div>`;
    }

    const rHp = c.totalRegenHp !== undefined ? c.totalRegenHp : (c.regenHp || 0);
    const rMana = c.totalRegenMana !== undefined ? c.totalRegenMana : (c.regenMana || 0);

    let hpRegenBadge = '';
    if (rHp > 0) {
        hpRegenBadge = `<span title="Régénère ${rHp} PV au début du tour" style="cursor: help; margin-left: 0.5rem; font-size: 0.7rem; background: rgba(244, 114, 182, 0.15); color: #f472b6; padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid rgba(244, 114, 182, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.15rem; vertical-align: text-bottom;"><span class="material-symbols-outlined text-sm">healing</span>${rHp} PV/t</span>`;
    } else if (rHp < 0) {
        hpRegenBadge = `<span title="Perd ${-rHp} PV au début du tour" style="cursor: help; margin-left: 0.5rem; font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.15rem; vertical-align: text-bottom;"><span class="material-symbols-outlined text-sm">bloodtype</span>${rHp} PV/t</span>`;
    }

    let manaRegenBadge = '';
    if (rMana > 0) {
        manaRegenBadge = `<span title="Régénère ${rMana} Mana au début du tour" style="cursor: help; margin-left: 0.5rem; font-size: 0.7rem; background: rgba(125, 211, 252, 0.15); color: #7dd3fc; padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid rgba(125, 211, 252, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.15rem; vertical-align: text-bottom;"><span class="material-symbols-outlined text-sm">opacity</span>${rMana} MP/t</span>`;
    } else if (rMana < 0) {
        manaRegenBadge = `<span title="Perd ${-rMana} Mana au début du tour (Famine)" style="cursor: help; margin-left: 0.5rem; font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.15rem; vertical-align: text-bottom;"><span class="material-symbols-outlined text-sm">water_drop</span>${rMana} MP/t</span>`;
    }
    let avatarHtml = isHero ? '🧙‍♂️' : '👹';
    if (isHero && c.voie && c.voie.nom) {
        const vNom = c.voie.nom.toLowerCase();
        let avatarName = '';
        if (vNom.includes('consolidation')) avatarName = 'consolidation';
        else if (vNom.includes('conviction')) avatarName = 'conviction';
        else if (vNom.includes('création') || vNom.includes('creation')) avatarName = 'creation';
        else if (vNom.includes('destruction')) avatarName = 'destruction';
        else if (vNom.includes('raison')) avatarName = 'raison';
        else if (vNom.includes('sûreté') || vNom.includes('surete')) avatarName = 'surete';
        else if (vNom.includes('trahison')) avatarName = 'trahison';
        else if (vNom.includes('violence')) avatarName = 'violence';

        if (avatarName) {
            avatarHtml = `<img src="/images/avatar/${avatarName}.png" alt="${avatarName}" style="width: 64px; height: 64px; object-fit: contain; margin-top: -12px; margin-bottom: -12px; margin-right: 0.1rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">`;
        }
    }

    let turnOrderBadgeHtml = '';
    if (turnOrderNum) {
        let hasPlayed = false;
        if (pageState && pageState.currentSessionData && pageState.currentSessionData.currentTurnIndex !== undefined) {
            hasPlayed = (turnOrderNum - 1) < pageState.currentSessionData.currentTurnIndex;
        }
        const opacity = hasPlayed ? '0.5' : '1';
        const filter = hasPlayed ? 'grayscale(1)' : 'none';

        turnOrderBadgeHtml = `<div title="Ordre de jeu : ${turnOrderNum}" style="position: absolute; top: -8px; left: -8px; width: 28px; height: 28px; background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid ${isHero ? '#38bdf8' : '#ef4444'}; border-radius: 50%; color: #f8fafc; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.95rem; box-shadow: 0 4px 6px rgba(0,0,0,0.5); z-index: 5; opacity: ${opacity}; filter: ${filter}; transition: all 0.3s;">${turnOrderNum}</div>`;
    }

    let shieldBarHtml = '';
    if (computedShieldTotal > 0 && c.healthMax > 0) {
        const shieldPct = Math.min(100, (computedShieldTotal / c.healthMax) * 100);
        const isOverflow = computedShieldTotal > c.healthMax;
        const glowClass = isOverflow ? ' shield-glow-anim' : '';
        shieldBarHtml = `<div style="width: 100%; height: 3px; background: rgba(0,0,0,0.3); border-radius: 2px; position: relative;"><div class="${glowClass}" style="position: absolute; top: 0; left: 0; height: 100%; width: ${shieldPct}%; background: #3b82f6; border-radius: 2px; box-shadow: 0 0 5px #3b82f6;"></div></div>`;
    }

    return `
        ${turnOrderBadgeHtml}
        ${mutationsHtml}
        ${channelingBadgeHtml}
        <div class="fighter-name" style="color: ${isHero ? '#f8fafc' : '#ef4444'}; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; gap: 0.2rem; margin-bottom: 0.8rem; width: 100%;">
            <span style="flex-shrink: 0; display: flex; align-items: center; ${isHero ? 'cursor: help;' : ''}" ${isHero ? `onmouseenter="if(window.showHeroEquipmentTooltip) window.showHeroEquipmentTooltip(this, ${c.id})" onmouseleave="if(window.hideHeroEquipmentTooltip) window.hideHeroEquipmentTooltip()"` : ''}>${avatarHtml}</span>
            <div style="display: flex; align-items: center; gap: 0.3rem; min-width: 0;">
                <span style="flex-shrink: 0; display: flex;">${titleIconsHtml}</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;" title="${c.name}">${c.name}</span>
            </div>
        </div>
        ${monsterBadgesHtml}
        ${statsHtml}
        <div class="gauge-container" style="text-align: left;">
            <div class="gauge-label">
                <span style="display:flex; align-items:center;">Santé (PV)${hpRegenBadge}</span>
                <span style="display:flex; align-items:center; gap: 0.3rem;">
                    <span class="hp-text-val">${hpLabel}</span>
                    ${shieldBadgeHtml}
                </span>
            </div>
            ${shieldBarHtml}
            <div class="gauge-track"><div class="gauge-fill hp" style="width: ${hpPct}%;"></div></div>
        </div>
        ${manaHtml.replace('<span style="display:flex; align-items:center;">Mana</span>', `<span style="display:flex; align-items:center;">Mana${manaRegenBadge}</span>`)}
        ${specialItemsHtml}
        <div class="sandbox-status-list" style="justify-content: center;">${passiveBadges}</div>
        <div class="sandbox-status-list" style="justify-content: center;">
            ${renderShieldsHtml(c.activeShields)}
            ${renderBuffsHtml(c, c.activeBuffs || c.buffs, c.activeManaOverTimeEffects, c.activeHealOverTimeEffects)}
            ${renderPoisonBurnHtml(c)}
            ${renderDotsHtml(c.activeDamageOverTimeEffects)}
        </div>
    `;
}

export function renderEnemies(enemies, turnMap = null) {
    const container = document.getElementById('enemiesContainer');
    container.innerHTML = '';

    const bossBuffsContainer = document.getElementById('bossBuffsContainer');
    if (bossBuffsContainer) {
        bossBuffsContainer.innerHTML = '';
    }

    const bossChallengesContainer = document.getElementById('bossChallengesContainer');
    if (bossChallengesContainer) {
        bossChallengesContainer.innerHTML = '';
    }

    let bossBuffsRendered = false;
    let bossChallengesRendered = false;

    enemies.forEach((activeMonster, index) => {
        const m = activeMonster.base;
        const pMonster = activeMonster.asPersonnage || activeMonster; // Fallback just in case

        let isActive = false;
        if (pageState.currentSessionData && pageState.currentSessionData.turnOrder && pageState.currentSessionData.turnOrder.length > pageState.currentSessionData.currentTurnIndex && !pageState.currentSessionData.finished) {
            const currentTurn = pageState.currentSessionData.turnOrder[pageState.currentSessionData.currentTurnIndex];
            if (!currentTurn.player && currentTurn.index === index) {
                isActive = true;
            }
        }

        // Use pMonster logic to override maxHp/currentHp if necessary
        pMonster.name = m.name;
        pMonster.monsterType = m.monsterType;
        pMonster.behavior = m.behavior;
        pMonster.mutations = m.mutations;
        pMonster.regenHp = m.regenHp;
        pMonster.regenMana = m.regenMana;
        if (typeof activeMonster.currentHp !== 'undefined') pMonster.healthCurrent = activeMonster.currentHp;
        if (typeof activeMonster.maxHp !== 'undefined') pMonster.healthMax = activeMonster.maxHp;

        const div = document.createElement('div');
        div.className = `fighter fighter-enemy enemy-card ${isActive ? 'active' : ''} ${activeMonster.dead ? 'dead' : ''}`;
        div.dataset.index = index;
        div.dataset.fighterId = `monster-${m.monsterId || index}`;
        div.style.position = 'relative';

        if (isActive) {
            div.style.borderColor = '#ef4444';
            div.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
            div.style.transform = 'scale(1.05)';
        } else if (!activeMonster.dead) {
            div.style.borderColor = 'rgba(220, 38, 38, 0.4)'; // Default enemy border
            div.style.boxShadow = 'none';
            div.style.transform = 'scale(0.95)';
        }

        const isBoss = pMonster.passiveStates && Object.keys(pMonster.passiveStates).some(k => k.startsWith('BOSS_BUFF_'));

        if (isBoss) {
            if (bossBuffsContainer && !bossBuffsRendered) {
                const bossHtml = getBossBuffsHtml(pMonster);
                if (bossHtml) {
                    bossBuffsContainer.innerHTML = bossHtml;
                    bossBuffsRendered = true;
                }
            }
        }

        const fId = div.dataset.fighterId;
        let forcedHp = null;
        let forcedMana = null;
        if (window.combatOldStats && window.combatOldStats[fId]) {
            forcedHp = window.combatOldStats[fId].hp;
            forcedMana = window.combatOldStats[fId].mana;
        }

        div.innerHTML = generateFighterHtml(pMonster, false, isBoss, forcedHp, forcedMana, turnMap && turnMap.enemies ? turnMap.enemies[index] : null);
        container.appendChild(div);

        // Animate bars with JS loop
        const hpBar = div.querySelector('.gauge-fill.hp');
        const hpTextEl = div.querySelector('.hp-text-val');
        const manaBar = div.querySelector('.gauge-fill.mana');
        const manaTextEl = div.querySelector('.mana-text-val');

        if (forcedHp !== null && forcedHp !== pMonster.healthCurrent) {
            // DEBUG
            const log = document.getElementById('combatLog');
            if (log) {
                const el = document.createElement('div');
                el.className = 'log-entry';
                el.style.color = 'yellow';
                el.innerText = `[DEBUG] Enemy ${fId} HP: ${forcedHp} -> ${pMonster.healthCurrent}`;
                log.prepend(el);
            }

            animateGaugeJS(hpBar, hpTextEl, forcedHp, pMonster.healthCurrent, pMonster.healthMax, 800);
        } else if (forcedHp === pMonster.healthCurrent) {
            // DEBUG
            const log = document.getElementById('combatLog');
            if (log) {
                const el = document.createElement('div');
                el.className = 'log-entry';
                el.style.color = 'orange';
                el.innerText = `[DEBUG] Enemy ${fId} skipped HP anim (same val: ${forcedHp})`;
                log.prepend(el);
            }
        } else if (forcedHp === null) {
            // DEBUG
            const log = document.getElementById('combatLog');
            if (log) {
                const el = document.createElement('div');
                el.className = 'log-entry';
                el.style.color = 'red';
                el.innerText = `[DEBUG] Enemy ${fId} skipped HP anim (forcedHp is NULL)`;
                log.prepend(el);
            }
        }
        if (forcedMana !== null && forcedMana !== pMonster.manaCurrent) {
            animateGaugeJS(manaBar, manaTextEl, forcedMana, pMonster.manaCurrent, pMonster.manaMax, 800);
        }
    });

    if (bossChallengesContainer && pageState.currentSessionData && pageState.currentSessionData.activeChallenges) {
        const challHtml = getBossChallengesHtml(pageState.currentSessionData.activeChallenges);
        if (challHtml) {
            bossChallengesContainer.innerHTML = challHtml;
        }
    }
}

function animateGaugeJS(barEl, textEl, oldVal, newVal, max, duration = 600, suffix = '') {
    if (!barEl) return;
    let startTime = null;
    barEl.style.transition = 'none'; // Ensure JS controls the width smoothly

    function step(currentTime) {
        if (!startTime) startTime = currentTime;
        let t = (currentTime - startTime) / duration;
        if (t > 1) t = 1;
        let easeT = 1 - Math.pow(1 - t, 3); // ease-out cubic
        let currentVal = Math.floor(oldVal + (newVal - oldVal) * easeT);
        let pct = max > 0 ? Math.max(0, Math.min(100, (currentVal / max) * 100)) : 0;

        barEl.style.width = pct + '%';
        if (textEl) {
            textEl.textContent = `${currentVal} / ${max}${suffix}`;
        }

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            barEl.style.width = (max > 0 ? Math.max(0, Math.min(100, (newVal / max) * 100)) : 0) + '%';
            if (textEl) textEl.textContent = `${newVal} / ${max}${suffix}`;
        }
    }
    requestAnimationFrame(step);
}

export function renderShieldsHtml(shieldList) {
    if (!shieldList || shieldList.length === 0) return '';

    const shieldEntries = [];
    let totalShield = 0;

    shieldList.forEach(s => {
        totalShield += s.amount;
        const entryHtml = `
            <div class="flex justify-center items-center gap-1 w-full text-sm">
                <span class="material-symbols-outlined icon-sm-shrink text-base text-sky-300">security</span>
                <span class="font-bold text-white">[${s.sourceName || 'Inconnu'}]</span>
                <span class="text-sky-medium">Bouclier</span>
                <span class="text-subtle">→ ${s.amount} PV absorpt. (${s.duration} tours)</span>
            </div>
        `;
        shieldEntries.push(entryHtml);
    });

    // The bottom badge for shields has been removed in favor of the badge near the HP bar.
    return '';
}

export function renderPoisonBurnHtml(c) {
    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';
    const poisonEntries = [];
    const burnEntries = [];

    const buffs = c.activeBuffs || c.buffs || [];
    buffs.forEach(b => {
        if (b.statAffected === 'POISON') {
            const dmg = b.flatValue || 0;
            poisonEntries.push(`
                <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                    <span class="material-symbols-outlined text-success" style="flex-shrink:0; font-size:1.1rem; transform: translateY(-1px);">pest_control</span>
                    <span class="font-bold text-white">[Poison]</span>
                    <span style="color:#22c55e; font-weight:500;">${dmg} Dégâts Brut</span>
                    <span class="text-subtle">&#x23F3; (${b.duration} tours)</span>
                </div>
            `);
        } else if (b.statAffected === 'BURN') {
            const dmg = b.flatValue || 0;
            burnEntries.push(`
                <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                    <span class="material-symbols-outlined text-error" style="flex-shrink:0; font-size:1.1rem; transform: translateY(-1px);">local_fire_department</span>
                    <span class="font-bold text-white">[Brûlure]</span>
                    <span style="color:#ef4444; font-weight:500;">${dmg} Dégâts Magique</span>
                    <span class="text-subtle">&#x23F3; (${b.duration} tours)</span>
                </div>
            `);
        }
    });

    const dots = c.activeDamageOverTimeEffects || [];
    dots.forEach(d => {
        if (d.poison) {
            poisonEntries.push(`
                <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                    <span class="material-symbols-outlined text-success" style="flex-shrink:0; font-size:1.1rem; transform: translateY(-1px);">pest_control</span>
                    <span class="font-bold text-white">[Poison]</span>
                    <span style="color:#22c55e; font-weight:500;">${d.fixedDamagePerTick} Dégâts Brut</span>
                    <span class="text-subtle">&#x23F3; (${d.duration} tours)</span>
                </div>
            `);
        } else if (d.burn) {
            burnEntries.push(`
                <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                    <span class="material-symbols-outlined text-error" style="flex-shrink:0; font-size:1.1rem; transform: translateY(-1px);">local_fire_department</span>
                    <span class="font-bold text-white">[Brûlure]</span>
                    <span style="color:#ef4444; font-weight:500;">${d.fixedDamagePerTick} Dégâts Magique</span>
                    <span class="text-subtle">&#x23F3; (${d.duration} tours)</span>
                </div>
            `);
        }
    });

    let html = '';

    if (poisonEntries.length > 0) {
        html += `<div class="sandbox-status-badge debuff relative" ${tooltipAttrs} style="cursor: help; border-color: rgba(34, 197, 94, 0.4); color: #22c55e; background: rgba(34, 197, 94, 0.1);">
            <span class="material-symbols-outlined text-sm">pest_control</span>
            <span>Poison (${poisonEntries.length})</span>
            <template class="tooltip-data">
                <div class="flex-col-xs">
                    ${poisonEntries.join('')}
                </div>
            </template>
        </div>`;
    }

    if (burnEntries.length > 0) {
        html += `<div class="sandbox-status-badge debuff text-error relative" ${tooltipAttrs} style="cursor: help; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1);">
            <span class="material-symbols-outlined text-sm">local_fire_department</span>
            <span>Brûlure (${burnEntries.length})</span>
            <template class="tooltip-data">
                <div class="flex-col-xs">
                    ${burnEntries.join('')}
                </div>
            </template>
        </div>`;
    }

    return html;
}

export function renderBuffsHtml(c, buffList, motList, hotList) {
    const goodBuffs = [];
    const badBuffs = [];

    if (buffList && buffList.length > 0) {
        buffList.forEach(b => {
            if (b.statAffected === 'AME_DETACHEE' || b.effectType === 'AME_DETACHEE') return;
            if (b.statAffected === 'POISON' || b.statAffected === 'BURN') return;
            const inverseStats = ['DAMAGE_TAKEN_MAGIC', 'DAMAGE_TAKEN_PHYSIC', 'DAMAGE_TAKEN_BRUT', 'SHIELD_PIERCED', 'BURN', 'POISON'];
            const isInverse = inverseStats.includes(b.statAffected);
            const isNegativeValue = b.modifier < 0 || b.flatValue < 0;

            let isBad = isNegativeValue;
            if (isInverse) isBad = !isNegativeValue;

            let effectiveFlat = b.flatValue || 0;
            let showModifier = true;
            let text = '';

            if (b.modifier && c) {
                let rawStat = null;
                const affected = b.statAffected ? b.statAffected.toUpperCase() : '';

                if (affected.includes('ARMURE') || affected.includes('ARMOR')) rawStat = c.armor;
                else if (affected.includes('RESISTANCE')) rawStat = c.resistance;
                else if (affected === 'POWER' || affected.includes('PUISSANCE')) rawStat = c.power;
                else if (affected.includes('STRENGTH') || affected.includes('FORCE')) rawStat = c.strength;
                else if (affected.includes('SPEED') || affected.includes('VITESSE')) rawStat = c.speed;
                else if (affected === 'CRIT' || affected.includes('CRITIQUE')) rawStat = c.crit;
                else if (affected.includes('HEALTH_MAX') || affected.includes('PV_MAX') || affected.includes('HP_MAX')) rawStat = c.healthMax;
                else if (affected.includes('MANA_MAX') || affected.includes('MP_MAX')) rawStat = c.manaMax;

                if (rawStat !== null && rawStat !== undefined) {
                    const allBuffs = c.activeBuffs || c.buffs || [];

                    // Compute flat bonus from buffs (same as server getStatFlatBonus)
                    let flatBonus = 0;
                    allBuffs.forEach(otherBuff => {
                        if (otherBuff.statAffected === b.statAffected && otherBuff.flatValue) {
                            flatBonus += otherBuff.flatValue;
                        }
                    });

                    let baseStat = rawStat + flatBonus;

                    let runPos = 0.0;
                    let runNeg = 1.0;
                    let statBefore = 0;
                    let statAfter = 0;

                    if (b.statAffected === 'DAMAGE_GIVEN_PHYSIC') {
                        if (allBuffs.some(ab => ab.statAffected === 'AME_DETACHEE')) {
                            runPos += 0.40;
                        }
                    }

                    for (let other of allBuffs) {
                        if (other.statAffected === b.statAffected && other.modifier) {
                            if (other === b) statBefore = baseStat * (1.0 + runPos) * runNeg;

                            if (other.modifier > 0) runPos += other.modifier;
                            else if (other.modifier < 0) runNeg *= (1.0 + other.modifier);

                            if (other === b) {
                                statAfter = baseStat * (1.0 + runPos) * runNeg;
                                break;
                            }
                        }
                    }

                    let modFlat = Math.round(statAfter) - Math.round(statBefore);
                    if (modFlat !== 0 || b.modifier !== 0) {
                        effectiveFlat += modFlat;
                        showModifier = false;
                    }
                }
            }
            if (effectiveFlat !== 0 || (!showModifier && b.modifier !== 0)) {
                let sign = effectiveFlat > 0 ? '+' : '';
                if (effectiveFlat === 0) {
                    sign = b.modifier > 0 ? '+' : '-';
                }
                text += `${sign}${Math.abs(effectiveFlat)} ${ui.formatStat(b.statAffected)}`;
            }
            if (b.modifier && showModifier) {
                if (text) text += ' et ';
                text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}% ${ui.formatStat(b.statAffected)}`;
            }
            if (!text) text = `Modifie ${ui.formatStat(b.statAffected)}`;

            const typeStr = (b.statAffected === 'POISON' || b.statAffected === 'BURN') ? ui.formatStat(b.statAffected) : 'Buff/Débuff';
            const indicatorColor = isBad ? '#f43f5e' : '#10b981';

            let iconName = isBad ? 'trending_down' : 'trending_up';
            if (b.statAffected === 'POISON') iconName = 'science';
            if (b.statAffected === 'BURN') iconName = 'local_fire_department';

            let statIconHtml = '';
            if (b.statAffected && b.statAffected !== 'POISON' && b.statAffected !== 'BURN') {
                const sa = b.statAffected.toUpperCase();
                let statIcon = { icon: 'star', color: 'var(--text-muted)' };

                if (sa.includes('SPEED')) statIcon = { icon: 'bolt', color: 'var(--slot-anneau)' };
                else if (sa.includes('MANA')) statIcon = { icon: 'water_drop', color: 'var(--mana)' };
                else if (sa.includes('HEALTH') || sa.includes('HP') || sa.includes('LIFE')) statIcon = { icon: 'favorite', color: 'var(--secondary)' };
                else if (sa.includes('CRIT')) statIcon = { icon: 'gps_fixed', color: 'var(--crit)' };
                else if (sa.includes('ARMOR') || sa.includes('ARMURE')) statIcon = { icon: 'shield', color: 'var(--accent)' };
                else if (sa.includes('RESISTANCE')) statIcon = { icon: 'shield', color: 'var(--success)' };
                else if (sa.includes('PHYSICAL_POWER') || sa.includes('STRENGTH')) statIcon = { icon: 'fitness_center', color: 'var(--danger)' };
                else if (sa.includes('POWER')) statIcon = { icon: 'auto_awesome', color: 'var(--magic)' };
                else if (sa.includes('HEAL_RECEIVED')) statIcon = { icon: 'health_and_safety', color: 'var(--success)' };
                else if (sa.includes('SHIELD_RECEIVED')) statIcon = { icon: 'security', color: 'var(--shield-light)' };
                else if (sa.includes('HEAL_GIVEN')) statIcon = { icon: 'healing', color: 'var(--caster-color)' };
                else if (sa.includes('SHIELD_GIVEN')) statIcon = { icon: 'add_moderator', color: 'var(--shield-lighter)' };
                else if (sa === 'SHIELD_PIERCED' || sa === 'SHIELD_PENETRATION') statIcon = { icon: 'heart_broken', color: 'var(--pierce)' };
                else if (sa === 'DAMAGE_TAKEN_MAGIC' || sa === 'DAMAGE_GIVEN_MAGIC') statIcon = { icon: 'auto_awesome', color: 'var(--magic)' };
                else if (sa === 'DAMAGE_TAKEN_PHYSIC' || sa.includes('DAMAGE_TAKEN')) statIcon = { icon: 'explosion', color: 'var(--crit)' };
                else if (sa === 'DAMAGE_TAKEN_BRUT' || sa === 'DAMAGE_GIVEN_BRUT') statIcon = { icon: 'bloodtype', color: 'var(--brut)' };
                else if (sa === 'DAMAGE_GIVEN_PHYSIC' || sa.includes('DAMAGE_GIVEN')) statIcon = { icon: 'swords', color: 'var(--danger)' };
                else if (sa === 'DAMAGE_GIVEN_MAGIC_TO_SHIELD') statIcon = { icon: 'gavel', color: 'var(--magic-shield)' };
                else if (sa === 'DAMAGE_GIVEN_PHYSIC_TO_SHIELD') statIcon = { icon: 'gavel', color: 'var(--danger)' };
                else if (sa.includes('PIERCED') || sa.includes('PIERCING')) statIcon = { icon: 'heart_broken', color: 'var(--pierce)' };

                statIconHtml = `<span class="material-symbols-outlined" style="flex-shrink:0; font-size:1.1rem; color:${statIcon.color}; margin-left:-0.1rem;">${statIcon.icon}</span>`;
            }

            const entryHtml = `
            <div class="flex justify-start items-center gap-1 w-full text-sm">
                <span class="material-symbols-outlined icon-sm-shrink text-base" style="color:${indicatorColor};">${iconName}</span>
                ${statIconHtml}
                <span class="font-bold text-white">[Cible]</span>
                <span class="text-sky-medium">${typeStr}</span>
                <span class="text-subtle">→ ${text} (${b.duration} tours)</span>
            </div>
            `;

            if (isBad) badBuffs.push(entryHtml);
            else goodBuffs.push(entryHtml);
        });
    }

    if (motList && motList.length > 0) {
        motList.forEach(m => {
            let text = "";
            if (m.percentageManaPerTick) {
                text = (m.percentageManaPerTick * 100) + "% " + (m.manaSource === 'TARGET_MANA_MAX' ? 'Mana Max' : ui.formatSrc(m.manaSource));
                if (m.fixedManaPerTick) {
                    text += (m.fixedManaPerTick > 0 ? ' + ' : ' - ') + Math.abs(m.fixedManaPerTick);
                }
            } else {
                text = m.fixedManaPerTick;
            }

            let isBad = false;
            if (m.percentageManaPerTick < 0 || m.fixedManaPerTick < 0) {
                isBad = true;
            }

            const indicatorColor = isBad ? '#f43f5e' : '#10b981';
            const iconName = isBad ? 'trending_down' : 'trending_up';

            const entryHtml = `
                <div class="flex justify-start items-center gap-1 w-full text-sm">
                    <span class="material-symbols-outlined icon-sm-shrink text-base" style="color:${indicatorColor};">${iconName}</span>
                    <span class="material-symbols-outlined icon-sm-shrink text-base text-sky-300">water_drop</span>
                    <span class="font-bold text-white">[Cible]</span>
                    <span class="text-sky-medium">MoT</span>
                    <span class="text-subtle">→ ${text} Mana/tour (${m.duration} tours)</span>
                </div>
            `;
            if (isBad) badBuffs.push(entryHtml);
            else goodBuffs.push(entryHtml);
        });
    }

    if (hotList && hotList.length > 0) {
        hotList.forEach(h => {
            let text = "";
            if (h.percentageHealPerTick) {
                text = (h.percentageHealPerTick * 100) + "% " + (h.healSource === 'TARGET_HEALTH_MAX' ? 'PV Max' : ui.formatSrc(h.healSource));
                if (h.fixedHealPerTick) {
                    text += (h.fixedHealPerTick > 0 ? ' + ' : ' - ') + Math.abs(h.fixedHealPerTick);
                }
            } else {
                text = h.fixedHealPerTick;
            }

            let isBad = false;
            if (h.percentageHealPerTick < 0 || h.fixedHealPerTick < 0) {
                isBad = true;
            }

            const indicatorColor = isBad ? '#f43f5e' : '#10b981';
            const iconName = isBad ? 'trending_down' : 'trending_up';

            const entryHtml = `
                <div class="flex justify-start items-center gap-1 w-full text-sm">
                    <span class="material-symbols-outlined icon-sm-shrink text-base" style="color:${indicatorColor};">${iconName}</span>
                    <span class="material-symbols-outlined icon-sm-shrink text-base text-success">healing</span>
                    <span class="font-bold text-white">[Cible]</span>
                    <span class="text-success font-medium">HoT</span>
                    <span class="text-subtle">→ ${text} PV/tour (${h.duration} tours)</span>
                </div>
            `;
            if (isBad) badBuffs.push(entryHtml);
            else goodBuffs.push(entryHtml);
        });
    }

    if (goodBuffs.length === 0 && badBuffs.length === 0) return '';
    let html = '';
    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    if (goodBuffs.length > 0) {
        html += `<div class="sandbox-status-badge buff relative" ${tooltipAttrs} style="cursor: help;">
            <span class="material-symbols-outlined text-sm">trending_up</span>
            <span>Buffs (${goodBuffs.length})</span>
            <template class="tooltip-data">
                <div class="flex-col-xs">
                    ${goodBuffs.join('')}
                </div>
            </template>
        </div>`;
    }
    if (badBuffs.length > 0) {
        html += `<div class="sandbox-status-badge debuff relative" ${tooltipAttrs} style="cursor: help;">
            <span class="material-symbols-outlined text-sm">trending_down</span>
            <span>Débuffs (${badBuffs.length})</span>
            <template class="tooltip-data">
                <div class="flex-col-xs">
                    ${badBuffs.join('')}
                </div>
            </template>
        </div>`;
    }

    return html;
}

export function renderSpells(spells) {
    const container = document.getElementById('spellsContainer');
    if (!container) return;

    // Filter spells based on currentSpellsTab
    let filteredSpells = [];
    if (currentSpellsTab === 'VOIE') {
        filteredSpells = spells.filter(s => s.voie != null);
    } else if (currentSpellsTab === 'SPIRIT') {
        filteredSpells = spells.filter(s => s.spiritualite != null);
    } else if (currentSpellsTab === 'ALL') {
        filteredSpells = spells.filter(s => s.voie != null || s.spiritualite != null);
    }

    // Update counts
    const countVOIE = document.getElementById('countVOIE');
    if (countVOIE) countVOIE.textContent = spells.filter(s => s.voie != null).length;
    const countSPIRIT = document.getElementById('countSPIRIT');
    if (countSPIRIT) countSPIRIT.textContent = spells.filter(s => s.spiritualite != null).length;
    const countALL = document.getElementById('countALL');
    if (countALL) countALL.textContent = spells.filter(s => s.voie != null || s.spiritualite != null).length;

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
        container.innerHTML = '<div class="font-italic text-muted text-center" style="padding: 2rem;">Aucun sort dans cette catégorie.</div>';
        return;
    }

    // We sort all filtered spells by level, no grouping to save space
    const castingWeight = { 'INSTANTANE': 1, 'BANAL': 2, 'CANALISE': 3 };
    filteredSpells.sort((a, b) => {
        const lvlDiff = (a.niveau || 1) - (b.niveau || 1);
        if (lvlDiff !== 0) return lvlDiff;
        const weightA = castingWeight[a.castingType] || 2;
        const weightB = castingWeight[b.castingType] || 2;
        return weightA - weightB;
    });

    let html = `
        <div class="csp-level-group" style="padding-top: 0.5rem;">
            <div class="csp-grid">
                ${filteredSpells.map(sp => renderSpellCard(sp)).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Update initial state for dynamic options
    filteredSpells.forEach(sp => {
        if (window.updateSpellCardState) {
            window.updateSpellCardState(sp.id);
        }
    });
}

export function renderSpellCard(sp) {
    const titleColor = ui.getSpellColor(sp);

    const effectsList = sp.effects || [];
    const choiceKeys = [...new Set(effectsList.map(e => e.requiredChoiceKey).filter(k => k != null))];

    let optionSelectorHtml = '';
    if (choiceKeys.length > 0) {
        optionSelectorHtml = `
            <select class="spell-choice-mini" id="choice-select-${sp.id}" onclick="event.stopPropagation()" onchange="window.updateSpellCardState(${sp.id})" style="background: rgba(15, 23, 42, 0.8); color: #e2e8f0; border: 1px solid var(--glass-border); border-radius: 4px; padding: 0 0.2rem; font-size: 0.75rem; height: 1.2rem; margin-left: auto; outline: none; cursor: pointer; pointer-events: auto;">
                ${choiceKeys.map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
        `;
    }

    const getSrcIcon = (src) => {
        const info = ui.getSourceIconInfo(src);
        return `<span class="material-symbols-outlined align-middle" title="${ui.formatSrc(src || '')}" style="font-size: 0.95rem; color: ${info.color};">${info.icon}</span>`;
    };

    let costDetailsHtml = [];
    if (sp.manaCost > 0 || sp.percentManaCost > 0) {
        let text = '';
        if (sp.manaCost > 0 && sp.percentManaCost > 0) text = `<span>${sp.manaCost} + ${sp.percentManaCost}%</span>${getSrcIcon(sp.percentManaCostSource || 'CASTER_MANA_MAX')}`;
        else if (sp.manaCost > 0) text = `<span>${sp.manaCost}</span>`;
        else text = `<span>${sp.percentManaCost}%</span>${getSrcIcon(sp.percentManaCostSource || 'CASTER_MANA_MAX')}`;
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #38bdf8;" title="Mana">water_drop</span><span style="display:inline-flex; align-items:center; gap:0.2rem; border-bottom: 1px solid rgba(56, 189, 248, 0.5); padding-bottom: 0.05rem; white-space:nowrap;">${text}</span></span>`);
    }
    if (sp.healCost > 0 || sp.percentHealCost > 0) {
        let text = '';
        if (sp.healCost > 0 && sp.percentHealCost > 0) text = `<span>${sp.healCost} + ${sp.percentHealCost}%</span>${getSrcIcon(sp.percentHealCostSource || 'CASTER_HEALTH_MAX')}`;
        else if (sp.healCost > 0) text = `<span>${sp.healCost}</span>`;
        else text = `<span>${sp.percentHealCost}%</span>${getSrcIcon(sp.percentHealCostSource || 'CASTER_HEALTH_MAX')}`;
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f43f5e;" title="PV">bloodtype</span><span style="display:inline-flex; align-items:center; gap:0.2rem; border-bottom: 1px solid rgba(244, 63, 94, 0.5); padding-bottom: 0.05rem; white-space:nowrap;">${text}</span></span>`);
    }
    if (sp.heatCost > 0 || sp.percentHeatCost > 0) {
        let text = '';
        if (sp.heatCost > 0 && sp.percentHeatCost > 0) text = `<span>${sp.heatCost} + ${sp.percentHeatCost}%</span>`;
        else if (sp.heatCost > 0) text = `<span>${sp.heatCost}</span>`;
        else text = `<span>${sp.percentHeatCost}%</span>`;
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f97316;" title="Chaleur">local_fire_department</span><span style="display:inline-flex; align-items:center; gap:0.2rem; border-bottom: 1px solid rgba(249, 115, 22, 0.5); padding-bottom: 0.05rem; white-space:nowrap;">${text}</span></span>`);
    }
    if (sp.seedCost > 0) {
        costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #6ee7b7;" title="Graines">yard</span><span style="display:inline-flex; align-items:center; gap:0.2rem; border-bottom: 1px solid rgba(110, 231, 183, 0.5); padding-bottom: 0.05rem; white-space:nowrap;"><span>${sp.seedCost}</span></span></span>`);
    }
    let costDetails = costDetailsHtml.join('<span style="color:rgba(255,255,255,0.2); margin:0 0.2rem;">|</span>');
    if (costDetailsHtml.length === 0) costDetails = '';
    let castingTypeHtml = '';
    if (sp.castingType === 'INSTANTANE') {
        castingTypeHtml = '<span class="material-symbols-outlined text-base text-gold" title="Action Instantanée">bolt</span>';
    } else if (sp.castingType === 'CANALISE') {
        castingTypeHtml = '<span class="material-symbols-outlined text-base text-violet-500" title="Action Canalisée">cyclone</span>';
        castingTypeHtml += sp.allowInstantDuringChanneling ?
            '<span class="material-symbols-outlined text-base text-purple-300" title="Instantanés autorisés pendant la canalisation">flash_on</span>' :
            '<span class="relative" title="Instantanés interdits pendant la canalisation" style="display: inline-flex; align-items: center; justify-content: center; width: 1rem; height: 1rem;"><span class="material-symbols-outlined text-base text-slate">flash_off</span><span class="absolute" style="width: 100%; height: 2px; background: #ef4444; transform: rotate(-45deg);"></span></span>';
    } else {
        castingTypeHtml = '<span class="material-symbols-outlined text-base text-blue" title="Action Banale">hourglass_empty</span>';
    }

    let categoryHtml = '';
    const isViolence = (sp.voie && sp.voie.nom && sp.voie.nom.toLowerCase().includes('violence')) || (sp.spiritualite && sp.spiritualite.nom && sp.spiritualite.nom.toLowerCase().includes('violence'));
    if (sp.category === 'INSPIRATION' || (isViolence && sp.inspiration === true)) {
        categoryHtml = '<span class="material-symbols-outlined text-base text-crimson" title="Sort d\'Inspiration">storm</span>';
    } else if (sp.category === 'EXPIRATION' || (isViolence && sp.inspiration === false)) {
        categoryHtml = '<span class="material-symbols-outlined text-base text-fuchsia" title="Sort d\'Expiration">air</span>';
    }

    let karmaAlignHtml = '';
    if (sp.karmaAlignment === 'OFFENSIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined text-base text-purple" title="Sort des Ténèbres (Offensif)">dark_mode</span>';
    } else if (sp.karmaAlignment === 'PROTECTIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined text-base text-yellow" title="Sort de Lumière (Protecteur)">light_mode</span>';
    } else if (sp.karmaAlignment === 'RESTORATIVE') {
        karmaAlignHtml = '<span class="material-symbols-outlined text-base text-slate" title="Sort d\'Harmonie (Restaurateur)">brightness_medium</span>';
    }

    const generatesHeat = (sp.heatGenerated > 0) || (sp.effects && sp.effects.some(e => {
        const rawType = e.effectType || e.effect_type || '';
        return ['HEAT_FIXED', 'HeatFixedEffect', 'HEAT_PERCENTAGE', 'HeatPercentageEffect', 'HEAT_OVER_TIME', 'HeatOverTimeEffect', 'HEAT', 'HeatEffect'].includes(rawType);
    }));

    let heatGenHtml = '';
    if (generatesHeat) {
        heatGenHtml = `<span class="material-symbols-outlined text-base text-orange" title="Sort Générateur de Chaleur">local_fire_department</span>`;
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
    const availabilityList = pageState.currentSessionData.spellAvailability || [];
    const avail = availabilityList.find(a => a.spellId === sp.id);
    const isCastable = !avail || avail.castable;
    let disabledClass = isCastable ? '' : ' spell-disabled';
    const onClickAttr = isCastable ? `onclick="initiateCombatCast(${sp.id})"` : '';

    // Check multiplayer turn
    let multiDisabledClass = '';
    let multiDisabledStyle = '';
    if (window.combatIsMyTurn === false) {
        multiDisabledClass = ' multi-disabled';
        multiDisabledStyle = 'opacity: 0.35;';
    }

    const allEnemiesDead = !pageState.currentSessionData.enemies ||
        pageState.currentSessionData.enemies.length === 0 ||
        pageState.currentSessionData.enemies.every(e => e.dead || e.currentHp <= 0);

    const isCastThisTurn = pageState.currentSessionData &&
        pageState.currentSessionData.turnCastSpellIds &&
        pageState.currentSessionData.turnCastSpellIds.includes(sp.id) &&
        !pageState.currentSessionData.finished &&
        !allEnemiesDead;
    const castClass = isCastThisTurn ? ' cast-this-turn' : '';
    if (isCastThisTurn) {
        multiDisabledStyle = 'opacity: 1;'; // Force full opacity for cast spells
    }

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
        } else if (avail.reason === 'NO_OTHER_ALLY') {
            badgeClass = 'badge-condition';
            badgeIcon = 'group_off';
        }

        if (avail.reason === 'RESOURCE' || !avail.reason) {
            let resIcon = 'water_drop';
            let resColor = '#38bdf8';
            if (avail.tooltip && avail.tooltip.toLowerCase().includes('chaleur')) {
                resIcon = 'local_fire_department';
                resColor = '#f97316';
            } else if (avail.tooltip && avail.tooltip.toLowerCase().includes('pv')) {
                resIcon = 'bloodtype';
                resColor = '#ef4444';
            }
            disabledBadgeHtml = `<div class="spell-disabled-badge badge-resource" title="${avail.tooltip || 'Ressources insuffisantes'}"><span class="material-symbols-outlined" style="color: ${resColor};">${resIcon}</span></div>`;
        } else {
            disabledBadgeHtml = `<div class="spell-disabled-badge ${badgeClass}" title="${avail.tooltip || ''}"><span class="material-symbols-outlined">${badgeIcon}</span></div>`;
        }
    }

    return `
        <div id="spell-card-${sp.id}" class="combat-spell-card spell-btn${disabledClass}${multiDisabledClass}${castClass}" style="--spell-color: ${titleColor}; border-top: 2px solid ${titleColor}; position: relative; ${multiDisabledStyle}" ${onClickAttr} ${tooltipAttrs}>
            <div class="absolute" style="top: -9px; left: -5px; background: #0f172a; border: 1px solid ${titleColor}; color: ${titleColor}; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.65rem; font-weight: bold; z-index: 25;">Lvl ${sp.niveau}</div>
            
            <div class="combat-spell-header mt-xs">
                <div class="combat-spell-name" title="${sp.nom}" style="color: ${titleColor}; text-align: left; width: 100%;">${sp.nom}</div>
            </div>
            <div class="combat-spell-icons flex-center" style="flex-wrap: wrap; gap: 0.3rem; justify-content: flex-start; margin-bottom: 0.3rem;">
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

export function showResult(data) {
    const overlay = document.getElementById('resultOverlay');
    const title = document.getElementById('resultTitle');
    const desc = document.getElementById('resultDesc');
    const tipContainer = document.getElementById('resultTip');
    const tipText = document.getElementById('resultTipText');

    if (data.playerWon) {
        title.textContent = "VICTOIRE";
        title.classList.add('text-success');
        desc.textContent = "Le donjon a été complété.";

        if (tipContainer && tipText) {
            const randomTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
            tipText.innerHTML = randomTip;
            tipContainer.style.display = 'block';
        }
    } else {
        title.textContent = "DÉFAITE";
        title.classList.add('text-error');
        const goldLost = data.totalGoldLostOnDefeat || 0;
        desc.innerHTML = `Votre équipe a été anéantie.<br><span style="color:#fbbf24; font-weight:600; margin-top:0.5rem; display:block;">Pénalité : -${goldLost} Or</span>`;
        if (tipContainer) tipContainer.style.display = 'none';
    }

    const retryBtn = document.getElementById('retryDungeonBtn');
    if (retryBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const dId = (data && data.dungeonId) || urlParams.get('dungeonId');
        if (dId) {
            retryBtn.href = `/dungeons.html?dungeonId=${dId}`;
            retryBtn.style.display = 'inline-flex';
        } else {
            retryBtn.style.display = 'none';
        }
    }

    overlay.classList.add('show');
}

export function renderDotsHtml(dotList) {
    if (!dotList || dotList.length === 0) return '';

    let totalDmg = 0;
    const dotEntries = [];
    dotList.forEach(d => {
        if (d.burn || d.poison) return; // Déjà géré par renderPoisonBurnHtml
        totalDmg += d.fixedDamagePerTick || 0;
        let dTypeStr = "Brut";
        if (d.damageType === "PHYSIC") dTypeStr = "Physique";
        else if (d.damageType === "MAGIC") dTypeStr = "Magique";
        else if (d.damageType === "BRUT") dTypeStr = "Brut";

        let icon = "bloodtype";
        let color = "#ef4444";
        let nameStr = d.sourceName || d.spellName || "DoT";

        if (d.burn) {
            icon = "local_fire_department";
            color = "#f97316";
            nameStr = "Brûlure";
        } else if (d.poison) {
            icon = "pest_control";
            color = "#22c55e";
            nameStr = "Poison";
        } else {
            if (d.damageType === "MAGIC") {
                icon = "auto_awesome";
                color = "#a855f7";
            } else if (d.damageType === "PHYSIC") {
                icon = "swords";
                color = "#f43f5e";
            } else if (d.damageType === "BRUT") {
                icon = "bloodtype";
                color = "#ef4444";
            }
        }

        let dmgStr = d.fixedDamagePerTick ? `${d.fixedDamagePerTick}` : '';
        if (d.percentageDamagePerTick > 0) {
            const pctStr = `${Math.round(d.percentageDamagePerTick * 100)}% ${ui.formatSrc(d.damageSource)}`;
            dmgStr = dmgStr ? `${dmgStr} + ${pctStr}` : pctStr;
        }
        if (!dmgStr) dmgStr = "0";

        dotEntries.push(`
            <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                <span class="material-symbols-outlined" style="flex-shrink:0; font-size:1.1rem; color:${color}; transform: translateY(-1px);">${icon}</span>
                <span style="font-weight:600; color:#fff;">[${nameStr}]</span>
                <span style="color:${color}; font-weight:500;">${dmgStr} Dégâts ${dTypeStr}</span>
                <span style="color:#e2e8f0;">&#x23F3; (${d.duration} tours)</span>
            </div>
        `);
    });

    if (dotEntries.length === 0) return '';

    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    return `
        <div class="status-badge status-dot text-error" ${tooltipAttrs} style="display:inline-flex; align-items:center; gap:0.3rem; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); border-radius: 6px; padding: 0.15rem 0.5rem; cursor: help;">
            <span class="material-symbols-outlined" style="font-size:1rem;">bloodtype</span> DoT (${dotList.length})
            <template class="tooltip-data">
                <div style="font-weight:600; margin-bottom:0.5rem; color:#f8fafc; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.3rem;">Dégâts sur la durée</div>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${dotEntries.join('')}
                </div>
            </template>
        </div>
    `;
}

if (!document.getElementById('shield-glow-style')) {
    const style = document.createElement('style');
    style.id = 'shield-glow-style';
    style.innerHTML = `
        @keyframes shield-overflow-glow {
            0% { box-shadow: 0 0 5px #3b82f6, inset 0 0 2px #60a5fa; filter: brightness(1); }
            50% { box-shadow: 0 0 15px #60a5fa, inset 0 0 8px #93c5fd; filter: brightness(1.3); }
            100% { box-shadow: 0 0 5px #3b82f6, inset 0 0 2px #60a5fa; filter: brightness(1); }
        }
        .shield-glow-anim {
            animation: shield-overflow-glow 2s infinite ease-in-out;
        }
    `;
    document.head.appendChild(style);
}
