package generation.grimoire.service;

import generation.grimoire.entity.Voie;
import generation.grimoire.repository.VoieRepository;
import org.springframework.stereotype.Service;

@Service
public class VoieService {

    private final VoieRepository voieRepository;

    public VoieService(VoieRepository voieRepository) {
        this.voieRepository = voieRepository;
    }

    public void saveSpell(Voie voie) {
        voieRepository.save(voie);
    }
}
