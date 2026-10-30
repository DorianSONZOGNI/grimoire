/**
 * Combat Sprites — Gestion modulaire des sprites de combat des héros.
 *
 * Règles SSOT & Grimoire :
 * - Aucun style inline (.style.* interdit hors animation procédurale de carte).
 * - Classes CSS dynamiques (.pose-<pose>, .is-dead) nettoyées génériquement.
 * - Architecture ouverte (VOIE_POSE_RESOLVERS) : ajouter une voie consiste à
 *   ajouter son résolveur dans VOIE_POSE_RESOLVERS et ses assets dans /styles/sprites/<voie>/.
 * - Voies supportées :
 *   - Conviction (/styles/sprites/conviction/) : wait, shield, prepare, attak, dead
 *   - Violence (/styles/sprites/violence/) : wait, attak, power, weakness, heal, dead
 *   - Sûreté (/styles/sprites/surete/) : wait, blood, attak, heal, mana, buff, dead
 *   - Consolidation (/styles/sprites/consolidation/) : wait, shield, attak, renforce, auto-buff, dead
 *   - Raison (/styles/sprites/raison/) : wait, levitating, attak, protect, buff, dead
 *   - Destruction (/styles/sprites/destruction/) : wait, fire, lightning, attak, absorb, buff, dead
 *   - Trahison (/styles/sprites/trahison/) : wait, attak, poison, acide, buff-heal, buff, debuff, capacity, dead
 *   - Création (/styles/sprites/creation/) : wait, poison, shield, heal, attak, bourgeons, dead
 */

import { pageState } from './combat-state.js';
import { javaClassToCode } from '../utils/constants.js';

const SPRITE_VERSION = '1786180000221';
const ACTION_POSE_DURATION = 1600;

const activeSpriteTimers = new Map();
const activeHeroPoses = new Map();
const channeledSpellCache = new Map();

const KNOWN_VOIE_SLUGS = ['conviction', 'consolidation', 'creation', 'destruction', 'raison', 'surete', 'trahison', 'violence'];

const DAMAGE_TYPES = new Set(['DAMAGE', 'FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT', 'DAMAGE_OVER_TIME', 'POISON', 'BURN', 'DAMAGE_FIXED', 'DAMAGE_PERCENTAGE']);
const HEAL_TYPES = new Set(['HEAL', 'FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT', 'HEAL_OVER_TIME', 'HEAL_FIXED', 'HEAL_PERCENTAGE']);
const MANA_TYPES = new Set(['MANA', 'FIXED_MANA', 'PERCENTAGE_MANA', 'MOT', 'MANA_OVER_TIME', 'MANA_FIXED', 'MANA_PERCENTAGE']);
const OFFENSIVE_BUFF_STATS = new Set(['STRENGTH', 'DAMAGE_GIVEN_PHYSIC', 'DAMAGE_GIVEN_PHYSIC_TO_SHIELD', 'DAMAGE_GIVEN_MAGIC_TO_SHIELD', 'DAMAGE_GIVEN_BRUT', 'POWER', 'CRIT', 'SHIELD_PENETRATION', 'SHIELD_PIERCED']);
const DEFENSIVE_BUFF_STATS = new Set(['HEALTH', 'PV', 'ARMURE', 'ARMOR', 'RESISTANCE', 'SHIELD_RECEIVED', 'SHIELD_GIVEN', 'DAMAGE_TAKEN_MAGIC', 'DAMAGE_TAKEN_PHYSIC', 'DAMAGE_TAKEN_BRUT']);
const ENEMY_TARGETS = new Set(['TARGET', 'ALL_ENEMIES', 'ENEMY']);

/**
 * Table déclarative des priorités de poses par Voie.
 * Ajouter une nouvelle voie ici l'active automatiquement dans tout le module.
 */
