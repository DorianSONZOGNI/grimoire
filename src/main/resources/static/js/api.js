import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode } from './constants.js';
import * as ui from './ui.js?v=2';
import * as forge from './forge.js';
import * as grimoire from './grimoire.js';
import * as filters from './filters.js';
import * as sandbox from './sandbox.js';
import * as animations from './animations.js';

let currentUser = undefined;

export async function getCurrentUser() {
    if (currentUser !== undefined) return currentUser;
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
            currentUser = await res.json();
            return currentUser;
        }
    } catch (e) {
        console.warn("Failed to fetch current user", e);
    }
    currentUser = null;
    return null;
}

export function isAdmin(user) {
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.authority === 'ADMIN' || r.authority === 'ROLE_ADMIN');
}

export async function getMeta() {
    const res = await fetch('/api/spells-editor/meta');
    if (!res.ok) throw new Error("Failed to fetch meta");
    return res.json();
}

export async function getSpells() {
    const res = await fetch('/api/spells-editor');
    if (!res.ok) throw new Error("Failed to fetch spells");
    return res.json();
}

export async function createSpell(spellDto) {
    return fetch('/api/spells-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spellDto)
    });
}

export async function deleteSpellAPI(id) {
    return fetch(`/api/spells-editor/${id}`, { method: 'DELETE' });
}

