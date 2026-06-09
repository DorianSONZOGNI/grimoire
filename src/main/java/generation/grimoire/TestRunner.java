package generation.grimoire;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.Spell;
import generation.grimoire.repository.PersonnageRepository;
import generation.grimoire.repository.SpellRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class TestRunner implements CommandLineRunner {

    private final PersonnageRepository pr;
    private final SpellRepository sr;

    public TestRunner(PersonnageRepository pr, SpellRepository sr) {
        this.pr = pr;
        this.sr = sr;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====== STARTING TEST RUNNER ======");
        Personnage p = pr.findById(1L).orElse(null);
        if (p == null) {
            System.out.println("Player 1 not found!");
            return;
        }
        System.out.println("Player: " + p.getName() + ", Voie: " + (p.getVoie() != null ? p.getVoie().getId() : "null") + ", Spirit: " + (p.getSpiritualite() != null ? p.getSpiritualite().getId() : "null"));
        for (Spell s : sr.findAll()) {
            String error = p.canCast(s);
            System.out.println("Spell: " + s.getNom() + 
                ", Voie: " + (s.getVoie() != null ? s.getVoie().getId() : "null") + 
                ", Spirit: " + (s.getSpiritualite() != null ? s.getSpiritualite().getId() : "null") + 
                " -> " + (error == null ? "ALLOWED" : "DENIED (" + error + ")"));
        }
        System.out.println("====== END TEST RUNNER ======");
    }
}
