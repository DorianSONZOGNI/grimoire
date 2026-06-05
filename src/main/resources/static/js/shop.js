const SLOT_LABELS = {
    CASQUE: { label: 'Casque', icon: 'face', color: '#c084fc', extraClass: 'fill-icon' },
    PLASTRON: { label: 'Plastron', icon: 'checkroom', color: '#3b82f6', extraClass: '' },
    ANNEAU_GAUCHE: { label: 'Anneau Gauche', icon: 'radio_button_unchecked', color: '#f59e0b', extraClass: '' },
    ANNEAU_DROIT: { label: 'Anneau Droit', icon: 'radio_button_unchecked', color: '#f59e0b', extraClass: '' },
    BOTTES: { label: 'Bottes', icon: 'directions_walk', color: '#10b981', extraClass: '' },
    CAPE: { label: 'Cape', icon: 'waves', color: '#ec4899', extraClass: '' }
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

function renderShop() {
    const container = document.getElementById('shopGrid');
    
    if (shopItems.length === 0) {
        container.innerHTML = `<div style="color: #94a3b8; font-style: italic;">La boutique est vide aujourd'hui.</div>`;
        return;
    }

    container.innerHTML = shopItems.map(eq => {
        const slotInfo = SLOT_LABELS[eq.slot] || { label: eq.slot, icon: 'help', color: '#94a3b8' };
        
        const statsHtml = STAT_DEFS
            .filter(s => eq[s.key] && eq[s.key] !== 0)
            .map(s => {
                const val = eq[s.key];
                const isMalus = val < 0;
                const sign = val > 0 ? '+' : '';
                return `<span class="vault-stat-chip ${isMalus ? 'malus' : ''}">
                    <span class="material-symbols-outlined" style="color:${isMalus ? '#ef4444' : s.color}; font-size: 0.8rem;">${s.icon}</span>
                    ${sign}${val}
                </span>`;
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
            effectHtml = `<div class="vault-card-effect">
                <span class="material-symbols-outlined" style="font-size: 0.9rem;">auto_awesome</span>
                ${label} : ${eq.specialEffectValue}
            </div>`;
        }

        const rarityClass = eq.rarity ? `rarity-${eq.rarity}` : 'rarity-COMMUN';
        const weightStr = eq.weight % 1 === 0 ? eq.weight : eq.weight.toFixed(1);
        const priceStr = eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1);

        return `
            <div class="vault-card ${rarityClass}">
                <div class="vault-card-header">
                    <div class="vault-card-name-group">
                        <div class="vault-card-slot">
                            <span class="material-symbols-outlined" style="font-size: 0.9rem; color: ${slotInfo.color};">${slotInfo.icon}</span>
                            ${slotInfo.label} ${eq.rarity ? `<span style="opacity:0.5; margin-left:4px;">${eq.rarity}</span>` : ''}
                        </div>
                        <div class="vault-card-name">
                            ${eq.name}
                        </div>
                    </div>
                </div>
                
                <div class="vault-card-stats">
                    ${statsHtml || '<span style="color:#64748b; font-size:0.85rem; font-style:italic;">Aucune statistique de base</span>'}
                </div>
                ${effectHtml}
                
                <div class="vault-card-footer" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <div class="vault-card-weight" title="Poids">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem; color: #94a3b8;">scale</span>
                        <span style="color: #94a3b8; font-weight: 600;">${weightStr} pts</span>
                    </div>
                    
                    <button onclick="openBuyModal(${eq.id})" style="display: flex; align-items: center; gap: 0.3rem; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">monetization_on</span>
                        ${priceStr}
                    </button>
                </div>
            </div>`;
    }).join('');
}

window.openBuyModal = function(id) {
    itemToBuy = id;
    const eq = shopItems.find(e => e.id === id);
    if (eq) {
        document.getElementById('buyTargetName').textContent = eq.name;
        const priceStr = eq.shopPrice % 1 === 0 ? eq.shopPrice : eq.shopPrice.toFixed(1);
        document.getElementById('buyConfirmBtn').innerHTML = `Acheter pour ${priceStr} <span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-top: -2px;">monetization_on</span>`;
    }
    document.getElementById('buyConfirmModal').style.opacity = '1';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'all';
}

window.closeBuyModal = function() {
    document.getElementById('buyConfirmModal').style.opacity = '0';
    document.getElementById('buyConfirmModal').style.pointerEvents = 'none';
    itemToBuy = null;
}

document.getElementById('buyConfirmBtn').addEventListener('click', async () => {
    if (!itemToBuy) return;
    
    const id = itemToBuy;
    closeBuyModal();

    try {
        const res = await fetch(`/api/shop/buy/${id}`, { method: 'POST' });
        const data = await res.json();
        
        if (res.ok) {
            showNotif('Achat réussi ! L\'objet est dans vos coffres.');
            if (window.checkAuthStatus) {
                window.checkAuthStatus();
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
