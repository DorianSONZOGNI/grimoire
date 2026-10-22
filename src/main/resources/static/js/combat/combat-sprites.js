/**
 * Combat Sprites — Gestion modulaire des sprites de combat des héros.
 *
 * Règles SSOT & Grimoire :
 * - Aucun style inline (.style.* interdit hors animation procédurale de carte).
 * - Classes CSS dynamiques (.pose-<pose>, .is-dead) nettoyées génériquement.
 * - Architecture ouverte (VOIE_POSE_RESOLVERS) : ajouter une voie consiste à
 *   ajouter son résolveur dans VOIE_POSE_RESOLVERS et ses assets dans /styles/sprites/<voie>/.
 */

import { pageState } from './combat-state.js';
import { javaClassToCode } from '../utils/constants.js';

const SPRITE_VERSION = '1786180000089';
const ACTION_POSE_DURATION = 1600;

const activeSpriteTimers = new Map();
const activeHeroPoses = new Map();
const channeledSpellCache = new Map();

const KNOWN_VOIE_SLUGS = ['conviction', 'consolidation', 'creation', 'destruction', 'raison', 'surete', 'trahison', 'violence'];

const DAMAGE_TYPES = new Set(['DAMAGE', 'FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT', 'DAMAGE_OVER_TIME', 'POISON', 'BURN', 'DAMAGE_FIXED', 'DAMAGE_PERCENTAGE']);
const HEAL_TYPES = new Set(['HEAL', 'FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT', 'HEAL_OVER_TIME', 'HEAL_FIXED', 'HEAL_PERCENTAGE']);
const MANA_TYPES = new Set(['MANA', 'FIXED_MANA', 'PERCENTAGE_MANA', 'MOT', 'MANA_OVER_TIME', 'MANA_FIXED', 'MANA_PERCENTAGE']);
const OFFENSIVE_BUFF_STATS = new Set(['STRENGTH', 'DAMAGE_GIVEN_PHYSIC', 'DAMAGE_GIVEN_PHYSIC_TO_SHIELD', 'DAMAGE_GIVEN_MAGIC_TO_SHIELD', 'DAMAGE_GIVEN_BRUT', 'POWER', 'CRIT', 'SHIELD_PENETRATION', 'SHIELD_PIERCED']);
const DEFENSIVE_BUFF_STATS = new Set(['HEALTH', 'PV', 'ARMURE', 'ARMOR', 'RESISTANCE', 'SHIELD_RECEIVED', 'SHIELD_GIVEN']);
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
        hasDebuff: false,
        hasHeal: false,
        hasMana: false,
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

        if (mappedType === 'SHIELD' || rawType.includes('Shield')) {
            fx.hasShield = true;
            fx.hasBuff = true;
        }

        if (DAMAGE_TYPES.has(mappedType) || rawType.includes('Damage') || rawType.includes('Heat')) {
            fx.hasDamage = true;
        }

        if (HEAL_TYPES.has(mappedType) || rawType.includes('Heal')) {
            fx.hasHeal = true;
        }

        if (mappedType === 'BUFF_DEBUFF' || rawType.includes('Buff')) {
            if (!isNegative && target !== 'ALL_ENEMIES' && target !== 'ENEMY') {
                if (OFFENSIVE_BUFF_STATS.has(stat) || stat.includes('TO_SHIELD')) {
                    fx.autoBuffCount++;
                } else if (DEFENSIVE_BUFF_STATS.has(stat) || stat.includes('ARMUR')) {
                    fx.renforceCount++;
                }
            }

            if (stat === 'POISON' || stat === 'BURN') {
                fx.hasDamage = true;
            } else if (stat === 'MANA') {
                if (isEnemyTarget || isNegative) fx.hasDebuff = true;
                else fx.hasMana = true;
            } else if (isEnemyTarget || isNegative) {
                fx.hasDebuff = true;
            } else {
                fx.hasBuff = true;
            }
        }

        if (MANA_TYPES.has(mappedType) || rawType.includes('Mana')) {
            if (isEnemyTarget) fx.hasDebuff = true;
            else fx.hasMana = true;
        }

        if (mappedType === 'PURGE' || mappedType === 'DISPEL' || rawType.includes('Purge') || rawType.includes('Dispel')) {
            if (isEnemyTarget) fx.hasDebuff = true;
            else fx.hasBuff = true;
        }

        if (mappedType === 'BUD' || rawType.includes('Bud')) {
            fx.hasBuff = true;
        }
    }

    return fx;
}

/**
 * Détermine la pose du sprite selon le sort lancé, l'option choisie, la voie et le tour de canalisation.
 */
export function getSpritePose(spell, choiceKey = null, voieSlug = 'conviction', channelingTurn = null) {
    if (!spell) return 'attak';

    const activeEffects = filterActiveEffects(spell, choiceKey, channelingTurn);
    if (activeEffects.length === 0) {
        return (isSpellChanneled(spell) && voieSlug === 'conviction') ? 'prepare' : 'wait';
    }

    const fx = analyzeSpellEffects(activeEffects);
    const resolver = VOIE_POSE_RESOLVERS[voieSlug] || VOIE_POSE_RESOLVERS.conviction;
    return resolver(fx);
}

/**
 * Applique une pose au conteneur DOM du sprite (sans style inline) et nettoie dynamiquement les classes `pose-*`.
 */
function applyPoseToSpriteEl(spriteEl, voieSlug, pose, restartAnim = false) {
    if (!spriteEl) return;

    let img = spriteEl.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        img.draggable = false;
        img.alt = 'Combat Hero Sprite';
        spriteEl.appendChild(img);
    }

    const targetSrc = `/styles/sprites/${voieSlug}/${pose}.png?v=${SPRITE_VERSION}`;
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
function playHeroActionPose(heroIndex, cardEl, voieSlug, pose, data) {
    const spriteEl = getOrCreateSpriteEl(cardEl);

    if (activeSpriteTimers.has(heroIndex)) {
        clearTimeout(activeSpriteTimers.get(heroIndex));
        activeSpriteTimers.delete(heroIndex);
    }

    activeHeroPoses.set(heroIndex, pose);
    applyPoseToSpriteEl(spriteEl, voieSlug, pose, true);

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
    applyPoseToSpriteEl(spriteEl, voieSlug, currentActionPose || 'wait');
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
    const pose = getSpritePose(spell, activeChoiceKey, voieSlug, computedTurn);

    playHeroActionPose(heroIndex, activeCard, voieSlug, pose, data);
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

    let pose = 'attak';
    if (!isBasicAttack && spellName) {
        const spell = data.availableSpells?.find(s => s.nom === spellName)
            || (hero.channeledSpell?.nom === spellName ? hero.channeledSpell : null)
            || (channeledSpellCache.get(hero.name)?.nom === spellName ? channeledSpellCache.get(hero.name) : null);

        if (spell) {
            const explicitTurn = logChannelingTurn || (actionVerb === 'lance' ? 1 : null);
            const turnToApply = computeChannelingTurn(spell, hero, explicitTurn, 2);
            pose = getSpritePose(spell, hero.channelingChoiceKey || null, voieSlug, turnToApply);
        }
    }

    // Animation procédurale de translation de la carte pour le coéquipier
    card.style.transform = 'translateX(50px)';
    setTimeout(() => {
        card.style.transform = card.classList.contains('active') ? 'scale(1.05)' : 'scale(0.95)';
    }, 200);

    playHeroActionPose(heroIndex, card, voieSlug, pose, data);
}
