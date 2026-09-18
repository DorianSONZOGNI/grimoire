// dungeon-stats.js

let allRuns = [];
let globalStats = {};

let outcomesChartInstance = null;
let classesChartInstance = null;
let spiritualityChartInstance = null;

// Theming for charts to match the site
const chartTheme = {
    color: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    fontFamily: "'Outfit', sans-serif"
};

Chart.defaults.color = chartTheme.color;
Chart.defaults.font.family = chartTheme.fontFamily;
Chart.defaults.scale.grid.color = chartTheme.gridColor;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('authLoaded', initStats);
});

async function initStats() {
    if (!window.isAdmin) {
        window.location.href = '/';
        return;
    }

    try {
        const res = await window.globalFetch('/api/pve/admin/stats/dungeons');
        const data = await res.json();
        
        allRuns = data.runs;
        globalStats = data.globalStatsByDungeon;

        // Fetch dungeons for secrets
        const donjonsRes = await window.globalFetch('/api/pve/dungeons');
        const allDonjons = await donjonsRes.json();
        window.dungeonSecretMap = {};
        allDonjons.forEach(d => {
            window.dungeonSecretMap[d.id] = d.requiredSecret;
        });

        // Sort runs by timestamp desc
        allRuns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        populateDungeonSelect();
        
        document.getElementById('statsLoader').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';

        renderDashboard('ALL');

    } catch (e) {
        console.error("Erreur stats", e);
        document.getElementById('statsLoader').setAttribute('message', 'Erreur de chargement des statistiques');
    }
}

