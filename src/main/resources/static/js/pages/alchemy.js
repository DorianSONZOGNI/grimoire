const pageState = {
    allRecipes: [],
    allAnomalyTemplates: [],
    allEquipmentTemplates: [],
    selectedRecipe: null,
    userAnomalies: [],
    userConsumables: [],
    userCharacters: [],
    customSelectSetups: []
};

window.addEventListener('authLoaded', async () => {
    if (window.initAppMeta) await window.initAppMeta();
    if (!window.currentUser) {
        document.querySelector('.alchemy-main').style.display = 'none';
        document.querySelector('.alchemy-main').insertAdjacentHTML('beforebegin', `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; color: white;">
                        <span class="material-symbols-outlined" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;">lock</span>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem; font-family: 'Outfit', sans-serif;">Veuillez vous connecter</h1>
                        <p style="color: #94a3b8; max-width: 400px; margin-bottom: 2rem; font-size: 1.1rem;">
                            Vous devez être connecté pour accéder à cette page.
                        </p>
                    </div>
                `);
    } else if (!window.currentUser.unlockedAlchemy) {
        document.querySelector('.alchemy-layout').style.display = 'none';
        document.querySelector('.alchemy-layout').insertAdjacentHTML('beforebegin', `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; color: white;">
                        <span class="material-symbols-outlined" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;">lock</span>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem; font-family: 'Outfit', sans-serif;">Alchimie Bloquée</h1>
                        <p style="color: #94a3b8; max-width: 400px; margin-bottom: 2rem; font-size: 1.1rem;">
                            Vous devez débloquer l'Alchimie pour y accéder. L'accès coûte 150 or.
                        </p>
                        <button onclick="promptUnlockFeature('alchemy', 'Alchimie', 150)" style="background: #10b981; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: all 0.2s;">
                            Débloquer pour 150 <span class="material-symbols-outlined" style="font-size: 1.2rem; vertical-align: middle; color: #fcd34d;">monetization_on</span>
                        </button>
                    </div>
                `);
    } else {
        Promise.all([
            fetchUserInventory(),
            fetchUserCharacters(),
            globalFetch('/api/alchemy/recipes').then(res => res.json()).then(data => pageState.allRecipes = data)
        ]).then(() => {
            setDefaultFilter();
            renderRecipesList();
        }).catch(e => console.error("Erreur chargement alchimie:", e));
    }
});

let alchemyInitialFilterSet = false;
function setDefaultFilter() {
    if (!window.currentUser || !window.currentUser.seenAlchemyRecipes) return;
    if (alchemyInitialFilterSet) return;
    alchemyInitialFilterSet = true;

    window.initialSeenRecipes = [...(window.currentUser.seenAlchemyRecipes || [])];

    const unlockedSecrets = window.currentUser.unlockedSecrets || {};
    let hasUnseen = false;
    for (const r of pageState.allRecipes) {
        if (window.currentUser.seenAlchemyRecipes.includes(r.id)) continue;

        if (r.rewardType === 'UNLOCK_FEATURE') {
            const currentLevel = unlockedSecrets[r.rewardName] || 0;
            if (currentLevel !== (r.rewardLevel - 1)) continue;
        }

        hasUnseen = true;
        break;
    }

    let bestType = 'GIVE_CONSUMABLE';
    if (hasUnseen) {
        bestType = 'NOUVEAUTE';
    }

    const input = document.getElementById('filterRewardType');
    if (!input) return;
    input.value = bestType;

    const wrapper = input.closest('.custom-select-wrapper');
    if (wrapper) {
        const option = wrapper.querySelector(`.custom-option[data-value="${bestType}"]`);
        const label = wrapper.querySelector('.cs-label');
        if (option && label) {
            label.innerHTML = option.innerHTML;
        }
    }
}

async function fetchUserInventory() {
    try {
        const [resT, resA, resEq, resC] = await Promise.all([
            globalFetch('/api/anomalies/all-templates'),
            globalFetch('/api/anomalies'),
            globalFetch('/api/equipments/templates/public'),
            globalFetch('/api/equipments')
        ]);

        if (resT && resT.ok) pageState.allAnomalyTemplates = await resT.json();
        if (resA && resA.ok) pageState.userAnomalies = await resA.json();
        if (resEq && resEq.ok) pageState.allEquipmentTemplates = await resEq.json();
        if (resC && resC.ok) {
            const equips = await resC.json();
            pageState.userConsumables = equips.filter(e => e.slot === 'CONSOMMABLE');
        }
    } catch (e) {
        console.error("Erreur chargement inventaire", e);
    }
}



