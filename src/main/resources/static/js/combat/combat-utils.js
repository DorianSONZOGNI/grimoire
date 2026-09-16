import * as ui from '../ui.js';
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
    if (exp >= 6000) level = 10;
    else if (exp >= 4200) level = 9;
    else if (exp >= 3200) level = 8;
    else if (exp >= 2400) level = 7;
    else if (exp >= 1600) level = 6;
    else if (exp >= 1000) level = 5;
    else if (exp >= 600) level = 4;
    else if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;

    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = 600; }
    else if (level === 4) { currentLvlXp = 600; nextLvlXp = 1000; }
    else if (level === 5) { currentLvlXp = 1000; nextLvlXp = 1600; }
    else if (level === 6) { currentLvlXp = 1600; nextLvlXp = 2400; }
    else if (level === 7) { currentLvlXp = 2400; nextLvlXp = 3200; }
    else if (level === 8) { currentLvlXp = 3200; nextLvlXp = 4200; }
    else if (level === 9) { currentLvlXp = 4200; nextLvlXp = 6000; }
    else if (level === 10) { currentLvlXp = 6000; nextLvlXp = exp; }

    let progress = 100;
    if (level < 10) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}

export function getSpiritExpStats(exp) {
    let level = 1;
    if (exp >= 4500) level = 10;
    else if (exp >= 3600) level = 9;
    else if (exp >= 2800) level = 8;
    else if (exp >= 2100) level = 7;
    else if (exp >= 1500) level = 6;
    else if (exp >= 1000) level = 5;
    else if (exp >= 600) level = 4;
    else if (exp >= 300) level = 3;
    else if (exp >= 100) level = 2;

    let currentLvlXp = 0;
    let nextLvlXp = 100;
    if (level === 2) { currentLvlXp = 100; nextLvlXp = 300; }
    else if (level === 3) { currentLvlXp = 300; nextLvlXp = 600; }
    else if (level === 4) { currentLvlXp = 600; nextLvlXp = 1000; }
    else if (level === 5) { currentLvlXp = 1000; nextLvlXp = 1500; }
    else if (level === 6) { currentLvlXp = 1500; nextLvlXp = 2100; }
    else if (level === 7) { currentLvlXp = 2100; nextLvlXp = 2800; }
    else if (level === 8) { currentLvlXp = 2800; nextLvlXp = 3600; }
    else if (level === 9) { currentLvlXp = 3600; nextLvlXp = 4500; }
    else if (level === 10) { currentLvlXp = 4500; nextLvlXp = exp; }

    let progress = 100;
    if (level < 10) {
        progress = ((exp - currentLvlXp) / (nextLvlXp - currentLvlXp)) * 100;
    }
    return { level, currentLvlXp, nextLvlXp, progress };
}
