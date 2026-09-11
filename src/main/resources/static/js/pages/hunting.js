// hunting.js — Tableau de Chasse

let currentUser = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('authLoaded', initHunting);
});

async function initHunting() {
    currentUser = window.currentUser ? window.currentUser.username : null;
    await loadAll();

    // Refresh toutes les 30s
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
                    <div class="quest-reward-box">
                        <div class="quest-reward-title">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">payments</span>
                            Récompenses en Or
                        </div>
                        <div class="quest-reward-detail">
                            🥇 1er : <strong>${reward['1st'] || '?'}</strong> gold &nbsp;
                            🥈 2ème : <strong>${reward['2nd'] || '?'}</strong> gold &nbsp;
                            🥉 3ème : <strong>${reward['3rd'] || '?'}</strong> gold
                        </div>
                    </div>
                    ${renderClaimButton(quest, myEntry, 'daily')}
                </div>
                <div class="quest-leaderboard">
                    <div class="quest-leaderboard-title">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">emoji_events</span>
                        Premiers à conquérir
                    </div>
                    ${renderLeaderboard(lb, 'daily')}
                </div>
            </div>
        `;

        bindClaimButton(card, quest.id);
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
                            Top 3 des comptes avec le plus de victoires sur ce donjon reçoivent une
                            <strong>Anomalie Niv.2+</strong> liée au secret <strong>${escHtml(quest.requiredSecret || '?')}</strong>.
                        </div>
                    </div>
                    ${renderClaimButton(quest, myEntry, 'weekly', data.rewardAnomalie)}
                </div>
                <div class="quest-leaderboard">
                    <div class="quest-leaderboard-title">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">military_tech</span>
                        Meilleurs Chasseurs
                    </div>
                    ${renderLeaderboard(lb, 'weekly')}
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
                        ${renderLeaderboard(plb, 'weekly')}
                    </div>
                </div>
            `;
            bindClaimButton(prevCard, pq.id);
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
        if (rankNum === 1) { rankClass = 'gold'; rankIcon = '🥇'; }
        else if (rankNum === 2) { rankClass = 'silver'; rankIcon = '🥈'; }
        else if (rankNum === 3) { rankClass = 'bronze'; rankIcon = '🥉'; }

        const isMe = currentUser && e.accountName === currentUser;
        const stat = type === 'daily'
            ? (e.firstCompletionTime ? formatTime(e.firstCompletionTime) : '')
            : `${e.completionCount} victoire${e.completionCount > 1 ? 's' : ''}`;

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

    // Construction du badge d'anomalie s'il existe
    let anomalieHtml = '';
    if (rewardAnomalie) {
        const icon = window.getCategoryIcon ? window.getCategoryIcon(rewardAnomalie.category) : 'auto_awesome';
        const color = window.getSpiritualiteColor ? window.getSpiritualiteColor(rewardAnomalie.spiritualite) : '#a855f7';
        
        // Escape quotes to safely put HTML into an attribute
        const tooltipHtml = window.getAnomalyTooltipHTML(rewardAnomalie, rewardAnomalie.name).replace(/"/g, '&quot;');
        
        anomalieHtml = `
            <div class="reward-anomalie-badge" 
                 style="border: 2px solid ${color}; color: ${color}; box-shadow: 0 0 10px ${color}40;"
                 onmouseenter="if(window.showGlobalTooltip) window.showGlobalTooltip(this)"
                 onmouseleave="if(window.hideGlobalTooltip) window.hideGlobalTooltip()"
                 data-tooltip-html="${tooltipHtml}">
                <span class="material-symbols-outlined">${icon}</span>
            </div>
        `;
    }

    if (!myEntry) {
        return `<button class="btn-claim locked">
            <span class="material-symbols-outlined">lock</span>
            Terminez le défi pour débloquer
            ${anomalieHtml}
        </button>`;
    }

    if (myEntry.rewardClaimed) {
        return `<button class="btn-claim claimed">
            <span class="material-symbols-outlined">check_circle</span>
            Récompense récupérée
            ${anomalieHtml}
        </button>`;
    }

    // Daily : top 3 seulement
    if (type === 'daily' && (myEntry.rank < 1 || myEntry.rank > 3)) {
        return `<button class="btn-claim locked">
            <span class="material-symbols-outlined">lock</span>
            Réservé au Top 3
            ${anomalieHtml}
        </button>`;
    }

    // Weekly active : on peut claim seulement si la quête est terminée (pas active)
    if (type === 'weekly' && quest.active) {
        return `<button class="btn-claim locked">
            <span class="material-symbols-outlined">hourglass_top</span>
            Disponible à la fin de la semaine
            ${anomalieHtml}
        </button>`;
    }

    // Weekly : top 3 seulement
    if (type === 'weekly' && (myEntry.rank < 1 || myEntry.rank > 3)) {
        return `<button class="btn-claim locked">
            <span class="material-symbols-outlined">lock</span>
            Réservé au Top 3
            ${anomalieHtml}
        </button>`;
    }

    return `<button class="btn-claim claimable" data-quest-id="${quest.id}">
        <span class="material-symbols-outlined">redeem</span>
        Récupérer la récompense
        ${anomalieHtml}
    </button>`;
}

function bindClaimButton(container, questId) {
    const btn = container.querySelector('.btn-claim.claimable');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Récupération…';
            try {
                const res = await window.globalFetch(`/api/pve/hunting/claim/${questId}`, { method: 'POST' });
                const data = await res.json();
                if (data.error) {
                    alert(data.error);
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">redeem</span> Récupérer la récompense';
                } else {
                    btn.className = 'btn-claim claimed';
                    btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> ${escHtml(data.message)}`;
                    
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
                }
            } catch (e) {
                alert('Erreur lors de la récupération.');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">redeem</span> Récupérer la récompense';
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function updateTimer(elementId, endDateStr, prefix) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const end = new Date(endDateStr + 'T00:00:00');
    const now = new Date();
    const diff = end - now;

    if (diff <= 0) {
        el.textContent = prefix + ' : bientôt…';
        return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        el.textContent = `${prefix} ${days}j ${hours % 24}h`;
    } else {
        el.textContent = `${prefix} ${hours}h ${minutes}m`;
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
