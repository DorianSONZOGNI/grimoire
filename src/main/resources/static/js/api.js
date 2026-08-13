import { state } from './state.js';
import * as ui from './ui.js?v=2';

let currentUser = undefined;
let currentUserPromise = null;

export function getCurrentUser() {
    if (currentUser !== undefined) return currentUser;
    if (currentUserPromise) return currentUserPromise;

    currentUserPromise = (async () => {
        try {
            const res = await globalFetch('/api/auth/me', { credentials: 'same-origin' });
            if (res.ok) {
                currentUser = await res.json();
                return currentUser;
            }
        } catch (e) {
            console.warn("Failed to fetch current user", e);
        }

        currentUser = null;
        return null;
    })();

    return currentUserPromise;
}

export function isAdmin(user) {
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.authority === 'ADMIN' || r.authority === 'ROLE_ADMIN');
}

export async function getMeta() {
    const res = await globalFetch('/api/spells-editor/meta');
    if (!res.ok) throw new Error("Failed to fetch meta");
    return res.json();
}

export async function getSpells() {
    const res = await globalFetch('/api/spells-editor');
    if (!res.ok) throw new Error("Failed to fetch spells");
    return res.json();
}


export async function deleteSpellAPI(id) {
    return globalFetch(`/api/spells-editor/${id}`, { method: 'DELETE' });
}

export async function loadEquipments(options = {}) {
    const {
        sources = ['/api/shop/templates'],
        includeAnomalies = false,
        isAdmin = false
    } = options;

    let results = [];

    for (const source of sources) {
        try {
            const res = await globalFetch(source);
            if (res.ok) {
                const data = await res.json();
                results = results.concat(data);
            }
        } catch (e) {
            console.error(`Erreur chargement ${source}:`, e);
        }
    }

    if (includeAnomalies) {
        try {
            const aUrl = isAdmin ? '/api/anomalies/all' : '/api/anomalies';
            const aRes = await globalFetch(aUrl);
            if (aRes.ok) {
                const aData = await aRes.json();
                aData.forEach(a => {
                    a.isAnomalie = true;
                    a.slot = 'ANOMALIE';
                    a.rarity = 'RELIQUE';
                });
                results = results.concat(aData);
            }
        } catch (e) {
            console.error('Erreur chargement anomalies:', e);
        }
    }

    if (sources.length > 1) {
        let map = new Map();
        results.forEach(eq => {
            if (!map.has(eq.name)) {
                map.set(eq.name, eq);
            }
        });
        results = Array.from(map.values());
    }

    return results;
}











// Au chargement, récupérer les métadonnées