function canCraftRecipe(r) {
    if (r.costGold > 0 && (window.currentUser?.monnaie || 0) < r.costGold) return false;

    if (r.costSpiritXp > 0) {
        const hasEnoughSpirit = pageState.userCharacters.some(c => (c.spiritualiteExperience || 0) >= r.costSpiritXp);
        if (!hasEnoughSpirit) return false;
    }

    if (r.requiredAnomalies) {
        for (const [name, baseQty] of Object.entries(r.requiredAnomalies)) {
            const qty = baseQty;
            let count = 0;
            if (pageState.userAnomalies) {
                count = pageState.userAnomalies.filter(a => a.name === name).length;
            }
            if (count < qty) return false;
        }
    }

    if (r.requiredConsumables) {
        for (const [name, baseQty] of Object.entries(r.requiredConsumables)) {
            const qty = baseQty;
            let count = 0;
            if (pageState.userConsumables) {
                count = pageState.userConsumables.filter(c => c.name === name).length;
            }
            if (count < qty) return false;
        }
    }

    return true;
}

function renderRecipesList() {
    const container = document.getElementById('playerRecipesList');
    container.innerHTML = '';

    const unlockedSecrets = window.currentUser?.unlockedSecrets || {};

    let hasUnseen = false;
    if (pageState.allRecipes && window.currentUser) {
        for (const r of pageState.allRecipes) {
            if (window.currentUser.seenAlchemyRecipes?.includes(r.id)) continue;
            if (r.rewardType === 'UNLOCK_FEATURE') {
                const currentLevel = unlockedSecrets[r.rewardName] || 0;
                if (currentLevel !== (r.rewardLevel - 1)) continue;
            }
            hasUnseen = true;
            break;
        }
    }
    const nouvOption = document.querySelector('.custom-option[data-value="NOUVEAUTE"]');
    if (nouvOption) {
        nouvOption.style.display = hasUnseen ? '' : 'none';
    }

    const searchTxt = (document.getElementById('searchRecipeName')?.value || '').toLowerCase();
    const filterType = document.getElementById('filterRewardType')?.value || '';

    if (filterType === 'NOUVEAUTE' && window.lastFilterType !== 'NOUVEAUTE') {
        window.initialSeenRecipes = [...(window.currentUser?.seenAlchemyRecipes || [])];
    }
    window.lastFilterType = filterType;

    const visibleRecipes = pageState.allRecipes.filter(r => {
        if (filterType === 'NOUVEAUTE') {
            if (window.initialSeenRecipes && window.initialSeenRecipes.includes(r.id)) return false;
            if (!window.initialSeenRecipes && window.currentUser?.seenAlchemyRecipes.includes(r.id)) return false;
        } else if (filterType && r.rewardType !== filterType) {
            return false;
        }

        if (searchTxt && !r.name.toLowerCase().includes(searchTxt)) return false;

        if (r.rewardType === 'UNLOCK_FEATURE') {
            const currentLevel = unlockedSecrets[r.rewardName] || 0;
            return currentLevel === (r.rewardLevel - 1);
        }
        return true;
    });

    visibleRecipes.sort((a, b) => {
        const typeDiff = a.rewardType.localeCompare(b.rewardType);
        if (typeDiff !== 0) return typeDiff;
        return a.name.localeCompare(b.name);
    });

    if (visibleRecipes.length === 0) {
        container.innerHTML = "<p style='color: var(--text-muted); text-align:center;'>Aucune recette disponible pour le moment.</p>";
        return;
    }

    visibleRecipes.forEach(r => {
        const isCraftable = canCraftRecipe(r);
        const div = document.createElement('div');
        div.dataset.craftable = isCraftable ? 'true' : 'false';
        div.className = `recipe-card bg-black/30 border ${isCraftable ? 'border-emerald-500/40 craftable-pulse' : 'border-white/10'} rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300`;

        div.onmouseover = () => div.style.borderColor = '#10b981';
        div.onmouseout = () => {
            if (pageState.selectedRecipe?.id !== r.id) {
                div.style.borderColor = '';
            }
        };
        div.onclick = () => selectRecipe(r, div);

        let rewardIcon = '';
        if (r.rewardType === 'GIVE_ANOMALY') rewardIcon = `<span class="material-symbols-outlined" style="color: #a855f7; font-size: 1.1rem; opacity: 0.8;" title="Anomalie">star</span>`;
        else if (r.rewardType === 'GIVE_CONSUMABLE') rewardIcon = `<span class="material-symbols-outlined" style="color: #10b981; font-size: 1.1rem; opacity: 0.8;" title="Consommable">inventory_2</span>`;
        else if (r.rewardType === 'GIVE_EQUIPMENT') rewardIcon = `<span class="material-symbols-outlined" style="color: #fbbf24; font-size: 1.1rem; opacity: 0.8;" title="Equipement">shield</span>`;
        else if (r.rewardType === 'UNLOCK_FEATURE') rewardIcon = `<span class="material-symbols-outlined" style="color: #f59e0b; font-size: 1.1rem; opacity: 0.8;" title="Secret">key</span>`;
        else if (r.rewardType === 'GIVE_SPIRIT_XP') rewardIcon = `<span class="material-symbols-outlined" style="color: #38bdf8; font-size: 1.1rem; opacity: 0.8;" title="XP Spiritualité">self_improvement</span>`;

        const isUnseen = window.currentUser && window.currentUser.seenAlchemyRecipes && !window.currentUser.seenAlchemyRecipes.includes(r.id);

        div.innerHTML = `
            <h4 class="m-0 ${r.rewardType === 'UNLOCK_FEATURE' ? 'text-blue-500' : 'text-cyan-400'} flex items-center justify-between" style="position:relative;">
                <span class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-xl">experiment</span>
                    ${r.name}
                </span>
                ${rewardIcon}
                ${isUnseen ? `<span class="unseen-badge" style="position:absolute; top:-12px; right:-12px; background:red; color:white; border-radius:50%; font-size:0.7rem; padding:1px 6px; font-weight:bold; box-shadow:0 0 5px rgba(255,0,0,0.5);">1</span>` : ''}
            </h4>
            <p class="text-xs text-muted mt-2 line-clamp-2">${r.description || ''}</p>
        `;
        container.appendChild(div);
    });
}

