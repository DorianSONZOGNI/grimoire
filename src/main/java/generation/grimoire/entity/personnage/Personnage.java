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
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.ArrayList;

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
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "channelingTarget", "channelingAlly" })
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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "channeled_spell_id")
    @com.fasterxml.jackson.annotation.JsonProperty("channeledSpell")
    private Spell channeledSpell;
    
    @com.fasterxml.jackson.annotation.JsonProperty("channeledSpellId")
    public Long getChanneledSpellId() {
        return channeledSpell != null ? channeledSpell.getId() : null;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channeling_target_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Personnage channelingTarget;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channeling_ally_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Personnage channelingAlly;

    @Column(name = "channeling_choice_key")
    private Integer channelingChoiceKey;

    public void startTurn() {
        PersonnageCombatHelper.startTurn(this);
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
        PersonnageCombatHelper.takeDamage(this, damage, damageType, caster, isBurn);
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
        PersonnageCombatHelper.heal(this, healAmount);
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
        PersonnageCombatHelper.updateHealOverTimeEffects(this);
    }

    public void addManaOverTimeEffect(ManaOverTimeEffect effect) {
        activeManaOverTimeEffects.add(effect);
    }

    public void updateManaOverTimeEffects() {
        PersonnageCombatHelper.updateManaOverTimeEffects(this);
    }

    public void addDamageOverTimeEffect(DamageOverTimeEffect effect) {
        activeDamageOverTimeEffects.add(effect);
    }

    public void updateDamageOverTimeEffects() {
        PersonnageCombatHelper.updateDamageOverTimeEffects(this);
    }

    public void addHeatOverTimeEffect(generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect effect) {
        activeHeatOverTimeEffects.add(effect);
    }

    public void updateHeatOverTimeEffects() {
        PersonnageCombatHelper.updateHeatOverTimeEffects(this);
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
        PersonnageCombatHelper.updateBuffs(this);
    }

    public void addShield(int amount, int duration, String sourceName) {
        if (activeShields == null) {
            activeShields = new ArrayList<>();
        }
        double multiplier = getStatBuffMultiplier(StatType.SHIELD_RECEIVED);
        int finalAmount = (int) (amount * Math.max(0, multiplier));
        activeShields.add(new ActiveShield(finalAmount, duration, sourceName));
        System.out.println(name + " reçoit un bouclier de " + finalAmount + " pour " + duration + " tours (" + sourceName + ").");
    }

    public void updateShields() {
        PersonnageCombatHelper.updateShields(this);
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
        return PersonnageCombatHelper.getStatBuffMultiplier(this, statType);
    }

    public int getStatFlatBonus(StatType statType) {
        return PersonnageCombatHelper.getStatFlatBonus(this, statType);
    }

    public int getEffectiveStat(StatType statType) {
        return PersonnageCombatHelper.getEffectiveStat(this, statType);
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
        PersonnageCombatHelper.dealDamage(this, target, baseDamage, type);
    }

}
