package generation.grimoire.service.pve;

import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PvEAdminService {
    
    private final MonstreRepository monstreRepository;
    private final DonjonRepository donjonRepository;

    public List<Monstre> getAllMonsters() {
        return monstreRepository.findAll();
    }
    
    public Monstre getMonsterById(Long id) {
        return monstreRepository.findById(id).orElse(null);
    }

    @Transactional
    public Monstre createOrUpdateMonster(Monstre monstre) {
        return monstreRepository.save(monstre);
    }

    @Transactional
    public void deleteMonster(Long id) {
        monstreRepository.deleteById(id);
    }

    public List<Donjon> getAllDungeons() {
        return donjonRepository.findAll();
    }

    public Donjon getDungeonById(Long id) {
        return donjonRepository.findById(id).orElse(null);
    }

    @Transactional
    public Donjon createOrUpdateDungeon(Donjon donjon) {
        return donjonRepository.save(donjon);
    }

    @Transactional
    public void deleteDungeon(Long id) {
        donjonRepository.deleteById(id);
    }
}
