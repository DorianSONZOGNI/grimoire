package generation.grimoire.service.pve;

import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.MonstreRepository;
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

    public List<Monstre> getAllMonsters() {
        return monstreRepository.findAll();
    }
    
    public Monstre getMonsterById(@NonNull Long id) {
        return monstreRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Monstre introuvable avec l'id : " + id));
    }

    @Transactional
    public Monstre createOrUpdateMonster(@NonNull Monstre monstre) {
        return monstreRepository.save(monstre);
    }

    @Transactional
    public void deleteMonster(@NonNull Long id) {
        monstreRepository.deleteById(id);
    }

    public List<Donjon> getAllDungeons() {
        return donjonRepository.findAll();
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
}
