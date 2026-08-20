package generation.grimoire.controller;

import generation.grimoire.repository.SpellRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@Profile("dev")
public class DebugController {
    private final SpellRepository repo;
    private final ObjectMapper mapper;

    public DebugController(SpellRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @GetMapping("/api/debug-spells")
    public String debugSpells() {
        try {
            var list = repo.findAll();
            return "Fetched " + list.size() + " spells. JSON size: " + mapper.writeValueAsString(list).length();
        } catch (Throwable e) {
            try {
                java.io.PrintWriter pw = new java.io.PrintWriter("c:/Users/doria/Desktop/Project/grimoire/debug_error.log");
                e.printStackTrace(pw);
                pw.close();
            } catch (Exception ex) {}
            return "Error: " + e.getClass().getName() + " - " + e.getMessage();
        }
    }
}
