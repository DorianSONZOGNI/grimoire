// ===================================================================
// particles.js — Animations et effets visuels (particules, lvl 5, etc.)
// ===================================================================

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
        const origTransform = btn.style.transform;
        const origTransition = btn.style.transition;

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
        const lavaColors = ['#ff4500', '#ff6a00', '#e8380d', '#ff8c00', '#c0392b'];
        const nbStreams = 5 + Math.floor(Math.random() * 4); 
        for (let i = 0; i < nbStreams; i++) {
            setTimeout(() => {
                const stream = document.createElement('div');
                const color = lavaColors[Math.floor(Math.random() * lavaColors.length)];
                const w = 4 + Math.random() * 8; 
                const sx = rect.left + 8 + Math.random() * (rect.width - 16);
                const duration = 1.2 + Math.random() * 1.2; 
                const finalLength = 20 + Math.random() * 45; 

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

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        stream.style.height = finalLength + 'px';
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

                        stream.style.opacity = '0';
                        setTimeout(() => stream.remove(), (duration + 0.4) * 1000);
                    });
                });
            }, i * 180);
        }
    } else if (nom.includes('esprit')) {
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
        createSparkles(cx, cy, '#ffd700');
    }

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

export function createSparkles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const spark = document.createElement('div');
        spark.style.position = 'fixed';
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        spark.style.width = '4px';
        spark.style.height = '4px';
        spark.style.borderRadius = '50%';
        spark.style.backgroundColor = color === 'var(--text-muted)' ? '#fff' : color;
        spark.style.boxShadow = `0 0 10px ${spark.style.backgroundColor}`;
        spark.style.pointerEvents = 'none';
        spark.style.zIndex = '9999';

        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 20;

        spark.style.transition = 'all 0.6s cubic-bezier(0.1, 0.8, 0.3, 1)';
        document.body.appendChild(spark);

        requestAnimationFrame(() => {
            spark.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
            spark.style.opacity = '0';
        });

        setTimeout(() => spark.remove(), 600);
    }
}

export function attachLvl5CardEffects(container) {
    const cards = container.querySelectorAll('.spell-card-lvl-5');
    cards.forEach(card => {
        const fresh = card.cloneNode(true);
        card.parentNode.replaceChild(fresh, card);

        const badgeText = (fresh.querySelector('.spell-badges')?.innerText || '').toLowerCase();
        const origin = getLvl5Origin(badgeText);

        fresh.addEventListener('mouseenter', () => spellCardEnter(fresh, origin));
        fresh.addEventListener('mouseleave', () => spellCardLeave(fresh, origin));
    });
}

