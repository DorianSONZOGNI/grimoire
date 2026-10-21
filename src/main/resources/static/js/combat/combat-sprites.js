/**
 * Combat Sprites — Affiche le sprite de combat à côté de la carte du héros
 * en fonction du type d'action effectuée (attaque, bouclier, buff, attente).
 *
 * Règles SSOT & Grimoire :
 * - Aucun style inline (.style.* interdit).
 * - Utilisation exclusive de classes CSS existantes (.pose-wait, .pose-attak, .pose-shield, .pose-prepare, .is-dead).
 * - Voie de la Conviction supportée en priorité dans /styles/sprites/conviction/ :
 *   - attak.png (sort de dégâts ou attaque banale)
 *   - shield.png (sort qui donne un bouclier — toujours prioritaire)
 *   - prepare.png (sort qui ne fait que du buff / soin / mana)
 *   - wait.png (début du tour, fin du tour, état d'attente)
 */

import { pageState } from './combat-state.js';
import { javaClassToCode } from '../utils/constants.js';

// Voies disposant d'assets sprites dans /styles/sprites/<voieSlug>/
const SPRITE_VOIES = ['conviction', 'violence'];

// Cache buster pour recharger immédiatement les assets graphiques après modification
const SPRITE_VERSION = '1786180000064';

// Durée de maintien de la pose d'action avant retour en "wait" (ms)
const ACTION_POSE_DURATION = 1600;

// Suivi des timers actifs par index de héros pour préserver l'animation lors des re-renders de updateUI
const activeSpriteTimers = new Map();
const activeHeroPoses = new Map();

/**
 * Normalise le nom de la voie en slug de dossier (ex: "Voie de la Conviction" -> "conviction").
 */
export function getVoieSlug(voie) {
    if (!voie) return null;
    const str = typeof voie === 'string' ? voie : (voie.nom || voie.name || '');
    const nom = String(str).toLowerCase();
    if (nom.includes('conviction')) return 'conviction';
    if (nom.includes('consolidation')) return 'consolidation';
    if (nom.includes('création') || nom.includes('creation')) return 'creation';
    if (nom.includes('destruction')) return 'destruction';
    if (nom.includes('raison')) return 'raison';
    if (nom.includes('sûreté') || nom.includes('surete')) return 'surete';
    if (nom.includes('trahison')) return 'trahison';
    if (nom.includes('violence')) return 'violence';
    return null;
}

/**
 * Détermine la pose ('attak' | 'power' | 'weakness' | 'heal' | 'shield' | 'prepare' | 'wait') selon le sort lancé.
 *
 * Pour la Voie de la Violence :
 * 1. Dégâts -> attak.png
 * 2. Buff -> power.png (stat buffs uniquement, un MoT / Mana n'est pas un buff)
 * 3. Débuff -> weakness.png
 * 4. Soin -> heal.png
 * 5. Attente -> wait.png
 * (Et Dead quand il meurt au niveau de renderHeroCombatSprite)
 *
 * Pour la Voie de la Conviction :
 * 1. Bouclier -> TOUJOURS shield.png
 * 2. Dégâts / Débuff offensif -> attak.png
 * 3. Buff / Soin / Mana seul -> prepare.png
 * 4. Attente -> wait.png
 *
 * @param {Object|null} spell - Sort lancé (null = attaque basique)
 * @param {string|null} choiceKey - Clé du choix actif
 * @param {string} voieSlug - Slug de la voie du héros lanceur
 * @returns {string}
 */
