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
        this.asPersonnage.setId(nextId--);
        this.asPersonnage.setName(base.getName());
        this.asPersonnage.setHealthMax(base.getHealthMax());
        this.asPersonnage.setHealthCurrent(base.getHealthMax());
        this.asPersonnage.setManaMax(base.getManaMax());
        this.asPersonnage.setManaCurrent(base.getManaMax());
        this.asPersonnage.setPower(base.getPower());
        this.asPersonnage.setStrength(base.getStrength());
        this.asPersonnage.setArmor(base.getArmor());
        this.asPersonnage.setResistance(base.getResistance());
        this.asPersonnage.setSpeed(base.getSpeed());
        this.asPersonnage.setCrit(base.getCrit());
        this.asPersonnage.setTeamId("2"); // Team Ennemi (pour les sorts)
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
        // PASSIF TYPE : REPTILE — 15% de réduction des dégâts physiques
        if (this.base.getMonsterType() == generation.grimoire.enumeration.MonsterType.REPTILE) {
            damage = (int) Math.ceil(damage * 0.85);
        }
        this.asPersonnage.setHealthCurrent(Math.max(0, this.asPersonnage.getHealthCurrent() - damage));
    }
}
