import { state } from './state.js';
import { GLOBAL_STAT_LABELS, GLOBAL_SRC_LABELS } from './constants.js';

export function formatStat(stat) {
    return GLOBAL_STAT_LABELS[stat] || stat;
}

export function formatSrc(src) {
    return GLOBAL_SRC_LABELS[src] || src;
}

export function updateDisplayModeUI() {
    const container = document.getElementById('createdSpellsContainer');
    const btnText = document.getElementById('toggleDisplayText');
    const btnIcon = document.getElementById('toggleDisplayIcon');

    if (!container || !btnText || !btnIcon) return;

    if (state.grimoireDisplayMode === 'scroll') {
        container.classList.remove('full-mode');
        container.classList.add('scroll-mode');
        btnText.innerText = "Mode Scroll";
        btnIcon.innerText = "unfold_less";
    } else {
        container.classList.remove('scroll-mode');
        container.classList.add('full-mode');
        btnText.innerText = "Mode Étendu";
        btnIcon.innerText = "unfold_more";
    }
    adjustGrimoireHeight();
}

export function toggleDisplayMode() {
    state.grimoireDisplayMode = state.grimoireDisplayMode === 'scroll' ? 'full' : 'scroll';
    localStorage.setItem('state.grimoireDisplayMode', state.grimoireDisplayMode);
    updateDisplayModeUI();
}

export function adjustGrimoireHeight() {
    const panels = document.querySelectorAll('.panel');
    if (panels.length < 2) return;
    const forgePanel = panels[0];
    const grimoirePanel = panels[1];
    const spellsList = document.getElementById('createdSpellsContainer');
    const filters = document.getElementById('grimoireFiltersContainer');

    if (!spellsList) return;

    if (window.innerWidth >= 1025) {
        if (state.grimoireDisplayMode === 'scroll') {
            const forgeHeight = forgePanel.offsetHeight > 0 ? forgePanel.offsetHeight : window.innerHeight - 200;

            const title = grimoirePanel.querySelector('.panel-title');

            const titleHeight = title ? title.offsetHeight : 0;
            const filtersHeight = filters ? filters.offsetHeight : 0;

            // Gap is 1.5rem (24px) between children
            // Padding is 2rem top + 2rem bottom = 64px
            // Gaps: 2 * 24px = 48px
            // Total offset = 112px
            const offset = 112;

            const targetHeight = forgeHeight - titleHeight - filtersHeight - offset;

            spellsList.style.maxHeight = `${Math.max(300, targetHeight)}px`;
            spellsList.style.height = `${Math.max(300, targetHeight)}px`;
        } else {
            spellsList.style.maxHeight = '';
            spellsList.style.height = '';
        }
    } else {
        spellsList.style.maxHeight = '';
        spellsList.style.height = '';
    }
}

export function initResizeObserver() {
    const panels = document.querySelectorAll('.panel');
    if (panels.length < 2) return;
    const forgePanel = panels[0];

    const observer = new ResizeObserver(() => {
        adjustGrimoireHeight();
    });
    observer.observe(forgePanel);

    window.addEventListener('resize', adjustGrimoireHeight);
}

export function renderOptions(arr, selectedVal) {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.map(item => {
        if (!item) return '';
        const val = typeof item === 'object' ? (item.id !== undefined ? item.id : item.type) : item;
        const name = typeof item === 'object' ? (item.nom !== undefined ? item.nom : item.label) : item;
        return `<option value="${val}" ${val === selectedVal ? 'selected' : ''}>${name}</option>`;
    }).join('');
}

export function renderSourceOptions(arr, selectedVal) {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.map(s => {
        const val = typeof s === 'object' ? s.id || s : s;
        return `<option value="${val}" ${val === selectedVal ? 'selected' : ''}>${formatSrc(val)}</option>`;
    }).join('');
}

