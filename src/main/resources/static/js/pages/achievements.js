// Page Succès & Titres

const pageState = {
    achievements: [],
    activeTitle: null,
    unlockedTitles: [],
    totalUnlocked: 0,
    totalCount: 0,
    activeCategory: 'ALL',
    selectedTitleForEquip: null
};

window.addEventListener('authLoaded', () => {
    if (!window.currentUser) {
        const grid = document.getElementById('achievementsGrid');
        if (grid) {
            grid.innerHTML = '<p class="text-error text-center col-span-full">Veuillez vous connecter pour voir vos succès.</p>';
        }
        return;
    }
    loadAchievements();
});

async function loadAchievements() {
    const grid = document.getElementById('achievementsGrid');
    try {
        const fetchFn = window.globalFetch || fetch;
        const res = await fetchFn('/api/achievements');
        if (!res.ok) {
            throw new Error('Erreur lors du chargement des succès');
        }
        const data = await res.json();
        pageState.achievements = data.achievements || [];
        pageState.activeTitle = data.activeTitle || null;
        pageState.unlockedTitles = Array.from(data.unlockedTitles || []);
        pageState.totalUnlocked = data.totalUnlocked || 0;
        pageState.totalCount = data.totalCount || pageState.achievements.length;
        pageState.selectedTitleForEquip = pageState.activeTitle || 'NONE';

        renderHeader();
        renderFilters();
        renderGrid();
    } catch (err) {
        console.error(err);
        if (grid) {
            grid.innerHTML = `<p class="text-error text-center col-span-full">Erreur : ${err.message}</p>`;
        }
    }
}

function initTitleCustomSelectEvents() {
    const trigger = document.getElementById('titleSelectTrigger');
    const wrapper = document.getElementById('titleSelectWrapper');
    const card = document.querySelector('.achievements-title-card');
    if (!trigger || !wrapper) return;

    if (!trigger.dataset.initialized) {
        trigger.dataset.initialized = 'true';
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('open');
            if (card) card.classList.toggle('has-dropdown-open', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
                if (card) card.classList.remove('has-dropdown-open');
            }
        });
    }
}

function renderTitleCustomSelect() {
    const wrapper = document.getElementById('titleSelectWrapper');
    const labelSpan = document.getElementById('titleSelectLabel');
    const optionsContainer = document.getElementById('titleSelectOptions');
    const card = document.querySelector('.achievements-title-card');
    if (!wrapper || !labelSpan || !optionsContainer) return;

    if (pageState.selectedTitleForEquip === null || pageState.selectedTitleForEquip === undefined) {
        pageState.selectedTitleForEquip = pageState.activeTitle || 'NONE';
    }

    // Determine current selected title details
    const selectedTitle = pageState.selectedTitleForEquip;
    let selectedIcon = 'military_tech';
    let selectedText = '-- Aucun titre --';

    if (selectedTitle && selectedTitle !== 'NONE') {
        const ach = pageState.achievements.find(a => a.rewardTitle === selectedTitle);
        selectedIcon = ach?.icon || 'military_tech';
        selectedText = selectedTitle;
    } else {
        selectedIcon = 'block';
        selectedText = '-- Aucun titre --';
    }

    labelSpan.innerHTML = `
        <span class="material-symbols-outlined cs-icon text-warning">${selectedIcon}</span>
        <span>${selectedText}</span>
    `;

    // Populate options
    optionsContainer.innerHTML = '';

    // 1. None option
    const noneItem = document.createElement('div');
    const isNoneSelected = selectedTitle === 'NONE' || !selectedTitle;
    noneItem.className = `title-option-item ${isNoneSelected ? 'selected' : ''}`;

    let noneBadgeHtml = '';
    if (!pageState.activeTitle) {
        noneBadgeHtml = `<div class="title-option-badge"><span class="material-symbols-outlined">check</span>Actif</div>`;
    }

    noneItem.innerHTML = `
        <div class="title-option-left">
            <div class="title-option-icon-box icon-none">
                <span class="material-symbols-outlined">block</span>
            </div>
            <div class="title-option-text">
                <span class="title-option-title">-- Aucun titre --</span>
                <span class="title-option-sub">Ne porter aucun titre en jeu</span>
            </div>
        </div>
        ${noneBadgeHtml}
    `;

    noneItem.addEventListener('click', (e) => {
        e.stopPropagation();
        pageState.selectedTitleForEquip = 'NONE';
        renderTitleCustomSelect();
        wrapper.classList.remove('open');
        if (card) card.classList.remove('has-dropdown-open');
    });
    optionsContainer.appendChild(noneItem);

    // 2. Unlocked titles
    const sortedTitles = [...pageState.unlockedTitles].sort();
    sortedTitles.forEach(title => {
        const ach = pageState.achievements.find(a => a.rewardTitle === title);
        const icon = ach?.icon || 'military_tech';
        const achName = ach ? ach.label : 'Succès débloqué';
        const isSelected = selectedTitle === title;
        const isCurrentlyEquipped = pageState.activeTitle === title;

        const item = document.createElement('div');
        item.className = `title-option-item ${isSelected ? 'selected' : ''}`;

        let equippedBadgeHtml = '';
        if (isCurrentlyEquipped) {
            equippedBadgeHtml = `<div class="title-option-badge"><span class="material-symbols-outlined">check</span>Équipé</div>`;
        }

        item.innerHTML = `
            <div class="title-option-left">
                <div class="title-option-icon-box">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="title-option-text">
                    <span class="title-option-title">${title}</span>
                    <span class="title-option-sub">
                        <span class="material-symbols-outlined">emoji_events</span>
                        ${achName}
                    </span>
                </div>
            </div>
            ${equippedBadgeHtml}
        `;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            pageState.selectedTitleForEquip = title;
            renderTitleCustomSelect();
            wrapper.classList.remove('open');
            if (card) card.classList.remove('has-dropdown-open');
        });

        optionsContainer.appendChild(item);
    });
}