function getLvl5Origin(badgeText) {
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

function spellCardEnter(card, origin) {
    const enterCls = `lvl5-enter-${origin}`;
    card.classList.remove(enterCls);
    void card.offsetWidth;
    card.classList.add(enterCls);
    card.addEventListener('animationend', () => card.classList.remove(enterCls), { once: true });

    const rect = card.getBoundingClientRect();
    switch (origin) {
        case 'raison': fx_vent_enter(rect); break;
        case 'surete': fx_eau_enter(rect); break;
        case 'trahison': fx_poison_enter(rect); break;
        case 'consolidation': fx_terre_enter(rect); break;
        case 'conviction': fx_lave_enter(rect); break;
        case 'creation': fx_plante_enter(rect); break;
        case 'destruction': fx_feu_enter(rect); break;
        case 'violence': fx_explosion_enter(rect); break;
        case 'esprit': fx_esprit_enter(rect); break;
        case 'tenebres': fx_tenebres_enter(rect); break;
        case 'karma': fx_karma_enter(rect); break;
        default: fx_generic_enter(rect);
    }
}

function spellCardLeave(card, origin) {
    const leaveCls = `lvl5-leave-${origin}`;
    card.classList.remove(leaveCls);
    void card.offsetWidth;
    card.classList.add(leaveCls);
    card.addEventListener('animationend', () => card.classList.remove(leaveCls), { once: true });

    const rect = card.getBoundingClientRect();
    switch (origin) {
        case 'raison': fx_vent_leave(rect); break;
        case 'surete': fx_eau_leave(rect); break;
        case 'trahison': fx_poison_leave(rect); break;
        case 'consolidation': fx_terre_leave(rect); break;
        case 'conviction': fx_lave_leave(rect); break;
        case 'creation': fx_plante_leave(rect); break;
        case 'destruction': fx_feu_leave(rect); break;
        case 'violence': fx_explosion_leave(rect); break;
        case 'esprit': fx_esprit_leave(rect); break;
        case 'tenebres': fx_tenebres_leave(rect); break;
        case 'karma': fx_karma_leave(rect); break;
        default: fx_generic_leave(rect);
    }
}

function mkp() {
    const el = document.createElement('div');
    el.style.pointerEvents = 'none';
    return el;
}

function fx_vent_enter(rect) {
    for (let i = 0; i < 9; i++) {
        setTimeout(() => {
            const w = 35 + Math.random() * 55;
            const p = mkp();
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        left:${rect.left - w}px;
                        top:${rect.top + (i / 9) * rect.height + (Math.random() - 0.5) * 12}px;
                        width:${w}px; height:${1 + Math.random()}px;
                        background:linear-gradient(90deg, transparent, rgba(148,219,255,0.8), rgba(56,189,248,0.6), transparent);
                        border-radius:2px; opacity:0.9;
                        transition:transform ${0.22 + Math.random() * 0.15}s cubic-bezier(0.4,0,0.6,1), opacity 0.15s ease ${0.18}s;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translateX(${rect.width + w + 30}px)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 500);
        }, i * 45);
    }
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 4 + Math.random() * 5;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        background:rgba(148,219,255,0.7);
                        box-shadow:0 0 6px #38bdf8;
                        transition:all ${0.5 + Math.random() * 0.3}s ease-out; opacity:0.8;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${30 + Math.random() * 50}px, ${(Math.random() - 0.5) * 30}px) scale(0)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 60);
    }
}

function fx_eau_enter(rect) {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = rect.width * (0.3 + Math.random() * 0.5);
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        left:${rect.left + (rect.width - w) / 2 + (Math.random() - 0.5) * 20}px;
                        top:${rect.bottom - 2 - i * 3}px;
                        width:${w}px; height:2px;
                        background:linear-gradient(90deg, transparent, rgba(0,229,204,0.8), transparent);
                        border-radius:50%; opacity:0;
                        transition:all ${0.5 + i * 0.15}s ease-out;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `scaleX(1.4) translateY(-${20 + i * 15}px)`;
                p.style.opacity = '0.7';
                setTimeout(() => { p.style.opacity = '0'; }, 300 + i * 100);
            });
            setTimeout(() => p.remove(), 1000);
        }, i * 130);
    }
    for (let i = 0; i < 7; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 3 + Math.random() * 7;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:transparent;
                        border:1px solid rgba(0,229,204,0.8);
                        box-shadow:0 0 5px rgba(0,229,204,0.5), inset 0 0 4px rgba(0,229,204,0.2);
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.bottom}px;
                        transition:all ${0.7 + Math.random() * 0.6}s ease-out; opacity:0.85;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 40;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, -${rect.height * 0.5 + Math.random() * rect.height * 0.4}px)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1400);
        }, i * 55);
    }
}