function populateDungeonSelect() {
    const optionsContainer = document.getElementById('dungeonSelectOptions');
    if (!optionsContainer) return;
    
    // Extract unique dungeons
    const uniqueDungeons = {};
    for (const key in globalStats) {
        uniqueDungeons[key] = globalStats[key].dungeonName;
    }

    const dungeonsList = Object.keys(uniqueDungeons).map(key => {
        const dId = key.split('_')[0];
        const secret = window.dungeonSecretMap[dId];
        return { key, name: uniqueDungeons[key], secret };
    });

    let html = `<div class="custom-option" onclick="selectDungeonFilter('ALL', 'Tous les donjons')">Tous les donjons</div>`;
    
    // Group dungeons by secret to create the "Secret" aggregates
    const secretsPresent = [...new Set(dungeonsList.map(d => d.secret).filter(s => s))];
    if (secretsPresent.length > 0) {
        html += `<div class="text-xs text-slate-500 px-3 py-1 mt-2 uppercase tracking-wider font-bold">Par Secret</div>`;
        secretsPresent.forEach(secret => {
            const secretMeta = (window.DEFAULT_SECRETS_META || []).find(s => s.name === secret) || { icon: 'help', color: '#fff' };
            const iconHtml = `<span class="material-symbols-outlined" style="color: ${secretMeta.color}; font-size: 1.2rem;">${secretMeta.icon}</span>`;
            const escapedSecret = secret.replace(/'/g, "\\'");
            html += `<div class="custom-option flex items-center gap-2" onclick="selectDungeonFilter('SECRET_${escapedSecret}', 'Tous - ${escapedSecret}', '${escapedSecret}')">
                ${iconHtml}
                <span>Tous - ${secret}</span>
            </div>`;
        });
    }

    // Individual dungeons sorted by secret then name
    dungeonsList.sort((a, b) => {
        if (a.secret !== b.secret) {
            if (!a.secret) return 1;
            if (!b.secret) return -1;
            return a.secret.localeCompare(b.secret);
        }
        return a.name.localeCompare(b.name);
    });

    html += `<div class="text-xs text-slate-500 px-3 py-1 mt-2 uppercase tracking-wider font-bold">Donjons Individuels</div>`;
    dungeonsList.forEach(d => {
        let iconHtml = '';
        let secretArg = 'null';
        if (d.secret) {
            const secretMeta = (window.DEFAULT_SECRETS_META || []).find(s => s.name === d.secret) || { icon: 'help', color: '#fff' };
            iconHtml = `<span class="material-symbols-outlined" style="color: ${secretMeta.color}; font-size: 1.2rem;" title="${d.secret.replace(/"/g, '&quot;')}">${secretMeta.icon}</span>`;
            secretArg = `'${d.secret.replace(/'/g, "\\'")}'`;
        } else {
            iconHtml = `<span class="material-symbols-outlined opacity-0" style="font-size: 1.2rem;">help</span>`; // Just for alignment
        }
        
        const escapedName = d.name.replace(/'/g, "\\'");
        html += `
            <div class="custom-option flex items-center gap-2" onclick="selectDungeonFilter('${d.key}', '${escapedName}', ${secretArg})">
                ${iconHtml}
                <span>${d.name}</span>
            </div>
        `;
    });

    optionsContainer.innerHTML = html;
}

window.selectDungeonFilter = function(filterKey, label, secretName = null) {
    let iconHtml = '';
    if (secretName && secretName !== 'null') {
        const secretMeta = (window.DEFAULT_SECRETS_META || []).find(s => s.name === secretName) || { icon: 'help', color: '#fff' };
        iconHtml = `<span class="material-symbols-outlined" style="color: ${secretMeta.color}; font-size: 1.2rem;">${secretMeta.icon}</span>`;
    }

    const content = document.getElementById('dungeonSelectContent');
    if (content) {
        content.innerHTML = iconHtml ? `<div class="flex items-center gap-2">${iconHtml}<span>${label}</span></div>` : label;
    }
    const wrapper = document.getElementById('dungeonSelectWrapper');
    if (wrapper) wrapper.classList.remove('open');
    renderDashboard(filterKey);
};

function renderDashboard(dungeonFilterKey) {
    let filteredRuns = allRuns;
    let combinedGlobalStats = {
        totalRuns: 0,
        totalVictories: 0,
        totalDefeats: 0,
        totalFlees: 0,
        totalTimeouts: 0,
        totalDeaths: 0,
        classPopularity: {},
        spiritualitePopularity: {},
        multiRuns: 0 // calculate manually from runs
    };

    const aggregateStat = (stat) => {
        combinedGlobalStats.totalRuns += stat.totalRuns;
        combinedGlobalStats.totalVictories += stat.totalVictories;
        combinedGlobalStats.totalDefeats += stat.totalDefeats;
        combinedGlobalStats.totalFlees += stat.totalFlees;
        combinedGlobalStats.totalTimeouts += stat.totalTimeouts;
        combinedGlobalStats.totalDeaths += stat.totalDeaths;
        
        for (const c in stat.classPopularity) {
            combinedGlobalStats.classPopularity[c] = (combinedGlobalStats.classPopularity[c] || 0) + stat.classPopularity[c];
        }
        if (stat.spiritualitePopularity) {
            for (const s in stat.spiritualitePopularity) {
                combinedGlobalStats.spiritualitePopularity[s] = (combinedGlobalStats.spiritualitePopularity[s] || 0) + stat.spiritualitePopularity[s];
            }
        }
    };

    if (dungeonFilterKey === 'ALL') {
        for (const key in globalStats) {
            aggregateStat(globalStats[key]);
        }
        filteredRuns = allRuns;
        combinedGlobalStats.multiRuns = filteredRuns.filter(r => r.multi).length;
    } else if (dungeonFilterKey.startsWith('SECRET_')) {
        const secretFilter = dungeonFilterKey.substring(7);
        const matchingKeys = Object.keys(globalStats).filter(key => {
            const dId = key.split('_')[0];
            return window.dungeonSecretMap[dId] === secretFilter;
        });
        matchingKeys.forEach(key => {
            aggregateStat(globalStats[key]);
        });
        filteredRuns = allRuns.filter(r => window.dungeonSecretMap[r.dungeonId] === secretFilter);
        combinedGlobalStats.multiRuns = filteredRuns.filter(r => r.multi).length;
    } else {
        const [dungeonId] = dungeonFilterKey.split('_');
        filteredRuns = allRuns.filter(r => r.dungeonId == dungeonId);
        
        if (globalStats[dungeonFilterKey]) {
            Object.assign(combinedGlobalStats, globalStats[dungeonFilterKey]);
            combinedGlobalStats.multiRuns = filteredRuns.filter(r => r.multi).length;
        }
    }

    updateKPIs(combinedGlobalStats);
    updateOutcomesChart(combinedGlobalStats);
    updateClassesChart(combinedGlobalStats);
    updateSpiritualityChart(combinedGlobalStats);
    updateRunsTable(filteredRuns.slice(0, 50));
}

function updateKPIs(stats) {
    document.getElementById('kpi-runs').textContent = stats.totalRuns;
    
    const winrate = stats.totalRuns > 0 ? Math.round((stats.totalVictories / stats.totalRuns) * 100) : 0;
    document.getElementById('kpi-winrate').textContent = winrate + '%';

    const deathrate = stats.totalRuns > 0 ? Math.round((stats.totalDeaths / stats.totalRuns) * 100) : 0;
    document.getElementById('kpi-deathrate').textContent = deathrate + '%';

    const multirate = stats.totalRuns > 0 ? Math.round((stats.multiRuns / stats.totalRuns) * 100) : 0;
    document.getElementById('kpi-multi').textContent = multirate + '%';
}

function updateOutcomesChart(stats) {
    const ctx = document.getElementById('outcomesChart').getContext('2d');
    
    if (outcomesChartInstance) outcomesChartInstance.destroy();

    outcomesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Victoire', 'Défaite', 'Fuite', 'Timeout'],
            datasets: [{
                data: [stats.totalVictories, stats.totalDefeats, stats.totalFlees, stats.totalTimeouts],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)', // success
                    'rgba(239, 68, 68, 0.8)',  // error
                    'rgba(245, 158, 11, 0.8)', // warning
                    'rgba(100, 116, 139, 0.8)' // muted
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(100, 116, 139, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            },
            cutout: '70%'
        }
    });
}

