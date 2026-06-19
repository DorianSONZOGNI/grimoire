package generation.grimoire.controller.pve;

import generation.grimoire.DTO.pve.DonjonDTO;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.service.pve.PvEAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/pve")
@RequiredArgsConstructor
public class PvEAdminController {
    private final PvEAdminService pvEAdminService;
    private final generation.grimoire.repository.EquipmentRepository equipmentRepository;

    // --- MONSTERS ---

    @GetMapping("/monsters")
    public ResponseEntity<List<Monstre>> getAllMonsters() {
        return ResponseEntity.ok(pvEAdminService.getAllMonsters());
    }

    @PostMapping("/monsters")
    public ResponseEntity<Monstre> createMonster(@RequestBody @NonNull Monstre monstre) {
        return ResponseEntity.ok(pvEAdminService.createOrUpdateMonster(monstre));
    }

    @PutMapping("/monsters/{id}")
    public ResponseEntity<Monstre> updateMonster(@PathVariable @NonNull Long id, @RequestBody @NonNull Monstre monstreDetails) {
        try {
            pvEAdminService.getMonsterById(id);
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
        monstreDetails.setId(id);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateMonster(monstreDetails));
    }

    @DeleteMapping("/monsters/{id}")
    public ResponseEntity<Void> deleteMonster(@PathVariable @NonNull Long id) {
        pvEAdminService.deleteMonster(id);
        return ResponseEntity.ok().build();
    }

    // --- DUNGEONS ---

    @GetMapping("/dungeons")
    public ResponseEntity<List<Donjon>> getAllDungeons() {
        return ResponseEntity.ok(pvEAdminService.getAllDungeons());
    }

    @PostMapping("/dungeons")
    public ResponseEntity<Donjon> createDungeon(@RequestBody @NonNull DonjonDTO donjonDTO) {
        Donjon donjon = new Donjon();
        mapDonjonDtoToEntity(donjonDTO, donjon);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateDungeon(donjon));
    }

    @PutMapping("/dungeons/{id}")
    public ResponseEntity<Donjon> updateDungeon(@PathVariable @NonNull Long id, @RequestBody @NonNull DonjonDTO donjonDTO) {
        Donjon existing;
        try {
            existing = pvEAdminService.getDungeonById(id);
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
        mapDonjonDtoToEntity(donjonDTO, existing);
        return ResponseEntity.ok(pvEAdminService.createOrUpdateDungeon(
                java.util.Objects.requireNonNull(existing)));
    }

    @DeleteMapping("/dungeons/{id}")
    public ResponseEntity<Void> deleteDungeon(@PathVariable @NonNull Long id) {
        pvEAdminService.deleteDungeon(id);
        return ResponseEntity.ok().build();
    }

    private void mapDonjonDtoToEntity(DonjonDTO dto, Donjon entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setImageUrl(dto.getImageUrl());
        entity.setRecommendedLevel(dto.getRecommendedLevel());
        entity.setMaxHeroes(dto.getMaxHeroes() > 0 ? dto.getMaxHeroes() : 1);

        if (dto.getSalles() != null) {
            List<generation.grimoire.entity.pve.Salle> salles = dto.getSalles().stream().map(sDto -> {
                generation.grimoire.entity.pve.Salle s = new generation.grimoire.entity.pve.Salle();
                s.setType(sDto.getType());
                s.setEventSubType(sDto.getEventSubType());
                s.setEventText(sDto.getEventText());
                s.setEventEffectAmount(sDto.getEventEffectAmount());
                s.setAlterationType(sDto.getAlterationType());
                s.setAlterationHpAmount(sDto.getAlterationHpAmount());
                s.setAlterationExpAmount(sDto.getAlterationExpAmount());
                s.setAlterationRewardType(sDto.getAlterationRewardType());
                s.setAlterationSpiritualXpReward(sDto.getAlterationSpiritualXpReward());
                s.setAlterationSpecialItemReward(sDto.getAlterationSpecialItemReward());
                s.setAlterationRequiredItem(sDto.getAlterationRequiredItem());
                s.setTreasureGold(sDto.getTreasureGold());
                s.setTreasureExp(sDto.getTreasureExp());
                s.setTrapType(sDto.getTrapType());
                s.setTrapAmount(sDto.getTrapAmount());
                s.setTrapHasRopeOption(sDto.isTrapHasRopeOption());
                s.setTrapDamageHpPct(sDto.getTrapDamageHpPct());
                s.setTrapDamageManaPct(sDto.getTrapDamageManaPct());
                s.setTrapDamageHpFixed(sDto.getTrapDamageHpFixed());
                s.setTrapDamageManaFixed(sDto.getTrapDamageManaFixed());
                s.setDoorOutcomes(sDto.getDoorOutcomes());
                s.setGlobalBuffs(sDto.getGlobalBuffs());
                s.setBossRewardSpiritualXp(sDto.getBossRewardSpiritualXp());
                s.setBossRewardGold(sDto.getBossRewardGold());

                if (sDto.getMonsters() != null) {
                    List<Monstre> monsters = sDto.getMonsters().stream()
                            .filter(mDto -> mDto.getId() != null)
                            .map(mDto -> {
                                try {
                                    return pvEAdminService.getMonsterById(
                                            java.util.Objects.requireNonNull(mDto.getId()));
                                } catch (java.util.NoSuchElementException e) {
                                    return null;
                                }
                            })
                            .filter(m -> m != null)
                            .collect(Collectors.toList());
                    s.setMonsters(monsters);
                }

                if (sDto.getLootTable() != null) {
                    List<generation.grimoire.entity.pve.LootEntry> lootEntries = sDto.getLootTable().stream()
                            .map(lDto -> {
                                generation.grimoire.entity.pve.LootEntry entry = new generation.grimoire.entity.pve.LootEntry();
                                entry.setSalle(s);
                                
                                if (lDto.getEquipmentId() != null) {
                                    generation.grimoire.entity.Equipment eq = equipmentRepository.findById(java.util.Objects.requireNonNull(lDto.getEquipmentId())).orElse(null);
                                    entry.setEquipment(eq);
                                }
                                
                                entry.setProbability(lDto.getProbability());
                                entry.setSpecialItemName(lDto.getSpecialItemName());
                                entry.setPriceGold(lDto.getPriceGold());
                                entry.setPriceSpecialItemName(lDto.getPriceSpecialItemName());
                                
                                return entry;
                            })
                            .collect(Collectors.toList());
                    s.setLootTable(lootEntries);
                }

                return s;
            }).collect(Collectors.toList());

            // Clear and add to keep orphanRemoval working if there was an existing list
            if (entity.getSalles() == null) {
                entity.setSalles(new java.util.ArrayList<>());
            }
            entity.getSalles().clear();
            entity.getSalles().addAll(salles);
        }
    }
}



