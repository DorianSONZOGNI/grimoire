

// getSlotInfo and DEFAULT_SECRETS_META → utils.js

const pageState = {
    allAnomalies: [],
    allConsumables: [],
    allEquipments: [],
    allRecipes: []
};

document.addEventListener('click', (e) => {
    // Fermer les dropdowns
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }

    const trigger = e.target.closest('.custom-select-trigger');
    if (trigger) {
        const wrapper = trigger.closest('.custom-select-wrapper');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
        return;
    }

    const option = e.target.closest('.custom-option');
    if (option) {
        const wrapper = option.closest('.custom-select-wrapper');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const labelEl = wrapper.querySelector('.cs-label');

        hiddenInput.value = option.getAttribute('data-value');
        labelEl.innerHTML = option.innerHTML;
        wrapper.classList.remove('open');
        hiddenInput.dispatchEvent(new Event('change'));
    }
});

window.addEventListener('authLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
    if (!window.isAdmin) {
        document.body.innerHTML = "<h2 style='color:red;text-align:center;margin-top:50px;'>Accès Refusé : Réservé aux Admins</h2>";
        return;
    }
    await loadItems();
    loadRecipes();
});

async function loadItems() {
    try {
        const [resA, resT, resE] = await Promise.all([
            globalFetch('/api/anomalies/all-templates'),
            globalFetch('/api/shop/templates'),
            globalFetch('/api/equipments/all')
        ]);

        if (resA && resA.ok) {
            pageState.allAnomalies = await resA.json();
            pageState.allAnomalies.sort((a, b) => {
                const spiA = a.spiritualite || 'ZZZ';
                const spiB = b.spiritualite || 'ZZZ';
                if (spiA !== spiB) return spiA.localeCompare(spiB);

                const lvlA = a.level || 1;
                const lvlB = b.level || 1;
                if (lvlA !== lvlB) return lvlA - lvlB;

                return a.name.localeCompare(b.name);
            });
        }

        let templates = [];
        if (resT && resT.ok) templates = await resT.json();

        let instances = [];
        if (resE && resE.ok) instances = await resE.json();

        let merged = [...templates, ...instances];
        let map = new Map();
        merged.forEach(e => {
            if (e && e.name) map.set(e.name, e);
        });
        const rarityOrder = { 'MAUDIT': 1, 'RELIQUE': 2, 'EPIQUE': 3, 'LEGENDAIRE': 4, 'MYTHIQUE': 5, 'RARE': 6, 'INHABITUEL': 7, 'COMMUN': 8 };
        pageState.allEquipments = Array.from(map.values()).sort((a, b) => {
            const rNameA = getRarityName(a.rarity);
            const rNameB = getRarityName(b.rarity);
            const rA = rarityOrder[rNameA] || 99;
            const rB = rarityOrder[rNameB] || 99;
            if (rA !== rB) return rA - rB;
            const sNameA = typeof (a.slot?.name || a.slot) === 'object' ? a.slot?.name : a.slot;
            const sNameB = typeof (b.slot?.name || b.slot) === 'object' ? b.slot?.name : b.slot;
            if (sNameA !== sNameB) return (sNameA || '').localeCompare(sNameB || '');
            return a.name.localeCompare(b.name);
        });
        pageState.allConsumables = pageState.allEquipments.filter(e => {
            const sName = typeof e.slot === 'object' ? e.slot?.name : e.slot;
            return sName === 'CONSOMMABLE';
        });

    } catch (e) {
        console.error("Erreur chargement / merge items :", e);
    }

    // AFFICHER LE DEBUG SUR LA PAGE
    let debugDiv = document.getElementById('debug_items_count');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug_items_count';
        debugDiv.style.color = '#10b981';
        debugDiv.style.fontSize = '0.8rem';
        debugDiv.style.marginTop = '1rem';
        const panel = document.querySelector('.admin-panel');
        if (panel) {
            panel.appendChild(debugDiv);
        } else {
            document.body.appendChild(debugDiv);
        }
    }
    debugDiv.innerHTML = `Items chargés : ${pageState.allAnomalies.length} anomalies, ${pageState.allConsumables.length} consommables. (Veuillez faire un Ctrl+F5 si vous ne voyez pas vos objets)`;

    updateRewardNameInput();
}

