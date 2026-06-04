import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode } from './constants.js';
import * as ui from './ui.js';
import * as api from './api.js';

import { renderFilteredSpells, getSpellEffectsSummaryHtml, getSpellCardHtml, cancelEditSpell, updateEditingPreview, getLvl5Origin, editSpell } from './grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor, resetFilters, renderOriginButtons, toggleFilterVoie, toggleFilterSpirit } from './filters.js';

export function toggleChannelingFields() {
    const castingTypeSel = document.getElementById('castingTypeSelect');
    const container = document.getElementById('channelingConfig');
    if (!castingTypeSel || !container) return;

    if (castingTypeSel.value === 'CANALISE') {
        container.style.display = 'grid';
    } else {
        container.style.display = 'none';
    }
    renderEffects();
}

export function updateRankTitle() {
    const display = document.getElementById('rankTitleDisplay');
    if (!display) return;

    const lvl = parseInt(document.getElementById('niveau').value) || 1;
    const spiritId = document.getElementById('spiritSelect').value;
    const voieId = document.getElementById('voieSelect').value;

    let rankName = '';
    let sourceNom = '';

    if (voieId && state.metaData.voies) {
        const v = state.metaData.voies.find(vo => vo.id == voieId);
        if (v && v.rankNames && v.rankNames[lvl]) {
            rankName = v.rankNames[lvl];
            sourceNom = v.nom;
        }
    }
    if (!rankName && spiritId && state.metaData.spiritualites) {
        const sp = state.metaData.spiritualites.find(s => s.id == spiritId);
        if (sp && sp.rankNames && sp.rankNames[lvl]) {
            rankName = sp.rankNames[lvl];
            sourceNom = sp.nom;
        }
    }

    if (rankName) {
        display.style.display = 'block';
        display.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.1rem; vertical-align: middle; color: #10b981; margin-right: 0.2rem;">workspace_premium</span>Titre : <span style="color:#fff;">"${rankName}"</span> <span style="font-size:0.75rem; color:var(--text-muted);">(${sourceNom})</span>`;
    } else {
        display.style.display = 'none';
        display.innerHTML = '';
    }
}

export function updateSpecialVoieConfig() {
    const voieId = document.getElementById('voieSelect').value;
    let isDestruction = false;
    let isViolence = false;
    if (voieId && state.metaData.voies) {
        const v = state.metaData.voies.find(vo => vo.id == voieId);
        if (v && v.nom) {
            const lNom = v.nom.toLowerCase();
            if (lNom.includes('destruction')) {
                isDestruction = true;
            }
            if (lNom.includes('violence')) {
                isViolence = true;
            }
        }
    }

    const heatButtons = document.getElementById('heatEffectButtons');
    if (heatButtons) {
        heatButtons.style.display = isDestruction ? 'grid' : 'none';
    }

    const heatCostCard = document.getElementById('heatCostCard');
    if (heatCostCard) {
        heatCostCard.style.display = isDestruction ? 'block' : 'none';
        if (!isDestruction) {
            document.getElementById('heatCost').value = 0;
            document.getElementById('percentHeatCost').value = 0;
        }
    }

    const heatTypes = ['HEAT_FIXED', 'HEAT_PERCENTAGE', 'HEAT_OVER_TIME'];
    if (!isDestruction) {
        const hasHeat = state.currentEffects.some(e => heatTypes.includes(e.effectType));
        if (hasHeat) {
            state.currentEffects = state.currentEffects.filter(e => !heatTypes.includes(e.effectType));
            renderEffects();
        }
    }

    const violenceConfig = document.getElementById('violenceConfig');
    if (violenceConfig) {
        violenceConfig.style.display = isViolence ? 'block' : 'none';
        updateViolenceLabel();
    }
}

export function updateSpecialSpiritConfig() {
    const spiritId = document.getElementById('spiritSelect').value;
    let isKarma = false;
    if (spiritId && state.metaData.spiritualites) {
        const s = state.metaData.spiritualites.find(sp => sp.id == spiritId);
        if (s && s.nom) {
            if (s.nom.toLowerCase().includes('karma')) {
                isKarma = true;
            }
        }
    }

    const karmaConfig = document.getElementById('karmaConfig');
    if (karmaConfig) {
        karmaConfig.style.display = isKarma ? 'block' : 'none';
        updateKarmaLabel();
    }
}

