package generation.grimoire.controller.pve;

import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.service.pve.PvEAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pve/dungeons")
@RequiredArgsConstructor
public class DungeonController {

    private final PvEAdminService pvEAdminService;

    @GetMapping
    public ResponseEntity<List<Donjon>> getAvailableDungeons() {
        // Here we could filter based on player level in the future
        return ResponseEntity.ok(pvEAdminService.getAllDungeons());
    }
}
