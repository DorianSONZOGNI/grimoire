// dungeon-stats.js

let allRuns = [];
let globalStats = {};

let outcomesChartInstance = null;
let classesChartInstance = null;
let levelDeathChartInstance = null;

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

        // Sort runs by timestamp desc
        allRuns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        populateDungeonSelect();
        
        document.getElementById('statsLoader').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';

        document.getElementById('dungeonSelect').addEventListener('change', (e) => {
            renderDashboard(e.target.value);
        });

        renderDashboard('ALL');

    } catch (e) {
        console.error("Erreur stats", e);
        document.getElementById('statsLoader').setAttribute('message', 'Erreur de chargement des statistiques');
    }
}

function populateDungeonSelect() {
    const select = document.getElementById('dungeonSelect');
    
    // Extract unique dungeons
    const uniqueDungeons = {};
    for (const key in globalStats) {
        uniqueDungeons[key] = globalStats[key].dungeonName;
    }

    for (const [key, name] of Object.entries(uniqueDungeons)) {
        const option = document.createElement('option');
        option.value = key; // "id_name"
        option.textContent = name;
        select.appendChild(option);
    }
}

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
        multiRuns: 0 // calculate manually from runs
    };

    if (dungeonFilterKey !== 'ALL') {
        const [dungeonId] = dungeonFilterKey.split('_');
        filteredRuns = allRuns.filter(r => r.dungeonId == dungeonId);
        
        if (globalStats[dungeonFilterKey]) {
            Object.assign(combinedGlobalStats, globalStats[dungeonFilterKey]);
            // recalculate multiRuns
            combinedGlobalStats.multiRuns = filteredRuns.filter(r => r.multi).length;
        }
    } else {
        // Aggregate ALL
        for (const key in globalStats) {
            const stat = globalStats[key];
            combinedGlobalStats.totalRuns += stat.totalRuns;
            combinedGlobalStats.totalVictories += stat.totalVictories;
            combinedGlobalStats.totalDefeats += stat.totalDefeats;
            combinedGlobalStats.totalFlees += stat.totalFlees;
            combinedGlobalStats.totalTimeouts += stat.totalTimeouts;
            combinedGlobalStats.totalDeaths += stat.totalDeaths;
            
            for (const c in stat.classPopularity) {
                combinedGlobalStats.classPopularity[c] = (combinedGlobalStats.classPopularity[c] || 0) + stat.classPopularity[c];
            }
        }
        combinedGlobalStats.multiRuns = filteredRuns.filter(r => r.multi).length;
    }

    updateKPIs(combinedGlobalStats);
    updateOutcomesChart(combinedGlobalStats);
    updateClassesChart(combinedGlobalStats);
    updateLevelDeathChart(filteredRuns);
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

function updateLevelDeathChart(runs) {
    const ctx = document.getElementById('levelDeathChart').getContext('2d');
    
    if (levelDeathChartInstance) levelDeathChartInstance.destroy();

    // Group runs by level bucket (1-5, 6-10, etc)
    const buckets = {};
    for (let r of runs) {
        const bucket = Math.floor(r.heroLevel / 5) * 5;
        const bucketLabel = `${bucket}-${bucket+4}`;
        
        if (!buckets[bucketLabel]) buckets[bucketLabel] = { total: 0, deaths: 0 };
        buckets[bucketLabel].total++;
        if (r.dead) buckets[bucketLabel].deaths++;
    }

    const sortedBuckets = Object.keys(buckets).sort((a, b) => parseInt(a) - parseInt(b));
    const dataRates = sortedBuckets.map(b => (buckets[b].deaths / buckets[b].total) * 100);

    levelDeathChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedBuckets,
            datasets: [{
                label: 'Taux de Mortalité (%)',
                data: dataRates,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(239, 68, 68, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100 }
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