export function setViolenceType(isInspiration) {
    const input = document.getElementById('isInspiration');
    if (input) {
        input.checked = isInspiration;
        updateViolenceLabel();
    }
}

export function updateViolenceLabel() {
    const input = document.getElementById('isInspiration');
    const isInsp = input ? input.checked : true;

    const btnInsp = document.getElementById('btnInspiration');
    const btnExp = document.getElementById('btnExpiration');

    if (!btnInsp || !btnExp) return;

    if (isInsp) {
        // Inspiration Active (Cyan Theme)
        btnInsp.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.3) 100%)';
        btnInsp.style.border = '1px solid rgba(6, 182, 212, 0.4)';
        btnInsp.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.2)';
        btnInsp.style.color = '#67e8f9';
        btnInsp.style.opacity = '1';
        btnInsp.querySelector('.material-symbols-outlined').style.transform = 'scale(1.15)';

        // Expiration Inactive
        btnExp.style.background = 'transparent';
        btnExp.style.border = '1px solid transparent';
        btnExp.style.boxShadow = 'none';
        btnExp.style.color = 'var(--text-muted)';
        btnExp.style.opacity = '0.6';
        btnExp.querySelector('.material-symbols-outlined').style.transform = 'scale(1)';
    } else {
        // Expiration Active (Pink/Rose Theme)
        btnExp.style.background = 'linear-gradient(135deg, rgba(219, 39, 119, 0.15) 0%, rgba(190, 24, 74, 0.3) 100%)';
        btnExp.style.border = '1px solid rgba(219, 39, 119, 0.4)';
        btnExp.style.boxShadow = '0 0 12px rgba(219, 39, 119, 0.2)';
        btnExp.style.color = '#f472b6';
        btnExp.style.opacity = '1';
        btnExp.querySelector('.material-symbols-outlined').style.transform = 'scale(1.15) rotate(10deg)';

        // Inspiration Inactive
        btnInsp.style.background = 'transparent';
        btnInsp.style.border = '1px solid transparent';
        btnInsp.style.boxShadow = 'none';
        btnInsp.style.color = 'var(--text-muted)';
        btnInsp.style.opacity = '0.6';
        btnInsp.querySelector('.material-symbols-outlined').style.transform = 'scale(1)';
    }
}

export function setKarmaAlignment(alignment) {
    const input = document.getElementById('karmaAlignment');
    if (input) {
        if (input.value === alignment) {
            input.value = 'NONE'; // Toggle off
        } else {
            input.value = alignment;
        }
        updateKarmaLabel();
    }
}

export function updateKarmaLabel() {
    const input = document.getElementById('karmaAlignment');
    const alignment = input ? input.value : 'NONE';

    const btnOff = document.getElementById('btnKarmaOffensive');
    const btnRes = document.getElementById('btnKarmaRestorative');
    const btnPro = document.getElementById('btnKarmaProtective');

    if (!btnOff || !btnRes || !btnPro) return;

    // Reset all
    [btnOff, btnRes, btnPro].forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.border = '1px solid transparent';
        btn.style.boxShadow = 'none';
        btn.style.color = 'var(--text-muted)';
        btn.style.opacity = '0.6';
        btn.querySelector('.material-symbols-outlined').style.transform = 'scale(1)';
    });

    if (alignment === 'OFFENSIVE') {
        btnOff.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(126, 34, 206, 0.3) 100%)';
        btnOff.style.border = '1px solid rgba(147, 51, 234, 0.4)';
        btnOff.style.boxShadow = '0 0 12px rgba(147, 51, 234, 0.2)';
        btnOff.style.color = '#c084fc';
        btnOff.style.opacity = '1';
        btnOff.querySelector('.material-symbols-outlined').style.transform = 'scale(1.15)';
    } else if (alignment === 'RESTORATIVE') {
        btnRes.style.background = 'linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(71, 85, 105, 0.3) 100%)';
        btnRes.style.border = '1px solid rgba(100, 116, 139, 0.4)';
        btnRes.style.boxShadow = '0 0 12px rgba(100, 116, 139, 0.2)';
        btnRes.style.color = '#cbd5e1';
        btnRes.style.opacity = '1';
        btnRes.querySelector('.material-symbols-outlined').style.transform = 'scale(1.15)';
    } else if (alignment === 'PROTECTIVE') {
        btnPro.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.3) 100%)';
        btnPro.style.border = '1px solid rgba(234, 179, 8, 0.4)';
        btnPro.style.boxShadow = '0 0 12px rgba(234, 179, 8, 0.2)';
        btnPro.style.color = '#fde047';
        btnPro.style.opacity = '1';
        btnPro.querySelector('.material-symbols-outlined').style.transform = 'scale(1.15)';
    }
}

