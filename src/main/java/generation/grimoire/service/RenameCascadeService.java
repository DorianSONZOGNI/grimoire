package generation.grimoire.service;

import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.LootEntry;
import generation.grimoire.entity.pve.Monstre;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RecipeRewardType;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.pve.DonjonRepository;
import generation.grimoire.repository.pve.LootEntryRepository;
import generation.grimoire.repository.pve.MonstreRepository;
import generation.grimoire.repository.pve.SalleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RenameCascadeService {

    private final AlchemyService alchemyService;
    private final EquipmentRepository equipmentRepository;
    private final DonjonRepository donjonRepository;
    private final MonstreRepository monstreRepository;
    private final SalleRepository salleRepository;
    private final LootEntryRepository lootEntryRepository;

    public RenameCascadeService(AlchemyService alchemyService,
                                EquipmentRepository equipmentRepository,
                                DonjonRepository donjonRepository,
                                MonstreRepository monstreRepository,
                                SalleRepository salleRepository,
                                LootEntryRepository lootEntryRepository) {
        this.alchemyService = alchemyService;
        this.equipmentRepository = equipmentRepository;
        this.donjonRepository = donjonRepository;
        this.monstreRepository = monstreRepository;
        this.salleRepository = salleRepository;
        this.lootEntryRepository = lootEntryRepository;
    }

    /**
     * Repercute le changement de nom d'une anomalie sur toutes les autres tables.
     */
    public void cascadeAnomalyRename(String oldName, String newName) {
        if (oldName == null || oldName.isEmpty() || oldName.equals(newName)) return;

        // 1. Alchemy Recipes
        List<AlchemyRecipe> allRecipes = alchemyService.getAllRecipes();
        for (AlchemyRecipe r : allRecipes) {
            boolean modified = false;
            if (RecipeRewardType.GIVE_ANOMALY.equals(r.getRewardType()) && oldName.equals(r.getRewardName())) {
                r.setRewardName(newName);
                modified = true;
            }
            if (r.getRequiredAnomalies() != null && r.getRequiredAnomalies().containsKey(oldName)) {
                Integer qty = r.getRequiredAnomalies().remove(oldName);
                r.getRequiredAnomalies().put(newName, qty);
                modified = true;
            }
            if (modified) {
                alchemyService.saveRecipe(r);
            }
        }

        // 2. Equipment (priceAnomalies)
        List<Equipment> allEquipments = equipmentRepository.findAll();
        for (Equipment eq : allEquipments) {
            if (eq.getPriceAnomalies() != null && eq.getPriceAnomalies().containsKey(oldName)) {
                Integer qty = eq.getPriceAnomalies().remove(oldName);
                eq.getPriceAnomalies().put(newName, qty);
                equipmentRepository.save(eq);
            }
        }

        // 3. Donjons (requiredSecret)
        List<Donjon> donjons = donjonRepository.findAll();
        for (Donjon d : donjons) {
            if (oldName.equals(d.getRequiredSecret())) {
                d.setRequiredSecret(newName);
                donjonRepository.save(d);
            }
        }

        // 4. Monstres (nativeSecret)
        List<Monstre> monstres = monstreRepository.findAll();
        for (Monstre m : monstres) {
            if (oldName.equals(m.getNativeSecret())) {
                m.setNativeSecret(newName);
                monstreRepository.save(m);
            }
        }

        // 5. LootEntry (specialItemName, priceSpecialItemName)
        List<LootEntry> lootEntries = lootEntryRepository.findAll();
        for (LootEntry le : lootEntries) {
            boolean modified = false;
            if (oldName.equals(le.getSpecialItemName())) {
                le.setSpecialItemName(newName);
                modified = true;
            }
            if (oldName.equals(le.getPriceSpecialItemName())) {
                le.setPriceSpecialItemName(newName);
                modified = true;
            }
            if (modified) {
                lootEntryRepository.save(le);
            }
        }

        // 6. Salle (alterationSpecialItemReward, alterationRequiredItem)
        List<Salle> salles = salleRepository.findAll();
        for (Salle s : salles) {
            boolean modified = false;
            if (oldName.equals(s.getAlterationSpecialItemReward())) {
                s.setAlterationSpecialItemReward(newName);
                modified = true;
            }
            if (oldName.equals(s.getAlterationRequiredItem())) {
                s.setAlterationRequiredItem(newName);
                modified = true;
            }
            if (modified) {
                salleRepository.save(s);
            }
        }
    }

    /**
     * Repercute le changement de nom d'un équipement/consommable sur toutes les autres tables.
     */
    public void cascadeEquipmentRename(String oldName, String newName) {
        if (oldName == null || oldName.isEmpty() || oldName.equals(newName)) return;

        // 1. Alchemy Recipes
        List<AlchemyRecipe> allRecipes = alchemyService.getAllRecipes();
        for (AlchemyRecipe r : allRecipes) {
            boolean modified = false;
            if (RecipeRewardType.GIVE_EQUIPMENT.equals(r.getRewardType()) && oldName.equals(r.getRewardName())) {
                r.setRewardName(newName);
                modified = true;
            }
            if (r.getRequiredConsumables() != null && r.getRequiredConsumables().containsKey(oldName)) {
                Integer qty = r.getRequiredConsumables().remove(oldName);
                r.getRequiredConsumables().put(newName, qty);
                modified = true;
            }
            if (modified) {
                alchemyService.saveRecipe(r);
            }
        }

        // 2. LootEntry (specialItemName, priceSpecialItemName)
        List<LootEntry> lootEntries = lootEntryRepository.findAll();
        for (LootEntry le : lootEntries) {
            boolean modified = false;
            if (oldName.equals(le.getSpecialItemName())) {
                le.setSpecialItemName(newName);
                modified = true;
            }
            if (oldName.equals(le.getPriceSpecialItemName())) {
                le.setPriceSpecialItemName(newName);
                modified = true;
            }
            if (modified) {
                lootEntryRepository.save(le);
            }
        }

        // 3. Salle (alterationSpecialItemReward, alterationRequiredItem)
        List<Salle> salles = salleRepository.findAll();
        for (Salle s : salles) {
            boolean modified = false;
            if (oldName.equals(s.getAlterationSpecialItemReward())) {
                s.setAlterationSpecialItemReward(newName);
                modified = true;
            }
            if (oldName.equals(s.getAlterationRequiredItem())) {
                s.setAlterationRequiredItem(newName);
                modified = true;
            }
            if (modified) {
                salleRepository.save(s);
            }
        }
    }
}