const VOIE_POSE_RESOLVERS = {
    conviction: (fx) => {
        if (fx.hasShield) return 'shield';
        if (fx.hasDamage || fx.hasDebuff) return 'attak';
        if (fx.hasBuff || fx.hasHeal || fx.hasMana) return 'prepare';
        return 'wait';
    },
    violence: (fx) => {
        if (fx.hasDamage) return 'attak';
        if (fx.hasBuff) return 'power';
        if (fx.hasDebuff) return 'weakness';
        if (fx.hasHeal) return 'heal';
        return 'wait';
    },
    surete: (fx) => {
        if (fx.hasDamage && fx.hasHeal) return 'blood';
        if (fx.hasDamage) return 'attak';
        if (fx.hasHeal) return 'heal';
        if (fx.hasMana) return 'mana';
        if (fx.hasBuff) return 'buff';
        if (fx.hasDebuff) return 'attak';
        return 'wait';
    },
    consolidation: (fx) => {
        if (fx.hasShield) return 'shield';
        if (fx.hasDamage) return 'attak';
        if (fx.autoBuffCount > 0 || fx.renforceCount > 0) {
            return fx.renforceCount > fx.autoBuffCount ? 'renforce' : 'auto-buff';
        }
        if (fx.hasDebuff) return 'attak';
        if (fx.hasBuff || fx.hasHeal) return 'renforce';
        return 'wait';
    },
    creation: (fx) => {
        if (fx.hasPoison) return 'poison';
        if (fx.hasShield) return 'shield';
        if (fx.hasHeal || fx.hasStatBuff) return 'heal';
        if (fx.hasDamage || fx.hasStatDebuff) return 'attak';
        if (fx.hasBud || fx.hasDispel) return 'bourgeons';
        if (fx.hasMana) return 'heal';
        return 'wait';
    },
    raison: (fx) => {
        if (fx.hasDispel) return 'levitating';
        if (fx.hasDamage) return 'attak';
        if (fx.hasShield) return 'protect';
        if (fx.hasBuff || fx.hasHeal || fx.hasMana) return 'buff';
        return 'wait';
    },
    destruction: (fx) => {
        if (fx.hasBurn) return 'fire';
        if (fx.hasDamage && fx.hasDebuff) return 'lightning';
        if (fx.hasDamage) return 'attak';
        if (fx.hasMana) return 'absorb';
        if (fx.hasBuff || fx.hasHeal || fx.hasShield) return 'buff';
        return 'wait';
    },
    trahison: (fx) => {
        if (fx.hasDispel) return 'capacity';
        if (fx.hasPhysicDamage && fx.hasBrutDamage) return 'attak';
        if (fx.hasPhysicDamage && fx.hasPoison) return 'poison';
        if (fx.hasBrutDamageBuff) return 'poison';
        if (fx.hasPoison || fx.hasDot) return 'acide';
        if (fx.hasBuff && fx.hasHeal) return 'buff-heal';
        if (fx.hasDebuff) return 'debuff';
        if (fx.hasDefensiveBuff || fx.hasShield) return 'capacity';
        if (fx.hasOffensiveBuff || fx.autoBuffCount > 0 || fx.hasBuff || fx.hasHeal) return 'buff';
        if (fx.hasDamage) return 'attak';
        return 'wait';
    }
};

function hasSpriteSupport(voieSlug) {
    return Boolean(voieSlug && Object.hasOwn(VOIE_POSE_RESOLVERS, voieSlug));
}

function isHeroDead(hero) {
    if (!hero) return true;
    return (hero.healthCurrent != null && hero.healthCurrent <= 0)
        || (hero.pv != null && hero.pv <= 0);
}

/**
 * Normalise le nom de la voie en slug de dossier (ex: "Voie de la Sûreté" -> "surete").
 */
