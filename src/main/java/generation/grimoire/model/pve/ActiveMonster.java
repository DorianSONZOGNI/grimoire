package generation.grimoire.model.pve;

import generation.grimoire.entity.pve.Monstre;
import lombok.Data;

@Data
public class ActiveMonster {
    private Monstre base;
    private int currentHp;
    private int maxHp;
    private boolean isDead;

    public ActiveMonster(Monstre base) {
        this.base = base;
        this.maxHp = base.getHealthMax();
        this.currentHp = this.maxHp;
        this.isDead = false;
    }

    public void takeDamage(int damage) {
        this.currentHp -= damage;
        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isDead = true;
        }
    }
}