export function getSpritePose(spell, choiceKey = null, voieSlug = 'conviction') {
    // Attaque de base sans sort -> toujours attak
    if (!spell) return 'attak';

    const effects = spell.effects || [];
    const activeEffects = effects.filter(e => {
        if (e.requiredChoiceKey == null) return true;
        return String(e.requiredChoiceKey) === String(choiceKey);
    });

    if (activeEffects.length === 0) return 'wait';

    let hasShield = false;
    let hasDamage = false;
    let hasBuff = false;
    let hasDebuff = false;
    let hasHeal = false;
    let hasMana = false;

    for (const e of activeEffects) {
        const rawType = String(e.effectType || e.effect_type || '');
        const mappedType = javaClassToCode[rawType] || rawType;
        const target = String(e.effectTarget || e.effect_target || '').toUpperCase();
        const stat = String(e.statAffected || '').toUpperCase();
        const mod = Number(e.modifier != null ? e.modifier : 0);
        const flat = Number(e.flatValue != null ? e.flatValue : 0);

        // 1. Détection Shield (Bouclier)
        if (mappedType === 'SHIELD' || rawType.includes('Shield')) {
            hasShield = true;
            hasBuff = true;
        }

        // 2. Détection Dégâts
        if (['DAMAGE', 'FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT', 'DAMAGE_OVER_TIME', 'POISON', 'BURN', 'DAMAGE_FIXED', 'DAMAGE_PERCENTAGE'].includes(mappedType) ||
            rawType.includes('Damage') || rawType.includes('Heat')) {
            hasDamage = true;
        }

        // 3. Détection Soins
        if (['HEAL', 'FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT', 'HEAL_OVER_TIME', 'HEAL_FIXED', 'HEAL_PERCENTAGE'].includes(mappedType) || rawType.includes('Heal')) {
            hasHeal = true;
        }

        // 4. Détection Buff / Débuff
        const isEnemyTarget = ['TARGET', 'ALL_ENEMIES', 'ENEMY'].includes(target);
        const isFriendlyTarget = ['CASTER', 'ALLY', 'ALL_ALLIES', 'SELF', 'NONE', ''].includes(target);

        if (mappedType === 'BUFF_DEBUFF' || rawType.includes('Buff')) {
            if (stat === 'POISON' || stat === 'BURN') {
                hasDamage = true;
            } else if (stat === 'MANA') {
                if (isEnemyTarget || mod < 0 || flat < 0) {
                    hasDebuff = true;
                } else {
                    hasMana = true; // Mana n'est pas un buff de stats
                }
            } else if (isEnemyTarget) {
                hasDebuff = true;
            } else if (isFriendlyTarget) {
                if (mod < 0 || flat < 0) {
                    hasDebuff = true;
                } else {
                    hasBuff = true;
                }
            } else {
                if (mod < 0 || flat < 0) {
                    hasDebuff = true;
                } else {
                    hasBuff = true;
                }
            }
        }

        // 5. Mana (Fixed, Percentage, MoT)
        // Règle Grimoire : Un MoT / Mana n'est PAS un buff de stats. Ne doit pas déclencher power.png.
        if (['FIXED_MANA', 'PERCENTAGE_MANA', 'MOT', 'MANA_OVER_TIME', 'MANA_FIXED', 'MANA_PERCENTAGE'].includes(mappedType) || rawType.includes('Mana')) {
            if (isEnemyTarget) {
                hasDebuff = true;
            } else {
                hasMana = true;
            }
        }

        // 6. Purge / Dispel
        if (['PURGE', 'DISPEL'].includes(mappedType) || rawType.includes('Purge') || rawType.includes('Dispel')) {
            if (isEnemyTarget) {
                hasDebuff = true;
            } else {
                hasBuff = true;
            }
        }

        // 7. Bud
        if (['BUD'].includes(mappedType) || rawType.includes('Bud')) {
            hasBuff = true;
        }
    }

    // Ordre de priorité strict pour la Voie de la Violence :
    // 1. Dégâts -> attak.png
    // 2. Buff de stats -> power.png (exclut MoT / Mana)
    // 3. Débuff adverse -> weakness.png
    // 4. Soin -> heal.png
    // 5. Attente / état neutre -> wait.png
    if (voieSlug === 'violence') {
        if (hasDamage) return 'attak';
        if (hasBuff) return 'power';
        if (hasDebuff) return 'weakness';
        if (hasHeal) return 'heal';
        return 'wait';
    }

    // Ordre de priorité pour la Voie de la Conviction (et fallback)
    if (hasShield) return 'shield';
    if (hasDamage || hasDebuff) return 'attak';
    if (hasBuff || hasHeal || hasMana) return 'prepare';
    return 'wait';
}

/**
 * Applique une pose donnée au sprite d'une carte héros (sans style inline).
 */
function applyPoseToSpriteEl(spriteEl, voieSlug, pose) {
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

    // Mise à jour propre des classes CSS
    spriteEl.classList.remove(
        'pose-wait', 'pose-attak', 'pose-shield', 'pose-prepare',
        'pose-dead', 'pose-power', 'pose-weakness', 'pose-heal'
    );
    spriteEl.classList.add(`pose-${pose}`);
}

/**
 * Rendu / mise à jour du sprite d'un héros lors de updateUI().
 * Appelé pour chaque carte .fighter-player dans combat-ui.js.
 *
 * @param {HTMLElement} heroCardEl - Élément .fighter-player
 * @param {Object} player - Données du joueur (session.players[i])
 * @param {boolean} isActive - Le joueur a-t-il la main ?
 * @param {boolean} isDead - Le joueur est-il mort ?
 */
