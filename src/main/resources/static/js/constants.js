export const GLOBAL_STAT_LABELS = {};
export const GLOBAL_SRC_LABELS = {};
export const javaClassToCode = {
    'DAMAGE_OVER_TIME': 'DOT',
    'HEAL_OVER_TIME': 'HOT',
    'MANA_OVER_TIME': 'MOT',
    'CONSUMABLE_BUFF': 'BUFF_DEBUFF',
    'DISPEL': 'PURGE'
};

window.EFFECT_LABELS = {
    'LIFESTEAL': 'Vol de Vie',
    'THORNS': 'Épines',
    'MANA_SHIELD': 'Bouclier de Mana',
    'CHEAT_DEATH': 'Ange Gardien',
    'CRIT_DAMAGE': 'Dégâts Critiques',
    'CURSED_MANA_DRAIN': 'Famine (% Drain Mana)',
    'CURSED_HP_LOSS_ON_MANA': 'Brèche spirituelle (- hp % en mana Act.)',
    'CURSED_MAGIC_DAMAGE_REDUCTION': 'Folie (% dégâts magique -)',
    'CURSED_PHYSICAL_DAMAGE_REDUCTION': 'Faiblesse (% dégâts physique -)',
    'CURSED_VULNERABILITY': 'Vulnérabilité (Dégâts subis % +)',
    'CURSED_HEALING_REDUCTION': 'Chair putréfiée (Soins % -)',
    'EXECUTION': 'Exécution (% Phy)',
    'MAGIC_OVERLOAD': 'Surcharge (% Mag mana Act)',
    'VITAL_ARCANE': 'Arcane Vitale (Régen X% mana)'
};

window.EFFECT_DESCRIPTIONS = {
    'LIFESTEAL': 'Convertit une partie des dégâts physiques infligés en points de vie (Soin).',
    'THORNS': 'Renvoie automatiquement une partie des dégâts subis directement à l\'attaquant.',
    'MANA_SHIELD': 'Bouclier de mana : le mana encaisse une partie des dégâts à la place des points de vie.',
    'CHEAT_DEATH': 'Survie miraculeuse : une fois par combat, annule un coup mortel et rend des points de vie.',
    'CRIT_DAMAGE': 'Augmente le multiplicateur de dégâts de toutes les attaques critiques du porteur.',
    'CURSED_MANA_DRAIN': '[Malédiction] Famine : draine chaque tour un pourcentage du mana actuel du porteur.',
    'CURSED_HP_LOSS_ON_MANA': '[Malédiction] Brûlure d\'éther : le porteur perd de la vie proportionnellement à son mana actuel.',
    'CURSED_MAGIC_DAMAGE_REDUCTION': '[Malédiction] Affaiblit la puissance de tous les dégâts magiques infligés par le porteur.',
    'CURSED_PHYSICAL_DAMAGE_REDUCTION': '[Malédiction] Affaiblit la puissance de tous les dégâts physiques infligés par le porteur.',
    'CURSED_VULNERABILITY': '[Malédiction] Fragilité : augmente l\'intégralité des dégâts subis par le porteur.',
    'CURSED_HEALING_REDUCTION': '[Malédiction] Chair putréfiée : réduit considérablement l\'efficacité des soins reçus.',
    'EXECUTION': 'Coup de grâce : inflige des dégâts supplémentaires basés sur les PV manquants de la cible.',
    'MAGIC_OVERLOAD': 'Surcharge : consomme du mana additionnel pour décupler les dégâts magiques infligés.',
    'VITAL_ARCANE': 'Flux arcanique : régénère passivement une portion du mana maximal du porteur à chaque tour.'
};

export const STAT_DEFS = [
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
    { key: 'consumableHpPercent', label: 'PV Max', icon: 'favorite', color: '#ec4899', isPercent: true },
    { key: 'consumableManaPercent', label: 'Mana Max', icon: 'water_drop', color: '#38bdf8', isPercent: true },
    { key: 'consumableMissingHpPercent', label: 'PV Manq', icon: 'healing', color: '#f43f5e', isPercent: true },
    { key: 'consumableMissingManaPercent', label: 'Mana Manq', icon: 'cyclone', color: '#a855f7', isPercent: true }
];

window.STAT_DEFS = STAT_DEFS;