function fx_poison_enter(rect) {
    const poisonColors = ['#39d353', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 5 + Math.random() * 12;
            const c = poisonColors[Math.floor(Math.random() * poisonColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, ${c}90 0%, ${c}30 60%, transparent 100%);
                        box-shadow:0 0 ${sz}px ${c}60, inset 0 0 ${sz / 2}px ${c}40;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.85;
                        transition:all ${0.6 + Math.random() * 0.5}s cubic-bezier(0.1,0.8,0.3,1);
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 60;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 20}px) scale(${1.5 + Math.random()})`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1200);
        }, i * 35);
    }
    for (let i = 0; i < 4; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 20 + Math.random() * 30;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9998;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%);
                        left:${rect.left + rect.width * 0.2 + Math.random() * rect.width * 0.6}px;
                        top:${rect.top + rect.height * 0.2 + Math.random() * rect.height * 0.6}px;
                        opacity:0; transition:all ${0.8 + Math.random() * 0.4}s ease-out;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.opacity = '0.6';
                setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(2.5)'; }, 300 + i * 100);
            });
            setTimeout(() => p.remove(), 1500);
        }, i * 80);
    }
}

function fx_terre_enter(rect) {
    const stoneColors = ['#92614a', '#a0886b', '#78503c', '#c8a47a', '#5c3d2e'];
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 4 + Math.random() * 10;
            const h = 3 + Math.random() * 8;
            const c = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${w}px; height:${h}px; border-radius:1px;
                        background:${c};
                        box-shadow:1px 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.bottom}px;
                        opacity:0.95;
                        transition:all ${0.5 + Math.random() * 0.35}s cubic-bezier(0.4,0,0.2,1);
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 60;
            const dy = -(25 + Math.random() * 55);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 180}deg) scale(0.2)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 40);
    }
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 8 + Math.random() * 15;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9998;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, rgba(160,136,107,0.5) 0%, transparent 70%);
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.bottom - sz / 2}px;
                        opacity:0.7; transition:all ${0.7 + Math.random() * 0.4}s ease-out;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 50;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, -${20 + Math.random() * 40}px) scale(2)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1200);
        }, i * 60);
    }
}

function fx_lave_enter(rect) {
    const lavaColors = ['#ff4500', '#ff6a00', '#ff8c00', '#e8380d', '#ffd700'];
    const streams = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < streams; i++) {
        setTimeout(() => {
            const stream = mkp();
            const c = lavaColors[Math.floor(Math.random() * lavaColors.length)];
            const w = 4 + Math.random() * 8;
            const sx = rect.left + 8 + Math.random() * (rect.width - 16);
            const dur = 0.8 + Math.random() * 0.8;
            const len = 20 + Math.random() * 40;
            stream.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        left:${sx}px; top:${rect.top}px;
                        width:${w}px; height:0;
                        background:linear-gradient(180deg, rgba(255,255,200,0.8) 0%, ${c} 30%, #8b0000 100%);
                        border-radius:0 0 ${w / 2}px ${w / 2}px;
                        box-shadow:0 0 ${w + 4}px ${c}, 0 0 2px #fff;
                        opacity:0.95;
                        transition:height ${dur}s cubic-bezier(0.4,0,0.6,1), opacity 0.4s ease ${dur - 0.2}s;
                    `;
            document.body.appendChild(stream);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                stream.style.height = len + 'px';
                setTimeout(() => {
                    const drop = mkp();
                    drop.style.cssText = `
                                position:fixed; pointer-events:none; z-index:9999;
                                left:${sx + w / 2 - 4}px; top:${rect.top + len}px;
                                width:${w + 2}px; height:${w + 2}px;
                                background:${c}; border-radius:50% 50% 50% 50% / 40% 40% 60% 60%;
                                box-shadow:0 0 8px ${c}; opacity:1;
                                transition:all ${0.5 + Math.random() * 0.3}s cubic-bezier(0.4,0,1,1);
                            `;
                    document.body.appendChild(drop);
                    requestAnimationFrame(() => {
                        drop.style.transform = `translateY(${20 + Math.random() * 25}px) scaleY(1.5)`;
                        drop.style.opacity = '0';
                    });
                    setTimeout(() => drop.remove(), 900);
                }, dur * 900);
                stream.style.opacity = '0';
                setTimeout(() => stream.remove(), (dur + 0.4) * 1000);
            }));
        }, i * 160);
    }
}

function fx_plante_enter(rect) {
    const greenColors = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#86efac'];
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const p = mkp();
            const c = greenColors[Math.floor(Math.random() * greenColors.length)];
            const sz = 5 + Math.random() * 8;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:${c};
                        box-shadow:0 0 ${sz + 3}px ${c}, 0 0 ${sz * 2}px ${c}50;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.9;
                        transition:all ${0.6 + Math.random() * 0.5}s cubic-bezier(0.34,1.56,0.64,1);
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 55;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 15}px) scale(0.15)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1200);
        }, i * 50);
    }
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 6 + Math.random() * 10;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${w}px; height:${w * 1.6}px;
                        border-radius:${w / 2}px ${w / 2}px ${w / 2}px 0;
                        background:linear-gradient(135deg, #34d399, #059669);
                        box-shadow:0 0 4px #10b98180;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.9;
                        transition:all ${0.7 + Math.random() * 0.5}s cubic-bezier(0.34,1.56,0.64,1);
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 50;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, -${30 + Math.random() * 40}px) rotate(${Math.random() * 720}deg) scale(0)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1300);
        }, i * 70);
    }
}

