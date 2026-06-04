import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode } from './constants.js';
import * as ui from './ui.js';
import * as api from './api.js';

import { attachLvl5CardEffects, spellCardEnter, spellCardLeave, fx_vent_enter, fx_eau_enter, fx_poison_enter, fx_terre_enter, fx_lave_enter, fx_plante_enter, fx_feu_enter, fx_explosion_enter, fx_esprit_enter, fx_tenebres_enter, fx_karma_enter, fx_generic_enter, fx_vent_leave, fx_eau_leave, fx_poison_leave, fx_terre_leave, fx_lave_leave, fx_plante_leave, fx_feu_leave, fx_explosion_leave, fx_esprit_leave, fx_tenebres_leave, fx_karma_leave, fx_generic_leave, mkp, createSparkles } from './particles.js';

export function playForgeAnimation() {
    const btn = document.getElementById('submitSpellBtn');
    if (!btn) return;

    const voieSelect = document.getElementById('voieSelect');
    const spiritSelect = document.getElementById('spiritSelect');
    const voieName = (voieSelect.options[voieSelect.selectedIndex] || {}).text || '';
    const spiritName = (spiritSelect.options[spiritSelect.selectedIndex] || {}).text || '';

    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const nom = (voieName + ' ' + spiritName).toLowerCase();

    if (nom.includes('création') || nom.includes('creation')) {
        btn.classList.add('creation-pulse');
        setTimeout(() => btn.classList.remove('creation-pulse'), 700);

        for (let i = 0; i < 18; i++) {
            setTimeout(() => {
                const p = document.createElement('div');

                const isLeaf = Math.random() > 0.35;
                p.className = isLeaf ? 'creation-leaf' : 'creation-spark';

                const sx = rect.left + 8 + Math.random() * (rect.width - 16);
                const sy = rect.bottom - 6 - Math.random() * rect.height * 0.45;

                const size = isLeaf ? 7 + Math.random() * 9 : 3 + Math.random() * 5;

                p.style.left = `${sx}px`;
                p.style.top = `${sy}px`;
                p.style.width = `${size}px`;
                p.style.height = `${size}px`;

                document.body.appendChild(p);

                const dx = (Math.random() - 0.5) * 45;
                const dy = -(25 + Math.random() * 55);
                const rot = (Math.random() - 0.5) * 120;
                const scale = isLeaf ? 1.2 + Math.random() * 0.8 : 0.2;

                requestAnimationFrame(() => {
                    p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`;
                    p.style.opacity = '0';
                });

                setTimeout(() => p.remove(), 1100);
            }, i * 45);
        }
    } else if (nom.includes('destruction')) {
        btn.classList.add('destruction-shake');
        setTimeout(() => btn.classList.remove('destruction-shake'), 350);

        for (let i = 0; i < 34; i++) {
            setTimeout(() => {
                const p = document.createElement('div');

                const sx = rect.left + Math.random() * rect.width;
                const sy = rect.top + rect.height * (0.35 + Math.random() * 0.65);

                const size = 5 + Math.random() * 12;
                const isSmoke = Math.random() < 0.3;

                p.className = isSmoke ? 'destruction-smoke' : 'destruction-spark';

                p.style.left = `${sx}px`;
                p.style.top = `${sy}px`;
                p.style.width = `${size}px`;
                p.style.height = `${size}px`;

                document.body.appendChild(p);

                const dx = (Math.random() - 0.5) * 90;
                const dy = -(50 + Math.random() * 100);
                const scale = isSmoke ? 2.8 + Math.random() * 1.5 : 0.2;

                requestAnimationFrame(() => {
                    p.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${Math.random() * 360}deg)`;
                    p.style.opacity = '0';
                });

                setTimeout(() => p.remove(), 1200);
            }, i * 22);
        }

    } else if (nom.includes('sûreté') || nom.includes('surete')) {
        // 💧 Gouttes qui tombent depuis le haut
        for (let i = 0; i < 14; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.textContent = '💧';
                const startX = rect.left + Math.random() * rect.width;
                p.style.cssText = `position:fixed;left:${startX}px;top:${rect.top - 60}px;font-size:${10 + Math.random() * 8}px;pointer-events:none;z-index:9999;transition:all 0.6s cubic-bezier(0.4,0,1,1);opacity:1;`;
                document.body.appendChild(p);
                requestAnimationFrame(() => {
                    p.style.transform = `translateY(${60 + Math.random() * 20}px)`;
                    p.style.opacity = '0';
                });
                setTimeout(() => p.remove(), 600);
            }, i * 55);
        }

    } else if (nom.includes('trahison')) {
        btn.classList.add('betrayal-glitch');
        setTimeout(() => btn.classList.remove('betrayal-glitch'), 500);

        createBetrayalSlash(rect.left - 18, rect.top + rect.height * 0.25, rect.width + 42, -14, 'left');

        setTimeout(() => {
            createBetrayalSlash(rect.right + 18, rect.top + rect.height * 0.72, rect.width + 42, 14, 'right');
        }, 95);

        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const spark = document.createElement('div');
                spark.className = 'betrayal-spark';

                spark.style.left = `${cx}px`;
                spark.style.top = `${cy}px`;

                document.body.appendChild(spark);

                const angle = Math.random() * Math.PI * 2;
                const dist = 25 + Math.random() * 55;

                requestAnimationFrame(() => {
                    spark.style.transform = `
                                translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)
                                scale(0.1)
                            `;
                    spark.style.opacity = '0';
                });

                setTimeout(() => spark.remove(), 600);
            }, i * 18);
        }
    } else if (nom.includes('violence')) {
        btn.classList.add('violence-shock');
        setTimeout(() => btn.classList.remove('violence-shock'), 450);

        const blast = document.createElement('div');
        blast.className = 'violence-blast';
        blast.style.left = `${cx - 8}px`;
        blast.style.top = `${cy - 8}px`;
        document.body.appendChild(blast);

        requestAnimationFrame(() => {
            blast.style.transform = 'scale(8)';
            blast.style.opacity = '0';
        });

        setTimeout(() => blast.remove(), 650);

        for (let i = 0; i < 34; i++) {
            const p = document.createElement('div');
            p.className = Math.random() < 0.75 ? 'violence-ember' : 'violence-smoke';

            const size = 4 + Math.random() * 10;
            p.style.left = `${cx}px`;
            p.style.top = `${cy}px`;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;

            document.body.appendChild(p);

            const angle = Math.random() * Math.PI * 2;
            const dist = 45 + Math.random() * 95;

            requestAnimationFrame(() => {
                p.style.transform = `
                            translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)
                            scale(${Math.random() < 0.75 ? 0.15 : 2.2})
                            rotate(${Math.random() * 360}deg)
                        `;
                p.style.opacity = '0';
            });

            setTimeout(() => p.remove(), 900);
        }
    } else if (nom.includes('consolidation')) {
        btn.classList.add('consolidation-impact');
        setTimeout(() => btn.classList.remove('consolidation-impact'), 650);

        const wall = document.createElement('div');
        const wallW = rect.width * 0.9;
        const wallH = rect.height * 0.75;

        wall.className = 'consolidation-wall';
        wall.style.left = `${rect.left + rect.width * 0.05}px`;
        wall.style.top = `${rect.bottom + 12}px`;
        wall.style.width = `${wallW}px`;
        wall.style.height = `${wallH}px`;

        document.body.appendChild(wall);

        requestAnimationFrame(() => {
            wall.style.transform = `translateY(-${wallH + 18}px) scaleY(1)`;
            wall.style.opacity = '1';
        });

        for (let i = 0; i < 16; i++) {
            setTimeout(() => {
                const shard = document.createElement('div');
                shard.className = 'consolidation-shard';

                const size = 4 + Math.random() * 8;
                shard.style.width = `${size}px`;
                shard.style.height = `${size}px`;
                shard.style.left = `${rect.left + Math.random() * rect.width}px`;
                shard.style.top = `${rect.bottom}px`;

                document.body.appendChild(shard);

                const dx = (Math.random() - 0.5) * 80;
                const dy = -(15 + Math.random() * 45);

                requestAnimationFrame(() => {
                    shard.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 180}deg)`;
                    shard.style.opacity = '0';
                });

                setTimeout(() => shard.remove(), 800);
            }, i * 25);
        }

        setTimeout(() => {
            wall.style.transform = `translateY(-${wallH + 18}px) scaleY(0.15)`;
            wall.style.opacity = '0';
            setTimeout(() => wall.remove(), 500);
        }, 950);
    } else if (nom.includes('raison')) {
        // 💨 Courant d'air : le bouton se décale comme soufflé, puis revient
        const origTransform = btn.style.transform;
        const origTransition = btn.style.transition;

        // Souffle aérien : traits de vent horizontaux
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const wind = document.createElement('div');
                const w = 30 + Math.random() * 60;
                wind.style.cssText = `
                            position:fixed;
                            left:${rect.left - w - 10}px;
                            top:${rect.top + 4 + i * (rect.height / 8)}px;
                            width:${w}px;
                            height:${1 + Math.random()}px;
                            background: linear-gradient(90deg, transparent, rgba(180,230,255,0.7), transparent);
                            border-radius:2px;
                            pointer-events:none;
                            z-index:9999;
                            opacity:0.8;
                            transition: transform ${0.25 + Math.random() * 0.2}s ease-out, opacity 0.3s ease 0.15s;
                        `;
                document.body.appendChild(wind);
                requestAnimationFrame(() => {
                    wind.style.transform = `translateX(${rect.width + w + 30}px)`;
                    wind.style.opacity = '0';
                });
                setTimeout(() => wind.remove(), 500);
            }, i * 30);
        }

        // Le bouton se décale vers la droite comme soufflé, puis revient avec rebond
        btn.style.transition = 'transform 0.15s ease-in';
        btn.style.transform = 'translateX(12px) rotate(1.5deg)';
        setTimeout(() => {
            btn.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
            btn.style.transform = origTransform || '';
            setTimeout(() => {
                btn.style.transition = origTransition || '';
            }, 600);
        }, 150);

    } else if (nom.includes('conviction')) {
        // 🌋 Coulées de lave lentes qui débordent depuis le haut du bouton
        const lavaColors = ['#ff4500', '#ff6a00', '#e8380d', '#ff8c00', '#c0392b'];
        const nbStreams = 5 + Math.floor(Math.random() * 4); // 5-8 coulées
        for (let i = 0; i < nbStreams; i++) {
            setTimeout(() => {
                const stream = document.createElement('div');
                const color = lavaColors[Math.floor(Math.random() * lavaColors.length)];
                const w = 4 + Math.random() * 8; // largeur 4-12px
                const sx = rect.left + 8 + Math.random() * (rect.width - 16);
                const duration = 1.2 + Math.random() * 1.2; // 1.2 à 2.4s (lente)
                const finalLength = 20 + Math.random() * 45; // hauteur finale de la coulée

                stream.style.cssText = `
                            position:fixed;
                            left:${sx}px;
                            top:${rect.top}px;
                            width:${w}px;
                            height:0px;
                            background: linear-gradient(180deg, #fff5 0%, ${color} 30%, #8b0000 100%);
                            border-radius: 0 0 ${w / 2}px ${w / 2}px;
                            box-shadow: 0 0 ${w + 4}px ${color}, 0 0 2px #fff;
                            pointer-events:none;
                            z-index:9999;
                            opacity:0.95;
                            transition: height ${duration}s cubic-bezier(0.4,0,0.6,1), opacity 0.4s ease ${duration - 0.2}s;
                        `;
                document.body.appendChild(stream);

                // La coulée descend (height grandit)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        stream.style.height = finalLength + 'px';
                        // Goutte qui tombe au bout
                        setTimeout(() => {
                            const drop = document.createElement('div');
                            drop.style.cssText = `
                                        position:fixed;
                                        left:${sx + w / 2 - 4}px;
                                        top:${rect.top + finalLength}px;
                                        width:${w + 2}px;
                                        height:${w + 2}px;
                                        background:${color};
                                        border-radius:50% 50% 50% 50% / 40% 40% 60% 60%;
                                        box-shadow:0 0 8px ${color};
                                        pointer-events:none;
                                        z-index:9999;
                                        opacity:1;
                                        transition: transform ${0.6 + Math.random() * 0.4}s cubic-bezier(0.4,0,1,1), opacity 0.3s ease 0.5s;
                                    `;
                            document.body.appendChild(drop);
                            requestAnimationFrame(() => {
                                drop.style.transform = `translateY(${20 + Math.random() * 30}px) scaleY(1.5)`;
                                drop.style.opacity = '0';
                            });
                            setTimeout(() => drop.remove(), 900);
                        }, duration * 900);

                        // Fondu de la coulée
                        stream.style.opacity = '0';
                        setTimeout(() => stream.remove(), (duration + 0.4) * 1000);
                    });
                });
            }, i * 180);
        }
    } else if (nom.includes('esprit')) {
        // ✨ Flash de luminosité sur le bouton + petites lueurs qui partent
        btn.style.transition = 'box-shadow 0.1s ease, background 0.1s ease';
        const origBg = btn.style.background;
        btn.style.boxShadow = '0 0 40px 15px #38bdf8, 0 0 80px 30px rgba(56,189,248,0.4)';
        btn.style.background = 'rgba(56,189,248,0.6)';
        setTimeout(() => {
            btn.style.transition = 'box-shadow 0.5s ease, background 0.5s ease';
            btn.style.boxShadow = '';
            btn.style.background = origBg || '';
        }, 120);

        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.textContent = '✦';
                p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${6 + Math.random() * 10}px;color:#38bdf8;text-shadow:0 0 8px #38bdf8;pointer-events:none;z-index:9999;transition:all ${0.5 + Math.random() * 0.5}s ease-out;opacity:1;`;
                document.body.appendChild(p);
                const angle = Math.random() * Math.PI * 2;
                const dist = 40 + Math.random() * 80;
                requestAnimationFrame(() => {
                    p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
                    p.style.opacity = '0';
                });
                setTimeout(() => p.remove(), 1000);
            }, i * 20);
        }

    } else if (nom.includes('ténèbres') || nom.includes('tenebres')) {
        btn.classList.add('darkness-pulse');
        setTimeout(() => btn.classList.remove('darkness-pulse'), 900);

        for (let i = 0; i < 22; i++) {
            setTimeout(() => {
                const p = document.createElement('div');

                const isMist = Math.random() < 0.55;
                p.className = isMist ? 'darkness-mist' : 'darkness-shard';

                const size = isMist ? 18 + Math.random() * 34 : 5 + Math.random() * 10;

                p.style.left = `${cx + (Math.random() - 0.5) * rect.width}px`;
                p.style.top = `${cy + (Math.random() - 0.5) * rect.height}px`;
                p.style.width = `${size}px`;
                p.style.height = `${size}px`;

                document.body.appendChild(p);

                const angle = Math.random() * Math.PI * 2;
                const dist = 25 + Math.random() * 75;

                requestAnimationFrame(() => {
                    p.style.transform = `
                                translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 25}px)
                                scale(${isMist ? 1.8 : 0.15})
                                rotate(${(Math.random() - 0.5) * 180}deg)
                            `;
                    p.style.opacity = '0';
                });

                setTimeout(() => p.remove(), 1500);
            }, i * 45);
        }
    } else if (nom.includes('karma')) {
        btn.classList.add('karma-balance');
        setTimeout(() => btn.classList.remove('karma-balance'), 1200);

        const ring = document.createElement('div');
        ring.className = 'karma-ring';
        ring.style.left = `${cx - 34}px`;
        ring.style.top = `${cy - 34}px`;

        document.body.appendChild(ring);

        requestAnimationFrame(() => {
            ring.style.transform = 'scale(1.25) rotate(180deg)';
            ring.style.opacity = '0';
        });

        for (let i = 0; i < 16; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'karma-orb';

                const angle = (i / 16) * Math.PI * 2;
                const radius = 36 + Math.random() * 12;

                p.style.left = `${cx}px`;
                p.style.top = `${cy}px`;

                document.body.appendChild(p);

                requestAnimationFrame(() => {
                    p.style.transform = `
                                translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)
                                scale(0.15)
                            `;
                    p.style.opacity = '0';
                });

                setTimeout(() => p.remove(), 1000);
            }, i * 25);
        }

        setTimeout(() => ring.remove(), 1200);
    } else {
        // ✦ Générique
        createSparkles(cx, cy, '#ffd700');
    }

    // Pulse du bouton
    btn.style.transition = 'transform 0.15s ease';
    btn.style.transform = 'scale(1.06)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);
}

export function createBetrayalSlash(x, y, width, rotation, origin) {
    const slash = document.createElement('div');
    slash.className = 'betrayal-slash';

    slash.style.left = `${x}px`;
    slash.style.top = `${y}px`;
    slash.style.width = '0px';
    slash.style.transform = `rotate(${rotation}deg)`;
    slash.style.transformOrigin = origin === 'left' ? 'left center' : 'right center';

    document.body.appendChild(slash);

    requestAnimationFrame(() => {
        slash.style.width = `${width}px`;
    });

    setTimeout(() => {
        slash.style.opacity = '0';
        slash.style.filter = 'blur(4px)';
        setTimeout(() => slash.remove(), 280);
    }, 220);
}