export async function configSandboxHeroAPI(payload) {
    return fetch('/api/spells-editor/sandbox/configure-hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function castSandboxSpellAPI(spellId, choiceKey) {
    let url = `/api/spells-editor/sandbox/cast/${spellId}`;
    if (choiceKey) {
        url += `?choiceKey=${encodeURIComponent(choiceKey)}`;
    }
    return fetch(url, { method: 'POST' });
}

export async function passSandboxTurnAPI() {
    return fetch('/api/spells-editor/sandbox/pass-turn', { method: 'POST' });
}

export async function resetSandboxAPI() {
    return fetch('/api/spells-editor/sandbox/reset', { method: 'POST' });
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

        makeCustomSelect('voieSelect');
        makeCustomSelect('spiritSelect');
        makeCustomSelect('heroConfigVoie');
        makeCustomSelect('heroConfigSpiritualite');

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
        alert("Veuillez saisir un nom de sort.");
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
        voieId: (document.getElementById('voieSelect').value && document.getElementById('voieSelect').value !== '0') ? parseInt(document.getElementById('voieSelect').value) : null,
        spiritualiteId: (document.getElementById('spiritSelect').value && document.getElementById('spiritSelect').value !== '0') ? parseInt(document.getElementById('spiritSelect').value) : null,
        inspiration: document.getElementById('isInspiration') ? document.getElementById('isInspiration').checked : false,
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
            source: (e.effectType === 'AME_DETACHEE') ? null : e.source,
            requiredChoiceKey: e.requiredChoiceKey !== undefined ? e.requiredChoiceKey : null,
            detachedSoulRequirement: e.detachedSoulRequirement || 'NOT_AFFECTED',
            channelingTurns: e.channelingTurns || []
        }))
    };

    try {
        const res = await fetch('/api/spells-editor', {
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
            alert("Erreur lors de l'enregistrement du sort.");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur de connexion au serveur.");
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
        if (container) container.innerHTML = `<div class="empty-state" style="color:var(--danger); text-align:left; padding:2rem;">Erreur de chargement des sorts.<br><br><b>${err.message}</b><br><pre>${err.stack}</pre></div>`;
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
//   EFFETS ÉLÉMENTAIRES — ENTER
// ================================================================

// 💨 VENT (Raison) : traits de vent qui balayent la carte de gauche à droite

// 💧 EAU (Sûreté) : vague qui monte depuis le bas de la carte

// ☠️ POISON (Trahison) : bulles de poison verdâtres qui émanent du centre

// 🪨 TERRE (Consolidation) : fragments de roche qui jaillissent vers le haut

// 🌋 LAVE (Conviction) : coulées de lave qui descendent depuis le haut

// 🌿 PLANTE (Création) : vrilles de vigne qui s'élancent depuis les bords

// 🔥 FEU (Destruction) : gerbe de flammes qui explose vers le haut

// 💥 EXPLOSION (Violence) : onde de choc circulaire + éclats

// 👻 ESPRIT : orbes d'âme qui orbitent autour de la carte

// 🌑 TÉNÈBRES : tentacules d'ombre qui surgissent des bords

// ⚖️ KARMA : deux orbes — or et argent — qui convergent


// ================================================================
//   EFFETS ÉLÉMENTAIRES — LEAVE
// ================================================================

// 💨 VENT — le vent retombe : quelques tourbillons qui se dissipent

// 💧 EAU — gouttelettes qui tombent et éclaboussent

// ☠️ POISON — Brume toxique lourde, poisseuse et lente

// 🪨 TERRE — poussière de pierre qui retombe lourdement depuis le bas

// 🌋 LAVE — braises qui refroidissent et tombent

// 🌱 PLANTE — Liane grimpante lente + nuage de pollen

// 🔥 FEU — cendres et fumée qui s'élèvent

// 💥 EXPLOSION — retombée : éclats qui tombent + fumée

// 👻 ESPRIT — dissolution : la carte libère des âmes spectrales

// 🌑 TÉNÈBRES — le vide se referme : brume noire/violette qui s'absorbe

// ⚖️ KARMA — les orbes se séparent et partent en orbites opposées


// Crée un div de base pour les particules


// Convertit un hex code (#RRGGBB) en chaîne "R, G, B"





// Couleur dédiée aux Voies (même logique que getSpellColor)

// Couleur dédiée aux Spiritualités (même logique que getSpellColor)





let spellToDelete = null;

export function deleteSpell(id) {
    spellToDelete = id;
    const s = state.loadedSpells.find(sp => sp.id === id);
    if (s) {
        document.getElementById('deleteSpellTargetName').textContent = s.nom;
    }
    document.getElementById('deleteSpellModal').classList.add('show');
}

window.closeDeleteSpellModal = function() {
    document.getElementById('deleteSpellModal').classList.remove('show');
    spellToDelete = null;
};

document.getElementById('deleteSpellConfirmBtn')?.addEventListener('click', async () => {
    if (!spellToDelete) return;
    const id = spellToDelete;
    closeDeleteSpellModal();
    
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
            alert("Erreur lors de la suppression du sort.");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur de connexion au serveur.");
    }
});






export async function configureSandboxHero() {
    const voieId = document.getElementById('heroConfigVoie').value || null;
    const voieLevel = parseInt(document.getElementById('heroConfigVoieLevel').value) || 1;
    const spiritualiteId = document.getElementById('heroConfigSpiritualite').value || null;
    const spiritualiteLevel = parseInt(document.getElementById('heroConfigSpiritLevel').value) || 1;
    const healthMax = parseInt(document.getElementById('heroConfigHp').value) || 100;
    const manaMax = parseInt(document.getElementById('heroConfigMana').value) || 100;
    const power = parseInt(document.getElementById('heroConfigPower').value) || 0;
    const strength = parseInt(document.getElementById('heroConfigStrength').value) || 0;
    const armor = parseInt(document.getElementById('heroConfigArmor').value) || 0;
    const resistance = parseInt(document.getElementById('heroConfigResistance').value) || 0;
    const speed = parseInt(document.getElementById('heroConfigSpeed').value) || 0;
    const crit = parseInt(document.getElementById('heroConfigCrit').value) || 0;

    try {
        const res = await fetch('/api/spells-editor/sandbox/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voieId: voieId ? parseInt(voieId) : null,
                voieLevel,
                spiritualiteId: spiritualiteId ? parseInt(spiritualiteId) : null,
                spiritualiteLevel,
                healthMax,
                manaMax,
                power,
                strength,
                armor,
                resistance,
                speed,
                crit
            })
        });
        if (res.ok) {
            const state = await res.json();
            updateSandboxUI(state);
            // Fermer le panel de configuration après succès
            document.getElementById('heroConfigPanel').classList.remove('expanded');
        } else {
            alert("Erreur lors de la configuration du héros.");
        }
    } catch (err) {
        console.error(err);
    }
}







export async function castSandboxSpell(spellId) {
    const choiceSelect = document.getElementById(`choice-select-${spellId}`);
    const choiceKey = choiceSelect ? choiceSelect.value : '';

    try {
        let url = `/api/spells-editor/sandbox/cast/${spellId}`;
        if (choiceKey) {
            url += `?choiceKey=${choiceKey}`;
        }
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) {
            const state = await res.json();
            updateSandboxUI(state);
        } else {
            alert("Erreur lors du lancer du sort.");
        }
    } catch (err) {
        console.error(err);
    }
}

export async function passSandboxTurn() {
    try {
        const res = await passSandboxTurnAPI();
        if (res.ok) {
            const state = await res.json();
            updateSandboxUI(state);
        } else {
            alert("Erreur lors du passage du tour.");
        }
    } catch (err) {
        console.error(err);
    }
}

export async function resetSandbox() {
    try {
        const res = await resetSandboxAPI();
        if (res.ok) {
            const state = await res.json();
            updateSandboxUI(state);
        } else {
            alert("Erreur lors de la réinitialisation.");
        }
    } catch (err) {
        console.error(err);
    }
}






