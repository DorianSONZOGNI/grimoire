function getSpiritualiteColor(sp) {
    if (!sp) return '#cbd5e1';
    switch (sp.toUpperCase ? sp.toUpperCase() : sp) {
        case 'TENEBRES': return '#a855f7';
        case 'ESPRIT': return '#38bdf8';
        case 'KARMA': return '#e7d198';
        case 'VIOLENCE': return '#a70740';
        case 'TRAHISON': return '#ed5677';
        case 'SURETE': return '#00e5cc';
        case 'RAISON': return '#3b82f6';
        case 'DESTRUCTION': return '#ff0000';
        case 'CREATION': return '#10b981';
        case 'CONVICTION': return '#b74c0b';
        case 'CONSOLIDATION': return '#99674c';
        default: return '#cbd5e1';
    }
}

function getLevelColor(lvl) {
    const l = parseInt(lvl) || 1;
    if (l === 1) return '#10b981';
    if (l === 2) return '#3b82f6';
    if (l === 3) return '#a855f7';
    if (l === 4) return '#f59e0b';
    if (l >= 5) return '#ef4444';
    return '#10b981';
}

function getTypeColor(isMagic) {
    return isMagic ? '#ec4899' : '#b45309';
}