export function addEffectPanel(type) {
    const effectObj = {
        id: Date.now() + Math.random(),
        effectType: type,
        effectTarget: type.startsWith('HEAT') ? 'CASTER' : 'TARGET',
        damage: 20,
        healAmount: 20,
        manaAmount: 20,
        percentage: 0.10,
        flatValue: 5,
        modifier: 0.20,
        duration: 2,
        damageType: 'MAGIC',
        statAffected: 'ARMURE',
        source: type === 'BUFF_DEBUFF' ? null : 'TARGET_HEALTH_MAX',
        requiredChoiceKey: null,
        channelingTurns: [1]
    };

    state.currentEffects.push(effectObj);
    renderEffects();
}

export function removeEffect(id) {
    state.currentEffects = state.currentEffects.filter(e => e.id != id);
    renderEffects();
}

export function setEffectTarget(id, target) {
    const effect = state.currentEffects.find(e => e.id == id);
    if (effect) {
        effect.effectTarget = target;
        renderEffects();
    }
}

export function updateEffectProp(id, prop, value) {
    const effect = state.currentEffects.find(e => e.id == id);
    if (effect) {
        if (['damage', 'healAmount', 'manaAmount', 'flatValue', 'duration'].includes(prop)) {
            effect[prop] = parseInt(value) || 0;
        } else if (prop === 'percentage' || prop === 'modifier') {
            effect[prop] = parseFloat(value) || 0;
        } else {
            effect[prop] = value;
        }
    }
}

export function toggleEffectChannelingTurn(effectId, turnNum) {
    const effect = state.currentEffects.find(e => e.id == effectId);
    if (effect) {
        if (!effect.channelingTurns) {
            effect.channelingTurns = [];
        }
        const index = effect.channelingTurns.indexOf(turnNum);
        if (index > -1) {
            effect.channelingTurns.splice(index, 1);
        } else {
            effect.channelingTurns.push(turnNum);
        }
        effect.channelingTurns.sort((a, b) => a - b);
        renderEffects();
    }
}

