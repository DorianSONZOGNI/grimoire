// hunting.js — Tableau de Chasse

let currentUser = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => { if (window.currentUser !== undefined) { initHunting(); } else { const authHandler = () => { initHunting(); window.removeEventListener('authLoaded', authHandler); }; window.addEventListener('authLoaded', authHandler); } });

let isHuntingInitialized = false;
async function initHunting() {
    if (isHuntingInitialized) return;
    if (!window.currentUser) {
        window.location.href = '/login.html';
        return;
    }
    isHuntingInitialized = true;
    currentUser = window.currentUser.username;
    await loadAll();

    // Refresh toutes les 30s
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadAll, 30000);
}

async function loadAll() {
    await Promise.all([loadDaily(), loadWeekly()]);
}

// ═══════════════════════════════════════════════════════════════════════
// DAILY
// ═══════════════════════════════════════════════════════════════════════

async function loadDaily() {
    try {
        const res = await window.globalFetch('/api/pve/hunting/daily');
        const data = await res.json();

        const card = document.getElementById('dailyCard');
        if (!data.quest) {
            card.innerHTML = '<div class="quest-card-loading"><span class="material-symbols-outlined">block</span> Aucune quête journalière active.</div>';
            return;
        }

        const quest = data.quest;
        const lb = data.leaderboard || [];
        const reward = data.reward || {};
        const myEntry = data.myEntry || null;

        // Timer
        updateTimer('dailyTimer', quest.endDate, 'Renouvellement dans');

        card.innerHTML = `
            <div class="quest-card-inner">
                <div class="quest-dungeon-info">
                    <div class="quest-dungeon-name">${escHtml(quest.dungeonName)}</div>
                    <div class="quest-meta">
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">signal_cellular_alt</span>
                            Niveau ${quest.dungeonLevel}
                        </span>
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">door_front</span>
                            ${quest.dungeonRoomCount} salles
                        </span>
                        ${quest.requiredSecret ? `
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">lock</span>
                            ${escHtml(quest.requiredSecret)} Niv.${quest.requiredSecretLevel}
                        </span>` : ''}
                    </div>
                    <div class="quest-reward-box" style="position: relative;">
                        <div class="quest-reward-title" style="display: flex; align-items: center;">
                            <span class="material-symbols-outlined" style="font-size: 1rem; margin-right: 4px;">payments</span>
                            Récompenses en Or
                        </div>
                        ${quest.dailyChallengeDuo ? `<div class="badge-quest daily" style="position: absolute; top: -12px; right: -12px; background: rgba(15, 23, 42, 0.95); border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 2px solid #f59e0b; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4); cursor: pointer;" onmouseenter="if(window.showGlobalTooltip) window.showGlobalTooltip(this)" onmouseleave="if(window.hideGlobalTooltip) window.hideGlobalTooltip()" data-tooltip-html="<div style='padding:4px;'><strong>Défi du jour : <span style='color:#f59e0b;'>${getChallengeTitle(quest.dailyChallengeDuo)}</span></strong><br>${getChallengeDuoText(quest.dailyChallengeDuo).replace(/"/g, '&quot;')}</div>">
                            <span class="material-symbols-outlined text-warning badge-icon" style="font-size: 1.5rem;">workspace_premium</span>
                        </div>` : ''}
                        <div class="quest-reward-detail">
                            🥉 Bronze (Terminer le donjon) : <strong>${reward['base'] || '?'}</strong> gold<br>
                            🥈 Argent (1 challenge) : <strong>+${Math.floor((reward['base'] || 0) * 2.00)}</strong> gold<br>
                            🥇 Or (2 challenges) : <strong>+${Math.floor((reward['base'] || 0) * 3.00)}</strong> gold
                        </div>
                    </div>
                    ${renderClaimButton(quest, myEntry, 'daily')}
                </div>
                <div class="quest-leaderboard">
                    <div class="quest-leaderboard-title">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">emoji_events</span>
                        Héros du jour
                    </div>
                    <div class="quest-leaderboard-list">
                        ${renderLeaderboard(lb, 'daily')}
                    </div>
                </div>
            </div>
        `;

        bindClaimButton(card, quest.id);

        // Previous daily
        const prevSection = document.getElementById('previousDailySection');
        const prevCard = document.getElementById('previousDailyCard');
        if (data.previous && data.previous.quest) {
            prevSection.style.display = 'block';
            const pQuest = data.previous.quest;
            const pLb = data.previous.leaderboard || [];
            const pEntry = data.previous.myEntry || null;
            const pReward = data.previous.reward || {};
            
            updateTimer('previousDailyTimer', pQuest.endDate, 'Expire dans', 1);
            
            prevCard.innerHTML = `
                <div class="quest-card-inner">
                    <div class="quest-dungeon-info">
                        <div class="quest-dungeon-name">${escHtml(pQuest.dungeonName)}</div>
                        <div class="quest-meta">
                            <span class="quest-meta-tag">
                                <span class="material-symbols-outlined">signal_cellular_alt</span>
                                Niveau ${pQuest.dungeonLevel}
                            </span>
                        </div>
                        <div class="quest-reward-box">
                            <div class="quest-reward-title">
                                <span class="material-symbols-outlined" style="font-size: 1rem;">payments</span>
                                Récompenses en Or
                            </div>
                            <div class="quest-reward-detail">
                                🥇 1er : <strong>${pReward['1st'] || '?'}</strong> gold &nbsp;
                                🥈 2ème : <strong>${pReward['2nd'] || '?'}</strong> gold &nbsp;
                                🥉 3ème : <strong>${pReward['3rd'] || '?'}</strong> gold<br>
                                <span style="font-size: 0.85em; color: #94a3b8; display: inline-block; margin-top: 4px;">4ème et + : <strong>${pReward['other'] || '0'}</strong> gold</span>
                            </div>
                        </div>
                        ${renderClaimButton(pQuest, pEntry, 'daily')}
                    </div>
                    <div class="quest-leaderboard">
                        <div class="quest-leaderboard-title">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">military_tech</span>
                            Classement Final
                        </div>
                        <div class="quest-leaderboard-list">
                            ${renderLeaderboard(pLb, 'daily')}
                        </div>
                    </div>
                </div>
            `;
            bindClaimButton(prevCard, pQuest.id);
        } else {
            prevSection.style.display = 'none';
        }

    } catch (e) {
        console.error('Error loading daily quest:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// WEEKLY
// ═══════════════════════════════════════════════════════════════════════

async function loadWeekly() {
    try {
        const res = await window.globalFetch('/api/pve/hunting/weekly');
        const data = await res.json();

        const card = document.getElementById('weeklyCard');
        if (!data.quest) {
            card.innerHTML = '<div class="quest-card-loading"><span class="material-symbols-outlined">block</span> Aucune quête hebdomadaire active.</div>';
            return;
        }

        const quest = data.quest;
        const lb = data.leaderboard || [];
        const myEntry = data.myEntry || null;

        updateTimer('weeklyTimer', quest.endDate, 'Fin dans');

        window._weeklyTop20Threshold = data.top20Threshold || 1;

        card.innerHTML = `
            <div class="quest-card-inner">
                <div class="quest-dungeon-info">
                    <div class="quest-dungeon-name">${escHtml(quest.dungeonName)}</div>
                    <div class="quest-meta">
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">signal_cellular_alt</span>
                            Niveau ${quest.dungeonLevel}
                        </span>
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">door_front</span>
                            ${quest.dungeonRoomCount} salles
                        </span>
                        ${quest.requiredSecret ? `
                        <span class="quest-meta-tag">
                            <span class="material-symbols-outlined">lock</span>
                            ${escHtml(quest.requiredSecret)} Niv.${quest.requiredSecretLevel}
                        </span>` : ''}
                    </div>
                    <div class="quest-reward-box weekly-reward">
                        <div class="quest-reward-title">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">auto_awesome</span>
                            Récompense — Anomalie
                        </div>
                        <div class="quest-reward-detail">
                            Les <strong>${data.top20Threshold || 1}</strong> meilleur(s) joueur(s) (top 20% de ${data.totalParticipants || 0} participants) avec le moins de tours reçoivent une
                            <strong>Anomalie Niv.${quest.requiredSecretLevel || 2}</strong> liée au secret <strong>${escHtml(quest.requiredSecret || '?')}</strong>.
                        </div>
                    </div>
                    ${renderClaimButton(quest, myEntry, 'weekly', data.rewardAnomalie)}
                </div>
                <div class="quest-leaderboard">
                    <div class="quest-leaderboard-title">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">military_tech</span>
                        Classement — Moins de Tours
                    </div>
                    <div class="quest-leaderboard-list">
                        ${renderLeaderboard(lb, 'weekly')}
                    </div>
                </div>
            </div>
        `;

        bindClaimButton(card, quest.id);

        // Previous weekly
        const prevSection = document.getElementById('previousWeeklySection');
        const prevCard = document.getElementById('previousWeeklyCard');
        if (data.previous && data.previous.quest) {
            prevSection.style.display = 'block';
            const pQuest = data.previous.quest;
            const pLb = data.previous.leaderboard || [];
            const pEntry = data.previous.myEntry || null;
            
            updateTimer('previousWeeklyTimer', pQuest.endDate, 'Expire dans', 7);

            prevCard.innerHTML = `
                <div class="quest-card-inner">
                    <div class="quest-dungeon-info">
                        <div class="quest-dungeon-name">${escHtml(pQuest.dungeonName)}</div>
                        <div class="quest-meta">
                            <span class="quest-meta-tag">
                                <span class="material-symbols-outlined">signal_cellular_alt</span>
                                Niveau ${pQuest.dungeonLevel}
                            </span>
                        </div>
                        ${renderClaimButton(pQuest, pEntry, 'weekly', data.previous.rewardAnomalie)}
                    </div>
                    <div class="quest-leaderboard">
                        <div class="quest-leaderboard-title">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">military_tech</span>
                            Classement Final
                        </div>
                        <div class="quest-leaderboard-list">
                            ${renderLeaderboard(pLb, 'weekly')}
                        </div>
                    </div>
                </div>
            `;
            bindClaimButton(prevCard, pQuest.id);
        } else {
            prevSection.style.display = 'none';
        }
    } catch (e) {
        console.error('Error loading weekly quest:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// RENDERING HELPERS
// ═══════════════════════════════════════════════════════════════════════

function renderLeaderboard(entries, type) {
    if (!entries || entries.length === 0) {
        return '<div class="lb-empty">Aucun participant pour le moment. Soyez le premier !</div>';
    }

    return entries.map((e, i) => {
        const rankNum = e.rank || (i + 1);
        let rankClass = 'normal';
        let rankIcon = rankNum;
        if (type === 'daily') {
            let challs = (e.challenge1Completed ? 1 : 0) + (e.challenge2Completed ? 1 : 0);
            if (challs === 2) { rankClass = 'gold'; rankIcon = '🥇'; }
            else if (challs === 1) { rankClass = 'silver'; rankIcon = '🥈'; }
            else { rankClass = 'bronze'; rankIcon = '🥉'; }
        } else {
            if (rankNum === 1) { rankClass = 'gold'; rankIcon = '🥇'; }
            else if (rankNum === 2) { rankClass = 'silver'; rankIcon = '🥈'; }
            else if (rankNum === 3) { rankClass = 'bronze'; rankIcon = '🥉'; }
        }

        const isMe = currentUser && e.accountName === currentUser;
        const stat = type === 'daily'
            ? (e.firstCompletionTime ? formatTime(e.firstCompletionTime) : '')
            : (e.bestTurnCount != null ? `${e.bestTurnCount} tour${e.bestTurnCount > 1 ? 's' : ''}` : 'Non terminé');

        return `
            <div class="lb-row ${isMe ? 'me' : ''}">
                <span class="lb-rank ${rankClass}">${rankIcon}</span>
                <span class="lb-name">${escHtml(e.accountName)}${isMe ? ' (vous)' : ''}</span>
                <span class="lb-stat">${stat}</span>
            </div>
        `;
    }).join('');
}

function renderClaimButton(quest, myEntry, type, rewardAnomalie = null) {
    if (!currentUser) return '';

    let anomalieHtml = '';
    if (rewardAnomalie) {
        const icon = window.getCategoryIcon ? window.getCategoryIcon(rewardAnomalie.category) : 'auto_awesome';
        const color = window.getSpiritualiteColor ? window.getSpiritualiteColor(rewardAnomalie.spiritualite) : '#a855f7';
        const tooltipHtml = window.getAnomalyTooltipHTML(rewardAnomalie, rewardAnomalie.name).replace(/"/g, '&quot;');
        anomalieHtml = `<div class="reward-anomalie-badge" style="border: 2px solid ${color}; color: ${color}; box-shadow: 0 0 10px ${color}40;" onmouseenter="if(window.showGlobalTooltip) window.showGlobalTooltip(this)" onmouseleave="if(window.hideGlobalTooltip) window.hideGlobalTooltip()" data-tooltip-html="${tooltipHtml}"><span class="material-symbols-outlined">${icon}</span></div>`;
    }

    if (!myEntry) {
        return `<button class="btn-claim locked" title="Vous n'avez pas de score sur cette quête."><span class="material-symbols-outlined">lock</span> Non participé ${anomalieHtml}</button>`;
    }

    if (type === 'daily') {
        let buttons = [];
        let completedChalls = (myEntry.challenge1Completed ? 1 : 0) + (myEntry.challenge2Completed ? 1 : 0);
        
        // Bronze
        if (myEntry.rewardBronzeClaimed) {
            buttons.push(`<button class="btn-claim claimed" style="flex: 1; font-size: 0.85em; padding: 6px;"><span class="material-symbols-outlined">check_circle</span> Bronze</button>`);
        } else {
            buttons.push(`<button class="btn-claim claimable" data-quest-id="${quest.id}" data-tier="BRONZE" style="flex: 1; font-size: 0.85em; padding: 6px; background: #cd7f32; color: #fff;"><span class="material-symbols-outlined">redeem</span> Bronze</button>`);
        }
        
        // Silver
        if (myEntry.rewardSilverClaimed) {
            buttons.push(`<button class="btn-claim claimed" style="flex: 1; font-size: 0.85em; padding: 6px;"><span class="material-symbols-outlined">check_circle</span> Argent</button>`);
        } else if (completedChalls >= 1) {
            buttons.push(`<button class="btn-claim claimable" data-quest-id="${quest.id}" data-tier="SILVER" style="flex: 1; font-size: 0.85em; padding: 6px; background: #c0c0c0; color: #000;"><span class="material-symbols-outlined">redeem</span> Argent</button>`);
        } else {
            buttons.push(`<button class="btn-claim locked" style="flex: 1; font-size: 0.85em; padding: 6px;"><span class="material-symbols-outlined">lock</span> Argent</button>`);
        }
        
        // Gold
        if (myEntry.rewardGoldClaimed) {
            buttons.push(`<button class="btn-claim claimed" style="flex: 1; font-size: 0.85em; padding: 6px;"><span class="material-symbols-outlined">check_circle</span> Or</button>`);
        } else if (completedChalls >= 2) {
            buttons.push(`<button class="btn-claim claimable" data-quest-id="${quest.id}" data-tier="GOLD" style="flex: 1; font-size: 0.85em; padding: 6px; background: #ffd700; color: #000;"><span class="material-symbols-outlined">redeem</span> Or</button>`);
        } else {
            buttons.push(`<button class="btn-claim locked" style="flex: 1; font-size: 0.85em; padding: 6px;"><span class="material-symbols-outlined">lock</span> Or</button>`);
        }
        
        return `<div style="display: flex; gap: 8px; width: 100%; margin-top: 12px;">${buttons.join('')}</div>`;
    }

    if (myEntry.rewardClaimed) {
        return `<button class="btn-claim claimed"><span class="material-symbols-outlined">check_circle</span> Récompense récupérée ${anomalieHtml}</button>`;
    }

    if (type === 'weekly' && quest.active) {
        return `<button class="btn-claim locked"><span class="material-symbols-outlined">hourglass_top</span> Disponible à la fin de la semaine ${anomalieHtml}</button>`;
    }

    if (type === 'weekly' && (myEntry.rank < 1 || myEntry.rank > (window._weeklyTop20Threshold || 1))) {
        return `<button class="btn-claim locked"><span class="material-symbols-outlined">lock</span> Réservé au Top 20% ${anomalieHtml}</button>`;
    }

    return `<button class="btn-claim claimable" data-quest-id="${quest.id}"><span class="material-symbols-outlined">redeem</span> Récupérer la récompense ${anomalieHtml}</button>`;
}

function bindClaimButton(container, questId) {
    const btns = container.querySelectorAll('.btn-claim.claimable');
    btns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            if (originalHtml.includes('material-symbols-outlined')) {
                btn.innerHTML = originalHtml.replace(/<span class="material-symbols-outlined">[^<]*<\/span>/, '<span class="material-symbols-outlined spin">progress_activity</span>');
            } else {
                btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>...';
            }
            try {
                const tier = btn.getAttribute('data-tier') || '';
                const res = await window.globalFetch(`/api/pve/hunting/claim/${questId}${tier ? '?tier=' + tier : ''}`, { method: 'POST' });
                const data = await res.json();
                if (data.error) {
                    alert(data.error);
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">redeem</span> Récupérer la récompense';
                } else {
                    btn.className = 'btn-claim claimed';
                    btn.style.background = '';
                    btn.style.color = '';
                    if (originalHtml && originalHtml.includes('material-symbols-outlined')) {
                        btn.innerHTML = originalHtml.replace(/<span class="material-symbols-outlined">[^<]*<\/span>/, '<span class="material-symbols-outlined">check_circle</span>');
                    } else {
                        btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Récupéré`;
                    }
                    if (window.showNotif && data.message) window.showNotif(data.message, false);
                    
                    // Diminuer le badge rouge en temps réel
                    const badge = document.getElementById('navHuntingBadge');
                    if (badge) {
                        let currentCount = parseInt(badge.textContent) || 0;
                        if (currentCount > 1) {
                            badge.textContent = currentCount - 1;
                        } else {
                            badge.style.display = 'none';
                        }
                    }
                    if (window.currentUser && window.currentUser.huntingClaimable > 0) {
                        window.currentUser.huntingClaimable--;
                    }
                    try { const meRes = await window.globalFetch('/api/auth/me'); if (meRes.ok) { const meData = await meRes.json(); const prevGold = window.currentUser.monnaie; window.currentUser.monnaie = meData.monnaie; const goldEl = document.getElementById('navUserGold'); if (goldEl && window.animateGoldValue) { window.animateGoldValue(goldEl, prevGold, meData.monnaie, 1000); } else if (goldEl) { goldEl.textContent = Number(meData.monnaie).toFixed(1); } } } catch(e){}
                }
            } catch (e) {
                alert('Erreur lors de la récupération.');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

let dynamicTimers = {};

function updateTimer(elementId, endDateStr, prefix, offsetDays = 0, isDynamic = true) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (dynamicTimers[elementId]) {
        clearInterval(dynamicTimers[elementId]);
        delete dynamicTimers[elementId];
    }

    let end;
    if (elementId === 'dailyTimer') {
        // Le timer journalier compte toujours jusqu'à minuit du jour actuel
        end = new Date();
        end.setHours(24, 0, 0, 0);
    } else {
        end = new Date(endDateStr + 'T00:00:00');
        if (offsetDays) {
            end.setDate(end.getDate() + offsetDays);
        }
    }

    const tick = () => {
        const now = new Date();
        const diff = end - now;

        if (diff <= 0) {
            el.textContent = prefix + ' : bientôt…';
            if (dynamicTimers[elementId]) {
                clearInterval(dynamicTimers[elementId]);
                delete dynamicTimers[elementId];
            }
            return;
        }

        const hoursTotal = Math.floor(diff / (1000 * 60 * 60));
        const hours = hoursTotal % 24;
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (isDynamic) {
            if (hoursTotal >= 24) {
                const days = Math.floor(hoursTotal / 24);
                el.textContent = `${prefix} ${days}j ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                el.textContent = `${prefix} ${hoursTotal.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } else {
            if (hoursTotal >= 24) {
                const days = Math.floor(hoursTotal / 24);
                el.textContent = `${prefix} ${days}j ${hours}h`;
            } else {
                el.textContent = `${prefix} ${hoursTotal}h ${minutes}m`;
            }
        }
    };

    tick();
    if (isDynamic && end - new Date() > 0) {
        dynamicTimers[elementId] = setInterval(tick, 1000);
    }
}

function formatTime(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return '';
    }
}

function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


function getChallengeTitle(duo) {
    switch (duo) {
        case 'HEADHUNTER': return 'Chasseur de têtes';
        case 'SURGEON': return 'Chirurgien';
        case 'LONER': return 'Loup solitaire';
        case 'IMPATIENT': return 'Impatient';
        default: return duo;
    }
}

function getChallengeDuoText(duo) {
    switch (duo) {
        case 'HEADHUNTER':
            return "<ul style='margin:0; padding-left:16px; margin-top:4px; color:#e2e8f0; line-height:1.4;'><li>Tuer les monstres du plus grand PV max au plus petit</li><li style='margin-top:4px;'>Achever tous les monstres avec une attaque de base</li></ul>";
        case 'SURGEON':
            return "<ul style='margin:0; padding-left:16px; margin-top:4px; color:#e2e8f0; line-height:1.4;'><li>Tuer tous les monstres durant le même tour (par salle)</li><li style='margin-top:4px;'>Ne pas perdre plus de 20% de vos PV max sur un héros</li></ul>";
        case 'LONER':
            return "<ul style='margin:0; padding-left:16px; margin-top:4px; color:#e2e8f0; line-height:1.4;'><li>Terminer le donjon avec un seul héros</li><li style='margin-top:4px;'>Tuer un seul monstre par tour maximum</li></ul>";
        case 'IMPATIENT':
            return "<ul style='margin:0; padding-left:16px; margin-top:4px; color:#e2e8f0; line-height:1.4;'><li>Terminer chaque salle de combat en 3 tours max</li><li style='margin-top:4px;'>Tuer les monstres en 2 attaques directes max par monstre</li></ul>";
        default: return "";
    }
}
