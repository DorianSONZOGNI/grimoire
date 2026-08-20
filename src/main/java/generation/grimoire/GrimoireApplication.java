package generation.grimoire;

import generation.grimoire.entity.Equipment;
import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.repository.EquipmentRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.List;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class GrimoireApplication {

	public static void main(String[] args) {
		SpringApplication.run(GrimoireApplication.class, args);
	}

	// ------------------------------------------------------------------------
	// TODO(#12): Migration de base de données à l'arrache.
	// À remplacer par Flyway ou Liquibase dans le futur.
	// ------------------------------------------------------------------------
	@Bean
	public ApplicationRunner initDatabase(EquipmentRepository equipmentRepository) {
		return args -> {
			List<Equipment> allEquipments = equipmentRepository.findAll();
			boolean updated = false;
			for (Equipment eq : allEquipments) {
				if (eq.getPersonnage() == null) {
					if (eq.getSlot() == EquipmentSlot.ANNEAU_GAUCHE || eq.getSlot() == EquipmentSlot.ANNEAU_DROIT) {
						eq.setSlot(EquipmentSlot.ANNEAU);
						equipmentRepository.save(eq);
						updated = true;
					}
				} else {
					if (eq.getSlot() == EquipmentSlot.ANNEAU) {
						eq.setPersonnage(null);
						equipmentRepository.save(eq);
						updated = true;
					}
				}
			}
			if (updated) {
				System.out.println(
						"Migrated unassigned left/right rings to generic ANNEAU and cleaned up invalid equipped rings.");
			}
		};
	}

}
