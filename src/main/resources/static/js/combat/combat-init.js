import { pageState } from './combat-state.js';
import { initMultiSSE } from './combat-socket.js';
import { updateUI } from './combat-ui.js?v=203';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../utils/filters.js';


export async function loadAnomaliesCombat() {
    if (!window.allAnomaliesCombat || !Array.isArray(window.allAnomaliesCombat) || window.allAnomaliesCombat.length === 0) {
        try {
            const res = await globalFetch('/api/anomalies/all-templates');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) window.allAnomaliesCombat = data;
            }
        } catch (e) {
            console.error("Failed to load anomalies templates:", e);
            window.allAnomaliesCombat = [];
        }
    }
    try {
        const resUser = await globalFetch('/api/anomalies');
        if (resUser.ok) {
            const dataUser = await resUser.json();
            if (Array.isArray(dataUser)) window.myGlobalAnomalies = dataUser;
        }
    } catch (e) {
        console.error("Failed to load user anomalies:", e);
        window.myGlobalAnomalies = [];
    }
}

export async function resumeCombat(savedSessionId) {
    try {
        const res = await globalFetch(`/api/pve/combat/${savedSessionId}/resume`, { method: 'POST' });
        if (!res.ok) {
            localStorage.removeItem('activeCombatId');
            if (typeof showNotif !== 'undefined') window.showNotif("Combat introuvable ou expiré.", true);
            else ui.showNotif("Combat introuvable ou expiré.", true);
            window.location.href = '/dungeons.html';
            return;
        }
        const data = await res.json();
        pageState.sessionId = data.sessionId;
        pageState.isMulti = (data.multi === true);

        if (pageState.isMulti) {
            initMultiSSE(savedSessionId);
        }

        data.players.forEach(p => {
            pageState.previousPlayerXP[p.id] = p.experience;
            pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });

        updateUI(data);
    } catch (e) {
        console.error(e);
        localStorage.removeItem('activeCombatId');
        window.location.href = '/dungeons.html';
    }
}

export async function startCombat(characterIds, dungeonId, consumableIds) {
    try {
        let fetchUrl = `/api/pve/combat/start?characterIds=${characterIds}&dungeonId=${dungeonId}`;
        if (consumableIds) {
            fetchUrl += `&consumableIds=${consumableIds}`;
        }

        const res = await globalFetch(fetchUrl, {
            method: 'POST'
        });

        if (!res.ok) {
            let errText = "Erreur lors de l'initialisation du donjon.";
            try {
                const text = await res.text();
                if (text) errText = text;
            } catch(e) {}
            if (typeof showNotif !== 'undefined') window.showNotif(errText, true);
            else ui.showNotif(errText, true);
            window.location.href = '/dungeons.html';
            return;
        }

        const data = await res.json();
        pageState.sessionId = data.sessionId;
        localStorage.setItem('activeCombatId', pageState.sessionId);

        // Nettoyer l'URL pour éviter de relancer le donjon au F5
        window.history.replaceState({}, document.title, window.location.pathname);

        // Initialize previous XP for the first room
        data.players.forEach(p => {
            pageState.previousPlayerXP[p.id] = p.experience;
            pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });

        updateUI(data);
    } catch (e) {
        console.error(e);
        if (typeof showNotif !== 'undefined') window.showNotif("Erreur de connexion.", true);
        else ui.showNotif("Erreur de connexion.", true);
        window.location.href = '/dungeons.html';
    }
}