export async function fetchMeta() {
    try {
        state.metaData = await getMeta();

        // Remplir les Voies
        const voieSel = document.getElementById('voieSelect');
        if (voieSel) voieSel.style.fontFamily = "";
        const optgroupVoies = document.getElementById('optgroupVoiesFilter');
        state.metaData.voies.forEach(v => {
            voieSel.innerHTML += `<option value="${v.id}">${v.nom}</option>`;
            if (optgroupVoies) optgroupVoies.innerHTML += `<option value="V_${v.id}">${v.nom}</option>`;
        });

        // Remplir les Spiritualités
        const spiritSel = document.getElementById('spiritSelect');
        if (spiritSel) spiritSel.style.fontFamily = "";
        const optgroupSpirits = document.getElementById('optgroupSpiritsFilter');
        state.metaData.spiritualites.forEach(s => {
            spiritSel.innerHTML += `<option value="${s.id}">${s.nom}</option>`;
            if (optgroupSpirits) optgroupSpirits.innerHTML += `<option value="S_${s.id}">${s.nom}</option>`;
        });

        const mutationSel = document.getElementById('mutationSelect');
        if (mutationSel) {
            mutationSel.style.fontFamily = "";
            state.metaData.mutations.forEach(m => {
                mutationSel.innerHTML += `<option value="${m.id}" data-icon="${m.icon || 'pets'}" data-color="${m.color || '#e879f9'}">${m.nom} (Niv. ${m.level || 1})</option>`;
            });
        }
        const filterMutationSel = document.getElementById('filterMutation');
        if (filterMutationSel) {
            filterMutationSel.style.fontFamily = "";
            state.metaData.mutations.forEach(m => {
                filterMutationSel.innerHTML += `<option value="${m.id}" data-icon="${m.icon || 'pets'}" data-color="${m.color || '#e879f9'}">${m.nom} (Niv. ${m.level || 1})</option>`;
            });
        }

        makeCustomSelect('voieSelect');
        makeCustomSelect('spiritSelect');
        makeCustomSelect('mutationSelect');
        makeCustomSelect('filterMutation');

        // Remplir les sources de coûts
        const pms = document.getElementById('percentManaCostSource');
        const phs = document.getElementById('percentHealCostSource');
        const sourcesHtml = renderSourceOptions(state.metaData.sources, '');
        if (pms) pms.innerHTML = sourcesHtml;
        if (phs) phs.innerHTML = sourcesHtml;

        // Sélectionner des valeurs par défaut pertinentes
        if (pms) pms.value = 'CASTER_MANA_MAX';
        if (phs) phs.value = 'CASTER_HEALTH_MAX';

        // Appliquer le style Premium à TOUTES les combo boxes
        ['voieSelect', 'spiritSelect', 'niveau', 'castingTypeSelect',
            'percentManaCostSource', 'percentHealCostSource',
            'filterEffect', 'filterLevel', 'sortBy'].forEach(id => makeCustomSelect(id));



        updateRankTitle();
        renderOriginButtons();

        // Toggle channeling fields visibility based on casting type select
        const castingTypeSel = document.getElementById('castingTypeSelect');
        if (castingTypeSel) {
            castingTypeSel.addEventListener('change', toggleChannelingFields);
        }
        toggleChannelingFields();
    } catch (err) {
        console.error("Erreur de chargement des métadonnées", err);
    }
}



















// === ANIMATIONS FORGE ===


export async function submitSpell() {
    playForgeAnimation();
    const nomInput = document.getElementById('nom');
    if (!nomInput.value.trim()) {
        ui.showNotif("Veuillez saisir un nom de sort.");
        return;
    }

    const heatEffect = state.currentEffects.find(e => e.effectType === 'HEAT_FIXED');
    const heatValue = heatEffect ? (parseInt(heatEffect.flatValue) || 0) : 0;

    const payload = {
        id: state.editingSpellId || null,
        nom: nomInput.value.trim(),
        niveau: parseInt(document.getElementById('niveau').value) || 1,
        castingType: document.getElementById('castingTypeSelect').value || 'BANAL',
        channelingDuration: document.getElementById('castingTypeSelect').value === 'CANALISE'
            ? (parseInt(document.getElementById('channelingDuration').value) || 1)
            : 0,
        allowInstantDuringChanneling: document.getElementById('castingTypeSelect').value === 'CANALISE'
            ? document.getElementById('allowInstantDuringChanneling').checked
            : true,
        description: document.getElementById('description').value.trim(),
        manaCost: parseInt(document.getElementById('manaCost').value) || 0,
        percentManaCost: parseInt(document.getElementById('percentManaCost').value) || 0,
        percentManaCostSource: document.getElementById('percentManaCostSource').value || 'CASTER_MANA_MAX',
        healCost: parseInt(document.getElementById('healCost').value) || 0,
        percentHealCost: parseInt(document.getElementById('percentHealCost').value) || 0,
        percentHealCostSource: document.getElementById('percentHealCostSource').value || 'CASTER_HEALTH_MAX',
        heatCost: parseInt(document.getElementById('heatCost').value) || 0,
        percentHeatCost: parseInt(document.getElementById('percentHeatCost').value) || 0,
        heatGenerated: heatValue,
        voieId: document.getElementById('voieSelect').value ? parseInt(document.getElementById('voieSelect').value) : null,
        spiritualiteId: document.getElementById('spiritSelect').value ? parseInt(document.getElementById('spiritSelect').value) : null,
        mutationId: document.getElementById('mutationSelect').value ? parseInt(document.getElementById('mutationSelect').value) : null,
        inspiration: document.getElementById('isInspiration')?.checked || false,
        karmaAlignment: document.getElementById('karmaAlignment') ? document.getElementById('karmaAlignment').value : 'NONE',

        effects: state.currentEffects.map(e => ({
            effectType: (e.effectType === 'POISON' || e.effectType === 'BURN' || e.effectType === 'AME_DETACHEE') ? 'BUFF_DEBUFF' : e.effectType,
            effectTarget: e.effectTarget,
            damage: e.damage,
            healAmount: e.healAmount,
            manaAmount: e.manaAmount || 0,
            percentage: e.percentage,
            flatValue: e.flatValue,
            modifier: e.modifier,
            duration: e.duration,
            damageType: e.damageType,
            statAffected: (e.effectType === 'POISON' || e.effectType === 'BURN' || e.effectType === 'AME_DETACHEE') ? e.effectType : e.statAffected,
            source: (e.effectType === 'AME_DETACHEE') ? null : (e.source === "" ? null : e.source),
            requiredChoiceKey: e.requiredChoiceKey !== undefined ? e.requiredChoiceKey : null,
            detachedSoulRequirement: e.detachedSoulRequirement || 'NOT_AFFECTED',
            channelingTurns: e.channelingTurns || []
        }))
    };

    try {
        const res = await globalFetch('/api/spells-editor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const msg = await res.text();
            showNotif(msg);

            // Réinitialiser le formulaire et l'état d'édition
            state.editingSpellId = null;
            document.getElementById('spellForgePanel').classList.remove('editing-mode');
            document.getElementById('submitSpellBtn').innerText = '✦ Forger le Sort';
            nomInput.value = '';
            document.getElementById('description').value = '';
            state.currentEffects = [];
            renderEffects();
            updateSpecialVoieConfig();

            // Réinitialiser les champs de canalisation
            const channelingDurInput = document.getElementById('channelingDuration');
            if (channelingDurInput) channelingDurInput.value = 1;
            const allowInstantInput = document.getElementById('allowInstantDuringChanneling');
            if (allowInstantInput) allowInstantInput.checked = true;
            document.getElementById('castingTypeSelect').value = 'BANAL';
            document.getElementById('castingTypeSelect').dispatchEvent(new Event('change'));
            const isInspInput = document.getElementById('isInspiration');
            if (isInspInput) {
                isInspInput.checked = true;
                updateViolenceLabel();
            }

            // Mettre à jour l'aperçu d'édition flottant
            updateEditingPreview();

            // Recharger la liste
            await loadSpells();
        } else {
            ui.showNotif("Erreur lors de l'enregistrement du sort.");
        }
    } catch (err) {
        console.error(err);
        ui.showNotif("Erreur de connexion au serveur.");
    }
}

