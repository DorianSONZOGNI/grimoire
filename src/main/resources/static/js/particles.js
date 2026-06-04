import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS, javaClassToCode } from './constants.js';
import * as ui from './ui.js';
import * as api from './api.js';

import { playForgeAnimation, createBetrayalSlash } from './animations.js';

export function attachLvl5CardEffects(container) {
    const cards = container.querySelectorAll('.spell-card-lvl-5');
    cards.forEach(card => {
        // Nettoyer les anciens listeners via cloneNode trick
        const fresh = card.cloneNode(true);
        card.parentNode.replaceChild(fresh, card);

        // Déterminer la voie / spiritualité depuis les badges
        const badgeText = (fresh.querySelector('.spell-badges')?.innerText || '').toLowerCase();
        const origin = getLvl5Origin(badgeText);

        fresh.addEventListener('mouseenter', () => spellCardEnter(fresh, origin));
        fresh.addEventListener('mouseleave', () => spellCardLeave(fresh, origin));
    });
}

export function spellCardEnter(card, origin) {
    const baseOrigin = origin.startsWith('karma-') ? 'karma' : origin;
    const enterCls = `lvl5-enter-${baseOrigin}`;
    card.classList.remove(enterCls);
    void card.offsetWidth;
    card.classList.add(enterCls);
    card.addEventListener('animationend', () => card.classList.remove(enterCls), { once: true });

    const rect = card.getBoundingClientRect();
    switch (baseOrigin) {
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
        case 'karma': fx_karma_enter(rect, origin); break;
        default: fx_generic_enter(rect);
    }
}

export function spellCardLeave(card, origin) {
    const baseOrigin = origin.startsWith('karma-') ? 'karma' : origin;
    const leaveCls = `lvl5-leave-${baseOrigin}`;
    card.classList.remove(leaveCls);
    void card.offsetWidth;
    card.classList.add(leaveCls);
    card.addEventListener('animationend', () => card.classList.remove(leaveCls), { once: true });

    const rect = card.getBoundingClientRect();
    switch (baseOrigin) {
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
        case 'karma': fx_karma_leave(rect, origin); break;
        default: fx_generic_leave(rect);
    }
}

