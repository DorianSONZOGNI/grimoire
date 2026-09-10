import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';


export async function loadAnomalies() {
    pageState.allAnomalies = await api.loadAnomalies({ source: '/api/anomalies/all', deduplicate: true });
    renderRooms();
}

export async function loadEquipments() {
    try {
        let merged = await window.api.loadEquipments({ sources: ['/api/shop/templates', '/api/equipments/all'] });

        // Sort by rarity, then name
        const rarityOrder = { 'MAUDIT': 1, 'RELIQUE': 2, 'EPIQUE': 3, 'LEGENDAIRE': 4, 'MYTHIQUE': 5, 'RARE': 6, 'INHABITUEL': 7, 'COMMUN': 8 };
        pageState.allEquipments = merged.sort((a, b) => {
            const rNameA = getRarityName(a.rarity);
            const rNameB = getRarityName(b.rarity);
            const rA = rarityOrder[rNameA] ?? 100;
            const rB = rarityOrder[rNameB] ?? 100;
            if (rA !== rB) return rA - rB;

            const tA = typeof (a.slot?.name || a.slot) === 'object' ? a.slot?.name : a.slot;
            const tB = typeof (b.slot?.name || b.slot) === 'object' ? b.slot?.name : b.slot;
            if (tA !== tB) return (tA || '').localeCompare(tB || '');

            return a.name.localeCompare(b.name);
        });
    } catch (e) {
        console.error(e);
    }
}