async function updateRewardNameInput() {
    const type = document.getElementById('rewardType').value;
    const container = document.getElementById('rewardNameContainer');
    const qtyInput = document.getElementById('rewardQty');
    if (!container) return;

    if (qtyInput) {
        if (type === 'UNLOCK_FEATURE') {
            qtyInput.value = 1;
            qtyInput.disabled = true;
            qtyInput.style.opacity = '0.5';
        } else {
            qtyInput.disabled = false;
            qtyInput.style.opacity = '1';
        }
    }

    const levelInput = document.getElementById('rewardLevel');
    if (levelInput) {
        if (type === 'UNLOCK_FEATURE') {
            levelInput.disabled = false;
            levelInput.style.opacity = '1';
        } else {
            levelInput.disabled = true;
            levelInput.style.opacity = '0.5';
            levelInput.value = 1;
        }
    }

    let optionsHtml = '';
    let displayLabel = 'Choisir un objet...';

    if (type === 'GIVE_ANOMALY') {
        pageState.allAnomalies.forEach(a => {
            const catIcon = a.category ? (getCategoryIcon(a.category)) : 'star';
            const spiriColor = a.spiritualite ? getSpiritualiteColor(a.spiritualite) : '#a855f7';
            optionsHtml += `<div class="custom-option" data-value="${a.name}">
                                        <span class="material-symbols-outlined cs-icon" style="color: ${spiriColor};">${catIcon}</span>
                                        ${a.name} (Niv. ${a.level || 1})
                                    </div>`;
        });
        container.innerHTML = `
                    <label>Nom de l'objet (Résultat)</label>
                    <div class="custom-select-wrapper" style="z-index: 9;">
                        <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                            <span class="cs-label" style="font-size: 0.9rem;">${displayLabel}</span>
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
                        </div>
                        <div class="custom-select-options custom-options">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="rewardName" value="" required>
                    </div>
                `;
    } else if (type === 'GIVE_EQUIPMENT') {
        pageState.allEquipments.filter(eq => {
            const sName = typeof eq.slot === 'object' ? eq.slot?.name : eq.slot;
            return sName !== 'CONSOMMABLE';
        }).forEach(eq => {
            const slotInfo = getSlotInfo(eq);
            const rName = getRarityName(eq.rarity);
            const rarityColor = getRarityColor(rName);
            const extraClass = slotInfo.extraClass ? ` ${slotInfo.extraClass}` : '';
            optionsHtml += `<div class="custom-option" data-value="${eq.name}">
                                        <span class="material-symbols-outlined cs-icon${extraClass}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                        <span style="color: ${rarityColor};">${eq.name}</span>
                                    </div>`;
        });
        container.innerHTML = `
                    <label>Nom de l'équipement (Résultat)</label>
                    <div class="custom-select-wrapper" style="z-index: 9;">
                        <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                            <span class="cs-label" style="font-size: 0.9rem;">${displayLabel}</span>
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
                        </div>
                        <div class="custom-select-options custom-options">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="rewardName" value="" required>
                    </div>
                `;
    } else if (type === 'GIVE_CONSUMABLE') {
        pageState.allConsumables.forEach(c => {
            const slotInfo = getSlotInfo(c);
            optionsHtml += `<div class="custom-option" data-value="${c.name}">
                                        <span class="material-symbols-outlined cs-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                        ${c.name}
                                    </div>`;
        });
        container.innerHTML = `
                    <label>Nom de l'objet (Résultat)</label>
                    <div class="custom-select-wrapper" style="z-index: 9;">
                        <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                            <span class="cs-label" style="font-size: 0.9rem;">${displayLabel}</span>
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
                        </div>
                        <div class="custom-select-options custom-options">
                            ${optionsHtml}
                        </div>
                        <input type="hidden" id="rewardName" value="" required>
                    </div>
                `;
    } else if (type === 'GIVE_SPIRIT_XP') {
        container.innerHTML = `
                    <label>Nom de l'objet (Résultat)</label>
                    <div class="custom-select-wrapper disabled" style="opacity: 0.5; pointer-events: none;">
                        <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                            <span class="cs-label" style="font-size: 0.9rem;">- XP Spiritualité -</span>
                        </div>
                        <input type="hidden" id="rewardName" value="XP Spiritualité">
                    </div>
                `;
    } else if (type === 'UNLOCK_FEATURE') {
        // Fetch dungeons to get available secrets
        let secretOptions = '';

        const defaultSecrets = window.DEFAULT_SECRETS_META;

        defaultSecrets.forEach(ds => {
            secretOptions += `<div class="custom-option" data-value="${ds.name}">
                        <span class="material-symbols-outlined cs-icon" style="color: ${ds.color};">${ds.icon}</span>
                        ${ds.name}
                    </div>`;
        });

        try {
            const res = await globalFetch('/api/pve/dungeons');
            if (res && res.ok) {
                const dungeons = await res.json();
                const secretDungeons = dungeons.filter(d => d.requiredSecret && d.requiredSecret.trim() !== '');
                secretDungeons.forEach(d => {
                    if (!defaultSecrets.some(ds => ds.name === d.requiredSecret)) {
                        secretOptions += `<div class="custom-option" data-value="${d.requiredSecret}">
                                    <span class="material-symbols-outlined cs-icon" style="color: #f59e0b;">key</span>
                                    ${d.requiredSecret} <span style="color: #64748b; font-size: 0.8rem;">(Donjon: ${d.name})</span>
                                </div>`;
                    }
                });
            }
        } catch (e) {
            console.error("Erreur chargement donjons pour secrets", e);
        }

        if (!secretOptions) {
            secretOptions = `<div class="custom-option" data-value="" style="pointer-events: none; opacity: 0.5;">
                        <span class="material-symbols-outlined cs-icon" style="color: #64748b;">warning</span>
                        Aucun secret configur\u00e9 dans les donjons
                    </div>`;
        }

        container.innerHTML = `
                    <label>Secret / D\u00e9blocage (R\u00e9sultat)</label>
                    <div class="custom-select-wrapper" style="z-index: 9;">
                        <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                            <span class="cs-label" style="font-size: 0.9rem;">
                                <span class="material-symbols-outlined cs-icon" style="color: #f59e0b;">key</span>
                                Choisir un secret...
                            </span>
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
                        </div>
                        <div class="custom-select-options custom-options">
                            ${secretOptions}
                        </div>
                        <input type="hidden" id="rewardName" value="" required>
                    </div>
                `;
    } else {
        container.innerHTML = `
                    <label>Nom de l'objet / Secret (R\u00e9sultat)</label>
                    <input type="text" id="rewardName" required placeholder="Ex: Secret du feu" class="form-control" style="width: 100%; padding: 0.6rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 8px;">
                `;
    }
}