export function renderStatOptions(arr, selectedVal) {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.filter(s => {
        const val = typeof s === 'object' ? s.id || s : s;
        return val !== 'POISON' && val !== 'BURN' && val !== 'AME_DETACHEE';
    }).map(s => {
        const val = typeof s === 'object' ? s.id || s : s;
        return `<option value="${val}" ${val === selectedVal ? 'selected' : ''}>${formatStat(val)}</option>`;
    }).join('');
}

export function getSpellColor(sp) {
    if (sp.voie && sp.voie.nom) {
        return getVoieButtonColor(sp.voie);
    }
    if (sp.spiritualite && sp.spiritualite.nom) {
        return getSpiritButtonColor(sp.spiritualite);
    }
    return '#ffffff';
}

export function hexToRgb(hex) {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

export function getVoieIcon(nom) {
    const n = nom.toLowerCase();
    if (n.includes('raison')) return 'psychology';
    if (n.includes('sûreté') || n.includes('surete')) return 'water_drop';
    if (n.includes('trahison')) return 'visibility_off';
    if (n.includes('consolidation')) return 'foundation';
    if (n.includes('conviction')) return 'volcano';
    if (n.includes('création') || n.includes('creation')) return 'eco';
    if (n.includes('destruction')) return 'local_fire_department';
    if (n.includes('violence')) return 'explosion';
    return 'radio_button_unchecked';
}

export function getSpiritIcon(nom) {
    const n = nom.toLowerCase();
    if (n.includes('esprit')) return 'blur_on';
    if (n.includes('ténèbres') || n.includes('tenebres')) return 'dark_mode';
    if (n.includes('karma')) return 'all_inclusive';
    return 'radio_button_unchecked';
}

export function makeCustomSelect(selectIdOrElement) {
    const select = typeof selectIdOrElement === 'string'
        ? document.getElementById(selectIdOrElement)
        : selectIdOrElement;
    if (!select || select.dataset.customized) return;

    select.style.display = 'none';
    select.dataset.customized = "true";

    const selectId = select.id || '';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.fontFamily = "inherit";

    const trigger = document.createElement('div');
    trigger.style.padding = '0.6rem 0.8rem';
    trigger.style.background = 'rgba(255, 255, 255, 0.05)';
    trigger.style.border = '1px solid var(--glass-border)';
    trigger.style.borderRadius = '8px';
    trigger.style.cursor = 'pointer';
    trigger.style.display = 'flex';
    trigger.style.alignItems = 'center';
    trigger.style.gap = '0.6rem';
    trigger.style.color = '#fff';
    trigger.style.fontSize = '0.9rem';

    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('custom-select-options');
    optionsContainer.style.position = 'absolute';
    optionsContainer.style.top = '100%';
    optionsContainer.style.left = '0';
    optionsContainer.style.right = '0';
    optionsContainer.style.background = '#1e293b';
    optionsContainer.style.border = '1px solid var(--glass-border)';
    optionsContainer.style.borderRadius = '8px';
    optionsContainer.style.marginTop = '4px';
    optionsContainer.style.zIndex = '999999';
    optionsContainer.style.maxHeight = '220px';
    optionsContainer.style.overflowY = 'auto';
    optionsContainer.style.display = 'none';
    optionsContainer.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';

    const getIconInfo = (id, text) => {
        if (id === 'voieSelect' || id === 'filterVoie' || id === 'heroConfigVoie') {
            if (text.includes('Aucune') || text.includes('Neutre')) return { icon: 'trip_origin', color: '#94a3b8' };
            return { icon: getVoieIcon(text), color: getVoieButtonColor({ nom: text }) };
        }
        if (id === 'spiritSelect' || id === 'filterSpirit' || id === 'heroConfigSpiritualite') {
            if (text.includes('Aucune') || text.includes('Neutre')) return { icon: 'trip_origin', color: '#94a3b8' };
            return { icon: getSpiritIcon(text), color: getSpiritButtonColor({ nom: text }) };
        }
        if (id === 'niveau' || id === 'filterLevel') {
            const t = text.toLowerCase();
            if (t.includes('tous') || t.includes('all')) return { icon: 'layers', color: '#94a3b8' };
            if (t.includes('1')) return { icon: 'looks_one', color: '#cbd5e1' };
            if (t.includes('2')) return { icon: 'looks_two', color: '#10b981' };
            if (t.includes('3')) return { icon: 'looks_3', color: '#3b82f6' };
            if (t.includes('4')) return { icon: 'looks_4', color: '#a855f7' };
            if (t.includes('5')) return { icon: 'looks_5', color: '#f59e0b' };
            return { icon: 'stairs', color: '#10b981' };
        }
        if (id === 'heroConfigCharacterSelect' || id === 'sandboxAddAllySelect' || id === 'sandboxAddEnemySelect') {
            const t = text.toLowerCase();
            if (t.includes('générique') || t.includes('generique')) return { icon: 'person', color: '#94a3b8' };
            if (t.includes('charger')) return { icon: 'download', color: '#94a3b8' };
            return { icon: 'account_circle', color: '#10b981' };
        }
        if (id === 'castingTypeSelect') {
            if (text.includes('Instant')) return { icon: 'bolt', color: '#f59e0b' };
            if (text.includes('Banal')) return { icon: 'hourglass_empty', color: '#3b82f6' };
            return { icon: 'cyclone', color: '#8b5cf6' };
        }
        if (id && id.toLowerCase().includes('damagetype')) {
            const t = text.toLowerCase();
            if (t.includes('magic') || t.includes('magique')) return { icon: 'auto_awesome', color: '#a855f7' };
            if (t.includes('physic') || t.includes('physique')) return { icon: 'swords', color: '#f43f5e' };
            if (t.includes('brut')) return { icon: 'bloodtype', color: '#ef4444' };
            return { icon: 'star', color: '#94a3b8' };
        }
        if (id === 'filterEffect') {
            const t = text.toLowerCase();
            if (t.includes('tous') || t.includes('all')) return { icon: 'category', color: '#94a3b8' };
            if (t === 'dégâts' || t === 'degats') return { icon: 'swords', color: '#f43f5e' };
            if (t === 'soins' || t === 'soin') return { icon: 'favorite', color: '#10b981' };
            if (t === 'mana') return { icon: 'water_drop', color: '#38bdf8' };
            if (t === 'effets' || t === 'effet') return { icon: 'auto_awesome', color: '#a78bfa' };
            if (t.includes('fixes') && (t.includes('dégâ') || t.includes('dega'))) return { icon: 'swords', color: '#f43f5e' };
            if (t.includes('%') && (t.includes('dégâ') || t.includes('dega'))) return { icon: 'explosion', color: '#f97316' };
            if (t.includes('fixes') && t.includes('soin')) return { icon: 'favorite', color: '#10b981' };
            if (t.includes('%') && t.includes('soin')) return { icon: 'healing', color: '#ec4899' };
            if (t.includes('mana') && t.includes('fixe')) return { icon: 'water_drop', color: '#38bdf8' };
            if (t.includes('mana') && t.includes('%')) return { icon: 'water_drop', color: '#7dd3fc' };
            if (t.includes('buff') || t.includes('débuff') || t.includes('debuff')) return { icon: 'trending_up', color: '#3b82f6' };
            if (t.includes('dot') || (t.includes('durée') && (t.includes('dégâ') || t.includes('dega')))) return { icon: 'whatshot', color: '#f97316' };
            if (t.includes('hot') || (t.includes('durée') && t.includes('soin'))) return { icon: 'spa', color: '#34d399' };
            if (t.includes('mot') || (t.includes('mana') && t.includes('tick'))) return { icon: 'cyclone', color: '#8b5cf6' };
            if (t.includes('dissipation') || t.includes('purge')) return { icon: 'air', color: '#a78bfa' };
            if (t.includes('bouclier') || t.includes('shield')) return { icon: 'security', color: '#06b6d4' };
            return { icon: 'auto_awesome', color: '#94a3b8' };
        }
        if (id === 'sortBy') {
            const t = text.toLowerCase();
            if (t.includes('récent') || t.includes('recent')) return { icon: 'schedule', color: '#38bdf8' };
            if (t.includes('nom')) return { icon: 'sort_by_alpha', color: '#a78bfa' };
            if (t.includes('décroissant') || t.includes('decroissant')) return { icon: 'trending_down', color: '#f43f5e' };
            if (t.includes('croissant')) return { icon: 'trending_up', color: '#10b981' };
            if (t.includes('mana')) return { icon: 'water_drop', color: '#0284c7' };
            return { icon: 'sort', color: '#94a3b8' };
        }
        if (id && id.startsWith('statAffected')) {
            const t = text.toLowerCase();
            if (t.includes('vitesse')) return { icon: 'bolt', color: '#f59e0b' };
            if (t.includes('mana')) return { icon: 'water_drop', color: '#38bdf8' };
            if (t.includes('vie') || t.includes('pv')) return { icon: 'favorite', color: '#ec4899' };
            if (t.includes('critique')) return { icon: 'gps_fixed', color: '#ef4444' };
            if (t.includes('armure')) return { icon: 'shield', color: '#3b82f6' };
            if (t.includes('résistance') || t.includes('resistance')) return { icon: 'shield', color: '#10b981' };
            if (t.includes('puiss')) return { icon: 'auto_awesome', color: '#a855f7' };
            if (t.includes('force')) return { icon: 'fitness_center', color: '#f43f5e' };
            if (t.includes('brûlure') || t.includes('brulure')) return { icon: 'whatshot', color: '#f97316' };
            if (t.includes('poison')) return { icon: 'skull', color: '#10b981' };
            if (t.includes('soin reçu') || t.includes('soin recu') || t.includes('heal_received')) return { icon: 'health_and_safety', color: '#10b981' };
            if (t.includes('bouclier reçu') || t.includes('bouclier recu') || t.includes('shield_received')) return { icon: 'security', color: '#06b6d4' };
            if (t.includes('soin donné') || t.includes('soin donne') || t.includes('heal_given')) return { icon: 'healing', color: '#34d399' };
            if (t.includes('bouclier donné') || t.includes('bouclier donne') || t.includes('shield_given')) return { icon: 'add_moderator', color: '#22d3ee' };
            if (t.includes('magiques au bouclier') || t.includes('mag. au bouclier') || t.includes('magic_to_shield')) return { icon: 'gavel', color: '#d946ef' };
            if (t.includes('physiques au bouclier') || t.includes('phys. au bouclier') || t.includes('physic_to_shield')) return { icon: 'gavel', color: '#f43f5e' };
            if (t.includes('perce-bouclier') || t.includes('penetration')) return { icon: 'heart_broken', color: '#fb923c' };
            if (t.includes('bouclier-percé') || t.includes('bouclier percé') || t.includes('pierced')) return { icon: 'heart_broken', color: '#ef4444' };
            if (t.includes('subis')) {
                if (t.includes('magique')) return { icon: 'explosion', color: '#a855f7' };
                if (t.includes('physique')) return { icon: 'explosion', color: '#ef4444' };
                return { icon: 'explosion', color: '#b91c1c' };
            }
            if (t.includes('infligé') || t.includes('inflige')) {
                if (t.includes('magique')) return { icon: 'auto_awesome', color: '#a855f7' };
                if (t.includes('physique')) return { icon: 'swords', color: '#f43f5e' };
                return { icon: 'bloodtype', color: '#ef4444' };
            }
            return { icon: 'star', color: '#94a3b8' };
        }
        if (id && id.toLowerCase().includes('source')) {
            const t = text.toLowerCase();
            const isLanceur = t.includes('lanceur') || t.includes('lanc') || t.includes('caster');

            if (t.includes('pv') || t.includes('health') || t.includes('vie')) {
                if (t.includes('max')) {
                    return { icon: 'favorite', color: isLanceur ? '#10b981' : '#f43f5e' };
                } else if (t.includes('act') || t.includes('curr') || t.includes('tour')) {
                    return { icon: 'monitor_heart', color: isLanceur ? '#34d399' : '#ec4899' };
                } else if (t.includes('manq') || t.includes('miss')) {
                    return { icon: 'heart_broken', color: isLanceur ? '#059669' : '#b91c1c' };
                }
                return { icon: 'favorite', color: isLanceur ? '#10b981' : '#f43f5e' };
            }

            if (t.includes('mana')) {
                const manaColor = isLanceur ? '#1d4ed8' : '#22d3ee';
                if (t.includes('max')) {
                    return { icon: 'water_drop', color: manaColor };
                } else if (t.includes('act') || t.includes('curr')) {
                    return { icon: 'waves', color: manaColor };
                } else if (t.includes('manq') || t.includes('miss')) {
                    return { icon: 'opacity', color: manaColor };
                }
                return { icon: 'water_drop', color: manaColor };
            }

            if (t.includes('force phy') || t.includes('physical')) {
                return { icon: 'fitness_center', color: isLanceur ? '#f43f5e' : '#f97316' };
            }

            if (t.includes('puiss') || t.includes('power')) {
                return { icon: 'auto_awesome', color: isLanceur ? '#a855f7' : '#fb923c' };
            }

            return { icon: 'stars', color: '#8b5cf6' };
        }
        return { icon: 'radio_button_unchecked', color: 'var(--text-muted)' };
    };

    const updateSelect = () => {
        optionsContainer.innerHTML = '';
        const options = Array.from(select.options);
        let selectedOption = options[select.selectedIndex] || options[0];

        const info = getIconInfo(selectId, selectedOption.text);
        trigger.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.2rem; color:${info.color};">${info.icon}</span> <span>${selectedOption.text}</span>`;

        options.forEach((opt, index) => {
            if (opt.disabled) {
                const separatorDiv = document.createElement('div');
                separatorDiv.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
                separatorDiv.style.margin = '0.4rem 0.8rem';
                separatorDiv.style.pointerEvents = 'none';
                optionsContainer.appendChild(separatorDiv);
                return;
            }

            const optInfo = getIconInfo(selectId, opt.text);

            const optionDiv = document.createElement('div');
            optionDiv.style.padding = '0.6rem 0.8rem';
            optionDiv.style.cursor = 'pointer';
            optionDiv.style.display = 'flex';
            optionDiv.style.alignItems = 'center';
            optionDiv.style.gap = '0.6rem';
            optionDiv.style.color = '#e2e8f0';
            optionDiv.style.fontSize = '0.9rem';
            optionDiv.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            optionDiv.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.2rem; color:${optInfo.color}; transition: transform 0.3s;">${optInfo.icon}</span> <span style="transition: transform 0.3s;">${opt.text}</span>`;

            optionDiv.addEventListener('mouseover', () => {
                optionDiv.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.03), transparent)';
                optionDiv.style.paddingLeft = '1.2rem';
                if (optInfo.color !== 'var(--text-muted)') {
                    optionDiv.style.boxShadow = `inset 3px 0 0 ${optInfo.color}, inset 20px 0 20px -20px ${optInfo.color}`;
                } else {
                    optionDiv.style.boxShadow = `inset 3px 0 0 #fff, inset 20px 0 20px -20px #fff`;
                }
                optionDiv.querySelector('.material-symbols-outlined').style.transform = 'scale(1.2)';
            });

            optionDiv.addEventListener('mouseout', () => {
                optionDiv.style.background = 'transparent';
                optionDiv.style.paddingLeft = '0.8rem';
                optionDiv.style.boxShadow = 'none';
                optionDiv.querySelector('.material-symbols-outlined').style.transform = 'scale(1)';
            });

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();

                const rect = wrapper.getBoundingClientRect();
                createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, optInfo.color);

                select.selectedIndex = index;
                select.dispatchEvent(new Event('change'));
                optionsContainer.style.display = 'none';
            });

            optionsContainer.appendChild(optionDiv);
        });
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = optionsContainer.style.display === 'block';
        document.querySelectorAll('.custom-select-options').forEach(el => el.style.display = 'none');

        if (!isVisible) {
            // Position dropdown upwards if there is not enough space below
            const rect = trigger.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 220; // matches max-height of optionsContainer

            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                optionsContainer.style.top = 'auto';
                optionsContainer.style.bottom = '100%';
                optionsContainer.style.marginTop = '0';
                optionsContainer.style.marginBottom = '4px';
            } else {
                optionsContainer.style.top = '100%';
                optionsContainer.style.bottom = 'auto';
                optionsContainer.style.marginTop = '4px';
                optionsContainer.style.marginBottom = '0';
            }
            optionsContainer.style.display = 'block';
        } else {
            optionsContainer.style.display = 'none';
        }
        optionsContainer.className = 'custom-select-options'; // tag for closing
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            optionsContainer.style.display = 'none';
        }
    });

    select.addEventListener('change', updateSelect);
    const observer = new MutationObserver(updateSelect);
    observer.observe(select, { childList: true });

    updateSelect();
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    select.parentNode.insertBefore(wrapper, select.nextSibling);
}