export function renderEffects() {
    const container = document.getElementById('effectsList');
    if (!container) return;
    container.innerHTML = '';

    if (state.currentEffects.length === 0) {
        container.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">Aucun effet configuré. Le sort n'aura que ses coûts.</div>`;
        return;
    }

    const castingTypeSelect = document.getElementById('castingTypeSelect');
    const isCanalise = castingTypeSelect && castingTypeSelect.value === 'CANALISE';
    const durationInput = document.getElementById('channelingDuration');
    const duration = durationInput ? (parseInt(durationInput.value) || 1) : 1;

    state.currentEffects.forEach((eff, idx) => {
        const labelObj = state.metaData.effectTypes.find(t => t.type === eff.effectType);
        const heatLabels = {
            'HEAT_FIXED': 'Chaleur Fixe',
            'HEAT_PERCENTAGE': 'Chaleur %',
            'HEAT_OVER_TIME': 'Chaleur Tick'
        };
        const typeLabel = labelObj ? labelObj.label : (heatLabels[eff.effectType] || eff.effectType);

        const isHeatEffect = eff.effectType.startsWith('HEAT');
        if (isHeatEffect) {
            eff.effectTarget = 'CASTER';
        }
        let targetClass = eff.effectTarget ? eff.effectTarget.toLowerCase() : 'target';

        let fieldsHtml = '';

        // Champs spécifiques en fonction du type
        if (eff.effectType === 'FIXED_DAMAGE') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Dégâts</label>
                                <input type="number" value="${eff.damage}" onchange="updateEffectProp('${eff.id}', 'damage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Type de Dégâts</label>
                                <select class="custom-select-dynamic" id="damageType-${eff.id}" onchange="updateEffectProp('${eff.id}', 'damageType', this.value)">
                                    ${renderOptions(state.metaData.damageTypes, eff.damageType)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'PERCENTAGE_DAMAGE') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Ratio (ex: 0.10 pour 10%)</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select class="custom-select-dynamic" id="damageType-${eff.id}" onchange="updateEffectProp('${eff.id}', 'damageType', this.value)">
                                    ${renderOptions(state.metaData.damageTypes, eff.damageType)}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Source du Ratio</label>
                            <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                ${renderSourceOptions(state.metaData.sources, eff.source)}
                            </select>
                        </div>
                    `;
        } else if (eff.effectType === 'FIXED_HEAL') {
            fieldsHtml = `
                        <div class="form-group">
                            <label>Montant du Soin</label>
                            <input type="number" value="${eff.healAmount}" onchange="updateEffectProp('${eff.id}', 'healAmount', this.value)">
                        </div>
                    `;
        } else if (eff.effectType === 'PERCENTAGE_HEAL') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Ratio (ex: 0.20 pour 20%)</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'BUFF_DEBUFF') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Stat Affectée</label>
                                <select class="custom-select-dynamic" id="statAffected-${eff.id}" onchange="updateEffectProp('${eff.id}', 'statAffected', this.value)">
                                    ${renderStatOptions(state.metaData.statTypes, eff.statAffected)}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Valeur Fixe (+/-)</label>
                                <input type="number" value="${eff.flatValue}" onchange="updateEffectProp('${eff.id}', 'flatValue', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Multiplicateur (Ratio)</label>
                                <input type="number" step="0.05" value="${eff.modifier}" onchange="updateEffectProp('${eff.id}', 'modifier', this.value)">
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'DOT') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Dégâts Fixes / Tour</label>
                                <input type="number" value="${eff.damage}" onchange="updateEffectProp('${eff.id}', 'damage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Ratio / Tour</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Type de Dégâts</label>
                                <select class="custom-select-dynamic" id="damageType-${eff.id}" onchange="updateEffectProp('${eff.id}', 'damageType', this.value)">
                                    ${renderOptions(state.metaData.damageTypes, eff.damageType)}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Source du Ratio</label>
                            <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                ${renderSourceOptions(state.metaData.sources, eff.source)}
                            </select>
                        </div>
                    `;
        } else if (eff.effectType === 'HOT') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Soins Fixes / Tour</label>
                                <input type="number" value="${eff.healAmount}" onchange="updateEffectProp('${eff.id}', 'healAmount', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Ratio / Tour</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'FIXED_MANA') {
            fieldsHtml = `
                        <div class="form-group">
                            <label>Montant de Mana</label>
                            <input type="number" value="${eff.manaAmount || 0}" onchange="updateEffectProp('${eff.id}', 'manaAmount', this.value)">
                        </div>
                    `;
        } else if (eff.effectType === 'PERCENTAGE_MANA') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Ratio (ex: 0.15 pour 15%)</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'MOT') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Mana Fixe / Tour</label>
                                <input type="number" value="${eff.manaAmount || 0}" onchange="updateEffectProp('${eff.id}', 'manaAmount', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Ratio / Tour</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'SHIELD') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Valeur Fixe Bouclier</label>
                                <input type="number" value="${eff.flatValue || 0}" onchange="updateEffectProp('${eff.id}', 'flatValue', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Ratio (ex: 0.10 pour 10%)</label>
                                <input type="number" step="0.01" value="${eff.percentage || 0}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration || 0}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'PURGE') {
            fieldsHtml = `
                        <div style="padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 4px; font-size: 0.85rem; color: #10b981;">
                            ✨ Dissipe instantanément tous les bonus, malus et altérations d'état (DoT/HoT) actifs sur la cible.
                        </div>
                    `;
        } else if (eff.effectType === 'HEAT_FIXED') {
            fieldsHtml = `
                        <div class="form-group">
                            <label>Montant de Chaleur Générée (Fixe)</label>
                            <input type="number" min="0" value="${eff.flatValue || 0}" onchange="updateEffectProp('${eff.id}', 'flatValue', this.value)">
                        </div>
                    `;
        } else if (eff.effectType === 'HEAT_PERCENTAGE') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Ratio (ex: 0.10 pour 10%)</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        } else if (eff.effectType === 'HEAT_OVER_TIME') {
            fieldsHtml = `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Chaleur Fixe / Tour</label>
                                <input type="number" value="${eff.flatValue}" onchange="updateEffectProp('${eff.id}', 'flatValue', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Ratio / Tour</label>
                                <input type="number" step="0.01" value="${eff.percentage}" onchange="updateEffectProp('${eff.id}', 'percentage', this.value)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (Tours)</label>
                                <input type="number" value="${eff.duration}" onchange="updateEffectProp('${eff.id}', 'duration', this.value)">
                            </div>
                            <div class="form-group">
                                <label>Source du Ratio</label>
                                <select class="custom-select-dynamic" id="ratioSource-${eff.id}" onchange="updateEffectProp('${eff.id}', 'source', this.value)">
                                    ${renderSourceOptions(state.metaData.sources, eff.source)}
                                </select>
                            </div>
                        </div>
                    `;
        }

        let typeBadgeStyle = 'background: rgba(255,255,255,0.05); color: #fff; border-color: var(--glass-border);';
        if (['FIXED_DAMAGE', 'PERCENTAGE_DAMAGE'].includes(eff.effectType)) {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.4)); color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (['FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT'].includes(eff.effectType)) {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(4, 120, 87, 0.4)); color: #6ee7b7; border: 1px solid #10b981; box-shadow: 0 0 12px rgba(16, 185, 129, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (['FIXED_MANA', 'PERCENTAGE_MANA', 'MOT'].includes(eff.effectType)) {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(2, 132, 199, 0.4)); color: #7dd3fc; border: 1px solid #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (eff.effectType === 'BUFF_DEBUFF') {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(180, 83, 9, 0.4)); color: #fde68a; border: 1px solid #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (eff.effectType === 'DOT') {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(194, 65, 12, 0.4)); color: #fdba74; border: 1px solid #f97316; box-shadow: 0 0 12px rgba(249, 115, 22, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (eff.effectType === 'PURGE') {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(52, 211, 153, 0.5)); color: #a7f3d0; border: 1px solid #34d399; box-shadow: 0 0 12px rgba(52, 211, 153, 0.4); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (eff.effectType === 'SHIELD') {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(8, 145, 178, 0.4)); color: #a5f3fc; border: 1px solid #06b6d4; box-shadow: 0 0 12px rgba(6, 182, 212, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        } else if (['HEAT_FIXED', 'HEAT_PERCENTAGE', 'HEAT_OVER_TIME'].includes(eff.effectType)) {
            typeBadgeStyle = 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.4)); color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); text-shadow: 0 0 5px rgba(0,0,0,0.8);';
        }

        const deleteOrLinkedButton = `<button type="button" class="btn-danger" onclick="removeEffect('${eff.id}')">✕ Supprimer</button>`;

        const targetSelectorHtml = isHeatEffect ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(239, 68, 68, 0.08); padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25); margin-bottom: 0.5rem;">
                            <span class="material-symbols-outlined" style="color: #fca5a5; font-size: 1.25rem;">person</span>
                            <span style="font-size: 0.85rem; color: #fca5a5; font-weight: 600;">Cible : Lanceur (Chaleur générée)</span>
                        </div>
                ` : `
                        <!-- Sélection de la cible de l'Effet -->
                        <div style="display: flex; flex-direction: column; gap: 0.8rem; background: rgba(0,0,0,0.25); padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                            <label style="color: #fff; font-weight: 600; font-size: 0.9rem;">Cible de l'Effet :</label>
                            <div class="target-selector" style="flex-wrap: wrap; gap: 0.5rem;">
                                <button type="button" class="target-btn ${eff.effectTarget === 'CASTER' ? 'active-caster' : ''}" onclick="setEffectTarget('${eff.id}', 'CASTER')" title="Affecte uniquement le lanceur du sort">
                                    ✦ Lanceur
                                </button>
                                <button type="button" class="target-btn ${eff.effectTarget === 'ALLY' ? 'active-ally' : ''}" onclick="setEffectTarget('${eff.id}', 'ALLY')" title="Affecte un allié ciblé">
                                    🛡️ Allié (Ciblé)
                                </button>
                                <button type="button" class="target-btn ${eff.effectTarget === 'TARGET' ? 'active-target' : ''}" onclick="setEffectTarget('${eff.id}', 'TARGET')" title="Affecte la cible ennemie principale">
                                    🎯 Ennemi (Cible)
                                </button>
                                <button type="button" class="target-btn ${eff.effectTarget === 'ALL_ALLIES' ? 'active-caster' : ''}" onclick="setEffectTarget('${eff.id}', 'ALL_ALLIES')" title="Affecte le lanceur et tous ses alliés">
                                    ✦+🛡️ Lanceur &amp; Alliés
                                </button>
                                <button type="button" class="target-btn ${eff.effectTarget === 'ALL_ENEMIES' ? 'active-target' : ''}" onclick="setEffectTarget('${eff.id}', 'ALL_ENEMIES')" title="Affecte tous les ennemis (zone)">
                                    💥 Tous les Ennemis
                                </button>
                                <button type="button" class="target-btn" onclick="setEffectTarget('${eff.id}', 'ALL_COMBATANTS')" style="${eff.effectTarget === 'ALL_COMBATANTS' ? 'background: rgba(245,158,11,0.25); color: #fbbf24; border-color: #f59e0b;' : ''}" title="Affecte tout le monde (alliés et ennemis)">
                                    🌐 Tout le Monde
                                </button>
                            </div>
                        </div>
                `;

        const itemHtml = `
                    <div class="effect-item target-${targetClass}">
                        <div class="effect-header">
                            <span class="effect-type-badge" style="${typeBadgeStyle}">${typeLabel}</span>
                            ${deleteOrLinkedButton}
                        </div>

                        ${targetSelectorHtml}

                            <!-- Option / Clé d'activation de la ligne d'effet -->
                            <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05);">
                                <label style="font-size: 0.8rem; color: #f59e0b; font-weight:600;">🔑 S'active uniquement si l'Option de sort choisie est :</label>
                                <input type="number" value="${eff.requiredChoiceKey !== undefined && eff.requiredChoiceKey !== null ? eff.requiredChoiceKey : ''}" placeholder="Toutes (Par défaut)" style="width: 140px; font-size: 0.85rem; padding: 0.2rem 0.4rem; background: var(--glass-bg); color: #fff; border: 1px solid var(--glass-border); border-radius: 4px;" onchange="updateEffectProp('${eff.id}', 'requiredChoiceKey', this.value ? parseInt(this.value) : null)">
                                <span style="font-size: 0.75rem; color: var(--text-muted);">Ex: 1 pour la ligne Soin, 2 pour la ligne Mana. Laissez vide pour s'activer toujours.</span>
                            </div>

                            <!-- Tour(s) d'activation de l'effet dans la canalisation (uniquement si le sort est canalisé) -->
                            ${isCanalise ? `
                            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05);">
                                <label style="font-size: 0.8rem; color: #a78bfa; font-weight: 600;">🌀 Activation par Tour de Canalisation :</label>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
                                    ${Array.from({ length: duration }, (_, i) => i + 1).map(turn => {
            const isActive = (eff.channelingTurns || []).includes(turn);
            const btnBg = isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)';
            const btnColor = isActive ? '#fff' : 'var(--text-muted)';
            const btnBorder = isActive ? '1px solid #fff' : '1px solid var(--glass-border)';
            const btnShadow = isActive ? '0 0 8px var(--primary-glow)' : 'none';
            return `
                                            <button type="button" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-radius: 4px; background: ${btnBg}; color: ${btnColor}; border: ${btnBorder}; box-shadow: ${btnShadow}; cursor: pointer; transition: all 0.2s;" onclick="toggleEffectChannelingTurn('${eff.id}', ${turn})">
                                                Tour ${turn}
                                            </button>
                                        `;
        }).join('')}
                                    <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">Sélectionnez les tours où cet effet se déclenche.</span>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <hr style="border-color: var(--glass-border); margin: 0;">

                        ${fieldsHtml}
                    </div>
                `;

        container.innerHTML += itemHtml;
    });

    // Styliser les sélecteurs dynamiques customisés
    container.querySelectorAll('.custom-select-dynamic').forEach(sel => {
        makeCustomSelect(sel);
    });
}

