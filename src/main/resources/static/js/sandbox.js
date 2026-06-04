// ===================================================================
// sandbox.js — Banc d'Essai (Simulateur de sorts)
// ===================================================================

import state from './state.js';
import { formatSrc, formatStat, getSpellColor, getVoieButtonColor, getSpiritButtonColor, getVoieIcon, getSpiritIcon } from './ui.js';
import { getSpellEffectsSummaryHtml } from './grimoire.js';

export async function trySpell(id) {
    if (!state.sandboxSpellIds.includes(id)) {
        state.sandboxSpellIds.push(id);
    }
    renderSandboxSpells();
    renderSandboxSpellSelector();
    populateHeroConfigSelectors();

    const overlay = document.getElementById('simulationModalOverlay');
    overlay.classList.add('active');

    try {
        const res = await fetch('/api/spells-editor/sandbox/state');
        if (res.ok) {
            const stateData = await res.json();
            updateSandboxUI(stateData);
        }
    } catch (err) {
        console.error(err);
        document.getElementById('simulationLogsContainer').innerText = "❌ Erreur de communication avec le banc d'essai.";
    }
}

export function toggleHeroConfig() {
    const panel = document.getElementById('heroConfigPanel');
    if (panel) panel.classList.toggle('expanded');
}

export function populateHeroConfigSelectors() {
    const voieSelect = document.getElementById('heroConfigVoie');
    const spiritSelect = document.getElementById('heroConfigSpiritualite');
    if (!voieSelect || !spiritSelect || !state.metaData.voies) return;

    [voieSelect, spiritSelect].forEach(select => {
        if (select.dataset.customized) {
            if (select.nextElementSibling && select.nextElementSibling.tagName === 'DIV') {
                select.nextElementSibling.remove();
            }
            select.dataset.customized = "";
            select.style.display = "";
        }
    });

    const currentVoie = voieSelect.value;
    const currentSpirit = spiritSelect.value;

    let voieHtml = '<option value="">— Aucune —</option>';
    (state.metaData.voies || []).forEach(v => {
        voieHtml += `<option value="${v.id}">${v.nom}</option>`;
    });
    voieSelect.innerHTML = voieHtml;

    let spiritHtml = '<option value="">— Aucune —</option>';
    (state.metaData.spiritualites || []).forEach(s => {
        spiritHtml += `<option value="${s.id}">${s.nom}</option>`;
    });
    spiritSelect.innerHTML = spiritHtml;

    if (currentVoie) voieSelect.value = currentVoie;
    if (currentSpirit) spiritSelect.value = currentSpirit;

    if (window.makeCustomSelect) {
        window.makeCustomSelect('heroConfigVoie');
        window.makeCustomSelect('heroConfigSpiritualite');
    }
}

export async function configureSandboxHero() {
    const voieId = document.getElementById('heroConfigVoie').value || null;
    const voieLevel = parseInt(document.getElementById('heroConfigVoieLevel').value) || 1;
    const spiritualiteId = document.getElementById('heroConfigSpiritualite').value || null;
    const spiritualiteLevel = parseInt(document.getElementById('heroConfigSpiritLevel').value) || 1;
    const healthMax = parseInt(document.getElementById('heroConfigHp').value) || 100;
    const manaMax = parseInt(document.getElementById('heroConfigMana').value) || 100;
    const power = parseInt(document.getElementById('heroConfigPower').value) || 0;
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
                armor,
                resistance,
                speed,
                crit
            })
        });
        if (res.ok) {
            const stateData = await res.json();
            updateSandboxUI(stateData);
            document.getElementById('heroConfigPanel').classList.remove('expanded');
        } else {
            alert("Erreur lors de la configuration du héros.");
        }
    } catch (err) {
        console.error(err);
    }
}

