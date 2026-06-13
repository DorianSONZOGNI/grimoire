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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "Personnage")
public class Personnage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String teamId;

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

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    private int voieLevel = 1;

    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = true)
    private Spiritualite spiritualite;

    private int spiritualiteLevel = 1;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private generation.grimoire.entity.auth.AppUser user;

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
    private Spell channeledSpell;

    @Transient
    private Personnage channelingTarget;

    @Transient
    private Integer channelingChoiceKey;

    public void startTurn() {
        this.instantSpellCastThisTurn = false;
        this.banalSpellCastThisTurn = false;
        if (this.remainingChannelingTurns > 0) {
            this.remainingChannelingTurns--;
            if (this.remainingChannelingTurns == 0) {
                this.allowInstantDuringCurrentChanneling = true;
                this.channeledSpell = null;
                this.channelingTarget = null;
                this.channelingChoiceKey = null;
                System.out.println(name + " a terminé sa canalisation.");
            } else {
                System.out
                        .println(name + " continue de canaliser (tours restants : " + remainingChannelingTurns + ").");
            }
        }
        
        // Effets des équipements (Régen / Drain)
        if (this.healthCurrent > 0 && this.equipments != null) {
            int totalHpRegen = 0;
            int totalManaRegen = 0;
            for (generation.grimoire.entity.Equipment eq : this.equipments) {
                totalHpRegen += eq.getRegenHealthPerTurn();
                totalManaRegen += eq.getRegenManaPerTurn();
            }
            if (totalHpRegen > 0) {
                this.heal(totalHpRegen);
            } else if (totalHpRegen < 0) {
                this.takeDamage(-totalHpRegen, generation.grimoire.enumeration.DamageType.BRUT);
            }
            if (totalManaRegen != 0) {
                this.setManaCurrent(this.manaCurrent + totalManaRegen);
            }
        }
    }

    public int getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType type) {
        if (this.equipments == null) return 0;
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

        // Récupérer le multiplicateur de vulnérabilité
        double damageTakenMultiplier = Math.max(1.0, getStatBuffMultiplier(statType));

        int flat = getStatFlatBonus(statType);

        double damageAfterBuff = damage * damageTakenMultiplier + flat;

        // Calcul des dégâts après la réduction
        double finalDamage = damageAfterBuff * (1 - reductionFactor);

        // S'assurer que les dégâts sont toujours au moins 1 si les dégâts de base étaient > 0
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
                casterPenetrationPct = caster.getStatBuffMultiplier(StatType.SHIELD_PENETRATION);
            }
        }

        double targetPiercedPct = 0.0;
        boolean hasPiercedBuff = this.getActiveBuffs().stream()
                .anyMatch(b -> b.affectsStatType(StatType.SHIELD_PIERCED) && b.getFlatValue() == 0);
        if (hasPiercedBuff) {
            targetPiercedPct = this.getStatBuffMultiplier(StatType.SHIELD_PIERCED);
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
            bypassDamage = (int) Math.min(effectiveDamage, Math.max(0, rawBypass));
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

                            System.out.println("🛡️ Le bouclier (" + shield.getSourceName() + ") absorbe " + absorbed
                                    + " dégâts (dégâts bruts consommés : " + rawConsumedInt + "). Reste : "
                                    + shield.getAmount() + " absorption.");
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
        this.healthCurrent -= totalDamageToHealth;

        // CHEAT DEATH
        if (this.healthCurrent <= 0) {
            int cheatDeathValue = getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.CHEAT_DEATH);
            if (cheatDeathValue > 0) {
                this.healthCurrent = cheatDeathValue * 5;
                System.out.println("👼 Ange Gardien activé ! Le personnage survit avec " + (cheatDeathValue * 5) + " PV.");
                // Consomme l'effet pour la session/combat
                if (this.equipments != null) {
                    for (generation.grimoire.entity.Equipment eq : this.equipments) {
                        if (eq.getSpecialEffect() == generation.grimoire.enumeration.EquipmentEffectType.CHEAT_DEATH) {
                            eq.setSpecialEffect(generation.grimoire.enumeration.EquipmentEffectType.NONE);
                            eq.setSpecialEffectValue(0);
                        }
                    }
                }
            }
        }

        // Affichage des informations
        if (bypassDamage > 0) {
            System.out.println("🛡️ Perce-Bouclier / Bouclier Percé : " + bypassDamage
                    + " dégâts passent en dessous du bouclier.");
        }

        // Affichage des informations
        double finalReductionFactor = Math.min(reductionFactor, 0.90); // Limite la réduction à 90%
        System.out.println(this.name + " subit " + effectiveDamage + " dégâts (" +
                "absorbés par les boucliers : " + absorbedByShields + ", " +
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
                int lifestealPct = caster.getSpecialEffectValue(generation.grimoire.enumeration.EquipmentEffectType.LIFESTEAL);
                if (lifestealPct > 0) {
                    int healAmount = (int) Math.ceil(totalDamageToHealth * (lifestealPct / 100.0));
                    System.out.println("🩸 Vol de vie : l'attaquant récupère " + healAmount + " PV.");
                    caster.heal(healAmount);
                }
            }
        }

        // Affichage pour le débogage
        System.out.println("reductionFactor : " + reductionFactor);
        System.out.println("damageTakenMultiplier : " + damageTakenMultiplier);
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
        int finalHeal = (int) (healAmount * Math.max(0, multiplier));
        this.healthCurrent += finalHeal;
        if (this.healthCurrent > this.getTotalHealthMax()) {
            this.healthCurrent = this.getTotalHealthMax();
        }
        System.out.println(name + " est soigné de " + finalHeal + " points (multiplier soin reçu: " + multiplier
                + "). Vie actuelle : " + healthCurrent);

        boolean removedPoison = activeBuffs.removeIf(b -> b.getStatAffected() == StatType.POISON && b.getFlatValue() > 0);
        if (removedPoison) {
            System.out.println("🌿 Le soin a purifié le Poison sur " + name + " !");
        }
    }

    public void restoreMana(int manaAmount) {
        this.manaCurrent += manaAmount;
        if (this.manaCurrent > this.getTotalManaMax()) {
            this.manaCurrent = this.getTotalManaMax();
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
        return activeShields.stream().mapToInt(ActiveShield::getAmount).sum();
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
                .mapToDouble(BuffDebuffEffect::getModifier)
                .sum();
        return 1.0 + totalModifier;
    }

    public int getStatFlatBonus(StatType statType) {
        int buffBonus = activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() != 0)
                .mapToInt(BuffDebuffEffect::getFlatValue)
                .sum();
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
                    default -> {}
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
     *   <li>Si le sort nécessite une voie, le personnage doit avoir la même voie et un niveau ≥ au niveau du sort.</li>
     *   <li>Si le sort nécessite une spiritualité, le personnage doit avoir la même spiritualité et un niveau ≥ au niveau du sort.</li>
     *   <li>Si le sort nécessite les deux, les deux conditions doivent être satisfaites.</li>
     * </ul>
     *
     * @param spell le sort à vérifier
     * @return un message d'erreur si le lancement est interdit, ou null si autorisé
     */
    public String canCast(generation.grimoire.entity.Spell spell) {
        boolean hasVoieReq = spell.getVoie() != null;
        boolean hasSpiritReq = spell.getSpiritualite() != null;

        if (hasVoieReq) {
            boolean idMatch = this.voie != null && this.voie.getId() != null && spell.getVoie().getId() != null && this.voie.getId().equals(spell.getVoie().getId());
            boolean nameMatch = this.voie != null && this.voie.getId() == null && spell.getVoie().getId() == null && this.voie.getNom() != null && this.voie.getNom().equals(spell.getVoie().getNom());
            if (this.voie == null || (!idMatch && !nameMatch)) {
                return this.name + " n'a pas la " + spell.getVoie().getNom() + " requise pour lancer " + spell.getNom() + ".";
            }
            if (this.voieLevel < spell.getNiveau()) {
                return this.name + " a besoin de " + spell.getVoie().getNom() + " niveau " + spell.getNiveau()
                        + " (actuel: " + this.voieLevel + ") pour lancer " + spell.getNom() + ".";
            }
        }

        if (hasSpiritReq) {
            boolean idMatch = this.spiritualite != null && this.spiritualite.getId() != null && spell.getSpiritualite().getId() != null && this.spiritualite.getId().equals(spell.getSpiritualite().getId());
            boolean nameMatch = this.spiritualite != null && this.spiritualite.getId() == null && spell.getSpiritualite().getId() == null && this.spiritualite.getNom() != null && this.spiritualite.getNom().equals(spell.getSpiritualite().getNom());
            if (this.spiritualite == null || (!idMatch && !nameMatch)) {
                return this.name + " n'a pas la spiritualité " + spell.getSpiritualite().getNom() + " requise pour lancer " + spell.getNom() + ".";
            }
            if (this.spiritualiteLevel < spell.getNiveau()) {
                return this.name + " a besoin de " + spell.getSpiritualite().getNom() + " niveau " + spell.getNiveau()
                        + " (actuel: " + this.spiritualiteLevel + ") pour lancer " + spell.getNom() + ".";
            }
        }

        // Si le sort n'a ni Voie ni Spiritualité, c'est un sort générique.
        // Si le personnage A une Voie ou une Spiritualité, on interdit l'accès aux sorts génériques
        // pour respecter strictement "accès QU'AUX sorts de la voie de la raison" sauf "attaque basic"
        if (!hasVoieReq && !hasSpiritReq) {
            if (this.voie != null || this.spiritualite != null) {
                // Sauf exceptions explicites si besoin, mais le prompt disait "uniquement les sorts de sa voie"
                // On va l'interdire SAUF si le nom du sort est l'attaque de base (pour la sécurité).
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
        if (activeDamageOverTimeEffects != null && !activeDamageOverTimeEffects.isEmpty()) {
            return true;
        }
        if (activeBuffs != null) {
            for (BuffDebuffEffect b : activeBuffs) {
                StatType stat = b.getStatAffected();
                if (stat != null) {
                    if (stat == StatType.DAMAGE_TAKEN_MAGIC ||
                            stat == StatType.DAMAGE_TAKEN_PHYSIC ||
                            stat == StatType.DAMAGE_TAKEN_BRUT ||
                            stat == StatType.SHIELD_PIERCED ||
                            stat == StatType.BURN ||
                            stat == StatType.POISON) {
                        if (b.getFlatValue() > 0 || (b.getFlatValue() == 0 && b.getModifier() > 1.0)) {
                            return true;
                        }
                    } else {
                        if (b.getFlatValue() < 0 || (b.getFlatValue() == 0 && b.getModifier() < 1.0)) {
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

}
