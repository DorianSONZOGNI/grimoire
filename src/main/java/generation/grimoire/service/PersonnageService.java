package generation.grimoire.service;

import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.repository.PersonnageRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class PersonnageService {

    private final PersonnageRepository persoRepo;
    public PersonnageService(PersonnageRepository persoRepo) {
        this.persoRepo = persoRepo;
    }

    public Personnage findByIdOrThrow(@org.springframework.lang.NonNull Long id) {
        return persoRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Personnage non trouvé : " + id));
    }

    public java.util.List<Personnage> findAll() {
        return persoRepo.findAll();
    }

    public Personnage save(Personnage personnage) {
        return persoRepo.save(personnage);
    }

    public void deleteById(Long id) {
        persoRepo.deleteById(id);
    }

    public boolean existsById(Long id) {
        return persoRepo.existsById(id);
    }
}
