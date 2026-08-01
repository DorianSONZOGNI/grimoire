function resetEqForm() {
    document.getElementById('eqName').value = '';
    document.getElementById('eqHp').value = 0;
    document.getElementById('eqMana').value = 0;
    document.getElementById('eqPower').value = 0;
    document.getElementById('eqStr').value = 0;
    document.getElementById('eqArmor').value = 0;
    document.getElementById('eqRes').value = 0;
    document.getElementById('eqSpeed').value = 0;
    document.getElementById('eqCrit').value = 0;
    if (document.getElementById('eqAvailableInShop')) {
        document.getElementById('eqAvailableInShop').checked = true;
    }
    document.getElementById('eqRegenHp').value = 0;
    document.getElementById('eqRegenMana').value = 0;
    if (document.getElementById('eqConsumableHpPercent')) document.getElementById('eqConsumableHpPercent').value = 0;
    if (document.getElementById('eqConsumableManaPercent')) document.getElementById('eqConsumableManaPercent').value = 0;
    if (document.getElementById('eqConsumableMissingHpPercent')) document.getElementById('eqConsumableMissingHpPercent').value = 0;
    if (document.getElementById('eqConsumableMissingManaPercent')) document.getElementById('eqConsumableMissingManaPercent').value = 0;
    if (document.getElementById('eqConsumableCategory')) {
        document.getElementById('eqConsumableCategory').value = 'AUTRE';
        const label = document.getElementById('eqConsumableCategoryLabel');
        if (label) label.innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">inventory_2</span> Autre';
    }
    if (document.getElementById('eqBaseWeight')) document.getElementById('eqBaseWeight').value = 0;

    const anomaliesContainer = document.getElementById('priceAnomaliesContainer');
    if (anomaliesContainer) {
        anomaliesContainer.innerHTML = '';
    }

    // Reset Rarity
    const rarityInput = document.getElementById('eqRarity');
    if (rarityInput) {
        rarityInput.value = 'COMMUN';
        document.getElementById('eqRarityLabel').innerHTML = '<span class="cs-icon font-bold text-muted">C</span> Commun';
        const row = document.getElementById('eqSpecialEffectRow');
        if (row) row.style.display = 'none';
    }

    // Reset Special Effect
    const effectInput = document.getElementById('eqSpecialEffect');
    if (effectInput) {
        effectInput.value = 'NONE';
        document.getElementById('eqSpecialEffectLabel').innerHTML = '<span class="material-symbols-outlined cs-icon text-muted">not_interested</span> Aucun';
        document.getElementById('eqSpecialEffectValue').value = 0;
    }

    // Reset Slot
    const slotInput = document.getElementById('eqSlot');
    if (slotInput) {
        slotInput.value = '';
        document.getElementById('eqSlotLabel').innerHTML = 'Choisir un slot...';
    }
}

function getFormEquipmentData() {
    const slot = document.getElementById('eqSlot') ? document.getElementById('eqSlot').value : null;
    const rarity = document.getElementById('eqRarity') ? document.getElementById('eqRarity').value : 'COMMUN';
    const specialEffect = document.getElementById('eqSpecialEffect') ? document.getElementById('eqSpecialEffect').value : 'NONE';
    const specialEffectValue = document.getElementById('eqSpecialEffectValue') ? parseInt(document.getElementById('eqSpecialEffectValue').value) || 0 : 0;

    return {
        id: pageState.editingEquipmentId,
        name: document.getElementById('eqName') ? document.getElementById('eqName').value.trim() : '',
        availableInShop: document.getElementById('eqAvailableInShop') ? document.getElementById('eqAvailableInShop').checked : false,
        slot,
        bonusHealthMax: document.getElementById('eqHp') ? parseInt(document.getElementById('eqHp').value) || 0 : 0,
        bonusManaMax: document.getElementById('eqMana') ? parseInt(document.getElementById('eqMana').value) || 0 : 0,
        bonusPower: document.getElementById('eqPower') ? parseInt(document.getElementById('eqPower').value) || 0 : 0,
        bonusStrength: document.getElementById('eqStr') ? parseInt(document.getElementById('eqStr').value) || 0 : 0,
        bonusArmor: document.getElementById('eqArmor') ? parseInt(document.getElementById('eqArmor').value) || 0 : 0,
        bonusResistance: document.getElementById('eqRes') ? parseInt(document.getElementById('eqRes').value) || 0 : 0,
        bonusSpeed: document.getElementById('eqSpeed') ? parseInt(document.getElementById('eqSpeed').value) || 0 : 0,
        bonusCrit: document.getElementById('eqCrit') ? parseInt(document.getElementById('eqCrit').value) || 0 : 0,
        regenHealthPerTurn: document.getElementById('eqRegenHp') ? parseInt(document.getElementById('eqRegenHp').value) || 0 : 0,
        regenManaPerTurn: document.getElementById('eqRegenMana') ? parseInt(document.getElementById('eqRegenMana').value) || 0 : 0,
        consumableHpPercent: document.getElementById('eqConsumableHpPercent') ? (parseInt(document.getElementById('eqConsumableHpPercent').value) || 0) : 0,
        consumableManaPercent: document.getElementById('eqConsumableManaPercent') ? (parseInt(document.getElementById('eqConsumableManaPercent').value) || 0) : 0,
        consumableMissingHpPercent: document.getElementById('eqConsumableMissingHpPercent') ? (parseInt(document.getElementById('eqConsumableMissingHpPercent').value) || 0) : 0,
        consumableMissingManaPercent: document.getElementById('eqConsumableMissingManaPercent') ? (parseInt(document.getElementById('eqConsumableMissingManaPercent').value) || 0) : 0,
        consumableCategory: document.getElementById('eqConsumableCategory') ? document.getElementById('eqConsumableCategory').value : 'AUTRE',
        baseWeight: document.getElementById('eqBaseWeight') ? parseFloat(document.getElementById('eqBaseWeight').value) || 0 : 0,
        rarity,
        specialEffect,
        specialEffectValue,
        personnageId: null, // Keep null when forged from vault
        priceAnomalies: (() => {
            const map = {};
            const container = document.getElementById('priceAnomaliesContainer');
            if (container) {
                const rows = container.querySelectorAll('.anomaly-price-row');
                rows.forEach(row => {
                    const selectVal = row.querySelector('.anomaly-select-hidden').value;
                    const qtyVal = parseInt(row.querySelector('.anomaly-qty-input').value) || 0;
                    if (selectVal && qtyVal > 0) {
                        map[selectVal] = (map[selectVal] || 0) + qtyVal;
                    }
                });
            }
            return map;
        })(),
    };
}
