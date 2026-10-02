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
    private final generation.grimoire.repository.auth.UserRepository userRepository;

    public PersonnageService(PersonnageRepository persoRepo, 
                             generation.grimoire.repository.EquipmentRepository equipmentRepository,
                             generation.grimoire.repository.auth.UserRepository userRepository) {
        this.persoRepo = persoRepo;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    public Personnage findByIdOrThrow(@org.springframework.lang.NonNull Long id) {
        return persoRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Personnage non trouvé : " + id));
    }

    public java.util.List<Personnage> findAll() {
        return persoRepo.findAll();
    }

    public java.util.List<Personnage> findByUserUsername(String username) {
        return persoRepo.findByUser_Username(username);
    }

    public boolean isEligibleForCatchupXp(Personnage p, generation.grimoire.model.pve.CombatSession session) {
        if (session == null || p == null) return false;
        
        // Rule 1: No character in combat is level 5 or above
        for (Personnage fighter : session.getPlayers()) {
            if (fighter.getVoieLevel() >= 5) {
                return false;
            }
        }
        
        // Rule 2: Must have at least 2 characters on the account with strictly more XP
        if (p.getUser() == null || p.getUser().getUsername() == null) return false;
        
        java.util.List<Personnage> accountPersos = persoRepo.findByUser_Username(p.getUser().getUsername());
        long higherLevelCount = accountPersos.stream()
                .filter(other -> other.getExperience() > p.getExperience())
                .count();
                
        return higherLevelCount >= 2;
    }

    public Personnage save(@org.springframework.lang.NonNull Personnage personnage) {
        boolean userUpdated = false;
        generation.grimoire.entity.auth.AppUser user = personnage.getUser();
        if (user != null) {
            if (personnage.getVoie() != null) {
                Long voieId = personnage.getVoie().getId();
                int currentMax = user.getUnlockedVoieLevels().getOrDefault(voieId, 0);
                if (personnage.getVoieLevel() > currentMax) {
                    user.getUnlockedVoieLevels().put(voieId, personnage.getVoieLevel());
                    userUpdated = true;
                }
            }
            if (personnage.getSpiritualite() != null) {
                Long spiritId = personnage.getSpiritualite().getId();
                int currentMax = user.getUnlockedSpiritualiteLevels().getOrDefault(spiritId, 0);
                if (personnage.getSpiritualiteLevel() > currentMax) {
                    user.getUnlockedSpiritualiteLevels().put(spiritId, personnage.getSpiritualiteLevel());
                    userUpdated = true;
                }
            }
            if (userUpdated) {
                userRepository.save(user);
            }
        }
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