export function getVoieSlug(voie) {
    if (!voie) return null;
    const raw = typeof voie === 'string' ? voie : (voie.nom || voie.name || '');
    const normalized = String(raw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return KNOWN_VOIE_SLUGS.find(slug => normalized.includes(slug)) || null;
}

function isSpellChanneled(spell) {
    return Boolean(spell && (spell.castingType === 'CANALISE' || (spell.channelingDuration && spell.channelingDuration > 1)));
}

function computeChannelingTurn(spell, hero, explicitTurn = null, defaultWhenNotRemaining = 1) {
    if (explicitTurn != null) return explicitTurn;
    if (!isSpellChanneled(spell)) return null;
    if (hero?.remainingChannelingTurns > 0) {
        if (hero.startedChannelingThisTurn) return 1;
        const duration = spell.channelingDuration || hero.channeledSpell?.channelingDuration || 1;
        return Math.max(1, duration - hero.remainingChannelingTurns + 1);
    }
    return defaultWhenNotRemaining;
}

/**
 * Filtre les effets actifs d'un sort selon le choix (`choiceKey`) et le tour de canalisation (`channelingTurn`).
 */
function filterActiveEffects(spell, choiceKey, channelingTurn) {
    const effects = spell?.effects || [];
    const channeled = isSpellChanneled(spell);

    return effects.filter(e => {
        if (e.requiredChoiceKey != null && String(e.requiredChoiceKey) !== String(choiceKey)) {
            return false;
        }
        if (channeled && channelingTurn != null && channelingTurn > 0) {
            const turns = e.channelingTurns || e.channeling_turns;
            if (turns) {
                const turnNum = Number(channelingTurn);
                const hasTurns = Array.isArray(turns) ? turns.length > 0 : Boolean(turns.size && turns.size > 0);
                if (hasTurns) {
                    const matchTurn = Array.isArray(turns)
                        ? turns.some(t => Number(t) === turnNum)
                        : Boolean(turns.has && (turns.has(turnNum) || turns.has(String(turnNum))));
                    if (!matchTurn) return false;
                }
            }
        }
        return true;
    });
}

/**
 * Analyse une liste d'effets actifs et retourne un descripteur sémantique pour les résolveurs de pose.
 */
function analyzeSpellEffects(activeEffects) {
    const fx = {
        hasShield: false,
        hasDamage: false,
        hasBuff: false,
        hasStatBuff: false,
        hasDebuff: false,
        hasStatDebuff: false,
        hasHeal: false,
        hasMana: false,
        hasPoison: false,
        hasBurn: false,
        hasBud: false,
        hasDispel: false,
        hasPhysicDamage: false,
        hasBrutDamage: false,
        hasDot: false,
        hasOffensiveBuff: false,
        hasDefensiveBuff: false,
        hasBrutDamageBuff: false,
        autoBuffCount: 0,
        renforceCount: 0
    };

    for (const e of activeEffects) {
        const rawType = String(e.effectType || e.effect_type || '');
        const mappedType = javaClassToCode[rawType] || rawType;
        const target = String(e.effectTarget || e.effect_target || '').toUpperCase();
        const stat = String(e.statAffected || '').toUpperCase();
        const mod = Number(e.modifier != null ? e.modifier : 0);
        const flat = Number(e.flatValue != null ? e.flatValue : 0);
        const isNegative = mod < 0 || flat < 0;
        const isEnemyTarget = ENEMY_TARGETS.has(target);

        const isPoison = mappedType === 'POISON'
            || rawType.toUpperCase().includes('POISON')
            || stat === 'POISON'
            || Boolean(e.poison);

        if (isPoison) {
            if (isEnemyTarget) {
                fx.hasPoison = true;
                fx.hasDamage = true;
            } else {
                fx.hasBuff = true;
            }
        }

        const isBurn = mappedType === 'BURN'
            || rawType.toUpperCase().includes('BURN')
            || stat === 'BURN'
            || Boolean(e.burn);

        if (isBurn) {
            if (isEnemyTarget) {
                fx.hasBurn = true;
                fx.hasDamage = true;
            } else {
                fx.hasBuff = true;
            }
        }

        if (mappedType === 'SHIELD' || rawType.includes('Shield')) {
            fx.hasShield = true;
            fx.hasBuff = true;
            fx.hasDefensiveBuff = true;
        }

        const damageType = String(e.damageType || e.damage_type || '').toUpperCase();
        if (damageType === 'PHYSIC' && (isEnemyTarget || target !== 'CASTER')) {
            fx.hasPhysicDamage = true;
        }
        if (damageType === 'BRUT' && (isEnemyTarget || target !== 'CASTER')) {
            fx.hasBrutDamage = true;
        }

        const isDot = mappedType === 'DOT'
            || mappedType === 'DAMAGE_OVER_TIME'
            || rawType.includes('DamageOverTime')
            || rawType.includes('OverTime')
            || stat === 'DOT'
            || stat === 'DAMAGE_OVER_TIME'
            || Boolean(e.dot);
        if (isDot && (isEnemyTarget || target !== 'CASTER')) {
            fx.hasDot = true;
        }

        const isHeat = mappedType === 'HEAT' || rawType.includes('Heat') || stat === 'HEAT';
        if (isHeat) {
            if (isEnemyTarget) {
                fx.hasDamage = true;
            } else {
                fx.hasBuff = true;
            }
        }

        if (!isHeat && !isBurn && !isPoison && (DAMAGE_TYPES.has(mappedType) || rawType.includes('Damage'))) {
            if (isEnemyTarget || target !== 'CASTER') {
                fx.hasDamage = true;
            }
        }

        if (HEAL_TYPES.has(mappedType) || rawType.includes('Heal')) {
            fx.hasHeal = true;
        }

        if (mappedType === 'BUFF_DEBUFF' || rawType.includes('Buff')) {
            const isResistance = stat.includes('RESIST');
            const isDamageTaken = stat.includes('DAMAGE_TAKEN') || stat.includes('DEGATS_SUBIS');
            const isDefensiveStat = DEFENSIVE_BUFF_STATS.has(stat) || stat.includes('ARMUR') || isResistance || isDamageTaken;

            if (stat === 'POISON' || stat === 'BURN') {
                if (isEnemyTarget) {
                    fx.hasDamage = true;
                } else {
                    fx.hasBuff = true;
                }
            } else if (stat === 'MANA') {
                if (isEnemyTarget || (isNegative && isEnemyTarget)) {
                    fx.hasDebuff = true;
                    fx.hasStatDebuff = true;
                } else {
                    fx.hasMana = true;
                }
            } else if (!isEnemyTarget && target !== 'ALL_ENEMIES' && target !== 'ENEMY') {
                // Buff / effet sur le lanceur ou un allié
                const isBrutDamageBuff = (
                    stat === 'DAMAGE_GIVEN_BRUT'
                    || stat.includes('GIVEN_BRUT')
                    || (stat.includes('BRUT') && (stat.includes('GIVEN') || stat.includes('INFLIGE')))
                    || (stat.includes('DAMAGE_GIVEN') && String(e.damageType || e.damage_type || '').toUpperCase() === 'BRUT')
                );
                if (isBrutDamageBuff && !isNegative) {
                    fx.hasBrutDamageBuff = true;
                }

                if (isDamageTaken) {
                    if (isNegative) {
                        fx.renforceCount++;
                        fx.hasDefensiveBuff = true;
                        fx.hasBuff = true;
                        fx.hasStatBuff = true;
                    }
                } else if (!isNegative) {
                    if (OFFENSIVE_BUFF_STATS.has(stat) || stat.includes('TO_SHIELD') || stat.includes('DAMAGE') || stat === 'POWER' || stat === 'CRIT' || stat === 'STRENGTH') {
                        fx.autoBuffCount++;
                        fx.hasOffensiveBuff = true;
                        fx.hasBuff = true;
                        fx.hasStatBuff = true;
                    } else if (isDefensiveStat) {
                        fx.renforceCount++;
                        if (!isResistance) {
                            fx.hasDefensiveBuff = true;
                        }
                        fx.hasBuff = true;
                        fx.hasStatBuff = true;
                    } else {
                        fx.hasBuff = true;
                        fx.hasStatBuff = true;
                    }
                }
            } else {
                // Effet ciblant l'ennemi (débuff)
                if (isDamageTaken) {
                    if (!isNegative) {
                        fx.hasDebuff = true;
                        fx.hasStatDebuff = true;
                    }
                } else if (isNegative || isEnemyTarget) {
                    fx.hasDebuff = true;
                    fx.hasStatDebuff = true;
                }
            }
        }

        if (MANA_TYPES.has(mappedType) || rawType.toUpperCase().includes('MANA') || rawType.toUpperCase().includes('MOT')) {
            if (isEnemyTarget) {
                fx.hasDebuff = true;
                fx.hasStatDebuff = true;
            } else {
                fx.hasMana = true;
            }
        }

        const isDispel = mappedType === 'PURGE'
            || mappedType === 'DISPEL'
            || rawType.toUpperCase().includes('PURGE')
            || rawType.toUpperCase().includes('DISPEL')
            || rawType.toUpperCase().includes('DISSIP')
            || stat.includes('PURGE')
            || stat.includes('DISPEL')
            || stat.includes('DISSIP')
            || Boolean(e.dispel || e.purge);

        if (isDispel) {
            fx.hasDispel = true;
            if (isEnemyTarget) fx.hasDebuff = true;
            else fx.hasBuff = true;
        }

        if (mappedType === 'BUD' || rawType.includes('Bud')) {
            fx.hasBud = true;
        }
    }

    return fx;
}

/**
 * Détermine la pose du sprite selon le sort lancé, l'option choisie, la voie et le tour de canalisation.
 */
function isTenebresSpell(spell, hero = null) {
    if (!spell) return false;
    const spiri = spell.spiritualite;
    if (spiri) {
        const nom = typeof spiri === 'string' ? spiri : (spiri.nom || spiri.name || '');
        const norm = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (norm.includes('tenebre')) return true;
    }
    const effects = spell.effects || [];
    if (effects.some(e => {
        const stat = String(e.statAffected || '').toUpperCase();
        const type = String(e.effectType || e.effect_type || '').toUpperCase();
        const req = String(e.detachedSoulRequirement || '').toUpperCase();
        return stat === 'AME_DETACHEE' || type === 'AME_DETACHEE' || req === 'REQUIRED' || req === 'FORBIDDEN';
    })) {
        return true;
    }
    if (!spell.voie && hero?.spiritualite) {
        const hSpiri = hero.spiritualite;
        const hNom = typeof hSpiri === 'string' ? hSpiri : (hSpiri.nom || hSpiri.name || '');
        const hNorm = hNom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (hNorm.includes('tenebre')) return true;
    }
    return false;
}

function heroHasAmeDetachee(hero) {
    if (!hero) return false;
    const buffs = hero.activeBuffs || hero.buffs || [];
    return buffs.some(b => {
        const stat = String(b.statAffected || '').toUpperCase();
        const type = String(b.effectType || b.effect_type || '').toUpperCase();
        return stat === 'AME_DETACHEE' || type === 'AME_DETACHEE';
    });
}

function isDetachementEffect(e) {
    if (!e) return false;
    const stat = String(e.statAffected || '').toUpperCase();
    const type = String(e.effectType || e.effect_type || '').toUpperCase();
    return stat === 'AME_DETACHEE' || type === 'AME_DETACHEE' || stat.includes('DETACH') || type.includes('DETACH');
}

/**
 * Détecte si un sort appartient à la Spiritualité de l'Esprit.
 */
function isEspritSpell(spell, hero = null) {
    if (!spell) return false;
    const spiri = spell.spiritualite || spell.spiritualiteName || spell.spiritualite_name;
    if (spiri) {
        const nom = typeof spiri === 'string' ? spiri : (spiri.nom || spiri.name || spiri.type || '');
        const norm = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (norm.includes('esprit')) return true;
    }
    const isSpiritualiteSpell = !spell.voie || String(spell.category || '').toUpperCase() === 'SPIRITUALITE';
    if (isSpiritualiteSpell && hero?.spiritualite) {
        const hSpiri = hero.spiritualite || hero.spiritualiteName || hero.spiritualite_name;
        const hNom = typeof hSpiri === 'string' ? hSpiri : (hSpiri.nom || hSpiri.name || hSpiri.type || '');
        const hNorm = hNom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (hNorm.includes('esprit')) return true;
    }
    return false;
}

function isTargetEveryone(targetVal) {
    if (!targetVal) return false;
    const str = String(targetVal).toUpperCase();
    if (str === 'ALL_COMBATANTS' || str.includes('ALL_COMBATANT') || str.includes('TOUT_LE_MONDE') || str.includes('EVERYONE')) {
        return true;
    }
    const norm = String(targetVal).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return norm.includes('tout le monde');
}

function spellTargetsEveryone(spell, effectsToCheck) {
    if (effectsToCheck && effectsToCheck.some(e => isTargetEveryone(e.effectTarget || e.effect_target || e.target))) {
        return true;
    }
    if (spell && isTargetEveryone(spell.target || spell.effectTarget || spell.targetType)) {
        return true;
    }
    return false;
}

function isDamageEffect(e) {
    if (!e) return false;
    const rawType = String(e.effectType || e.effect_type || '');
    const mappedType = (javaClassToCode[rawType] || rawType).toUpperCase();
    const upperRaw = rawType.toUpperCase();
    const stat = String(e.statAffected || '').toUpperCase();
    const target = String(e.effectTarget || e.effect_target || e.target || '').toUpperCase();
    const isEnemy = ENEMY_TARGETS.has(target) || target === '' || target === 'TARGET' || target === 'ALL_ENEMIES';

    if (DAMAGE_TYPES.has(mappedType) || upperRaw.includes('DAMAGE') || upperRaw.includes('DEGAT')) {
        if (isEnemy || target !== 'CASTER') return true;
    }

    const damageType = String(e.damageType || e.damage_type || '').toUpperCase();
    if (damageType && damageType !== 'NONE') {
        if (isEnemy || target !== 'CASTER') return true;
    }

    const isPoison = mappedType === 'POISON' || upperRaw.includes('POISON') || stat === 'POISON' || Boolean(e.poison);
    if (isPoison && (isEnemy || target !== 'CASTER')) return true;

    const isBurn = mappedType === 'BURN' || upperRaw.includes('BURN') || stat === 'BURN' || Boolean(e.burn);
    if (isBurn && (isEnemy || target !== 'CASTER')) return true;

    const isHeat = mappedType === 'HEAT' || upperRaw.includes('HEAT') || stat === 'HEAT';
    if (isHeat && (isEnemy || target !== 'CASTER')) return true;

    const isDot = mappedType === 'DOT' || mappedType === 'DAMAGE_OVER_TIME' || upperRaw.includes('DAMAGEOVERTIME') || upperRaw.includes('OVERTIME') || stat === 'DOT' || Boolean(e.dot);
    if (isDot && (isEnemy || target !== 'CASTER')) return true;

    return false;
}

function isMeditationEffect(e) {
    if (!e) return false;
    const rawType = String(e.effectType || e.effect_type || '');
    const mappedType = (javaClassToCode[rawType] || rawType).toUpperCase();
    const upperRaw = rawType.toUpperCase();
    const stat = String(e.statAffected || '').toUpperCase();

    // Bouclier
    if (mappedType === 'SHIELD' || upperRaw.includes('SHIELD') || stat.includes('SHIELD') || stat.includes('BOUCLIER') || stat.includes('ARMUR')) {
        return true;
    }

    // Heal de vie
    if (HEAL_TYPES.has(mappedType) || upperRaw.includes('HEAL') || stat.includes('HEAL') || stat.includes('SOIN') || stat === 'PV' || stat === 'HEALTH' || stat.includes('LIFE')) {
        return true;
    }

    // Heal de mana
    if (MANA_TYPES.has(mappedType) || upperRaw.includes('MANA') || stat.includes('MANA') || upperRaw.includes('MOT')) {
        return true;
    }

    // Buff / Débuff
    if (mappedType === 'BUFF_DEBUFF' || upperRaw.includes('BUFF') || upperRaw.includes('DEBUFF') || stat !== '') {
        return true;
    }

    // Dispel / Purge
    if (mappedType === 'PURGE' || mappedType === 'DISPEL' || upperRaw.includes('PURGE') || upperRaw.includes('DISPEL')) {
        return true;
    }

    return false;
}

/**
 * Résout la pose du sprite pour la Spiritualité de l'Esprit.
 * Priorités strictes :
 * 1. all : sort comportant un effet qui cible tout le monde
 * 2. attak : sort comportant une attaque infligeant des dégâts
 * 3. meditation : sort faisant bouclier, buff, débuff, heal de vie ou de mana
 */
function resolveEspritPose(spell, activeEffects, hero = null) {
    const effectsToCheck = (activeEffects && activeEffects.length > 0) ? activeEffects : (spell?.effects || []);

    if (spellTargetsEveryone(spell, effectsToCheck)) {
        return 'all';
    }

    if (effectsToCheck.some(isDamageEffect)) {
        return 'attak';
    }

    if (effectsToCheck.some(isMeditationEffect)) {
        return 'meditation';
    }

    return 'meditation';
}

function resolveTenebresPose(spell, activeEffects, hero = null) {
    const effectsToCheck = (activeEffects && activeEffects.length > 0) ? activeEffects : (spell?.effects || []);

    if (effectsToCheck.some(isDetachementEffect)) {
        return 'detachement';
    }

    const hasDetachedSoul = hero ? heroHasAmeDetachee(hero) : null;

    const hasExcluEffect = effectsToCheck.some(e => {
        const req = String(e.detachedSoulRequirement || '').toUpperCase();
        if (req !== 'FORBIDDEN') return false;
        return hasDetachedSoul === null || hasDetachedSoul === false;
    });
    if (hasExcluEffect) {
        return 'attak-exclu';
    }

    const hasRequisEffect = effectsToCheck.some(e => {
        const req = String(e.detachedSoulRequirement || '').toUpperCase();
        if (req !== 'REQUIRED') return false;
        return hasDetachedSoul === null || hasDetachedSoul === true;
    });
    if (hasRequisEffect) {
        return 'attak-requis';
    }

    return 'buff';
}

function createPoseResult(pose, subPath = null) {
    return {
        pose,
        subPath,
        toString() {
            return this.pose;
        }
    };
}

export function getSpritePose(spell, choiceKey = null, voieSlug = 'conviction', channelingTurn = null, hero = null) {
    if (!spell) return createPoseResult('attak');

    const activeEffects = filterActiveEffects(spell, choiceKey, channelingTurn);

    if (isTenebresSpell(spell, hero)) {
        const pose = resolveTenebresPose(spell, activeEffects, hero);
        return createPoseResult(pose, 'tenebre');
    }

    if (isEspritSpell(spell, hero)) {
        const pose = resolveEspritPose(spell, activeEffects, hero);
        return createPoseResult(pose, 'esprit');
    }

    if (activeEffects.length === 0) {
        const pose = (isSpellChanneled(spell) && voieSlug === 'conviction') ? 'prepare' : 'wait';
        return createPoseResult(pose);
    }

    const fx = analyzeSpellEffects(activeEffects);
    const resolver = VOIE_POSE_RESOLVERS[voieSlug] || VOIE_POSE_RESOLVERS.conviction;
    return createPoseResult(resolver(fx));
}

/**
 * Applique une pose au conteneur DOM du sprite (sans style inline) et nettoie dynamiquement les classes `pose-*`.
 */
function applyPoseToSpriteEl(spriteEl, voieSlug, pose, restartAnim = false, subPath = null) {
    if (!spriteEl) return;

    let img = spriteEl.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        img.draggable = false;
        img.alt = 'Combat Hero Sprite';
        spriteEl.appendChild(img);
    }

    const pathPrefix = subPath ? `${voieSlug}/${subPath}` : voieSlug;
    const targetSrc = `/styles/sprites/${pathPrefix}/${pose}.png?v=${SPRITE_VERSION}`;
    img.onerror = () => {
        if (pose !== 'wait') {
            img.src = `/styles/sprites/${voieSlug}/wait.png?v=${SPRITE_VERSION}`;
        } else if (!img.src.includes('/conviction/dead.png')) {
            img.src = `/styles/sprites/conviction/dead.png?v=${SPRITE_VERSION}`;
        }
    };
    if (img.getAttribute('src') !== targetSrc) {
        img.src = targetSrc;
    }

    spriteEl.dataset.pose = pose;
    if (subPath) {
        spriteEl.dataset.subPath = subPath;
    } else {
        delete spriteEl.dataset.subPath;
    }

    Array.from(spriteEl.classList).forEach(cls => {
        if (cls.startsWith('pose-')) {
            spriteEl.classList.remove(cls);
        }
    });

    if (restartAnim) {
        void img.offsetWidth;
    }

    spriteEl.classList.add(`pose-${pose}`);
}

