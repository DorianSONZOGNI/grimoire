package generation.grimoire.controller;

import generation.grimoire.entity.AlchemyRecipe;
import generation.grimoire.service.AlchemyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alchemy")
public class AlchemyController {

    private final AlchemyService alchemyService;

    public AlchemyController(AlchemyService alchemyService) {
        this.alchemyService = alchemyService;
    }

    @GetMapping("/recipes")
    public ResponseEntity<List<AlchemyRecipe>> getAllRecipes() {
        return ResponseEntity.ok(alchemyService.getAllRecipes());
    }

    public static class CraftRequest {
        public Long personnageId;
        public List<Long> anomalieIds;
        public List<Long> consumableIds;
    }

    @PostMapping("/craft/{recipeId}")
    public ResponseEntity<?> craftRecipe(@PathVariable Long recipeId, 
                                         @RequestBody(required = false) CraftRequest request,
                                         Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Non autorisé");
        }
        
        try {
            Long persoId = request != null ? request.personnageId : null;
            List<Long> anoms = request != null && request.anomalieIds != null ? request.anomalieIds : List.of();
            List<Long> cons = request != null && request.consumableIds != null ? request.consumableIds : List.of();
            
            String resultMessage = alchemyService.craftRecipe(authentication.getName(), recipeId, persoId, anoms, cons);
            return ResponseEntity.ok(resultMessage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- ADMIN ENDPOINTS ---

    @PostMapping("/admin/recipe")
    public ResponseEntity<?> createRecipe(@RequestBody AlchemyRecipe recipe, Authentication authentication) {
        if (authentication == null || !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"))) {
            return ResponseEntity.status(403).body("Accès refusé");
        }
        try {
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
