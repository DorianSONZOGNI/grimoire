package generation.grimoire.entity.personnage;

import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.spell.type.effect.BuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
import generation.grimoire.entity.spell.type.effect.DamageOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.HealOverTimeEffect;
import generation.grimoire.entity.spell.type.effect.ManaOverTimeEffect;
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
    private int armor;
    private int resistance;
    private int crit;
    private int speed;

    @ManyToOne
    @JoinColumn(name = "voie_id", nullable = true)
    private Voie voie;

    @ManyToOne
    @JoinColumn(name = "spiritualite_id", nullable = true)
    private Spiritualite spiritualite;

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
                System.out.println(name + " continue de canaliser (tours restants : " + remainingChannelingTurns + ").");
            }
        }
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
                yield effectiveResistance * Math.max(0, getStatBuffMultiplier(StatType.RESISTANCE));
            }
            default -> {
                constant = 100;
                yield 0;
            }
        };

        // Calcul du facteur de réduction des dégâts (valeur entre 0 et 1)
        double reductionFactor = resistanceValue / (resistanceValue + constant);

        // NOTE : si de multiples buffs sont donnés, cela fonctionne (buff phy, buff mag).
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

        // S'assurer que les dégâts sont toujours au moins 1
        int effectiveDamage = (int) finalDamage;

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

        // Rétrocompatibilité avec les debuffs négatifs de SHIELD_PENETRATION sur la cible
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
        int targetPiercedFlatCombined = targetPiercedFlat + (targetPenetrationFlatDebuff < 0 ? -targetPenetrationFlatDebuff : 0);

        int totalBypassFlat = casterPenetrationFlat + targetPiercedFlatCombined;



        // Calculer le montant qui passe en dessous du bouclier
        int bypassDamage = 0;
        if (totalBypassPct > 0 || totalBypassFlat > 0) {
            double rawBypass = effectiveDamage * Math.min(1.0, totalBypassPct) + totalBypassFlat;
            bypassDamage = (int) Math.min(effectiveDamage, Math.max(0, rawBypass));
        }

        int remainingDamage = effectiveDamage - bypassDamage;
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

                            System.out.println("🛡️ Le bouclier (" + shield.getSourceName() + ") absorbe " + absorbed + " dégâts (dégâts bruts consommés : " + rawConsumedInt + "). Reste : " + shield.getAmount() + " absorption.");
                            if (remainingDamage <= 0) {
                                remainingDamage = 0;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Appliquer les dégâts finaux (bypass + dégâts non absorbés par le bouclier) à la santé actuelle
        int totalDamageToHealth = bypassDamage + remainingDamage;
        this.healthCurrent -= totalDamageToHealth;

        // Affichage des informations
        if (bypassDamage > 0) {
            System.out.println("🛡️ Perce-Bouclier / Bouclier Percé : " + bypassDamage + " dégâts passent en dessous du bouclier.");
        }

        // Affichage des informations
        double finalReductionFactor = Math.min(reductionFactor, 0.90); // Limite la réduction à 90%
        System.out.println(this.name + " subit " + effectiveDamage + " dégâts (" +
                "absorbés par les boucliers : " + absorbedByShields + ", " +
                "réduction de " + (int) (finalReductionFactor * 100) + "%), " +
                "PV restants : " + this.healthCurrent);

        // Affichage pour le débogage
        System.out.println("reductionFactor : " + reductionFactor);
        System.out.println("damageTakenMultiplier : " + damageTakenMultiplier);
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
        if (this.healthCurrent > this.healthMax) {
            this.healthCurrent = this.healthMax;
        }
        System.out.println(name + " est soigné de " + finalHeal + " points (multiplier soin reçu: " + multiplier + "). Vie actuelle : " + healthCurrent);
    }

    public void restoreMana(int manaAmount) {
        this.manaCurrent += manaAmount;
        if (this.manaCurrent > this.manaMax) {
            this.manaCurrent = this.manaMax;
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
        Iterator<generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect> iterator = activeHeatOverTimeEffects.iterator();
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
        System.out.println(name + " reçoit un bouclier de " + finalAmount + " (multiplier bouclier reçu: " + multiplier + ") pour " + duration + " tours (" + sourceName + ").");
    }

    public void updateShields() {
        if (activeShields == null) return;
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
        if (activeShields == null) return 0;
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
        return activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() == 0)
                .map(BuffDebuffEffect::getModifier)
                .reduce(1.0, (a, b) -> a * b);
    }

    public int getStatFlatBonus(StatType statType) {
        int buffBonus = activeBuffs.stream()
                .filter(buff -> buff.affectsStatType(statType) && buff.getFlatValue() != 0)
                .mapToInt(BuffDebuffEffect::getFlatValue)
                .sum();
        int passiveBonus = getPassiveState("stat_flat_" + statType.name(), 0);

        if (statType == StatType.CRIT) {
            int speedRatio = getPassiveState("stat_derive_CRIT_from_SPEED", 0);
            if (speedRatio != 0) {
                // To prevent infinite recursion if SPEED derived from CRIT, we only do one
                // level
                int effectiveSpeed = this.speed + activeBuffs.stream()
                        .filter(buff -> buff.affectsStatType(StatType.SPEED) && buff.getFlatValue() != 0)
                        .mapToInt(BuffDebuffEffect::getFlatValue)
                        .sum()
                        + getPassiveState("stat_flat_SPEED", 0);
                passiveBonus += effectiveSpeed * speedRatio;
            }
        }

        return buffBonus + passiveBonus;
    }

    public boolean isAlly(Personnage other) {
        if (other == null)
            return false;
        // Objects.equals gère le null-safe
        return java.util.Objects.equals(this.teamId, other.teamId);
    }

    /** Alias pour la lisibilité dans les passifs. */
    public int getCurrentHp() {
        return healthCurrent;
    }

    /** Alias pour la lisibilité dans les passifs. */
    public int getMaxHp() {
        return healthMax;
    }

    /**
     * Retourne vrai si le personnage est actuellement sous l'effet d'au moins un
     * débuff
     * (buff dont la valeur est négative ou modificateur < 1.0).
     */
    public boolean hasDebuff() {
        return activeBuffs.stream().anyMatch(b -> (b.getFlatValue() != 0 && b.getFlatValue() < 0) ||
                (b.getFlatValue() == 0 && b.getModifier() < 1.0));
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

}