function getOrCreateSpriteEl(cardEl) {
    let spriteEl = cardEl.querySelector('.combat-hero-sprite');
    if (!spriteEl) {
        spriteEl = document.createElement('div');
        spriteEl.className = 'combat-hero-sprite';
        cardEl.appendChild(spriteEl);
    }
    return spriteEl;
}

/**
 * Joue une pose d'action temporaire sur la carte d'un héros puis revient automatiquement en `wait`.
 */
function playHeroActionPose(heroIndex, cardEl, voieSlug, pose, data, subPath = null) {
    const spriteEl = getOrCreateSpriteEl(cardEl);

    if (activeSpriteTimers.has(heroIndex)) {
        clearTimeout(activeSpriteTimers.get(heroIndex));
        activeSpriteTimers.delete(heroIndex);
    }

    const poseName = (pose && typeof pose === 'object') ? pose.pose : pose;
    const resolvedSubPath = subPath || ((pose && typeof pose === 'object') ? pose.subPath : null);

    activeHeroPoses.set(heroIndex, { pose: poseName, subPath: resolvedSubPath });
    applyPoseToSpriteEl(spriteEl, voieSlug, poseName, true, resolvedSubPath);

    const timer = setTimeout(() => {
        activeHeroPoses.delete(heroIndex);
        activeSpriteTimers.delete(heroIndex);
        const currentCard = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
        if (!currentCard || isHeroDead(data?.players?.[heroIndex])) return;

        const currentSprite = currentCard.querySelector('.combat-hero-sprite');
        if (currentSprite) {
            applyPoseToSpriteEl(currentSprite, voieSlug, 'wait');
        }
    }, ACTION_POSE_DURATION);

    activeSpriteTimers.set(heroIndex, timer);
}

