package generation.grimoire.controller;

import generation.grimoire.dto.alchemy.AlchemyRecipeRequestDTO;
import generation.grimoire.dto.alchemy.CraftRequestDTO;
import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.mapper.AlchemyRecipeMapper;
import generation.grimoire.service.AlchemyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alchemy")
public class AlchemyController {

    private final AlchemyService alchemyService;
    private final AlchemyRecipeMapper alchemyRecipeMapper;

    public AlchemyController(AlchemyService alchemyService, AlchemyRecipeMapper alchemyRecipeMapper) {
        this.alchemyService = alchemyService;
        this.alchemyRecipeMapper = alchemyRecipeMapper;
    }

    @GetMapping("/recipes")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<AlchemyRecipe>> getAllRecipes(org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            generation.grimoire.entity.auth.AppUser user = alchemyService.findUserByUsername(authentication.getName());
            if (user != null) {
                return ResponseEntity.ok(alchemyService.getDiscoveredRecipes(user));
            }
        }
        return ResponseEntity.ok(alchemyService.getAllRecipes());
    }

    @PostMapping("/craft/{recipeId}")
    public ResponseEntity<?> craftRecipe(@PathVariable Long recipeId, 
                                         @RequestBody(required = false) CraftRequestDTO request,
                                         Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Non autorisé");
        }
        
        try {
            Long persoId = request != null ? request.getPersonnageId() : null;
            List<Long> anoms = request != null && request.getAnomalieIds() != null ? request.getAnomalieIds() : List.of();
            List<Long> cons = request != null && request.getConsumableIds() != null ? request.getConsumableIds() : List.of();
            
            String resultMessage = alchemyService.craftRecipe(authentication.getName(), recipeId, persoId, anoms, cons);
            return ResponseEntity.ok(resultMessage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/recipes/{recipeId}/seen")
    public ResponseEntity<?> markRecipeAsSeen(@PathVariable Long recipeId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Non autorisé");
        }
        try {
            alchemyService.markRecipeAsSeen(authentication.getName(), recipeId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- ADMIN ENDPOINTS ---

    @GetMapping("/admin/recipes")
    public ResponseEntity<?> getAllRecipesAdmin(Authentication authentication) {
        if (authentication == null || !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"))) {
            return ResponseEntity.status(403).body("Accès refusé");
        }
        return ResponseEntity.ok(alchemyService.getAllRecipes());
    }

    @PostMapping("/admin/recipe")
    public ResponseEntity<?> createRecipe(@RequestBody AlchemyRecipeRequestDTO dto, Authentication authentication) {
        if (authentication == null || !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"))) {
            return ResponseEntity.status(403).body("Accès refusé");
        }
        try {
            AlchemyRecipe recipe = alchemyRecipeMapper.toEntity(dto);
            return ResponseEntity.ok(alchemyService.saveRecipe(recipe));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/admin/recipe/{id}")
    public ResponseEntity<?> deleteRecipe(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"))) {
            return ResponseEntity.status(403).body("Accès refusé");
        }
        try {
            alchemyService.deleteRecipe(id);
            return ResponseEntity.ok("Recette supprimée");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