export function fx_vent_enter(rect) {
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
    // quelques particules d'air qui tourbillonnent
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

export function fx_eau_enter(rect) {
    // Ondulation de surface
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
    // Bulles qui montent
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

export function fx_poison_enter(rect) {
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
    // brume verte centrale
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

export function fx_terre_enter(rect) {
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
    // poussière lumineuse ocre
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

export function fx_lave_enter(rect) {
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
                    // goutte au bout
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

export function fx_plante_enter(rect) {
    const greenColors = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#86efac'];
    // vrilles SVG-like (lignes courbées)
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
    // feuilles
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

export function fx_feu_enter(rect) {
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
    // étincelles
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

export function fx_explosion_enter(rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // onde de choc
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

    // éclats de shrapnel
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

export function fx_esprit_enter(rect) {
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
    // halo lumineux central
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

export function fx_tenebres_enter(rect) {
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
    // flash de ténèbres
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

export function fx_karma_enter(rect, origin = 'karma') {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let col1 = '#fbbf24', col2 = '#e2e8f0', col3 = '#f59e0b', col4 = '#94a3b8';
    if (origin === 'karma-tenebres') {
        col1 = '#c084fc'; col2 = '#4c1d95'; col3 = '#9333ea'; col4 = '#2e1065';
    } else if (origin === 'karma-lumiere') {
        col1 = '#fef08a'; col2 = '#f59e0b'; col3 = '#fde047'; col4 = '#fbbf24';
    } else if (origin === 'karma-harmonie') {
        col1 = '#bae6fd'; col2 = '#cbd5e1'; col3 = '#38bdf8'; col4 = '#94a3b8';
    }

    const pairs = [
        { color: col1, start: { x: rect.left - 30, y: cy } },
        { color: col2, start: { x: rect.right + 30, y: cy } },
        { color: col3, start: { x: cx, y: rect.top - 30 } },
        { color: col4, start: { x: cx, y: rect.bottom + 30 } },
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
    // spirale de petites orbes
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const p = mkp();
            const isGold = i % 2 === 0;
            const c = isGold ? col1 : col2;
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

export function fx_generic_enter(rect) {
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

export function fx_vent_leave(rect) {
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

export function fx_eau_leave(rect) {
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

export function fx_poison_leave(rect) {
    // Un peu plus de particules pour un effet plus dense
    const numParticles = 15;

    for (let i = 0; i < numParticles; i++) {
        // Spawn plus espacé dans le temps pour ralentir l'action
        setTimeout(() => {
            const p = mkp(); // Assurez-vous que mkp() crée bien l'élément DOM

            // Tailles variées, légèrement plus grandes
            const sz = 20 + Math.random() * 40;

            // Couleurs plus riches (nuances dynamiques de vert toxique)
            const hue = 100 + Math.random() * 50; // De vert jaunâtre à vert forêt
            const alpha = 0.5 + Math.random() * 0.4;

            p.style.cssText = `
                position: fixed; pointer-events: none; z-index: 9998;
                width: ${sz}px; height: ${sz}px; border-radius: 50%;
                /* Gradient complexe : coeur brillant et bords sombres poisseux */
                background: radial-gradient(circle, hsla(${hue}, 90%, 50%, ${alpha}) 0%, hsla(${hue - 20}, 80%, 20%, ${alpha * 0.7}) 50%, transparent 80%);
                left: ${rect.left + Math.random() * rect.width - sz / 2}px;
                top: ${rect.top + Math.random() * rect.height - sz / 2}px;
                opacity: 0.9;
                /* Flou pour l'aspect brume épaisse et fusion des bulles */
                filter: blur(${2 + Math.random() * 4}px);
                mix-blend-mode: screen;
                /* Transition beaucoup plus lente avec un effet de résistance visqueuse */
                transition: transform ${2 + Math.random() * 1.5}s cubic-bezier(0.4, 0.0, 0.2, 1), 
                            opacity ${2 + Math.random() * 1.5}s ease-in-out;
            `;

            document.body.appendChild(p);

            // Mouvement : le poison est lourd, il s'étale et "coule" vers le bas (gravité)
            const dx = (Math.random() - 0.5) * 90;
            const dy = (Math.random() * 70) - 10; // Majoritairement positif (vers le bas)

            // L'échelle varie de façon asymétrique pour simuler une matière qui s'étire
            const scaleX = 1.5 + Math.random();
            const scaleY = 2 + Math.random() * 1.5;

            requestAnimationFrame(() => {
                // Double RAF pour s'assurer que le navigateur applique bien la transition CSS
                requestAnimationFrame(() => {
                    p.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
                    p.style.opacity = '0';
                });
            });

            // On attend plus longtemps avant de détruire les éléments (environ 4 secondes)
            setTimeout(() => p.remove(), 4000);
        }, i * 90); // 90ms entre chaque particule
    }
}

export function fx_terre_leave(rect) {
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

export function fx_lave_leave(rect) {
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

export function fx_plante_leave(rect) {
    // --- 1. La Liane qui pousse et s'enroule ---
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = `
        position: fixed; pointer-events: none; z-index: 9998;
        overflow: visible; width: 1px; height: 1px;
        /* Départ : Coin inférieur droit de la carte */
        left: ${rect.right - 10}px; 
        top: ${rect.bottom}px;
    `;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    // Paramètres d'amplitude
    const w = 40 + Math.random() * 20; // Amplitude horizontale
    const h = 30 + Math.random() * 20; // Amplitude verticale

    // Trajectoire orientée vers le haut (-y) et la gauche (-x)
    const d = `
        M 0 0 
        C ${-w} ${-h * 0.3}, ${-w * 1.5} ${-h * 0.7}, -10 ${-h} 
        C ${w * 0.5} ${-h * 1.3}, ${-w} ${-h * 1.7}, -20 ${-h * 2}
        C ${-w * 2} ${-h * 2.3}, ${-w * 2.5} ${-h * 2.7}, -40 ${-h * 3}
    `;

    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#10b981'); // Vert émeraude
    path.setAttribute('stroke-width', '5');
    path.setAttribute('stroke-linecap', 'round');
    path.style.filter = 'drop-shadow(0px 0px 6px rgba(16, 185, 129, 0.6))';

    svg.appendChild(path);
    document.body.appendChild(svg);

    // 1. Définition de l'état initial (Liane complètement masquée)
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    // 2. LE CORRECTIF : On force le navigateur à calculer cet état initial
    path.getBoundingClientRect();

    // 3. Application de la transition (liane qui pousse sur 2.5s, puis s'efface)
    path.style.transition = 'stroke-dashoffset 2.5s ease-out, opacity 1s ease-in-out 2.5s';

    // 4. Déclenchement de l'état final
    path.style.strokeDashoffset = '0';
    path.style.opacity = '0';

    // Nettoyage retardé pour correspondre à la nouvelle lenteur (2.5s + 1s = 3.5s)
    setTimeout(() => svg.remove(), 3600);


    // --- 2. Le Pollen ---
    const pollenColors = ['#10b981', '#34d399', '#86efac', '#fef08a', '#d9f99d'];

    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const p = mkp();
            const sz = 2 + Math.random() * 5;
            const c = pollenColors[Math.floor(Math.random() * pollenColors.length)];

            p.style.cssText = `
                position: fixed; pointer-events: none; z-index: 9999;
                width: ${sz}px; height: ${sz}px; border-radius: 50%;
                background: ${c}; box-shadow: 0 0 ${sz + 2}px ${c};
                /* Le pollen spawn autour du bas droit */
                left: ${rect.right - 20 + (Math.random() - 0.5) * 40}px;
                top: ${rect.bottom - Math.random() * 40}px;
                opacity: 0.9; 
                transition: all ${1.5 + Math.random() * 1.5}s ease-out;
            `;

            document.body.appendChild(p);

            // Dispersion orientée vers la gauche (dx négatif) et le haut (dy négatif)
            const dx = -(20 + Math.random() * 100);
            const dy = -(60 + Math.random() * 100);

            // Pour le pollen, le requestAnimationFrame reste suffisant car on anime transform/opacity
            requestAnimationFrame(() => {
                p.style.transform = `translate(${dx}px, ${dy}px) scale(0.3) rotate(${Math.random() * 720}deg)`;
                p.style.opacity = '0';
            });

            setTimeout(() => p.remove(), 3100);

        }, i * 120);
    }
}

export function fx_feu_leave(rect) {
    // cendres
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

export function fx_explosion_leave(rect) {
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

export function fx_esprit_leave(rect) {
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

export function fx_tenebres_leave(rect) {
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

export function fx_karma_leave(rect, origin = 'karma') {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let col1 = '#fbbf24', col2 = '#e2e8f0', col3 = '#f59e0b', col4 = '#94a3b8';
    if (origin === 'karma-tenebres') {
        col1 = '#c084fc'; col2 = '#4c1d95'; col3 = '#9333ea'; col4 = '#2e1065';
    } else if (origin === 'karma-lumiere') {
        col1 = '#fef08a'; col2 = '#f59e0b'; col3 = '#fde047'; col4 = '#fbbf24';
    } else if (origin === 'karma-harmonie') {
        col1 = '#bae6fd'; col2 = '#cbd5e1'; col3 = '#38bdf8'; col4 = '#94a3b8';
    }

    const orbs = [
        { c: col1, tx: -60, ty: -20 },
        { c: col2, tx: 60, ty: 20 },
        { c: col3, tx: 20, ty: -50 },
        { c: col4, tx: -20, ty: 50 },
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

export function fx_generic_leave(rect) {
    fx_vent_leave(rect);
}

export function mkp() {
    const el = document.createElement('div');
    el.style.pointerEvents = 'none';
    return el;
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

