import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../utils/filters.js';


export function createAnomalyBadgeHtml(anomalyName, showName = false) {
    if (!anomalyName || anomalyName === 'Item') return anomalyName;

    let tooltipTitle = anomalyName;
    let tooltipDesc = 'Cet objet aura un effet unique !';
    let tColor = '#d946ef';
    let anomLevel = 1;
    let anomSpiri = 'Inconnu';
    let catIcon = 'star';
    let isMagic = false;
    let an = null;

    if (Array.isArray(window.allAnomaliesCombat)) {
        an = window.allAnomaliesCombat.find(a => a.name === anomalyName);
        if (an) {
            if (an.description) tooltipDesc = an.description;
            if (an.level) anomLevel = an.level;
            if (an.magicObject) isMagic = true;
            if (an.category) catIcon = getCategoryIcon(an.category);
            if (an.spiritualite) {
                anomSpiri = an.spiritualite;
                tColor = getSpiritualiteColor(an.spiritualite);
            }
        }
    }

    const tooltipDataHtml = getAnomalyTooltipHTML(an, tooltipTitle);

    const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';
    const extraAttrs = `data-color="${tColor}"`;

    const nameHtml = showName ? `<span style="margin-left: 0.2rem;">${anomalyName}</span>` : '';
    const padStyle = showName ? 'padding: 0.1rem 0.4rem;' : 'padding: 0.3rem;';
    return `<span class="anomaly-badge align-middle" ${tooltipAttrs} ${extraAttrs} style="display: inline-flex; align-items: center; justify-content: center; border: 1px solid ${tColor}; background: linear-gradient(${tColor}25, ${tColor}25), rgba(15,23,42,0.8); color: ${tColor}; ${padStyle} border-radius: 6px; font-weight:bold; cursor: help;"><template class="tooltip-data">${tooltipDataHtml}</template><span class="material-symbols-outlined icon-md">${catIcon}</span>${nameHtml}</span>`;
}

export const shakeStyle = document.createElement('style');

export function showFloatingTextOnElement(el, text, color) {
    const wrapper = document.createElement('div');
    const rect = el.getBoundingClientRect();
    wrapper.style.position = 'fixed';
    wrapper.style.left = (rect.left + rect.width / 2) + 'px';
    wrapper.style.top = (rect.top + rect.height / 2) + 'px';
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.style.zIndex = '9999';
    wrapper.style.pointerEvents = 'none';

    const floater = document.createElement('div');
    floater.className = 'floating-damage';
    floater.innerHTML = text;
    floater.style.color = color || '#ef4444';

    wrapper.appendChild(floater);
    document.body.appendChild(wrapper);

    setTimeout(() => {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }, 3000);
}

export function getExpStats(exp) {
    let level = 1;
    if (exp >= 1000) level = 5;
    else if (exp >= 600) level = 4;
    else if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;

    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = 600; }
    else if (level === 4) { currentLvlXp = 600; nextLvlXp = 1000; }
    else if (level === 5) { currentLvlXp = 1000; nextLvlXp = exp; }

    let progress = 100;
    if (level < 5) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}

export function getSpiritExpStats(exp) {
    let level = 1;
    if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;

    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = exp; }

    let progress = 100;
    if (level < 3) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}