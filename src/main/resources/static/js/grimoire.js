// ===================================================================
// grimoire.js — Rendu du grimoire (panneau droit) et logique d'édition
// ===================================================================

import state from './state.js';
import { javaClassToCode } from './constants.js';
import { formatStat, formatSrc, getSpellColor, hexToRgb, getVoieIcon, getSpiritIcon } from './ui.js';

// Utilitaires de filtres (résolus plus tard ou via window temporairement)
const getVoieButtonColor = window.getVoieButtonColor || function(){ return '#fff'; };
const getSpiritButtonColor = window.getSpiritButtonColor || function(){ return '#fff'; };

// Dépendances de sandbox.js et particles.js
const trySpell = window.trySpell || function(){};
const attachLvl5CardEffects = window.attachLvl5CardEffects || function(){};
const spellCardEnter = window.spellCardEnter || function(){};
const spellCardLeave = window.spellCardLeave || function(){};

export function renderFilteredSpells() {
    const container = document.getElementById('createdSpellsContainer');
    if (!container) return;

    if (!state.loadedSpells || state.loadedSpells.length === 0) {
        container.innerHTML = `<div class="empty-state">Le grimoire est vierge. Forgez le premier sort !</div>`;
        return;
    }

    const searchVal = (document.getElementById('filterSearch')?.value || '').toLowerCase().trim();
    const effectVal = document.getElementById('filterEffect')?.value || 'ALL';
    const levelVal = document.getElementById('filterLevel')?.value || 'ALL';
    const sortByVal = document.getElementById('sortBy')?.value || 'NEWEST';

    let filtered = state.loadedSpells.filter(sp => {
        if (searchVal) {
            const matchNom = (sp.nom || '').toLowerCase().includes(searchVal);
            const matchDesc = (sp.description || '').toLowerCase().includes(searchVal);
            if (!matchNom && !matchDesc) return false;
        }

        if (state.selectedFilterVoieId !== null) {
            if (!sp.voie || sp.voie.id != state.selectedFilterVoieId) return false;
        }
        if (state.selectedFilterSpiritId !== null) {
            if (!sp.spiritualite || sp.spiritualite.id != state.selectedFilterSpiritId) return false;
        }

        if (effectVal !== 'ALL') {
            if (!sp.effects || !sp.effects.some(e => {
                const rawType = e.effectType || e.effect_type || '';
                const mappedType = javaClassToCode[rawType] || rawType;

                if (effectVal === 'GROUP_DAMAGE') {
                    return ['FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT'].includes(mappedType);
                }
                if (effectVal === 'GROUP_HEAL') {
                    return ['FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT'].includes(mappedType);
                }
                if (effectVal === 'GROUP_MANA') {
                    return ['FIXED_MANA', 'PERCENTAGE_MANA', 'MOT'].includes(mappedType);
                }
                if (effectVal === 'GROUP_EFFECTS') {
                    return ['BUFF_DEBUFF', 'PURGE', 'SHIELD'].includes(mappedType);
                }

                return mappedType === effectVal;
            })) {
                return false;
            }
        }

        if (levelVal !== 'ALL') {
            if (sp.niveau != levelVal) return false;
        }

        return true;
    });

    filtered = [...filtered]; 
    filtered.sort((a, b) => {
        if (sortByVal === 'NEWEST') {
            return b.id - a.id;
        } else if (sortByVal === 'NAME_ASC') {
            return (a.nom || '').localeCompare(b.nom || '');
        } else if (sortByVal === 'LEVEL_ASC') {
            return (a.niveau || 1) - (b.niveau || 1);
        } else if (sortByVal === 'LEVEL_DESC') {
            return (b.niveau || 1) - (a.niveau || 1);
        } else if (sortByVal === 'MANA_ASC') {
            return (a.manaCost || 0) - (b.manaCost || 0);
        }
        return 0;
    });

    const badge = document.getElementById('filterCountBadge');
    if (badge) {
        badge.innerText = `${filtered.length} sort${filtered.length > 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">Aucun sort ne correspond à vos filtres.</div>`;
        return;
    }

    container.innerHTML = filtered.map(sp => {
        try {
            return getSpellCardHtml(sp);
        } catch (e) {
            return `<div style="color: red; padding: 1rem; border: 1px solid red;">Erreur de rendu pour le sort ${sp.id} : ${e.message}<br><pre>${e.stack}</pre></div>`;
        }
    }).join('');

    try {
        if (window.attachLvl5CardEffects) {
            window.attachLvl5CardEffects(container);
        } else {
            attachLvl5CardEffects(container);
        }
    } catch (e) {
        container.innerHTML += `<div style="color: red;">Erreur attachLvl5CardEffects : ${e.message}</div>`;
    }
}

