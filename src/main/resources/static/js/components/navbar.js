class AppNavbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const activePage = this.getAttribute('active-page') || 'grimoire';
        this.render(activePage);
        
        // Dispatche un événement pour auth.js qui peut maintenant s'attacher à #authNavContainer
        document.dispatchEvent(new Event('navbar-loaded'));
    }

    render(activePage) {
        const pageConfig = {
            'grimoire': { icon: 'auto_awesome', cls: 'logo-grimoire', title: 'Grimoire', subtitle: 'Ne pas prononcer à voix haute le nom des sorts...' },
            'armory': { icon: 'shield', cls: 'logo-armory', title: 'Armurerie', subtitle: 'Préparez votre équipement...' },
            'dungeon': { icon: 'swords', cls: 'logo-dungeon', title: 'Donjons', subtitle: 'Préparez-vous au combat...' },
            'vault': { icon: 'money_bag', cls: 'logo-vault', title: 'Coffres', subtitle: 'Un butin bien mérité.' },
            'shop': { icon: 'storefront', cls: 'logo-shop', title: 'Boutique', subtitle: "Touché c'est acheté !" },
            'alchemy': { icon: 'science', cls: 'logo-alchemy', title: 'Alchimie', subtitle: 'Mélangez vos ingrédients...' },
            'hunting': { icon: 'trophy', cls: 'logo-hunting', title: 'Tableau de Chasse', subtitle: 'Relevez les défis…' },
            'secret': { icon: 'key', cls: 'logo-secret', title: 'Mes Secrets', subtitle: 'Savoir mystique...' },
            'dungeon-stats': { icon: 'insights', cls: 'logo-dungeon', title: 'Statistiques PvE', subtitle: 'Analyse des performances...' },
            'achievements': { icon: 'emoji_events', cls: 'logo-achievements', title: 'Succès', subtitle: 'Vos trophées et titres glorieux...' },
            'admin': { icon: 'admin_panel_settings', cls: 'logo-admin', title: 'Administration', subtitle: 'Section restreinte.' },
            'shop-admin': { icon: 'settings', cls: 'logo-admin', title: 'Admin Boutique', subtitle: 'Gestion de la boutique' },
            'pve-admin': { icon: 'admin_panel_settings', cls: 'logo-admin', title: 'Admin PvE', subtitle: 'Gestion des donjons' },
            'alchemy-admin': { icon: 'science', cls: 'logo-admin', title: 'Admin Alchimie', subtitle: 'Gestion des recettes' }
        };

        const config = pageConfig[activePage] || pageConfig['grimoire'];

        // On n'utilise PAS le Shadow DOM ici exprès, pour que auth.js et les CSS globaux s'appliquent !
        this.innerHTML = `
        <header class="top-header">
            <div class="page-logo-container">
                <div class="page-logo">
                    <span class="material-symbols-outlined logo-icon-gradient ${config.cls}">${config.icon}</span>
                    <span class="logo-text-gradient ${config.cls}">${config.title}</span>
                </div>
                <div class="page-subtitle">${config.subtitle}</div>
            </div>
            <div class="header-actions">
                
                <a href="/" class="top-nav-link nav-grimoire ${activePage === 'grimoire' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">auto_awesome</span> Grimoire
                </a>
                <a href="/armory.html" class="top-nav-link nav-armory ${activePage === 'armory' ? 'active' : ''}" style="position:relative;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">shield</span> Armurerie
                    <span id="navArmoryBadge" class="nav-badge" style="display:none; position:absolute; top:-2px; right:-8px; background:red; color:white; border-radius:50%; font-size:0.7rem; padding:1px 5px; font-weight:bold; pointer-events:none;">0</span>
                </a>
                <a href="/dungeons.html" class="top-nav-link nav-dungeon ${activePage === 'dungeon' ? 'active' : ''}" style="position:relative;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">swords</span> Donjons
                    <span id="navDungeonBadge" class="nav-badge" style="display:none; position:absolute; top:-2px; right:-8px; background:red; color:white; border-radius:50%; font-size:0.7rem; padding:1px 5px; font-weight:bold; pointer-events:none;">0</span>
                </a>
                <a href="/vault.html" class="top-nav-link nav-vault ${activePage === 'vault' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">money_bag</span> Coffres
                </a>
                <a href="/shop.html" class="top-nav-link nav-shop ${activePage === 'shop' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">storefront</span> Boutique
                </a>
                <a href="/alchemy.html" class="top-nav-link nav-alchemy ${activePage === 'alchemy' ? 'active' : ''}" style="position:relative;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">science</span> Alchimie
                    <span id="navAlchemyBadge" class="nav-badge" style="display:none; position:absolute; top:-2px; right:-8px; background:red; color:white; border-radius:50%; font-size:0.7rem; padding:1px 5px; font-weight:bold; pointer-events:none;">0</span>
                </a>
                <a href="/hunting.html" class="top-nav-link nav-hunting ${activePage === 'hunting' ? 'active' : ''}" style="position:relative;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">trophy</span> Chasse
                    <span id="navHuntingBadge" class="nav-badge" style="display:none; position:absolute; top:-2px; right:-8px; background:red; color:white; border-radius:50%; font-size:0.7rem; padding:1px 5px; font-weight:bold; pointer-events:none;">0</span>
                </a>
                
                <a href="/shop-admin.html" id="adminShopLink" class="top-nav-link nav-admin ${activePage === 'shop-admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">settings</span> Admin Boutique
                </a>
                <a href="/pve-admin.html" id="adminPvELink" class="top-nav-link nav-admin ${activePage === 'pve-admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">admin_panel_settings</span> Admin PvE
                </a>
                <a href="/alchemy-admin.html" id="adminAlchemyLink" class="top-nav-link nav-admin ${activePage === 'alchemy-admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">science</span> Admin Alchimie
                </a>

                <div id="authNavContainer" class="nav-auth-container">
                    <span style="font-size: 0.85rem; color: var(--text-muted);">Chargement...</span>
                </div>
            </div>
        </header>
        `;
    }
}