function selectRecipe(recipe, element) {
    pageState.selectedRecipe = recipe;
    pageState.craftQuantity = 1;
    // Reset borders
    Array.from(document.getElementById('playerRecipesList').children).forEach(c => {
        const isCraftable = c.dataset.craftable === 'true';
        c.className = `recipe-card bg-black/30 border ${isCraftable ? 'border-emerald-500/40 craftable-pulse' : 'border-white/10'} rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300`;
        c.style.borderColor = '';
        c.style.boxShadow = '';
    });
    element.className = `recipe-card bg-emerald-500/20 border border-emerald-500 rounded-lg p-3 cursor-pointer transition-all duration-300 ${element.dataset.craftable === 'true' ? 'craftable-pulse' : ''}`;
    element.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';

    // Mark as seen
    if (window.currentUser && window.currentUser.seenAlchemyRecipes && !window.currentUser.seenAlchemyRecipes.includes(recipe.id)) {
        window.currentUser.seenAlchemyRecipes.push(recipe.id);
        if (window.currentUser.unseenAlchemyCount > 0) {
            window.currentUser.unseenAlchemyCount--;
            window.dispatchEvent(new Event('authLoaded')); // Update header badge
        }
        const badge = element.querySelector('.unseen-badge');
        if (badge) badge.remove();
        globalFetch(`/api/alchemy/recipes/${recipe.id}/seen`, { method: 'POST' }).catch(e => console.error("Could not mark recipe as seen", e));
    }

    renderCauldron(recipe);
}

function getItemStyle(name, defaultType) {
    const lower = name.toLowerCase();
    if (lower.includes('cristal')) return { icon: 'diamond', color: '#38bdf8' }; // light blue
    if (lower.includes('cœur') || lower.includes('coeur')) return { icon: 'favorite', color: '#ef4444' }; // red
    if (/\bor\b/.test(lower) || lower.includes('pièce') || lower.includes('monnaie')) return { icon: 'monetization_on', color: '#f59e0b' }; // gold
    if (lower.includes('sceau')) return { icon: 'token', color: '#a855f7' }; // purple
    if (lower.includes('parchemin')) return { icon: 'history_edu', color: '#fb923c' }; // orange
    if (lower.includes('potion') || lower.includes('élixir') || lower.includes('elixir')) return { icon: 'science', color: '#10b981' }; // green

    if (defaultType === 'SECRET' || defaultType === 'UNLOCK' || lower.includes('secret')) {
        if (lower.includes('chaos')) return { icon: 'local_fire_department', color: '#ff0000' };
        if (lower.includes('abondance')) return { icon: 'eco', color: '#10b981' };
        if (lower.includes('préservation') || lower.includes('preservation')) return { icon: 'foundation', color: '#99674c' };
        if (lower.includes('sérénité') || lower.includes('serenite')) return { icon: 'water_drop', color: '#00e5cc' };
        if (lower.includes('chasse')) return { icon: 'visibility_off', color: '#ed5677' };
        if (lower.includes('carnage')) return { icon: 'explosion', color: '#a70740' };
        if (lower.includes('joie')) return { icon: 'volcano', color: '#b74c0b' };
        if (lower.includes('savoir')) return { icon: 'psychology', color: '#3b82f6' };
        if (lower.includes('destin')) return { icon: 'all_inclusive', color: '#e7d198' };
        if (lower.includes('éther') || lower.includes('ether')) return { icon: 'blur_on', color: '#38bdf8' };
        if (lower.includes('abysses') || lower.includes('abysse')) return { icon: 'dark_mode', color: '#c084fc' };
        return { icon: 'key', color: '#f59e0b' }; // gold
    }

    // Defaults
    if (defaultType === 'CONSUMABLE') return { icon: 'inventory_2', color: '#10b981' }; // green
    if (defaultType === 'ANOMALY') return { icon: 'auto_awesome', color: '#a855f7' }; // purple
    if (defaultType === 'SECRET' || defaultType === 'UNLOCK') return { icon: 'key', color: '#f59e0b' }; // gold
    if (defaultType === 'SPIRIT_XP') return { icon: 'self_improvement', color: '#38bdf8' }; // light blue
    if (defaultType === 'EQUIPMENT') return { icon: 'shield', color: '#fbbf24' }; // amber

    return { icon: 'category', color: '#94a3b8' }; // generic
}



