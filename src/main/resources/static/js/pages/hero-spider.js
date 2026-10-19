/**
 * hero-spider.js
 * Calcule et affiche la toile d'araignée radar des spécificités d'un héros
 * basée sur les sorts de sa Voie.
 */

'use strict';

(function () {
    const SPIDER_AXES = [
        { key: 'puissance', label: 'Puissance', color: '#a855f7' },
        { key: 'force',     label: 'Force',     color: '#ef4444' },
        { key: 'mana',      label: 'Mana',      color: '#38bdf8' },
        { key: 'tank',      label: 'Tank',      color: '#60a5fa' },
        { key: 'soutien',   label: 'Soutien',   color: '#34d399' }
    ];

    const SPEC_BADGES = [
        { key: 'berserk',         label: 'Berserk',         icon: 'bloodtype',             cssClass: 'badge-berserk',         desc: 'Sorts basés sur les PV manquants',   score: s => s._berserkScore },
        { key: 'puits_sans_fond', label: 'Puits sans fond', icon: 'cyclone',               cssClass: 'badge-puits-sans-fond', desc: 'Sorts basés sur le Mana manquant',  score: s => s._manaMissingScore },
        { key: 'brulant',         label: 'Brûlant',         icon: 'local_fire_department', cssClass: 'badge-brulant',         desc: 'Inflige des brûlures',              score: s => s._burnCount * 2 },
        { key: 'toxique',         label: 'Toxique',         icon: 'skull',                 cssClass: 'badge-toxique',         desc: 'Inflige du poison',                 score: s => s._poisonCount * 2 },
        { key: 'tactique',        label: 'Tactique',        icon: 'gps_fixed',             cssClass: 'badge-tactique',        desc: 'Exploite ou augmente le Critique',  score: s => (s._critScore >= 4 ? s._critScore : 0) },
        { key: 'arcane',          label: 'Arcane',          icon: 'auto_awesome',          cssClass: 'badge-arcane',          desc: 'Capacité régénérative ou utilitaire lié au Mana',      score: s => s._arcaneScore },
        { key: 'tank',            label: 'Tank',            icon: 'shield',                cssClass: 'badge-tank',            desc: 'Boucliers et armure/résistance sur soi',       score: s => s._tankScore },
        { key: 'vif',             label: 'Vif',             icon: 'bolt',                  cssClass: 'badge-vif',             desc: 'Vitesse et vivacité',               score: s => s._speedScore },
        { key: 'erosion',         label: 'Érosion',         icon: 'heart_minus',           cssClass: 'badge-erosion',         desc: 'Pénétration et casse-bouclier',     score: s => s._erosionScore },
        { key: 'guerisseur',      label: 'Guérisseur',      icon: 'healing',               cssClass: 'badge-guerisseur',      desc: 'Spécialiste du soin',        score: s => s._healScore },
        { key: 'entrave',         label: 'Entrave',         icon: 'lock',                  cssClass: 'badge-entrave',         desc: 'Ralentit et affaiblit les ennemis', score: s => s._entraveScore },
        { key: 'protecteur',      label: 'Protecteur',      icon: 'shield_person',         cssClass: 'badge-protecteur',      desc: 'Boucliers conférés aux alliés',     score: s => s._protecteurScore }
    ];

    // Cache des analyses par voieId
    const voieProfiles = {};
    const globalAxisMax = {
        puissance: 1, force: 1, mana: 1, tank: 1, soutien: 1
    };
    let spiritualitesCache = [];
    let isInitialized = false;

    function analyzeEffect(effect, sc) {
        const type = effect.effectType || '';
        const target = effect.effectTarget || 'TARGET';
        const isAlly = ['CASTER', 'ALLY', 'ALL_ALLIES'].includes(target);
        const isEnemy = ['TARGET', 'ALL_ENEMIES', 'ALL_COMBATANTS'].includes(target);
        const isSelf = target === 'CASTER';
        const allSources = [effect.damageSource, effect.healSource, effect.manaSource, effect.shieldSource, effect.source, effect.modifierSource].filter(Boolean).join(' ');
        const src = allSources;

        // 1. Puissance: ratio puissance ou buff puissance
        if (src.includes('POWER') && !src.includes('PHYSICAL')) sc.puissance += (effect.ratio || 1);
        if (type === 'BUFF_DEBUFF' && effect.statAffected === 'POWER') sc.puissance += 0.5;

        // 2. Force: ratio force ou buff force
        if (src.includes('PHYSICAL_POWER')) sc.force += (effect.ratio || 1);
        if (type === 'BUFF_DEBUFF' && effect.statAffected === 'STRENGTH') sc.force += 0.5;

        // 3. Mana: gain mana, mot, buff mana, ratio Mana
        const isMana = ['FIXED_MANA', 'PERCENTAGE_MANA', 'MOT'].includes(type);
        const isManaBD = type === 'BUFF_DEBUFF' && effect.statAffected === 'MANA';
        if (isMana || isManaBD) sc.mana += 1;
        if (src.includes('MANA')) sc.mana += (effect.ratio || 1);

        // 4. Tank: bouclier, buff positif armure/résistance
        const isShield = type === 'SHIELD';
        const isArmorBD = type === 'BUFF_DEBUFF' && ['ARMURE', 'RESISTANCE', 'ARMOR', 'RESIST'].some(s => (effect.statAffected || '').includes(s));
        const isArmorPos = isArmorBD && (isSelf || isAlly) && ((effect.modifier || 0) > 0 || (effect.flatValue || 0) > 0);
        if (isShield || isArmorPos) sc.tank += 1;

        // 5. Soutien: buff allié, débuff ennemi, et soins/mana support
        const isHeal = ['FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT'].includes(type);
        const isBufPos = type === 'BUFF_DEBUFF' && (effect.flatValue > 0 || effect.modifier > 0);
        const isDebufNeg = type === 'BUFF_DEBUFF' && (effect.flatValue < 0 || effect.modifier < 0);
        if (isAlly && !isSelf && (isBufPos || isShield || isHeal || isMana)) sc.soutien += 1;
        if (isEnemy && (isDebufNeg || ['DOT', 'BURN', 'POISON'].includes(type))) sc.soutien += 1;
        if ((isAlly || isSelf) && (isHeal || isMana)) sc.soutien += 1;

        // Badges scores
        // Berserk : sorts basés sur les PV manquants (dégâts, boucliers, soins, buffs de stats)
        if (allSources.includes('HEALTH_MISSING')) sc._berserkScore++;

        // Puits sans fond : sorts basés sur le Mana manquant
        if (allSources.includes('MANA_MISSING')) sc._manaMissingScore++;

        // Tactique : sort qui scale sur le Critique (CASTER_CRIT) ou buff crit positif sur soi/allié (pas de débuff sur cible ennemie)
        const isCritScale = allSources.includes('CRIT');
        const isCritBuff = type === 'BUFF_DEBUFF' && effect.statAffected === 'CRIT' && (isAlly || isSelf) && ((effect.modifier || 0) > 0 || (effect.flatValue || 0) > 0);
        if (isCritScale || isCritBuff) sc._critScore++;

        if (isMana && (isAlly || isSelf)) sc._arcaneScore++;

        // Tank badge : bouclier sur soi, armure/résistance positive sur soi, ou buff de bouclier reçu/donné sur soi
        const isShieldSelf = isShield && isSelf;
        const isArmorBuffSelf = isArmorBD && isSelf && ((effect.modifier || 0) > 0 || (effect.flatValue || 0) > 0);
        const isShieldBuffSelf = type === 'BUFF_DEBUFF' && isSelf && ['SHIELD_GIVEN', 'SHIELD_RECEIVED', 'SHIELD'].includes(effect.statAffected || '') && ((effect.modifier || 0) > 0 || (effect.flatValue || 0) > 0);
        if (isShieldSelf || isArmorBuffSelf || isShieldBuffSelf) sc._tankScore++;

        // Protecteur : boucliers conférés aux alliés
        const isShieldAlly = isShield && (target === 'ALLY' || target === 'ALL_ALLIES');
        if (isShieldAlly) sc._protecteurScore += (target === 'ALL_ALLIES' ? 2 : 1.5);

        // Vif : boost de vitesse sur soi ou allié (pas ralentissement ennemi)
        const isSpeedBuff = (allSources.includes('SPEED') && (isAlly || isSelf)) || (type === 'BUFF_DEBUFF' && effect.statAffected === 'SPEED' && (isAlly || isSelf) && ((effect.modifier || 0) > 0 || (effect.flatValue || 0) > 0));
        if (isSpeedBuff) sc._speedScore++;

        // Érosion : strictement perforation/pénétration de bouclier, dégâts accrus aux boucliers, ou réduction directe de bouclier ennemi
        const isShieldPierced = type === 'BUFF_DEBUFF' && ((effect.statAffected || '').includes('SHIELD_PIERCED') || (effect.statAffected || '').includes('SHIELD_PENETRATION'));
        const isDamageToShield = type === 'BUFF_DEBUFF' && (effect.statAffected || '').includes('TO_SHIELD');
        const isEnemyShieldReduction = type === 'BUFF_DEBUFF' && isEnemy && (effect.statAffected || '').includes('SHIELD') && ((effect.modifier || 0) < 0 || (effect.flatValue || 0) < 0);
        if (isShieldPierced || isDamageToShield || isEnemyShieldReduction) sc._erosionScore++;

        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'BURN' || type === 'BURN')) sc._burnCount++;
        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'POISON' || type === 'POISON')) sc._poisonCount++;
        if (isHeal) sc._healScore += (target === 'ALL_ALLIES' ? 2 : 1);

        // Entrave : ralentissement vitesse, réduction dégâts/puissance infligés, réduction crit ennemie
        const isSlow = type === 'BUFF_DEBUFF' && effect.statAffected === 'SPEED' && isEnemy && ((effect.modifier || 0) < 0 || (effect.flatValue || 0) < 0);
        const isDamageDebuff = type === 'BUFF_DEBUFF' && isEnemy && ((effect.modifier || 0) < 0 || (effect.flatValue || 0) < 0) && ((effect.statAffected || '').includes('DAMAGE_GIVEN') || effect.statAffected === 'POWER' || effect.statAffected === 'STRENGTH');
        const isCritDebuff = type === 'BUFF_DEBUFF' && effect.statAffected === 'CRIT' && isEnemy && ((effect.modifier || 0) < 0 || (effect.flatValue || 0) < 0);
        if (isSlow) sc._entraveScore += 2;
        if (isDamageDebuff || isCritDebuff) sc._entraveScore += 1;
    }

    function createEmptyProfile(voieId, voieNom, description, passiveDescription) {
        return {
            id: voieId,
            nom: voieNom || '',
            description: description || '',
            passiveDescription: passiveDescription || '',
            puissance: 0, force: 0, mana: 0, tank: 0, soutien: 0,
            _berserkScore: 0, _manaMissingScore: 0, _burnCount: 0, _poisonCount: 0, _critScore: 0,
            _arcaneScore: 0, _tankScore: 0, _speedScore: 0, _erosionScore: 0, _healScore: 0,
            _entraveScore: 0, _protecteurScore: 0
        };
    }

    async function loadAllVoieProfiles() {
        if (isInitialized) return;
        try {
            const fetcher = window.globalFetch || fetch;
            const [resSpells, resMeta] = await Promise.allSettled([
                fetcher('/api/spells-editor'),
                fetcher('/api/spells-editor/meta')
            ]);
            if (resMeta.status === 'fulfilled' && resMeta.value && resMeta.value.ok) {
                const meta = await resMeta.value.json();
                spiritualitesCache = meta.spiritualites || [];
            }
            if (resSpells.status === 'fulfilled' && resSpells.value && resSpells.value.ok) {
                const spells = await resSpells.value.json();
                spells.filter(s => s.voie && s.voie.id).forEach(s => {
                    const vId = s.voie.id;
                    if (!voieProfiles[vId]) {
                        voieProfiles[vId] = createEmptyProfile(vId, s.voie.nom, s.voie.description, s.voie.passiveDescription);
                    } else {
                        if (!voieProfiles[vId].description && s.voie.description) {
                            voieProfiles[vId].description = s.voie.description;
                        }
                        if (!voieProfiles[vId].passiveDescription && s.voie.passiveDescription) {
                            voieProfiles[vId].passiveDescription = s.voie.passiveDescription;
                        }
                    }
                    (s.effects || []).forEach(e => analyzeEffect(e, voieProfiles[vId]));
                });

                // Calculer les maximums globaux pour chaque axe
                SPIDER_AXES.forEach(a => {
                    const max = Math.max(...Object.values(voieProfiles).map(v => v[a.key] || 0), 1);
                    globalAxisMax[a.key] = max;
                });

                isInitialized = true;
            }
        } catch (e) {
            console.error('[hero-spider] Erreur chargement sorts / meta:', e);
        }
    }

    async function getProfileForVoie(voieId) {
        if (!isInitialized) {
            await loadAllVoieProfiles();
        }
        if (voieProfiles[voieId]) {
            return voieProfiles[voieId];
        }

        // Si la voie n'était pas dans le cache, la charger spécifiquement
        try {
            const fetcher = window.globalFetch || fetch;
            const res = await fetcher(`/api/spells-editor/voie/${voieId}`);
            if (res.ok) {
                const spells = await res.json();
                const prof = createEmptyProfile(
                    voieId,
                    spells[0]?.voie?.nom || '',
                    spells[0]?.voie?.description,
                    spells[0]?.voie?.passiveDescription
                );
                spells.forEach(s => {
                    (s.effects || []).forEach(e => analyzeEffect(e, prof));
                });
                voieProfiles[voieId] = prof;
                return prof;
            }
        } catch (e) {
            console.error('[hero-spider] Erreur chargement voie:', e);
        }
        return null;
    }

    function getSpiritType(spiritOrId) {
        if (!spiritOrId) return null;
        let nom = '';
        if (typeof spiritOrId === 'object' && spiritOrId.nom) {
            nom = spiritOrId.nom;
        } else {
            const s = findSpirit(spiritOrId);
            if (s && s.nom) {
                nom = s.nom;
            } else if (typeof spiritOrId === 'string') {
                nom = spiritOrId;
            }
        }
        if (!nom) return null;
        const clean = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (clean.includes('esprit')) return 'ESPRIT';
        if (clean.includes('tenebre')) return 'TENEBRES';
        if (clean.includes('karma')) return 'KARMA';
        return null;
    }

    function isAxisExtended(spiritType, key) {
        if (spiritType === 'ESPRIT') {
            return key === 'mana' || key === 'tank' || key === 'soutien';
        }
        if (spiritType === 'TENEBRES') {
            return key === 'puissance' || key === 'force';
        }
        if (spiritType === 'KARMA') {
            return true;
        }
        return false;
    }

    function computeAxisTargetNorm(rawVal, maxVal, isExtended, isKarma) {
        // Échelle de base à 80% pour permettre à l'extension d'aller jusqu'au bord (100%)
        const baseNorm = (maxVal > 0) ? Math.min(1, Math.max(0, rawVal / maxVal)) * 0.80 : 0;
        if (!isExtended) return baseNorm;
        if (isKarma) {
            // Karma étend tout mais un peu moins (+0.11 ou +0.10 si base nulle)
            const bonus = (baseNorm === 0) ? 0.10 : 0.11;
            return Math.min(1.0, baseNorm + bonus);
        } else {
            // Esprit (mana, tank, soutien) ou Ténèbres (puissance, force) : bonus ciblé (+0.20 ou +0.18 si base nulle)
            const bonus = (baseNorm === 0) ? 0.18 : 0.20;
            return Math.min(1.0, baseNorm + bonus);
        }
    }

    function renderSpiderFrame(canvas, norms, isExtendedList, spiritType) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const R = Math.min(W, H) / 2 - 34;
        const N = SPIDER_AXES.length;

        ctx.clearRect(0, 0, W, H);

        const angle = i => (Math.PI * 2 * i / N) - Math.PI / 2;
        const pt = (i, r) => ({ x: cx + Math.cos(angle(i)) * r, y: cy + Math.sin(angle(i)) * r });

        // Grille polygonale (4 cercles concentriques: 25%, 50%, 75%, 100%)
        for (let ring = 1; ring <= 4; ring++) {
            ctx.beginPath();
            for (let i = 0; i < N; i++) {
                const p = pt(i, R * ring / 4);
                i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.strokeStyle = ring === 4 ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.15)';
            ctx.lineWidth = ring === 4 ? 1.5 : 1;
            ctx.stroke();
        }

        // Rayons depuis le centre
        for (let i = 0; i < N; i++) {
            const p = pt(i, R);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Zone polygonale des scores
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const norm = norms[i] || 0;
            const p = pt(i, Math.max(norm * R, 5));
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();

        // Dégradé radial avec teinte adaptée à la spiritualité active
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        if (spiritType === 'ESPRIT') {
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
            grad.addColorStop(0.65, 'rgba(96, 165, 250, 0.35)');
            grad.addColorStop(1, 'rgba(52, 211, 153, 0.15)');
        } else if (spiritType === 'TENEBRES') {
            grad.addColorStop(0, 'rgba(168, 85, 247, 0.65)');
            grad.addColorStop(0.65, 'rgba(239, 68, 68, 0.35)');
            grad.addColorStop(1, 'rgba(192, 132, 252, 0.15)');
        } else if (spiritType === 'KARMA') {
            grad.addColorStop(0, 'rgba(231, 209, 152, 0.65)');
            grad.addColorStop(0.65, 'rgba(245, 158, 11, 0.35)');
            grad.addColorStop(1, 'rgba(139, 92, 246, 0.15)');
        } else {
            grad.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
            grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
        }
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = spiritType === 'ESPRIT' ? 'rgba(56, 189, 248, 0.95)'
                        : spiritType === 'TENEBRES' ? 'rgba(192, 132, 252, 0.95)'
                        : spiritType === 'KARMA' ? 'rgba(245, 158, 11, 0.95)'
                        : 'rgba(192, 132, 252, 0.9)';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Points de repère aux sommets
        for (let i = 0; i < N; i++) {
            const axis = SPIDER_AXES[i];
            const norm = norms[i] || 0;
            const isExt = isExtendedList ? isExtendedList[i] : false;
            const p = pt(i, Math.max(norm * R, 5));

            ctx.beginPath();
            ctx.arc(p.x, p.y, isExt ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = axis.color;
            ctx.fill();
            ctx.strokeStyle = isExt ? '#fef08a' : '#ffffff';
            ctx.lineWidth = isExt ? 2 : 1;
            ctx.stroke();
        }

        // Labels des axes
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < N; i++) {
            const axis = SPIDER_AXES[i];
            const isExt = isExtendedList ? isExtendedList[i] : false;
            const p = pt(i, R + 20);
            ctx.font = isExt ? '700 11px Outfit, Inter, sans-serif' : '600 11px Outfit, Inter, sans-serif';
            ctx.fillStyle = axis.color;
            ctx.fillText(axis.label + (isExt ? ' ✦' : ''), p.x, p.y);
        }
    }

    function drawSpiderWeb(canvas, profile, spiritOrId, animate = false) {
        if (!canvas) return;

        const spiritType = getSpiritType(spiritOrId);
        const isKarma = spiritType === 'KARMA';

        const N = SPIDER_AXES.length;
        const targetNorms = [];
        const isExtendedList = [];

        for (let i = 0; i < N; i++) {
            const axis = SPIDER_AXES[i];
            const maxVal = globalAxisMax[axis.key] || 1;
            const rawVal = profile ? (profile[axis.key] || 0) : 0;
            const isExt = profile ? isAxisExtended(spiritType, axis.key) : false;
            const norm = computeAxisTargetNorm(rawVal, maxVal, isExt, isKarma);
            targetNorms.push(norm);
            isExtendedList.push(isExt);
        }

        const isFirstSelection = !canvas._spiderState || !canvas._spiderState.currentNorms;
        if (!canvas._spiderState) {
            canvas._spiderState = {
                currentNorms: new Array(N).fill(0),
                animId: null
            };
        }

        if (canvas._spiderState.animId) {
            cancelAnimationFrame(canvas._spiderState.animId);
            canvas._spiderState.animId = null;
        }

        if (!animate) {
            canvas._spiderState.currentNorms = [...targetNorms];
            renderSpiderFrame(canvas, targetNorms, isExtendedList, spiritType);
            return;
        }

        // Animation fluide : départ du centre (0) lors de la première sélection de voie,
        // ou transition douce depuis la forme actuelle en cas de changement de voie / spiritualité
        const startNorms = isFirstSelection ? new Array(N).fill(0) : [...canvas._spiderState.currentNorms];
        const startTime = performance.now();
        const duration = isFirstSelection ? 360 : 280;

        // Afficher immédiatement l'état initial (centre ou forme précédente)
        renderSpiderFrame(canvas, startNorms, isExtendedList, spiritType);

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            const interpolated = startNorms.map((start, idx) => start + (targetNorms[idx] - start) * ease);
            canvas._spiderState.currentNorms = interpolated;
            renderSpiderFrame(canvas, interpolated, isExtendedList, spiritType);
            if (t < 1) {
                canvas._spiderState.animId = requestAnimationFrame(step);
            } else {
                canvas._spiderState.animId = null;
                canvas._spiderState.currentNorms = [...targetNorms];
            }
        }

        canvas._spiderState.animId = requestAnimationFrame(step);
    }

    function renderBadges(container, profile) {
        if (!container) return;
        container.innerHTML = '';
        if (!profile) return;

        const badges = SPEC_BADGES
            .map(b => ({
                key: b.key,
                label: b.label,
                icon: b.icon,
                desc: b.desc,
                cssClass: b.cssClass,
                val: b.score(profile)
            }))
            .filter(b => b.val >= 1.5)
            .sort((a, b) => b.val - a.val)
            .slice(0, 3);

        if (badges.length === 0) {
            const noBadge = document.createElement('span');
            noBadge.className = 'text-xs text-muted font-italic';
            noBadge.textContent = 'Polyvalent / Aucune spécificité dominante';
            container.appendChild(noBadge);
            return;
        }

        badges.forEach(b => {
            const badgeEl = document.createElement('span');
            badgeEl.className = `armory-spec-badge ${b.cssClass}`;
            badgeEl.title = b.desc;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'material-symbols-outlined text-sm';
            iconSpan.textContent = b.icon;

            const textSpan = document.createElement('span');
            textSpan.textContent = b.label;

            badgeEl.appendChild(iconSpan);
            badgeEl.appendChild(textSpan);
            container.appendChild(badgeEl);
        });
    }

    function getVoieVisual(nom) {
        if (!nom) return { icon: 'trip_origin', color: '#94a3b8' };
        const n = nom.toLowerCase();
        if (n.includes('raison')) return { icon: 'psychology', color: '#3b82f6' };
        if (n.includes('sûreté') || n.includes('surete')) return { icon: 'water_drop', color: '#00e5cc' };
        if (n.includes('trahison')) return { icon: 'visibility_off', color: '#ed5677' };
        if (n.includes('consolidation')) return { icon: 'foundation', color: '#99674c' };
        if (n.includes('conviction')) return { icon: 'volcano', color: '#b74c0b' };
        if (n.includes('création') || n.includes('creation')) return { icon: 'eco', color: '#10b981' };
        if (n.includes('destruction')) return { icon: 'local_fire_department', color: '#ff0000' };
        if (n.includes('violence')) return { icon: 'explosion', color: '#a70740' };
        return { icon: 'route', color: '#94a3b8' };
    }

    function populateVoieTooltip(iconEl, profile) {
        if (!iconEl) return;
        if (!profile || !profile.nom) {
            iconEl.classList.add('hidden');
            return;
        }

        if ((!profile.description || !profile.passiveDescription) && window.pageState && window.pageState.voies) {
            const vState = window.pageState.voies.find(x => x.id == profile.id || x.nom === profile.nom);
            if (vState) {
                profile.description = profile.description || vState.description;
                profile.passiveDescription = profile.passiveDescription || vState.passiveDescription;
            }
        }

        const visual = (typeof getVoieInfo === 'function' ? getVoieInfo(profile.nom) : null) || getVoieVisual(profile.nom);
        const template = iconEl.querySelector('.tooltip-data');
        if (template) {
            const richFormatter = window.formatRichText || (t => t);
            template.innerHTML = `
                <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${visual.color};">
                    <span class="material-symbols-outlined text-lg">${visual.icon}</span>
                    ${profile.nom}
                </div>
                <div class="text-xs text-slate-300 mb-2">${profile.description || 'Description générique.'}</div>
                <div class="flex-start-gap text-xs text-slate-200">
                    <span class="material-symbols-outlined text-md" style="color: ${visual.color};">bolt</span>
                    <span class="font-italic whitespace-pre-wrap">${richFormatter(profile.passiveDescription) || 'Passif spécifique.'}</span>
                </div>
            `;
        }
        iconEl.classList.remove('hidden');
    }

    function findSpirit(sOrId) {
        if (!sOrId) return null;
        if (typeof sOrId === 'object' && sOrId.nom) return sOrId;
        const id = sOrId;
        const list = (window.pageState?.spiritualites && window.pageState.spiritualites.length > 0)
            ? window.pageState.spiritualites
            : spiritualitesCache;
        return list.find(x => x.id == id || x.nom === id);
    }

    function populateSpiritTooltip(iconEl, s) {
        if (!iconEl) return;
        if (!s || !s.nom) {
            iconEl.classList.add('hidden');
            return;
        }

        const visual = (typeof getSpiritInfo === 'function' ? getSpiritInfo(s.nom) : null) || { icon: 'psychology', color: '#a78bfa' };
        const template = iconEl.querySelector('.tooltip-data');
        if (template) {
            const richFormatter = window.formatRichText || (t => t);
            template.innerHTML = `
                <div class="text-sm font-medium mb-2 flex-center gap-1" style="color: ${visual.color};">
                    <span class="material-symbols-outlined text-lg">${visual.icon}</span>
                    ${s.nom}
                </div>
                <div class="text-xs text-slate-300 mb-2">${s.description || 'Description générique.'}</div>
                <div class="flex-start-gap text-xs text-slate-200">
                    <span class="material-symbols-outlined text-md" style="color: ${visual.color};">bolt</span>
                    <span class="font-italic whitespace-pre-wrap">${richFormatter(s.passiveDescription) || 'Passif spécifique.'}</span>
                </div>
            `;
        }
        iconEl.classList.remove('hidden');
    }

    window.updateArmorySpiritSpider = async function (spiritOrId) {
        const spiderSpiritIconEl = document.getElementById('spiderSpiritInfoIcon');
        if (!spiderSpiritIconEl) return;
        if (!spiritOrId) {
            spiderSpiritIconEl.classList.add('hidden');
            return;
        }
        let s = findSpirit(spiritOrId);
        if (!s && spiritualitesCache.length === 0) {
            await loadAllVoieProfiles();
            s = findSpirit(spiritOrId);
        }
        if (s) {
            populateSpiritTooltip(spiderSpiritIconEl, s);
        } else {
            spiderSpiritIconEl.classList.add('hidden');
        }
    };

    // Exposer l'API globale pour l'armurerie
    window.updateArmoryVoieSpider = async function (voieId, spiritId, animate = true) {
        const section = document.getElementById('armorySpiderSection');
        const canvas = document.getElementById('armorySpiderCanvas');
        const badges = document.getElementById('armorySpecBadges');
        const spiderIconEl = document.getElementById('spiderVoieInfoIcon');
        const spiderSpiritIconEl = document.getElementById('spiderSpiritInfoIcon');
        if (!section || !canvas || !badges) return;

        const effectiveVoie = (voieId !== undefined && voieId !== null && voieId !== '') ? voieId : document.getElementById('charVoie')?.value;
        const effectiveSpirit = (spiritId !== undefined && spiritId !== null && spiritId !== '') ? spiritId : document.getElementById('charSpirit')?.value;

        if (!effectiveVoie) {
            if (spiderIconEl) spiderIconEl.classList.add('hidden');
            if (spiderSpiritIconEl) spiderSpiritIconEl.classList.add('hidden');
            section.classList.add('is-hidden');
            section.classList.remove('is-visible');
            if (canvas._spiderState) {
                if (canvas._spiderState.animId) cancelAnimationFrame(canvas._spiderState.animId);
                canvas._spiderState = null;
            }
            return;
        }

        section.classList.remove('is-hidden');
        section.classList.add('is-visible');

        const profile = await getProfileForVoie(effectiveVoie);
        if (spiderIconEl && profile) {
            populateVoieTooltip(spiderIconEl, profile);
        }

        if (effectiveSpirit && spiderSpiritIconEl) {
            let s = findSpirit(effectiveSpirit);
            if (!s && spiritualitesCache.length === 0) {
                await loadAllVoieProfiles();
                s = findSpirit(effectiveSpirit);
            }
            if (s) populateSpiritTooltip(spiderSpiritIconEl, s);
            else spiderSpiritIconEl.classList.add('hidden');
        } else if (spiderSpiritIconEl) {
            spiderSpiritIconEl.classList.add('hidden');
        }

        drawSpiderWeb(canvas, profile, effectiveSpirit, animate);
        renderBadges(badges, profile);
    };

    window.openSpecModal = async function (arg1, heroName, voieNom, spiritId) {
        const overlay = document.getElementById('specModalOverlay');
        const titleEl = document.getElementById('specModalTitle');
        const canvas = document.getElementById('specModalCanvas');
        const badges = document.getElementById('specModalBadges');
        const badgesRow = document.getElementById('specModalAffiliationBadges');
        if (!overlay || !canvas || !badges) return;

        // Récupérer le personnage si disponible
        let perso = null;
        if (window.pageState && window.pageState.personnages) {
            perso = window.pageState.personnages.find(p => p.id == arg1 || p.name === arg1 || (heroName && p.name === heroName));
        }

        const displayName = (perso && perso.name) || heroName || (typeof arg1 === 'string' ? arg1 : 'Héros');
        let effectiveVoieId = (perso && perso.voie) ? perso.voie.id : (typeof arg1 === 'number' && !perso ? arg1 : null);
        if (!effectiveVoieId && voieNom && window.pageState && window.pageState.voies) {
            const vObj = window.pageState.voies.find(v => v.nom === voieNom);
            if (vObj) effectiveVoieId = vObj.id;
        }
        const effectiveSpirit = (perso && perso.spiritualite) ? perso.spiritualite : spiritId;

        if (titleEl) {
            titleEl.textContent = displayName;
        }

        if (badgesRow) {
            badgesRow.innerHTML = '';
            if (perso && typeof window.buildCharBadgesHtml === 'function') {
                badgesRow.innerHTML = window.buildCharBadgesHtml(perso);
            }
        }

        overlay.classList.add('active');

        if (!effectiveVoieId) {
            drawSpiderWeb(canvas, null, effectiveSpirit, false);
            badges.innerHTML = '<span class="text-xs text-muted font-italic">Aucune voie affiliée.</span>';
            return;
        }

        const profile = await getProfileForVoie(effectiveVoieId);
        drawSpiderWeb(canvas, profile, effectiveSpirit, false);
        renderBadges(badges, profile);
    };


    window.closeSpecModal = function () {
        const overlay = document.getElementById('specModalOverlay');
        const canvas = document.getElementById('specModalCanvas');
        if (canvas && canvas._spiderState) {
            if (canvas._spiderState.animId) cancelAnimationFrame(canvas._spiderState.animId);
            canvas._spiderState = null;
        }
        if (overlay) overlay.classList.remove('active');
    };

    // Préchargement discret des données dès le DOM prêt
    document.addEventListener('DOMContentLoaded', () => {
        loadAllVoieProfiles();
    });
})();
