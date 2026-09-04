package generation.grimoire.entity.personnage;

import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.ManaOverTimeEffect;
import generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;

import java.util.Iterator;

/**
 * Helper class for Personnage combat logic.
 * Extracted from Personnage to prevent the God Object anti-pattern.
 */
public class PersonnageCombatHelper {

    public static void startTurn(Personnage p) {
        p.setInstantSpellCastThisTurn(false);
        p.setBanalSpellCastThisTurn(false);

        if (p.getRemainingChannelingTurns() > 0) {
            p.setBanalSpellCastThisTurn(true);
            System.out.println(p.getName() + " continue de canaliser (tours restants : " + p.getRemainingChannelingTurns() + ").");
        }

        if (p.getHealthCurrent() > 0) {
            int totalHpRegen = p.getRegenHp();
            int totalManaRegen = p.getRegenMana();
            if (p.getEquipments() != null) {
                for (generation.grimoire.entity.Equipment eq : p.getEquipments()) {
                    totalHpRegen += eq.getRegenHealthPerTurn();
                    totalManaRegen += eq.getRegenManaPerTurn();
                }
            }
            if (totalHpRegen > 0) {
                p.heal(totalHpRegen);
            } else if (totalHpRegen < 0) {
                p.takeDamage(-totalHpRegen, DamageType.BRUT);
            }

            int cursedManaDrain = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_MANA_DRAIN);
            if (cursedManaDrain != 0) {
                totalManaRegen -= Math.abs(cursedManaDrain);
            }

            if (totalManaRegen != 0) {
                p.setManaCurrent(p.getManaCurrent() + totalManaRegen);
            }
        }
    }

    public static void takeDamage(Personnage p, int damage, DamageType damageType, Personnage caster, boolean isBurn) {
        if (damageType == DamageType.PHYSIC && caster != null) {
            if (caster.getVoie() != null && caster.getVoie().getPassiveEffects() != null) {
                for (generation.grimoire.entity.voie.passif.VoiePassiveEffect passif : caster.getVoie().getPassiveEffects()) {
                    if (passif instanceof TrahisonPassiveEffect trahison) {
                        trahison.onPhysicalHit(caster, p, damage);
                    }
                }
            }
        }

        double constant; 

        if (p.getMonsterType() == generation.grimoire.enumeration.MonsterType.REPTILE && damageType == DamageType.PHYSIC) {
            damage = (int) Math.ceil(damage * 0.85);
            System.out.println("🦎 " + p.getName() + " réduit les dégâts physiques subis de 15% (Reptile).");
        }

        double effectiveArmor = p.getArmor() + p.getStatFlatBonus(StatType.ARMURE);
        double effectiveResistance = p.getResistance() + p.getStatFlatBonus(StatType.RESISTANCE);

        double resistanceValue = switch (damageType) {
            case PHYSIC -> {
                constant = 100;
                yield effectiveArmor * Math.max(0, p.getStatBuffMultiplier(StatType.ARMURE));
            }
            case MAGIC -> {
                constant = 100;
                double res = effectiveResistance * Math.max(0, p.getStatBuffMultiplier(StatType.RESISTANCE));
                yield isBurn ? res * 2 : res;
            }
            default -> {
                constant = 100;
                yield 0;
            }
        };

        double reductionFactor = resistanceValue / (resistanceValue + constant);

        StatType statType = switch (damageType) {
            case MAGIC -> StatType.DAMAGE_TAKEN_MAGIC;
            case PHYSIC -> StatType.DAMAGE_TAKEN_PHYSIC;
            case BRUT -> StatType.DAMAGE_TAKEN_BRUT;
            default -> throw new IllegalArgumentException("Unknown damage type: " + damageType);
        };

        double damageTakenMultiplier = Math.max(0.0, p.getStatBuffMultiplier(statType));

        int cursedVul = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_VULNERABILITY);
        if (cursedVul != 0) {
            damageTakenMultiplier += (Math.abs(cursedVul) / 100.0);
        }

        int flat = p.getStatFlatBonus(statType);

        double damageAfterBuff = damage * damageTakenMultiplier + flat;
        double finalDamage = damageAfterBuff * (1 - reductionFactor);

        int effectiveDamage = (int) finalDamage;
        if (damageAfterBuff > 0 && effectiveDamage < 1) {
            effectiveDamage = 1;
        }

        double casterPenetrationPct = 0.0;
        if (caster != null) {
            boolean hasPenBuff = caster.getActiveBuffs().stream()
                    .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PENETRATION) && b.getFlatValue() == 0);
            if (hasPenBuff) {
                casterPenetrationPct = caster.getStatBuffMultiplier(StatType.SHIELD_PENETRATION) - 1.0;
            }
        }

        double targetPiercedPct = 0.0;
        boolean hasPiercedBuff = p.getActiveBuffs().stream()
                .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PIERCED) && b.getFlatValue() == 0);
        if (hasPiercedBuff) {
            targetPiercedPct = p.getStatBuffMultiplier(StatType.SHIELD_PIERCED) - 1.0;
        }

        double targetPenetrationPctDebuff = 0.0;
        boolean hasTargetPenDebuff = p.getActiveBuffs().stream()
                .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PENETRATION) && b.getFlatValue() == 0);
        if (hasTargetPenDebuff) {
            double targetPenetrationMult = p.getStatBuffMultiplier(StatType.SHIELD_PENETRATION);
            if (targetPenetrationMult < 1.0) {
                targetPenetrationPctDebuff = 1.0 - targetPenetrationMult;
            }
        }

        double totalBypassPct = casterPenetrationPct + targetPiercedPct + targetPenetrationPctDebuff;

        int casterPenetrationFlat = caster != null ? caster.getStatFlatBonus(StatType.SHIELD_PENETRATION) : 0;
        int targetPiercedFlat = p.getStatFlatBonus(StatType.SHIELD_PIERCED);
        int targetPenetrationFlatDebuff = p.getStatFlatBonus(StatType.SHIELD_PENETRATION);
        int targetPiercedFlatCombined = targetPiercedFlat + (targetPenetrationFlatDebuff < 0 ? -targetPenetrationFlatDebuff : 0);

        int totalBypassFlat = casterPenetrationFlat + targetPiercedFlatCombined;

        int bypassDamage = 0;
        if (totalBypassPct > 0 || totalBypassFlat > 0) {
            double rawBypass = effectiveDamage * Math.min(1.0, totalBypassPct) + totalBypassFlat;
            bypassDamage = (int) Math.round(Math.min(effectiveDamage, Math.max(0, rawBypass)));
        }

        int remainingDamage = effectiveDamage - bypassDamage;

        int manaShieldPct = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.MANA_SHIELD);
        if (manaShieldPct > 0 && remainingDamage > 0) {
            int manaAbsorb = Math.min(p.getManaCurrent(), (int) Math.ceil(remainingDamage * (manaShieldPct / 100.0)));
            if (manaAbsorb > 0) {
                p.setManaCurrent(p.getManaCurrent() - manaAbsorb);
                remainingDamage -= manaAbsorb;
                System.out.println("🛡️ Bouclier de Mana absorbe " + manaAbsorb + " dégâts.");
            }
        }

        int absorbedByShields = 0;
        if (remainingDamage > 0) {
            if (p.getActiveShields() != null && !p.getActiveShields().isEmpty()) {
                double shieldDamageMult = 1.0;
                int shieldDamageFlat = 0;
                if (caster != null) {
                    if (damageType == DamageType.MAGIC) {
                        shieldDamageMult = caster.getStatBuffMultiplier(StatType.DAMAGE_GIVEN_MAGIC_TO_SHIELD);
                        shieldDamageFlat = caster.getStatFlatBonus(StatType.DAMAGE_GIVEN_MAGIC_TO_SHIELD);
                    } else if (damageType == DamageType.PHYSIC) {
                        shieldDamageMult = caster.getStatBuffMultiplier(StatType.DAMAGE_GIVEN_PHYSIC_TO_SHIELD);
                        shieldDamageFlat = caster.getStatFlatBonus(StatType.DAMAGE_GIVEN_PHYSIC_TO_SHIELD);
                    }
                }
                double safeMult = Math.max(0.001, shieldDamageMult);

                for (ActiveShield shield : p.getActiveShields()) {
                    if (shield.getAmount() > 0) {
                        double damageToShield = remainingDamage * safeMult + shieldDamageFlat;
                        if (damageToShield > 0) {
                            int absorbed = Math.min(shield.getAmount(), (int) Math.ceil(damageToShield));
                            shield.setAmount(shield.getAmount() - absorbed);

                            double rawConsumed = (absorbed - shieldDamageFlat) / safeMult;
                            if (rawConsumed < 0) {
                                rawConsumed = 0;
                            }
                            int rawConsumedInt = (int) Math.ceil(rawConsumed);
                            remainingDamage -= rawConsumedInt;
                            absorbedByShields += rawConsumedInt;

                            shieldDamageFlat = Math.max(0, shieldDamageFlat - absorbed);

                            if (absorbed > 0) {
                                System.out.println("🛡️ Le bouclier (" + shield.getSourceName() + ") absorbe " + absorbed
                                        + " dégâts (dégâts bruts consommés : " + rawConsumedInt + "). Reste : "
                                        + shield.getAmount() + " absorption.");
                            }
                            if (remainingDamage <= 0) {
                                remainingDamage = 0;
                                break;
                            }
                        }
                    }
                }
            }
        }

        int totalDamageToHealth = bypassDamage + remainingDamage;
        p.setHealthCurrent(Math.max(0, p.getHealthCurrent() - totalDamageToHealth));

        if (p.getHealthCurrent() <= 0 && !p.isUsedCheatDeath()) {
            int cheatDeathValue = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CHEAT_DEATH);
            if (cheatDeathValue > 0) {
                p.setUsedCheatDeath(true);
                int revivedHp = (int) (p.getTotalHealthMax() * 0.05 * cheatDeathValue);
                if (revivedHp < 1) revivedHp = 1;
                if (revivedHp > p.getTotalHealthMax()) revivedHp = p.getTotalHealthMax();

                p.setHealthCurrent(revivedHp);
                System.out.println("👼 Ange Gardien activé ! Le personnage survit avec " + revivedHp + " PV.");
            }
        }

        if (bypassDamage > 0) {
            System.out.println("🛡️ Perce-Bouclier / Bouclier Percé : " + bypassDamage + " dégâts passent en dessous du bouclier.");
        }

        double finalReductionFactor = Math.min(reductionFactor, 0.90);
        String shieldText = absorbedByShields > 0 ? "absorbés par les boucliers : " + absorbedByShields + ", " : "";
        String typeStr = "";
        if (damageType != null) {
            switch(damageType) {
                case MAGIC: typeStr = " magiques"; break;
                case PHYSIC: typeStr = " physiques"; break;
                case BRUT: typeStr = " bruts"; break;
            }
        }
        System.out.println(p.getName() + " subit " + effectiveDamage + " dégâts" + typeStr + " (" +
                shieldText + "réduction de " + (int) (finalReductionFactor * 100) + "%), " +
                "PV restants : " + p.getHealthCurrent());

        if (caster != null && totalDamageToHealth > 0) {
            if (damageType == DamageType.PHYSIC) {
                int thornsPct = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.THORNS);
                if (thornsPct > 0) {
                    int thornsDmg = (int) Math.ceil(totalDamageToHealth * (thornsPct / 100.0));
                    System.out.println("🌵 Épines renvoie " + thornsDmg + " dégâts !");
                    caster.takeDamage(thornsDmg, DamageType.BRUT);
                }
            }
            if (damageType == DamageType.PHYSIC || damageType == DamageType.MAGIC) {
                int lifestealPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.LIFESTEAL);
                if (lifestealPct > 0) {
                    int healAmount = (int) Math.ceil(totalDamageToHealth * (lifestealPct / 100.0));
                    System.out.println("🩸 Vol de vie : l'attaquant récupère " + healAmount + " PV.");
                    caster.heal(healAmount);
                }
            }
        }
    }

    public static void dealDamage(Personnage p, Personnage target, int baseDamage, DamageType type) {
        double multiplier = 1.0;
        int flatBonus = 0;

        if (type == DamageType.PHYSIC) {
            multiplier = Math.max(0.0, p.getStatBuffMultiplier(StatType.DAMAGE_GIVEN_PHYSIC));
            flatBonus = p.getStatFlatBonus(StatType.DAMAGE_GIVEN_PHYSIC);
        } else if (type == DamageType.MAGIC) {
            multiplier = Math.max(0.0, p.getStatBuffMultiplier(StatType.DAMAGE_GIVEN_MAGIC));
            flatBonus = p.getStatFlatBonus(StatType.DAMAGE_GIVEN_MAGIC);
        } else if (type == DamageType.BRUT) {
            multiplier = Math.max(0.0, p.getStatBuffMultiplier(StatType.DAMAGE_GIVEN_BRUT));
            flatBonus = p.getStatFlatBonus(StatType.DAMAGE_GIVEN_BRUT);
        }

        baseDamage = (int) (baseDamage * multiplier) + flatBonus;
        if (baseDamage < 0) {
            baseDamage = 0;
        }

        if (p.getMonsterType() == generation.grimoire.enumeration.MonsterType.HYBRIDE && type != DamageType.BRUT) {
            int total = (int) (baseDamage * 1.2);
            target.takeDamage(total / 2, DamageType.PHYSIC, p);
            target.takeDamage(total - (total / 2), DamageType.MAGIC, p);
            baseDamage = total;
        } else {
            target.takeDamage(baseDamage, type, p);
        }

        if (p.getMonsterType() == generation.grimoire.enumeration.MonsterType.DEMON) {
            int brutDmg = (int) Math.ceil(baseDamage * 0.10);
            if (brutDmg > 0) {
                target.takeDamage(brutDmg, DamageType.BRUT, p);
                System.out.println("🔥 " + p.getName() + " inflige " + brutDmg + " dégâts bruts supplémentaires (Démon).");
            }
        }

        if (p.getMonsterType() == generation.grimoire.enumeration.MonsterType.VAMPIRE) {
            int healAmount = (int) Math.ceil(baseDamage * 0.20);
            if (healAmount > 0) {
                System.out.println("🧛 " + p.getName() + " tente de voler " + healAmount + " PV (Vampire).");
                p.heal(healAmount);
            }
        }

        if (p.getMonsterType() == generation.grimoire.enumeration.MonsterType.ECTOPLASME) {
            BuffDebuffEffect eff = new BuffDebuffEffect();
            eff.setStatAffected(StatType.RESISTANCE);
            eff.setFlatValue(-5);
            eff.setDuration(3);
            target.getActiveBuffs().add(eff);
            System.out.println("👻 " + target.getName() + " perd 5 Résistance Magique pour 3 tours ! (Ectoplasme)");
        }
    }

    public static void heal(Personnage p, int healAmount) {
        double multiplier = p.getStatBuffMultiplier(StatType.HEAL_RECEIVED);

        int cursedHeal = p.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_HEALING_REDUCTION);
        if (cursedHeal != 0) {
            multiplier -= (Math.abs(cursedHeal) / 100.0);
        }

        int finalHeal = (int) (healAmount * Math.max(0, multiplier));
        p.setHealthCurrent(p.getHealthCurrent() + finalHeal);
        if (p.getHealthCurrent() > p.getTotalHealthMax()) {
            p.setHealthCurrent(p.getTotalHealthMax());
        } else if (p.getHealthCurrent() < 0) {
            p.setHealthCurrent(0);
        }
        System.out.println(p.getName() + " est soigné de " + finalHeal + " points. Vie actuelle : " + p.getHealthCurrent());

        boolean removedPoison = p.getActiveBuffs().removeIf(b -> b.getStatAffected() == StatType.POISON && (b.getFlatValue() > 0 || b.getModifier() > 0));
        boolean removedPoisonDot = p.getActiveDamageOverTimeEffects().removeIf(dot -> Boolean.TRUE.equals(dot.getPoison()));
        if (removedPoison || removedPoisonDot) {
            System.out.println("💧 Le soin a purifié le Poison sur " + p.getName() + " !");
        }
    }

    public static void updateBuffs(Personnage p) {
        int totalBurnFlat = p.getStatFlatBonus(StatType.BURN);
        if (totalBurnFlat > 0) {
            double totalBurnMult = Math.max(0, p.getStatBuffMultiplier(StatType.BURN));
            int effectiveBurn = (int) Math.round(totalBurnFlat * totalBurnMult);
            if (effectiveBurn > 0) {
                System.out.println("🔥 " + p.getName() + " subit " + effectiveBurn + " dégâts de Brûlure !");
                p.takeDamage(effectiveBurn, DamageType.MAGIC, null, true);
            }
        }

        int totalPoisonFlat = p.getStatFlatBonus(StatType.POISON);
        if (totalPoisonFlat > 0) {
            double totalPoisonMult = Math.max(0, p.getStatBuffMultiplier(StatType.POISON));
            int effectivePoison = (int) Math.round(totalPoisonFlat * totalPoisonMult);
            if (effectivePoison > 0) {
                System.out.println("☠️ " + p.getName() + " subit " + effectivePoison + " dégâts de Poison !");
                p.takeDamage(effectivePoison, DamageType.BRUT);
            }
        }

        if (p.getActiveBuffs() != null) {
            Iterator<BuffDebuffEffect> iterator = p.getActiveBuffs().iterator();
            while (iterator.hasNext()) {
                BuffDebuffEffect effect = iterator.next();
                effect.setDuration(effect.getDuration() - 1);
                if (effect.getDuration() <= 0) {
                    iterator.remove();
                    System.out.println(p.getName() + " perd l'effet sur " + effect.getStatAffected());
                }
            }
        }
        updateShields(p);
    }

    public static void updateShields(Personnage p) {
        if (p.getActiveShields() == null) return;
        Iterator<ActiveShield> iterator = p.getActiveShields().iterator();
        while (iterator.hasNext()) {
            ActiveShield shield = iterator.next();
            shield.setDuration(shield.getDuration() - 1);
            if (shield.getDuration() <= 0 || shield.getAmount() <= 0) {
                iterator.remove();
                System.out.println(p.getName() + " perd l'effet de bouclier (" + shield.getSourceName() + ").");
            }
        }
    }

    public static void updateHealOverTimeEffects(Personnage p) {
        if (p.getActiveHealOverTimeEffects() == null) return;
        Iterator<HealOverTimeEffect> iterator = p.getActiveHealOverTimeEffects().iterator();
        while (iterator.hasNext()) {
            HealOverTimeEffect effect = iterator.next();
            effect.tick(p);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(p.getName() + " n'a plus d'effet de heal over time.");
            }
        }
    }

    public static void updateManaOverTimeEffects(Personnage p) {
        if (p.getActiveManaOverTimeEffects() == null) return;
        Iterator<ManaOverTimeEffect> iterator = p.getActiveManaOverTimeEffects().iterator();
        while (iterator.hasNext()) {
            ManaOverTimeEffect effect = iterator.next();
            effect.tick(p);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(p.getName() + " n'a plus d'effet de mana over time.");
            }
        }
    }

    public static void updateDamageOverTimeEffects(Personnage p) {
        if (p.getActiveDamageOverTimeEffects() == null) return;
        Iterator<DamageOverTimeEffect> iterator = p.getActiveDamageOverTimeEffects().iterator();
        while (iterator.hasNext()) {
            DamageOverTimeEffect dot = iterator.next();
            dot.tick(p);
            if (dot.getDuration() <= 0) {
                iterator.remove();
                System.out.println(p.getName() + " n'est plus affecté par un effet de Damage Over Time.");
            }
        }
    }

    public static void updateHeatOverTimeEffects(Personnage p) {
        if (p.getActiveHeatOverTimeEffects() == null) return;
        Iterator<generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect> iterator = p.getActiveHeatOverTimeEffects().iterator();
        while (iterator.hasNext()) {
            generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect hot = iterator.next();
            hot.tick(p);
            if (hot.getDuration() <= 0) {
                iterator.remove();
                System.out.println(p.getName() + " n'est plus affecté par un effet de Heat Over Time.");
            }
        }
    }

    public static double getStatBuffMultiplier(Personnage p, StatType statType) {
        if (p.getActiveBuffs() == null) return 1.0;
        double totalModifier = p.getActiveBuffs().stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() == 0)
                .mapToDouble(buff -> buff.getModifier())
                .sum();

        if (statType == StatType.DAMAGE_GIVEN_PHYSIC) {
            boolean hasAmeDetachee = p.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.AME_DETACHEE);
            if (hasAmeDetachee) {
                totalModifier += 0.40;
            }
        }
        return 1.0 + totalModifier;
    }

    public static int getStatFlatBonus(Personnage p, StatType statType) {
        int buffBonus = 0;
        if (p.getActiveBuffs() != null) {
            buffBonus = p.getActiveBuffs().stream()
                    .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() != 0)
                    .mapToInt(buff -> buff.getFlatValue())
                    .sum();
            
            if (statType == StatType.DAMAGE_GIVEN_PHYSIC) {
                boolean hasAmeDetachee = p.getActiveBuffs().stream().anyMatch(b -> b.getStatAffected() == StatType.AME_DETACHEE);
                if (hasAmeDetachee) {
                    buffBonus += 5;
                }
            }
        }

        int passiveBonus = p.getPassiveState("stat_flat_" + statType.name(), 0);

        int equipmentBonus = 0;
        if (p.getEquipments() != null) {
            for (generation.grimoire.entity.Equipment eq : p.getEquipments()) {
                switch (statType) {
                    case HEALTH -> equipmentBonus += eq.getBonusHealthMax();
                    case MANA -> equipmentBonus += eq.getBonusManaMax();
                    case POWER -> equipmentBonus += eq.getBonusPower();
                    case STRENGTH -> equipmentBonus += eq.getBonusStrength();
                    case ARMURE -> equipmentBonus += eq.getBonusArmor();
                    case RESISTANCE -> equipmentBonus += eq.getBonusResistance();
                    case SPEED -> equipmentBonus += eq.getBonusSpeed();
                    case CRIT -> equipmentBonus += eq.getBonusCrit();
                    default -> {}
                }
            }
        }

        int totalBonus = buffBonus + passiveBonus + equipmentBonus;

        if (p.getVoie() != null && p.getVoie().getPassiveEffects() != null) {
            for (generation.grimoire.entity.voie.passif.VoiePassiveEffect passif : p.getVoie().getPassiveEffects()) {
                totalBonus = passif.adjustFlatBonus(p, statType, totalBonus);
            }
        }
        if (p.getSpiritualite() != null && p.getSpiritualite().getPassiveEffects() != null) {
            for (generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect passif : p.getSpiritualite().getPassiveEffects()) {
                totalBonus = passif.adjustFlatBonus(p, statType, totalBonus);
            }
        }

        return totalBonus;
    }

    public static int getEffectiveStat(Personnage p, StatType statType) {
        int base = 0;
        switch (statType) {
            case POWER -> base = p.getPower();
            case STRENGTH -> base = p.getStrength();
            case ARMURE -> base = p.getArmor();
            case RESISTANCE -> base = p.getResistance();
            case SPEED -> base = p.getSpeed();
            case CRIT -> base = p.getCrit();
            default -> base = 0;
        }
        double effective = base + getStatFlatBonus(p, statType);
        effective *= Math.max(0, getStatBuffMultiplier(p, statType));
        return (int) Math.round(effective);
    }
}