/**
 * Rendu / mise à jour du sprite d'un héros lors de updateUI().
 */
export function renderHeroCombatSprite(heroCardEl, player, isActive, isDead) {
    if (!heroCardEl || !player) return;

    if (player.channeledSpell) {
        channeledSpellCache.set(player.name, player.channeledSpell);
    }

    const data = pageState.currentSessionData;
    if (data && data.finished && data.playerWon) {
        const oldSprite = heroCardEl.querySelector('.combat-hero-sprite');
        if (oldSprite) oldSprite.remove();
        return;
    }

    let voieSlug = getVoieSlug(player.voie);
    if (!hasSpriteSupport(voieSlug)) {
        if (isDead) voieSlug = 'conviction';
        else return;
    }

    const heroIndex = parseInt(heroCardEl.dataset.index, 10);
    const spriteEl = getOrCreateSpriteEl(heroCardEl);

    if (isDead) {
        spriteEl.classList.add('is-dead');
        applyPoseToSpriteEl(spriteEl, voieSlug, 'dead');
        return;
    }
    spriteEl.classList.remove('is-dead');

    const currentActionPose = activeHeroPoses.get(heroIndex);
    const activePoseName = currentActionPose?.pose || (typeof currentActionPose === 'string' ? currentActionPose : 'wait');
    const activeSubPath = currentActionPose?.subPath || null;
    applyPoseToSpriteEl(spriteEl, voieSlug, activePoseName, false, activeSubPath);
}

