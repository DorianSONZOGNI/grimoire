import { state } from './state.js';
import * as constants from './constants.js';
import * as api from './api.js';
import * as particles from './particles.js';
import * as animations from './animations.js';
import * as filters from './filters.js';
import * as grimoire from './grimoire.js';
import * as forge from './forge.js';
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
    await Promise.all([
        constants.initMeta(),
        api.fetchMeta()
    ]);

    const user = window.currentUser;

    if (!api.isAdmin(user)) {
        const forgePanel = document.getElementById('spellForgePanel');
        if (forgePanel) forgePanel.style.display = 'none';
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.style.gridTemplateColumns = '1fr';
    }

    await api.loadSpells();
});