package generation.grimoire.entity.spiritualite.passif.specific;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spell.type.effect.ConsumableSpellBuffDebuffEffect;
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
            if (e.getSource().getPassiveState("karma_harmony", 0) == 1) {
                if (e.getSpell().getKarmaAlignment() == KarmaAlignment.PROTECTIVE) {
                    e.getCosts()[0] = (int)(e.getCosts()[0] * 0.8);
                    e.getCosts()[1] = (int)(e.getCosts()[1] * 0.8);
                    e.getCosts()[2] = (int)(e.getCosts()[2] * 0.8);
                    System.out.println("✨ Harmonie Karmique : -20% sur le coût du sort protecteur !");
                }
            }
        } else if (event instanceof SpellCostPaidEvent e) {
            if (e.getSource().getPassiveState("karma_harmony", 0) == 1) {
                if (e.getSpell().getKarmaAlignment() == KarmaAlignment.RESTORATIVE) {
                    Personnage caster = e.getSource();
                    int healBonus = (int)(caster.getHealthMax() * 0.05);
                    int manaBonus = (int)(caster.getManaMax() * 0.05);
                    caster.heal(healBonus);
                    caster.restoreMana(manaBonus);
                    System.out.println("✨ Harmonie Karmique : " + caster.getName() + " restaure " + healBonus + " PV et " + manaBonus + " Mana.");
                } else if (e.getSpell().getKarmaAlignment() == KarmaAlignment.OFFENSIVE) {
                    ConsumableSpellBuffDebuffEffect buff = new ConsumableSpellBuffDebuffEffect(1, 1.10);
                    e.getSource().addConsumableSpellBuff(buff);
                    System.out.println("✨ Harmonie Karmique : +10% de dégâts sur le sort offensif !");
                }
            }
        }
    }

    @Override
    public void onSpellCast(Personnage personnage, Spell spell) {
        // Si le karma est déjà brisé, on ne fait rien
        if (personnage.getPassiveState("karma_locked", 0) == 1) {
            return;
        }

        boolean isOffensive = false;
        boolean isProtective = false;
        boolean isRestorative = false;

        generation.grimoire.enumeration.KarmaAlignment alignment = spell.getKarmaAlignment();
        if (alignment == generation.grimoire.enumeration.KarmaAlignment.OFFENSIVE) {
            isOffensive = true;
        } else if (alignment == generation.grimoire.enumeration.KarmaAlignment.PROTECTIVE) {
            isProtective = true;
        } else if (alignment == generation.grimoire.enumeration.KarmaAlignment.RESTORATIVE) {
            isRestorative = true;
        }

        int gauge = personnage.getPassiveState("karma_gauge", 0);

        if (isOffensive) {
            gauge--;
            System.out.println("🌑 Le Karma penche vers les Ténèbres (Sort Offensif). Jauge: " + gauge);
        } else if (isProtective) {
            gauge++;
            System.out.println("🌕 Le Karma penche vers l'Esprit (Sort Protecteur). Jauge: " + gauge);
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

        // Vérifier l'état de la jauge
        if (gauge <= -4 || gauge >= 4) {
            if (gauge <= -4) {
                System.out.println("💥 Le Karma est corrompue par les ténèbres. La voie du Karma est verrouillée.");
            } else {
                System.out.println("💥 Le Karma est aveuglé par la lumière. La voie du Karma est verrouillée.");
            }
            personnage.setPassiveState("karma_locked", 1);
            personnage.setPassiveState("karma_harmony", 0);
        } else {
            personnage.setPassiveState("karma_gauge", gauge);
            if (gauge == 0) {
                System.out.println("✨ Équilibre Karmique Parfait atteint ! (karma_harmony = 1)");
                personnage.setPassiveState("karma_harmony", 1);
            } else {
                personnage.setPassiveState("karma_harmony", 0);
            }
        }
    }

    @Override
    public void onTurnStart(Personnage personnage) {
        // Optionnel : on pourrait afficher l'état du Karma au début du tour si non
        // verrouillé
        if (personnage.getPassiveState("karma_locked", 0) == 0) {
            int gauge = personnage.getPassiveState("karma_gauge", 0);
            if (gauge == 0) {
                System.out.println("⚖️ " + personnage.getName() + " est en parfaite harmonie karmique.");
            }
        }
    }

    @Override
    public boolean canCastSpell(Personnage caster, Spell spell) {
        if (spell.getSpiritualite() != null && this.getSpiritualite() != null) {
            boolean sameId = spell.getSpiritualite().getId() != null && this.getSpiritualite().getId() != null && spell.getSpiritualite().getId().equals(this.getSpiritualite().getId());
            boolean sameName = spell.getSpiritualite().getNom() != null && this.getSpiritualite().getNom() != null && spell.getSpiritualite().getNom().equals(this.getSpiritualite().getNom());
            
            if (sameId || sameName) {
                if (caster.getPassiveState("karma_locked", 0) == 1) {
                    System.out.println("🚫 " + caster.getName()
                            + " ne peut plus lancer de sorts du Karma (Voie verrouillée par Corruption/Illumination).");
                    return false;
                }
            }
        }
        return true;
    }
}