export function syncHeroConfigForm(stateData) {
    const voieSelect = document.getElementById('heroConfigVoie');
    const spiritSelect = document.getElementById('heroConfigSpiritualite');
    if (voieSelect) {
        if (stateData.heroVoieId != null) voieSelect.value = stateData.heroVoieId;
        else voieSelect.value = '';
        voieSelect.dispatchEvent(new Event('change'));
    }
    if (spiritSelect) {
        if (stateData.heroSpiritualiteId != null) spiritSelect.value = stateData.heroSpiritualiteId;
        else spiritSelect.value = '';
        spiritSelect.dispatchEvent(new Event('change'));
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('heroConfigVoieLevel', stateData.heroVoieLevel || 1);
    setVal('heroConfigSpiritLevel', stateData.heroSpiritualiteLevel || 1);
    setVal('heroConfigHp', stateData.heroHpMax || 100);
    setVal('heroConfigMana', stateData.heroManaMax || 100);
    setVal('heroConfigPower', stateData.heroBasePower !== undefined ? stateData.heroBasePower : (stateData.heroPower || 0));
    setVal('heroConfigArmor', stateData.heroBaseArmor !== undefined ? stateData.heroBaseArmor : (stateData.heroArmor || 0));
    setVal('heroConfigResistance', stateData.heroBaseResistance !== undefined ? stateData.heroBaseResistance : (stateData.heroResistance || 0));
    setVal('heroConfigSpeed', stateData.heroBaseSpeed !== undefined ? stateData.heroBaseSpeed : (stateData.heroSpeed || 0));
    setVal('heroConfigCrit', stateData.heroBaseCrit !== undefined ? stateData.heroBaseCrit : (stateData.heroCrit || 0));
}

export function renderHeroConfigBadges(stateData) {
    const container = document.getElementById('heroConfigBadges');
    if (!container) return;

    let html = '';
    if (stateData.heroVoieName) {
        html += `<span class="hero-config-badge voie">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">route</span>
                    ${stateData.heroVoieName} Lvl ${stateData.heroVoieLevel}
                </span>`;
    }
    if (stateData.heroSpiritualiteName) {
        html += `<span class="hero-config-badge spirit">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">self_improvement</span>
                    ${stateData.heroSpiritualiteName} Lvl ${stateData.heroSpiritualiteLevel}
                </span>`;
    }
    if (!stateData.heroVoieName && !stateData.heroSpiritualiteName) {
        html += `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">Aucune voie ni spiritualité configurée</span>`;
    }

    const pui = stateData.heroBasePower !== undefined ? stateData.heroBasePower : (stateData.heroPower || 0);
    const arm = stateData.heroBaseArmor !== undefined ? stateData.heroBaseArmor : (stateData.heroArmor || 0);
    const res = stateData.heroBaseResistance !== undefined ? stateData.heroBaseResistance : (stateData.heroResistance || 0);
    const vit = stateData.heroBaseSpeed !== undefined ? stateData.heroBaseSpeed : (stateData.heroSpeed || 0);
    const crit = stateData.heroBaseCrit !== undefined ? stateData.heroBaseCrit : (stateData.heroCrit || 0);

    html += `<div class="hero-stats-row">`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${pui} Pui</span>`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${arm} Arm</span>`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${res} Rés</span>`;
    if (vit > 0) html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${vit} Vit</span>`;
    if (crit > 0) html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${crit}% Crit</span>`;
    html += `</div>`;

    container.innerHTML = html;
}

export function renderSandboxSpells() {
    const container = document.getElementById('sandboxSpellsContainer');
    if (!container) return;

    if (state.sandboxSpellIds.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-style:italic; font-size:0.85rem;">Aucun sort dans le banc d'essai. Ajoutez-en un !</div>`;
        return;
    }

    container.innerHTML = state.sandboxSpellIds.map(spellId => {
        const sp = state.loadedSpells.find(s => s.id === spellId);
        if (!sp) return '';

        const titleColor = getSpellColor(sp);

        const effectsList = sp.effects || [];
        const choiceKeys = [...new Set(effectsList.map(e => e.requiredChoiceKey).filter(k => k != null))];

        let optionSelectorHtml = '';
        if (choiceKeys.length > 0) {
            optionSelectorHtml = `
                        <div class="sandbox-spell-options">
                            <select id="choice-select-${sp.id}">
                                ${choiceKeys.map(k => `<option value="${k}">Option ${k}</option>`).join('')}
                            </select>
                        </div>
                    `;
        }

        const getSrcIcon = (src) => {
            const s = src || '';
            if (s.includes('MANA')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #38bdf8; vertical-align: middle;" title="${formatSrc(s)}">water_drop</span>`;
            if (s.includes('HEALTH') || s.includes('PV')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f43f5e; vertical-align: middle;" title="${formatSrc(s)}">bloodtype</span>`;
            if (s.includes('POWER') || s.includes('Puiss')) return `<span class="material-symbols-outlined" style="font-size: 0.95rem; color: #a855f7; vertical-align: middle;" title="${formatSrc(s)}">auto_awesome</span>`;
            return `(${formatSrc(s)})`;
        };

        let costDetailsHtml = [];
        if (sp.manaCost > 0 || sp.percentManaCost > 0) {
            costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #38bdf8;" title="Mana">water_drop</span><span style="border-bottom: 1px solid rgba(56, 189, 248, 0.5); padding-bottom: 0.05rem;">${sp.manaCost}${sp.percentManaCost > 0 ? ` + ${sp.percentManaCost}% ${getSrcIcon(sp.percentManaCostSource || 'CASTER_MANA_MAX')}` : ''}</span></span>`);
        }
        if (sp.healCost > 0 || sp.percentHealCost > 0) {
            costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f43f5e;" title="PV">bloodtype</span><span style="border-bottom: 1px solid rgba(244, 63, 94, 0.5); padding-bottom: 0.05rem;">${sp.healCost}${sp.percentHealCost > 0 ? ` + ${sp.percentHealCost}% ${getSrcIcon(sp.percentHealCostSource || 'CASTER_HEALTH_MAX')}` : ''}</span></span>`);
        }
        if (sp.heatCost > 0 || sp.percentHeatCost > 0) {
            costDetailsHtml.push(`<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f97316;" title="Chaleur">local_fire_department</span><span style="border-bottom: 1px solid rgba(249, 115, 22, 0.5); padding-bottom: 0.05rem;">${sp.heatCost}${sp.percentHeatCost > 0 ? ` + ${sp.percentHeatCost}%` : ''}</span></span>`);
        }
        let costDetails = costDetailsHtml.join(' <span style="color:var(--glass-border); margin:0 0.3rem;">|</span> ');
        if (costDetailsHtml.length === 0) costDetails = `<span style="display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #38bdf8;" title="Mana">water_drop</span><span style="border-bottom: 1px solid rgba(56, 189, 248, 0.5); padding-bottom: 0.05rem;">0</span></span>`;

        let castingTypeHtml = '';
        if (sp.castingType === 'INSTANTANE') {
            castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f59e0b; margin-left: 0.3rem;" title="Action Instantanée">bolt</span>';
        } else if (sp.castingType === 'CANALISE') {
            castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1.1rem; color: #8b5cf6; margin-left: 0.3rem;" title="Action Canalisée">cyclone</span>';
            castingTypeHtml += sp.allowInstantDuringChanneling ?
                '<span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f59e0b; margin-left: 0.2rem;" title="Instantanés autorisés pendant la canalisation">bolt</span>' :
                '<span style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1.1rem; height: 1.1rem; margin-left: 0.2rem;" title="Instantanés interdits pendant la canalisation"><span class="material-symbols-outlined" style="font-size: 1.1rem; color: #64748b;">bolt</span><span style="position: absolute; width: 100%; height: 2px; background: #ef4444; transform: rotate(-45deg);"></span></span>';
        } else {
            castingTypeHtml = '<span class="material-symbols-outlined" style="font-size: 1.1rem; color: #3b82f6; margin-left: 0.3rem;" title="Action Banale">hourglass_empty</span>';
        }

        let voieHtml = '';
        if (sp.voie && sp.voie.nom) {
            const vColor = getVoieButtonColor(sp.voie);
            const vIcon = getVoieIcon(sp.voie.nom);
            voieHtml = `<span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${vColor}; margin-left: 0.2rem;" title="${sp.voie.nom}">${vIcon}</span>`;
        }

        let spiritHtml = '';
        if (sp.spiritualite && sp.spiritualite.nom) {
            const sColor = getSpiritButtonColor(sp.spiritualite);
            const sIcon = getSpiritIcon(sp.spiritualite.nom);
            spiritHtml = `<span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${sColor}; margin-left: 0.2rem;" title="${sp.spiritualite.nom}">${sIcon}</span>`;
        }

        let effectsSummary = getSpellEffectsSummaryHtml(sp);

        return `
                    <div class="sandbox-spell-card" style="border-left: 3px solid ${titleColor}; position: relative;">
                        <div class="sandbox-spell-header">
                            <div class="sandbox-spell-title" style="display: flex; align-items: center; gap: 0.3rem;">
                                <span style="color: ${titleColor}; font-weight: 600;">${sp.nom}</span>
                                <span class="badge" style="font-size: 0.7rem; padding: 0.1rem 0.3rem;">Lvl ${sp.niveau}</span>
                                ${castingTypeHtml}
                                ${voieHtml}
                                ${spiritHtml}
                            </div>
                            <div class="sandbox-spell-actions">
                                <button type="button" class="btn" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;" onclick="window.castSandboxSpell(${sp.id})">Lancer ✦</button>
                                <button type="button" class="btn" style="background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.75rem; padding: 0.2rem 0.4rem; border-radius: 4px;" onclick="window.removeSpellFromSandbox(${sp.id})">Retirer</button>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <span style="display:flex; align-items:center; gap:0.2rem;">${costDetails}</span>
                                ${effectsSummary ? `
                                <div class="spell-effects-trigger" onmouseenter="window.showGlobalTooltip(this)" onmouseleave="window.hideGlobalTooltip()">
                                    <span class="badge" style="background: rgba(255,255,255,0.08); color: #94a3b8; font-size: 0.7rem; padding: 0.1rem 0.4rem; cursor: help;">Effets ✦</span>
                                    <template class="tooltip-data">${effectsSummary}</template>
                                </div>
                                ` : ''}
                            </div>
                            ${optionSelectorHtml}
                        </div>
                    </div>
                `;
    }).join('');
}

export function renderSandboxSpellSelector() {
    const select = document.getElementById('sandboxSpellSelect');
    if (!select) return;

    let html = '<option value="">-- Ajouter un sort au banc d\'essai --</option>';
    state.loadedSpells.forEach(sp => {
        if (!state.sandboxSpellIds.includes(sp.id)) {
            html += `<option value="${sp.id}">${sp.nom} (Lvl ${sp.niveau})</option>`;
        }
    });
    select.innerHTML = html;
}

export function addSelectedSpellToSandbox() {
    const select = document.getElementById('sandboxSpellSelect');
    if (!select || !select.value) return;

    const spellId = parseInt(select.value, 10);
    if (!isNaN(spellId) && !state.sandboxSpellIds.includes(spellId)) {
        state.sandboxSpellIds.push(spellId);
        renderSandboxSpells();
        renderSandboxSpellSelector();
    }
    select.value = "";
}

export function removeSpellFromSandbox(spellId) {
    state.sandboxSpellIds = state.sandboxSpellIds.filter(id => id !== spellId);
    renderSandboxSpells();
    renderSandboxSpellSelector();
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
            const stateData = await res.json();
            updateSandboxUI(stateData);
        } else {
            alert("Erreur lors du lancer du sort.");
        }
    } catch (err) {
        console.error(err);
    }
}

