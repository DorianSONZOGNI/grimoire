export const GLOBAL_STAT_LABELS = {
    'SPEED': 'Vitesse', 'MANA': 'Mana Max', 'HEALTH': 'PV Max', 'CRIT': 'Critique',
    'ARMURE': 'Armure', 'RESISTANCE': 'Résistance', 'POWER': 'Puissance Mag.', 'STRENGTH': 'Force Phys.',
    'BURN': 'Brûlure', 'POISON': 'Poison', 'DAMAGE_TAKEN_MAGIC': 'Dégâts Mag. Subis',
    'DAMAGE_TAKEN_PHYSIC': 'Dégâts Phys. Subis', 'DAMAGE_TAKEN_BRUT': 'Dégâts Bruts Subis',
    'DAMAGE_GIVEN_MAGIC': 'Dégâts Mag. Infligés', 'DAMAGE_GIVEN_PHYSIC': 'Dégâts Phys. Infligés',
    'DAMAGE_GIVEN_BRUT': 'Dégâts Bruts Infligés',
    'HEAL_RECEIVED': 'Soin Reçu', 'SHIELD_RECEIVED': 'Bouclier Reçu',
    'HEAL_GIVEN': 'Soin Donné', 'SHIELD_GIVEN': 'Bouclier Donné',
    'DAMAGE_GIVEN_MAGIC_TO_SHIELD': 'Dég. Mag. au Bouclier',
    'DAMAGE_GIVEN_PHYSIC_TO_SHIELD': 'Dég. Phys. au Bouclier',
    'SHIELD_PENETRATION': 'Perce-Bouclier',
    'SHIELD_PIERCED': 'Bouclier Percé',
    'AME_DETACHEE': 'Âme Détachée'
};

export const GLOBAL_SRC_LABELS = {
    'CASTER_POWER': 'Puiss. Lanceur', 'TARGET_POWER': 'Puiss. Cible', 
    'CASTER_PHYSICAL_POWER': 'Force Phy. Lanceur', 'TARGET_PHYSICAL_POWER': 'Force Phy. Cible',
    'CASTER_MANA_MAX': 'Mana Max Lanc.',
    'TARGET_MANA_MAX': 'Mana Max Cib.', 'CASTER_MANA_MISSING': 'Mana Manq. Lanc.', 'TARGET_MANA_MISSING': 'Mana Manq. Cib.',
    'CASTER_MANA_CURRENT': 'Mana Act. Lanc.', 'TARGET_MANA_CURRENT': 'Mana Act. Cib.', 'CASTER_HEALTH_MAX': 'PV Max Lanc.',
    'TARGET_HEALTH_MAX': 'PV Max Cib.', 'CASTER_HEALTH_MISSING': 'PV Manq. Lanc.', 'TARGET_HEALTH_MISSING': 'PV Manq. Cib.',
    'CASTER_HEALTH_CURRENT': 'PV Act. Lanc.', 'TARGET_HEALTH_CURRENT': 'PV Act. Cib.'
};

export const javaClassToCode = {
    'DamageFixedEffect': 'FIXED_DAMAGE',
    'DamagePercentageEffect': 'PERCENTAGE_DAMAGE',
    'HealFixedEffect': 'FIXED_HEAL',
    'HealPercentageEffect': 'PERCENTAGE_HEAL',
    'ManaFixedEffect': 'FIXED_MANA',
    'ManaPercentageEffect': 'PERCENTAGE_MANA',
    'BuffDebuffEffect': 'BUFF_DEBUFF',
    'DamageOverTimeEffect': 'DOT',
    'HealOverTimeEffect': 'HOT',
    'ManaOverTimeEffect': 'MOT',
    'PurgeEffect': 'PURGE',
    'ShieldEffect': 'SHIELD',
    'HeatFixedEffect': 'HEAT_FIXED',
    'HeatPercentageEffect': 'HEAT_PERCENTAGE',
    'HeatOverTimeEffect': 'HEAT_OVER_TIME',
};
