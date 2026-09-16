package generation.grimoire.controller.pve;

import generation.grimoire.repository.pve.MonstreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestMonstreController {
    private final MonstreRepository monstreRepository;

    @GetMapping("/monsters")
    public ResponseEntity<?> getMonsters() {
        return ResponseEntity.ok(monstreRepository.findAll());
    }
}