export async function passSandboxTurn() {
    try {
        const res = await fetch('/api/spells-editor/sandbox/pass-turn', { method: 'POST' });
        if (res.ok) {
            const stateData = await res.json();
            updateSandboxUI(stateData);
        } else {
            alert("Erreur lors du passage du tour.");
        }
    } catch (err) {
        console.error(err);
    }
}

export async function resetSandbox() {
    try {
        const res = await fetch('/api/spells-editor/sandbox/reset', { method: 'POST' });
        if (res.ok) {
            const stateData = await res.json();
            updateSandboxUI(stateData);
        } else {
            alert("Erreur lors de la réinitialisation.");
        }
    } catch (err) {
        console.error(err);
    }
}

export function updateSandboxUI(stateData) {
    document.getElementById('sandboxTurnText').innerText = stateData.turnCount || 1;

    const heroHpPct = Math.max(0, Math.min(100, (stateData.heroHpCurrent / stateData.heroHpMax) * 100));
    let heroHpLabel = `${stateData.heroHpCurrent} / ${stateData.heroHpMax}`;
    if (stateData.heroShieldTotal > 0) {
        heroHpLabel += ` (+${stateData.heroShieldTotal} 🛡️)`;
    }
    document.getElementById('heroHpText').innerText = heroHpLabel;
    document.getElementById('heroHpFill').style.width = `${heroHpPct}%`;

    const heroManaPct = Math.max(0, Math.min(100, (stateData.heroManaCurrent / stateData.heroManaMax) * 100));
    document.getElementById('heroManaText').innerText = `${stateData.heroManaCurrent} / ${stateData.heroManaMax}`;
    document.getElementById('heroManaFill').style.width = `${heroManaPct}%`;

    const monsterHpPct = Math.max(0, Math.min(100, (stateData.monsterHpCurrent / stateData.monsterHpMax) * 100));
    let monsterHpLabel = `${stateData.monsterHpCurrent} / ${stateData.monsterHpMax}`;
    if (stateData.monsterShieldTotal > 0) {
        monsterHpLabel += ` (+${stateData.monsterShieldTotal} 🛡️)`;
    }
    document.getElementById('monsterHpText').innerText = monsterHpLabel;
    document.getElementById('monsterHpFill').style.width = `${monsterHpPct}%`;

    const heroShieldsContainer = document.getElementById('heroShieldsContainer');
    let heroShieldsHtml = (stateData.heroShields || []).map(s => `
                <div class="sandbox-status-badge shield" title="Source: ${s.sourceName}">
                    <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span>
                    <span>${s.amount} (${s.duration}t)</span>
                </div>
            `).join('');
    if (stateData.heroHeat > 0) {
        heroShieldsHtml += `
                    <div class="sandbox-status-badge heat" title="Chaleur accumulée" style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #ef4444; vertical-align: middle;">whatshot</span>
                        <span>${stateData.heroHeat}°C / 100</span>
                    </div>
                `;
    }
    if (stateData.heroSurete > 0) {
        heroShieldsHtml += `
                    <div class="sandbox-status-badge surete" title="Points de sûreté" style="background: rgba(245, 158, 11, 0.25); color: #fde68a; border: 1px solid #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f59e0b; vertical-align: middle;">security</span>
                        <span>${stateData.heroSurete}/100 Sûreté</span>
                    </div>
                `;
    }
    if (stateData.heroCritDerived !== null && stateData.heroCritDerived !== undefined) {
        const sign = stateData.heroCritDerived >= 0 ? '+' : '';
        heroShieldsHtml += `
                    <div class="sandbox-status-badge raison" title="Critique dérivé (Raison)" style="background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #3b82f6; vertical-align: middle;">track_changes</span>
                        <span>${sign}${stateData.heroCritDerived}% Critique</span>
                    </div>
                `;
    }
    if (stateData.heroHasTrahison) {
        const baseStyle = stateData.heroTrahisonBaseAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const baseText = stateData.heroTrahisonBaseAvailable ? "+10%" : "";
        const baseIcon = stateData.heroTrahisonBaseAvailable ? "flash_on" : "flash_off";
        heroShieldsHtml += `
                    <div class="sandbox-status-badge trahison-base" title="Bonus de base de Trahison (1er coup du tour)" style="${baseStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">${baseIcon}</span>
                        <span>${baseText}</span>
                    </div>
                `;

        const lowHpStyle = stateData.heroTrahisonLowHpAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const lowHpText = stateData.heroTrahisonLowHpAvailable ? "+15%" : "";
        heroShieldsHtml += `
                    <div class="sandbox-status-badge trahison-lowhp" title="Bonus de Trahison contre cible à moins de 50% PV" style="${lowHpStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">heart_broken</span>
                        <span>${lowHpText}</span>
                    </div>
                `;

        const debuffStyle = stateData.heroTrahisonDebuffAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const debuffText = stateData.heroTrahisonDebuffAvailable ? "+10%" : "";
        heroShieldsHtml += `
                    <div class="sandbox-status-badge trahison-debuff" title="Bonus de Trahison contre cible débuffée" style="${debuffStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">trending_down</span>
                        <span>${debuffText}</span>
                    </div>
                `;
    }
    if (stateData.heroHasConsolidation) {
        const lvl = stateData.heroConsolidationLevel;
        const consolidationLabels = {
            0: { icon: 'shield', text: '+5% Armure', title: 'Consolidation (défaut)' },
            1: { icon: 'speed', text: '+1 Vit', title: 'Consolidation Lvl 1' },
            2: { icon: 'shield', text: '+10% Armure', title: 'Consolidation Lvl 2' },
            3: { icon: 'auto_awesome', text: '+10% Résist.', title: 'Consolidation Lvl 3' },
            4: { icon: 'savings', text: '-20% Coût', title: 'Consolidation Lvl 4' },
            5: { icon: 'security', text: '+8% Arm/Rés', title: 'Consolidation Lvl 5' }
        };
        const info = consolidationLabels[lvl] || consolidationLabels[0];
        heroShieldsHtml += `
                    <div class="sandbox-status-badge consolidation" title="${info.title}" style="background: rgba(34, 197, 94, 0.25); color: #86efac; border: 1px solid #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #22c55e; vertical-align: middle;">${info.icon}</span>
                        <span>${info.text}</span>
                    </div>
                `;
    }
    if (stateData.heroHasViolence) {
        const insp = stateData.heroViolenceInspiration;
        const exp = stateData.heroViolenceExpiration;
        let bg, border, color, icon, text, title;
        if (insp > 0) {
            bg = 'rgba(6, 182, 212, 0.25)';
            border = '1px solid #06b6d4';
            color = '#67e8f9';
            icon = 'air';
            text = `Insp. ${insp}/5`;
            title = `Violence (Inspiration): +${insp * 2}% Critique`;
        } else if (exp > 0) {
            bg = 'rgba(219, 39, 119, 0.25)';
            border = '1px solid #db2777';
            color = '#f472b6';
            icon = 'local_fire_department';
            text = `Exp. ${exp}/10`;
            title = `Violence (Expiration): +${exp * 2} Puissance`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)';
            border = '1px dashed #6b7280';
            color = '#9ca3af';
            icon = 'explosion';
            text = 'Violence (0 stack)';
            title = 'Violence: Aucun cumul actif';
        }
        heroShieldsHtml += `
                    <div class="sandbox-status-badge violence" title="${title}" style="background: ${bg}; color: ${color}; border: ${border}; box-shadow: 0 0 8px ${bg};">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color}; vertical-align: middle;">${icon}</span>
                        <span>${text}</span>
                    </div>
                `;
    }

    if (stateData.heroHasKarma) {
        const gauge = stateData.heroKarmaGauge;
        const isLocked = stateData.heroKarmaLocked;
        const isHarmony = stateData.heroKarmaHarmony;
        let bg, border, color, icon, text, title;

        if (isLocked) {
            bg = 'rgba(239, 68, 68, 0.25)';
            border = '1px solid #ef4444';
            color = '#f87171';
            icon = 'block';
            text = 'Karma Brisé';
            title = 'La voie du Karma est définitivement verrouillée.';
        } else if (isHarmony) {
            bg = 'rgba(100, 116, 139, 0.25)';
            border = '1px solid #cbd5e1';
            color = '#cbd5e1';
            icon = 'brightness_medium';
            text = 'Harmonie';
            title = 'Équilibre parfait atteint. Les effets karmiques sont amplifiés !';
        } else if (gauge < 0) {
            bg = 'rgba(147, 51, 234, 0.25)';
            border = '1px solid #c084fc';
            color = '#c084fc';
            icon = 'dark_mode';
            text = `Ténèbres (${Math.abs(gauge)})`;
            title = `Le Karma penche vers les Ténèbres. Jauge: ${gauge}`;
        } else if (gauge > 0) {
            bg = 'rgba(234, 179, 8, 0.25)';
            border = '1px solid #fde047';
            color = '#fde047';
            icon = 'light_mode';
            text = `Lumière (${gauge})`;
            title = `Le Karma penche vers la Lumière. Jauge: +${gauge}`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)';
            border = '1px dashed #6b7280';
            color = '#9ca3af';
            icon = 'balance';
            text = 'Karma Neutre';
            title = 'Le Karma est neutre.';
        }

        heroShieldsHtml += `
                    <div class="sandbox-status-badge karma" title="${title}" style="background: ${bg}; color: ${color}; border: ${border}; box-shadow: 0 0 8px ${bg};">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color}; vertical-align: middle;">${icon}</span>
                        <span>${text}</span>
                    </div>
                `;
    }
    heroShieldsContainer.innerHTML = heroShieldsHtml;

    const monsterShieldsContainer = document.getElementById('monsterShieldsContainer');
    let monsterShieldsHtml = (stateData.monsterShields || []).map(s => `
                <div class="sandbox-status-badge shield" title="Source: ${s.sourceName}">
                    <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span>
                    <span>${s.amount} (${s.duration}t)</span>
                </div>
            `).join('');
    if (stateData.monsterHeat > 0) {
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge heat" title="Chaleur accumulée" style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #ef4444; vertical-align: middle;">whatshot</span>
                        <span>${stateData.monsterHeat}°C / 100</span>
                    </div>
                `;
    }
    if (stateData.monsterSurete > 0) {
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge surete" title="Points de sûreté" style="background: rgba(245, 158, 11, 0.25); color: #fde68a; border: 1px solid #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f59e0b; vertical-align: middle;">security</span>
                        <span>${stateData.monsterSurete}/100 Sûreté</span>
                    </div>
                `;
    }
    if (stateData.monsterCritDerived !== null && stateData.monsterCritDerived !== undefined) {
        const sign = stateData.monsterCritDerived >= 0 ? '+' : '';
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge raison" title="Critique dérivé (Raison)" style="background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #3b82f6; vertical-align: middle;">track_changes</span>
                        <span>${sign}${stateData.monsterCritDerived}% Critique</span>
                    </div>
                `;
    }
    if (stateData.monsterHasTrahison) {
        const baseStyle = stateData.monsterTrahisonBaseAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const baseText = stateData.monsterTrahisonBaseAvailable ? "Trahison: 1er coup (+10%)" : "1er coup (Consommé)";
        const baseIcon = stateData.monsterTrahisonBaseAvailable ? "flash_on" : "flash_off";
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge trahison-base" title="Bonus de base de Trahison (1er coup du tour)" style="${baseStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">${baseIcon}</span>
                        <span>${baseText}</span>
                    </div>
                `;

        const lowHpStyle = stateData.monsterTrahisonLowHpAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const lowHpText = stateData.monsterTrahisonLowHpAvailable ? "Trahison: Cible <50% PV (+15%)" : "Cible <50% PV (Consommé)";
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge trahison-lowhp" title="Bonus de Trahison contre cible à moins de 50% PV" style="${lowHpStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">heart_broken</span>
                        <span>${lowHpText}</span>
                    </div>
                `;

        const debuffStyle = stateData.monsterTrahisonDebuffAvailable
            ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
            : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
        const debuffText = stateData.monsterTrahisonDebuffAvailable ? "Trahison: Cible débuffée (+10%)" : "Cible débuffée (Consommé)";
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge trahison-debuff" title="Bonus de Trahison contre cible débuffée" style="${debuffStyle}">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; vertical-align: middle;">trending_down</span>
                        <span>${debuffText}</span>
                    </div>
                `;
    }
    if (stateData.monsterHasConsolidation) {
        const lvl = stateData.monsterConsolidationLevel;
        const consolidationLabels = {
            0: { icon: 'shield', text: '+5% Armure', title: 'Consolidation (défaut)' },
            1: { icon: 'speed', text: '+1 Vit', title: 'Consolidation Lvl 1' },
            2: { icon: 'shield', text: '+10% Armure', title: 'Consolidation Lvl 2' },
            3: { icon: 'auto_awesome', text: '+10% Résist.', title: 'Consolidation Lvl 3' },
            4: { icon: 'savings', text: '-20% Coût', title: 'Consolidation Lvl 4' },
            5: { icon: 'security', text: '+8% Arm/Rés', title: 'Consolidation Lvl 5' }
        };
        const info = consolidationLabels[lvl] || consolidationLabels[0];
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge consolidation" title="${info.title}" style="background: rgba(34, 197, 94, 0.25); color: #86efac; border: 1px solid #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #22c55e; vertical-align: middle;">${info.icon}</span>
                        <span>${info.text}</span>
                    </div>
                `;
    }
    if (stateData.monsterHasViolence) {
        const insp = stateData.monsterViolenceInspiration;
        const exp = stateData.monsterViolenceExpiration;
        let bg, border, color, icon, text, title;
        if (insp > 0) {
            bg = 'rgba(6, 182, 212, 0.25)';
            border = '1px solid #06b6d4';
            color = '#67e8f9';
            icon = 'air';
            text = `Insp. ${insp}/5`;
            title = `Violence (Inspiration): +${insp * 2}% Critique`;
        } else if (exp > 0) {
            bg = 'rgba(219, 39, 119, 0.25)';
            border = '1px solid #db2777';
            color = '#f472b6';
            icon = 'local_fire_department';
            text = `Exp. ${exp}/10`;
            title = `Violence (Expiration): +${exp * 2} Puissance`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)';
            border = '1px dashed #6b7280';
            color = '#9ca3af';
            icon = 'explosion';
            text = 'Violence (0 stack)';
            title = 'Violence: Aucun cumul actif';
        }
        monsterShieldsHtml += `
                    <div class="sandbox-status-badge violence" title="${title}" style="background: ${bg}; color: ${color}; border: ${border}; box-shadow: 0 0 8px ${bg};">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color}; vertical-align: middle;">${icon}</span>
                        <span>${text}</span>
                    </div>
                `;
    }

    if (stateData.monsterHasKarma) {
        const gauge = stateData.monsterKarmaGauge;
        const isLocked = stateData.monsterKarmaLocked;
        const isHarmony = stateData.monsterKarmaHarmony;
        let bg, border, color, icon, text, title;

        if (isLocked) {
            bg = 'rgba(239, 68, 68, 0.25)';
            border = '1px solid #ef4444';
            color = '#f87171';
            icon = 'block';
            text = 'Karma Brisé';
            title = 'La voie du Karma est définitivement verrouillée.';
        } else if (isHarmony) {
            bg = 'rgba(100, 116, 139, 0.25)';
            border = '1px solid #cbd5e1';
            color = '#cbd5e1';
            icon = 'brightness_medium';
            text = 'Harmonie';
            title = 'Équilibre parfait atteint. Les effets karmiques sont amplifiés !';
        } else if (gauge < 0) {
            bg = 'rgba(147, 51, 234, 0.25)';
            border = '1px solid #c084fc';
            color = '#c084fc';
            icon = 'dark_mode';
            text = `Ténèbres (${Math.abs(gauge)})`;
            title = `Le Karma penche vers les Ténèbres. Jauge: ${gauge}`;
        } else if (gauge > 0) {
            bg = 'rgba(234, 179, 8, 0.25)';
            border = '1px solid #fde047';
            color = '#fde047';
            icon = 'light_mode';
            text = `Lumière (${gauge})`;
            title = `Le Karma penche vers la Lumière. Jauge: +${gauge}`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)';
            border = '1px dashed #6b7280';
            color = '#9ca3af';
            icon = 'balance';
            text = 'Karma Neutre';
            title = 'Le Karma est neutre.';
        }

        monsterShieldsHtml += `
                    <div class="sandbox-status-badge karma" title="${title}" style="background: ${bg}; color: ${color}; border: ${border}; box-shadow: 0 0 8px ${bg};">
                        <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color}; vertical-align: middle;">${icon}</span>
                        <span>${text}</span>
                    </div>
                `;
    }
    monsterShieldsContainer.innerHTML = monsterShieldsHtml;

    const renderBuffsHtml = (buffList) => {
        return (buffList || []).map(b => {
            let isBad = b.modifier < 0 || b.flatValue < 0;
            if ((b.statAffected.startsWith('DAMAGE_TAKEN_') || b.statAffected === 'SHIELD_PIERCED') && (b.modifier > 0 || b.flatValue > 0)) {
                isBad = true;
            }
            const badgeClass = isBad ? 'debuff' : 'buff';
            const icon = isBad ? 'trending_down' : 'trending_up';

            let text = '';
            if (b.flatValue) {
                text += `${b.flatValue > 0 ? '+' : ''}${b.flatValue} ${formatStat(b.statAffected)}`;
            }
            if (b.modifier) {
                if (text) text += ' / ';
                text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}% ${formatStat(b.statAffected)}`;
            }
            if (!text) text = `Modif. de ${formatStat(b.statAffected)}`;

            return `
                        <div class="sandbox-status-badge ${badgeClass}" title="Source: ${b.sourceName}">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">${icon}</span>
                            <span>${text} (${b.duration}t)</span>
                        </div>
                    `;
        }).join('');
    };

    document.getElementById('heroBuffsContainer').innerHTML = renderBuffsHtml(stateData.heroBuffs);
    document.getElementById('monsterBuffsContainer').innerHTML = renderBuffsHtml(stateData.monsterBuffs);

    const logsContainer = document.getElementById('simulationLogsContainer');
    logsContainer.innerText = stateData.rawLogs || "Aucun événement loggé.";
    logsContainer.scrollTop = logsContainer.scrollHeight;

    syncHeroConfigForm(stateData);
    renderHeroConfigBadges(stateData);
    updateLiveHeroStats(stateData);
}

export function updateLiveHeroStats(stateData) {
    const setStat = (id, val, suffix = '') => {
        const el = document.getElementById(id);
        if (el) el.innerText = val + suffix;
    };
    setStat('liveStatPower', stateData.heroPower || 0);
    setStat('liveStatArmor', stateData.heroArmor || 0);
    setStat('liveStatRes', stateData.heroResistance || 0);
    setStat('liveStatSpeed', stateData.heroSpeed || 0);

    const crit = (stateData.heroCritDerived !== null && stateData.heroCritDerived !== undefined)
        ? stateData.heroCritDerived
        : (stateData.heroCrit || 0);
    setStat('liveStatCrit', crit, '%');
}

export function closeSimulationModal() {
    document.getElementById('simulationModalOverlay').classList.remove('active');
}

window.trySpell = trySpell;
window.toggleHeroConfig = toggleHeroConfig;
window.configureSandboxHero = configureSandboxHero;
window.addSelectedSpellToSandbox = addSelectedSpellToSandbox;
window.removeSpellFromSandbox = removeSpellFromSandbox;
window.castSandboxSpell = castSandboxSpell;
window.passSandboxTurn = passSandboxTurn;
window.resetSandbox = resetSandbox;
window.closeSimulationModal = closeSimulationModal;
