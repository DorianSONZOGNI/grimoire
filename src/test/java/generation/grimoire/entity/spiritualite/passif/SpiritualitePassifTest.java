package generation.grimoire.entity.spiritualite.passif;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.spiritualite.passif.specific.EspritPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.KarmaPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.TenebrePassiveEffect;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.event.SpellCostPaidEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SpiritualitePassifTest {

    private Personnage hero;
    private Personnage enemy;
    private Spiritualite espritSpiritualite;
    private Spiritualite karmaSpiritualite;
    private Spiritualite tenebreSpiritualite;

    @BeforeEach
    void setUp() {
        hero = new Personnage();
        hero.setName("Hero");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);

        enemy = new Personnage();
        enemy.setName("Enemy");

        espritSpiritualite = new Spiritualite();
        espritSpiritualite.setId(1L);
        espritSpiritualite.setNom("Esprit");

        karmaSpiritualite = new Spiritualite();
        karmaSpiritualite.setId(2L);
        karmaSpiritualite.setNom("Karma");

        tenebreSpiritualite = new Spiritualite();
        tenebreSpiritualite.setId(3L);
        tenebreSpiritualite.setNom("Tenebres");
    }

    @Test
    void shouldApplyEspritPassiveRestrictions() {
        EspritPassiveEffect esprit = new EspritPassiveEffect();
        esprit.setSpiritualite(espritSpiritualite);

        Spell espritSpell = new Spell();
        espritSpell.setNom("Esprit Spell");
        espritSpell.setSpiritualite(espritSpiritualite);

        // Au max (100/100), >= 20% vérifié -> canCast
        assertThat(esprit.canCastSpell(hero, espritSpell)).isTrue();

        // Plus de 20% mana, mais 10% hp -> pas assez de hp
        hero.setHealthCurrent(10);
        assertThat(esprit.canCastSpell(hero, espritSpell)).isFalse();

        // 100% hp, 10% mana -> pas assez de mana
        hero.setHealthCurrent(100);
        hero.setManaCurrent(10);
        assertThat(esprit.canCastSpell(hero, espritSpell)).isFalse();

        // Moins de 20% hp et mana
        hero.setHealthCurrent(10);
        hero.setManaCurrent(10);
        assertThat(esprit.canCastSpell(hero, espritSpell)).isFalse();

        // Un sort d'une autre spiritualité peut toujours être lancé
        Spell otherSpell = new Spell();
        otherSpell.setSpiritualite(karmaSpiritualite);
        assertThat(esprit.canCastSpell(hero, otherSpell)).isTrue();
    }

    @Test
    void shouldApplyTenebrePassiveRestrictions() {
        TenebrePassiveEffect tenebre = new TenebrePassiveEffect();
        tenebre.setSpiritualite(tenebreSpiritualite);

        Spell tenebreSpell = new Spell();
        tenebreSpell.setNom("Tenebre Spell");
        tenebreSpell.setSpiritualite(tenebreSpiritualite);

        // À 100% (HP et Mana), la condition <= 80% n'est PAS remplie -> false
        assertThat(tenebre.canCastSpell(hero, tenebreSpell)).isFalse();

        // HP à 70% -> condition remplie (<= 80% HP) -> true
        hero.setHealthCurrent(70);
        assertThat(tenebre.canCastSpell(hero, tenebreSpell)).isTrue();

        // HP à 100%, mais Mana à 50% -> condition remplie (<= 80% Mana) -> true
        hero.setHealthCurrent(100);
        hero.setManaCurrent(50);
        assertThat(tenebre.canCastSpell(hero, tenebreSpell)).isTrue();

        // Sort contenant "base" dans le nom -> toujours true
        Spell baseSpell = new Spell();
        baseSpell.setNom("Attaque de base");
        baseSpell.setSpiritualite(tenebreSpiritualite);
        hero.setHealthCurrent(100);
        hero.setManaCurrent(100);
        assertThat(tenebre.canCastSpell(hero, baseSpell)).isTrue();

        // Un sort d'une autre spiritualité peut toujours être lancé
        Spell otherSpell = new Spell();
        otherSpell.setSpiritualite(karmaSpiritualite);
        assertThat(tenebre.canCastSpell(hero, otherSpell)).isTrue();
    }

    @Test
    void shouldApplyKarmaPassiveGaugeAndLock() {
        KarmaPassiveEffect karma = new KarmaPassiveEffect();
        karma.setSpiritualite(karmaSpiritualite);

        Spell offSpell = new Spell();
        offSpell.setNom("Offensive Spell");
        offSpell.setSpiritualite(karmaSpiritualite);
        offSpell.setKarmaAlignment(KarmaAlignment.OFFENSIVE);

        Spell protSpell = new Spell();
        protSpell.setNom("Protective Spell");
        protSpell.setSpiritualite(karmaSpiritualite);
        protSpell.setKarmaAlignment(KarmaAlignment.PROTECTIVE);

        Spell restSpell = new Spell();
        restSpell.setNom("Restorative Spell");
        restSpell.setSpiritualite(karmaSpiritualite);
        restSpell.setKarmaAlignment(KarmaAlignment.RESTORATIVE);

        // 1. Démarrage
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);

        // 2. Lancer un sort protecteur -> Jauge +1
        karma.onEvent(new SpellCostPaidEvent(hero, enemy, protSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(1);

        // 3. Lancer un sort offensif -> Jauge 0 (Harmonie)
        karma.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);
        assertThat(hero.getPassiveState("karma_harmony", 0)).isEqualTo(1);

        // 4. Test bonus Harmonie sur sort restaurateur
        // Normalement hero max hp/mana, on réduit pour tester le soin
        hero.setHealthCurrent(50);
        hero.setManaCurrent(50);
        karma.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        // Bonus : 5% de 100 = 5 PV et 5 Mana
        assertThat(hero.getHealthCurrent()).isEqualTo(55);
        assertThat(hero.getManaCurrent()).isEqualTo(55);
        // Le sort restaurateur ramène la jauge vers 0, mais elle était déjà à 0
        assertThat(hero.getPassiveState("karma_gauge", 0)).isEqualTo(0);

        // 5. Test Corruption (Jauge <= -4)
        for (int i = 0; i < 4; i++) {
            karma.onEvent(new SpellCostPaidEvent(hero, enemy, offSpell, 10, 0, 0));
        }
        // Jauge arrive à -4 -> Corruption
        assertThat(hero.getPassiveState("karma_locked", 0)).isEqualTo(1);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(6);
        
        // 6. Test Blocage Sorts
        // Le karma est locké, impossible de lancer un sort karma NON restaurateur
        assertThat(karma.canCastSpell(hero, offSpell)).isFalse();
        // Un sort restaurateur peut être lancé
        assertThat(karma.canCastSpell(hero, restSpell)).isTrue();
        
        // 7. Sort restaurateur diminue le lock
        karma.onEvent(new SpellCostPaidEvent(hero, enemy, restSpell, 10, 0, 0));
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(5);
        
        // 8. Dissipation au début du tour
        karma.onTurnStart(hero);
        assertThat(hero.getPassiveState("karma_locked_duration", 0)).isEqualTo(4);
    }
}