export function renderHeroCombatSprite(heroCardEl, player, isActive, isDead) {
    if (!heroCardEl || !player) return;

    const data = pageState.currentSessionData;
    // Si combat terminé avec victoire, pas besoin du sprite de combat actif
    if (data && data.finished && data.playerWon) {
        const oldSprite = heroCardEl.querySelector('.combat-hero-sprite');
        if (oldSprite) oldSprite.remove();
        return;
    }

    let voieSlug = getVoieSlug(player.voie);
    if (!voieSlug || !SPRITE_VOIES.includes(voieSlug)) {
        if (isDead) {
            voieSlug = 'conviction';
        } else {
            return;
        }
    }

    const heroIndex = parseInt(heroCardEl.dataset.index, 10);

    let spriteEl = heroCardEl.querySelector('.combat-hero-sprite');
    if (!spriteEl) {
        spriteEl = document.createElement('div');
        spriteEl.className = 'combat-hero-sprite';
        heroCardEl.appendChild(spriteEl);
    }

    // Gestion de l'état mort via classe CSS et pose dead.png (Priorité absolue)
    if (isDead) {
        spriteEl.classList.add('is-dead');
        applyPoseToSpriteEl(spriteEl, voieSlug, 'dead');
        return;
    } else {
        spriteEl.classList.remove('is-dead');
    }

    // Si une pose d'action est déjà active sur ce héros, la préserver
    const currentActionPose = activeHeroPoses.get(heroIndex);
    if (currentActionPose && !isDead) {
        applyPoseToSpriteEl(spriteEl, voieSlug, currentActionPose);
    } else {
        // Début de tour / fin de tour / attente -> 'wait'
        applyPoseToSpriteEl(spriteEl, voieSlug, 'wait');
    }
}

/**
 * Déclenche une pose d'action pour le héros actif lors d'un sort ou d'une attaque.
 * Appelé depuis doAction() dans combat-spells.js.
 *
 * @param {number|null} spellId - ID du sort (null = attaque de base)
 * @param {string|null} choiceKey - Clé du choix éventuel
 */
export function triggerCombatActionSprite(spellId = null, choiceKey = null) {
    const data = pageState.currentSessionData;
    if (!data || !data.players) return;

    const activeCard = document.querySelector('.fighter-player.active');
    if (!activeCard) return;

    const heroIndex = parseInt(activeCard.dataset.index, 10);
    const hero = data.players[heroIndex];
    if (!hero) return;
    if ((hero.healthCurrent != null && hero.healthCurrent <= 0) || (hero.pv != null && hero.pv <= 0)) return;

    const voieSlug = getVoieSlug(hero.voie);
    if (!voieSlug || !SPRITE_VOIES.includes(voieSlug)) return;

    // Trouver le sort dans availableSpells si spellId fourni
    let spell = null;
    if (spellId && data.availableSpells) {
        spell = data.availableSpells.find(s => s.id === spellId) || null;
    }

    const pose = getSpritePose(spell, choiceKey, voieSlug);

    let spriteEl = activeCard.querySelector('.combat-hero-sprite');
    if (!spriteEl) {
        spriteEl = document.createElement('div');
        spriteEl.className = 'combat-hero-sprite';
        activeCard.appendChild(spriteEl);
    }

    // Annuler un éventuel timer en cours
    if (activeSpriteTimers.has(heroIndex)) {
        clearTimeout(activeSpriteTimers.get(heroIndex));
        activeSpriteTimers.delete(heroIndex);
    }

    // Enregistrer la pose active
    activeHeroPoses.set(heroIndex, pose);
    applyPoseToSpriteEl(spriteEl, voieSlug, pose);

    // Relancer l'animation CSS (force reflow sur l'image)
    const img = spriteEl.querySelector('img');
    if (img) {
        void img.offsetWidth;
    }

    // Après la durée d'action, retour automatique à "wait" (sauf si mort entre temps)
    const timer = setTimeout(() => {
        activeHeroPoses.delete(heroIndex);
        activeSpriteTimers.delete(heroIndex);
        const currentCard = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
        if (currentCard) {
            const currentHero = data.players[heroIndex];
            if (currentHero && ((currentHero.healthCurrent != null && currentHero.healthCurrent <= 0) || (currentHero.pv != null && currentHero.pv <= 0))) {
                return;
            }
            const currentSprite = currentCard.querySelector('.combat-hero-sprite');
            if (currentSprite) {
                applyPoseToSpriteEl(currentSprite, voieSlug, 'wait');
            }
        }
    }, ACTION_POSE_DURATION);

    activeSpriteTimers.set(heroIndex, timer);
}