function updateClassesChart(stats) {
    const ctx = document.getElementById('classesChart').getContext('2d');
    
    if (classesChartInstance) classesChartInstance.destroy();

    const sortedClasses = Object.entries(stats.classPopularity)
        .sort((a, b) => b[1] - a[1]);

    const labels = sortedClasses.map(c => c[0] || 'Sans Voie');
    const data = sortedClasses.map(c => c[1]);

    classesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Participations',
                data: data,
                backgroundColor: 'rgba(56, 189, 248, 0.7)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function updateSpiritualityChart(stats) {
    const ctx = document.getElementById('spiritualityChart').getContext('2d');
    
    if (spiritualityChartInstance) spiritualityChartInstance.destroy();

    const sortedSpirits = Object.entries(stats.spiritualitePopularity || {})
        .sort((a, b) => b[1] - a[1]);

    const labels = sortedSpirits.map(s => s[0] || 'Sans Spiritualité');
    const data = sortedSpirits.map(s => s[1]);

    spiritualityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Participations',
                data: data,
                backgroundColor: 'rgba(192, 132, 252, 0.7)',
                borderColor: 'rgba(192, 132, 252, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function updateRunsTable(runs) {
    const tbody = document.getElementById('runsTableBody');
    tbody.innerHTML = '';

    for (let r of runs) {
        const date = new Date(r.timestamp).toLocaleString('fr-FR');
        
        let statusHtml = '';
        switch(r.outcome) {
            case 'VICTORY': statusHtml = `<span class="status-badge status-VICTORY"><span class="material-symbols-outlined" style="font-size:14px">emoji_events</span> Victoire</span>`; break;
            case 'DEFEAT': statusHtml = `<span class="status-badge status-DEFEAT"><span class="material-symbols-outlined" style="font-size:14px">skull</span> Défaite</span>`; break;
            case 'FLEE': statusHtml = `<span class="status-badge status-FLEE"><span class="material-symbols-outlined" style="font-size:14px">directions_run</span> Fuite</span>`; break;
            case 'TIMEOUT': statusHtml = `<span class="status-badge status-TIMEOUT"><span class="material-symbols-outlined" style="font-size:14px">timer</span> Timeout</span>`; break;
        }

        const deathHtml = r.dead 
            ? `<span class="text-error font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">skull</span> Mort</span>` 
            : `<span class="text-success font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">favorite</span> En vie</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-muted" style="white-space:nowrap">${date}</td>
            <td class="font-medium text-white">${r.dungeonName}</td>
            <td class="text-white">${r.accountName || '-'}</td>
            <td>
                <div class="text-white">${r.voieName || '-'}</div>
                <div class="text-xs text-info">${r.spiritualiteName || '-'}</div>
            </td>
            <td><span class="bg-primary/20 text-primary px-2 py-1 rounded text-sm font-bold">Niv ${r.heroLevel}</span></td>
            <td>${statusHtml}</td>
            <td>${deathHtml}</td>
            <td>
                ${r.multi 
                    ? `<span class="material-symbols-outlined text-purple-400" title="Co-op">group</span>`
                    : `<span class="material-symbols-outlined text-slate-400" title="Solo">person</span>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    }
}