/**
 * Déclenche une pose d'action pour le héros actif lors d'un sort ou d'une attaque.
 */
export function triggerCombatActionSprite(spellOrId = null, choiceKey = null, targetHeroIndex = null, channelingTurn = null) {
    const data = pageState.currentSessionData;
    if (!data || !data.players) return;

    let heroIndex = targetHeroIndex;
    let activeCard = null;
    if (heroIndex !== null && heroIndex !== undefined && heroIndex >= 0) {
        activeCard = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
    } else {
        activeCard = document.querySelector('.fighter-player.active');
        if (activeCard) heroIndex = parseInt(activeCard.dataset.index, 10);
    }

    if (!activeCard || heroIndex === null || heroIndex === undefined || isNaN(heroIndex)) return;

    const hero = data.players[heroIndex];
    if (isHeroDead(hero)) return;

    const voieSlug = getVoieSlug(hero.voie);
    if (!hasSpriteSupport(voieSlug)) return;

    let spell = null;
    if (spellOrId && typeof spellOrId === 'object') {
        spell = spellOrId;
    } else if (spellOrId && typeof spellOrId === 'number' && data.availableSpells) {
        spell = data.availableSpells.find(s => s.id === spellOrId) || null;
    }
    if (!spell && hero.channeledSpell && hero.remainingChannelingTurns > 0 && (spellOrId === null || spellOrId === hero.channeledSpell.id || typeof spellOrId === 'object')) {
        spell = hero.channeledSpell;
    }
    if (!spell && channeledSpellCache.has(hero.name)) {
        spell = channeledSpellCache.get(hero.name);
    }

    const computedTurn = computeChannelingTurn(spell, hero, channelingTurn, 1);
    const activeChoiceKey = choiceKey !== null ? choiceKey : (hero.channelingChoiceKey || null);
    const poseResult = getSpritePose(spell, activeChoiceKey, voieSlug, computedTurn, hero);

    playHeroActionPose(heroIndex, activeCard, voieSlug, poseResult.pose, data, poseResult.subPath);
}

