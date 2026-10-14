/**
 * hero-spider.js
 * Calcule et affiche la toile d'araignée radar des spécificités d'un héros
 * basée sur les sorts de sa Voie.
 */

'use strict';

(function () {
    const SPIDER_AXES = [
        { key: 'puissance',   label: 'Puissance', color: '#a855f7' },
        { key: 'force',       label: 'Force',     color: '#ef4444' },
        { key: 'pv',          label: 'PV',        color: '#ec4899' },
        { key: 'mana',        label: 'Mana',      color: '#38bdf8' },
        { key: 'armure',      label: 'Armure',    color: '#60a5fa' },
        { key: 'soutien',     label: 'Soutien',   color: '#34d399' },
        { key: 'depouilleur', label: 'Dépouill.', color: '#f97316' },
        { key: 'independant', label: 'Indépend.', color: '#facc15' },
        { key: 'support',     label: 'Support',   color: '#a3e635' }
    ];

    const SPEC_BADGES = [
        { key: 'berserk',     label: 'Berserk',     icon: '🩸', cssClass: 'badge-berserk',     desc: 'Sorts basés sur PV/Mana manquants', score: s => s._berserkScore },
        { key: 'brulant',     label: 'Brûlant',     icon: '🔥', cssClass: 'badge-brulant',     desc: 'Inflige des brûlures',              score: s => s._burnCount * 2 },
        { key: 'toxique',     label: 'Toxique',     icon: '☠️', cssClass: 'badge-toxique',     desc: 'Inflige du poison',                 score: s => s._poisonCount * 2 },
        { key: 'tactique',    label: 'Tactique',    icon: '🎯', cssClass: 'badge-tactique',    desc: 'Exploite ou augmente le Critique',  score: s => s._critScore },
        { key: 'tranchant',   label: 'Tranchant',   icon: '⚔️', cssClass: 'badge-tranchant',   desc: 'Dégâts directs fixes sans ratio',   score: s => s._fixedDmgScore },
        { key: 'arcane',      label: 'Arcane',      icon: '💠', cssClass: 'badge-arcane',      desc: 'Flux et régénération de Mana',      score: s => s._arcaneScore },
        { key: 'tank',        label: 'Tank',        icon: '🛡️', cssClass: 'badge-tank',        desc: 'Boucliers et armure sur soi',       score: s => s._tankScore },
        { key: 'preci',       label: 'Précis',      icon: '🏹', cssClass: 'badge-preci',       desc: 'Spécialiste monocible ciblé',       score: s => s._preciScore },
        { key: 'devastateur', label: 'Dévastateur', icon: '💥', cssClass: 'badge-devastateur', desc: 'Dégâts multicibles (AoE)',          score: s => s._aoeScore },
        { key: 'vif',         label: 'Vif',         icon: '⚡', cssClass: 'badge-vif',         desc: 'Vitesse et vivacité',               score: s => s._speedScore },
        { key: 'erosion',     label: 'Érosion',     icon: '🔱', cssClass: 'badge-erosion',     desc: 'Pénétration et casse-bouclier',     score: s => s._erosionScore },
        { key: 'guerisseur',  label: 'Guérisseur',  icon: '🌿', cssClass: 'badge-guerisseur',  desc: 'Spécialiste du soin et HoT',        score: s => s._healScore }
    ];

    // Cache des analyses par voieId
    const voieProfiles = {};
    const globalAxisMax = {
        puissance: 1, force: 1, pv: 1, mana: 1, armure: 1,
        soutien: 1, depouilleur: 1, independant: 1, support: 1
    };
    let isInitialized = false;

    function analyzeEffect(effect, sc) {
        const type = effect.effectType || '';
        const target = effect.effectTarget || 'TARGET';
        const isAlly = ['CASTER', 'ALLY', 'ALL_ALLIES'].includes(target);
        const isEnemy = ['TARGET', 'ALL_ENEMIES', 'ALL_COMBATANTS'].includes(target);
        const isSelf = target === 'CASTER';
        const isAoe = ['ALL_ENEMIES', 'ALL_ALLIES', 'ALL_COMBATANTS'].includes(target);
        const src = effect.damageSource || effect.healSource || effect.manaSource || effect.source || effect.modifierSource || '';

        // 1. Puissance: ratio puissance ou buff puissance
        if (src.includes('POWER') && !src.includes('PHYSICAL')) sc.puissance += (effect.ratio || 1);
        if (type === 'BUFF_DEBUFF' && effect.statAffected === 'POWER') sc.puissance += 0.5;

        // 2. Force: ratio force ou buff force
        if (src.includes('PHYSICAL_POWER')) sc.force += (effect.ratio || 1);
        if (type === 'BUFF_DEBUFF' && effect.statAffected === 'STRENGTH') sc.force += 0.5;

        // 3. PV: heal, hot, buff PV, ratio PV
        const isHeal = ['FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT'].includes(type);
        const isHpBD = type === 'BUFF_DEBUFF' && effect.statAffected === 'HEALTH';
        if (isHeal || isHpBD) sc.pv += 1;
        if (src.includes('HEALTH')) sc.pv += (effect.ratio || 1);

        // 4. Mana: gain mana, mot, buff mana, ratio Mana
        const isMana = ['FIXED_MANA', 'PERCENTAGE_MANA', 'MOT'].includes(type);
        const isManaBD = type === 'BUFF_DEBUFF' && effect.statAffected === 'MANA';
        if (isMana || isManaBD) sc.mana += 1;
        if (src.includes('MANA')) sc.mana += (effect.ratio || 1);

        // 5. Armure/Résistance: bouclier, buff armure/résistance
        const isShield = type === 'SHIELD';
        const isArmorBD = type === 'BUFF_DEBUFF' && ['ARMURE', 'RESISTANCE', 'ARMOR', 'RESIST'].some(s => (effect.statAffected || '').includes(s));
        if (isShield || isArmorBD) sc.armure += 1;

        // 6. Soutiens: buffs / shields / soins aux alliés (non-soi)
        const isBufPos = type === 'BUFF_DEBUFF' && (effect.flatValue > 0 || effect.modifier > 0);
        if (isAlly && !isSelf && (isBufPos || isShield || isHeal || isMana)) sc.soutien += 1;

        // 7. Dépouilleur: debuffs, dots, poisons, brûlures aux ennemis
        const isDebufNeg = type === 'BUFF_DEBUFF' && (effect.flatValue < 0 || effect.modifier < 0);
        if (isEnemy && (isDebufNeg || ['DOT', 'BURN', 'POISON'].includes(type))) sc.depouilleur += 1;

        // 8. Indépendant: effets orientés sur soi-même
        if (isSelf && (isBufPos || isShield || isHeal || isMana || effect.flatValue > 0)) sc.independant += 1;

        // 9. Support: heal ou mana rendu aux alliés ou à soi-même
        if ((isAlly || isSelf) && (isHeal || isMana)) sc.support += 1;

        // Badges scores
        if (src.includes('MISSING')) sc._berserkScore++;
        if (src.includes('CRIT') || (type === 'BUFF_DEBUFF' && effect.statAffected === 'CRIT')) sc._critScore++;
        if (type === 'FIXED_DAMAGE' && !src) sc._fixedDmgScore++;
        if (type === 'DOT' && !src && (effect.fixedDamagePerTick || 0) > 0) sc._fixedDmgScore += 0.5;
        if (isMana && (isAlly || isSelf)) sc._arcaneScore++;
        if (isSelf && (isShield || isArmorBD)) sc._tankScore++;
        if (['FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT'].includes(type) && target === 'TARGET') sc._preciScore++;
        if (['FIXED_DAMAGE', 'PERCENTAGE_DAMAGE', 'DOT'].includes(type) && isAoe) sc._aoeScore++;
        if (src.includes('SPEED') || (type === 'BUFF_DEBUFF' && effect.statAffected === 'SPEED')) sc._speedScore++;
        if (type === 'BUFF_DEBUFF' && (effect.statAffected || '').includes('SHIELD')) sc._erosionScore++;
        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'BURN' || type === 'BURN')) sc._burnCount++;
        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'POISON' || type === 'POISON')) sc._poisonCount++;
        if (isHeal) sc._healScore++;
    }

    function createEmptyProfile(voieId, voieNom) {
        return {
            id: voieId,
            nom: voieNom || '',
            puissance: 0, force: 0, pv: 0, mana: 0, armure: 0,
            soutien: 0, depouilleur: 0, independant: 0, support: 0,
            _berserkScore: 0, _burnCount: 0, _poisonCount: 0, _critScore: 0,
            _fixedDmgScore: 0, _arcaneScore: 0, _tankScore: 0,
            _preciScore: 0, _aoeScore: 0, _speedScore: 0, _erosionScore: 0, _healScore: 0
        };
    }

    async function loadAllVoieProfiles() {
        if (isInitialized) return;
        try {
            const fetcher = window.globalFetch || fetch;
            const res = await fetcher('/api/spells-editor');
            if (res.ok) {
                const spells = await res.json();
                spells.filter(s => s.voie && s.voie.id).forEach(s => {
                    const vId = s.voie.id;
                    if (!voieProfiles[vId]) {
                        voieProfiles[vId] = createEmptyProfile(vId, s.voie.nom);
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
            console.error('[hero-spider] Erreur chargement sorts:', e);
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
                const prof = createEmptyProfile(voieId, spells[0]?.voie?.nom || '');
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

    function drawSpiderWeb(canvas, profile) {
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
            const axis = SPIDER_AXES[i];
            const maxVal = globalAxisMax[axis.key] || 1;
            const rawVal = profile ? (profile[axis.key] || 0) : 0;
            const norm = Math.min(1, Math.max(0, rawVal / maxVal));
            const p = pt(i, Math.max(norm * R, 5));
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();

        // Dégradé radial lumineux
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Points de repère aux sommets
        for (let i = 0; i < N; i++) {
            const axis = SPIDER_AXES[i];
            const maxVal = globalAxisMax[axis.key] || 1;
            const rawVal = profile ? (profile[axis.key] || 0) : 0;
            const norm = Math.min(1, Math.max(0, rawVal / maxVal));
            const p = pt(i, Math.max(norm * R, 5));

            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = axis.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Labels des axes
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < N; i++) {
            const axis = SPIDER_AXES[i];
            const p = pt(i, R + 20);
            ctx.font = '600 11px Outfit, Inter, sans-serif';
            ctx.fillStyle = axis.color;
            ctx.fillText(axis.label, p.x, p.y);
        }
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
            iconSpan.textContent = b.icon;

            const textSpan = document.createElement('span');
            textSpan.textContent = b.label;

            badgeEl.appendChild(iconSpan);
            badgeEl.appendChild(textSpan);
            container.appendChild(badgeEl);
        });
    }

    // Exposer l'API globale pour l'armurerie
    window.updateArmoryVoieSpider = async function (voieId) {
        const section = document.getElementById('armorySpiderSection');
        const canvas = document.getElementById('armorySpiderCanvas');
        const badges = document.getElementById('armorySpecBadges');
        if (!section || !canvas || !badges) return;

        if (!voieId) {
            section.classList.add('is-hidden');
            section.classList.remove('is-visible');
            return;
        }

        section.classList.remove('is-hidden');
        section.classList.add('is-visible');

        const profile = await getProfileForVoie(voieId);
        drawSpiderWeb(canvas, profile);
        renderBadges(badges, profile);
    };

    window.openSpecModal = async function (voieId, heroName, voieNom) {
        const overlay = document.getElementById('specModalOverlay');
        const titleEl = document.getElementById('specModalTitle');
        const canvas = document.getElementById('specModalCanvas');
        const badges = document.getElementById('specModalBadges');
        if (!overlay || !canvas || !badges) return;

        if (titleEl) {
            titleEl.textContent = `Spécificités : ${heroName || 'Héros'}${voieNom ? ' (' + voieNom + ')' : ''}`;
        }

        overlay.classList.add('active');

        if (!voieId) {
            drawSpiderWeb(canvas, null);
            badges.innerHTML = '<span class="text-xs text-muted font-italic">Aucune voie affiliée.</span>';
            return;
        }

        const profile = await getProfileForVoie(voieId);
        drawSpiderWeb(canvas, profile);
        renderBadges(badges, profile);
    };

    window.closeSpecModal = function () {
        const overlay = document.getElementById('specModalOverlay');
        if (overlay) overlay.classList.remove('active');
    };

    // Préchargement discret des données dès le DOM prêt
    document.addEventListener('DOMContentLoaded', () => {
        loadAllVoieProfiles();
    });
})();