export function showNotif(text) {
    const notif = document.getElementById('notif');
    notif.innerText = text;
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 4000);
}

export function showGlobalTooltip(el) {
    let tooltip = document.getElementById('globalSpellTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'globalSpellTooltip';
        tooltip.onmouseenter = () => {
            if (tooltip.hideTimeout) clearTimeout(tooltip.hideTimeout);
        };
        tooltip.onmouseleave = () => {
            tooltip.style.display = 'none';
        };
        document.body.appendChild(tooltip);
    }
    if (tooltip.hideTimeout) clearTimeout(tooltip.hideTimeout);

    const dataEl = el.querySelector('.tooltip-data');
    if (!dataEl) return;

    tooltip.innerHTML = dataEl.innerHTML;
    
    const elColor = el.getAttribute('data-color');
    if (elColor) {
        tooltip.style.borderColor = elColor;
        const titleEl = tooltip.querySelector('.anomaly-tooltip-title');
        if (titleEl) {
            titleEl.style.color = elColor;
            titleEl.style.borderBottom = '1px solid ' + elColor;
        }
    } else {
        tooltip.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        const titleEl = tooltip.querySelector('.anomaly-tooltip-title');
        if (titleEl) {
            // Restore default if any
            titleEl.style.color = '#c084fc';
            titleEl.style.borderBottom = 'none';
        }
    }
    
    tooltip.style.display = 'flex';
    tooltip.style.maxHeight = '60vh';
    tooltip.style.overflowY = 'auto';
    tooltip.style.pointerEvents = 'auto';

    const rect = el.getBoundingClientRect();
    const tooltipHeight = tooltip.offsetHeight;
    
    let topPos = rect.top - tooltipHeight - 8;
    if (topPos < 10) {
        topPos = rect.bottom + 8;
        if (topPos + tooltipHeight > window.innerHeight - 10) {
            topPos = Math.max(10, window.innerHeight - tooltipHeight - 10);
        }
    }

    let leftPos = rect.right - tooltip.offsetWidth;
    if (leftPos < 10) leftPos = 10;

    tooltip.style.top = topPos + 'px';
    tooltip.style.left = leftPos + 'px';
}

export function hideGlobalTooltip() {
    const tooltip = document.getElementById('globalSpellTooltip');
    if (tooltip) {
        tooltip.hideTimeout = setTimeout(() => {
            tooltip.style.display = 'none';
        }, 150);
    }
}
