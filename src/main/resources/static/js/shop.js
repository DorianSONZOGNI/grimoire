const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'masks', color: '#a855f7', extraClass: 'flip-icon' },
    PLASTRON: { label: 'Plastron', icon: 'shield', color: '#3b82f6' },
    ANNEAU_GAUCHE: { label: 'Anneau Gauche', icon: 'diamond', color: '#f59e0b' },
    ANNEAU_DROIT: { label: 'Anneau Droit', icon: 'diamond', color: '#f59e0b' },
    BOTTES: { label: 'Bottes', icon: 'footprint', color: '#10b981' },
    CAPE: { label: 'Cape', icon: 'carpenter', color: '#ec4899' }
};

const STAT_DEFS = [
    { key: 'bonusHealthMax', label: 'PV', icon: 'favorite', color: '#ec4899' },
    { key: 'bonusManaMax', label: 'Mana', icon: 'water_drop', color: '#38bdf8' },
    { key: 'bonusPower', label: 'Pui', icon: 'auto_awesome', color: '#a855f7' },
    { key: 'bonusStrength', label: 'For', icon: 'fitness_center', color: '#f43f5e' },
    { key: 'bonusArmor', label: 'Arm', icon: 'shield', color: '#3b82f6' },
    { key: 'bonusResistance', label: 'Rés', icon: 'shield', color: '#10b981' },
    { key: 'bonusSpeed', label: 'Vit', icon: 'bolt', color: '#f59e0b' },
    { key: 'bonusCrit', label: 'Crit', icon: 'gps_fixed', color: '#ef4444' },
    { key: 'regenHealthPerTurn', label: 'PV/t', icon: 'healing', color: '#10b981' },
    { key: 'regenManaPerTurn', label: 'Mana/t', icon: 'cyclone', color: '#38bdf8' },
];

let shopItems = [];
let itemToBuy = null;

async function loadShop() {
    try {
        const res = await fetch('/api/shop/daily');
        shopItems = await res.json();
        renderShop();
        renderSpecials();
    } catch (e) {
        console.error('Erreur chargement boutique:', e);
        document.getElementById('shopGrid').innerHTML = `<div style="color: #ef4444;"><span class="material-symbols-outlined">error</span> Erreur de connexion.</div>`;
    }
}

function showNotif(message, isError = false) {
    const notif = document.getElementById('shopNotif');
    const text = document.getElementById('shopNotifText');
    text.textContent = message;

    notif.style.background = isError ? '#ef4444' : '#10b981';
    notif.style.boxShadow = isError ? '0 10px 25px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(16, 185, 129, 0.3)';

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(100px)';
    }, 3000);
}

function generateStandHtml(eq) {
    const isPromo = eq.isDiscount;
    const isConsumable = eq.isConsumable;
    const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: eq.iconId || 'help', color: '#94a3b8' };

    if (isConsumable && eq.iconId) {
        slotInfo.icon = eq.iconId;
        slotInfo.color = '#c084fc';
    }

    const statsHtml = STAT_DEFS
        .filter(s => eq[s.key] && eq[s.key] !== 0)
        .map(s => {
            const val = eq[s.key];
            const isMalus = val < 0;
            const sign = val > 0 ? '+' : '';
            return `<div class="shop-stand-stat ${isMalus ? 'malus' : ''}">
                <div style="display: flex; align-items: center; gap: 0.3rem;">
                    <span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size: 0.9rem;">${s.icon}</span>
                    ${s.label}
                </div>
                <span style="font-weight: 600;">${sign}${val}</span>
            </div>`;
        }).join('');

    let effectHtml = '';
    if (eq.specialEffect && eq.specialEffect !== 'NONE') {
        const effectLabels = {
            'LIFESTEAL': 'Vol de Vie',
            'THORNS': 'Épines',
            'MANA_SHIELD': 'Bouclier de Mana',
            'CHEAT_DEATH': 'Ange Gardien',
            'CRIT_DAMAGE': 'Dégâts Critiques'
        };
        const label = effectLabels[eq.specialEffect] || eq.specialEffect;
        effectHtml = `<div class="shop-stand-stat" style="background: rgba(168, 85, 247, 0.1); color: #c084fc;">
            <div style="display: flex; align-items: center; gap: 0.3rem;">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">auto_awesome</span>
                ${label}
            </div>
            <span style="font-weight: 600;">${eq.specialEffectValue}</span>
        </div>`;
    }

    const priceStr = eq.shopPrice !== undefined ? (eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1)) : '?';
    const oldPriceStr = eq.originalPrice !== undefined ? (eq.originalPrice % 1 === 0 ? eq.originalPrice : eq.originalPrice.toFixed(1)) : '';

    const promoBadge = isPromo ? `<div style="position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 8px; font-size: 0.8rem; font-weight: bold; transform: rotate(15deg); box-shadow: 0 4px 6px rgba(0,0,0,0.3);">-20%</div>` : '';
    const oldPriceHtml = isPromo ? `<span style="text-decoration: line-through; color: #ef4444; font-size: 0.8rem; opacity: 0.7;">${oldPriceStr}</span>` : '';

    return `
        <div class="shop-stand" style="${isPromo ? 'border: 1px solid #ef4444;' : ''}">
            ${promoBadge}
            <span class="material-symbols-outlined shop-stand-icon ${slotInfo.extraClass || ''}" style="color: ${slotInfo.color};">${slotInfo.icon}</span>
            <div class="shop-stand-name">${eq.name}</div>
            
            <div class="shop-stand-stats">
                ${!isConsumable ? (statsHtml || '<div style="color:#64748b; font-style:italic; font-size: 0.85rem; margin-top: 0.5rem;">Aucune stat</div>') : ''}
                ${effectHtml}
            </div>
            
            <button class="shop-stand-price" onclick="openBuyModal('${isConsumable ? eq.typeId : eq.id}', ${isConsumable})">
                ${oldPriceHtml}
                ${priceStr} <span class="material-symbols-outlined" style="font-size: 1.2rem;">monetization_on</span>
            </button>
        </div>
    `;
}

