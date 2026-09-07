package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.SpiritualitePassiveEffect;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.event.GameEvent;
import generation.grimoire.event.SpellCostAdjustEvent;
import generation.grimoire.event.SpellCostPaidEvent;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@Entity
@DiscriminatorValue("KARMA_PASSIVE")
public class KarmaPassiveEffect extends SpiritualitePassiveEffect {

    @Override
    public void onEvent(GameEvent event) {
        super.onEvent(event);

        if (event instanceof SpellCostAdjustEvent e) {
            Personnage caster = e.getSource();
            if (caster.getPassiveState("karma_locked", 0) == 1)
                return;

            int gauge = caster.getPassiveState("karma_gauge", 0);
            
            boolean willPopLight = false;
            if (gauge >= 3 && e.getSpell().getSpiritualite() != null && this.getSpiritualite() != null
                    && e.getSpell().getSpiritualite().getId().equals(this.getSpiritualite().getId())) {
                if (e.getSpell().getKarmaAlignment() == KarmaAlignment.PROTECTIVE) {
                    willPopLight = true;
                }
            }

            if (willPopLight) {
                e.getCosts()[0] = 0;
                e.getCosts()[1] = 0;
                e.getCosts()[2] = 0;
                System.out.println("✨ Esprit Karmique (Illumination imminente) : Le sort est gratuit !");
            } else if (gauge > 0) { // Esprit state
                double reduction = gauge * 0.05; // 5% par niveau, max 15% (gauge=3)
                e.getCosts()[0] = (int) (e.getCosts()[0] * (1.0 - reduction));
                e.getCosts()[1] = (int) (e.getCosts()[1] * (1.0 - reduction));
                e.getCosts()[2] = (int) (e.getCosts()[2] * (1.0 - reduction));
                System.out.println("✨ Esprit Karmique : -" + (int) (reduction * 100) + "% sur le coût du sort !");
            }
        } else if (event instanceof SpellCostPaidEvent e) {
            Personnage caster = e.getSource();
            Spell spell = e.getSpell();

            // 1. Bonus globaux pour tous les sorts
            if (caster.getPassiveState("karma_locked", 0) == 0) {
                int gauge = caster.getPassiveState("karma_gauge", 0);
                if (gauge == 0) {
                    // Harmonie state
                    int healBonus = (int) (caster.getHealthMax() * 0.02);
                    int manaBonus = (int) (caster.getManaMax() * 0.02);
                    caster.heal(healBonus);
                    caster.restoreMana(manaBonus);
                    System.out.println("✨ Harmonie Karmique : " + caster.getName() + " restaure " + healBonus
                            + " PV et " + manaBonus + " Mana.");
                } else if (gauge < 0) {
                    // Ténèbres state
                    double dmgBonus = Math.abs(gauge) * 0.05; // 5% par niveau
                    for (generation.grimoire.entity.SpellEffect eff : spell.getEffects()) {
                        if (eff instanceof generation.grimoire.entity.spell.type.effect.DamageEffect de) {
                            if (de.getDamageType() == generation.grimoire.enumeration.DamageType.PHYSIC
                                    || de.getDamageType() == generation.grimoire.enumeration.DamageType.MAGIC) {
                                de.setAmplificationMultiplier(de.getAmplificationMultiplier() * (1.0 + dmgBonus));
                            }
                        }
                    }
                    System.out.println("✨ Ténèbres Karmiques : +" + (int) (dmgBonus * 100)
                            + "% de dégâts (Phy/Mag) sur ce sort !");
                }
            }

            // 2. Mise à jour de la jauge (Uniquement pour les sorts Karma)
            if (spell.getSpiritualite() == null || this.getSpiritualite() == null
                    || !spell.getSpiritualite().getId().equals(this.getSpiritualite().getId())) {
                return;
            }

            boolean isOffensive = spell.getKarmaAlignment() == KarmaAlignment.OFFENSIVE;
            boolean isProtective = spell.getKarmaAlignment() == KarmaAlignment.PROTECTIVE;
            boolean isRestorative = spell.getKarmaAlignment() == KarmaAlignment.RESTORATIVE;

            if (caster.getPassiveState("karma_locked", 0) == 1) {
                if (isRestorative) {
                    int lockedDuration = caster.getPassiveState("karma_locked_duration", 0);
                    lockedDuration--;
                    if (lockedDuration <= 0) {
                        System.out.println(
                                "✨ Le Karma de " + caster.getName() + " est rétabli par un sort d'Harmonie !");
                        caster.setPassiveState("karma_locked", 0);
                        caster.setPassiveState("karma_gauge", 0);
                        caster.setPassiveState("karma_locked_duration", 0);
                    } else {
                        System.out.println("⏳ Le Karma de " + caster.getName() + " s'apaise. Tours restants : "
                                + lockedDuration);
                        caster.setPassiveState("karma_locked_duration", lockedDuration);
                    }
                }
                return;
            }

            int gauge = caster.getPassiveState("karma_gauge", 0);

            if (isOffensive) {
                gauge--;
                System.out.println("🌑 Le Karma penche vers les Ténèbres (Bonus dégats). Jauge: " + gauge);
            } else if (isProtective) {
                gauge++;
                System.out.println("🌕 Le Karma penche vers l'Esprit (Coût réduit). Jauge: " + gauge);
            } else if (isRestorative) {
                if (gauge > 0) {
                    gauge--;
                    System.out.println("🌗 Le Karma se rééquilibre vers l'Ombre. Jauge: " + gauge);
                } else if (gauge < 0) {
                    gauge++;
                    System.out.println("🌗 Le Karma se rééquilibre vers la Lumière. Jauge: " + gauge);
                } else {
                    System.out.println("🌗 Acte de rééquilibrage, le Karma est déjà neutre. Jauge: " + gauge);
                }
            }

            if (gauge <= -4 || gauge >= 4) {
                if (gauge <= -4) {
                    System.out.println(
                            "💥 Le Karma est corrompu par les ténèbres. La voie du Karma est verrouillée pour 6 tours (+50% de dégâts sur ce sort) !");
                    for (generation.grimoire.entity.SpellEffect eff : spell.getEffects()) {
                        if (eff instanceof generation.grimoire.entity.spell.type.effect.DamageEffect de) {
                            if (de.getDamageType() == generation.grimoire.enumeration.DamageType.PHYSIC
                                    || de.getDamageType() == generation.grimoire.enumeration.DamageType.MAGIC) {
                                de.setAmplificationMultiplier(de.getAmplificationMultiplier() * 1.5);
                                System.out.println(
                                        "✨ Amplification appliquée : +50% de dégâts (" + de.getDamageType() + ")");
                            }
                        }
                    }
                } else {
                    System.out.println(
                            "💥 Le Karma est aveuglé par la lumière. La voie du Karma est verrouillée pour 6 tours (Ce sort a été gratuit) !");

                    generation.grimoire.entity.spell.type.effect.BuffDebuffEffect armorBuff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                    armorBuff.setStatAffected(generation.grimoire.enumeration.StatType.ARMURE);
                    armorBuff.setDuration(3);
                    armorBuff.setEffectTarget(generation.grimoire.enumeration.EffectTarget.CASTER);

                    generation.grimoire.entity.spell.type.effect.BuffDebuffEffect resBuff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                    resBuff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                    resBuff.setDuration(3);
                    resBuff.setEffectTarget(generation.grimoire.enumeration.EffectTarget.CASTER);

                    caster.applyBuff(armorBuff, 0.20);
                    caster.applyBuff(resBuff, 0.20);
                }
                caster.setPassiveState("karma_locked", 1);
                caster.setPassiveState("karma_locked_duration", 6);
                caster.setPassiveState("karma_harmony", 0);
            } else {
                caster.setPassiveState("karma_gauge", gauge);
                if (gauge == 0) {
                    System.out.println("✨ Équilibre Karmique Parfait atteint ! (karma_harmony = 1)");
                    caster.setPassiveState("karma_harmony", 1);
                } else {
                    caster.setPassiveState("karma_harmony", 0);
                }
            }
        }
    }

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // La logique a été déplacée dans onEvent (SpellCostPaidEvent) pour s'appliquer
        // avant les dégâts
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        if (personnage.getPassiveState("karma_locked", 0) == 1) {
            int lockedDuration = personnage.getPassiveState("karma_locked_duration", 0);
            lockedDuration--;
            if (lockedDuration <= 0) {
                System.out.println(
                        "✨ Le Karma de " + personnage.getName() + " s'est dissipé et est maintenant rétabli !");
                personnage.setPassiveState("karma_locked", 0);
                personnage.setPassiveState("karma_gauge", 0);
                personnage.setPassiveState("karma_locked_duration", 0);
            } else {
                personnage.setPassiveState("karma_locked_duration", lockedDuration);
            }
        } else {
            int gauge = personnage.getPassiveState("karma_gauge", 0);
            if (gauge == 0) {
                System.out.println("⚖️ " + personnage.getName() + " est en parfaite harmonie karmique.");
            }
        }
    }

    @Override
    public boolean canCastSpell(Personnage caster, Spell spell) {
        if (spell.getSpiritualite() != null && this.getSpiritualite() != null) {
            boolean sameId = spell.getSpiritualite().getId() != null && this.getSpiritualite().getId() != null
                    && spell.getSpiritualite().getId().equals(this.getSpiritualite().getId());
            boolean sameName = spell.getSpiritualite().getNom() != null && this.getSpiritualite().getNom() != null
                    && spell.getSpiritualite().getNom().equals(this.getSpiritualite().getNom());

            if (sameId || sameName) {
                if (caster.getPassiveState("karma_locked", 0) == 1) {
                    if (spell.getKarmaAlignment() != generation.grimoire.enumeration.KarmaAlignment.RESTORATIVE
                            && (spell.getNom() == null || !spell.getNom().toLowerCase().contains("harmonie"))) {
                        System.out.println("🚫 " + caster.getName()
                                + " ne peut plus lancer de sorts du Karma (Voie verrouillée par Corruption/Illumination).");
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