function fx_feu_enter(rect) {
    const fireColors = ['#ff4500', '#ff6a00', '#ffd700', '#ff8c00', '#ff2400', '#fff7a1'];
    for (let i = 0; i < 16; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 5 + Math.random() * 14;
            const c = fireColors[Math.floor(Math.random() * fireColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz * (1.2 + Math.random() * 1)}px;
                        border-radius:50% 50% 30% 30%;
                        background:radial-gradient(ellipse at 50% 100%, ${c}, ${c}00);
                        box-shadow:0 0 ${sz}px ${c}, 0 0 ${sz * 2}px ${c}60;
                        left:${rect.left + 10 + Math.random() * (rect.width - 20)}px;
                        top:${rect.top + rect.height * 0.5 + Math.random() * rect.height * 0.4}px;
                        opacity:0.95;
                        transition:all ${0.45 + Math.random() * 0.35}s ease-out;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 50;
            const dy = -(30 + Math.random() * rect.height * 0.7);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) scale(0.05) rotate(${(Math.random() - 0.5) * 30}deg)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 30);
    }
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:2px; height:2px; border-radius:50%;
                        background:#fff; box-shadow:0 0 6px #ffd700, 0 0 3px #fff;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + rect.height * 0.4 + Math.random() * rect.height * 0.4}px;
                        opacity:1; transition:all ${0.6 + Math.random() * 0.4}s ease-out;
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 60;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 20}px)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1100);
        }, i * 35);
    }
}

function fx_explosion_enter(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ring = mkp();
    ring.style.cssText = `
                position:fixed; pointer-events:none; z-index:9999;
                left:${cx - 10}px; top:${cy - 10}px;
                width:20px; height:20px; border-radius:50%;
                border:3px solid rgba(167,7,64,0.9);
                box-shadow:0 0 20px rgba(167,7,64,0.7), inset 0 0 15px rgba(167,7,64,0.3);
                opacity:0.9; transition:all 0.5s cubic-bezier(0,0,0.2,1);
            `;
    document.body.appendChild(ring);
    requestAnimationFrame(() => {
        ring.style.width = `${Math.max(rect.width, rect.height) * 1.8}px`;
        ring.style.height = `${Math.max(rect.width, rect.height) * 1.8}px`;
        ring.style.left = `${cx - Math.max(rect.width, rect.height) * 0.9}px`;
        ring.style.top = `${cy - Math.max(rect.width, rect.height) * 0.9}px`;
        ring.style.opacity = '0';
        ring.style.borderColor = 'rgba(255,200,50,0)';
    });
    setTimeout(() => ring.remove(), 600);

    const shrapColors = ['#a70740', '#d40756', '#ff4488', '#ff0000', '#ffd700'];
    for (let i = 0; i < 18; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 3 + Math.random() * 9;
            const h = 2 + Math.random() * 5;
            const c = shrapColors[Math.floor(Math.random() * shrapColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${w}px; height:${h}px; border-radius:1px;
                        background:${c};
                        box-shadow:0 0 5px ${c}, 0 0 2px #fff;
                        left:${cx}px; top:${cy}px;
                        opacity:1; transition:all ${0.35 + Math.random() * 0.3}s cubic-bezier(0,0,0.4,1);
                    `;
            document.body.appendChild(p);
            const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dist = 35 + Math.random() * 80;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) rotate(${Math.random() * 720}deg) scale(0.1)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 800);
        }, i * 15);
    }
}

function fx_esprit_enter(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const orbColors = ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#fff'];
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 4 + Math.random() * 8;
            const c = orbColors[Math.floor(Math.random() * orbColors.length)];
            const startAngle = (i / 10) * Math.PI * 2;
            const orbitR = Math.max(rect.width, rect.height) * 0.55 + Math.random() * 20;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:${c};
                        box-shadow:0 0 ${sz + 4}px ${c}, 0 0 ${sz * 3}px ${c}40;
                        left:${cx + Math.cos(startAngle) * orbitR - sz / 2}px;
                        top:${cy + Math.sin(startAngle) * orbitR - sz / 2}px;
                        opacity:0.9; transition:all ${0.6 + Math.random() * 0.4}s ease-out;
                    `;
            document.body.appendChild(p);
            const endAngle = startAngle + Math.PI * (0.5 + Math.random() * 0.5);
            requestAnimationFrame(() => {
                p.style.left = `${cx + Math.cos(endAngle) * orbitR - sz / 2}px`;
                p.style.top = `${cy + Math.sin(endAngle) * orbitR - sz / 2}px`;
                p.style.opacity = '0';
                p.style.transform = 'scale(0.2)';
            });
            setTimeout(() => p.remove(), 1100);
        }, i * 50);
    }
    const halo = mkp();
    halo.style.cssText = `
                position:fixed; pointer-events:none; z-index:9998;
                left:${cx - 15}px; top:${cy - 15}px;
                width:30px; height:30px; border-radius:50%;
                background:radial-gradient(circle, rgba(56,189,248,0.7) 0%, transparent 70%);
                box-shadow:0 0 30px rgba(56,189,248,0.5);
                opacity:0; transition:all 0.4s ease-out;
            `;
    document.body.appendChild(halo);
    requestAnimationFrame(() => {
        halo.style.opacity = '1';
        halo.style.transform = 'scale(4)';
        setTimeout(() => { halo.style.opacity = '0'; }, 250);
    });
    setTimeout(() => halo.remove(), 700);
}

