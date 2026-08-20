package generation.grimoire.model.pve;

import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.MonsterType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ActiveMonsterTest {

    @Test
    void shouldInitializeFromMonstre() {
        Monstre monstre = new Monstre();
        monstre.setMonsterType(MonsterType.MORT_VIVANT);
        monstre.setName("Squelette");
        monstre.setHealthMax(100);
        monstre.setStartHpPct(50);
        monstre.setManaMax(50);
        monstre.setStartManaPct(0);
        monstre.setPower(10);
        monstre.setStrength(15);
        monstre.setArmor(5);
        monstre.setResistance(2);
        monstre.setSpeed(12);
        monstre.setCrit(5);

        ActiveMonster activeMonster = new ActiveMonster(monstre);

        assertThat(activeMonster.getBase()).isEqualTo(monstre);
        assertThat(activeMonster.getAsPersonnage().getMonsterType()).isEqualTo(MonsterType.MORT_VIVANT);
        assertThat(activeMonster.getAsPersonnage().getName()).isEqualTo("Squelette");
        assertThat(activeMonster.getMaxHp()).isEqualTo(100);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(50); // 50% de 100
        assertThat(activeMonster.getAsPersonnage().getManaMax()).isEqualTo(50);
        assertThat(activeMonster.getAsPersonnage().getManaCurrent()).isEqualTo(0);
        assertThat(activeMonster.getAsPersonnage().getPower()).isEqualTo(10);
        assertThat(activeMonster.getAsPersonnage().getStrength()).isEqualTo(15);
        assertThat(activeMonster.getAsPersonnage().getArmor()).isEqualTo(5);
        assertThat(activeMonster.getAsPersonnage().getResistance()).isEqualTo(2);
        assertThat(activeMonster.getAsPersonnage().getSpeed()).isEqualTo(12);
        assertThat(activeMonster.getAsPersonnage().getCrit()).isEqualTo(5);
        assertThat(activeMonster.getAsPersonnage().getTeamId()).isEqualTo("2");
    }

    @Test
    void shouldInitializeWith100PctHpWhenStartHpPctIsZero() {
        Monstre monstre = new Monstre();
        monstre.setHealthMax(100);
        monstre.setStartHpPct(0); // 0 means 100% in legacy
        
        ActiveMonster activeMonster = new ActiveMonster(monstre);
        
        assertThat(activeMonster.getCurrentHp()).isEqualTo(100);
    }

    @Test
    void shouldTakeDamageWithoutType() {
        Monstre monstre = new Monstre();
        monstre.setHealthMax(100);
        monstre.setStartHpPct(100);
        monstre.setMonsterType(MonsterType.MORT_VIVANT);
        ActiveMonster activeMonster = new ActiveMonster(monstre);

        activeMonster.takeDamage(20);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(80);
        
        activeMonster.takeDamage(100);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(0);
        assertThat(activeMonster.isDead()).isTrue();
    }

    @Test
    void shouldReduceDamageForReptile() {
        Monstre monstre = new Monstre();
        monstre.setHealthMax(100);
        monstre.setStartHpPct(100);
        monstre.setMonsterType(MonsterType.REPTILE);
        ActiveMonster activeMonster = new ActiveMonster(monstre);

        // 20 damage without type legacy reduction -> ceil(20 * 0.85) = 17
        activeMonster.takeDamage(20);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(83); // 100 - 17

        // 20 damage with type PHYSIC -> ceil(20 * 0.85) = 17, then Personnage.takeDamage applies it
        // Note: Personnage.takeDamage may also apply armor, so let's set armor to 0 for predictability
        activeMonster.getAsPersonnage().setArmor(0);
        activeMonster.getAsPersonnage().setResistance(0);
        
        activeMonster.takeDamage(20, DamageType.PHYSIC, null);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(68); 
        
        // 20 damage with type MAGIC -> no reduction -> 20
        activeMonster.takeDamage(20, DamageType.MAGIC, null);
        assertThat(activeMonster.getCurrentHp()).isEqualTo(48);
    }
}
