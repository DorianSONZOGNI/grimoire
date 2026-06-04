// ===================================================================
// filters.js — Logique des filtres et boutons d'origine
// ===================================================================

import state from './state.js';
import { hexToRgb, getVoieIcon, getSpiritIcon } from './ui.js';
// TODO: import { createSparkles } from './particles.js';
// TODO: import { renderFilteredSpells } from './grimoire.js';

const createSparkles = window.createSparkles || function(){};
const renderFilteredSpells = window.renderFilteredSpells || function(){};

export function getVoieButtonColor(v) {
    const vNom = v.nom.toLowerCase();
    if (vNom.includes('raison')) return '#3b82f6';
    if (vNom.includes('sûreté') || vNom.includes('surete')) return '#00e5cc';
    if (vNom.includes('trahison')) return '#ed5677';
    if (vNom.includes('consolidation')) return '#99674c';
    if (vNom.includes('conviction')) return '#b74c0b';
    if (vNom.includes('création') || vNom.includes('creation')) return '#10b981';
    if (vNom.includes('destruction')) return '#ff0000';
    if (vNom.includes('violence')) return '#a70740';
    return '#94a3b8';
}

export function getSpiritButtonColor(s) {
    const sNom = s.nom.toLowerCase();
    if (sNom.includes('esprit')) return '#38bdf8';
    if (sNom.includes('ténèbres') || sNom.includes('tenebres')) return '#c084fc';
    if (sNom.includes('karma')) return '#e7d198';
    return '#a78bfa';
}

export function resetFilters() {
    state.selectedFilterVoieId = null;
    state.selectedFilterSpiritId = null;
    renderOriginButtons();

    const search = document.getElementById('filterSearch');
    if (search) search.value = '';
    const effect = document.getElementById('filterEffect');
    if (effect) {
        effect.value = 'ALL';
        effect.dispatchEvent(new Event('change'));
    }
    const level = document.getElementById('filterLevel');
    if (level) {
        level.value = 'ALL';
        level.dispatchEvent(new Event('change'));
    }
    const sort = document.getElementById('sortBy');
    if (sort) {
        sort.value = 'NEWEST';
        sort.dispatchEvent(new Event('change'));
    }
    
    // will call the globally available or imported one
    if (typeof window.renderFilteredSpells === 'function') {
        window.renderFilteredSpells();
    } else {
        renderFilteredSpells();
    }
}

export function renderOriginButtons() {
    const voiesContainer = document.getElementById('filterVoiesButtonsContainer');
    const spiritsContainer = document.getElementById('filterSpiritsButtonsContainer');

    if (voiesContainer && state.metaData.voies) {
        voiesContainer.innerHTML = state.metaData.voies.map(v => {
            const isSel = state.selectedFilterVoieId === v.id;
            const hex = getVoieButtonColor(v);
            const rgb = hexToRgb(hex);
            const bg = isSel ? `rgba(${rgb}, 0.3)` : `rgba(${rgb}, 0.1)`;
            const border = isSel ? hex : `rgba(${rgb}, 0.4)`;
            const color = hex;
            const shadow = isSel ? `box-shadow: 0 0 8px rgba(${rgb}, 0.4);` : '';
            const opacity = isSel ? '1' : '0.85';
            const icon = getVoieIcon(v.nom);
            return `<button type="button" style="padding:0.3rem 0.6rem;font-size:0.75rem;border-radius:6px;cursor:pointer;background:${bg};border:1px solid ${border};color:${color};font-weight:${isSel ? 'bold' : 'normal'};opacity:${opacity};transition:all 0.2s;display:inline-flex;align-items:center;gap:0.3rem;${shadow}" onclick="window.toggleFilterVoie(event, ${v.id}, '${hex}')"><span class="material-symbols-outlined" style="font-size:1.1em;">${icon}</span>${v.nom}</button>`;
        }).join('');
    }

    if (spiritsContainer && state.metaData.spiritualites) {
        spiritsContainer.innerHTML = state.metaData.spiritualites.map(s => {
            const isSel = state.selectedFilterSpiritId === s.id;
            const hex = getSpiritButtonColor(s);
            const rgb = hexToRgb(hex);
            const bg = isSel ? `rgba(${rgb}, 0.3)` : `rgba(${rgb}, 0.1)`;
            const border = isSel ? hex : `rgba(${rgb}, 0.4)`;
            const color = hex;
            const shadow = isSel ? `box-shadow: 0 0 8px rgba(${rgb}, 0.4);` : '';
            const opacity = isSel ? '1' : '0.85';
            const icon = getSpiritIcon(s.nom);
            return `<button type="button" style="padding:0.3rem 0.6rem;font-size:0.75rem;border-radius:6px;cursor:pointer;background:${bg};border:1px solid ${border};color:${color};font-weight:${isSel ? 'bold' : 'normal'};opacity:${opacity};transition:all 0.2s;display:inline-flex;align-items:center;gap:0.3rem;${shadow}" onclick="window.toggleFilterSpirit(event, ${s.id}, '${hex}')"><span class="material-symbols-outlined" style="font-size:1.1em;">${icon}</span>${s.nom}</button>`;
        }).join('');
    }
}

export function toggleFilterVoie(event, id, hexColor) {
    if (event && hexColor && state.selectedFilterVoieId !== id) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (window.createSparkles) {
            window.createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, hexColor);
        } else {
            createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, hexColor);
        }
    }
    if (state.selectedFilterVoieId === id) {
        state.selectedFilterVoieId = null;
    } else {
        state.selectedFilterVoieId = id;
    }
    renderOriginButtons();
    if (typeof window.renderFilteredSpells === 'function') {
        window.renderFilteredSpells();
    } else {
        renderFilteredSpells();
    }
}

export function toggleFilterSpirit(event, id, hexColor) {
    if (event && hexColor && state.selectedFilterSpiritId !== id) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (window.createSparkles) {
            window.createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, hexColor);
        } else {
            createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, hexColor);
        }
    }
    if (state.selectedFilterSpiritId === id) {
        state.selectedFilterSpiritId = null;
    } else {
        state.selectedFilterSpiritId = id;
    }
    renderOriginButtons();
    if (typeof window.renderFilteredSpells === 'function') {
        window.renderFilteredSpells();
    } else {
        renderFilteredSpells();
    }
}

// Attach to window so onclick handlers in HTML string can use them
window.getVoieButtonColor = getVoieButtonColor;
window.getSpiritButtonColor = getSpiritButtonColor;
window.toggleFilterVoie = toggleFilterVoie;
window.toggleFilterSpirit = toggleFilterSpirit;
window.resetFilters = resetFilters;