function fx_tenebres_enter(rect) {
    const darkColors = ['#c084fc', '#a855f7', '#7c3aed', '#4c1d95', '#2e1065'];
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 12 + Math.random() * 25;
            const c = darkColors[Math.floor(Math.random() * darkColors.length)];
            const isTop = Math.random() < 0.5;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, ${c}80 0%, transparent 65%);
                        left:${rect.left + Math.random() * rect.width - sz / 2}px;
                        top:${isTop ? rect.top - sz / 2 : rect.bottom - sz / 2}px;
                        opacity:0; transition:all ${0.7 + Math.random() * 0.5}s cubic-bezier(0.4,0,0.6,1);
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.top = `${isTop ? rect.top + Math.random() * rect.height * 0.6 : rect.bottom - Math.random() * rect.height * 0.6}px`;
                p.style.opacity = '0.8';
                p.style.transform = `scale(${1.5 + Math.random()})`;
                setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(3)'; }, 300 + i * 60);
            });
            setTimeout(() => p.remove(), 1400);
        }, i * 50);
    }
    const flash = mkp();
    flash.style.cssText = `
                position:fixed; pointer-events:none; z-index:9997;
                left:${rect.left}px; top:${rect.top}px;
                width:${rect.width}px; height:${rect.height}px;
                border-radius:12px;
                background:rgba(88,28,135,0.25);
                opacity:0; transition:opacity 0.2s ease-out;
            `;
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
        flash.style.opacity = '1';
        setTimeout(() => { flash.style.opacity = '0'; }, 200);
    });
    setTimeout(() => flash.remove(), 500);
}

function fx_karma_enter(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const pairs = [
        { color: '#fbbf24', start: { x: rect.left - 30, y: cy } },
        { color: '#e2e8f0', start: { x: rect.right + 30, y: cy } },
        { color: '#f59e0b', start: { x: cx, y: rect.top - 30 } },
        { color: '#94a3b8', start: { x: cx, y: rect.bottom + 30 } },
    ];
    pairs.forEach((pair, idx) => {
        setTimeout(() => {
            const p = mkp();
            const sz = 8 + Math.random() * 10;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, ${pair.color} 30%, ${pair.color}40 100%);
                        box-shadow:0 0 15px ${pair.color}, 0 0 30px ${pair.color}50;
                        left:${pair.start.x - sz / 2}px; top:${pair.start.y - sz / 2}px;
                        opacity:0.9; transition:all 0.5s cubic-bezier(0.34,1.2,0.64,1);
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.left = `${cx - sz / 2}px`;
                p.style.top = `${cy - sz / 2}px`;
                p.style.transform = 'scale(0)';
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 700);
        }, idx * 80);
    });
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const p = mkp();
            const isGold = i % 2 === 0;
            const c = isGold ? '#fbbf24' : '#e2e8f0';
            const angle = (i / 8) * Math.PI * 2;
            const r = 40;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:5px; height:5px; border-radius:50%;
                        background:${c}; box-shadow:0 0 8px ${c};
                        left:${cx + Math.cos(angle) * r - 2.5}px;
                        top:${cy + Math.sin(angle) * r - 2.5}px;
                        opacity:0.9; transition:all ${0.5 + Math.random() * 0.3}s ease-out;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${(Math.random() - 0.5) * 30}px, ${(Math.random() - 0.5) * 30}px) scale(0)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 50 + 200);
    }
}