export function getSpellEffectsSummaryHtml(sp) {
    let effectsSummaryHtml = '';
    if ((sp.effects && sp.effects.length > 0) || (sp.heatGenerated && sp.heatGenerated > 0)) {
        effectsSummaryHtml = `<div class="spell-effects-summary">`;
        const hasHeatEffectInList = sp.effects && sp.effects.some(e => {
            const t = (e.effectType || e.effect_type || '').replace('Effect', '');
            return t.startsWith('Heat') || t.startsWith('HEAT');
        });
        if (sp.heatGenerated && sp.heatGenerated > 0 && !hasHeatEffectInList) {
            effectsSummaryHtml += `
                        <div class="effect-line" style="display:flex; align-items:baseline; gap:0.3rem; flex-wrap:wrap;">
                            <div class="indicator caster" style="flex-shrink:0;"></div>
                            <span style="font-weight:600; color:#fff;">[Lanceur]</span>
                            <span style="color:#ef4444; font-weight:500;">🔥 Chaleur</span>
                            <span style="color:#e2e8f0;">➔ génère ${sp.heatGenerated} Chaleur</span>
                        </div>
                    `;
        }
        if (sp.effects && sp.effects.length > 0) {
            sp.effects.forEach(e => {
                const target = e.effectTarget || e.effect_target;
                const effectTargetLabels = {
                    'CASTER': 'Lanceur',
                    'ALLY': 'Allié',
                    'TARGET': 'Cible',
                    'ALL_ALLIES': 'Lanceur & Alliés',
                    'ALL_ENEMIES': 'Tous les Ennemis',
                    'ALL_COMBATANTS': 'Tout le Monde'
                };
                const targetText = effectTargetLabels[target] || 'Cible';

                let indicatorClass = 'target';
                if (target === 'CASTER') {
                    indicatorClass = 'caster';
                } else if (target === 'ALLY' || target === 'ALL_ALLIES') {
                    indicatorClass = 'ally';
                } else if (target) {
                    indicatorClass = target.toLowerCase().replace('_', '-');
                }

                const typeNames = {
                    'DamageFixedEffect': 'Dégâts Fixes',
                    'FIXED_DAMAGE': 'Dégâts Fixes',
                    'DamagePercentageEffect': 'Dégâts %',
                    'PERCENTAGE_DAMAGE': 'Dégâts %',
                    'HealFixedEffect': 'Soins Fixes',
                    'FIXED_HEAL': 'Soins Fixes',
                    'HealPercentageEffect': 'Soins %',
                    'PERCENTAGE_HEAL': 'Soins %',
                    'ManaFixedEffect': 'Mana Fixe',
                    'FIXED_MANA': 'Mana Fixe',
                    'ManaPercentageEffect': 'Mana %',
                    'PERCENTAGE_MANA': 'Mana %',
                    'BuffDebuffEffect': 'Buff/Débuff',
                    'BUFF_DEBUFF': 'Buff/Débuff',
                    'DamageOverTimeEffect': 'DoT',
                    'DOT': 'DoT',
                    'HealOverTimeEffect': 'HoT',
                    'HOT': 'HoT',
                    'ManaOverTimeEffect': 'MoT',
                    'MOT': 'MoT',
                    'PurgeEffect': 'Dissipation',
                    'PURGE': 'Dissipation',
                    'ShieldEffect': 'Bouclier',
                    'SHIELD': 'Bouclier',
                    'HeatFixedEffect': 'Chaleur Fixe',
                    'HEAT_FIXED': 'Chaleur Fixe',
                    'HeatPercentageEffect': 'Chaleur %',
                    'HEAT_PERCENTAGE': 'Chaleur %',
                    'HeatOverTimeEffect': 'Chaleur Tick',
                    'HEAT_OVER_TIME': 'Chaleur Tick',
                    'HeatEffect': 'Chaleur',
                    'HEAT': 'Chaleur'
                };
                const eTypeStr = typeNames[e.effectType || e.effect_type] || (e.effectType || e.effect_type || 'Effet');

                const dt = (e.damageType || 'MAGIC').toLowerCase();
                const dtStr = dt === 'magic' ? 'Magiques' : (dt === 'physic' ? 'Physiques' : 'Bruts');

                let detailsStr = '';
                const rawType = e.effectType || e.effect_type || '';
                const t = rawType.replace('Effect', '');

                if (t === 'DamageFixed' || t === 'FIXED_DAMAGE') {
                    detailsStr = `➔ inflige ${e.damage || 0} Dégâts ${dtStr}`;
                } else if (t === 'DamagePercentage' || t === 'PERCENTAGE_DAMAGE') {
                    const pct = Math.round((e.percentage || 0) * 100);
                    detailsStr = `➔ inflige ${pct}% de ${formatSrc(e.damageSource || e.source)} en Dégâts ${dtStr}`;
                } else if (t === 'HealFixed' || t === 'FIXED_HEAL') {
                    detailsStr = `➔ rend ${e.healAmount || 0} PV`;
                } else if (t === 'HealPercentage' || t === 'PERCENTAGE_HEAL') {
                    const pct = Math.round((e.percentage || 0) * 100);
                    detailsStr = `➔ rend ${pct}% de ${formatSrc(e.healSource || e.source)} en PV`;
                } else if (t === 'BuffDebuff' || t === 'BUFF_DEBUFF') {
                    let parts = [];
                    if (e.flatValue) {
                        parts.push(`${e.flatValue > 0 ? '+' : ''}${e.flatValue} ${formatStat(e.statAffected)}`);
                    }
                    if (e.modifier) {
                        const sign = e.modifier > 0 ? '+' : '';
                        parts.push(`${sign}${Math.round(e.modifier * 100)}% ${formatStat(e.statAffected)}`);
                    }
                    if (parts.length === 0) parts.push(`modifie ${formatStat(e.statAffected)}`);
                    const durStr = e.duration > 0 ? ` (${e.duration} tours)` : '';
                    detailsStr = `➔ ${parts.join(' et ')}${durStr}`;
                } else if (t === 'DamageOverTime' || t === 'DOT') {
                    let parts = [];
                    const fd = e.fixedDamagePerTick || e.damage || 0;
                    const pd = e.percentageDamagePerTick || e.percentage || 0;
                    if (fd) parts.push(`${fd}`);
                    if (pd) parts.push(`${Math.round(pd * 100)}% ${formatSrc(e.damageSource || e.source)}`);
                    if (parts.length === 0) parts.push('0');
                    const durStr = e.duration > 0 ? ` sur ${e.duration} tours` : '';
                    detailsStr = `➔ DoT de ${parts.join(' + ')} Dégâts ${dtStr}/tour${durStr}`;
                } else if (t === 'HealOverTime' || t === 'HOT') {
                    let parts = [];
                    const fh = e.fixedHealPerTick || e.healAmount || 0;
                    const ph = e.percentageHealPerTick || e.percentage || 0;
                    if (fh) parts.push(`${fh}`);
                    if (ph) parts.push(`${Math.round(ph * 100)}% ${formatSrc(e.healSource || e.source || 'TARGET_HEALTH_MAX')}`);
                    if (parts.length === 0) parts.push('0');
                    const durStr = e.duration > 0 ? ` sur ${e.duration} tours` : '';
                    detailsStr = `➔ HoT de ${parts.join(' + ')} PV/tour${durStr}`;
                } else if (t === 'ManaFixed' || t === 'FIXED_MANA') {
                    detailsStr = `➔ rend ${e.manaAmount || 0} Mana`;
                } else if (t === 'ManaPercentage' || t === 'PERCENTAGE_MANA') {
                    const pct = Math.round((e.percentage || 0) * 100);
                    detailsStr = `➔ rend ${pct}% de ${formatSrc(e.manaSource || e.source)} en Mana`;
                } else if (t === 'ManaOverTime' || t === 'MOT') {
                    let parts = [];
                    const fm = e.fixedManaPerTick || e.manaAmount || 0;
                    const pm = e.percentageManaPerTick || e.percentage || 0;
                    if (fm) parts.push(`${fm}`);
                    if (pm) parts.push(`${Math.round(pm * 100)}% ${formatSrc(e.manaSource || e.source || 'TARGET_MANA_MAX')}`);
                    if (parts.length === 0) parts.push('0');
                    const durStr = e.duration > 0 ? ` sur ${e.duration} tours` : '';
                    detailsStr = `➔ MoT de ${parts.join(' + ')} Mana/tour${durStr}`;
                } else if (t === 'Purge' || t === 'PURGE') {
                    detailsStr = `➔ dissipe les altérations`;
                } else if (t === 'Shield' || t === 'SHIELD') {
                    let parts = [];
                    const fv = e.fixedValue || e.flatValue || 0;
                    const pv = e.percentage || 0;
                    if (fv) parts.push(`${fv}`);
                    if (pv) parts.push(`${Math.round(pv * 100)}% ${formatSrc(e.shieldSource || e.source || 'TARGET_HEALTH_MAX')}`);
                    if (parts.length === 0) parts.push('0');
                    const durStr = e.duration > 0 ? ` sur ${e.duration} tours` : '';
                    detailsStr = `➔ Bouclier de ${parts.join(' + ')}${durStr}`;
                } else if (t === 'Heat' || t === 'HEAT' || t === 'HeatFixed' || t === 'HEAT_FIXED') {
                    detailsStr = `➔ génère ${e.amount || e.flatValue || 0} Chaleur`;
                } else if (t === 'HeatPercentage' || t === 'HEAT_PERCENTAGE') {
                    const pct = Math.round((e.percentage || 0) * 100);
                    detailsStr = `➔ génère ${pct}% de ${formatSrc(e.source)} en Chaleur`;
                } else if (t === 'HeatOverTime' || t === 'HEAT_OVER_TIME') {
                    let parts = [];
                    const fv = e.flatValue || e.fixedValue || 0;
                    const pv = e.percentage || 0;
                    if (fv) parts.push(`${fv}`);
                    if (pv) parts.push(`${Math.round(pv * 100)}% ${formatSrc(e.source || 'TARGET_HEALTH_MAX')}`);
                    if (parts.length === 0) parts.push('0');
                    const durStr = e.duration > 0 ? ` sur ${e.duration} tours` : '';
                    detailsStr = `➔ Tick Chaleur de ${parts.join(' + ')}/tour${durStr}`;
                }

                const keyBadge = e.requiredChoiceKey != null ? `<span style="background:rgba(245,158,11,0.2); color:#f59e0b; padding:0.1rem 0.3rem; border-radius:3px; font-size:0.75rem; font-weight:bold;" title="S'active uniquement si l'option choisie au cast est ${e.requiredChoiceKey}">Option ${e.requiredChoiceKey}</span>` : '';

                let turnBadge = '';
                if (sp.castingType === 'CANALISE') {
                    const turns = e.channelingTurns || [];
                    if (turns.length > 0) {
                        const turnStr = turns.map(t => `T${t}`).join(', ');
                        turnBadge = `<span style="background:rgba(139,92,246,0.2); color:#a78bfa; padding:0.1rem 0.3rem; border-radius:3px; font-size:0.75rem; font-weight:bold;" title="Déclenché aux tours de canalisation : ${turnStr}">${turnStr}</span>`;
                    } else {
                        turnBadge = `<span style="background:rgba(239,68,68,0.2); color:#fca5a5; padding:0.1rem 0.3rem; border-radius:3px; font-size:0.75rem; font-weight:bold;" title="Ne se déclenche à aucun tour">Jamais</span>`;
                    }
                }

                effectsSummaryHtml += `
                        <div class="effect-line" style="display:flex; align-items:baseline; gap:0.3rem; flex-wrap:wrap;">
                            <div class="indicator ${indicatorClass}" style="flex-shrink:0;"></div>
                            ${turnBadge}
                            ${keyBadge}
                            <span style="font-weight:600; color:#fff;">[${targetText}]</span>
                            <span style="color:var(--spell-color, #38bdf8); font-weight:500;">${eTypeStr}</span>
                            <span style="color:#e2e8f0;">${detailsStr}</span>
                        </div>
                    `;
            });
        }
        effectsSummaryHtml += `</div>`;
    }
    return effectsSummaryHtml;
}

