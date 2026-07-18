package generation.grimoire.service.pve;

import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Mutation;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.MutationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PvEAdminService {

    private final MonstreRepository monstreRepository;
    private final DonjonRepository donjonRepository;
    private final MutationRepository mutationRepository;

    public List<Monstre> getAllMonsters() {
        return monstreRepository.findAll();
    }

    public Monstre getMonsterById(@NonNull Long id) {
        return monstreRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Monstre introuvable avec l'id : " + id));
    }

    public boolean monsterExists(@NonNull Long id) {
        return monstreRepository.existsById(id);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"monstres", "monstreById"}, allEntries = true)
    public Monstre createOrUpdateMonster(@NonNull Monstre monstre) {
        if (monstre.getMutations() != null) {
            java.util.List<Mutation> hydratedMutations = new java.util.ArrayList<>();
            for (Mutation m : monstre.getMutations()) {
                Long id = m.getId();
                if (id != null) {
                    mutationRepository.findById(id).ifPresent(hydratedMutations::add);
                }
            }
            monstre.setMutations(hydratedMutations);
        }
        return monstreRepository.save(monstre);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"monstres", "monstreById"}, allEntries = true)
    public void deleteMonster(@NonNull Long id) {
        monstreRepository.deleteById(id);
    }

    // === Mutations ===

    public List<Mutation> getAllMutations() {
        return mutationRepository.findAll();
    }

    public Mutation getMutationById(@NonNull Long id) {
        return mutationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Mutation introuvable avec l'id : " + id));
    }

    public boolean mutationExists(@NonNull Long id) {
        return mutationRepository.existsById(id);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"mutations", "mutationById"}, allEntries = true)
    public Mutation createOrUpdateMutation(@NonNull Mutation mutation) {
        return mutationRepository.save(mutation);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"mutations", "mutationById"}, allEntries = true)
    public void deleteMutation(@NonNull Long id) {
        mutationRepository.deleteById(id);
    }

    // === Donjons ===

    public List<Donjon> getAllDungeons() {
        return donjonRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<generation.grimoire.DTO.pve.DonjonSummaryDTO> getDungeonSummaries() {
        return donjonRepository.findAllByOrderByDisplayOrderAsc().stream().map(d -> {
            generation.grimoire.DTO.pve.DonjonSummaryDTO dto = new generation.grimoire.DTO.pve.DonjonSummaryDTO();
            dto.setId(d.getId());
            dto.setName(d.getName());
            dto.setDescription(d.getDescription());
            dto.setImageUrl(d.getImageUrl());
            dto.setRecommendedLevel(d.getRecommendedLevel());
            dto.setMaxHeroes(d.getMaxHeroes());
            dto.setUnlockCostGold(d.getUnlockCostGold());
            dto.setRequiredSecret(d.getRequiredSecret());
            dto.setRequiredSecretLevel(d.getRequiredSecretLevel());
            dto.setEntryCostGold(d.getEntryCostGold());
            dto.setDisplayOrder(d.getDisplayOrder());
            dto.setSalles(d.getSalles());
            return dto;
        }).toList();
    }

    public Donjon getDungeonById(@NonNull Long id) {
        return donjonRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Donjon introuvable avec l'id : " + id));
    }

    @Transactional
    public Donjon createOrUpdateDungeon(@NonNull Donjon donjon) {
        return donjonRepository.save(donjon);
    }

    @Transactional
    public void deleteDungeon(@NonNull Long id) {
        donjonRepository.deleteById(id);
    }

    @Transactional
    public void updateDungeonsOrder(List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            if (id != null) {
                Donjon d = donjonRepository.findById(id).orElse(null);
                if (d != null) {
                    d.setDisplayOrder(i);
                    donjonRepository.save(d);
                }
            }
        }
    }
}