function fx_generic_enter(rect) {
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 3 + Math.random() * 6;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:#ffd700; box-shadow:0 0 8px #ffd700;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.9; transition:all 0.6s ease-out;
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 50;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 40);
    }
}

function fx_vent_leave(rect) {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 20 + Math.random() * 40;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        left:${rect.left + Math.random() * rect.width - w / 2}px;
                        top:${rect.bottom - 3}px;
                        width:${w}px; height:1px;
                        background:linear-gradient(90deg, transparent, rgba(148,219,255,0.5), transparent);
                        opacity:0.6; border-radius:2px;
                        transition:all ${0.4 + Math.random() * 0.3}s ease-out;
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translateX(${(Math.random() - 0.5) * 60}px) translateY(${10 + Math.random() * 20}px) scaleX(0.3)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 800);
        }, i * 60);
    }
}

function fx_eau_leave(rect) {
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 3 + Math.random() * 5;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${w}px; height:${w * (1.5 + Math.random())}px;
                        border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
                        background:linear-gradient(180deg, rgba(0,229,204,0.9), rgba(0,229,204,0.4));
                        box-shadow:0 0 5px rgba(0,229,204,0.6);
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.bottom - 2}px;
                        opacity:0.85; transition:all ${0.4 + Math.random() * 0.4}s cubic-bezier(0.4,0,1,1);
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 35;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${15 + Math.random() * 30}px) scaleY(0.4)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, i * 40);
    }
}

function fx_poison_leave(rect) {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 15 + Math.random() * 30;
            const alpha = 0.3 + Math.random() * 0.3;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9998;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, rgba(34,197,94,${alpha}) 0%, transparent 70%);
                        left:${rect.left + Math.random() * rect.width - sz / 2}px;
                        top:${rect.top + Math.random() * rect.height - sz / 2}px;
                        opacity:0.8; transition:all ${0.8 + Math.random() * 0.6}s ease-out;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 80;
            const dy = (Math.random() - 0.5) * 60 - 10;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) scale(3)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1500);
        }, i * 40);
    }
}

function fx_terre_leave(rect) {
    const stoneColors = ['#92614a', '#a0886b', '#c8a47a', '#5c3d2e', '#d4b896'];
    for (let i = 0; i < 18; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 3 + Math.random() * 9;
            const c = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px;
                        border-radius:${Math.random() < 0.4 ? '1px' : '30%'};
                        background:${c};
                        box-shadow:1px 1px 2px rgba(0,0,0,0.3);
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.bottom - sz}px;
                        opacity:0.8; transition:all ${0.55 + Math.random() * 0.4}s cubic-bezier(0.4,0,1,1);
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 40;
            const dy = 20 + Math.random() * 40;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 180}deg) scale(0.15)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1100);
        }, i * 30);
    }
}

