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
            'secret': { icon: 'key', cls: 'logo-secret', title: 'Mes Secrets', subtitle: 'Savoir mystique...' },
            'admin': { icon: 'admin_panel_settings', cls: 'logo-admin', title: 'Administration', subtitle: 'Section restreinte.' }
        };

        const config = pageConfig[activePage] || pageConfig['grimoire'];

        // On n'utilise PAS le Shadow DOM ici exprès, pour que auth.js et les CSS globaux s'appliquent !
        this.innerHTML = `
        <header class="top-header">
            <div class="page-logo">
                <span class="material-symbols-outlined logo-icon-gradient ${config.cls}">${config.icon}</span>
                <span class="logo-text-gradient ${config.cls}">${config.title}</span>
            </div>
            <div class="header-actions">
                <div style="font-size: 0.9rem; color: var(--text-muted);">${config.subtitle}</div>
                
                <a href="/" class="top-nav-link nav-grimoire ${activePage === 'grimoire' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">auto_awesome</span> Grimoire
                </a>
                <a href="/armory.html" class="top-nav-link nav-armory ${activePage === 'armory' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">shield</span> Armurerie
                </a>
                <a href="/dungeons.html" class="top-nav-link nav-dungeon ${activePage === 'dungeon' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">swords</span> Donjons
                </a>
                <a href="/vault.html" class="top-nav-link nav-vault ${activePage === 'vault' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">money_bag</span> Coffres
                </a>
                <a href="/shop.html" class="top-nav-link nav-shop ${activePage === 'shop' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">storefront</span> Boutique
                </a>
                <a href="/alchemy.html" class="top-nav-link nav-alchemy ${activePage === 'alchemy' ? 'active' : ''}">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">science</span> Alchimie
                </a>
                
                <a href="/shop-admin.html" id="adminShopLink" class="top-nav-link nav-admin ${activePage === 'admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">settings</span> Admin Boutique
                </a>
                <a href="/pve-admin.html" id="adminPvELink" class="top-nav-link nav-admin ${activePage === 'admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">admin_panel_settings</span> Admin PvE
                </a>
                <a href="/alchemy-admin.html" id="adminAlchemyLink" class="top-nav-link nav-admin ${activePage === 'admin' ? 'active' : ''}" style="display: none;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">science</span> Admin Alchimie
                </a>

                <div id="authNavContainer" style="display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem; padding-left: 1rem; border-left: 1px solid var(--glass-border);">
                    <span style="font-size: 0.85rem; color: var(--text-muted);">Chargement...</span>
                </div>
            </div>
        </header>
        `;
    }
}

customElements.define('app-navbar', AppNavbar);
