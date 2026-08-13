package generation.grimoire;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class GrimoireApplication {

	public static void main(String[] args) {
		SpringApplication.run(GrimoireApplication.class, args);
	}

	@org.springframework.context.annotation.Bean
	public org.springframework.boot.ApplicationRunner initDatabase(generation.grimoire.repository.EquipmentRepository equipmentRepository) {
		return args -> {
			java.util.List<generation.grimoire.entity.Equipment> allEquipments = equipmentRepository.findAll();
			boolean updated = false;
			for (generation.grimoire.entity.Equipment eq : allEquipments) {
				if (eq.getPersonnage() == null) {
					if (eq.getSlot() == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_GAUCHE || eq.getSlot() == generation.grimoire.enumeration.EquipmentSlot.ANNEAU_DROIT) {
						eq.setSlot(generation.grimoire.enumeration.EquipmentSlot.ANNEAU);
						equipmentRepository.save(eq);
						updated = true;
					}
				} else {
					if (eq.getSlot() == generation.grimoire.enumeration.EquipmentSlot.ANNEAU) {
						eq.setPersonnage(null);
						equipmentRepository.save(eq);
						updated = true;
					}
				}
			}
			if (updated) {
				System.out.println("Migrated unassigned left/right rings to generic ANNEAU and cleaned up invalid equipped rings.");
			}
		};
	}

}