function fx_lave_leave(rect) {
    const emberColors = ['#ff4500', '#ff6a00', '#ff8c00', '#dc2626', '#7f1d1d'];
    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 3 + Math.random() * 7;
            const c = emberColors[Math.floor(Math.random() * emberColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz * 0.6}px; border-radius:50%;
                        background:${c}; box-shadow:0 0 ${sz}px ${c};
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.9; transition:all ${0.6 + Math.random() * 0.5}s ease-in;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 30;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${25 + Math.random() * 50}px) scale(0.1)`;
                p.style.opacity = '0';
                p.style.filter = 'brightness(0.2)';
            });
            setTimeout(() => p.remove(), 1200);
        }, i * 40);
    }
}

function fx_plante_leave(rect) {
    const pollenColors = ['#10b981', '#34d399', '#86efac', '#fef08a', '#d9f99d'];
    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 2 + Math.random() * 5;
            const c = pollenColors[Math.floor(Math.random() * pollenColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:${c}; box-shadow:0 0 ${sz + 2}px ${c};
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + rect.height * 0.2 + Math.random() * rect.height * 0.6}px;
                        opacity:0.8; transition:all ${1.0 + Math.random() * 0.8}s cubic-bezier(0.25,0.46,0.45,0.94);
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 120;
            const dy = -(20 + Math.random() * 60);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) scale(0.3) rotate(${Math.random() * 720}deg)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1900);
        }, i * 45);
    }
}

function fx_feu_leave(rect) {
    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 2 + Math.random() * 6;
            const grey = Math.floor(50 + Math.random() * 100);
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz * 0.5}px; border-radius:50%;
                        background:rgb(${grey},${grey},${grey});
                        opacity:0.7; transition:all ${0.8 + Math.random() * 0.6}s ease-out;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + rect.height * 0.3 + Math.random() * rect.height * 0.5}px;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 50;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, -${20 + Math.random() * 50}px) scale(0.2)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1500);
        }, i * 40);
    }
}

function fx_explosion_leave(rect) {
    const debrisColors = ['#a70740', '#881337', '#f43f5e', '#fbbf24'];
    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const p = mkp();
            const w = 2 + Math.random() * 7;
            const c = debrisColors[Math.floor(Math.random() * debrisColors.length)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${w}px; height:${w * 0.5}px; border-radius:1px;
                        background:${c}; box-shadow:0 0 4px ${c}80;
                        left:${rect.left + Math.random() * rect.width}px;
                        top:${rect.top + Math.random() * rect.height}px;
                        opacity:0.9; transition:all ${0.5 + Math.random() * 0.4}s cubic-bezier(0.4,0,1,1);
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 60;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.abs(Math.sin(angle) * dist) + 10}px) rotate(${Math.random() * 360}deg) scale(0.1)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1000);
        }, i * 30);
    }
}

function fx_esprit_leave(rect) {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 8 + Math.random() * 18;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, rgba(56,189,248,0.7) 0%, transparent 65%);
                        box-shadow:0 0 12px rgba(56,189,248,0.5);
                        left:${rect.left + Math.random() * rect.width - sz / 2}px;
                        top:${rect.top + Math.random() * rect.height - sz / 2}px;
                        opacity:0.8; transition:all ${0.9 + Math.random() * 0.6}s ease-out;
                    `;
            document.body.appendChild(p);
            const dx = (Math.random() - 0.5) * 50;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, -${25 + Math.random() * 50}px) scale(2.5)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1600);
        }, i * 50);
    }
}

function fx_tenebres_leave(rect) {
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 18 + Math.random() * 35;
            const darkC = ['#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#1e1b4b'][Math.floor(Math.random() * 5)];
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9998;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, ${darkC}70 0%, transparent 70%);
                        left:${rect.left + Math.random() * rect.width - sz / 2}px;
                        top:${rect.top + Math.random() * rect.height - sz / 2}px;
                        opacity:0.7; transition:all ${0.8 + Math.random() * 0.7}s ease-out;
                    `;
            document.body.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 70;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(2.5)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1600);
        }, i * 45);
    }
}

function fx_karma_leave(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const orbs = [
        { c: '#fbbf24', tx: -60, ty: -20 },
        { c: '#e2e8f0', tx: 60, ty: 20 },
        { c: '#f59e0b', tx: 20, ty: -50 },
        { c: '#94a3b8', tx: -20, ty: 50 },
    ];
    orbs.forEach((orb, idx) => {
        setTimeout(() => {
            const p = mkp();
            const sz = 8 + Math.random() * 8;
            p.style.cssText = `
                        position:fixed; pointer-events:none; z-index:9999;
                        width:${sz}px; height:${sz}px; border-radius:50%;
                        background:radial-gradient(circle, ${orb.c} 30%, ${orb.c}30 100%);
                        box-shadow:0 0 12px ${orb.c}, 0 0 25px ${orb.c}40;
                        left:${cx - sz / 2}px; top:${cy - sz / 2}px;
                        opacity:0.9; transition:all ${0.55 + Math.random() * 0.25}s cubic-bezier(0.34,0,0.64,1);
                    `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${orb.tx}px, ${orb.ty}px) scale(0.1)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 900);
        }, idx * 70);
    });
}

function fx_generic_leave(rect) {
    fx_vent_leave(rect);
}

window.createSparkles = createSparkles;
window.playForgeAnimation = playForgeAnimation;
window.attachLvl5CardEffects = attachLvl5CardEffects;