/**
 * Force la pose 'wait' sur tous les héros vivants (ex: fin de tour ou nouveau tour).
 */
export function triggerAllWaitSprites(exceptHeroIndex = null) {
    activeSpriteTimers.forEach((timer, idx) => {
        if (exceptHeroIndex === null || idx !== exceptHeroIndex) {
            clearTimeout(timer);
            activeSpriteTimers.delete(idx);
        }
    });
    if (exceptHeroIndex === null) {
        activeHeroPoses.clear();
    } else {
        Array.from(activeHeroPoses.keys()).forEach(idx => {
            if (idx !== exceptHeroIndex) activeHeroPoses.delete(idx);
        });
    }

    const data = pageState.currentSessionData;
    if (!data || !data.players) return;

    document.querySelectorAll('.fighter-player').forEach(card => {
        const idx = parseInt(card.dataset.index, 10);
        if (exceptHeroIndex !== null && idx === exceptHeroIndex) return;

        const hero = data.players[idx];
        if (isHeroDead(hero)) return;

        const voieSlug = getVoieSlug(hero.voie);
        if (!hasSpriteSupport(voieSlug)) return;

        const spriteEl = card.querySelector('.combat-hero-sprite');
        if (spriteEl) {
            applyPoseToSpriteEl(spriteEl, voieSlug, 'wait');
        }
    });
}