function renderHeader() {
    // 1. KPI Score & Bar
    const kpiScore = document.getElementById('kpiScore');
    const kpiTotal = document.getElementById('kpiTotal');
    const progressBar = document.getElementById('kpiProgressBar');
    const pctLabel = document.getElementById('kpiPercentage');

    if (kpiScore) kpiScore.textContent = pageState.totalUnlocked;
    if (kpiTotal) kpiTotal.textContent = `/ ${pageState.totalCount}`;

    const percent = pageState.totalCount > 0
        ? Math.round((pageState.totalUnlocked / pageState.totalCount) * 100)
        : 0;

    if (progressBar) progressBar.style.setProperty('width', `${percent}%`);
    if (pctLabel) pctLabel.textContent = `${percent}% complété`;

    // 2. Active Title & Selector
    const activeBadge = document.getElementById('activeTitleBadge');
    if (activeBadge) {
        activeBadge.textContent = pageState.activeTitle ? `« ${pageState.activeTitle} »` : 'Aucun titre équipé';
    }

    initTitleCustomSelectEvents();
    renderTitleCustomSelect();
}

function renderFilters() {
    const container = document.getElementById('achievementsFilters');
    if (!container) return;

    const categories = [
        { key: 'ALL', label: 'Tous', icon: 'grid_view' },
        { key: 'COMBAT', label: 'Combat & Donjons', icon: 'swords' },
        { key: 'ALCHEMY', label: 'Alchimie & Secrets', icon: 'science' },
        { key: 'LOOT', label: 'Coffres & Loots', icon: 'inventory_2' },
        { key: 'ECONOMY', label: 'Fortune & Économie', icon: 'payments' },
        { key: 'HIDDEN', label: 'Mystères & Cachés', icon: 'lock' }
    ];

    container.innerHTML = '';
    categories.forEach(cat => {
        const count = cat.key === 'ALL'
            ? pageState.achievements.length
            : pageState.achievements.filter(a => a.category === cat.key).length;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${pageState.activeCategory === cat.key ? 'active' : ''}`;
        chip.innerHTML = `
            <span class="material-symbols-outlined text-sm">${cat.icon}</span>
            <span>${cat.label} (${count})</span>
        `;
        chip.addEventListener('click', () => {
            pageState.activeCategory = cat.key;
            renderFilters();
            renderGrid();
        });
        container.appendChild(chip);
    });
}

function renderGrid() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const list = pageState.achievements.filter(a => {
        if (pageState.activeCategory === 'ALL') return true;
        return a.category === pageState.activeCategory;
    });

    if (list.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center col-span-full">Aucun succès dans cette catégorie.</p>';
        return;
    }

    list.forEach(a => {
        const card = document.createElement('div');
        const isHiddenLocked = a.hidden && !a.unlocked;
        card.className = `achievement-card ${a.unlocked ? 'unlocked' : ''} ${isHiddenLocked ? 'hidden-locked' : ''}`;

        // Header
        const header = document.createElement('div');
        header.className = 'achievement-card-header';

        const iconBox = document.createElement('div');
        iconBox.className = 'achievement-icon-box';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined';
        iconSpan.textContent = a.icon || 'emoji_events';
        iconBox.appendChild(iconSpan);

        const titleArea = document.createElement('div');
        titleArea.className = 'achievement-title-area';

        const catTag = document.createElement('div');
        catTag.className = 'achievement-category-tag';
        catTag.textContent = a.categoryLabel;

        const nameH3 = document.createElement('h3');
        nameH3.className = 'achievement-name';
        nameH3.textContent = a.label;

        titleArea.appendChild(catTag);
        titleArea.appendChild(nameH3);

        header.appendChild(iconBox);
        header.appendChild(titleArea);

        // Description
        const descP = document.createElement('p');
        descP.className = 'achievement-desc';
        descP.textContent = a.description;

        // Progress
        const progDiv = document.createElement('div');
        progDiv.className = 'achievement-card-progress';

        const labelsDiv = document.createElement('div');
        labelsDiv.className = 'progress-labels';

        const progressPercent = a.unlocked
            ? 100
            : (a.goalValue > 0 ? Math.min(100, Math.round((a.currentProgress / a.goalValue) * 100)) : 0);

        const progTxt = document.createElement('span');
        if (isHiddenLocked) {
            progTxt.textContent = 'Verrouillé';
        } else if (a.unlocked) {
            progTxt.textContent = 'Complété !';
        } else if (a.goalValue > 1) {
            progTxt.textContent = `${a.currentProgress} / ${a.goalValue}`;
        } else {
            progTxt.textContent = 'En cours';
        }

        const pctTxt = document.createElement('span');
        pctTxt.textContent = isHiddenLocked ? '???' : `${progressPercent}%`;

        labelsDiv.appendChild(progTxt);
        labelsDiv.appendChild(pctTxt);

        const trackDiv = document.createElement('div');
        trackDiv.className = 'card-progress-bar';
        const fillDiv = document.createElement('div');
        fillDiv.className = 'card-progress-fill';
        fillDiv.style.setProperty('width', `${progressPercent}%`);
        trackDiv.appendChild(fillDiv);

        progDiv.appendChild(labelsDiv);
        progDiv.appendChild(trackDiv);

        // Footer / Reward
        const footer = document.createElement('div');
        footer.className = 'achievement-card-footer';

        const rewardTag = document.createElement('div');
        rewardTag.className = 'achievement-reward-tag';
        rewardTag.innerHTML = `
            <span class="material-symbols-outlined text-sm">military_tech</span>
            <span>Titre : ${a.rewardTitle}</span>
        `;

        const statusBadge = document.createElement('div');
        statusBadge.className = `achievement-status-badge ${a.unlocked ? 'status-unlocked' : 'status-locked'}`;
        if (a.unlocked) {
            statusBadge.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> Débloqué';
        } else if (isHiddenLocked) {
            statusBadge.innerHTML = '<span class="material-symbols-outlined text-sm">lock</span> Mystère';
        } else {
            statusBadge.innerHTML = '<span class="material-symbols-outlined text-sm">hourglass_empty</span> En cours';
        }

        footer.appendChild(rewardTag);
        footer.appendChild(statusBadge);

        card.appendChild(header);
        card.appendChild(descP);
        card.appendChild(progDiv);
        card.appendChild(footer);

        grid.appendChild(card);
    });
}

// Equip selected title
async function handleEquipTitle() {
    const title = pageState.selectedTitleForEquip || 'NONE';

    try {
        const fetchFn = window.globalFetch || fetch;
        const res = await fetchFn('/api/achievements/active-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Impossible d'équiper ce titre.");
        }
        if (typeof showNotif === 'function') {
            showNotif(data.message || 'Titre équipé avec succès !');
        }
        pageState.activeTitle = data.activeTitle || null;
        pageState.selectedTitleForEquip = pageState.activeTitle || 'NONE';
        renderHeader();
        // Refresh auth status in navbar
        if (typeof window.checkAuthStatus === 'function') {
            window.checkAuthStatus();
        }
    } catch (err) {
        if (typeof showNotif === 'function') {
            showNotif(err.message, true);
        } else {
            alert(err.message);
        }
    }
}

// Global exposure
window.handleEquipTitle = handleEquipTitle;