export async function initMeta() {
    if (window.GRIMOIRE_META) return;
    try {
        const res = await globalFetch('/api/meta/all');
        if (res && res.ok) {
            const allMeta = await res.json();
            window.GRIMOIRE_META = allMeta;
            
            // Retro-compatibility
            if (allMeta.statTypes) {
                allMeta.statTypes.forEach(s => GLOBAL_STAT_LABELS[s.name] = s.label);
            }
            if (allMeta.sources) {
                allMeta.sources.forEach(s => GLOBAL_SRC_LABELS[s.name] = s.label);
            }
            
            // Build Quick Access Maps
            window.SLOT_LABELS = {};
            if (allMeta.equipmentSlots) {
                allMeta.equipmentSlots.forEach(s => {
                    window.SLOT_LABELS[s.name] = { label: s.label, icon: s.icon, color: s.color || '#ef4444', extraClass: s.extraClass || '' };
                });
                window.SLOT_LABELS['ANOMALIE'] = { label: 'Anomalie', icon: 'auto_awesome', color: '#f59e0b', extraClass: '' };
            }
            
            window.CONSUMABLE_CATEGORIES = {};
            if (allMeta.consumableCategories) {
                allMeta.consumableCategories.forEach(c => {
                    window.CONSUMABLE_CATEGORIES[c.name] = { label: c.label, icon: c.icon, color: c.color || '#854c4c' };
                });
            }
            
            window.CATEGORY_ICONS = {};
            if (allMeta.anomalieCategories) {
                allMeta.anomalieCategories.forEach(c => {
                    window.CATEGORY_ICONS[c.name] = c.icon;
                });
            }

            window.RARITY_COLORS = {};
            let rarityStyles = '';
            if (allMeta.equipmentRarities) {
                allMeta.equipmentRarities.forEach(r => {
                    let color = r.color || '#fbbf24';
                    window.RARITY_COLORS[r.name] = color;
                    
                    let weight = 600;
                    let shadow = 5;
                    if (r.name === 'EPIQUE') { weight = 700; shadow = 8; }
                    else if (r.name === 'RELIQUE' || r.name === 'MAUDIT') { weight = 800; shadow = 10; }
                    
                    rarityStyles += `
                    .rarity-${r.name} {
                        color: ${color} !important;
                        text-shadow: 0 0 ${shadow}px color-mix(in srgb, ${color} 40%, transparent);
                        font-weight: ${weight};
                    }
                    
                    /* vault.css */
                    .vault-card.rarity-${r.name} {
                        border-top: 2px solid ${color};
                    }
                    `;
                    
                    if (r.name !== 'COMMUN') {
                        rarityStyles += `
                        .vault-card.rarity-${r.name} {
                            background: linear-gradient(180deg, color-mix(in srgb, ${color} 5%, transparent) 0%, rgba(30, 41, 59, 0.4) 30%);
                        }
                        `;
                    }
                    
                    rarityStyles += `
                    /* shop.css */
                    .shop-rarity-group.group-${r.name} {
                        border-top: 3px solid ${color};
                    }
                    .group-${r.name} .shop-rarity-title {
                        color: ${color};
                        border-color: color-mix(in srgb, ${color} 30%, transparent);
                    }
                    
                    /* shop-admin.css */
                    .shop-admin-header.rarity-${r.name} {
                        background: color-mix(in srgb, ${color} 10%, transparent);
                        color: ${color};
                        border-bottom: 1px solid color-mix(in srgb, ${color} 20%, transparent);
                    }
                    `;
                });
                const styleEl = document.createElement('style');
                styleEl.id = 'dynamic-rarity-styles';
                styleEl.innerHTML = rarityStyles;
                document.head.appendChild(styleEl);
            }
        }
    } catch (e) {
        console.error("Error loading global meta:", e);
    }
}






export const TARGET_LABELS = {
    'CASTER': 'Lanceur',
    'ALLY': 'Allié',
    'TARGET': 'Cible',
    'ALL_ALLIES': 'Lanceur & Alliés',
    'ALL_ENEMIES': 'Tous les Ennemis',
    'ALL_COMBATANTS': 'Tout le Monde'
};

export const TARGET_CSS_CLASSES = {
    'CASTER': 'text-target-caster',
    'ALL_ALLIES': 'text-target-caster',
    'ALLY': 'text-target-ally',
    'TARGET': 'text-target-enemy',
    'ALL_ENEMIES': 'text-target-enemy',
    'ALL_COMBATANTS': 'text-target-everyone'
};

export const EFFECT_TYPE_CSS_CLASSES = {
    'DamageFixed': 'text-effect-dmg', 'FIXED_DAMAGE': 'text-effect-dmg',
    'DamagePercentage': 'text-effect-dmg', 'PERCENTAGE_DAMAGE': 'text-effect-dmg',
    'DamageOverTime': 'text-effect-dmg', 'DAMAGE_OVER_TIME': 'text-effect-dmg', 'DOT': 'text-effect-dmg',
    'HealFixed': 'text-effect-heal', 'FIXED_HEAL': 'text-effect-heal',
    'HealPercentage': 'text-effect-heal', 'PERCENTAGE_HEAL': 'text-effect-heal',
    'HealOverTime': 'text-effect-heal', 'HEAL_OVER_TIME': 'text-effect-heal', 'HOT': 'text-effect-heal',
    'ManaFixed': 'text-effect-mana', 'FIXED_MANA': 'text-effect-mana',
    'ManaPercentage': 'text-effect-mana', 'PERCENTAGE_MANA': 'text-effect-mana',
    'ManaOverTime': 'text-effect-mana', 'MANA_OVER_TIME': 'text-effect-mana', 'MOT': 'text-effect-mana',
    'BuffDebuff': 'text-effect-buff', 'BUFF_DEBUFF': 'text-effect-buff', 'CONSUMABLE_BUFF': 'text-effect-buff',
    'Shield': 'text-effect-buff', 'SHIELD': 'text-effect-buff',
    'POISON': 'text-effect-poison',
    'BURN': 'text-effect-burn',
    'Purge': 'text-effect-purge', 'PURGE': 'text-effect-purge', 'DISPEL': 'text-effect-purge',
    'AME_DETACHEE': 'text-effect-ame',
    'HEAT': 'text-effect-heat', 'Heat': 'text-effect-heat', 'HEAT_FIXED': 'text-effect-heat', 'HEAT_PERCENTAGE': 'text-effect-heat', 'HEAT_OVER_TIME': 'text-effect-heat',
    'BUD': 'text-effect-bud'
};

