import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode } from './constants.js';
import * as ui from './ui.js';
import * as api from './api.js';

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
            const data = await res.json();
            updateSandboxUI(data);
        }
    } catch (err) {
        console.error(err);
        document.getElementById('simulationLogsContainer').innerText = "❌ Erreur de communication avec le banc d'essai.";
    }
}

export function toggleHeroConfig() {
    const panel = document.getElementById('heroConfigPanel');
    panel.classList.toggle('expanded');
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

    makeCustomSelect('heroConfigVoie');
    makeCustomSelect('heroConfigSpiritualite');
}

export function syncHeroConfigForm(hero) {
    const voieSelect = document.getElementById('heroConfigVoie');
    const spiritSelect = document.getElementById('heroConfigSpiritualite');
    if (voieSelect) {
        if (hero.voieId != null) voieSelect.value = hero.voieId;
        else voieSelect.value = '';
        voieSelect.dispatchEvent(new Event('change'));
    }
    if (spiritSelect) {
        if (hero.spiritualiteId != null) spiritSelect.value = hero.spiritualiteId;
        else spiritSelect.value = '';
        spiritSelect.dispatchEvent(new Event('change'));
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('heroConfigVoieLevel', hero.voieLevel || 1);
    setVal('heroConfigSpiritLevel', hero.spiritualiteLevel || 1);
    setVal('heroConfigHp', hero.hpMax || 100);
    setVal('heroConfigMana', hero.manaMax || 100);
    setVal('heroConfigPower', hero.basePower !== undefined ? hero.basePower : (hero.power || 0));
    setVal('heroConfigArmor', hero.baseArmor !== undefined ? hero.baseArmor : (hero.armor || 0));
    setVal('heroConfigResistance', hero.baseResistance !== undefined ? hero.baseResistance : (hero.resistance || 0));
    setVal('heroConfigSpeed', hero.baseSpeed !== undefined ? hero.baseSpeed : (hero.speed || 0));
    setVal('heroConfigCrit', hero.baseCrit !== undefined ? hero.baseCrit : (hero.crit || 0));
}

export function renderHeroConfigBadges(hero) {
    const container = document.getElementById('heroConfigBadges');
    if (!container) return;

    let html = '';
    if (hero.voieName) {
        html += `<span class="hero-config-badge voie">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">route</span>
                    ${hero.voieName} Lvl ${hero.voieLevel}
                </span>`;
    }
    if (hero.spiritualiteName) {
        html += `<span class="hero-config-badge spirit">
                    <span class="material-symbols-outlined" style="font-size: 0.8rem;">self_improvement</span>
                    ${hero.spiritualiteName} Lvl ${hero.spiritualiteLevel}
                </span>`;
    }
    if (!hero.voieName && !hero.spiritualiteName) {
        html += `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">Aucune voie ni spiritualité configurée</span>`;
    }

    const pui = hero.basePower !== undefined ? hero.basePower : (hero.power || 0);
    const arm = hero.baseArmor !== undefined ? hero.baseArmor : (hero.armor || 0);
    const res = hero.baseResistance !== undefined ? hero.baseResistance : (hero.resistance || 0);
    const vit = hero.baseSpeed !== undefined ? hero.baseSpeed : (hero.speed || 0);
    const crit = hero.baseCrit !== undefined ? hero.baseCrit : (hero.crit || 0);

    html += `<div class="hero-stats-row">`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${pui} Pui</span>`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${arm} Arm</span>`;
    html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${res} Rés</span>`;
    if (vit > 0) html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${vit} Vit</span>`;
    if (crit > 0) html += `<span class="hero-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${crit}% Crit</span>`;
    html += `</div>`;

    container.innerHTML = html;
}

// ===== Spell Rendering (unchanged logic) =====

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

        // Determine if spell needs target selection
        const needsEnemyTarget = effectsList.some(e => (e.effectTarget || e.effect_target) === 'TARGET');
        const needsAllyTarget = effectsList.some(e => (e.effectTarget || e.effect_target) === 'ALLY');

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
                                <button type="button" class="btn" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;" onclick="castSandboxSpell(${sp.id})">Lancer ✦</button>
                                <button type="button" class="btn" style="background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.75rem; padding: 0.2rem 0.4rem; border-radius: 4px;" onclick="removeSpellFromSandbox(${sp.id})">Retirer</button>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <span style="display:flex; align-items:center; gap:0.2rem;">${costDetails}</span>
                                ${effectsSummary ? `
                                <div class="spell-effects-trigger" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()">
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

// ===== Combatant Card Rendering =====

function renderPassiveBadges(c) {
    let html = '';

    // Shields
    html += (c.shields || []).map(s => `
        <div class="sandbox-status-badge shield" title="Source: ${s.sourceName}">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">shield</span>
            <span>${s.amount} (${s.duration}t)</span>
        </div>
    `).join('');

    // Heat
    if (c.heat > 0) {
        html += `<div class="sandbox-status-badge heat" title="Chaleur accumulée" style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #ef4444;">whatshot</span>
            <span>${c.heat}°C / 100</span>
        </div>`;
    }

    // Sûreté
    if (c.surete > 0) {
        html += `<div class="sandbox-status-badge surete" title="Points de sûreté" style="background: rgba(245, 158, 11, 0.25); color: #fde68a; border: 1px solid #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #f59e0b;">security</span>
            <span>${c.surete}/100 Sûreté</span>
        </div>`;
    }

    // Crit dérivé
    if (c.critDerived !== null && c.critDerived !== undefined) {
        const sign = c.critDerived >= 0 ? '+' : '';
        html += `<div class="sandbox-status-badge raison" title="Critique dérivé (Raison)" style="background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #3b82f6;">track_changes</span>
            <span>${sign}${c.critDerived}% Critique</span>
        </div>`;
    }

    // Trahison
    if (c.hasTrahison) {
        const mkBadge = (avail, title, icon, text) => {
            const style = avail
                ? "background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);"
                : "background: rgba(75, 85, 99, 0.15); color: #9ca3af; border: 1px dashed #4b5563; opacity: 0.6;";
            return `<div class="sandbox-status-badge" title="${title}" style="${style}">
                <span class="material-symbols-outlined" style="font-size: 0.95rem;">${icon}</span>
                <span>${avail ? text : ''}</span>
            </div>`;
        };
        html += mkBadge(c.trahisonBaseAvailable, 'Bonus de base de Trahison', c.trahisonBaseAvailable ? 'flash_on' : 'flash_off', '+10%');
        html += mkBadge(c.trahisonLowHpAvailable, 'Trahison: Cible <50% PV', 'heart_broken', '+15%');
        html += mkBadge(c.trahisonDebuffAvailable, 'Trahison: Cible débuffée', 'trending_down', '+10%');
    }

    // Consolidation
    if (c.hasConsolidation) {
        const labels = {
            0: { icon: 'shield', text: '+5% Armure' }, 1: { icon: 'speed', text: '+1 Vit' },
            2: { icon: 'shield', text: '+10% Armure' }, 3: { icon: 'auto_awesome', text: '+10% Résist.' },
            4: { icon: 'savings', text: '-20% Coût' }, 5: { icon: 'security', text: '+8% Arm/Rés' }
        };
        const info = labels[c.consolidationLevel] || labels[0];
        html += `<div class="sandbox-status-badge consolidation" title="Consolidation" style="background: rgba(34, 197, 94, 0.25); color: #86efac; border: 1px solid #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: #22c55e;">${info.icon}</span>
            <span>${info.text}</span>
        </div>`;
    }

    // Violence
    if (c.hasViolence) {
        let bg, border, color, icon, text, title;
        if (c.violenceInspiration > 0) {
            bg = 'rgba(6, 182, 212, 0.25)'; border = '1px solid #06b6d4'; color = '#67e8f9'; icon = 'air';
            text = `Insp. ${c.violenceInspiration}/5`; title = `Violence (Inspiration): +${c.violenceInspiration * 2}% Critique`;
        } else if (c.violenceExpiration > 0) {
            bg = 'rgba(219, 39, 119, 0.25)'; border = '1px solid #db2777'; color = '#f472b6'; icon = 'local_fire_department';
            text = `Exp. ${c.violenceExpiration}/10`; title = `Violence (Expiration): +${c.violenceExpiration * 2} Puissance`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)'; border = '1px dashed #6b7280'; color = '#9ca3af'; icon = 'explosion';
            text = 'Violence (0)'; title = 'Violence: Aucun cumul actif';
        }
        html += `<div class="sandbox-status-badge violence" title="${title}" style="background: ${bg}; color: ${color}; border: ${border};">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color};">${icon}</span>
            <span>${text}</span>
        </div>`;
    }

    // Karma
    if (c.hasKarma) {
        let bg, border, color, icon, text, title;
        if (c.karmaLocked) {
            bg = 'rgba(239, 68, 68, 0.25)'; border = '1px solid #ef4444'; color = '#f87171'; icon = 'block';
            text = 'Karma Brisé'; title = 'La voie du Karma est verrouillée.';
        } else if (c.karmaHarmony) {
            bg = 'rgba(100, 116, 139, 0.25)'; border = '1px solid #cbd5e1'; color = '#cbd5e1'; icon = 'brightness_medium';
            text = 'Harmonie'; title = 'Équilibre parfait !';
        } else if (c.karmaGauge < 0) {
            bg = 'rgba(147, 51, 234, 0.25)'; border = '1px solid #c084fc'; color = '#c084fc'; icon = 'dark_mode';
            text = `Ténèbres (${Math.abs(c.karmaGauge)})`; title = `Karma: ${c.karmaGauge}`;
        } else if (c.karmaGauge > 0) {
            bg = 'rgba(234, 179, 8, 0.25)'; border = '1px solid #fde047'; color = '#fde047'; icon = 'light_mode';
            text = `Lumière (${c.karmaGauge})`; title = `Karma: +${c.karmaGauge}`;
        } else {
            bg = 'rgba(107, 114, 128, 0.15)'; border = '1px dashed #6b7280'; color = '#9ca3af'; icon = 'balance';
            text = 'Karma Neutre'; title = 'Neutre.';
        }
        html += `<div class="sandbox-status-badge karma" title="${title}" style="background: ${bg}; color: ${color}; border: ${border};">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; color: ${color};">${icon}</span>
            <span>${text}</span>
        </div>`;
    }

    return html;
}

function renderBuffsHtml(buffList) {
    return (buffList || []).map(b => {
        const inverseStats = ['DAMAGE_TAKEN_MAGIC', 'DAMAGE_TAKEN_PHYSIC', 'DAMAGE_TAKEN_BRUT', 'SHIELD_PIERCED', 'BURN', 'POISON'];
        const isInverse = inverseStats.includes(b.statAffected);
        const isNegativeValue = b.modifier < 0 || b.flatValue < 0;

        let isBad = isNegativeValue;
        if (isInverse) isBad = !isNegativeValue;

        const badgeClass = isBad ? 'debuff' : 'buff';
        const icon = isNegativeValue ? 'trending_down' : 'trending_up';

        let text = '';
        if (b.flatValue) text += `${b.flatValue > 0 ? '+' : ''}${b.flatValue} ${formatStat(b.statAffected)}`;
        if (b.modifier) {
            if (text) text += ' / ';
            text += `${b.modifier > 0 ? '+' : ''}${Math.round(b.modifier * 100)}% ${formatStat(b.statAffected)}`;
        }
        if (!text) text = `Modif. de ${formatStat(b.statAffected)}`;

        return `<div class="sandbox-status-badge ${badgeClass}" title="Source: ${b.sourceName}">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">${icon}</span>
            <span>${text} (${b.duration}t)</span>
        </div>`;
    }).join('');
}

function renderCombatantCard(c, team, isHero = false) {
    const emoji = team === 'ally' ? '🧙‍♂️' : '👹';
    const roleLabel = isHero ? ' (Lanceur)' : '';
    const hpPct = Math.max(0, Math.min(100, (c.hpCurrent / c.hpMax) * 100));
    let hpLabel = `${c.hpCurrent} / ${c.hpMax}`;
    if (c.shieldTotal > 0) hpLabel += ` (+${c.shieldTotal} 🛡️)`;

    const hasMana = c.manaMax > 0;
    let manaHtml = '';
    if (hasMana) {
        const manaPct = Math.max(0, Math.min(100, (c.manaCurrent / c.manaMax) * 100));
        manaHtml = `
            <div class="gauge-container">
                <div class="gauge-label"><span>Mana</span><span>${c.manaCurrent} / ${c.manaMax}</span></div>
                <div class="gauge-track"><div class="gauge-fill mana" style="width: ${manaPct}%;"></div></div>
            </div>`;
    }

    const canRemove = (team === 'ally' && !isHero) || (team === 'enemy');
    const removeBtn = canRemove ? `<button type="button" class="btn-remove-combatant" onclick="removeSandboxCombatant('${team === 'ally' ? 'ALLY' : 'ENEMY'}', ${c.index})" title="Retirer">✕</button>` : '';

    return `
        <div class="combatant-card" data-team="${team}" data-index="${c.index}">
            <div class="combatant-name">
                <span>${emoji} ${c.name}${roleLabel}</span>
                ${removeBtn}
            </div>
            ${isHero ? `<div id="heroConfigBadges" style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.3rem;"></div>` : ''}
            <div class="gauge-container">
                <div class="gauge-label"><span>Santé (PV)</span><span>${hpLabel}</span></div>
                <div class="gauge-track"><div class="gauge-fill hp" style="width: ${hpPct}%;"></div></div>
            </div>
            ${manaHtml}
            <div class="sandbox-status-list">${renderPassiveBadges(c)}</div>
            <div class="sandbox-status-list">${renderBuffsHtml(c.buffs)}</div>
        </div>`;
}

// ===== Main UI Update =====

export function updateSandboxUI(data) {
    // Update Turn
    document.getElementById('sandboxTurnText').innerText = data.turnCount || 1;

    // Render allies
    const alliesContainer = document.getElementById('alliesContainer');
    if (alliesContainer && data.allies) {
        let html = '';
        data.allies.forEach((c, i) => {
            html += renderCombatantCard(c, 'ally', i === 0);
        });
        // Add ally button
        if (data.allies.length < 4) {
            html += `<button type="button" class="btn-add-combatant" onclick="addSandboxAlly()">
                <span class="material-symbols-outlined" style="font-size: 1rem;">person_add</span>
                <span>Ajouter un Allié</span>
            </button>`;
        }
        alliesContainer.innerHTML = html;
    }

    // Render enemies
    const enemiesContainer = document.getElementById('enemiesContainer');
    if (enemiesContainer && data.enemies) {
        let html = '';
        data.enemies.forEach(c => {
            html += renderCombatantCard(c, 'enemy', false);
        });
        if (data.enemies.length < 4) {
            html += `<button type="button" class="btn-add-combatant enemy" onclick="addSandboxEnemy()">
                <span class="material-symbols-outlined" style="font-size: 1rem;">group_add</span>
                <span>Ajouter un Ennemi</span>
            </button>`;
        }
        enemiesContainer.innerHTML = html;
    }

    // Render Logs
    const logsContainer = document.getElementById('simulationLogsContainer');
    logsContainer.innerText = data.rawLogs || "Aucun événement loggé.";
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Sync hero config
    if (data.allies && data.allies.length > 0) {
        const hero = data.allies[0];
        syncHeroConfigForm(hero);
        renderHeroConfigBadges(hero);
        updateLiveHeroStats(hero);
    }
}

export function updateLiveHeroStats(hero) {
    const setStat = (id, val, suffix = '') => {
        const el = document.getElementById(id);
        if (el) el.innerText = val + suffix;
    };
    setStat('liveStatPower', hero.power || 0);
    setStat('liveStatArmor', hero.armor || 0);
    setStat('liveStatRes', hero.resistance || 0);
    setStat('liveStatSpeed', hero.speed || 0);

    const crit = (hero.critDerived !== null && hero.critDerived !== undefined)
        ? hero.critDerived
        : (hero.crit || 0);
    setStat('liveStatCrit', crit, '%');
}

export function closeSimulationModal() {
    document.getElementById('simulationModalOverlay').classList.remove('active');
}

// ===== Target Selection for Cast =====

// State for pending cast
let pendingCastSpellId = null;
let pendingCastChoiceKey = null;
let pendingTargetEnemyIndex = 0;
let pendingTargetAllyIndex = 0;
let pendingNeedsEnemy = false;
let pendingNeedsAlly = false;

export function initiateCast(spellId) {
    const sp = state.loadedSpells.find(s => s.id === spellId);
    if (!sp) return;

    const effects = sp.effects || [];
    const needsEnemy = effects.some(e => (e.effectTarget || e.effect_target) === 'TARGET');
    const needsAlly = effects.some(e => (e.effectTarget || e.effect_target) === 'ALLY');

    // Get choice key if applicable
    const choiceSelect = document.getElementById(`choice-select-${spellId}`);
    const choiceKey = choiceSelect ? parseInt(choiceSelect.value, 10) : null;

    // Check if we need to ask the user to pick targets
    const enemyCards = document.querySelectorAll('.combatant-card[data-team="enemy"]');
    const allyCards = document.querySelectorAll('.combatant-card[data-team="ally"]');

    const validAllyCards = Array.from(allyCards).filter(c => c.dataset.index !== "0");
    const multiEnemy = needsEnemy && enemyCards.length > 1;
    const multiAlly = needsAlly && validAllyCards.length > 0;

    if (needsAlly && validAllyCards.length === 0) {
        alert("Ce sort nécessite un allié (autre que le lanceur) comme cible, mais aucun n'est disponible.");
        return;
    }

    if (!multiEnemy && !multiAlly) {
        // Direct cast — no selection needed
        executeCast(spellId, choiceKey, 0, 0);
        return;
    }

    // Enter target selection mode
    pendingCastSpellId = spellId;
    pendingCastChoiceKey = choiceKey;
    pendingTargetEnemyIndex = 0;
    pendingTargetAllyIndex = 0;
    pendingNeedsEnemy = multiEnemy;
    pendingNeedsAlly = multiAlly;

    // Highlight selectable cards
    if (multiEnemy) {
        enemyCards.forEach(card => {
            card.classList.add('target-selectable');
            card.onclick = () => {
                pendingTargetEnemyIndex = parseInt(card.dataset.index, 10);
                enemyCards.forEach(c => c.classList.remove('target-selected'));
                card.classList.add('target-selected');
                checkAndConfirmCast();
            };
        });
    }

    if (multiAlly) {
        validAllyCards.forEach(card => {
            card.classList.add('target-selectable');
            card.onclick = () => {
                pendingTargetAllyIndex = parseInt(card.dataset.index, 10);
                validAllyCards.forEach(c => c.classList.remove('target-selected'));
                card.classList.add('target-selected');
                checkAndConfirmCast();
            };
        });
    }

    // Show selection prompt
    showTargetSelectionPrompt(multiEnemy, multiAlly);
}

function showTargetSelectionPrompt(needsEnemy, needsAlly) {
    // Remove any existing prompt
    const existing = document.getElementById('targetSelectionPrompt');
    if (existing) existing.remove();

    let msg = '🎯 Sélectionnez ';
    if (needsEnemy && needsAlly) msg += 'un ennemi ET un allié';
    else if (needsEnemy) msg += 'un ennemi';
    else if (needsAlly) msg += 'un allié';
    msg += ' cible, puis le sort sera lancé.';

    const prompt = document.createElement('div');
    prompt.id = 'targetSelectionPrompt';
    prompt.style.cssText = 'background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.2)); border: 1px solid #8b5cf6; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.85rem; color: #c084fc;';
    prompt.innerHTML = `
        <span>${msg}</span>
        <button type="button" onclick="cancelTargetSelection()" style="background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Annuler</button>
    `;

    const controls = document.querySelector('.sandbox-controls');
    if (controls) controls.parentNode.insertBefore(prompt, controls);
}

function checkAndConfirmCast() {
    const enemySelected = !pendingNeedsEnemy || document.querySelector('.combatant-card[data-team="enemy"].target-selected');
    const allySelected = !pendingNeedsAlly || document.querySelector('.combatant-card[data-team="ally"].target-selected');

    if (enemySelected && allySelected) {
        const sId = pendingCastSpellId;
        const cKey = pendingCastChoiceKey;
        const eIdx = pendingTargetEnemyIndex;
        const aIdx = pendingTargetAllyIndex;
        
        clearTargetSelection();
        executeCast(sId, cKey, eIdx, aIdx);
    }
}

export function cancelTargetSelection() {
    clearTargetSelection();
}

function clearTargetSelection() {
    document.querySelectorAll('.combatant-card').forEach(card => {
        card.classList.remove('target-selectable', 'target-selected');
        card.onclick = null;
    });
    const prompt = document.getElementById('targetSelectionPrompt');
    if (prompt) prompt.remove();
    pendingCastSpellId = null;
}

async function executeCast(spellId, choiceKey, enemyIndex, allyIndex) {
    let url = `/api/spells-editor/sandbox/cast/${spellId}?targetEnemyIndex=${enemyIndex}&targetAllyIndex=${allyIndex}`;
    if (choiceKey != null) url += `&choiceKey=${choiceKey}`;

    try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            updateSandboxUI(data);
        }
    } catch (err) {
        console.error(err);
    }
}

// ===== Add/Remove Combatants =====

export async function addSandboxAlly() {
    try {
        const res = await fetch('/api/spells-editor/sandbox/add-ally', { method: 'POST' });
        if (res.ok) updateSandboxUI(await res.json());
    } catch (err) { console.error(err); }
}

export async function addSandboxEnemy() {
    try {
        const res = await fetch('/api/spells-editor/sandbox/add-enemy', { method: 'POST' });
        if (res.ok) updateSandboxUI(await res.json());
    } catch (err) { console.error(err); }
}

export async function removeSandboxCombatant(team, index) {
    try {
        const res = await fetch(`/api/spells-editor/sandbox/remove-combatant?team=${team}&index=${index}`, { method: 'POST' });
        if (res.ok) updateSandboxUI(await res.json());
    } catch (err) { console.error(err); }
}
