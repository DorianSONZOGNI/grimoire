package generation.grimoire.service;

import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.entity.Anomalie;
import generation.grimoire.entity.Equipment;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.enumeration.EquipmentSlot;
import generation.grimoire.enumeration.RecipeRewardType;
import generation.grimoire.repository.AlchemyRecipeRepository;
import generation.grimoire.repository.AnomalieRepository;
import generation.grimoire.repository.EquipmentRepository;
import generation.grimoire.repository.auth.UserRepository;
import generation.grimoire.repository.PersonnageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AlchemyService {

    private final AlchemyRecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final PersonnageRepository personnageRepository;
    private final AnomalieRepository anomalieRepository;
    private final EquipmentRepository equipmentRepository;

    public AlchemyService(AlchemyRecipeRepository recipeRepository,
                          UserRepository userRepository,
                          PersonnageRepository personnageRepository,
                          AnomalieRepository anomalieRepository,
                          EquipmentRepository equipmentRepository) {
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
        this.personnageRepository = personnageRepository;
        this.anomalieRepository = anomalieRepository;
        this.equipmentRepository = equipmentRepository;
    }

    public List<AlchemyRecipe> getAllRecipes() {
        return recipeRepository.findAll();
    }

    public AlchemyRecipe saveRecipe(AlchemyRecipe recipe) {
        return recipeRepository.save(java.util.Objects.requireNonNull(recipe));
    }

    public void deleteRecipe(Long id) {
        recipeRepository.deleteById(java.util.Objects.requireNonNull(id));
    }

    @Transactional
    public String craftRecipe(String username, Long recipeId, Long crafterPersonnageId, List<Long> anomalieIds, List<Long> consumableIds) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        AlchemyRecipe recipe = recipeRepository.findById(java.util.Objects.requireNonNull(recipeId))
                .orElseThrow(() -> new RuntimeException("Recette introuvable"));

        // Vérification de la progression des secrets si la recette débloque un secret
        if (recipe.getRewardType() == generation.grimoire.enumeration.RecipeRewardType.UNLOCK_FEATURE) {
            int currentLevel = user.getUnlockedSecrets().getOrDefault(recipe.getRewardName(), 0);
            if (currentLevel >= recipe.getRewardLevel()) {
                throw new RuntimeException("Vous possédez déjà ce niveau de secret.");
            }
            if (currentLevel < recipe.getRewardLevel() - 1) {
                throw new RuntimeException("Vous devez d'abord débloquer le niveau précédent de ce secret.");
            }
        }

        // Vérification et déduction de l'Or
        if (recipe.getCostGold() > 0) {
            if (user.getMonnaie() < recipe.getCostGold()) {
                throw new RuntimeException("Fonds insuffisants en Or.");
            }
            user.setMonnaie(user.getMonnaie() - recipe.getCostGold());
        }

        // Vérification et déduction de l'XP de spiritualité
        if (recipe.getCostSpiritXp() > 0) {
            if (crafterPersonnageId == null) {
                throw new RuntimeException("Un personnage doit être sélectionné pour dépenser de l'XP de spiritualité.");
            }
            Personnage crafter = personnageRepository.findById(crafterPersonnageId)
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));

            if (!crafter.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Ce personnage ne vous appartient pas.");
            }

            if (crafter.getSpiritualiteExperience() < recipe.getCostSpiritXp()) {
                throw new RuntimeException("Expérience de spiritualité insuffisante pour ce personnage.");
            }
            crafter.setSpiritualiteExperience((int) (crafter.getSpiritualiteExperience() - recipe.getCostSpiritXp()));
            personnageRepository.save(crafter);
        }

        // Vérification et consommation des Anomalies
        if (recipe.getRequiredAnomalies() != null && !recipe.getRequiredAnomalies().isEmpty()) {
            List<Anomalie> userAnomalies = anomalieRepository.findByOwnerUsername(username);
            List<Anomalie> toDeleteAnomalies = new ArrayList<>();

            for (Map.Entry<String, Integer> entry : recipe.getRequiredAnomalies().entrySet()) {
                String requiredName = entry.getKey();
                int requiredQty = entry.getValue();
                
                List<Anomalie> matchingProvided = anomalieIds.stream()
                        .map(id -> userAnomalies.stream().filter(a -> a.getId().equals(id)).findFirst().orElse(null))
                        .filter(a -> a != null && a.getName().equalsIgnoreCase(requiredName))
                        .toList();
                        
                if (matchingProvided.size() < requiredQty) {
                    throw new RuntimeException("Veuillez sélectionner " + requiredQty + "x " + requiredName + ".");
                }
                
                boolean isAdmin = "ADMIN".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole());
                long totalOwned = isAdmin ? userAnomalies.stream().filter(a -> a.getName().equalsIgnoreCase(requiredName)).count() : 0;
                
                int itemsToDelete = requiredQty;
                if (isAdmin && (totalOwned - requiredQty < 1)) {
                    itemsToDelete = Math.max(0, (int)totalOwned - 1);
                }
                
                for (int i = 0; i < itemsToDelete; i++) {
                    Anomalie a = matchingProvided.get(i);
                    toDeleteAnomalies.add(a);
                    anomalieIds.remove(a.getId()); // Évite de réutiliser la même instance
                }
            }
            anomalieRepository.deleteAll(toDeleteAnomalies);
        }

        // Vérification et consommation des Consommables
        if (recipe.getRequiredConsumables() != null && !recipe.getRequiredConsumables().isEmpty()) {
            List<Equipment> userEquipments = equipmentRepository.findByOwnerUsername(username);
            List<Equipment> toDeleteConsumables = new ArrayList<>();

            for (Map.Entry<String, Integer> entry : recipe.getRequiredConsumables().entrySet()) {
                String requiredName = entry.getKey();
                int requiredQty = entry.getValue();

                List<Equipment> matchingProvided = consumableIds.stream()
                        .map(id -> userEquipments.stream().filter(e -> e.getId().equals(id)).findFirst().orElse(null))
                        .filter(e -> e != null && e.getSlot() == EquipmentSlot.CONSOMMABLE && e.getName().equalsIgnoreCase(requiredName))
                        .toList();

                if (matchingProvided.size() < requiredQty) {
                    throw new RuntimeException("Veuillez sélectionner " + requiredQty + "x " + requiredName + ".");
                }

                boolean isAdmin = "ADMIN".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole());
                long totalOwned = isAdmin ? userEquipments.stream().filter(e -> e.getSlot() == EquipmentSlot.CONSOMMABLE && e.getName().equalsIgnoreCase(requiredName)).count() : 0;
                
                int itemsToDelete = requiredQty;
                if (isAdmin && (totalOwned - requiredQty < 1)) {
                    itemsToDelete = Math.max(0, (int)totalOwned - 1);
                }

                for (int i = 0; i < itemsToDelete; i++) {
                    Equipment e = matchingProvided.get(i);
                    toDeleteConsumables.add(e);
                    consumableIds.remove(e.getId());
                }
            }
            equipmentRepository.deleteAll(toDeleteConsumables);
        }

        userRepository.save(java.util.Objects.requireNonNull(user));

        // Attribution de la récompense
        return giveReward(username, recipe, crafterPersonnageId);
    }

    private String giveReward(String username, AlchemyRecipe recipe, Long crafterPersonnageId) {
        if (recipe.getRewardType() == RecipeRewardType.GIVE_ANOMALY) {
            for (int i = 0; i < recipe.getRewardQuantity(); i++) {
                Anomalie anomaly = new Anomalie();
                anomaly.setName(recipe.getRewardName());
                anomaly.setOwnerUsername(username);
                anomaly.setLevel(recipe.getRewardLevel());
                
                // Cherche un template existant pour copier la spiritualité et la catégorie
                Anomalie template = anomalieRepository.findFirstByName(recipe.getRewardName());
                if (template != null) {
                    anomaly.setSpiritualite(template.getSpiritualite());
                    anomaly.setCategory(template.getCategory());
                } else {
                    anomaly.setSpiritualite(generation.grimoire.enumeration.SpiritualiteType.KARMA); 
                    anomaly.setCategory(generation.grimoire.enumeration.AnomalieCategory.AUTRE);
                }
                
                anomalieRepository.save(anomaly);
            }
            return "Vous avez obtenu " + recipe.getRewardQuantity() + "x Anomalie : " + recipe.getRewardName();
        } else if (recipe.getRewardType() == RecipeRewardType.GIVE_CONSUMABLE) {
            Equipment template = equipmentRepository.findFirstByName(recipe.getRewardName());
            for (int i = 0; i < recipe.getRewardQuantity(); i++) {
                Equipment consumable = new Equipment();
                consumable.setName(recipe.getRewardName());
                consumable.setOwnerUsername(username);
                consumable.setSlot(EquipmentSlot.CONSOMMABLE);
                if (template != null) {
                    consumable.setRarity(template.getRarity());
                    consumable.setSpecialEffect(template.getSpecialEffect());
                    consumable.setSpecialEffectValue(template.getSpecialEffectValue());
                    consumable.setBonusHealthMax(template.getBonusHealthMax());
                    consumable.setBonusManaMax(template.getBonusManaMax());
                    consumable.setBonusPower(template.getBonusPower());
                    consumable.setBonusStrength(template.getBonusStrength());
                    consumable.setBonusArmor(template.getBonusArmor());
                    consumable.setBonusResistance(template.getBonusResistance());
                    consumable.setBonusSpeed(template.getBonusSpeed());
                    consumable.setBonusCrit(template.getBonusCrit());
                    consumable.setRegenHealthPerTurn(template.getRegenHealthPerTurn());
                    consumable.setRegenManaPerTurn(template.getRegenManaPerTurn());
                    consumable.setBaseWeight(template.getBaseWeight());
                    consumable.setConsumableHpPercent(template.getConsumableHpPercent());
                    consumable.setConsumableManaPercent(template.getConsumableManaPercent());
                    consumable.setConsumableMissingHpPercent(template.getConsumableMissingHpPercent());
                    consumable.setConsumableMissingManaPercent(template.getConsumableMissingManaPercent());
                }
                equipmentRepository.save(consumable);
            }
            return "Vous avez obtenu " + recipe.getRewardQuantity() + "x Consommable : " + recipe.getRewardName();
        } else if (recipe.getRewardType() == RecipeRewardType.UPGRADE_ANOMALY) {
            // Dans ce MVP, on crée directement une anomalie d'un niveau supérieur 
            // (vu qu'on vient de consommer l'anomalie de base comme ingrédient)
            Anomalie upgraded = new Anomalie();
            upgraded.setName(recipe.getRewardName());
            upgraded.setOwnerUsername(username);
            upgraded.setLevel(recipe.getRewardLevel());
            
            Anomalie template = anomalieRepository.findFirstByName(recipe.getRewardName());
            if (template != null) {
                upgraded.setSpiritualite(template.getSpiritualite());
                upgraded.setCategory(template.getCategory());
            } else {
                upgraded.setSpiritualite(generation.grimoire.enumeration.SpiritualiteType.KARMA);
                upgraded.setCategory(generation.grimoire.enumeration.AnomalieCategory.AUTRE);
            }
            
            anomalieRepository.save(upgraded);
            return "Vous avez amélioré une anomalie en : " + recipe.getRewardName() + " (Niv. " + recipe.getRewardLevel() + ")";
        } else if (recipe.getRewardType() == RecipeRewardType.UNLOCK_FEATURE) {
            AppUser user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                user.getUnlockedSecrets().put(recipe.getRewardName(), recipe.getRewardLevel());
                userRepository.save(user);
            }
            return "Vous avez débloqué le secret : " + recipe.getRewardName();
        } else if (recipe.getRewardType() == RecipeRewardType.GIVE_SPIRIT_XP) {
            if (crafterPersonnageId == null) {
                throw new RuntimeException("Un personnage doit être sélectionné pour recevoir l'XP de spiritualité.");
            }
            Personnage crafter = personnageRepository.findById(crafterPersonnageId)
                    .orElseThrow(() -> new RuntimeException("Personnage introuvable"));
            
            crafter.setSpiritualiteExperience(crafter.getSpiritualiteExperience() + recipe.getRewardQuantity());
            personnageRepository.save(crafter);
            return "Le personnage " + crafter.getName() + " a gagné " + recipe.getRewardQuantity() + " XP de Spiritualité.";
        }

        return "Transmutation réussie : " + recipe.getRewardName();
    }
}