export async function loadSpells() {
    const container = document.getElementById('createdSpellsContainer');
    try {
        const spells = await getSpells();
        state.loadedSpells = spells;
        renderFilteredSpells();
    } catch (err) {
        console.error(err);
        if (container) container.innerHTML = `<div class="empty-state error-state">Erreur de chargement des sorts.</div>`;
        ui.showNotif("Erreur de chargement des sorts.");
    }
}






/* ================================================================
   EFFETS HOVER LVL-5 : enter/leave par voie / spiritualité
   ================================================================ */


// ================================================================
//   EFFETS HOVER LVL-5 : enter/leave par voie / spiritualité
// ================================================================

// ---- ENTER (mouseenter) ----

// ---- LEAVE (mouseleave) ----

// ================================================================
//   EFFETS ÉLÉMENTAIRES â€” ENTER
// ================================================================

// 💨 VENT (Raison) : traits de vent qui balayent la carte de gauche à droite

// 💧 EAU (Sûreté) : vague qui monte depuis le bas de la carte

// â˜ ï¸ POISON (Trahison) : bulles de poison verdâtres qui émanent du centre

// 🪨 TERRE (Consolidation) : fragments de roche qui jaillissent vers le haut

// 🌋 LAVE (Conviction) : coulées de lave qui descendent depuis le haut

// 🌿 PLANTE (Création) : vrilles de vigne qui s'élancent depuis les bords

// 🔥 FEU (Destruction) : gerbe de flammes qui explose vers le haut

// 💥 EXPLOSION (Violence) : onde de choc circulaire + éclats

// 👻 ESPRIT : orbes d'âme qui orbitent autour de la carte

// 🌑 TÉNÈBRES : tentacules d'ombre qui surgissent des bords

// âš–ï¸ KARMA : deux orbes â€” or et argent â€” qui convergent


