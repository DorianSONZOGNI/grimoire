package generation.grimoire.service;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.repository.PersonnageRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PersonnageService {

    private final PersonnageRepository persoRepo;
    private final generation.grimoire.repository.EquipmentRepository equipmentRepository;

    public PersonnageService(PersonnageRepository persoRepo, generation.grimoire.repository.EquipmentRepository equipmentRepository) {
        this.persoRepo = persoRepo;
        this.equipmentRepository = equipmentRepository;
    }

    public Personnage findByIdOrThrow(@org.springframework.lang.NonNull Long id) {
        return persoRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Personnage non trouvé : " + id));
    }

    public java.util.List<Personnage> findAll() {
        return persoRepo.findAll();
    }

    public Personnage save(@org.springframework.lang.NonNull Personnage personnage) {
        return persoRepo.save(personnage);
    }

    public void deleteById(@org.springframework.lang.NonNull Long id) {
        Personnage p = persoRepo.findById(id).orElse(null);
        if (p != null) {
            java.util.List<generation.grimoire.entity.Equipment> equips = equipmentRepository.findByPersonnageId(id);
            for (generation.grimoire.entity.Equipment eq : equips) {
                eq.setPersonnage(null);
                equipmentRepository.save(eq);
            }
            persoRepo.delete(p);
        }
    }

    public boolean existsById(@org.springframework.lang.NonNull Long id) {
        return persoRepo.existsById(id);
    }
}