function renderCauldron(r) {
    const container = document.getElementById('cauldronPanel');
    pageState.customSelectSetups = [];

    const isSecret = r.rewardType === 'UNLOCK_FEATURE' || r.rewardType === 'SECRET' || (r.rewardName && r.rewardName.toLowerCase().includes('secret'));
    const craftQty = isSecret ? 1 : (pageState.craftQuantity || 1);

    let reqsHTML = '';
    if (r.costGold > 0) {
        const reqGold = r.costGold * craftQty;
        const hasEnough = (window.currentUser?.monnaie || 0) >= reqGold;
        reqsHTML += `<div class="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-amber-500/30 mb-1">
                        <span class="material-symbols-outlined text-amber-500 text-xl">monetization_on</span>
                        <span class="text-amber-500 font-semibold text-sm">${reqGold} Or</span>
                        <span class="ml-auto text-xs font-semibold ${hasEnough ? 'text-green-500' : 'text-red-500'}">
                            ${hasEnough ? '✓' : '✗'}
                        </span>
                     </div>`;
    }

    if (r.requiredAnomalies) {
        for (const [name, baseQty] of Object.entries(r.requiredAnomalies)) {
            const qty = baseQty * craftQty;
            let matching = pageState.userAnomalies.filter(a => a.name === name);
            const currentAmount = matching.length;
            const hasEnough = currentAmount >= qty;
            const statusColor = hasEnough ? '#10b981' : '#ef4444';
            let isIdentical = true;
            if (matching.length > 0) {
                const first = matching[0];
                for (let a of matching) {
                    if (a.level !== first.level || a.spiritualite !== first.spiritualite) {
                        isIdentical = false;
                        break;
                    }
                }
            }

            const temp = pageState.allAnomalyTemplates.find(a => a.name === name) || {};
            const style = {
                icon: temp.category ? (getCategoryIcon(temp.category)) : 'star',
                color: temp.spiritualite ? getSpiritualiteColor(temp.spiritualite) : '#a855f7'
            };

            const aTemp = pageState.allAnomalyTemplates.find(a => a.name === name);
            const tooltipData = aTemp ? getAnomalyTooltipHTML(aTemp, name) : '';
            const tooltipHTML = tooltipData ? `data-color="${style.color}" class="cursor-help bg-black/40 p-2 rounded-lg mb-1" style="border: 1px solid ${style.color}40;" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData.replace(/"/g, '&quot;')}"` : `class="bg-black/40 p-2 rounded-lg mb-1" style="border: 1px solid ${style.color}40;"`;

            reqsHTML += `<div ${tooltipHTML}>
                            <div class="flex items-center justify-between gap-2" style="margin-bottom: ${(!isIdentical && hasEnough) ? '0.5rem' : '0'};">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl" style="color: ${style.color};">${style.icon}</span>
                                    <span class="font-semibold text-sm text-white">${qty}x ${name}</span>
                                </div>
                                <div class="flex items-center gap-1 text-sm font-semibold" style="color: ${statusColor};">
                                    <span class="material-symbols-outlined text-lg">${hasEnough ? 'check_circle' : 'cancel'}</span>
                                    <span>${currentAmount} / ${qty}</span>
                                </div>
                            </div>`;

            if (!isIdentical && hasEnough) {
                reqsHTML += `<div class="flex flex-col gap-1.5">`;
                let usedIndexes = new Set();
                for (let i = 0; i < qty; i++) {
                    let selectedIndex = -1;
                    for (let j = 0; j < matching.length; j++) {
                        if (!usedIndexes.has(j)) {
                            selectedIndex = j;
                            usedIndexes.add(j);
                            break;
                        }
                    }

                    let options = [{ value: '', html: '-- Choisir une anomalie --', selected: (selectedIndex === -1) }];
                    matching.forEach((a, j) => {
                        options.push({
                            value: a.id,
                            html: `Niv. ${a.level || 1} (${a.spiritualite || 'Autre'})`,
                            selected: (j === selectedIndex)
                        });
                    });

                    const selectId = `anomaly_select_${name.replace(/\s+/g, '')}_${i}`;
                    reqsHTML += `<div id="${selectId}"></div>`;

                    pageState.customSelectSetups.push(() => {
                        buildCustomSelect(document.getElementById(selectId), options, 'anomaly-select');
                    });
                }
                reqsHTML += `</div>`;
            } else if (hasEnough) {
                reqsHTML += `<div class="hidden">`;
                for (let i = 0; i < qty; i++) {
                    reqsHTML += `<input type="hidden" class="anomaly-select" value="${matching[i].id}">`;
                }
                reqsHTML += `</div>`;
            }
            reqsHTML += `</div>`;
        }
    }

    if (r.requiredConsumables) {
        for (const [name, baseQty] of Object.entries(r.requiredConsumables)) {
            const qty = baseQty * craftQty;
            let matching = pageState.userConsumables.filter(c => c.name === name);
            const hasEnough = matching.length >= qty;
            const statusColor = hasEnough ? '#10b981' : '#ef4444';
            const statusIcon = hasEnough ? 'check_circle' : 'cancel';

            const style = getItemStyle(name, 'CONSUMABLE');
            const temp = pageState.allEquipmentTemplates.find(e => e.name === name);
            const statsData = window.getEquipmentTooltipHTML(temp);
            const slotInfo = getSlotInfo(temp);
            const rarityColor = getRarityColor(temp.rarity);
            const tooltipData = `
                <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${rarityColor}; border-bottom:1px solid ${rarityColor}40; padding-bottom:4px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="display: flex; align-items: center; gap: 6px;">${temp.name}</span>
                    <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.1rem; color: ${slotInfo.color};" title="${slotInfo.label}">${slotInfo.icon}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">${statsData}</div>
            `.replace(/"/g, '&quot;');
            const tooltipAttrs = tooltipData ? `data-color="${style.color}" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData}" class="cursor-help bg-black/40 p-2 rounded-lg mb-1" style="border: 1px solid ${style.color}40;"` : `class="bg-black/40 p-2 rounded-lg mb-1" style="border: 1px solid ${style.color}40;"`;

            reqsHTML += `<div ${tooltipAttrs}>
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-xl" style="color: ${style.color};">${style.icon}</span>
                                <span class="font-semibold text-sm text-white">${qty}x ${name}</span>
                            </div>
                            <div class="flex items-center gap-1 text-sm font-semibold" style="color: ${statusColor};">
                                <span class="material-symbols-outlined text-lg">${statusIcon}</span>
                                ${matching.length}/${qty}
                            </div>
                        </div>`;

            if (hasEnough) {
                reqsHTML += `<div class="hidden">`;
                for (let i = 0; i < qty; i++) {
                    reqsHTML += `<input type="hidden" class="consumable-select" value="${matching[i].id}">`;
                }
                reqsHTML += `</div>`;
            }
            reqsHTML += `</div>`;
        }
    }

    // Character selector if needed for Spirit XP
    let crafterSelectHTML = '';
    if (r.costSpiritXp > 0 || r.rewardType === 'GIVE_SPIRIT_XP') {
        let actionText = '';
        if (r.costSpiritXp > 0 && r.rewardType === 'GIVE_SPIRIT_XP') {
            actionText = `(-${r.costSpiritXp * craftQty} XP Spirit. / Gagne ${r.rewardQuantity * craftQty} XP)`;
        } else if (r.costSpiritXp > 0) {
            actionText = `(-${r.costSpiritXp * craftQty} XP Spirit.)`;
        } else if (r.rewardType === 'GIVE_SPIRIT_XP') {
            actionText = `(Gagne ${r.rewardQuantity * craftQty} XP Spirit.)`;
        }

        crafterSelectHTML = `
                    <div class="mt-4 text-left w-full">
                        <label class="text-emerald font-semibold text-sm">
                            <span class="material-symbols-outlined text-base align-middle text-emerald">star</span>
                            Sélectionnez le personnage canalisant ${actionText} :
                        </label>
                        <div id="crafterSelectContainer" class="mt-1">
                            <div class="p-1 text-muted text-sm">Chargement...</div>
                        </div>
                    </div>
                `;
        fetchUserCharacters();
    }

    let resultLabel = "Résultat Attendu";
    let resultType = 'OTHER';
    if (r.rewardType === 'UNLOCK_FEATURE') {
        resultLabel = "Secret Débloqué";
        resultType = 'SECRET';
    } else if (r.rewardType === 'GIVE_CONSUMABLE') {
        resultType = 'CONSUMABLE';
    } else if (r.rewardType === 'GIVE_EQUIPMENT') {
        resultType = 'EQUIPMENT';
    } else if (r.rewardType === 'GIVE_ANOMALY' || r.rewardType === 'UPGRADE_ANOMALY') {
        resultType = 'ANOMALY';
    } else if (r.rewardType === 'GIVE_SPIRIT_XP') {
        resultLabel = "XP Spiritualité";
        resultType = 'SPIRIT_XP';
    }

    const resultStyle = getItemStyle(r.rewardName, resultType);
    let resultIcon = resultStyle.icon;
    let resultColor = resultStyle.color;

    if (resultType === 'EQUIPMENT' || resultType === 'CONSUMABLE') {
        const eqTemp = pageState.allEquipmentTemplates.find(e => e.name === r.rewardName);
        if (eqTemp && eqTemp.rarity) {
            const rName = getRarityName(eqTemp.rarity);
            resultColor = getRarityColor(rName);
        }
    } else if (resultType === 'ANOMALY') {
        const anomTemp = pageState.allAnomalyTemplates.find(a => a.name === r.rewardName);
        if (anomTemp && anomTemp.spiritualite) {
            resultColor = getSpiritualiteColor(anomTemp.spiritualite);
        }
    }

    let quantityDisplay = `${r.rewardQuantity * craftQty}x ${r.rewardName}`;
    if (r.rewardType === 'GIVE_SPIRIT_XP') {
        quantityDisplay = `+${r.rewardQuantity} XP Spiritualité`;
    } else if (r.rewardLevel > 1) {
        quantityDisplay += ` (Niv. ${r.rewardLevel})`;
    }

    let resultTooltipAttr = '';
    if (resultType === 'ANOMALY') {
        const tooltipData = getAnomalyTooltipHTML(pageState.allAnomalyTemplates.find(a => a.name === r.rewardName) || { name: r.rewardName, level: 1, spiritualite: 'Inconnu', description: 'Aucune description' }, r.rewardName).replace(/"/g, '&quot;');
        resultTooltipAttr = `data-color="${resultColor}" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData}"`;
    } else if (resultType === 'EQUIPMENT' || resultType === 'CONSUMABLE') {
        const temp = pageState.allEquipmentTemplates.find(e => e.name === r.rewardName);
        const statsData = window.getEquipmentTooltipHTML(temp);
        const slotInfo = getSlotInfo(temp);
        const rarityColor = getRarityColor(temp.rarity);
        const tooltipData = `
            <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:${rarityColor}; border-bottom:1px solid ${rarityColor}40; padding-bottom:4px; display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">${temp.name}</span>
                <span class="material-symbols-outlined ${slotInfo.extraClass || ''}" style="font-size: 1.1rem; color: ${slotInfo.color};" title="${slotInfo.label}">${slotInfo.icon}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">${statsData}</div>
        `.replace(/"/g, '&quot;');
        if (tooltipData) {
            resultTooltipAttr = `data-color="${resultColor}" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()" data-tooltip-html="${tooltipData}"`;
        }
    }

    container.innerHTML = `
                <div class="w-full flex flex-col items-center justify-start text-left">
                    <div class="mb-4 text-center">
                        <span class="material-symbols-outlined text-5xl text-cyan-400">experiment</span>
                        <h2 class="m-0 mt-1 text-white text-2xl">${r.name}</h2>
                        <p class="text-muted text-sm max-w-[500px] mx-auto mt-1">${r.description || ''}</p>
                    </div>

                    <div style="width: 100%; max-width: 500px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem;">
                        <h3 style="margin-top: 0; color: #e2e8f0; font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.4rem; margin-bottom: 0.75rem; text-align: left;">Ingrédients Requis</h3>
                        <div class="flex flex-col gap-1 mt-2">
                            ${reqsHTML || '<span class="text-muted text-sm">Aucun coût matériel.</span>'}
                        </div>
                        
                        ${crafterSelectHTML}
                    </div>

                    <div class="my-2 flex items-center gap-4">
                        <span class="material-symbols-outlined text-emerald text-3xl">arrow_downward</span>
                    </div>

                    <div class="rounded-xl p-3 text-center ${resultTooltipAttr ? 'cursor-help' : ''}" style="width: 100%; max-width: 500px; background: linear-gradient(135deg, ${resultColor}15, rgba(0,0,0,0.2)); border: 1px solid ${resultColor}50;" ${resultTooltipAttr}>
                        <span class="flex justify-center items-center gap-1 text-xs uppercase font-bold tracking-wider mb-1" style="color: ${resultColor};">
                            <span class="material-symbols-outlined text-lg">${resultIcon}</span>
                            ${resultLabel}
                        </span>
                        <strong class="text-lg" style="color: ${resultColor};">${quantityDisplay}</strong>
                    </div>

                    
                    ${!isSecret ? `<div class="flex items-center gap-2 mt-2 mb-2">
                        <label class="text-sm font-semibold text-emerald" for="craftQuantityInput">Quantité :</label>
                        <input type="number" id="craftQuantityInput" min="1" value="${craftQty}" oninput="window.updateCraftQuantity(this)" class="bg-black/50 border border-emerald-500/30 text-white p-1 rounded w-20 text-center" />
                    </div>` : ''}
                    <button id="transmuteButton" class="btn-transmute" style="margin-top: 1.5rem;" onclick="craftSelected()">
                        <span class="material-symbols-outlined">science</span>
                        Transmuter
                    </button>
                    <div id="craftMessage" class="mt-2 text-sm font-semibold text-center"></div>
                </div>
            `;

    // Execute custom select setups
    pageState.customSelectSetups.forEach(setup => setup());
}

function buildCustomSelect(containerDiv, options, hiddenInputClass, hiddenInputId = '') {
    let selectedOption = options.find(o => o.selected) || options[0];
    let optionsHTML = '';
    options.forEach(o => {
        optionsHTML += `<div class="custom-option" data-value="${o.value}">${o.html}</div>`;
    });

    containerDiv.innerHTML = `
                <div class="custom-select-wrapper relative">
                    <div class="custom-select-trigger flex items-center justify-between bg-black/50 p-2 border border-white/10 text-white rounded-md cursor-pointer transition-all duration-200 text-sm hover:border-white/20">
                        <div class="cs-label flex-1 mr-2 flex items-center">${selectedOption.html}</div>
                        <span class="material-symbols-outlined text-xl">expand_more</span>
                    </div>
                    <div class="custom-select-options">
                        ${optionsHTML}
                    </div>
                    <input type="hidden" class="${hiddenInputClass}" id="${hiddenInputId}" value="${selectedOption.value}">
                </div>
            `;
}

// Global custom-select logic is handled by window.initGlobalCustomSelect() in ui.js

async function fetchUserCharacters() {
    try {
        const res = await globalFetch('/api/personnages');
        if (res && res.ok) {
            const chars = await res.json();
            pageState.userCharacters = chars;
            const container = document.getElementById('crafterSelectContainer');
            if (container) {
                let options = [{ value: '', html: '-- Choisir un personnage --', selected: true }];
                chars.forEach(c => {
                    options.push({
                        value: c.id,
                        html: `<div class="flex justify-between items-center w-full"><span class="text-sky-400 font-medium">${c.name}</span> <span class="text-slate-400 text-xs bg-black/30 px-2 py-1 rounded border border-white/5">XP Spirit : <strong class="text-amber-500">${c.spiritualiteExperience || 0}</strong></span></div>`,
                        selected: false
                    });
                });
                buildCustomSelect(container, options, '', 'crafterSelect');
            }
        }
    } catch (e) {
        console.warn(e);
    }
}

async function craftSelected() {
    if (!pageState.selectedRecipe) return;
    if (pageState.isCrafting) return;

    const msg = document.getElementById('craftMessage');
    const btn = document.getElementById('transmuteButton');
    pageState.isCrafting = true;
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }

    if (msg) {
        msg.innerText = "Transmutation en cours...";
        msg.style.color = "var(--text-muted)";
    }

    let anomalieIds = [];
    let consumableIds = [];
    let isValid = true;
    let usedAnomalyIds = new Set();
    let usedConsumableIds = new Set();

    document.querySelectorAll('.anomaly-select').forEach(sel => {
        const val = sel.value;
        if (!val) isValid = false;
        else {
            if (usedAnomalyIds.has(val)) isValid = false;
            usedAnomalyIds.add(val);
            anomalieIds.push(parseInt(val));
        }
    });

    let reqAnoCount = 0;
    if (pageState.selectedRecipe.requiredAnomalies) {
        for (const qty of Object.values(pageState.selectedRecipe.requiredAnomalies)) reqAnoCount += qty;
    }

    let reqConsCount = 0;
    if (pageState.selectedRecipe.requiredConsumables) {
        for (const qty of Object.values(pageState.selectedRecipe.requiredConsumables)) reqConsCount += qty;
    }

    const craftQty = (pageState.selectedRecipe.rewardType === 'UNLOCK_FEATURE' || pageState.selectedRecipe.rewardType === 'SECRET' || (pageState.selectedRecipe.rewardName && pageState.selectedRecipe.rewardName.toLowerCase().includes('secret'))) ? 1 : (pageState.craftQuantity || 1);

    if (anomalieIds.length < reqAnoCount * craftQty) {
        if (msg) { msg.innerText = "Vous n'avez pas assez d'anomalies pour cette recette."; msg.style.color = "#ef4444"; }
        pageState.isCrafting = false;
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
        return;
    }

    if (!isValid) {
        if (msg) { msg.innerText = "Veuillez sélectionner correctement toutes les anomalies (sans doublons)."; msg.style.color = "#ef4444"; }
        pageState.isCrafting = false;
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
        return;
    }

    document.querySelectorAll('.consumable-select').forEach(sel => {
        const val = sel.value;
        if (!val) isValid = false;
        else {
            if (usedConsumableIds.has(val)) isValid = false;
            usedConsumableIds.add(val);
            consumableIds.push(parseInt(val));
        }
    });

    if (consumableIds.length < reqConsCount * craftQty) {
        if (msg) { msg.innerText = "Vous n'avez pas assez de consommables pour cette recette."; msg.style.color = "#ef4444"; }
        pageState.isCrafting = false;
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
        return;
    }

    if (!isValid) {
        if (msg) { msg.innerText = "Veuillez sélectionner tous les consommables requis (sans doublons)."; msg.style.color = "#ef4444"; }
        pageState.isCrafting = false;
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
        return;
    }

    let personnageId = null;
    if (pageState.selectedRecipe.costSpiritXp > 0 || pageState.selectedRecipe.rewardType === 'GIVE_SPIRIT_XP') {
        const sel = document.getElementById('crafterSelect');
        if (!sel || !sel.value) {
            if (msg) { msg.innerText = "Veuillez sélectionner un personnage."; msg.style.color = "#ef4444"; }
            pageState.isCrafting = false;
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
            return;
        }
        personnageId = parseInt(sel.value);
    }

    let successCount = 0;
    let lastMessage = "";

    for (let i = 0; i < craftQty; i++) {
        const body = {
            personnageId: personnageId,
            anomalieIds: anomalieIds.slice(i * reqAnoCount, (i + 1) * reqAnoCount),
            consumableIds: consumableIds.slice(i * reqConsCount, (i + 1) * reqConsCount)
        };

        try {
            const res = await globalFetch(`/api/alchemy/craft/${pageState.selectedRecipe.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            if (res.ok) {
                successCount++;
                lastMessage = text;
            } else {
                lastMessage = text;
                break; // Stop loop on first failure
            }
        } catch (e) {
            console.warn(e);
            lastMessage = "Erreur réseau.";
            break;
        }
    }

    if (msg) {
        msg.innerText = craftQty > 1 ? `${successCount} / ${craftQty} réussis. ${lastMessage}` : lastMessage;
        msg.style.color = successCount > 0 ? "#10b981" : "#ef4444";
    }

    if (successCount > 0) {
        createMagicParticles();
        let craftedLabel = pageState.selectedRecipe.rewardName || pageState.selectedRecipe.name;
        let totalQty = (pageState.selectedRecipe.rewardQuantity || 1) * successCount;
        if (pageState.selectedRecipe.rewardType === 'GIVE_SPIRIT_XP') craftedLabel = "XP Spiritualité";
        let notifText = `Transmutation réussie : ${totalQty}x ${craftedLabel}`;
        if (pageState.selectedRecipe.rewardType === 'UNLOCK_FEATURE' || pageState.selectedRecipe.rewardType === 'SECRET' || (pageState.selectedRecipe.rewardName && pageState.selectedRecipe.rewardName.toLowerCase().includes('secret'))) {
            notifText = `Transmutation réussie : Secret débloqué`;
        }
        if (window.showNotif) {
            window.showNotif(notifText, false);
        }
        if (window.checkAuthStatus) {
            window.checkAuthStatus().then(() => {
                globalFetch('/api/alchemy/recipes')
                    .then(r => r.json())
                    .then(data => {
                        pageState.allRecipes = data;
                        renderRecipesList();
                    })
                    .catch(e => console.error(e));
            });
        }
        await fetchUserInventory();
        setTimeout(() => {
            renderCauldron(pageState.selectedRecipe);
            const msgObj = document.getElementById('craftMessage');
            if (msgObj && msg) {
                msgObj.innerText = msg.innerText;
                msgObj.style.color = msg.style.color;
            }
        }, 800);
    }

    pageState.isCrafting = false;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
}

function createMagicParticles() {
    const container = document.getElementById('cauldronPanel');
    if (!container) return;
    const rect = container.getBoundingClientRect();

    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'magic-particle';
        const size = Math.random() * 8 + 4;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;

        const colors = ['#a78bfa', '#f472b6', '#38bdf8', '#34d399', '#fbbf24'];
        p.style.background = colors[Math.floor(Math.random() * colors.length)];

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        p.style.left = `${centerX + (Math.random() * 60 - 30)}px`;
        p.style.top = `${centerY + (Math.random() * 60 - 30)}px`;
        p.style.position = 'fixed';
        p.style.pointerEvents = 'none';
        p.style.zIndex = '9999';

        const tx = (Math.random() * 200 - 100) + 'px';
        const ty = (Math.random() * 200 - 100) + 'px';
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);

        document.body.appendChild(p);

        setTimeout(() => {
            if (p.parentNode === document.body) {
                p.remove();
            }
        }, 1500);
    }
}

window.updateCraftQuantity = function (input) {
    let val = parseInt(input.value);
    if (isNaN(val)) return;
    if (val < 1) val = 1;
    pageState.craftQuantity = val;
    renderCauldron(pageState.selectedRecipe);
    const newInput = document.getElementById('craftQuantityInput');
    if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    }
};