customElements.define('app-navbar', AppNavbar);

// Keep-alive server ping (inactivité > 2min hors combat)
let lastUserActivity = Date.now();
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => { lastUserActivity = Date.now(); }, { passive: true });
});

setInterval(() => {
    if (window.location.pathname.includes('combat.html')) return;
    
    // Si inactivité >= 2 minutes
    if (Date.now() - lastUserActivity >= 120000) {
        if (window.currentUser && typeof window.globalFetch === 'function') {
            window.globalFetch('/api/auth/me').catch(() => {});
        }
        // Reset the timer so it only pings once every 2 minutes of continuous inactivity
        lastUserActivity = Date.now();
    }
}, 30000);

// === GESTIONNAIRE GLOBAL DES NOTIFICATIONS DE SUCCÈS ===
(function () {
    const achievementQueue = [];
    let isShowingToast = false;
    let toastTimeout = null;

    function getOrCreateContainer() {
        let container = document.getElementById('achievementToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievementToastContainer';
            container.className = 'achievement-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function createToastElement(achieve, onDismiss) {
        const wrapper = document.createElement('div');
        wrapper.className = 'achievement-toast-wrapper';

        // 1. Top banner
        const banner = document.createElement('div');
        banner.className = 'achievement-toast-banner';

        const bannerTitle = document.createElement('div');
        bannerTitle.className = 'achievement-toast-banner-title';
        const trophyIcon = document.createElement('span');
        trophyIcon.className = 'material-symbols-outlined text-sm';
        trophyIcon.textContent = 'emoji_events';
        const bannerTxt = document.createElement('span');
        bannerTxt.textContent = 'Haut-Fait Débloqué !';
        bannerTitle.appendChild(trophyIcon);
        bannerTitle.appendChild(bannerTxt);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'achievement-toast-close';
        closeBtn.title = 'Fermer';
        const closeIcon = document.createElement('span');
        closeIcon.className = 'material-symbols-outlined';
        closeIcon.textContent = 'close';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDismiss();
        });

        banner.appendChild(bannerTitle);
        banner.appendChild(closeBtn);

        // 2. Card matching achievements.html (.achievement-card.unlocked)
        const card = document.createElement('div');
        card.className = 'achievement-card unlocked';
        card.addEventListener('click', () => {
            onDismiss();
        });

        // Header: icon + category + title
        const header = document.createElement('div');
        header.className = 'achievement-card-header';

        const iconBox = document.createElement('div');
        iconBox.className = 'achievement-icon-box';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined';
        iconSpan.textContent = achieve.icon || 'emoji_events';
        iconBox.appendChild(iconSpan);

        const titleArea = document.createElement('div');
        titleArea.className = 'achievement-title-area';

        const catTag = document.createElement('div');
        catTag.className = 'achievement-category-tag';
        catTag.textContent = achieve.categoryLabel || 'Combat & Donjons';

        const nameH3 = document.createElement('h3');
        nameH3.className = 'achievement-name';
        nameH3.textContent = achieve.label || achieve.title || 'Succès';

        titleArea.appendChild(catTag);
        titleArea.appendChild(nameH3);

        header.appendChild(iconBox);
        header.appendChild(titleArea);

        // Description
        const descP = document.createElement('p');
        descP.className = 'achievement-desc';
        descP.textContent = achieve.description || '';

        // Progress
        const progDiv = document.createElement('div');
        progDiv.className = 'achievement-card-progress';

        const labelsDiv = document.createElement('div');
        labelsDiv.className = 'progress-labels';
        const progTxt = document.createElement('span');
        progTxt.textContent = 'Complété !';
        const pctTxt = document.createElement('span');
        pctTxt.textContent = '100%';
        labelsDiv.appendChild(progTxt);
        labelsDiv.appendChild(pctTxt);

        const trackDiv = document.createElement('div');
        trackDiv.className = 'card-progress-bar';
        const fillDiv = document.createElement('div');
        fillDiv.className = 'card-progress-fill is-full';
        trackDiv.appendChild(fillDiv);

        progDiv.appendChild(labelsDiv);
        progDiv.appendChild(trackDiv);

        // Footer / Reward & Status
        const footer = document.createElement('div');
        footer.className = 'achievement-card-footer';

        if (achieve.rewardTitle) {
            const rewardTag = document.createElement('div');
            rewardTag.className = 'achievement-reward-tag';
            const rewardIcon = document.createElement('span');
            rewardIcon.className = 'material-symbols-outlined text-sm';
            rewardIcon.textContent = 'military_tech';
            const rewardTxt = document.createElement('span');
            rewardTxt.textContent = `Titre : « ${achieve.rewardTitle} »`;
            rewardTag.appendChild(rewardIcon);
            rewardTag.appendChild(rewardTxt);
            footer.appendChild(rewardTag);
        } else {
            const emptySpan = document.createElement('span');
            footer.appendChild(emptySpan);
        }

        const statusBadge = document.createElement('div');
        statusBadge.className = 'achievement-status-badge status-unlocked';
        const checkIcon = document.createElement('span');
        checkIcon.className = 'material-symbols-outlined text-sm';
        checkIcon.textContent = 'check_circle';
        const checkTxt = document.createElement('span');
        checkTxt.textContent = 'Débloqué';
        statusBadge.appendChild(checkIcon);
        statusBadge.appendChild(checkTxt);
        footer.appendChild(statusBadge);

        card.appendChild(header);
        card.appendChild(descP);
        card.appendChild(progDiv);
        card.appendChild(footer);

        wrapper.appendChild(banner);
        wrapper.appendChild(card);
        return wrapper;
    }

    function processQueue() {
        if (achievementQueue.length === 0) {
            isShowingToast = false;
            return;
        }

        isShowingToast = true;
        const achieve = achievementQueue.shift();
        const container = getOrCreateContainer();
        container.innerHTML = '';

        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            if (toastTimeout) {
                clearTimeout(toastTimeout);
                toastTimeout = null;
            }
            container.classList.remove('is-visible');
            setTimeout(() => {
                container.innerHTML = '';
                processQueue();
            }, 350);
        }

        const el = createToastElement(achieve, dismiss);
        container.appendChild(el);

        requestAnimationFrame(() => {
            container.classList.add('is-visible');
        });

        toastTimeout = setTimeout(() => {
            dismiss();
        }, 5000);
    }

    window.showAchievementToast = function (achieve) {
        if (!achieve) return;
        achievementQueue.push(achieve);
        if (!isShowingToast) {
            processQueue();
        }
    };

    let isChecking = false;
    window.checkAchievementNotifications = async function () {
        if (isChecking) return;
        if (!window.currentUser && !localStorage.getItem('accessToken')) return;
        if (typeof window.globalFetch !== 'function') return;

        isChecking = true;
        try {
            const res = await window.globalFetch('/api/achievements/pending-notifications', { silent: true });
            if (res && res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(a => window.showAchievementToast(a));
                    await window.globalFetch('/api/achievements/acknowledge', { method: 'POST', silent: true }).catch(() => {});
                }
            }
        } catch (e) {
            // Silently ignore poll errors
        } finally {
            isChecking = false;
        }
    };

    window.addEventListener('authLoaded', () => {
        setTimeout(window.checkAchievementNotifications, 800);
    });

    setInterval(() => {
        window.checkAchievementNotifications();
    }, 15000);
})();