/**
 * Force la pose 'wait' sur tous les héros vivants (ex: fin de tour ou nouveau tour).
 */
export function triggerAllWaitSprites() {
    activeSpriteTimers.forEach(t => clearTimeout(t));
    activeSpriteTimers.clear();
    activeHeroPoses.clear();

    const data = pageState.currentSessionData;
    if (!data || !data.players) return;

    document.querySelectorAll('.fighter-player').forEach(card => {
        const idx = parseInt(card.dataset.index, 10);
        const hero = data.players[idx];
        if (!hero) return;
        if ((hero.healthCurrent != null && hero.healthCurrent <= 0) || (hero.pv != null && hero.pv <= 0)) return;

        const voieSlug = getVoieSlug(hero.voie);
        if (!voieSlug || !SPRITE_VOIES.includes(voieSlug)) return;

        const spriteEl = card.querySelector('.combat-hero-sprite');
        if (spriteEl) {
            applyPoseToSpriteEl(spriteEl, voieSlug, 'wait');
        }
    });
}

/**
 * Déclenche l'animation d'action pour un héros à partir d'un log multijoueur.
 * Permet aux coéquipiers de voir les poses animées en temps réel via SSE.
 */
export function handleCombatSpriteLog(logEntry) {
    if (!logEntry || typeof logEntry !== 'string') return;
    const data = pageState.currentSessionData;
    if (!data || !data.players) return;

    // Pattern : "NomJoueur lance NomSort !" ou "NomJoueur attaque NomEnnemi !"
    const lanceMatch = logEntry.match(/^(.*?)\s+lance\s+(.*?)\s*!/);
    const attackMatch = logEntry.match(/^(.*?)\s+attaque\s+(.*?)\s*!/);

    let heroName = null;
    let spellName = null;
    let isBasicAttack = false;

    if (lanceMatch) {
        heroName = lanceMatch[1].trim();
        spellName = lanceMatch[2].trim();
    } else if (attackMatch) {
        heroName = attackMatch[1].trim();
        isBasicAttack = true;
    }

    if (!heroName) return;

    // Ne pas re-déclencher pour le joueur local (déjà fait au clic)
    if (pageState.currentUsername && heroName === pageState.currentUsername) {
        return;
    }

    const heroIndex = data.players.findIndex(p => p.name === heroName);
    if (heroIndex === -1) return;

    const hero = data.players[heroIndex];
    if ((hero.healthCurrent != null && hero.healthCurrent <= 0) || (hero.pv != null && hero.pv <= 0)) return;

    const voieSlug = getVoieSlug(hero.voie);
    if (!voieSlug || !SPRITE_VOIES.includes(voieSlug)) return;

    const card = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
    if (!card) return;

    let pose = 'attak';
    if (!isBasicAttack && spellName && data.availableSpells) {
        const spell = data.availableSpells.find(s => s.nom === spellName) || null;
        if (spell) {
            pose = getSpritePose(spell, null, voieSlug);
        }
    }

    let spriteEl = card.querySelector('.combat-hero-sprite');
    if (!spriteEl) {
        spriteEl = document.createElement('div');
        spriteEl.className = 'combat-hero-sprite';
        card.appendChild(spriteEl);
    }

    if (activeSpriteTimers.has(heroIndex)) {
        clearTimeout(activeSpriteTimers.get(heroIndex));
        activeSpriteTimers.delete(heroIndex);
    }

    activeHeroPoses.set(heroIndex, pose);
    applyPoseToSpriteEl(spriteEl, voieSlug, pose);

    const timer = setTimeout(() => {
        activeHeroPoses.delete(heroIndex);
        activeSpriteTimers.delete(heroIndex);
        const cCard = document.querySelector(`.fighter-player[data-index="${heroIndex}"]`);
        if (cCard) {
            const currentHero = data.players[heroIndex];
            if (currentHero && ((currentHero.healthCurrent != null && currentHero.healthCurrent <= 0) || (currentHero.pv != null && currentHero.pv <= 0))) {
                return;
            }
            const cSprite = cCard.querySelector('.combat-hero-sprite');
            if (cSprite) applyPoseToSpriteEl(cSprite, voieSlug, 'wait');
        }
    }, ACTION_POSE_DURATION);

    activeSpriteTimers.set(heroIndex, timer);
}
