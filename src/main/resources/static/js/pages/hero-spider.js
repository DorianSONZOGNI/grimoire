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
        { key: 'berserk',    label: 'Berserk',    icon: 'bloodtype',             cssClass: 'badge-berserk',    desc: 'Sorts basés sur les PV manquants',   score: s => s._berserkScore },
        { key: 'brulant',    label: 'Brûlant',    icon: 'local_fire_department', cssClass: 'badge-brulant',    desc: 'Inflige des brûlures',              score: s => s._burnCount * 2 },
        { key: 'toxique',    label: 'Toxique',    icon: 'skull',                 cssClass: 'badge-toxique',    desc: 'Inflige du poison',                 score: s => s._poisonCount * 2 },
        { key: 'tactique',   label: 'Tactique',   icon: 'gps_fixed',             cssClass: 'badge-tactique',   desc: 'Exploite ou augmente le Critique',  score: s => s._critScore },
        { key: 'arcane',     label: 'Arcane',     icon: 'auto_awesome',          cssClass: 'badge-arcane',     desc: 'Flux et régénération de Mana',      score: s => s._arcaneScore },
        { key: 'tank',       label: 'Tank',       icon: 'shield',                cssClass: 'badge-tank',       desc: 'Boucliers et armure sur soi',       score: s => s._tankScore },
        { key: 'vif',        label: 'Vif',        icon: 'bolt',                  cssClass: 'badge-vif',        desc: 'Vitesse et vivacité',               score: s => s._speedScore },
        { key: 'erosion',    label: 'Érosion',    icon: 'heart_minus',           cssClass: 'badge-erosion',    desc: 'Pénétration et casse-bouclier',     score: s => s._erosionScore },
        { key: 'guerisseur', label: 'Guérisseur', icon: 'healing',               cssClass: 'badge-guerisseur', desc: 'Spécialiste du soin et HoT',        score: s => s._healScore }
    ];

    // Cache des analyses par voieId
    const voieProfiles = {};
    const globalAxisMax = {
        puissance: 1, force: 1, mana: 1, tank: 1, soutien: 1
    };
    let isInitialized = false;

    function analyzeEffect(effect, sc) {
        const type = effect.effectType || '';
        const target = effect.effectTarget || 'TARGET';
        const isAlly = ['CASTER', 'ALLY', 'ALL_ALLIES'].includes(target);
        const isEnemy = ['TARGET', 'ALL_ENEMIES', 'ALL_COMBATANTS'].includes(target);
        const isSelf = target === 'CASTER';
        const src = effect.damageSource || effect.healSource || effect.manaSource || effect.source || effect.modifierSource || '';

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

        // 4. Tank: bouclier, buff armure/résistance
        const isShield = type === 'SHIELD';
        const isArmorBD = type === 'BUFF_DEBUFF' && ['ARMURE', 'RESISTANCE', 'ARMOR', 'RESIST'].some(s => (effect.statAffected || '').includes(s));
        if (isShield || isArmorBD) sc.tank += 1;

        // 5. Soutien: buff allié, débuff ennemi, et soins/mana support
        const isHeal = ['FIXED_HEAL', 'PERCENTAGE_HEAL', 'HOT'].includes(type);
        const isBufPos = type === 'BUFF_DEBUFF' && (effect.flatValue > 0 || effect.modifier > 0);
        const isDebufNeg = type === 'BUFF_DEBUFF' && (effect.flatValue < 0 || effect.modifier < 0);
        if (isAlly && !isSelf && (isBufPos || isShield || isHeal || isMana)) sc.soutien += 1;
        if (isEnemy && (isDebufNeg || ['DOT', 'BURN', 'POISON'].includes(type))) sc.soutien += 1;
        if ((isAlly || isSelf) && (isHeal || isMana)) sc.soutien += 1;

        // Badges scores
        if (src.includes('HEALTH_MISSING')) sc._berserkScore++;
        if (src.includes('CRIT') || (type === 'BUFF_DEBUFF' && effect.statAffected === 'CRIT')) sc._critScore++;
        if (isMana && (isAlly || isSelf)) sc._arcaneScore++;
        if (isSelf && (isShield || isArmorBD)) sc._tankScore++;
        if (src.includes('SPEED') || (type === 'BUFF_DEBUFF' && effect.statAffected === 'SPEED')) sc._speedScore++;
        if (type === 'BUFF_DEBUFF' && (effect.statAffected || '').includes('SHIELD')) sc._erosionScore++;
        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'BURN' || type === 'BURN')) sc._burnCount++;
        if ((type === 'DOT' || type === 'BUFF_DEBUFF') && (effect.statAffected === 'POISON' || type === 'POISON')) sc._poisonCount++;
        if (isHeal) sc._healScore += (target === 'ALL_ALLIES' ? 2 : 1);
    }

    function createEmptyProfile(voieId, voieNom, description, passiveDescription) {
        return {
            id: voieId,
            nom: voieNom || '',
            description: description || '',
            passiveDescription: passiveDescription || '',
            puissance: 0, force: 0, mana: 0, tank: 0, soutien: 0,
            _berserkScore: 0, _burnCount: 0, _poisonCount: 0, _critScore: 0,
            _arcaneScore: 0, _tankScore: 0, _speedScore: 0, _erosionScore: 0, _healScore: 0
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

    // Exposer l'API globale pour l'armurerie
    window.updateArmoryVoieSpider = async function (voieId) {
        const section = document.getElementById('armorySpiderSection');
        const canvas = document.getElementById('armorySpiderCanvas');
        const badges = document.getElementById('armorySpecBadges');
        const spiderIconEl = document.getElementById('spiderVoieInfoIcon');
        if (!section || !canvas || !badges) return;

        if (!voieId) {
            if (spiderIconEl) spiderIconEl.classList.add('hidden');
            section.classList.add('is-hidden');
            section.classList.remove('is-visible');
            return;
        }

        section.classList.remove('is-hidden');
        section.classList.add('is-visible');

        const profile = await getProfileForVoie(voieId);
        if (spiderIconEl && profile) {
            populateVoieTooltip(spiderIconEl, profile);
        }
        drawSpiderWeb(canvas, profile);
        renderBadges(badges, profile);
    };

    window.openSpecModal = async function (voieId, heroName, voieNom) {
        const overlay = document.getElementById('specModalOverlay');
        const titleEl = document.getElementById('specModalTitle');
        const canvas = document.getElementById('specModalCanvas');
        const badges = document.getElementById('specModalBadges');
        const modalIconEl = document.getElementById('specModalVoieInfoIcon');
        if (!overlay || !canvas || !badges) return;

        if (titleEl) {
            titleEl.textContent = `Spécificités : ${heroName || 'Héros'}${voieNom ? ' (' + voieNom + ')' : ''}`;
        }

        overlay.classList.add('active');

        if (!voieId) {
            if (modalIconEl) modalIconEl.classList.add('hidden');
            drawSpiderWeb(canvas, null);
            badges.innerHTML = '<span class="text-xs text-muted font-italic">Aucune voie affiliée.</span>';
            return;
        }

        const profile = await getProfileForVoie(voieId);
        if (modalIconEl && profile) {
            populateVoieTooltip(modalIconEl, profile);
        }
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
