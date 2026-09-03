package generation.grimoire.model.pve;

import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.personnage.Personnage;
import lombok.Data;

@Data
public class ActiveMonster {
    private Monstre base;
    private Personnage asPersonnage;
    private static long nextId = -1;
    
    // For PREDATEUR behavior: locked target
    private Long lockedTargetId;
    // For LEADER behavior: forced target for this round
    private Long leaderForcedTargetId;

    public ActiveMonster(Monstre base) {
        this.base = base;
        this.asPersonnage = new Personnage();
        this.asPersonnage.setMonsterType(base.getMonsterType());
        this.asPersonnage.setMonsterName(base.getName());
        this.asPersonnage.setId(nextId--);
        this.asPersonnage.setName(base.getName());
        this.asPersonnage.setHealthMax(base.getHealthMax());
        int startHpPct = base.getStartHpPct() == 0 ? 100 : base.getStartHpPct();
        this.asPersonnage.setHealthCurrent((int) (base.getHealthMax() * (startHpPct / 100.0)));
        this.asPersonnage.setManaMax(base.getManaMax());
        int startManaPct = base.getStartManaPct();
        // Pour garder la compatibilité si c'est null ou 0 en BDD, si manaMax > 0 on met à 100% ou on laisse le choix à l'admin.
        // Si l'admin veut 0, il mettra 0 dans l'input (qui est par défaut à 0 dans mon HTML on va dire).
        // Mais en fait, comme on veut la backward compatibility, si startManaPct n'était pas géré, il valait 0.
        // Or avant on mettait 100%. Donc si on met 0 en DB on devrait peut-être mettre 0% maintenant.
        // Le user a dit "C'est pour savoir à combien on remplis leur bare d'hp et de mana max au début du combat"
        this.asPersonnage.setManaCurrent((int) (base.getManaMax() * (startManaPct / 100.0)));
        this.asPersonnage.setPower(base.getPower());
        this.asPersonnage.setStrength(base.getStrength());
        this.asPersonnage.setArmor(base.getArmor());
        this.asPersonnage.setResistance(base.getResistance());
        this.asPersonnage.setSpeed(base.getSpeed());
        this.asPersonnage.setCrit(base.getCrit());
        this.asPersonnage.setRegenHp(base.getRegenHp());
        this.asPersonnage.setRegenMana(base.getRegenMana());
        this.asPersonnage.setTeamId("2"); // Team Ennemi (pour les sorts)

        if (base.getStartShield() > 0) {
            int shieldDuration = base.getStartShieldDuration() > 0 ? base.getStartShieldDuration() : -1;
            this.asPersonnage.addShield(base.getStartShield(), shieldDuration, "Bouclier Initial");
        }
    }

    public int getCurrentHp() {
        return this.asPersonnage.getHealthCurrent();
    }

    public int getMaxHp() {
        return this.asPersonnage.getHealthMax();
    }

    public void setMaxHp(int maxHp) {
        this.asPersonnage.setHealthMax(maxHp);
    }

    public boolean isDead() {
        return this.asPersonnage.getHealthCurrent() <= 0;
    }

    public void takeDamage(int damage) {
        // Legacy, used if type is unknown
        if (this.base.getMonsterType() == generation.grimoire.enumeration.MonsterType.REPTILE) {
            damage = (int) Math.ceil(damage * 0.85);
        }
        this.asPersonnage.setHealthCurrent(Math.max(0, this.asPersonnage.getHealthCurrent() - damage));
    }

    public void takeDamage(int damage, generation.grimoire.enumeration.DamageType type, generation.grimoire.entity.personnage.Personnage caster) {
        // PASSIF TYPE : REPTILE — 15% de réduction des dégâts physiques
        if (type == generation.grimoire.enumeration.DamageType.PHYSIC && this.base.getMonsterType() == generation.grimoire.enumeration.MonsterType.REPTILE) {
            damage = (int) Math.ceil(damage * 0.85);
        }
        this.asPersonnage.takeDamage(damage, type, caster);
    }
}
