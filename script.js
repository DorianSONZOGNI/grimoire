const fs = require('fs');
let content = fs.readFileSync('src/main/resources/static/js/combat/combat-ui.js', 'utf8');
const searchRegex = /\s+let turnOrderBadgeHtml = '';[\s\S]*?transition: all 0\.3s;">\$\{turnOrderNum\}<\/div>`;\s*}/;

const replaceString = `    let topBadgesHtml = '';
    if (turnOrderNum) {
        let hasPlayed = false;
        if (pageState && pageState.currentSessionData && pageState.currentSessionData.currentTurnIndex !== undefined) {
            hasPlayed = (turnOrderNum - 1) < pageState.currentSessionData.currentTurnIndex;
        }
        const opacity = hasPlayed ? '0.5' : '1';
        const filter = hasPlayed ? 'grayscale(1)' : 'none';

        topBadgesHtml += \`<div title="Ordre de jeu : \${turnOrderNum}" style="position: absolute; top: -8px; left: -8px; width: 28px; height: 28px; background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid \${isHero ? '#38bdf8' : '#ef4444'}; border-radius: 50%; color: #f8fafc; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.95rem; box-shadow: 0 4px 6px rgba(0,0,0,0.5); z-index: 5; opacity: \${opacity}; filter: \${filter}; transition: all 0.3s;">\${turnOrderNum}</div>\`;
    }

    if (c.consumableBonusXpPercent && c.consumableBonusXpTurns) {
        let hasPlayed = false;
        if (turnOrderNum && pageState && pageState.currentSessionData && pageState.currentSessionData.currentTurnIndex !== undefined) {
            hasPlayed = (turnOrderNum - 1) < pageState.currentSessionData.currentTurnIndex;
        }
        const opacity = hasPlayed ? '0.5' : '1';
        const filter = hasPlayed ? 'grayscale(1)' : 'none';
        let leftPos = turnOrderNum ? '24px' : '-8px';
        const tooltipAttrs = 'onmouseenter="window.showGlobalTooltip ? window.showGlobalTooltip(this) : null" onmouseleave="window.hideGlobalTooltip ? window.hideGlobalTooltip() : null"';
        const xpTooltipHtml = \`<div class="text-sm font-medium" style="margin-bottom:0.3rem; color:#facc15; display:flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1rem;">star</span> Bonus d'Expérience</div><div class="text-xs" style="color:#cbd5e1;">XP à la fin du combat : <span class="text-success" style="font-weight:bold;">+\${c.consumableBonusXpPercent}%</span><br/>Reste : <span style="font-weight:bold;">\${c.consumableBonusXpTurns}</span> tour(s)</div>\`;
        
        topBadgesHtml += \`<div \${tooltipAttrs} style="position: absolute; top: -8px; left: \${leftPos}; width: 28px; height: 28px; background: linear-gradient(135deg, #422006, #1a0f02); border: 2px solid #facc15; border-radius: 50%; color: #facc15; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.5); z-index: 4; opacity: \${opacity}; filter: \${filter}; transition: all 0.3s; cursor: help;"><template class="tooltip-data">\${xpTooltipHtml}</template><span class="material-symbols-outlined" style="font-size: 1rem;">star</span></div>\`;
    }
    let turnOrderBadgeHtml = topBadgesHtml;`;

if (searchRegex.test(content)) {
    content = content.replace(searchRegex, '\n' + replaceString);
    fs.writeFileSync('src/main/resources/static/js/combat/combat-ui.js', content, 'utf8');
    console.log('Replaced via regex successfully');
} else {
    console.log('Not found. Aborting.');
}
