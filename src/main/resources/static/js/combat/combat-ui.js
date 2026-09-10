import { createAnomalyBadgeHtml, getExpStats, getSpiritExpStats } from './combat-utils.js';
import { pageState } from './combat-state.js';
import { processNewDeathLogs, updateMultiTurnBanner } from './combat-socket.js';
import { currentSpellsTab, initiateCombatCast } from './combat-spells.js';
import { nextRoom, openStrangeDoor, acceptAlteration, useRope, openBuyModal, addLootedConsumable, openChest, resetCombatTimeoutWarning, playDungeonMusic, GAME_TIPS } from './combat-actions.js';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../filters.js';


export function renderAndAnimateXPCards(containerId, players, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.remove('hidden'); container.classList.add('flex');

    let cardsHtml = '';
    players.forEach(p => {
        let oldExp = pageState.previousPlayerXP[p.id] !== undefined ? pageState.previousPlayerXP[p.id] : p.experience;
        let oldStats = getExpStats(oldExp);
        let oldSpiritExp = pageState.previousPlayerSpiritXP[p.id] !== undefined ? pageState.previousPlayerSpiritXP[p.id] : (p.spiritualiteExperience || 0);
        let oldSpiritStats = getSpiritExpStats(oldSpiritExp);

        let cardsHtmlPart = `
            <div class="text-center relative" id="${prefix}-xp-card-${p.id}" style="background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: 180px; overflow: hidden; transition: all 0.5s; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8); display: flex; flex-direction: column; gap: 0.3rem;">
                <div class="font-bold whitespace-nowrap text-subtle"  style="margin-bottom: 0.3rem; text-overflow: ellipsis; overflow: hidden;">${p.name}</div>
                
                <div class="text-xs" id="${prefix}-xp-lvl-${p.id}" style="color: #38bdf8; font-weight: 600; transition: color 0.3s, transform 0.3s;">Voie Niv. ${oldStats.level}</div>
                <div class="progress-track">
                    <div id="${prefix}-xp-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldStats.progress)}%; background: #10b981; transition: box-shadow 0.3s;"></div>
                </div>
                <div class="text-muted" id="${prefix}-xp-text-${p.id}" style="font-size: 0.7rem; font-family: monospace;">${oldExp} / ${oldStats.level === 5 ? 'MAX' : oldStats.nextLvlXp} XP</div>
        `;

        if (oldSpiritExp > 0 || (p.spiritualiteExperience || 0) > 0 || prefix === 'treasure') {
            cardsHtmlPart += `
                <div class="mt-xs"></div>
                <div class="text-xs" id="${prefix}-spirit-lvl-${p.id}" style="color: #fb923c; font-weight: 600; transition: color 0.3s, transform 0.3s;">Spirit Niv. ${oldSpiritStats.level}</div>
                <div class="progress-track">
                    <div id="${prefix}-spirit-fill-${p.id}" style="height: 100%; width: ${Math.min(100, oldSpiritStats.progress)}%; background: #f59e0b; transition: box-shadow 0.3s;"></div>
                </div>
                <div class="text-muted" id="${prefix}-spirit-text-${p.id}" style="font-size: 0.7rem; font-family: monospace;">${oldSpiritExp} / ${oldSpiritStats.level === 3 ? 'MAX' : oldSpiritStats.nextLvlXp} XP</div>
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
            div.innerHTML = timerHtml + generateFighterHtml(p, true);
            playersContainer.appendChild(div);

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
            let remaining = Math.max(0, 90 - elapsed);

            document.querySelectorAll('.turn-timer-badge').forEach(badge => {
                badge.textContent = `⏳ ${remaining}s`;
                if (remaining <= 10) {
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

            const allEnemiesDead = !data.enemies || data.enemies.length === 0 || data.enemies.every(e => e.dead || e.currentHp <= 0);

            if (allEnemiesDead && !data.finished) {
                document.getElementById('btnAttack').disabled = true;
                const vicOverlay = document.getElementById('combatVictoryOverlay');
                if (vicOverlay) {
                    if (typeof window.renderOverlayInventory === 'function') window.renderOverlayInventory('combatVictoryInventoryList');
                    vicOverlay.classList.add('show');
                    const xpContainer = document.getElementById('combatVictoryXpContainer');
                    if (xpContainer) {
                        xpContainer.innerHTML = '';

                        // Base Gold and XP accumulated over the entire combat
                        const totalGold = data.totalGoldAccumulated || 0;
                        const totalRawXp = data.totalExpAccumulated || 0;
                        const nbPlayers = Math.max(1, (data.players || []).length);
                        const xpPerHero = Math.floor(totalRawXp / nbPlayers);

                        const bossBonusGold = data.bossBonusGold || 0;
                        const bossBonusSpiritXp = data.bossBonusSpiritualXp || 0;

                        // Soustraire l'or du boss pour n'afficher que l'or des monstres dans la section de base
                        let goldAmount = Math.max(0, totalGold - bossBonusGold);
                        let xpAmount = xpPerHero;

                        // Display base Gold and Base XP together
                        if (goldAmount > 0 || xpAmount > 0) {
                            let baseContent = '';
                            if (goldAmount > 0) {
                                baseContent += `
                                    <span class="material-symbols-outlined text-warning">monetization_on</span>
                                    <span class="text-warning">+${goldAmount} Or</span>
                                `;
                            }
                            if (goldAmount > 0 && xpAmount > 0) {
                                baseContent += `<span class="text-muted" style="margin: 0 0.5rem;">|</span>`;
                            }
                            if (xpAmount > 0) {
                                baseContent += `
                                    <span class="material-symbols-outlined text-info">upgrade</span>
                                    <span class="text-info">+${xpAmount} XP</span>
                                `;
                            }

                            xpContainer.innerHTML += `
                                <div class="text-center w-full"  style="margin-bottom: 0.5rem; animation: popIn 0.5s ease-out forwards;">
                                    <div class="font-bold" style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.4); border: 1px solid #f59e0b80; padding: 0.5rem 1rem; border-radius: 8px; font-size: 1.2rem;">
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
                                <div class="text-center w-full"  style="margin-bottom: 0.5rem; animation: popIn 0.6s ease-out forwards;">
                                    <div class="font-bold" style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.4); border: 1px solid #e11d4880; padding: 0.5rem 1rem; border-radius: 8px; font-size: 1.1rem;">
                                        ${innerContent}
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
                    pageState.previousPlayerXP[p.id] = p.experience;
                });
            }
        } else {
            // TREASURE OR EVENT
            const vicOverlay = document.getElementById('combatVictoryOverlay');
            if (vicOverlay) vicOverlay.classList.remove('show');

            document.getElementById('btnAttack').disabled = true;
            document.getElementById('enemiesContainer').innerHTML = ''; // Clear enemies

            const overlay = document.getElementById('eventOverlay');
            const icon = document.getElementById('eventIcon');
            const title = document.getElementById('eventTitle');
            const desc = document.getElementById('eventDesc');

            const btnOpen = document.getElementById('btnOpenChest');
            const btnCont = document.getElementById('btnContinueEvent');
            const lootContainer = document.getElementById('eventLootContainer');

            // Reset default onclick to prevent previous events (like PORTE_ETRANGE) from overriding it
            if (btnCont) {
                btnCont.onclick = nextRoom;
            }

            const actionContainer = document.getElementById('eventActionContainer');
            if (actionContainer) {
                actionContainer.querySelectorAll('.dynamic-key-btn').forEach(b => b.remove());
            }

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

                        renderAndAnimateXPCards('eventLootContainer', data.players, 'treasure');

                        let gainedItemsHtml = '';
                        let goldAmount = 0;
                        let expAmount = 0;
                        if (data.combatLog) {
                            let chestLogs = [];
                            for (let i = data.combatLog.length - 1; i >= 0; i--) {
                                const log = data.combatLog[i];
                                chestLogs.unshift(log);
                                if (log.includes("Vous avez ouvert le coffre !")) {
                                    const goldMatch = log.match(/trouvez (\d+) Or/);
                                    if (goldMatch) goldAmount = parseInt(goldMatch[1]);
                                    const expMatch = log.match(/gagne (\d+) XP/);
                                    if (expMatch) expAmount = parseInt(expMatch[1]);
                                    break;
                                }
                            }

                            chestLogs.forEach(log => {
                                const itemNameMatch = log.match(/Vous avez (?:obtenu l'item|trouvé un objet)\s*:\s*(.*?)(?: !| et il a été ajouté| \(envoyé)/);
                                if (itemNameMatch) {
                                    const eqName = itemNameMatch[1];
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

                                    let inventoryStatus = log.includes("ajouté à l'inventaire") ? 'in_inventory' : (log.includes("envoyé au coffre") ? 'in_vault' : 'unknown');

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
                                }
                            });

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
                    }
                } else {
                    desc.textContent = `Un coffre mystérieux se trouve au centre de la pièce...`;
                    btnOpen.classList.remove('hidden');
                    btnCont.classList.add('hidden');
                    lootContainer.classList.add('hidden'); lootContainer.classList.remove('flex');
                    lootContainer.innerHTML = ''; // reset
                    delete lootContainer.dataset.filled;

                    const actionContainer = document.getElementById('eventActionContainer');
                    if (actionContainer && btnCont) {
                        const keys = data.activeConsumables ? data.activeConsumables.filter(eq => eq.consumableCategory === 'CLE') : [];
                        keys.forEach(key => {
                            const btn = document.createElement('button');
                            btn.className = 'action-btn epic dynamic-key-btn';
                            btn.onclick = () => openChest(key.id);
                            const bonus = key.specialEffectValue > 0 ? key.specialEffectValue : 10;
                            btn.innerHTML = `<span class="material-symbols-outlined">vpn_key</span> Ouvrir (${key.name} : +${bonus}% de butin)`;
                            actionContainer.insertBefore(btn, btnCont);
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
                        icon.className = 'material-symbols-outlined mb-4 text-[5rem] text-violet';
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

                            let rewType = data.currentRoom.alterationRewardType;
                            if (rewType === 'SPECIAL_ITEM' && !data.currentRoom.alterationSpecialItemReward) {
                                rewType = 'SPIRITUAL_XP';
                            }

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
                                    altarRewardHtml = `<div class="text-center" style="margin-top: 0.5rem; background: rgba(192, 132, 252, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.3);"><span style="color: #cbd5e1; margin-right: 0.5rem;"><strong>Récompense :</strong></span> <span class="font-bold relative" ${tooltipAttrs} style="color: ${rarityColor}; cursor: help; border-bottom: 1px dashed ${rarityColor};">${eq.name}${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}</span> <span class="text-sm font-bold" id="altarDropChance" style="margin-left: 0.5rem;"></span></div>`;
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
                                const eligible = anomalies.filter(a => {
                                    if (!a.magicObject || a.spiritualite !== data.currentRoom.altarRequiredSpirituality) return false;
                                    if (uniqueNames.has(a.name)) return false;
                                    uniqueNames.add(a.name);
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
                                            <span class="material-symbols-outlined cs-icon" style="color: ${spColor};">${firstCatIcon}</span> ${first.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${first.level || 1})</span>
                                        </span>
                                        <span class="material-symbols-outlined">expand_more</span>
                                    </div>
                                    <div class="custom-select-options">
                                `;
                                eligible.forEach(a => {
                                    let catIcon = a.category ? (getCategoryIcon(a.category)) : 'star';
                                    selectHtml += `<div class="custom-option" onclick="document.getElementById('altarAnomalySelectLabel').innerHTML = this.innerHTML; document.getElementById('altarAnomalySelect').value = '${a.id}'; document.getElementById('altarAnomalySelectWrapper').classList.remove('open'); if(window.updateAltarDropChance) window.updateAltarDropChance(${a.level || 1});"><span class="material-symbols-outlined cs-icon" style="color: ${spColor};">${catIcon}</span> ${a.name} <span style="opacity:0.5; font-size:0.8rem; margin-left:4px;">(Lvl ${a.level || 1})</span></div>`;
                                });
                                selectHtml += `
                                    </div>
                                </div>
                                <input type="hidden" id="altarAnomalySelect" value="${first.id}">
                                `;
                                window.updateAltarDropChance = function (level) {
                                    const el = document.getElementById('altarDropChance');
                                    if (el) {
                                        let chance = level === 1 ? 45 : (level === 2 ? 75 : 100);
                                        el.textContent = `(${chance}%)`;
                                        el.style.color = chance === 100 ? '#10b981' : (chance === 75 ? '#fbbf24' : '#ef4444');
                                    }
                                    const valEl = document.getElementById('altarDynamicRewardValue');
                                    if (valEl) {
                                        let multiplier = level === 1 ? 1.0 : (level === 2 ? 1.3 : 1.8);
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

                        lootContainer.innerHTML = `
                            <div class="flex-col items-center w-full" style="max-width: 600px;">
                                ${warningHtml}
                                ${specialItemHtml}
                                <div class="btn-row">
                                    <button type="button" id="btnAcceptAlteration" class="btn" style="flex: 1; max-width: 250px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" ${disabledState} onclick="event.preventDefault(); acceptAlteration();">${btnText}</button>
                                    <button type="button" class="btn text-muted" onclick="event.preventDefault(); nextRoom();" style="flex: 1; max-width: 250px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">Ignorer et passer</button>
                                </div>
                            </div>
                        `;
                    } else {
                        btnCont.classList.remove('hidden');
                        btnCont.textContent = 'Continuer';

                        if (!lootContainer.dataset.filled) {
                            lootContainer.dataset.filled = 'true';
                            lootContainer.innerHTML = ''; // Clear previous content

                            renderAndAnimateXPCards('eventLootContainer', data.players, 'alt');

                            let gainedItemsHtml = '';
                            if (data.combatLog) {
                                for (let i = data.combatLog.length - 1; i >= 0; i--) {
                                    const log = data.combatLog[i];

                                    const lostMatch = log.match(/sacrifi. l'item : (.*) !/);
                                    if (lostMatch) {
                                        const itemName = lostMatch[1].trim();
                                        let spColor = '#ef4444';
                                        let catIcon = 'star';
                                        if (Array.isArray(window.allAnomaliesCombat)) {
                                            const an = window.allAnomaliesCombat.find(a => a.name === itemName);
                                            if (an) {
                                                if (an.spiritualite === 'TENEBRES') spColor = '#a855f7';
                                                else if (an.spiritualite === 'ESPRIT') spColor = '#38bdf8';
                                                else if (an.spiritualite === 'KARMA') spColor = '#e7d198';
                                                catIcon = an.category ? (getCategoryIcon(an.category)) : 'star';
                                            }
                                        }
                                        gainedItemsHtml += `
                                            <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid ${spColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${spColor}; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                <span class="material-symbols-outlined" style="color: ${spColor};">${catIcon}</span> -1 ${itemName}
                                            </div>
                                        `;
                                    }

                                    const gainedMatch = log.match(/re.oit l'Item Sp.cial : (.*) !/);
                                    if (gainedMatch) {
                                        const itemName = gainedMatch[1].trim();
                                        let spColor = '#d946ef';
                                        let catIcon = 'star';
                                        if (Array.isArray(window.allAnomaliesCombat)) {
                                            const an = window.allAnomaliesCombat.find(a => a.name === itemName);
                                            if (an) {
                                                spColor = getSpiritualiteColor(an.spiritualite);
                                                catIcon = an.category ? (getCategoryIcon(an.category)) : 'star';
                                            }
                                        }
                                        gainedItemsHtml += `
                                            <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid ${spColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${spColor}; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                <span class="material-symbols-outlined" style="color: ${spColor};">${catIcon}</span> +1 ${itemName}
                                            </div>
                                        `;
                                    }

                                    const altarGoldMatch = log.match(/r.compense de (\d+) Or/);
                                    if (altarGoldMatch) {
                                        const goldAmount = altarGoldMatch[1];
                                        gainedItemsHtml += `
                                            <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(251, 191, 36, 0.5); padding: 0.8rem 1rem; border-radius: 8px; color: #fbbf24; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                <span class="material-symbols-outlined text-warning">monetization_on</span> +${goldAmount} Or
                                            </div>
                                        `;
                                    }

                                    const altarXpMatch = log.match(/accorde (\d+) XP de Spiritualit/);
                                    if (altarXpMatch) {
                                        const xpAmount = altarXpMatch[1];
                                        gainedItemsHtml += `
                                            <div class="flex-center" style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(245, 158, 11, 0.5); padding: 0.8rem 1rem; border-radius: 8px; color: #f59e0b; font-weight: 600; gap: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                                <span class="material-symbols-outlined" style="color: #f59e0b;">auto_awesome</span> +${xpAmount} XP Spirituel
                                            </div>
                                        `;
                                    }

                                    if (log.includes("Vous entrez dans") || log.includes("Vous trouvez un trésor") || log.startsWith("Événement :")) break;
                                }
                            }

                            if (data.currentRoom && data.currentRoom.altarRewardEquipment) {
                                const eq = data.currentRoom.altarRewardEquipment;
                                const slotInfo = typeof getSlotInfo === 'function' ? getSlotInfo(eq) : { icon: 'help', color: '#94a3b8' };
                                const rarityColor = typeof getRarityColor === 'function' ? getRarityColor(eq.rarity) : '#10b981';
                                const tooltipDataHtml = typeof window.getEquipmentTooltipHTML === 'function' ? window.getEquipmentTooltipHTML(eq) : '';
                                const tooltipAttrs = tooltipDataHtml ? 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"' : '';

                                gainedItemsHtml += `
                                    <div class="flex-center relative" ${tooltipAttrs} style="cursor: ${tooltipDataHtml ? 'help' : 'default'}; background: rgba(0, 0, 0, 0.4); border: 1px solid ${rarityColor}80; padding: 0.8rem 1rem; border-radius: 8px; color: ${rarityColor}; font-weight: 600; gap: 0.5rem; margin-top: 0.5rem; animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.8);">
                                        ${tooltipDataHtml ? `<template class="tooltip-data">${tooltipDataHtml}</template>` : ''}
                                        <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> <span style="${tooltipDataHtml ? `border-bottom: 1px dashed ${rarityColor};` : ''}">${eq.name}</span>
                                    </div>
                                `;
                            }

                            if (gainedItemsHtml) {
                                lootContainer.innerHTML += `
                                    <div class="btn-row" style="flex-wrap: wrap;">
                                        ${gainedItemsHtml}
                                    </div>
                                `;
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
                            let nameHtml = '';
                            let iconHtml = '';
                            let rarityColor = '#10b981';

                            if (entry.specialItemName) {
                                nameHtml = entry.specialItemName;
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
                                if (Array.isArray(window.allAnomaliesCombat)) {
                                    const anPrice = window.allAnomaliesCombat.find(a => a.name === entry.priceSpecialItemName);
                                    if (anPrice) {
                                        priceColor = getSpiritualiteColor(anPrice.spiritualite);
                                        priceIcon = anPrice.category ? (getCategoryIcon(anPrice.category)) : 'star';
                                    }
                                }
                                priceHtml += `<span class="flex-center" style="color: ${priceColor}; gap: 0.3rem; margin-left: ${goldPrice > 0 ? '0.8rem' : '0'};"><span class="material-symbols-outlined text-lg">${priceIcon}</span>1x ${entry.priceSpecialItemName}</span>`;
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
                                buttonHtml = `<button class="flex-center" id="btn_buy_${idx}" type="button" onclick="openBuyModal(${idx}, '${nameHtml.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${goldPrice}, ${specialItemNameArg})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 1rem; cursor: pointer; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
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
                                <div class="flex-center relative" ${tooltipAttrs} ${extraAttrs} onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';" style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${rarityColor}50; padding: 1rem; border-radius: 12px; justify-content: space-between; gap: 1rem; width: 48%; min-width: 350px; flex: 1 1 auto; max-width: 500px; transition: all 0.2s ease;">
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
                            let ropeButtonsHtml = '';
                            if (ropes.length > 0) {
                                ropes.forEach(rope => {
                                    ropeButtonsHtml += `<button type="button" class="btn" style="flex: 1; max-width: 250px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; margin-bottom: 0.5rem;" onclick="event.preventDefault(); useRope(${rope.id});"><span class="material-symbols-outlined text-[1.1rem] align-middle mr-1">gesture</span> Utiliser ${rope.name}</button>`;
                                });
                            } else {
                                ropeButtonsHtml = `<button type="button" class="btn" disabled title="Vous n'avez pas de corde" style="flex: 1; max-width: 250px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: not-allowed; opacity: 0.5; transition: all 0.2s ease; margin-bottom: 0.5rem;"><span class="material-symbols-outlined text-[1.1rem] align-middle mr-1">gesture</span> Utiliser une Corde</button>`;
                            }

                            lootContainer.classList.remove('hidden'); lootContainer.classList.add('flex');
                            lootContainer.innerHTML = `
                                <div class="flex-col items-center w-full">
                                    <div class="flex-col items-center w-full" style="display:flex;">
                                        ${ropeButtonsHtml}
                                    </div>
                                    <div class="btn-row" style="margin-top: 1rem;">
                                        <button type="button" class="btn text-muted" onclick="event.preventDefault(); nextRoom();" style="flex: 1; max-width: 250px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">Subir le piège et passer</button>
                                    </div>
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
                                const match = log.match(/Vous avez obtenu l'item : (.*?) !/);
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

            if (typeof window.renderOverlayInventory === 'function') window.renderOverlayInventory('eventOverlayInventoryList');
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
}

export function getBossBuffsHtml(c) {
    if (!c.passiveStates) return '';

    let html = '';
    const hasArmorBuff = (c.activeBuffs || c.buffs || []).some(b => b.statAffected === 'ARMURE' && b.flatValue === c.passiveStates['BOSS_BUFF_ARMOR']);
    const hasResistBuff = (c.activeBuffs || c.buffs || []).some(b => b.statAffected === 'RESISTANCE' && b.flatValue === c.passiveStates['BOSS_BUFF_RESIST']);

    if (c.passiveStates['BOSS_BUFF_HP']) html += `<span class="text-success" title="+${c.passiveStates['BOSS_BUFF_HP']}% PV Max (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">favorite</span>+${c.passiveStates['BOSS_BUFF_HP']}% PV</span>`;
    if (c.passiveStates['BOSS_BUFF_SHIELD'] && c.shieldTotal > 0) html += `<span title="+${c.passiveStates['BOSS_BUFF_SHIELD']}% Bouclier (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">shield</span>+${c.passiveStates['BOSS_BUFF_SHIELD']}% Boucl.</span>`;
    if (c.passiveStates['BOSS_BUFF_ARMOR'] && hasArmorBuff) html += `<span title="+${c.passiveStates['BOSS_BUFF_ARMOR']} Armure (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">security</span>+${c.passiveStates['BOSS_BUFF_ARMOR']} Arm.</span>`;
    if (c.passiveStates['BOSS_BUFF_RESIST'] && hasResistBuff) html += `<span title="+${c.passiveStates['BOSS_BUFF_RESIST']} Résistance (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(217, 70, 239, 0.15); color: #d946ef; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(217, 70, 239, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">health_and_safety</span>+${c.passiveStates['BOSS_BUFF_RESIST']} Rés.</span>`;
    if (c.passiveStates['BOSS_BUFF_BURN']) html += `<span class="text-error" title="Brûlure sur coup (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">local_fire_department</span>Brûlure</span>`;
    if (c.passiveStates['BOSS_BUFF_POISON']) html += `<span title="Poison sur coup (Boss Buff)" style="cursor: help; font-size: 0.75rem; background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined text-sm">pest_control</span>Poison</span>`;

    return html;
}

export function generateFighterHtml(c, isHero, skipBadges = false) {
    const hpPct = c.healthMax > 0 ? Math.max(0, Math.min(100, (c.healthCurrent / c.healthMax) * 100)) : 0;
    let hpLabel = `${c.healthCurrent} / ${c.healthMax}`;
    if (c.shieldTotal > 0) hpLabel += ` (+${c.shieldTotal} 🛡️)`;

    const manaPct = c.manaMax > 0 ? Math.max(0, Math.min(100, (c.manaCurrent / c.manaMax) * 100)) : 0;
    let manaHtml = `
        <div class="gauge-container mt-4" style="text-align: left;">
            <div class="gauge-label"><span>Mana</span><span>${c.manaCurrent} / ${c.manaMax}</span></div>
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
                    let speed = c.totalSpeed !== undefined ? c.totalSpeed : (c.speed || 0);
                    base = speed * 2;
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

    let statsHtml = `<div class="hero-stats-row" style="margin-bottom: 0.5rem; justify-content: center; display: flex; flex-wrap: wrap; gap: 0.3rem;">`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-purple">auto_awesome</span>${pui} Pui</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f43f5e;">fitness_center</span>${forPhy} For</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${arm} Arm</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-success">shield</span>${res} Rés</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-warning">bolt</span>${vit} Vit</span>`;
    statsHtml += `<span class="hero-stat-chip"><span class="material-symbols-outlined text-error">gps_fixed</span>${crit}% Crit</span>`;

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
        statsHtml += `<span class="hero-stat-chip" title="Cible < 50% PV (+20% dégâts physiques)" style="${styleLowHp}"><span class="material-symbols-outlined" style="color: inherit;">heart_broken</span>+20%</span>`;
        statsHtml += `<span class="hero-stat-chip" title="Cible avec Débuff (+15% dégâts physiques)" style="${styleDebuff}"><span class="material-symbols-outlined" style="color: inherit;">trending_down</span>+15%</span>`;
    }

    if (c.voie && c.voie.nom && (c.voie.nom.toLowerCase().includes('création') || c.voie.nom.toLowerCase().includes('creation'))) {
        let buds = (c.passiveStates && c.passiveStates['creation_buds']) || 0;
        let hasBuds = buds > 0;
        let styleCreation = hasBuds ? 'border-color: rgba(16, 185, 129, 0.6); color: #10b981;' : 'border-color: #4b5563; color: #6b7280; opacity: 0.5;';
        statsHtml += `<span class="hero-stat-chip" title="Bourgeons : ${buds}" style="${styleCreation}"><span class="material-symbols-outlined" style="color: inherit;">yard</span>${buds}</span>`;
    }

    if (c.voie && c.voie.nom && c.voie.nom.toLowerCase().includes('consolidation')) {
        let level = 0;
        if (c.passiveStates && c.passiveStates['consolidation_active_level'] !== undefined) {
            level = c.passiveStates['consolidation_active_level'];
        }

        let icon = 'shield', color = '#9ca3af', borderColor = 'rgba(156, 163, 175, 0.4)', text = '+5% Armure', title = "Consolidation (Défaut)";
        if (level === 1) {
            icon = 'speed'; color = '#f59e0b'; borderColor = 'rgba(245, 158, 11, 0.4)'; text = '+2 Vit'; title = "Consolidation (Niveau 1)";
        } else if (level === 2) {
            icon = 'shield'; color = '#10b981'; borderColor = 'rgba(16, 185, 129, 0.4)'; text = '+15% Armure'; title = "Consolidation (Niveau 2)";
        } else if (level === 3) {
            icon = 'security'; color = '#a855f7'; borderColor = 'rgba(168, 85, 247, 0.4)'; text = '+15% Résist'; title = "Consolidation (Niveau 3)";
        } else if (level === 4) {
            icon = 'water_drop'; color = '#3b82f6'; borderColor = 'rgba(59, 130, 246, 0.4)'; text = '-25% Coût'; title = "Consolidation (Niveau 4)";
        } else if (level === 5) {
            icon = 'gpp_good'; color = '#eab308'; borderColor = 'rgba(234, 179, 8, 0.4)'; text = '+10% Arm/Rés'; title = "Consolidation (Niveau 5)";
        }

        statsHtml += `<span class="hero-stat-chip" title="${title}" style="border-color: ${borderColor}; color: ${color};"><span class="material-symbols-outlined" style="color: inherit;">${icon}</span>${text}</span>`;
    }

    const hasKarma = c.hasKarma || (c.spiritualite && c.spiritualite.nom && c.spiritualite.nom.toLowerCase().includes('karma'));
    if (hasKarma) {
        let karmaLocked = c.karmaLocked || (c.passiveStates && c.passiveStates['karma_locked'] === 1);
        let karmaHarmony = c.karmaHarmony || (c.passiveStates && c.passiveStates['karma_harmony'] === 1);
        let karmaGauge = c.karmaGauge !== undefined ? c.karmaGauge : (c.passiveStates && c.passiveStates['karma_gauge'] !== undefined ? c.passiveStates['karma_gauge'] : 0);

        let karmaLockedDuration = c.passiveStates && c.passiveStates['karma_locked_duration'] !== undefined ? c.passiveStates['karma_locked_duration'] : 0;

        let borderColor, color, icon, text, title;
        if (karmaLocked) {
            borderColor = 'rgba(239, 68, 68, 0.4)'; color = '#f87171'; icon = 'block';
            text = `Brisé (${karmaLockedDuration})`; title = "Karma Brisé (Voie désactivée)";
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
            borderColor = 'rgba(156, 163, 175, 0.4)'; color = '#9ca3af'; icon = 'all_inclusive';
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
            const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

            monsterBadgesHtml += `<span class="text-error" ${tooltipAttrs} style="cursor: help; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:#ef4444; border-bottom: 1px solid #ef4444; padding-bottom: 4px;">${tLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${tTitle}</div></template><span class="material-symbols-outlined text-sm">${tIcon}</span>${tLabel}</span>`;
        }
        let behaviorName = typeof c.behavior === 'object' ? c.behavior?.name : c.behavior;
        if (behaviorName && behaviorName !== 'NORMAL') {
            const bTitle = typeof c.behavior === 'object' ? c.behavior.description : '';
            const bIcon = typeof c.behavior === 'object' ? c.behavior.icon : 'check_box_outline_blank';
            const bLabel = typeof c.behavior === 'object' ? c.behavior.label : behaviorName;
            const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

            monsterBadgesHtml += `<span ${tooltipAttrs} style="cursor: help; font-size: 0.75rem; background: rgba(139, 92, 246, 0.15); color: #8b5cf6; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem;"><template class="tooltip-data"><div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:#8b5cf6; border-bottom: 1px solid #8b5cf6; padding-bottom: 4px;">${bLabel}</div><div style="font-style:italic; color:#cbd5e1; margin-top:8px; max-width: 350px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${bTitle}</div></template><span class="material-symbols-outlined text-sm">${bIcon}</span>${bLabel}</span>`;
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
            mutationsHtml += `
                <div class="flex-center" ${tooltipAttrs} style="border-color: ${color}; color: ${color}; cursor: help; border-radius: 8px; border: 1px solid ${color}; background: #0f172a; width: 32px; height: 32px; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">
                    <template class="tooltip-data">
                        <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${color}; border-bottom: 1px solid ${color}; padding-bottom: 4px;">${mut.nom} <span class="text-xs" style="color: #cbd5e1;">(Lvl ${mut.level || 1})</span></div>
                        <div style="font-style:italic; color:#cbd5e1; margin-top:8px; width: max-content; max-width: 500px; line-height: 1.4; white-space: normal !important; word-wrap: break-word;">${mut.description || 'Une mutation monstrueuse.'}</div>
                    </template>
                    <span class="material-symbols-outlined text-lg">${icon}</span>
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

    return `
        ${mutationsHtml}
        ${channelingBadgeHtml}
        <div class="fighter-name" style="color: ${isHero ? '#f8fafc' : '#ef4444'}; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; gap: 0.2rem; margin-bottom: 0.8rem; width: 100%;">
            <span style="flex-shrink: 0; display: flex; align-items: center;">${avatarHtml}</span>
            <div style="display: flex; align-items: center; gap: 0.3rem; min-width: 0;">
                <span style="flex-shrink: 0; display: flex;">${titleIconsHtml}</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;" title="${c.name}">${c.name}</span>
            </div>
        </div>
        ${monsterBadgesHtml}
        ${statsHtml}
        <div class="gauge-container" style="text-align: left;">
            <div class="gauge-label"><span style="display:flex; align-items:center;">Santé (PV)${hpRegenBadge}</span><span>${hpLabel}</span></div>
            <div class="gauge-track"><div class="gauge-fill hp" style="width: ${hpPct}%;"></div></div>
        </div>
        ${manaHtml.replace('<span>Mana</span>', `<span style="display:flex; align-items:center;">Mana${manaRegenBadge}</span>`)}
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

export function renderEnemies(enemies) {
    const container = document.getElementById('enemiesContainer');
    container.innerHTML = '';

    const bossBuffsContainer = document.getElementById('bossBuffsContainer');
    if (bossBuffsContainer) {
        bossBuffsContainer.innerHTML = '';
    }

    let bossBuffsRendered = false;

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

        if (isBoss && bossBuffsContainer && !bossBuffsRendered) {
            const bossHtml = getBossBuffsHtml(pMonster);
            if (bossHtml) {
                bossBuffsContainer.innerHTML = bossHtml;
                bossBuffsRendered = true;
            }
        }

        div.innerHTML = generateFighterHtml(pMonster, false, isBoss);
        container.appendChild(div);
    });
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

    if (shieldEntries.length === 0) return '';

    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';

    return `<div class="sandbox-status-badge buff relative" ${tooltipAttrs} style="cursor: help; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; background: rgba(56, 189, 248, 0.1);">
        <span class="material-symbols-outlined text-sm">shield</span>
        <span>Boucliers (${totalShield})</span>
        <template class="tooltip-data">
            <div class="flex-col-xs">
                ${shieldEntries.join('')}
            </div>
        </template>
    </div>`;
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

            if (b.modifier && c) {
                let finalStat = null;
                const affected = b.statAffected ? b.statAffected.toUpperCase() : '';

                if (affected.includes('ARMURE') || affected.includes('ARMOR')) finalStat = c.totalArmor !== undefined ? c.totalArmor : c.armor;
                else if (affected.includes('RESISTANCE')) finalStat = c.totalResistance !== undefined ? c.totalResistance : c.resistance;
                else if (affected === 'POWER' || affected.includes('PUISSANCE')) finalStat = c.totalPower !== undefined ? c.totalPower : c.power;
                else if (affected.includes('STRENGTH') || affected.includes('FORCE')) finalStat = c.totalStrength !== undefined ? c.totalStrength : c.strength;
                else if (affected.includes('SPEED') || affected.includes('VITESSE')) finalStat = c.totalSpeed !== undefined ? c.totalSpeed : c.speed;
                else if (affected === 'CRIT' || affected.includes('CRITIQUE')) finalStat = c.totalCrit !== undefined ? c.totalCrit : c.crit;
                else if (affected.includes('HEALTH_MAX') || affected.includes('PV_MAX') || affected.includes('HP_MAX')) finalStat = c.healthMax;
                else if (affected.includes('MANA_MAX') || affected.includes('MP_MAX')) finalStat = c.manaMax;

                if (finalStat !== null && finalStat !== undefined) {
                    let totalModifier = 0;
                    const allBuffs = c.activeBuffs || c.buffs || [];
                    allBuffs.forEach(otherBuff => {
                        if (otherBuff.statAffected === b.statAffected && otherBuff.modifier) {
                            totalModifier += otherBuff.modifier;
                        }
                    });

                    let multiplier = Math.max(0, 1.0 + totalModifier);
                    let baseStat = multiplier > 0 ? (finalStat / multiplier) : 0;

                    let modFlat = Math.round(baseStat * b.modifier);
                    if (modFlat !== 0) {
                        effectiveFlat += modFlat;
                        showModifier = false;
                    }
                }
            }



            let text = '';
            if (effectiveFlat !== 0) {
                text += `${effectiveFlat > 0 ? '+' : ''}${effectiveFlat} ${ui.formatStat(b.statAffected)}`;
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
        castingTypeHtml = '<span class="material-symbols-outlined text-base text-violet" title="Action Canalisée">cyclone</span>';
        castingTypeHtml += sp.allowInstantDuringChanneling ?
            '<span class="material-symbols-outlined text-base text-gold" title="Instantanés autorisés pendant la canalisation">bolt</span>' :
            '<span class="relative" title="Instantanés interdits pendant la canalisation" style="display: inline-flex; align-items: center; justify-content: center; width: 1rem; height: 1rem;"><span class="material-symbols-outlined text-base text-slate">bolt</span><span class="absolute" style="width: 100%; height: 2px; background: #ef4444; transform: rotate(-45deg);"></span></span>';
    } else {
        castingTypeHtml = '<span class="material-symbols-outlined text-base text-blue" title="Action Banale">hourglass_empty</span>';
    }

    let categoryHtml = '';
    if (sp.category === 'INSPIRATION') {
        categoryHtml = '<span class="material-symbols-outlined text-base text-crimson" title="Sort d\'Inspiration">storm</span>';
    } else if (sp.category === 'EXPIRATION') {
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
        <div id="spell-card-${sp.id}" class="combat-spell-card spell-btn${disabledClass}" style="border-top: 2px solid ${titleColor}; position: relative;" ${onClickAttr} ${tooltipAttrs}>
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