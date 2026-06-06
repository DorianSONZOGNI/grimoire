package generation.grimoire.controller.pve;

import generation.grimoire.DTO.pve.DonjonDTO;
import generation.grimoire.DTO.pve.MonstreDTO;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.service.pve.PvEAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/pve")
@RequiredArgsConstructor
public class PvEAdminController {

    private final PvEAdminService pvEAdminService;

    // --- MONSTERS ---

    @GetMapping("/monsters")
    public ResponseEntity<List<Monstre>> getAllMonsters() {
        return ResponseEntity.ok(pvEAdminService.getAllMonsters());
    }

    @PostMapping("/monsters")
    public ResponseEntity<Monstre> createMonster(@RequestBody Monstre monstre) {
        return ResponseEntity.ok(pvEAdminService.createOrUpdateMonster(monstre));
    }

    @PutMapping("/monsters/{id}")
    public ResponseEntity<Monstre> updateMonster(@PathVariable Long id, @RequestBody Monstre monstreDetails) {
        Monstre existing = pvEAdminService.getMonsterById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        monstreDetails.setId(id);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateMonster(monstreDetails));
    }

    @DeleteMapping("/monsters/{id}")
    public ResponseEntity<Void> deleteMonster(@PathVariable Long id) {
        pvEAdminService.deleteMonster(id);
        return ResponseEntity.ok().build();
    }

    // --- DUNGEONS ---

    @GetMapping("/dungeons")
    public ResponseEntity<List<Donjon>> getAllDungeons() {
        return ResponseEntity.ok(pvEAdminService.getAllDungeons());
    }

    @PostMapping("/dungeons")
    public ResponseEntity<Donjon> createDungeon(@RequestBody DonjonDTO donjonDTO) {
        Donjon donjon = new Donjon();
        mapDonjonDtoToEntity(donjonDTO, donjon);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateDungeon(donjon));
    }

    @PutMapping("/dungeons/{id}")
    public ResponseEntity<Donjon> updateDungeon(@PathVariable Long id, @RequestBody DonjonDTO donjonDTO) {
        Donjon existing = pvEAdminService.getDungeonById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        mapDonjonDtoToEntity(donjonDTO, existing);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateDungeon(existing));
    }

    @DeleteMapping("/dungeons/{id}")
    public ResponseEntity<Void> deleteDungeon(@PathVariable Long id) {
        pvEAdminService.deleteDungeon(id);
        return ResponseEntity.ok().build();
    }

    private void mapDonjonDtoToEntity(DonjonDTO dto, Donjon entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setImageUrl(dto.getImageUrl());
        entity.setRecommendedLevel(dto.getRecommendedLevel());
        
        if (dto.getMonsters() != null) {
            List<Monstre> monsters = dto.getMonsters().stream()
                .map(mDto -> pvEAdminService.getMonsterById(mDto.getId()))
                .filter(m -> m != null)
                .collect(Collectors.toList());
            entity.setMonsters(monsters);
        }
    }
}
