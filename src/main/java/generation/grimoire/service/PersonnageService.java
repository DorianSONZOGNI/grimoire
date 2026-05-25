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

}