export function getSpellCardHtml(sp) {
    let voieBadge = '';
    if (sp.voie) {
        const getVBC = window.getVoieButtonColor || getVoieButtonColor;
        const vHex = getVBC(sp.voie);
        const vRgb = hexToRgb(vHex);
        const vIcon = getVoieIcon(sp.voie.nom);
        voieBadge = `<span class="badge" style="color: ${vHex}; border-color: rgba(${vRgb}, 0.3); background: rgba(${vRgb}, 0.05); display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1em;">${vIcon}</span>${sp.voie.nom}</span>`;
    }

    let spiritBadge = '';
    if (sp.spiritualite) {
        const getSBC = window.getSpiritButtonColor || getSpiritButtonColor;
        const sHex = getSBC(sp.spiritualite);
        const sRgb = hexToRgb(sHex);
        const sIcon = getSpiritIcon(sp.spiritualite.nom);
        spiritBadge = `<span class="badge" style="color: ${sHex}; border-color: rgba(${sRgb}, 0.3); background: rgba(${sRgb}, 0.05); display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1em;">${sIcon}</span>${sp.spiritualite.nom}</span>`;
    }

    let castBadge = '';
    if (sp.castingType === 'INSTANTANE') {
        castBadge = `<span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">bolt</span>Instantané</span>`;
    } else if (sp.castingType === 'CANALISE') {
        castBadge = `<span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">cyclone</span>Canalisé</span>`;
    } else {
        castBadge = `<span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">hourglass_empty</span>Banal</span>`;
    }

    if (sp.voie && sp.voie.nom && sp.voie.nom.toLowerCase().includes('violence')) {
        if (sp.inspiration) {
            castBadge += ` <span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(6, 182, 212, 0.2); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">air</span>Inspiration</span>`;
        } else {
            castBadge += ` <span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(219, 39, 119, 0.2); color: #f472b6; border: 1px solid rgba(219, 39, 119, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">local_fire_department</span>Expiration</span>`;
        }
    }
    if (sp.spiritualite && sp.spiritualite.nom && sp.spiritualite.nom.toLowerCase().includes('karma')) {
        if (sp.karmaAlignment === 'OFFENSIVE') {
            castBadge += ` <span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(147, 51, 234, 0.2); color: #c084fc; border: 1px solid rgba(147, 51, 234, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">dark_mode</span>Ténèbres</span>`;
        } else if (sp.karmaAlignment === 'PROTECTIVE') {
            castBadge += ` <span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">light_mode</span>Lumière</span>`;
        } else if (sp.karmaAlignment === 'RESTORATIVE') {
            castBadge += ` <span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; background: rgba(100, 116, 139, 0.2); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.4);"><span class="material-symbols-outlined" style="font-size: 1.05rem;">brightness_medium</span>Harmonie</span>`;
        }
    }

    let effectsSummaryHtml = getSpellEffectsSummaryHtml(sp);

    let rankTitleBadge = '';
    if (sp.voie && sp.voie.rankNames && sp.voie.rankNames[sp.niveau]) {
        rankTitleBadge = `<div style="font-size:0.85rem; color:#10b981; font-weight:600; margin-top:-0.4rem; display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1em; color:#10b981; vertical-align:middle;">workspace_premium</span>"${sp.voie.rankNames[sp.niveau]}"</div>`;
    } else if (sp.spiritualite && sp.spiritualite.rankNames && sp.spiritualite.rankNames[sp.niveau]) {
        rankTitleBadge = `<div style="font-size:0.85rem; color:#10b981; font-weight:600; margin-top:-0.4rem; display:inline-flex; align-items:center; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1em; color:#10b981; vertical-align:middle;">workspace_premium</span>"${sp.spiritualite.rankNames[sp.niveau]}"</div>`;
    }

    const titleColor = getSpellColor(sp);
    const titleRgb = hexToRgb(titleColor);

    const isMaxLevel = (sp.niveau === 5 && sp.voie) || (sp.niveau === 3 && sp.spiritualite && !sp.voie);

    let lvlBadgeStyle = 'background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #f8fafc; font-weight: 500;';
    let lvlIcon = '<span class="material-symbols-outlined" style="font-size: 1.05rem;">military_tech</span>';
    if (sp.niveau === 2) {
        lvlBadgeStyle = 'background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.5); color: #fff; font-weight: 600;';
    } else if (sp.niveau === 3 && !isMaxLevel) {
        lvlBadgeStyle = `background: rgba(var(--spell-rgb), 0.25); border: 1px solid rgba(var(--spell-rgb), 0.6); color: var(--spell-color); font-weight: 700; text-shadow: 0 0 3px rgba(0,0,0,0.5);`;
    } else if (sp.niveau === 4) {
        lvlBadgeStyle = `background: rgba(var(--spell-rgb), 0.4); border: 1px solid var(--spell-color); color: #fff; font-weight: 700; text-shadow: 0 0 5px var(--spell-color); box-shadow: 0 0 12px rgba(var(--spell-rgb), 0.5);`;
        lvlIcon = '<span class="material-symbols-outlined" style="font-size: 1.05rem;">auto_awesome</span>';
    } else if (isMaxLevel) {
        lvlBadgeStyle = `background: linear-gradient(135deg, var(--spell-color), rgba(var(--spell-rgb), 0.6)); border: 1px solid #fff; color: #fff; font-weight: 800; text-shadow: 0 1px 3px rgba(0,0,0,0.9); box-shadow: 0 0 20px rgba(var(--spell-rgb), 0.8);`;
        lvlIcon = '<span class="material-symbols-outlined" style="font-size: 1.05rem;">workspace_premium</span>';
    }
    const lvlBadge = `<span class="badge" style="display: inline-flex; align-items: center; gap: 0.2rem; ${lvlBadgeStyle}">${lvlIcon}Lvl ${sp.niveau}</span>`;

    return `
                <div class="spell-card spell-card-lvl-${isMaxLevel ? 5 : (sp.niveau || 1)}" style="--spell-color: ${titleColor}; --spell-rgb: ${titleRgb};">
                    <div class="spell-card-header" style="align-items: flex-start;">
                        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                            <div class="spell-name" style="color: ${titleColor};">${sp.nom}</div>
                            <div class="spell-badges">
                                ${castBadge}
                                ${lvlBadge}
                                ${voieBadge}
                                ${spiritBadge}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.3rem; align-items: center; flex-wrap: wrap;">
                            <button type="button" class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1; border-radius: 4px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.2rem;" onclick="window.trySpell(${sp.id})" title="Lancer ce sort en direct dans le simulateur"><span class="material-symbols-outlined" style="font-size: 1.05rem;">swords</span><span>Essayer</span></button>
                            <button type="button" class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); display: inline-flex; align-items: center; gap: 0.2rem;" onclick="window.editSpell(${sp.id})" title="Modifier les propriétés de ce sort"><span class="material-symbols-outlined" style="font-size: 1.05rem;">edit</span><span>Éditer</span></button>
                            <button type="button" class="btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; line-height: 1; border-radius: 4px; opacity: 0.75; display: inline-flex; align-items: center; justify-content: center;" onclick="window.deleteSpell(${sp.id})" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.75'" title="Supprimer définitivement ce sort"><span class="material-symbols-outlined" style="font-size: 1.05rem;">delete</span></button>
                        </div>
                    </div>
                    ${rankTitleBadge}
                    <div class="spell-meta" style="flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                        <span style="display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.05rem; color: #38bdf8; vertical-align: middle;">water_drop</span>${sp.manaCost}${sp.percentManaCost > 0 ? ` + ${sp.percentManaCost}% (${formatSrc(sp.percentManaCostSource || 'CASTER_MANA_MAX')})` : ''} Mana</span>
                        ${sp.healCost > 0 || sp.percentHealCost > 0 ? `<span style="display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.05rem; color: #f43f5e; vertical-align: middle;">bloodtype</span>${sp.healCost}${sp.percentHealCost > 0 ? ` + ${sp.percentHealCost}% (${formatSrc(sp.percentHealCostSource || 'CASTER_HEALTH_MAX')})` : ''} PV</span>` : ''}
                        ${sp.heatCost > 0 || sp.percentHeatCost > 0 ? `<span style="display: inline-flex; align-items: center; gap: 0.2rem;"><span class="material-symbols-outlined" style="font-size: 1.05rem; color: #f97316; vertical-align: middle;">local_fire_department</span>${sp.heatCost}${sp.percentHeatCost > 0 ? ` + ${sp.percentHeatCost}% Chaleur` : ''} Chaleur</span>` : ''}
                        ${sp.castingType === 'CANALISE' ? `
                            <span style="color: #a78bfa; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem;" title="Paramètres du sort canalisé">
                                <span class="material-symbols-outlined" style="font-size: 1.1rem; color: #a78bfa; vertical-align: middle;">cyclone</span>
                                <span>${sp.channelingDuration} tour${sp.channelingDuration > 1 ? 's' : ''}</span>
                                ${sp.allowInstantDuringChanneling ? `
                                    <span class="material-symbols-outlined" style="font-size: 1.1rem; color: #f59e0b; vertical-align: middle;" title="Instantanés autorisés pendant la canalisation">bolt</span>
                                ` : `
                                    <span style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1.1rem; height: 1.1rem; vertical-align: middle;" title="Instantanés interdits pendant la canalisation">
                                        <span class="material-symbols-outlined" style="font-size: 1.1rem; color: #64748b;">bolt</span>
                                        <span style="position: absolute; width: 100%; height: 2px; background: #ef4444; transform: rotate(-45deg);"></span>
                                    </span>
                                `}
                            </span>
                        ` : ''}
                    </div>
                    ${sp.description ? `<div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">"${sp.description}"</div>` : ''}
                    ${effectsSummaryHtml}
                </div>
            `;
}

export function cancelEditSpell() {
    state.editingSpellId = null;
    document.getElementById('submitSpellBtn').innerText = '✦ Forger le Sort';
    document.getElementById('nom').value = '';
    document.getElementById('description').value = '';
    document.getElementById('heatCost').value = 0;
    document.getElementById('percentHeatCost').value = 0;
    state.currentEffects = [];
    
    if (typeof window.renderEffects === 'function') window.renderEffects();

    const channelingDurInput = document.getElementById('channelingDuration');
    if (channelingDurInput) channelingDurInput.value = 1;
    const allowInstantInput = document.getElementById('allowInstantDuringChanneling');
    if (allowInstantInput) allowInstantInput.checked = true;
    document.getElementById('castingTypeSelect').value = 'BANAL';
    document.getElementById('castingTypeSelect').dispatchEvent(new Event('change'));
    const isInspInput = document.getElementById('isInspiration');
    if (isInspInput) {
        isInspInput.checked = true;
        if (typeof window.updateViolenceLabel === 'function') window.updateViolenceLabel();
    }

    updateEditingPreview();
}

export function updateEditingPreview() {
    const preview = document.getElementById('editingSpellPreview');
    const cardBody = document.getElementById('editingSpellCardBody');
    if (!preview || !cardBody) return;

    if (state.editingSpellId !== null && state.loadedSpells) {
        const sp = state.loadedSpells.find(s => s.id === state.editingSpellId);
        if (sp) {
            cardBody.innerHTML = getSpellCardHtml(sp);

            const headerActions = cardBody.querySelector('.spell-card-header div[style*="display: flex; gap: 0.3rem"]');
            if (headerActions) {
                headerActions.style.display = 'none';
            }

            preview.classList.add('active');
        } else {
            preview.classList.remove('active');
        }
    } else {
        preview.classList.remove('active');
    }
}

export function getLvl5Origin(badgeText) {
    if (badgeText.includes('consolidation')) return 'consolidation';
    if (badgeText.includes('raison')) return 'raison';
    if (badgeText.includes('sûreté') || badgeText.includes('surete')) return 'surete';
    if (badgeText.includes('trahison')) return 'trahison';
    if (badgeText.includes('conviction')) return 'conviction';
    if (badgeText.includes('création') || badgeText.includes('creation')) return 'creation';
    if (badgeText.includes('destruction')) return 'destruction';
    if (badgeText.includes('violence')) return 'violence';
    if (badgeText.includes('esprit')) return 'esprit';
    if (badgeText.includes('ténèbres') || badgeText.includes('tenebres')) return 'tenebres';
    if (badgeText.includes('karma')) return 'karma';
    return 'generic';
}

export function editSpell(id) {
    const sp = state.loadedSpells.find(s => s.id === id);
    if (!sp) return;

    state.editingSpellId = sp.id;
    document.getElementById('nom').value = sp.nom || '';
    document.getElementById('niveau').value = sp.niveau || 1;
    document.getElementById('niveau').dispatchEvent(new Event('change'));
    document.getElementById('castingTypeSelect').value = sp.castingType || 'BANAL';
    document.getElementById('castingTypeSelect').dispatchEvent(new Event('change'));
    document.getElementById('channelingDuration').value = sp.channelingDuration || 1;
    document.getElementById('allowInstantDuringChanneling').checked = sp.allowInstantDuringChanneling !== false;
    document.getElementById('description').value = sp.description || '';
    document.getElementById('manaCost').value = sp.manaCost || 0;
    document.getElementById('percentManaCost').value = sp.percentManaCost || 0;
    document.getElementById('percentManaCostSource').value = sp.percentManaCostSource || 'CASTER_MANA_MAX';
    document.getElementById('percentManaCostSource').dispatchEvent(new Event('change'));
    document.getElementById('healCost').value = sp.healCost || 0;
    document.getElementById('percentHealCost').value = sp.percentHealCost || 0;
    document.getElementById('percentHealCostSource').value = sp.percentHealCostSource || 'CASTER_HEALTH_MAX';
    document.getElementById('percentHealCostSource').dispatchEvent(new Event('change'));
    document.getElementById('heatCost').value = sp.heatCost || 0;
    document.getElementById('percentHeatCost').value = sp.percentHeatCost || 0;

    document.getElementById('voieSelect').value = sp.voie ? sp.voie.id : '';
    document.getElementById('voieSelect').dispatchEvent(new Event('change'));

    const karmaInput = document.getElementById('karmaAlignment');
    if (karmaInput) {
        karmaInput.value = sp.karmaAlignment || 'NONE';
    }

    document.getElementById('spiritSelect').value = sp.spiritualite ? sp.spiritualite.id : '';
    document.getElementById('spiritSelect').dispatchEvent(new Event('change'));

    const isInspInput = document.getElementById('isInspiration');
    if (isInspInput) {
        isInspInput.checked = sp.inspiration !== false;
    }
    
    if (typeof window.updateSpecialVoieConfig === 'function') window.updateSpecialVoieConfig();

    if (typeof window.updateRankTitle === 'function') {
        window.updateRankTitle();
    }

    state.currentEffects = (sp.effects || []).map((e, idx) => {
        const rawType = e.effectType || e.effect_type || '';
        const effectType = javaClassToCode[rawType] || rawType;

        let effectId = Date.now() + idx + Math.random();

        return {
            id: effectId,
            effectType,
            effectTarget: e.effectTarget || 'TARGET',
            damage: e.damage || e.fixedDamagePerTick || 0,
            healAmount: e.healAmount || e.fixedHealPerTick || 0,
            manaAmount: e.manaAmount || e.fixedManaPerTick || 0,
            percentage: e.percentage || e.percentageDamagePerTick || e.percentageHealPerTick || e.percentageManaPerTick || 0,
            flatValue: e.flatValue || e.fixedValue || e.amount || 0,
            modifier: e.modifier || 0,
            duration: e.duration || 0,
            damageType: e.damageType || 'MAGIC',
            statAffected: e.statAffected || 'ARMURE',
            source: effectType === 'BUFF_DEBUFF' ? (e.source || e.modifierSource || null) : (e.source || e.shieldSource || e.damageSource || e.healSource || e.manaSource || e.modifierSource || 'TARGET_HEALTH_MAX'),
            requiredChoiceKey: e.requiredChoiceKey !== undefined ? e.requiredChoiceKey : null,
            channelingTurns: e.channelingTurns || [1]
        };
    });

    const isDest = sp.voie && sp.voie.nom && sp.voie.nom.toLowerCase().includes('destruction');
    const hasHeat = state.currentEffects.some(e => ['HEAT_FIXED', 'HEAT_PERCENTAGE', 'HEAT_OVER_TIME'].includes(e.effectType));
    if (isDest && !hasHeat && sp.heatGenerated && sp.heatGenerated > 0) {
        state.currentEffects.push({
            id: Date.now() + Math.random(),
            effectType: 'HEAT_FIXED',
            effectTarget: 'CASTER',
            flatValue: sp.heatGenerated,
            requiredChoiceKey: null,
            channelingTurns: [1]
        });
    }

    if (typeof window.renderEffects === 'function') window.renderEffects();

    document.getElementById('submitSpellBtn').innerText = '💾 Mettre à jour le Sort';

    updateEditingPreview();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.renderFilteredSpells = renderFilteredSpells;
window.editSpell = editSpell;
window.cancelEditSpell = cancelEditSpell;
