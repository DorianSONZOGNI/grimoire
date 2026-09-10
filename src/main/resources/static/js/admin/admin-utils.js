import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';


export function getSecretIconOnlyHtml(m) {
    if (!m.nativeSecret) return '';
    const sm = SECRETS_META.find(s => s.name === m.nativeSecret) || { icon: "explore", color: "#10b981" };
    return `<span class="material-symbols-outlined cs-icon align-middle" title="${m.nativeSecret}" style="color: ${sm.color}; font-size: 1.1rem; margin-right: 4px;">${sm.icon}</span>`;
}

export function getSecretBadgeHtml(m) {
    if (!m.nativeSecret) return '';
    const sm = SECRETS_META.find(s => s.name === m.nativeSecret) || { icon: "explore", color: "#10b981" };
    return `<div class="admin-monster-badge" title="${m.nativeSecret}" style="color: ${sm.color}; border: 1px solid ${sm.color}60;"><span class="material-symbols-outlined text-lg" >${sm.icon}</span></div>`;
}

export function sortMonstersBySecret(monsters) {
    return monsters.sort((a, b) => {
        let idxA = SECRETS_META.findIndex(s => s.name === a.nativeSecret);
        if (idxA === -1) idxA = 999;
        let idxB = SECRETS_META.findIndex(s => s.name === b.nativeSecret);
        if (idxB === -1) idxB = 999;

        if (idxA !== idxB) return idxA - idxB;
        if ((a.level || 1) !== (b.level || 1)) return (a.level || 1) - (b.level || 1);
        return a.name.localeCompare(b.name);
    });
}

export function collectDungeonAnomalies(dungeon) {
    const names = new Set();
    if (!dungeon.salles) return [];
    dungeon.salles.forEach(s => {
        // Alteration reward (SPECIAL_ITEM)
        if (s.alterationSpecialItemReward) {
            names.add(s.alterationSpecialItemReward);
        }
        // Merchant and Strange Door ITEM loot tables
        if (s.lootTable) {
            s.lootTable.forEach(entry => {
                if (entry.specialItemName) {
                    names.add(entry.specialItemName);
                }
                if (entry.equipmentId) {
                    const an = pageState.allAnomalies.find(a => a.id === entry.equipmentId);
                    if (an) names.add(an.name);
                }
            });
        }
        // Strange Door -> TRESOR outcome: anomalie stored by ID
        if (s.eventSubType === 'PORTE_ETRANGE' && s.doorOutcomes) {
            let outcomes = s.doorOutcomes;
            if (typeof outcomes === 'string') {
                try { outcomes = JSON.parse(outcomes); } catch (e) { outcomes = []; }
            }
            outcomes.forEach(outcome => {
                if (outcome.type === 'TRESOR' && outcome.treasureAnomalieId) {
                    const an = pageState.allAnomalies.find(a => a.id == outcome.treasureAnomalieId);
                    if (an) names.add(an.name);
                }
            });
        }
    });
    return Array.from(names);
}