window.showTooltipFixed = function (el) {
    let tooltip = document.getElementById('globalFixedTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'globalFixedTooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '999999';
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.transform = 'none';
        tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
        tooltip.style.border = '1px solid rgba(168, 85, 247, 0.5)';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '10px';
        tooltip.style.color = '#f8fafc';
        tooltip.style.fontSize = '0.8rem';
        tooltip.style.lineHeight = '1.4';
        tooltip.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        tooltip.style.maxWidth = 'max-content';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.wordWrap = 'normal';
        tooltip.style.textAlign = 'left';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = el.getAttribute('data-tooltip-html');
    const elColor = el.style.color || '#a855f7';
    tooltip.style.border = '1px solid ' + elColor;
    const titleEl = tooltip.querySelector('.anomaly-tooltip-title');
    if (titleEl) {
        titleEl.style.color = elColor;
        titleEl.style.borderBottom = '1px solid ' + elColor;
    }
    tooltip.style.display = 'block';

    const rect = el.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;

    if (top + tooltip.offsetHeight > window.innerHeight) {
        top = rect.top - tooltip.offsetHeight - 8;
    }
    if (left < 10) left = 10;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltip.offsetWidth - 10;
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
};

window.hideTooltipFixed = function () {
    const tooltip = document.getElementById('globalFixedTooltip');
    if (tooltip) tooltip.style.display = 'none';
};

function addRequirement(type, selectedName = '', qty = 1) {
    const list = document.getElementById(type === 'anomalie' ? 'reqAnomaliesList' : 'reqConsumablesList');
    const div = document.createElement('div');
    div.className = 'req-item';
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.alignItems = 'center';

    let optionsHtml = '';
    let displayLabel = 'Choisir un objet...';

    if (type === 'anomalie') {
        pageState.allAnomalies.forEach(a => {
            const catIcon = a.category ? (getCategoryIcon(a.category)) : 'star';
            const spiriColor = a.spiritualite ? getSpiritualiteColor(a.spiritualite) : '#a855f7';
            optionsHtml += `<div class="custom-option" data-value="${a.name}">
                                        <span class="material-symbols-outlined cs-icon" style="color: ${spiriColor};">${catIcon}</span>
                                        ${a.name} (Niv. ${a.level || 1})
                                    </div>`;
        });

        if (selectedName) {
            const selA = pageState.allAnomalies.find(a => a.name === selectedName);
            if (selA) {
                const catIcon = selA.category ? (getCategoryIcon(selA.category)) : 'star';
                const spiriColor = selA.spiritualite ? getSpiritualiteColor(selA.spiritualite) : '#a855f7';
                displayLabel = `<span class="material-symbols-outlined cs-icon" style="color: ${spiriColor};">${catIcon}</span> ${selectedName} (Niv. ${selA.level || 1})`;
            } else {
                displayLabel = `<span class="material-symbols-outlined cs-icon" style="color: #a855f7;">star</span> ${selectedName}`;
            }
        }
    } else {
        pageState.allConsumables.forEach(c => {
            const slotInfo = getSlotInfo(c);
            optionsHtml += `<div class="custom-option" data-value="${c.name}">
                                        <span class="material-symbols-outlined cs-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
                                        ${c.name}
                                    </div>`;
        });

        if (selectedName) {
            const selC = pageState.allConsumables.find(c => c.name === selectedName);
            if (selC) {
                const slotInfo = getSlotInfo(selC);
                displayLabel = `<span class="material-symbols-outlined cs-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span> ${selectedName}`;
            } else {
                displayLabel = `<span class="material-symbols-outlined cs-icon" style="color: #10b981;">inventory_2</span> ${selectedName}`;
            }
        }
    }

    div.innerHTML = `
                <div class="custom-select-wrapper" style="flex: 2;">
                    <div class="custom-select-trigger" style="background: rgba(15,23,42,0.6); padding: 0.6rem; border-radius: 8px;">
                        <span class="cs-label" style="font-size: 0.9rem;">${displayLabel}</span>
                        <span class="material-symbols-outlined" style="color: #64748b; font-size: 1.1rem;">expand_more</span>
                    </div>
                    <div class="custom-select-options custom-options">
                        ${optionsHtml}
                    </div>
                    <input type="hidden" class="req-name" value="${selectedName}">
                </div>
                <input type="number" value="${qty}" min="1" class="req-qty form-control" style="flex: 1; padding: 0.6rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 8px;">
                <button type="button" class="btn-remove-row" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 6px; cursor: pointer; padding: 0.6rem; display: flex; justify-content: center; align-items: center;">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                </button>
            `;

    div.querySelector('.btn-remove-row').addEventListener('click', () => {
        div.remove();
    });

    list.appendChild(div);
}

async function loadRecipes() {
    try {
        const res = await globalFetch('/api/alchemy/recipes');
        if (res && res.ok) {
            const data = await res.json();
            pageState.allRecipes = data; // Store for edit
            renderRecipesList();
        }
    } catch (e) {
        console.error(e);
    }
}

window.renderRecipesList = function () {
    const container = document.getElementById('recipesList');
    container.innerHTML = '';

    const searchName = (document.getElementById('searchRecipeName')?.value || '').toLowerCase();
    const filterType = document.getElementById('filterRewardType')?.value || '';

    const filteredRecipes = pageState.allRecipes.filter(r => {
        if (searchName && !r.name.toLowerCase().includes(searchName)) return false;
        if (filterType && r.rewardType !== filterType) return false;
        return true;
    });

    if (filteredRecipes.length === 0) {
        container.innerHTML = "<p style='color: var(--text-muted);'>Aucune recette trouvée.</p>";
        return;
    }

    filteredRecipes.forEach(r => {
        const div = document.createElement('div');
        div.style.background = 'rgba(0,0,0,0.3)';
        div.style.border = '1px solid var(--glass-border)';
        div.style.borderRadius = '8px';
        div.style.padding = '1rem';

        let reqs = [];
        if (r.costGold > 0) reqs.push(`<span class="anomaly-badge" style="border: 1px solid #f59e0b; background: linear-gradient(#f59e0b25, #f59e0b25), #1e293b; color: #fbbf24; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;">${r.costGold} Or</span>`);
        if (r.costSpiritXp > 0) reqs.push(`<span class="anomaly-badge" style="border: 1px solid #38bdf8; background: linear-gradient(#38bdf825, #38bdf825), #1e293b; color: #38bdf8; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;">${r.costSpiritXp} XP Spirit</span>`);

        if (r.requiredAnomalies) {
            for (const [k, v] of Object.entries(r.requiredAnomalies)) {
                const aTemp = pageState.allAnomalies.find(a => a.name === k);
                if (aTemp) {
                    const catIcon = aTemp.category ? (getCategoryIcon(aTemp.category)) : 'star';
                    const spiriColor = aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                    const tooltipData = getAnomalyTooltipHTML(aTemp, k);
                    reqs.push(`<span class="anomaly-badge" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block; cursor: help;" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined" style="font-size: 0.9rem; vertical-align: middle; color: ${spiriColor};">${catIcon}</span> ${v}x ${k}</span>`);
                } else {
                    reqs.push(`${v}x [A] ${k}`);
                }
            }
        }
        if (r.requiredConsumables) {
            for (const [k, v] of Object.entries(r.requiredConsumables)) {
                const consTemp = pageState.allConsumables.find(c => c.name === k);
                const slotInfo = getSlotInfo(consTemp);
                reqs.push(`<span class="anomaly-badge" style="border: 1px solid ${slotInfo.color}; background: linear-gradient(${slotInfo.color}25, ${slotInfo.color}25), #1e293b; color: ${slotInfo.color}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;"><span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 0.9rem; vertical-align: middle; color: ${slotInfo.color};">${slotInfo.icon}</span> ${v}x ${k}</span>`);
            }
        }

        let rewardHtml = '';
        if (r.rewardType === 'GIVE_ANOMALY') {
            const aTemp = pageState.allAnomalies.find(a => a.name === r.rewardName);
            if (aTemp) {
                const catIcon = aTemp.category ? (getCategoryIcon(aTemp.category)) : 'star';
                const spiriColor = aTemp.spiritualite ? getSpiritualiteColor(aTemp.spiritualite) : '#a855f7';
                const tooltipData = getAnomalyTooltipHTML(aTemp, r.rewardName);
                rewardHtml = `<span class="anomaly-badge" style="border: 1px solid ${spiriColor}; background: linear-gradient(${spiriColor}25, ${spiriColor}25), #1e293b; color: ${spiriColor}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block; cursor: help;" onmouseenter="showTooltipFixed(this)" onmouseleave="hideTooltipFixed()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; color: ${spiriColor};">${catIcon}</span> ${r.rewardQuantity}x ${r.rewardName}</span>`;
            } else {
                rewardHtml = `<span style="color: #10b981;">${r.rewardType} - ${r.rewardQuantity}x ${r.rewardName} (Niv. ${r.rewardLevel})</span>`;
            }
        } else if (r.rewardType === 'GIVE_CONSUMABLE') {
            const consTemp = pageState.allConsumables.find(c => c.name === r.rewardName);
            const slotInfo = getSlotInfo(consTemp);
            rewardHtml = `<span class="anomaly-badge" style="border: 1px solid ${slotInfo.color}; background: linear-gradient(${slotInfo.color}25, ${slotInfo.color}25), #1e293b; color: ${slotInfo.color}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;"><span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1rem; vertical-align: middle; color: ${slotInfo.color};">${slotInfo.icon}</span> ${r.rewardQuantity}x ${r.rewardName}</span>`;
        } else if (r.rewardType === 'GIVE_EQUIPMENT') {
            const eqTemp = pageState.allEquipments.find(e => e.name === r.rewardName);
            const slotInfo = getSlotInfo(eqTemp);
            const rNameTemp = typeof eqTemp?.rarity === 'object' ? eqTemp.rarity?.name : eqTemp?.rarity;
            const rColor = eqTemp ? (getRarityColor(rNameTemp)) : '#fbbf24';
            rewardHtml = `<span class="anomaly-badge" style="border: 1px solid ${rColor}; background: linear-gradient(${rColor}25, ${rColor}25), #1e293b; color: ${rColor}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;"><span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1rem; vertical-align: middle; color: ${slotInfo.color};">${slotInfo.icon}</span> ${r.rewardQuantity}x ${r.rewardName}</span>`;
        } else if (r.rewardType === 'GIVE_SPIRIT_XP') {
            rewardHtml = `<span class="anomaly-badge" style="border: 1px solid #38bdf8; background: linear-gradient(#38bdf825, #38bdf825), #1e293b; color: #38bdf8; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; color: #38bdf8;">self_improvement</span> ${r.rewardQuantity} XP Spiritualité</span>`;
        } else if (r.rewardType === 'UNLOCK_FEATURE') {
            const meta = window.DEFAULT_SECRETS_META.find(s => s.name === r.rewardName) || { icon: "key", color: "#f59e0b" };
            rewardHtml = `<span class="anomaly-badge" style="border: 1px solid ${meta.color}; background: linear-gradient(${meta.color}25, ${meta.color}25), #1e293b; color: ${meta.color}; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block;"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; color: ${meta.color};">${meta.icon}</span> Secret - ${r.rewardName} <span style="opacity: 0.8; font-size: 0.85em;">(Niv. ${r.rewardLevel || 1})</span></span>`;
        } else {
            rewardHtml = `<span style="color: #f59e0b;">${r.rewardType} - ${r.rewardQuantity}x ${r.rewardName}</span>`;
        }

        div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h4 style="margin: 0; color: #06b6d4;">${r.name}</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.3rem 0;">${r.description || ''}</p>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button style="background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fcd34d; border-radius: 6px; cursor: pointer; padding: 0.3rem 0.6rem; font-size: 0.8rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(245, 158, 11, 0.4)'" onmouseout="this.style.background='rgba(245, 158, 11, 0.2)'" onclick="editRecipe(${r.id})">Éditer</button>
                            <button class="btn-danger" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteRecipe(${r.id})">Supprimer</button>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; margin-top: 0.5rem; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                        <strong>Coût :</strong> ${reqs.length > 0 ? reqs.join(' ') : '<span style="color: #f59e0b;">Gratuit</span>'}
                    </div>
                    <div style="font-size: 0.85rem; margin-top: 0.5rem; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                        <strong>Résultat :</strong> ${rewardHtml}
                    </div>
                `;
        container.appendChild(div);
    });
}

document.getElementById('rewardType').addEventListener('change', updateRewardNameInput);

document.getElementById('recipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    msg.innerText = "Sauvegarde...";
    msg.style.color = "var(--text-muted)";

    const recipe = {
        name: document.getElementById('recipeName').value,
        description: document.getElementById('recipeDesc').value,
        costGold: parseFloat(document.getElementById('costGold').value) || 0,
        costSpiritXp: parseFloat(document.getElementById('costSpirit').value) || 0,
        rewardType: document.getElementById('rewardType').value,
        rewardName: document.getElementById('rewardName').value,
        rewardQuantity: parseInt(document.getElementById('rewardQty').value) || 1,
        rewardLevel: parseInt(document.getElementById('rewardLevel').value) || 1,
        requiredAnomalies: {},
        requiredConsumables: {}
    };

    const editId = document.getElementById('recipeId').value;
    if (editId) recipe.id = editId;

    const anoms = document.getElementById('reqAnomaliesList').children;
    for (let a of anoms) {
        const name = a.querySelector('.req-name').value;
        const qty = parseInt(a.querySelector('.req-qty').value);
        if (name && qty > 0) recipe.requiredAnomalies[name] = qty;
    }

    const cons = document.getElementById('reqConsumablesList').children;
    for (let c of cons) {
        const name = c.querySelector('.req-name').value;
        const qty = parseInt(c.querySelector('.req-qty').value);
        if (name && qty > 0) recipe.requiredConsumables[name] = qty;
    }

    try {
        const res = await globalFetch('/api/alchemy/admin/recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
        });
        if (res && res.ok) {
            msg.innerText = editId ? "Recette mise à jour !" : "Recette créée avec succès !";
            msg.style.color = "#10b981";
            document.getElementById('recipeForm').reset();
            document.getElementById('recipeId').value = "";
            document.getElementById('recipePanel').style.boxShadow = "none";
            document.getElementById('recipePanel').style.border = "1px solid var(--glass-border)";
            document.getElementById('reqAnomaliesList').innerHTML = '';
            document.getElementById('reqConsumablesList').innerHTML = '';
            document.getElementById('cancelEditBtn').style.display = 'none';
            loadRecipes();
        } else {
            const err = await res.text();
            msg.innerText = "Erreur: " + err;
            msg.style.color = "#ef4444";
        }
    } catch (e) {
        msg.innerText = "Erreur réseau.";
        msg.style.color = "#ef4444";
    }
});

async function deleteRecipe(id) {
    const confirmed = await window.showModal({
        title: 'Suppression',
        body: 'Voulez-vous vraiment supprimer cette recette ?',
        icon: 'warning',
        confirmText: 'Supprimer'
    });
    if (!confirmed) return;
    try {
        await globalFetch('/api/alchemy/admin/recipe/' + id, { method: 'DELETE' });
        loadRecipes();
    } catch (e) {
        showNotif("Erreur de suppression", true);
    }
}

window.editRecipe = function (id) {
    const recipe = pageState.allRecipes.find(r => r.id === id);
    if (!recipe) return;

    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('recipeName').value = recipe.name || '';
    document.getElementById('recipeDesc').value = recipe.description || '';
    document.getElementById('costGold').value = recipe.costGold || 0;
    document.getElementById('costSpirit').value = recipe.costSpiritXp || 0;

    // Set reward type using the custom select logic
    const rewardTypeWrapper = document.getElementById('rewardType').closest('.custom-select-wrapper');
    const option = rewardTypeWrapper.querySelector(`.custom-option[data-value="${recipe.rewardType}"]`);
    if (option) {
        document.getElementById('rewardType').value = recipe.rewardType;
        rewardTypeWrapper.querySelector('.cs-label').innerHTML = option.innerHTML;
        updateRewardNameInput().then(() => {
            // Setting reward name and level *after* updateRewardNameInput recreates the inputs
            setTimeout(() => {
                const rNameInput = document.getElementById('rewardName');
                if (rNameInput) {
                    if (rNameInput.tagName === 'INPUT' && rNameInput.type === 'hidden') {
                        // It's a custom select, find the option
                        const w = rNameInput.closest('.custom-select-wrapper');
                        const opt = w.querySelector(`.custom-option[data-value="${recipe.rewardName}"]`);
                        if (opt) {
                            rNameInput.value = recipe.rewardName;
                            w.querySelector('.cs-label').innerHTML = opt.innerHTML;
                        } else {
                            rNameInput.value = recipe.rewardName;
                            w.querySelector('.cs-label').innerHTML = recipe.rewardName;
                        }
                    } else {
                        rNameInput.value = recipe.rewardName;
                    }
                }
            }, 50);
        });
    }

    document.getElementById('rewardQty').value = recipe.rewardQuantity || 1;
    document.getElementById('rewardLevel').value = recipe.rewardLevel || 1;

    // Clear existing requirements
    document.getElementById('reqAnomaliesList').innerHTML = '';
    document.getElementById('reqConsumablesList').innerHTML = '';

    // Add required anomalies
    if (recipe.requiredAnomalies) {
        for (const [name, qty] of Object.entries(recipe.requiredAnomalies)) {
            addRequirement('anomalie', name, qty);
        }
    }

    // Add required consumables
    if (recipe.requiredConsumables) {
        for (const [name, qty] of Object.entries(recipe.requiredConsumables)) {
            addRequirement('consumable', name, qty);
        }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Highlight panel
    document.getElementById('recipePanel').style.boxShadow = "0 0 20px rgba(245, 158, 11, 0.4)";
    document.getElementById('recipePanel').style.border = "1px solid rgba(245, 158, 11, 0.8)";

    document.getElementById('cancelEditBtn').style.display = 'block';

    const msg = document.getElementById('formMsg');
    msg.innerText = "Mode édition actif. Modifiez et enregistrez.";
    msg.style.color = "#f59e0b";
};

window.cancelEdit = function () {
    document.getElementById('recipeForm').reset();
    document.getElementById('recipeId').value = "";
    document.getElementById('recipePanel').style.boxShadow = "none";
    document.getElementById('recipePanel').style.border = "1px solid var(--glass-border)";
    document.getElementById('reqAnomaliesList').innerHTML = '';
    document.getElementById('reqConsumablesList').innerHTML = '';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('formMsg').innerText = "";

    document.getElementById('rewardType').value = "GIVE_ANOMALY";
    const rewardTypeWrapper = document.getElementById('rewardType').closest('.custom-select-wrapper');
    if (rewardTypeWrapper) {
        const opt = rewardTypeWrapper.querySelector(`.custom-option[data-value="GIVE_ANOMALY"]`);
        if (opt) rewardTypeWrapper.querySelector('.cs-label').innerHTML = opt.innerHTML;
    }
    updateRewardNameInput();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};



