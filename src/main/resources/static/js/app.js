import { state } from './utils/state.js';
import * as constants from './utils/constants.js';
import * as api from './services/api.js';
import * as particles from './components/particles.js';
import * as animations from './components/animations.js';
import * as filters from './utils/filters.js';
import * as grimoire from './pages/grimoire.js';
import * as forge from './pages/forge.js';
import * as ui from './ui.js';

window.state = state;
Object.assign(window, api);
Object.assign(window, particles);
Object.assign(window, animations);
Object.assign(window, filters);
Object.assign(window, grimoire);
Object.assign(window, forge);
Object.assign(window, ui);

window.addEventListener('DOMContentLoaded', () => {
    ui.updateDisplayModeUI();
    ui.initResizeObserver();
});

window.addEventListener('authLoaded', async () => {
    await constants.initMeta();
    await api.fetchMeta();

    const user = window.currentUser;

    if (api.isAdmin(user)) {
        const forgePanel = document.getElementById('spellForgePanel');
        if (forgePanel) forgePanel.style.display = '';
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.style.gridTemplateColumns = '';
    }

    await api.loadSpells();
});