function renderShop() {
    const container = document.getElementById('shopGrid');

    // Force the correct class in case HTML is cached
    container.className = 'shop-showcase';

    const dailyItems = shopItems.daily || [];

    if (dailyItems.length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-style: italic;">La boutique est vide aujourd'hui.</div>`;
        return;
    }

    const groups = {
        COMMUN: [],
        RARE: [],
        LEGENDAIRE: [],
        EPIQUE: [],
        RELIQUE: []
    };

    dailyItems.forEach(eq => {
        const rarity = eq.rarity || 'COMMUN';
        if (groups[rarity]) groups[rarity].push(eq);
        else groups['COMMUN'].push(eq);
    });

    const RARITY_LABELS = {
        COMMUN: 'Communs',
        RARE: 'Rare',
        LEGENDAIRE: 'Légendaire',
        EPIQUE: 'Épique',
        RELIQUE: 'Relique'
    };

    let html = '';

    for (const [rarity, items] of Object.entries(groups)) {
        if (items.length === 0) continue;

        html += `
            <div class="shop-rarity-group group-${rarity}">
                <div class="shop-rarity-title">${RARITY_LABELS[rarity]}</div>
        `;

        items.forEach(eq => {
            html += generateStandHtml(eq);
        });

        html += `</div>`;
    }

    container.innerHTML = html;
}

function renderSpecials() {
    const container = document.getElementById('specialsGrid');
    if (!container) return;

    const discountItem = shopItems.discount;
    const consumables = shopItems.consumables || [];

    let html = '';

    if (discountItem) {
        html += `
            <div class="shop-rarity-group" style="border-top: 3px solid #ef4444; background: rgba(239, 68, 68, 0.05);">
                <div class="shop-rarity-title" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">PROMO DU JOUR</div>
                ${generateStandHtml(discountItem)}
            </div>
        `;
    }

    if (consumables.length > 0) {
        html += `
            <div class="shop-rarity-group" style="border-top: 3px solid #c084fc; background: rgba(192, 132, 252, 0.05);">
                <div class="shop-rarity-title" style="color: #c084fc; border-color: rgba(192, 132, 252, 0.3);">FOURNITURES</div>
        `;
        consumables.forEach(eq => {
            html += generateStandHtml(eq);
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

window.openBuyModal = function (idOrType, isConsumable = false) {
    let eq = null;

    if (isConsumable) {
        eq = (shopItems.consumables || []).find(e => e.typeId === idOrType);
    } else {
        eq = (shopItems.daily || []).find(e => e.id === parseInt(idOrType));
        if (!eq && shopItems.discount) {
            if (shopItems.discount.id === parseInt(idOrType)) {
                eq = shopItems.discount;
            }
        }
    }

    if (!eq) return;

    itemToBuy = { idOrType, isConsumable, price: eq.shopPrice };

    document.getElementById('buyTargetName').textContent = eq.name;
    const priceStr = eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1);

    document.getElementById('buyConfirmBtn').innerHTML = `Acheter pour ${priceStr} <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-top: -2px;">monetization_on</span>`;

    document.getElementById('buyConfirmModal').style.opacity = '1';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'all';
}

window.closeBuyModal = function () {
    document.getElementById('buyConfirmModal').style.opacity = '0';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'none';
    itemToBuy = null;
}

document.getElementById('buyConfirmBtn').addEventListener('click', async () => {
    if (!itemToBuy) return;

    const { idOrType, isConsumable } = itemToBuy;
    closeBuyModal();

    try {
        let url = `/api/shop/buy/${idOrType}`;
        if (isConsumable) {
            url = `/api/shop/buy/consumable/${idOrType}`;
        }

        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotif('Achat réussi !');
            if (window.checkAuthStatus) {
                window.checkAuthStatus(); // Met à jour l'or affiché
            }
        } else {
            showNotif(data.message || 'Erreur lors de l\'achat.', true);
        }
    } catch (e) {
        showNotif('Erreur réseau.', true);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    loadShop();
});

window.addEventListener('authLoaded', () => {
    const adminLink = document.getElementById('adminShopLink');
    if (adminLink) {
        adminLink.style.display = window.isAdmin ? 'inline-flex' : 'none';
    }
});