/**
 * Déclenche l'animation d'action pour un héros à partir d'un log multijoueur (SSE).
 */
export function handleCombatSpriteLog(logEntry, sessionData = null) {
    if (!logEntry || typeof logEntry !== 'string') return;
    const data = sessionData || pageState.currentSessionData;
    if (!data || !data.players) return;

    const lanceMatch = logEntry.match(/^(?:[🌀🧬✨🔥💀]\s*)?(.*?)\s+(lance|canalise)\s+(.*?)(?:\s*!\s*\(Tour\s*(\d+)\)|\s*!)/u);
    const attackMatch = logEntry.match(/^(?:[🌀🧬✨🔥💀]\s*)?(.*?)\s+attaque\s+(.*?)\s*!/u);

    let heroName = null;
    let spellName = null;
    let actionVerb = null;
    let logChannelingTurn = null;
    let isBasicAttack = false;

    if (lanceMatch) {
        heroName = lanceMatch[1].trim();
        actionVerb = lanceMatch[2].trim();
        spellName = lanceMatch[3].trim();
        logChannelingTurn = lanceMatch[4] ? parseInt(lanceMatch[4], 10) : null;
    } else if (attackMatch) {
        heroName = attackMatch[1].trim();
        isBasicAttack = true;
    }

    if (!heroName || (pageState.currentUsername && heroName === pageState.currentUsername)) return;

    const heroIndex = data.players.findIndex(p => p.name === heroName);
    if (heroIndex === -1) return;

    const hero = data.players[heroIndex];
    if (isHeroDead(hero)) return;

    if (hero.channeledSpell) {
        channeledSpellCache.set(hero.name, hero.channeledSpell);
    }

    const voieSlug = getVoieSlug(hero.voie);
    if (!hasSpriteSupport(voieSlug)) return;

    const card = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
    if (!card) return;

    let poseResult = createPoseResult('attak');
    if (!isBasicAttack && spellName) {
        const spell = data.availableSpells?.find(s => s.nom === spellName)
            || (hero.channeledSpell?.nom === spellName ? hero.channeledSpell : null)
            || (channeledSpellCache.get(hero.name)?.nom === spellName ? channeledSpellCache.get(hero.name) : null);

        if (spell) {
            const explicitTurn = logChannelingTurn || (actionVerb === 'lance' ? 1 : null);
            const turnToApply = computeChannelingTurn(spell, hero, explicitTurn, 2);
            poseResult = getSpritePose(spell, hero.channelingChoiceKey || null, voieSlug, turnToApply, hero);
        }
    }

    // Animation procédurale de translation de la carte pour le coéquipier
    card.style.transform = 'translateX(50px)';
    setTimeout(() => {
        card.style.transform = card.classList.contains('active') ? 'scale(1.05)' : 'scale(0.95)';
    }, 200);

    playHeroActionPose(heroIndex, card, voieSlug, poseResult.pose, data, poseResult.subPath);
}
