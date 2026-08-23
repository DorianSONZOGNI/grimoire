package generation.grimoire.entity.personnage;

import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.ManaOverTimeEffect;
import generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Data
@NoArgsConstructor
@EqualsAndHashCode(exclude = { "user", "equipments", "activeBuffs", "activeShields", "activeHealOverTimeEffects",
        "activeManaOverTimeEffects", "activeDamageOverTimeEffects", "activeHeatOverTimeEffects", "consumableSpellBuffs",
        "channelingTarget", "channelingAlly", "channeledSpell" })
@ToString(exclude = { "user", "equipments", "activeBuffs", "activeShields", "activeHealOverTimeEffects",
        "activeManaOverTimeEffects", "activeDamageOverTimeEffects", "activeHeatOverTimeEffects", "consumableSpellBuffs",
        "channelingTarget", "channelingAlly", "channeledSpell" })
@Entity
@Table(name = "Personnage")
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "channelingTarget", "channelingAlly", "channeledSpell" })
public class Personnage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String teamId;

    @Transient
    private generation.grimoire.enumeration.MonsterType monsterType;
    @Transient
    private String monsterName;

    // Statistiques de vie et de mana
    private int healthMax;
    private int healthCurrent;
    private int manaMax;
    private int manaCurrent;
    private int power;
    private int strength;
    private int armor;
    private int resistance;
    private int crit;
    private int speed;
    private int regenHp;
    private int regenMana;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    private int experience = 0;

    private int voieLevel = 1;

    public void setExperience(int newExperience) {
        this.experience = newExperience;

        int newCalculated = 1;
        if (this.experience >= 1000)
            newCalculated = 5;
        else if (this.experience >= 600)
            newCalculated = 4;
        else if (this.experience >= 300)
            newCalculated = 3;
        else if (this.experience >= 100)
            newCalculated = 2;

        if (newCalculated > this.voieLevel) {
            int levelsGained = newCalculated - this.voieLevel;
            this.voieLevel = newCalculated;
            applyVoieLevelUpStats(levelsGained);
        }
    }

    private void applyVoieLevelUpStats(int levelsGained) {
        if (this.voie == null || this.voie.getNom() == null)
            return;
        String nomVoie = this.voie.getNom().toLowerCase();

        for (int i = 0; i < levelsGained; i++) {
            if (nomVoie.contains("conviction")) {
                this.power += 1;
                this.resistance += 2;
                this.healthMax += 7;
                this.healthCurrent += 7;
                this.manaMax += 20;
                this.manaCurrent += 20;
                this.regenMana += 4;
            } else if (nomVoie.contains("raison")) {
                this.healthMax += 6;
                this.healthCurrent += 6;
                this.manaMax += 6;
                this.manaCurrent += 6;
                this.speed += 1;
            } else if (nomVoie.contains("violence")) {
                this.power += 1;
                this.strength += 1;
                this.manaMax += 8;
                this.manaCurrent += 8;
            } else if (nomVoie.contains("création") || nomVoie.contains("creation")) {
                this.healthMax += 5;
                this.healthCurrent += 5;
                this.regenHp += 2;
                this.armor += 1;
            } else if (nomVoie.contains("trahison")) {
                this.strength += 1;
                this.crit += 2;
                this.speed += 1;
            } else if (nomVoie.contains("sureté") || nomVoie.contains("surete") || nomVoie.contains("sûreté")) {
                this.manaMax += 12;
                this.manaCurrent += 12;
                this.resistance += 1;
                this.regenMana += 2;
            } else if (nomVoie.contains("consolidation")) {
                this.armor += 2;
                this.resistance += 2;
                this.healthMax += 5;
                this.healthCurrent += 5;
            } else if (nomVoie.contains("destruction")) {
                this.power += 2;
                this.regenMana += 2;
                this.manaMax += 8;
                this.manaCurrent += 8;
            }
        }
    }

    @Access(AccessType.PROPERTY)
    @Column(name = "voie_level", nullable = false)
    public int getVoieLevel() {
        int calculated = 1;
        if (experience >= 1000)
            calculated = 5;
        else if (experience >= 600)
            calculated = 4;
        else if (experience >= 300)
            calculated = 3;
        else if (experience >= 100)
            calculated = 2;

        if (calculated > this.voieLevel) {
            this.voieLevel = calculated;
        }
        return this.voieLevel;
    }

    public void setVoieLevel(int level) {
        this.voieLevel = level;
    }

    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = true)
    private Spiritualite spiritualite;

    private int spiritualiteExperience = 0;

    @ElementCollection
    @CollectionTable(name = "personnage_special_items", joinColumns = @JoinColumn(name = "personnage_id"))
    @MapKeyColumn(name = "item_name")
    @Column(name = "quantity")
    private Map<String, Integer> specialItems = new HashMap<>();

    public int getSpecialItemQuantity(String itemName) {
        return specialItems.getOrDefault(itemName, 0);
    }

    public Map<String, Integer> getSpecialItems() {
        return specialItems;
    }

    public void setSpecialItems(Map<String, Integer> specialItems) {
        this.specialItems = specialItems;
    }

    public void addSpecialItem(String itemName, int quantity) {
        specialItems.put(itemName, getSpecialItemQuantity(itemName) + quantity);
    }

    public void removeSpecialItem(String itemName, int quantity) {
        int current = getSpecialItemQuantity(itemName);
        if (current >= quantity) {
            specialItems.put(itemName, current - quantity);
        } else {
            specialItems.put(itemName, 0);
        }
    }

    private int spiritualiteLevel = 1;

    @Access(AccessType.PROPERTY)
    @Column(name = "spiritualite_level", nullable = false)
    public int getSpiritualiteLevel() {
        int calculated = 1;
        if (spiritualiteExperience >= 300)
            calculated = 3;
        else if (spiritualiteExperience >= 100)
            calculated = 2;

        if (calculated > this.spiritualiteLevel) {
            this.spiritualiteLevel = calculated;
        }
        return this.spiritualiteLevel;
    }

    public void setSpiritualiteLevel(int level) {
        this.spiritualiteLevel = level;
    }

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private generation.grimoire.entity.auth.AppUser user;

    @com.fasterxml.jackson.annotation.JsonProperty("ownerUsername")
    @Transient
    public String getOwnerUsername() {
        return user != null ? user.getUsername() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("gold")
    @Transient
    public int getGold() {
        return user != null ? (int) user.getMonnaie() : 0;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "personnage", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)

    private List<generation.grimoire.entity.Equipment> equipments = new ArrayList<>();

    // Liste des buffs/débuffs actifs (ici en mémoire, mais vous pouvez choisir de
    // les persister si besoin)
    @Transient
    private List<BuffDebuffEffect> activeBuffs = new ArrayList<>();

    @Transient
    private List<ActiveShield> activeShields = new ArrayList<>();

    // Liste des effets de heal over time actifs (non persistés)
    @Transient
    private List<HealOverTimeEffect> activeHealOverTimeEffects = new ArrayList<>();

    @Transient
    private List<ManaOverTimeEffect> activeManaOverTimeEffects = new ArrayList<>();

    @Transient
    private boolean usedCheatDeath = false;

    public boolean isUsedCheatDeath() {
        return usedCheatDeath;
    }

    public void setUsedCheatDeath(boolean usedCheatDeath) {
        this.usedCheatDeath = usedCheatDeath;
    }

    @Transient
    private List<DamageOverTimeEffect> activeDamageOverTimeEffects = new ArrayList<>();

    @Transient
    private List<generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect> activeHeatOverTimeEffects = new ArrayList<>();

    @Transient
    private List<ConsumableSpellBuffDebuffEffect> consumableSpellBuffs = new ArrayList<>();

    @Transient
    private java.util.Map<String, Integer> passiveStates = new java.util.HashMap<>();

    public int getPassiveState(String key, int defaultValue) {
        return passiveStates.getOrDefault(key, defaultValue);
    }

    public void setPassiveState(String key, int value) {
        passiveStates.put(key, value);
    }

    @Transient
    private boolean instantSpellCastThisTurn;

    @Transient
    private boolean banalSpellCastThisTurn;

    @Transient
    private int remainingChannelingTurns;

    @Transient
    private boolean allowInstantDuringCurrentChanneling = true;

    @Transient
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Spell channeledSpell;

    @Transient
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Personnage channelingTarget;

    @Transient
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Personnage channelingAlly;

    @Transient
    private Integer channelingChoiceKey;

    public void startTurn() {
        this.instantSpellCastThisTurn = false;
        this.banalSpellCastThisTurn = false;

        if (this.remainingChannelingTurns > 0) {
            // On ne décrémente PAS ici car c'est tickChanneling() qui gère l'avancement.
            // On empêche simplement le personnage de lancer un autre sort banal pendant
            // qu'il canalise.
            this.banalSpellCastThisTurn = true;
            System.out.println(name + " continue de canaliser (tours restants : " + remainingChannelingTurns + ").");
        }

        // Effets de régen de base + équipements (Régen / Drain)
        if (this.healthCurrent > 0) {
            int totalHpRegen = this.regenHp;
            int totalManaRegen = this.regenMana;
            if (this.equipments != null) {
                for (generation.grimoire.entity.Equipment eq : this.equipments) {
                    totalHpRegen += eq.getRegenHealthPerTurn();
                    totalManaRegen += eq.getRegenManaPerTurn();
                }
            }
            if (totalHpRegen > 0) {
                this.heal(totalHpRegen);
            } else if (totalHpRegen < 0) {
                this.takeDamage(-totalHpRegen, generation.grimoire.enumeration.DamageType.BRUT);
            }

            // Malédiction: Famine (Drain de mana par tour)
            int cursedManaDrain = getSpecialEffectValue(
                    generation.grimoire.enumeration.EquipmentEffectType.CURSED_MANA_DRAIN);
            if (cursedManaDrain != 0) {
                totalManaRegen -= Math.abs(cursedManaDrain);
            }

            if (totalManaRegen != 0) {
                this.setManaCurrent(this.manaCurrent + totalManaRegen);
            }
        }
    }

    public int getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType type) {
        if (this.equipments == null)
            return 0;
        int total = 0;
        for (generation.grimoire.entity.Equipment eq : this.equipments) {
            if (eq.getSpecialEffect() == type) {
                total += eq.getSpecialEffectValue();
            }
        }
        return total;
    }

    /**
     * Applique des dégâts après calculs des résistance à ce personnage.
     * Calculs de résistance en fonction du DamageType.
     *
     * @param damage     le montant de dégâts
     * @param damageType le type de dégâts (ex : PHYSICAL, MAGICAL, etc.)
     */
    public void takeDamage(int damage, DamageType damageType) {
        takeDamage(damage, damageType, null);
    }

    public void takeDamage(int damage, DamageType damageType, Personnage caster) {
        takeDamage(damage, damageType, caster, false);
    }

    public void takeDamage(int damage, DamageType damageType, Personnage caster, boolean isBurn) {
        if (damageType == DamageType.PHYSIC && caster != null) {
            if (caster.getVoie() != null && caster.getVoie().getPassiveEffects() != null) {
                for (generation.grimoire.entity.voie.passif.VoiePassiveEffect p : caster.getVoie()
                        .getPassiveEffects()) {
                    if (p instanceof TrahisonPassiveEffect trahison) {
                        trahison.onPhysicalHit(caster, this, damage);
                    }
                }
            }
        }

        double constant; // La constante K qui détermine la courbe.

        if (this.monsterType == generation.grimoire.enumeration.MonsterType.REPTILE
                && damageType == DamageType.PHYSIC) {
            damage = (int) Math.ceil(damage * 0.85);
            System.out.println("🦎 " + this.getName() + " réduit les dégâts physiques subis de 15% (Reptile).");
        }

        double effectiveArmor = this.armor + getStatFlatBonus(StatType.ARMURE);
        double effectiveResistance = this.resistance + getStatFlatBonus(StatType.RESISTANCE);

        // Sélectionner la résistance en fonction du type de dégâts
        double resistanceValue = switch (damageType) {
            case PHYSIC -> {
                constant = 100;
                yield effectiveArmor * Math.max(0, getStatBuffMultiplier(StatType.ARMURE));
            }
            case MAGIC -> {
                constant = 100;
                double res = effectiveResistance * Math.max(0, getStatBuffMultiplier(StatType.RESISTANCE));
                yield isBurn ? res * 2 : res;
            }
            default -> {
                constant = 100;
                yield 0;
            }
        };

        // Calcul du facteur de réduction des dégâts (valeur entre 0 et 1)
        double reductionFactor = resistanceValue / (resistanceValue + constant);

        // NOTE : si de multiples buffs sont donnés, cela fonctionne (buff phy, buff
        // mag).
        // NOTE : La vulnérabilité et la résistance fonctionnent en cumulé sur la cible,
        // mais pas encore la surpuissance (multiple sur le lanceur).

        // Mapper le DamageType vers StatType pour obtenir le multiplicateur de
        // vulnérabilité
        StatType statType = switch (damageType) {
            case MAGIC -> StatType.DAMAGE_TAKEN_MAGIC;
            case PHYSIC -> StatType.DAMAGE_TAKEN_PHYSIC;
            case BRUT -> StatType.DAMAGE_TAKEN_BRUT;
            default -> throw new IllegalArgumentException("Unknown damage type: " + damageType);
        };

        // Récupérer le multiplicateur de vulnérabilité / réduction
        double damageTakenMultiplier = Math.max(0.0, getStatBuffMultiplier(statType));

        int cursedVul = getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CURSED_VULNERABILITY);
        if (cursedVul != 0) {
            damageTakenMultiplier += (Math.abs(cursedVul) / 100.0);
        }

        int flat = getStatFlatBonus(statType);

        double damageAfterBuff = damage * damageTakenMultiplier + flat;

        // Calcul des dégâts après la réduction
        double finalDamage = damageAfterBuff * (1 - reductionFactor);

        // S'assurer que les dégâts sont toujours au moins 1 si les dégâts de base
        // étaient > 0
        int effectiveDamage = (int) finalDamage;
        if (damageAfterBuff > 0 && effectiveDamage < 1) {
            effectiveDamage = 1;
        }

        // Calculer la pénétration de bouclier (pourcentage et flat)
        double casterPenetrationPct = 0.0;
        if (caster != null) {
            boolean hasPenBuff = caster.getActiveBuffs().stream()
                    .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PENETRATION) && b.getFlatValue() == 0);
            if (hasPenBuff) {
                casterPenetrationPct = caster.getStatBuffMultiplier(StatType.SHIELD_PENETRATION) - 1.0;
            }
        }

        double targetPiercedPct = 0.0;
        boolean hasPiercedBuff = this.getActiveBuffs().stream()
                .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PIERCED) && b.getFlatValue() == 0);
        if (hasPiercedBuff) {
            targetPiercedPct = this.getStatBuffMultiplier(StatType.SHIELD_PIERCED) - 1.0;
        }

        // Rétrocompatibilité avec les debuffs négatifs de SHIELD_PENETRATION sur la
        // cible
        double targetPenetrationPctDebuff = 0.0;
        boolean hasTargetPenDebuff = this.getActiveBuffs().stream()
                .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PENETRATION) && b.getFlatValue() == 0);
        if (hasTargetPenDebuff) {
            double targetPenetrationMult = this.getStatBuffMultiplier(StatType.SHIELD_PENETRATION);
            if (targetPenetrationMult < 1.0) {
                targetPenetrationPctDebuff = 1.0 - targetPenetrationMult;
            }
        }

        double totalBypassPct = casterPenetrationPct + targetPiercedPct + targetPenetrationPctDebuff;

        int casterPenetrationFlat = caster != null ? caster.getStatFlatBonus(StatType.SHIELD_PENETRATION) : 0;
        int targetPiercedFlat = this.getStatFlatBonus(StatType.SHIELD_PIERCED);
        int targetPenetrationFlatDebuff = this.getStatFlatBonus(StatType.SHIELD_PENETRATION);
        int targetPiercedFlatCombined = targetPiercedFlat
                + (targetPenetrationFlatDebuff < 0 ? -targetPenetrationFlatDebuff : 0);

        int totalBypassFlat = casterPenetrationFlat + targetPiercedFlatCombined;

        // Calculer le montant qui passe en dessous du bouclier
        int bypassDamage = 0;
        if (totalBypassPct > 0 || totalBypassFlat > 0) {
            double rawBypass = effectiveDamage * Math.min(1.0, totalBypassPct) + totalBypassFlat;
            bypassDamage = (int) Math.round(Math.min(effectiveDamage, Math.max(0, rawBypass)));
        }

        int remainingDamage = effectiveDamage - bypassDamage;

        // MANA SHIELD
        int manaShieldPct = getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.MANA_SHIELD);
        if (manaShieldPct > 0 && remainingDamage > 0) {
            int manaAbsorb = Math.min(this.manaCurrent, (int) Math.ceil(remainingDamage * (manaShieldPct / 100.0)));
            if (manaAbsorb > 0) {
                this.manaCurrent -= manaAbsorb;
                remainingDamage -= manaAbsorb;
                System.out.println("🛡️ Bouclier de Mana absorbe " + manaAbsorb + " dégâts.");
            }
        }

        int absorbedByShields = 0;

        if (remainingDamage > 0) {
            if (activeShields != null && !activeShields.isEmpty()) {
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

                for (ActiveShield shield : activeShields) {
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
                                System.out
                                        .println("🛡️ Le bouclier (" + shield.getSourceName() + ") absorbe " + absorbed
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

        // Appliquer les dégâts finaux (bypass + dégâts non absorbés par le bouclier) à
        // la santé actuelle
        int totalDamageToHealth = bypassDamage + remainingDamage;
        this.healthCurrent = Math.max(0, this.healthCurrent - totalDamageToHealth);

        // CHEAT DEATH
        if (this.healthCurrent <= 0 && !this.usedCheatDeath) {
            int cheatDeathValue = getSpecialEffectValue(
                    generation.grimoire.enumeration.EquipmentEffectType.CHEAT_DEATH);
            if (cheatDeathValue > 0) {
                this.usedCheatDeath = true;

                int revivedHp = (int) (this.getTotalHealthMax() * 0.05 * cheatDeathValue);
                if (revivedHp < 1)
                    revivedHp = 1;
                if (revivedHp > this.getTotalHealthMax())
                    revivedHp = this.getTotalHealthMax();

                this.healthCurrent = revivedHp;
                System.out.println(
                        "👼 Ange Gardien activé ! Le personnage survit avec " + revivedHp + " PV.");
            }
        }

        // Affichage des informations
        if (bypassDamage > 0) {
            System.out.println("🛡️ Perce-Bouclier / Bouclier Percé : " + bypassDamage
                    + " dégâts passent en dessous du bouclier.");
        }

        // Affichage des informations
        double finalReductionFactor = Math.min(reductionFactor, 0.90); // Limite la réduction à 90%
        String shieldText = absorbedByShields > 0 ? "absorbés par les boucliers : " + absorbedByShields + ", " : "";
        String typeStr = "";
        if (damageType != null) {
            switch(damageType) {
                case MAGIC: typeStr = " magiques"; break;
                case PHYSIC: typeStr = " physiques"; break;
                case BRUT: typeStr = " bruts"; break;
            }
        }
        System.out.println(this.name + " subit " + effectiveDamage + " dégâts" + typeStr + " (" +
                shieldText +
                "réduction de " + (int) (finalReductionFactor * 100) + "%), " +
                "PV restants : " + this.healthCurrent);

        // LIFESTEAL & THORNS
        if (caster != null && totalDamageToHealth > 0) {
            if (damageType == DamageType.PHYSIC) {
                int thornsPct = getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.THORNS);
                if (thornsPct > 0) {
                    int thornsDmg = (int) Math.ceil(totalDamageToHealth * (thornsPct / 100.0));
                    System.out.println("🌵 Épines renvoie " + thornsDmg + " dégâts !");
                    caster.takeDamage(thornsDmg, DamageType.BRUT);
                }
            }
            if (damageType == DamageType.PHYSIC || damageType == DamageType.MAGIC) {
                int lifestealPct = caster
                        .getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.LIFESTEAL);
                if (lifestealPct > 0) {
                    int healAmount = (int) Math.ceil(totalDamageToHealth * (lifestealPct / 100.0));
                    System.out.println("🩸 Vol de vie : l'attaquant récupère " + healAmount + " PV.");
                    caster.heal(healAmount);
                }
            }
        }

        // Affichage pour le débogage

    }

    public int getTotalHealthMax() {
        return this.healthMax + getStatFlatBonus(StatType.HEALTH);
    }

    public int getTotalManaMax() {
        return this.manaMax + getStatFlatBonus(StatType.MANA);
    }

    /**
     * Soigne ce personnage.
     *
     * @param healAmount le montant de soin à appliquer
     */
    public void heal(int healAmount) {
        double multiplier = getStatBuffMultiplier(StatType.HEAL_RECEIVED);

        int cursedHeal = getSpecialEffectValue(
                generation.grimoire.enumeration.EquipmentEffectType.CURSED_HEALING_REDUCTION);
        if (cursedHeal != 0) {
            multiplier -= (Math.abs(cursedHeal) / 100.0);
        }

        int finalHeal = (int) (healAmount * Math.max(0, multiplier));
        this.healthCurrent += finalHeal;
        if (this.healthCurrent > this.getTotalHealthMax()) {
            this.healthCurrent = this.getTotalHealthMax();
        } else if (this.healthCurrent < 0) {
            this.healthCurrent = 0;
        }
        System.out.println(name + " est soigné de " + finalHeal + " points. Vie actuelle : " + healthCurrent);

        boolean removedPoison = activeBuffs
                .removeIf(b -> b.getStatAffected() == StatType.POISON && (b.getFlatValue() > 0 || b.getModifier() > 0));
        boolean removedPoisonDot = activeDamageOverTimeEffects.removeIf(dot -> Boolean.TRUE.equals(dot.getPoison()));
        if (removedPoison || removedPoisonDot) {
            System.out.println("💧 Le soin a purifié le Poison sur " + name + " !");
        }
    }

    public void restoreMana(int manaAmount) {
        this.manaCurrent += manaAmount;
        if (this.manaCurrent > this.getTotalManaMax()) {
            this.manaCurrent = this.getTotalManaMax();
        } else if (this.manaCurrent < 0) {
            this.manaCurrent = 0;
        }
        System.out.println(name + " régénère " + manaAmount + " mana. Mana actuelle : " + manaCurrent);
    }

    /**
     * Ajoute un effet de heal over time à ce personnage.
     * Vous pouvez cloner l'effet pour éviter de partager une même instance entre
     * plusieurs applications.
     */
    public void addHealOverTimeEffect(HealOverTimeEffect effect) {
        activeHealOverTimeEffects.add(effect);
    }

    /**
     * Met à jour les effets de heal over time.
     * Doit être appelé à chaque tour pour appliquer les soins et décrémenter la
     * durée.
     */
    public void updateHealOverTimeEffects() {
        Iterator<HealOverTimeEffect> iterator = activeHealOverTimeEffects.iterator();
        while (iterator.hasNext()) {
            HealOverTimeEffect effect = iterator.next();
            effect.tick(this);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(name + " n'a plus d'effet de heal over time.");
            }
        }
    }

    public void addManaOverTimeEffect(ManaOverTimeEffect effect) {
        activeManaOverTimeEffects.add(effect);
    }

    public void updateManaOverTimeEffects() {
        Iterator<ManaOverTimeEffect> iterator = activeManaOverTimeEffects.iterator();
        while (iterator.hasNext()) {
            ManaOverTimeEffect effect = iterator.next();
            effect.tick(this);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(name + " n'a plus d'effet de mana over time.");
            }
        }
    }

    public void addDamageOverTimeEffect(DamageOverTimeEffect effect) {
        activeDamageOverTimeEffects.add(effect);
    }

    public void updateDamageOverTimeEffects() {
        Iterator<DamageOverTimeEffect> iterator = activeDamageOverTimeEffects.iterator();
        while (iterator.hasNext()) {
            DamageOverTimeEffect dot = iterator.next();
            dot.tick(this);
            if (dot.getDuration() <= 0) {
                iterator.remove();
                System.out.println(this.getName() + " n'est plus affecté par un effet de Damage Over Time.");
            }
        }
    }

    public void addHeatOverTimeEffect(generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect effect) {
        activeHeatOverTimeEffects.add(effect);
    }

    public void updateHeatOverTimeEffects() {
        Iterator<generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect> iterator = activeHeatOverTimeEffects
                .iterator();
        while (iterator.hasNext()) {
            generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect hot = iterator.next();
            hot.tick(this);
            if (hot.getDuration() <= 0) {
                iterator.remove();
                System.out.println(this.getName() + " n'est plus affecté par un effet de Heat Over Time.");
            }
        }
    }

    /**
     * Applique un effet de buff ou débuff sur ce personnage.
     *
     * @param buffDebuff l'effet à appliquer
     */
    public void applyBuff(BuffDebuffEffect buffDebuff, Double modifier) {
        buffDebuff.setModifier(modifier);
        activeBuffs.add(buffDebuff);

        System.out.println(name + " reçoit un effet sur " + buffDebuff.getStatAffected()
                + " (modificateur : " + modifier
                + ") pour " + buffDebuff.getDuration() + " tours.");
    }

    /**
     * Met à jour la durée des buffs/débuffs actifs et retire ceux qui sont expirés.
     */
    public void updateBuffs() {
        int totalBurnFlat = getStatFlatBonus(StatType.BURN);
        if (totalBurnFlat > 0) {
            double totalBurnMult = Math.max(0, getStatBuffMultiplier(StatType.BURN));
            int effectiveBurn = (int) Math.round(totalBurnFlat * totalBurnMult);
            if (effectiveBurn > 0) {
                System.out.println("🔥 " + this.name + " subit " + effectiveBurn + " dégâts de Brûlure !");
                this.takeDamage(effectiveBurn, DamageType.MAGIC, null, true);
            }
        }

        int totalPoisonFlat = getStatFlatBonus(StatType.POISON);
        if (totalPoisonFlat > 0) {
            double totalPoisonMult = Math.max(0, getStatBuffMultiplier(StatType.POISON));
            int effectivePoison = (int) Math.round(totalPoisonFlat * totalPoisonMult);
            if (effectivePoison > 0) {
                System.out.println("☠️ " + this.name + " subit " + effectivePoison + " dégâts de Poison !");
                this.takeDamage(effectivePoison, DamageType.BRUT);
            }
        }

        Iterator<BuffDebuffEffect> iterator = activeBuffs.iterator();
        while (iterator.hasNext()) {
            BuffDebuffEffect effect = iterator.next();

            effect.setDuration(effect.getDuration() - 1);
            if (effect.getDuration() <= 0) {
                iterator.remove();
                System.out.println(name + " perd l'effet sur " + effect.getStatAffected());
            }
        }
        updateShields();
    }

    public void addShield(int amount, int duration, String sourceName) {
        if (activeShields == null) {
            activeShields = new ArrayList<>();
        }
        double multiplier = getStatBuffMultiplier(StatType.SHIELD_RECEIVED);
        int finalAmount = (int) (amount * Math.max(0, multiplier));
        activeShields.add(new ActiveShield(finalAmount, duration, sourceName));
        System.out.println(name + " reçoit un bouclier de " + finalAmount + " (multiplier bouclier reçu: " + multiplier
                + ") pour " + duration + " tours (" + sourceName + ").");
    }

    public void updateShields() {
        if (activeShields == null)
            return;
        Iterator<ActiveShield> iterator = activeShields.iterator();
        while (iterator.hasNext()) {
            ActiveShield shield = iterator.next();
            shield.setDuration(shield.getDuration() - 1);
            if (shield.getDuration() <= 0 || shield.getAmount() <= 0) {
                iterator.remove();
                System.out.println(name + " perd l'effet de bouclier (" + shield.getSourceName() + ").");
            }
        }
    }

    public int getTotalShield() {
        if (activeShields == null)
            return 0;
        return activeShields.stream().mapToInt(shield -> shield != null ? shield.getAmount() : 0)
                .sum();
    }

    public void addConsumableSpellBuff(ConsumableSpellBuffDebuffEffect buff) {
        consumableSpellBuffs.add(buff);
        System.out.println(this.name + " reçoit un buff consommable pour " + buff.getRemainingApplications()
                + " prochain(s) sort(s).");
    }

    /**
     * Retire tous les buffs/débuffs actifs de ce personnage.
     * Vous pouvez ici rétablir les statistiques si nécessaire.
     */
    public void clearBuffs() {
        // Optionnel : rétablir les statistiques en inversant les effets appliqués
        activeBuffs.clear();
        System.out.println(name + " a été purifié de tous les buffs/débuffs.");
    }

    public void cancelChanneling() {
        this.remainingChannelingTurns = 0;
        this.channeledSpell = null;
        this.channelingTarget = null;
        this.channelingAlly = null;
        this.channelingChoiceKey = null;
    }

    public void resetCombatState() {
        this.purgeAllBuffsAndDebuffs();
        this.cancelChanneling();
        this.banalSpellCastThisTurn = false;
        this.instantSpellCastThisTurn = false;
        System.out.println(name + " a réinitialisé son état de combat.");
    }

    /**
     * Déclenche la logique d'un sort gratuit.
     * Ici, vous pouvez simplement afficher un message ou définir un flag pour qu'un
     * sort gratuit soit traité ensuite.
     */
    public void triggerFreeSpell() {
        // Exemple simple : affichage et/ou flag à gérer par votre logique de jeu
        System.out.println(name + " déclenche un sort gratuit !");
        // Vous pouvez par exemple stocker un flag ou appeler directement un service de
        // free spell
    }

    public double getStatBuffMultiplier(StatType statType) {
        double totalModifier = activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() == 0)
                .mapToDouble(buff -> buff.getModifier())
                .sum();

        if (statType == StatType.DAMAGE_GIVEN_PHYSIC) {
            boolean hasAmeDetachee = activeBuffs.stream().anyMatch(b -> b.getStatAffected() == StatType.AME_DETACHEE);
            if (hasAmeDetachee) {
                totalModifier += 0.40;
            }
        }

        return 1.0 + totalModifier;
    }

    public int getStatFlatBonus(StatType statType) {
        int buffBonus = activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() != 0)
                .mapToInt(buff -> buff.getFlatValue())
                .sum();

        if (statType == StatType.DAMAGE_GIVEN_PHYSIC) {
            boolean hasAmeDetachee = activeBuffs.stream().anyMatch(b -> b.getStatAffected() == StatType.AME_DETACHEE);
            if (hasAmeDetachee) {
                buffBonus += 5;
            }
        }
        int passiveBonus = getPassiveState("stat_flat_" + statType.name(), 0);

        int equipmentBonus = 0;
        if (this.equipments != null) {
            for (generation.grimoire.entity.Equipment eq : this.equipments) {
                switch (statType) {
                    case HEALTH -> equipmentBonus += eq.getBonusHealthMax();
                    case MANA -> equipmentBonus += eq.getBonusManaMax();
                    case POWER -> equipmentBonus += eq.getBonusPower();
                    case STRENGTH -> equipmentBonus += eq.getBonusStrength();
                    case ARMURE -> equipmentBonus += eq.getBonusArmor();
                    case RESISTANCE -> equipmentBonus += eq.getBonusResistance();
                    case SPEED -> equipmentBonus += eq.getBonusSpeed();
                    case CRIT -> equipmentBonus += eq.getBonusCrit();
                    default -> {
                    }
                }
            }
        }

        int totalBonus = buffBonus + passiveBonus + equipmentBonus;

        if (this.voie != null && this.voie.getPassiveEffects() != null) {
            for (generation.grimoire.entity.voie.passif.VoiePassiveEffect p : this.voie.getPassiveEffects()) {
                totalBonus = p.adjustFlatBonus(this, statType, totalBonus);
            }
        }
        if (this.spiritualite != null && this.spiritualite.getPassiveEffects() != null) {
            for (generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect p : this.spiritualite
                    .getPassiveEffects()) {
                totalBonus = p.adjustFlatBonus(this, statType, totalBonus);
            }
        }

        return totalBonus;
    }

    public int getEffectiveStat(StatType statType) {
        int base = 0;
        switch (statType) {
            case POWER -> base = this.power;
            case STRENGTH -> base = this.strength;
            case ARMURE -> base = this.armor;
            case RESISTANCE -> base = this.resistance;
            case SPEED -> base = this.speed;
            case CRIT -> base = this.crit;
            default -> base = 0;
        }
        double effective = base + getStatFlatBonus(statType);
        effective *= Math.max(0, getStatBuffMultiplier(statType));
        return (int) Math.round(effective);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalPower")
    public int getTotalPower() {
        return getEffectiveStat(StatType.POWER);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalStrength")
    public int getTotalStrength() {
        return getEffectiveStat(StatType.STRENGTH);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalArmor")
    public int getTotalArmor() {
        return getEffectiveStat(StatType.ARMURE);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalResistance")
    public int getTotalResistance() {
        return getEffectiveStat(StatType.RESISTANCE);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalCrit")
    public int getTotalCrit() {
        return getEffectiveStat(StatType.CRIT);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalSpeed")
    public int getTotalSpeed() {
        return getEffectiveStat(StatType.SPEED);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalRegenHp")
    public int getTotalRegenHp() {
        int totalHpRegen = this.regenHp;
        if (this.equipments != null) {
            for (generation.grimoire.entity.Equipment eq : this.equipments) {
                totalHpRegen += eq.getRegenHealthPerTurn();
            }
        }
        return totalHpRegen;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("totalRegenMana")
    public int getTotalRegenMana() {
        int totalManaRegen = this.regenMana;
        if (this.equipments != null) {
            for (generation.grimoire.entity.Equipment eq : this.equipments) {
                totalManaRegen += eq.getRegenManaPerTurn();
            }
        }
        int cursedManaDrain = getSpecialEffectValue(
                generation.grimoire.enumeration.EquipmentEffectType.CURSED_MANA_DRAIN);
        if (cursedManaDrain != 0) {
            totalManaRegen -= Math.abs(cursedManaDrain);
        }
        return totalManaRegen;
    }

    public boolean isAlly(Personnage other) {
        if (other == null)
            return false;
        // Objects.equals gère le null-safe
        return java.util.Objects.equals(this.teamId, other.teamId);
    }

    /**
     * Vérifie si ce personnage peut lancer le sort donné en fonction de sa voie,
     * sa spiritualité et ses niveaux respectifs.
     * <ul>
     * <li>Si le sort nécessite une voie, le personnage doit avoir la même voie et
     * un niveau ≥ au niveau du sort.</li>
     * <li>Si le sort nécessite une spiritualité, le personnage doit avoir la même
     * spiritualité et un niveau ≥ au niveau du sort.</li>
     * <li>Si le sort nécessite les deux, les deux conditions doivent être
     * satisfaites.</li>
     * </ul>
     *
     * @param spell le sort à vérifier
     * @return un message d'erreur si le lancement est interdit, ou null si autorisé
     */
    public String canCast(generation.grimoire.entity.Spell spell) {
        boolean hasVoieReq = spell.getVoie() != null;
        boolean hasSpiritReq = spell.getSpiritualite() != null;

        if (hasVoieReq) {
            boolean idMatch = this.voie != null && this.voie.getId() != null && spell.getVoie().getId() != null
                    && this.voie.getId().equals(spell.getVoie().getId());
            boolean nameMatch = this.voie != null && this.voie.getId() == null && spell.getVoie().getId() == null
                    && this.voie.getNom() != null && this.voie.getNom().equals(spell.getVoie().getNom());
            if (this.voie == null || (!idMatch && !nameMatch)) {
                return this.name + " n'a pas la " + spell.getVoie().getNom() + " requise pour lancer " + spell.getNom()
                        + ".";
            }
            if (this.getVoieLevel() < spell.getNiveau()) {
                return this.name + " a besoin de " + spell.getVoie().getNom() + " niveau " + spell.getNiveau()
                        + " (actuel: " + this.getVoieLevel() + ") pour lancer " + spell.getNom() + ".";
            }
        }

        if (hasSpiritReq) {
            boolean idMatch = this.spiritualite != null && this.spiritualite.getId() != null
                    && spell.getSpiritualite().getId() != null
                    && this.spiritualite.getId().equals(spell.getSpiritualite().getId());
            boolean nameMatch = this.spiritualite != null && this.spiritualite.getId() == null
                    && spell.getSpiritualite().getId() == null && this.spiritualite.getNom() != null
                    && this.spiritualite.getNom().equals(spell.getSpiritualite().getNom());
            if (this.spiritualite == null || (!idMatch && !nameMatch)) {
                return this.name + " n'a pas la spiritualité " + spell.getSpiritualite().getNom()
                        + " requise pour lancer " + spell.getNom() + ".";
            }
            if (this.getSpiritualiteLevel() < spell.getNiveau()) {
                return this.name + " a besoin de " + spell.getSpiritualite().getNom() + " niveau " + spell.getNiveau()
                        + " (actuel: " + this.getSpiritualiteLevel() + ") pour lancer " + spell.getNom() + ".";
            }
        }

        // Si le sort n'a ni Voie ni Spiritualité, c'est un sort générique.
        // Si le personnage A une Voie ou une Spiritualité, on interdit l'accès aux
        // sorts génériques
        // pour respecter strictement "accès QU'AUX sorts de la voie de la raison" sauf
        // "attaque basic"
        if (!hasVoieReq && !hasSpiritReq) {
            if (spell.getMutation() != null)
                return null; // Sort de mutation → toujours autorisé
            if (this.voie != null || this.spiritualite != null) {
                // Sauf exceptions explicites si besoin, mais le prompt disait "uniquement les
                // sorts de sa voie"
                // On va l'interdire SAUF si le nom du sort est l'attaque de base (pour la
                // sécurité).
                if (spell.getNom() != null && spell.getNom().toLowerCase().contains("base")) {
                    return null;
                }
                return this.name + " ne peut pas lancer de sorts génériques sans affinité.";
            }
        }

        return null; // Lancement autorisé
    }

    /** Alias pour la lisibilité dans les passifs. */
    public int getCurrentHp() {
        return healthCurrent;
    }

    /** Alias pour la lisibilité dans les passifs. */
    public int getMaxHp() {
        return getHealthMax();
    }

    public int getBaseHealthMax() {
        return this.healthMax;
    }

    public int getHealthMax() {
        int base = this.healthMax;
        double effective = base + getStatFlatBonus(StatType.HEALTH);
        effective *= Math.max(0, getStatBuffMultiplier(StatType.HEALTH));
        return (int) Math.round(effective);
    }

    public int getHealthCurrent() {
        return Math.min(this.healthCurrent, getHealthMax());
    }

    /**
     * Retourne vrai si le personnage est actuellement sous l'effet d'au moins un
     * débuff
     * (flat ou modificateur négatif/réduit, vulnérabilités, ou DoTs actifs).
     */
    public boolean hasDebuff() {
        if (activeDamageOverTimeEffects != null) {
            for (DamageOverTimeEffect effect : activeDamageOverTimeEffects) {
                if (!Boolean.TRUE.equals(effect.getPoison()) && !Boolean.TRUE.equals(effect.getBurn())) {
                    return true;
                }
            }
        }
        if (activeBuffs != null) {
            for (BuffDebuffEffect b : activeBuffs) {
                StatType stat = b.getStatAffected();
                if (stat != null) {
                    if (stat == StatType.POISON || stat == StatType.BURN) {
                        continue;
                    }
                    if (stat == StatType.DAMAGE_TAKEN_MAGIC ||
                            stat == StatType.DAMAGE_TAKEN_PHYSIC ||
                            stat == StatType.DAMAGE_TAKEN_BRUT ||
                            stat == StatType.SHIELD_PIERCED) {
                        if (b.getFlatValue() > 0 || (b.getFlatValue() == 0 && b.getModifier() > 0.0)) {
                            return true;
                        }
                    } else {
                        if (b.getFlatValue() < 0 || (b.getFlatValue() == 0 && b.getModifier() < 0.0)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    public void applyFlatBuff(StatType statType, int flatValue) {
        switch (statType) {
            case HEALTH -> {
                if (flatValue > 0)
                    heal(flatValue);
                else
                    takeDamage(-flatValue, DamageType.BRUT);
            }
            case MANA -> {
                int before = manaCurrent;
                manaCurrent = Math.min(manaMax, Math.max(0, manaCurrent + flatValue));
                System.out.println(name + " voit sa mana passer de " + before + " à " + manaCurrent);
            }
            default -> {
                // Toutes les autres stats numériques
                adjustStat(statType, flatValue);
                System.out.println(name + " voit sa stat " + statType
                        + (flatValue >= 0 ? " augmenter de " : " diminuer de ")
                        + Math.abs(flatValue));
            }
        }
    }

    /** Méthode générique pour ajuster une stat numérique (power, armor, speed…) */
    public void adjustStat(StatType statType, int amount) {
        switch (statType) {
            case POWER -> power += amount;
            case STRENGTH -> strength += amount;
            case ARMURE -> armor += amount;
            case RESISTANCE -> resistance += amount;
            case CRIT -> crit += amount;
            case SPEED -> speed += amount;
            // ajoute ici tes autres cas si besoin
            default -> throw new IllegalArgumentException("Stat inexploitable en flat: " + statType);
        }
    }

    /**
     * Purge l'intégralité des buffs, débuffs, DoT et HoT actifs sur ce personnage.
     */
    public void purgeAllBuffsAndDebuffs() {
        activeBuffs.clear();
        consumableSpellBuffs.clear();
        activeHealOverTimeEffects.clear();
        activeDamageOverTimeEffects.clear();
        activeManaOverTimeEffects.clear();
        activeHeatOverTimeEffects.clear();
        System.out.println(name + " est purifié de tous ses bonus et malus !");
    }

    public void setVoie(Voie voie) {
        this.voie = voie;
        int max = getManaMax();
        if (this.manaMax > max) {
            this.manaMax = max;
        }
        if (this.manaCurrent > max) {
            this.manaCurrent = max;
        }
    }

    public void setManaMax(int manaMax) {
        this.manaMax = manaMax;
        int max = getManaMax();
        if (this.manaMax > max) {
            this.manaMax = max;
        }
        if (this.manaCurrent > this.manaMax) {
            this.manaCurrent = this.manaMax;
        }
    }

    public void setManaCurrent(int manaCurrent) {
        int max = getManaMax();
        this.manaCurrent = Math.max(0, Math.min(manaCurrent, max));
    }

    public int getBaseManaMax() {
        return this.manaMax;
    }

    public int getManaMax() {
        int max = this.manaMax;
        if (this.voie != null && this.voie.getPassiveEffects() != null) {
            for (generation.grimoire.entity.voie.passif.VoiePassiveEffect p : this.voie.getPassiveEffects()) {
                max = p.adjustMaxMana(this, max);
            }
        }
        if (this.spiritualite != null && this.spiritualite.getPassiveEffects() != null) {
            for (generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect p : this.spiritualite
                    .getPassiveEffects()) {
                max = p.adjustMaxMana(this, max);
            }
        }
        double effective = max + getStatFlatBonus(StatType.MANA);
        effective *= Math.max(0, getStatBuffMultiplier(StatType.MANA));
        return (int) Math.round(effective);
    }

    public int getManaCurrent() {
        int max = getManaMax();
        return Math.max(0, Math.min(this.manaCurrent, max));
    }

    public void dealDamage(Personnage target, int baseDamage, DamageType type) {
        double multiplier = 1.0;
        int flatBonus = 0;

        if (type == DamageType.PHYSIC) {
            multiplier = Math.max(0.0, getStatBuffMultiplier(StatType.DAMAGE_GIVEN_PHYSIC));
            flatBonus = getStatFlatBonus(StatType.DAMAGE_GIVEN_PHYSIC);
        } else if (type == DamageType.MAGIC) {
            multiplier = Math.max(0.0, getStatBuffMultiplier(StatType.DAMAGE_GIVEN_MAGIC));
            flatBonus = getStatFlatBonus(StatType.DAMAGE_GIVEN_MAGIC);
        } else if (type == DamageType.BRUT) {
            multiplier = Math.max(0.0, getStatBuffMultiplier(StatType.DAMAGE_GIVEN_BRUT));
            flatBonus = getStatFlatBonus(StatType.DAMAGE_GIVEN_BRUT);
        }

        baseDamage = (int) (baseDamage * multiplier) + flatBonus;
        if (baseDamage < 0) {
            baseDamage = 0;
        }

        if (this.monsterType == generation.grimoire.enumeration.MonsterType.HYBRIDE && type != DamageType.BRUT) {
            int total = (int) (baseDamage * 1.2);
            target.takeDamage(total / 2, DamageType.PHYSIC, this);
            target.takeDamage(total - (total / 2), DamageType.MAGIC, this);
            baseDamage = total;
        } else {
            target.takeDamage(baseDamage, type, this);
        }

        if (this.monsterType == generation.grimoire.enumeration.MonsterType.DEMON) {
            int brutDmg = (int) Math.ceil(baseDamage * 0.10);
            if (brutDmg > 0) {
                target.takeDamage(brutDmg, DamageType.BRUT, this);
                System.out.println(
                        "🔥 " + this.getName() + " inflige " + brutDmg + " dégâts bruts supplémentaires (Démon).");
            }
        }

        if (this.monsterType == generation.grimoire.enumeration.MonsterType.VAMPIRE) {
            int healAmount = (int) Math.ceil(baseDamage * 0.20);
            if (healAmount > 0) {
                this.setHealthCurrent(Math.min(this.getHealthMax(), this.getHealthCurrent() + healAmount));
                System.out.println("🧛 " + this.getName() + " vole " + healAmount + " PV (Vampire).");
            }
        }

        if (this.monsterType == generation.grimoire.enumeration.MonsterType.ECTOPLASME) {
            generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
            eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
            eff.setFlatValue(-5);
            eff.setDuration(3);
            target.getActiveBuffs().add(eff);
            System.out.println("👻 " + target.getName() + " perd 5 Résistance Magique pour 3 tours ! (Ectoplasme)");
        }
    }

}