// ================================================================
//   EFFETS ÉLÉMENTAIRES â€” LEAVE
// ================================================================

// 💨 VENT â€” le vent retombe : quelques tourbillons qui se dissipent

// 💧 EAU â€” gouttelettes qui tombent et éclaboussent

// â˜ ï¸ POISON â€” Brume toxique lourde, poisseuse et lente

// 🪨 TERRE â€” poussière de pierre qui retombe lourdement depuis le bas

// 🌋 LAVE â€” braises qui refroidissent et tombent

// 🌱 PLANTE â€” Liane grimpante lente + nuage de pollen

// 🔥 FEU â€” cendres et fumée qui s'élèvent

// 💥 EXPLOSION â€” retombée : éclats qui tombent + fumée

// 👻 ESPRIT â€” dissolution : la carte libère des âmes spectrales

// 🌑 TÉNÈBRES â€” le vide se referme : brume noire/violette qui s'absorbe

// âš–ï¸ KARMA â€” les orbes se séparent et partent en orbites opposées


// Crée un div de base pour les particules


// Convertit un hex code (#RRGGBB) en chaîne "R, G, B"





// Couleur dédiée aux Voies (même logique que getSpellColor)

// Couleur dédiée aux Spiritualités (même logique que getSpellColor)





export function deleteSpell(id) {
    const s = state.loadedSpells.find(sp => sp.id === id);
    const spellName = s ? s.nom : 'ce sort';

    ui.showModal({
        title: 'Détruire le sort ?',
        body: `Êtes-vous sûr de vouloir détruire <strong class="text-white">${spellName}</strong> ? Cette action est définitive.`,
        icon: 'warning',
        confirmText: 'Oui, détruire',
        onConfirm: async () => {
            try {
                const res = await deleteSpellAPI(id);
                if (res.ok) {
                    const msg = await res.text();
                    ui.showNotif(msg);
                    if (state.editingSpellId === id) {
                        ui.cancelEditSpell();
                    }
                    await loadSpells();
                } else {
                    ui.showNotif("Erreur lors de la suppression du sort.");
                }
            } catch (err) {
                console.error("Erreur delete spell:", err);
                ui.showNotif("Erreur inattendue");
            }
        }
    });
};









export async function loadAnomalies(options = {}) {
    const {
        source = '/api/anomalies/all',
        deduplicate = false
    } = options;

    try {
        const res = await globalFetch(source);
        if (!res.ok) throw new Error('Network response was not ok');
        let data = await res.json();

        if (deduplicate) {
            const uniqueNames = new Set();
            data = data.filter(a => {
                if (uniqueNames.has(a.name)) return false;
                uniqueNames.add(a.name);
                return true;
            });
        }

        return data.sort((a, b) => {
            const spiriA = a.spiritualite || 'ZZZ';
            const spiriB = b.spiritualite || 'ZZZ';
            if (spiriA !== spiriB) return spiriA.localeCompare(spiriB);
            const lvlA = a.level || 1;
            const lvlB = b.level || 1;
            if (lvlA !== lvlB) return lvlA - lvlB;
            return a.name.localeCompare(b.name);
        });
    } catch (e) {
        console.error('Erreur API loadAnomalies:', e);
        return [];
    }
}

export async function deleteEquipmentAPI(id, options = {}) {
    const {
        confirm = true,
        confirmTitle = "Détruire l'équipement ?",
        confirmBody = "Voulez-vous vraiment détruire l'équipement ?",
        apiRoute = "/api/shop/templates/",
        onSuccess = async () => { }
    } = options;

    const doDelete = async () => {
        try {
            const res = await globalFetch(`${apiRoute}${id}`, { method: 'DELETE' });
            if (res.ok) {
                ui.showNotif('Équipement supprimé.');
                await onSuccess();
            } else {
                ui.showNotif('Erreur lors de la suppression.', true);
            }
        } catch (e) {
            ui.showNotif('Erreur réseau.', true);
        }
    };

    if (confirm) {
        ui.showModal({
            title: confirmTitle,
            body: confirmBody,
            icon: 'warning',
            confirmText: 'Oui, détruire',
            onConfirm: doDelete
        });
    } else {
        await doDelete();
    }
}
