package generation.grimoire.service.pve;

import generation.grimoire.dto.pve.DonjonSummaryDTO;
import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.repository.pve.DonjonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service gérant le tutoriel caché de progression dans les donjons libres pour un nouveau compte.
 * <p>
 * Règles :
 * 1. Début : seul le 1er donjon libre (index 0) est visible.
 * 2. Victoire sur le 1er donjon : débloque les 2 combats suivants (index 0..2, total 3 visibles).
 * 3. Victoire sur les 3 donjons visibles : débloque les 3 combats suivants (index 0..5, total 6 visibles).
 * 4. Victoire sur les 6 donjons : débloque les 3 combats suivants (index 0..8, total 9 visibles),
 *    avec contournement du niveau requis pour ces 3 donjons de niveau 2 (bypassLevelRequirement = true).
 * 5. Victoire sur les 3 donjons de niveau 2 (total 9 donjons terminés) : fin du tutoriel,
 *    toutes les contraintes sont levées et l'affichage normal selon le niveau s'applique.
 */
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DungeonTutorialService {

    private final DonjonRepository donjonRepository;

    /**
     * Indique si l'utilisateur a terminé le tutoriel des donjons libres.
     */
    public boolean isTutorialCompleted(AppUser user, List<Donjon> freeDungeons) {
        if (user == null || freeDungeons == null || freeDungeons.isEmpty()) {
            return true;
        }

        Set<Long> completedIds = user.getCompletedDungeons() != null ? user.getCompletedDungeons() : Collections.emptySet();
        int n = freeDungeons.size();

        if (n <= 9) {
            Set<Long> allFreeIds = freeDungeons.stream().map(Donjon::getId).collect(Collectors.toSet());
            return completedIds.containsAll(allFreeIds);
        }

        Set<Long> tier3Ids = freeDungeons.subList(0, 9).stream().map(Donjon::getId).collect(Collectors.toSet());
        Set<Long> higherFreeIds = freeDungeons.subList(9, n).stream().map(Donjon::getId).collect(Collectors.toSet());

        // A terminé les 9 premiers donjons OU a déjà complété un donjon libre supérieur (anciens comptes)
        return completedIds.containsAll(tier3Ids) || higherFreeIds.stream().anyMatch(completedIds::contains);
    }

    /**
     * Retourne la liste des IDs des donjons libres visibles pour le joueur selon son étape de tutoriel.
     * Retourne null si le tutoriel est terminé (ce qui signifie que tous les donjons libres sont visibles).
     */
    public Set<Long> getVisibleTutorialFreeDungeonIds(AppUser user, List<Donjon> freeDungeons) {
        if (isTutorialCompleted(user, freeDungeons)) {
            return null;
        }

        Set<Long> completedIds = user.getCompletedDungeons() != null ? user.getCompletedDungeons() : Collections.emptySet();
        int n = freeDungeons.size();

        Set<Long> tier1Ids = freeDungeons.subList(0, Math.min(3, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        Set<Long> tier2Ids = freeDungeons.subList(0, Math.min(6, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        Long firstDungeonId = freeDungeons.get(0).getId();

        if (n > 6 && completedIds.containsAll(tier2Ids)) {
            // Étape 3 : 6 gagnés -> 9 visibles
            return freeDungeons.subList(0, Math.min(9, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        } else if (n > 3 && completedIds.containsAll(tier1Ids)) {
            // Étape 2 : 3 gagnés -> 6 visibles
            return freeDungeons.subList(0, Math.min(6, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        } else if (completedIds.contains(firstDungeonId)) {
            // Étape 1 : 1er combat gagné -> 3 visibles (le 1er + les 2 suivants)
            return freeDungeons.subList(0, Math.min(3, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        } else {
            // Étape 0 : Arrivée débutant -> 1 seul donjon visible
            return Collections.singleton(firstDungeonId);
        }
    }

    /**
     * Vérifie si un donjon est accessible pour le joueur selon les règles du tutoriel.
     */
    public boolean isDungeonAccessible(AppUser user, Donjon dungeon) {
        if (dungeon == null) return false;
        // Les donjons secrets ont leur propre système de déverrouillage
        if (dungeon.getRequiredSecret() != null && !dungeon.getRequiredSecret().trim().isEmpty()) {
            return true;
        }

        List<Donjon> freeDungeons = getSortedFreeDungeons();
        Set<Long> visibleIds = getVisibleTutorialFreeDungeonIds(user, freeDungeons);
        if (visibleIds == null) {
            return true;
        }
        return visibleIds.contains(dungeon.getId());
    }

    /**
     * Vérifie si le prérequis de niveau du donjon est contourné (étape 3 du tutoriel : donjons 6..8 de niveau 2).
     */
    public boolean isLevelBypassed(AppUser user, Long dungeonId) {
        if (user == null || dungeonId == null) return false;

        List<Donjon> freeDungeons = getSortedFreeDungeons();
        if (isTutorialCompleted(user, freeDungeons)) {
            return false;
        }

        int n = freeDungeons.size();
        if (n < 7) return false;

        Set<Long> stage3BypassIds = freeDungeons.subList(6, Math.min(9, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        if (!stage3BypassIds.contains(dungeonId)) {
            return false;
        }

        Set<Long> completedIds = user.getCompletedDungeons() != null ? user.getCompletedDungeons() : Collections.emptySet();
        Set<Long> tier2Ids = freeDungeons.subList(0, Math.min(6, n)).stream().map(Donjon::getId).collect(Collectors.toSet());

        return completedIds.containsAll(tier2Ids);
    }

    /**
     * Filtre et configure les DTO de résumé pour le frontend selon l'étape de tutoriel du joueur.
     */
    public List<DonjonSummaryDTO> applyTutorialRules(List<DonjonSummaryDTO> summaries, AppUser user) {
        if (summaries == null || summaries.isEmpty()) return Collections.emptyList();

        List<Donjon> freeDungeons = getSortedFreeDungeons();
        Set<Long> visibleIds = getVisibleTutorialFreeDungeonIds(user, freeDungeons);

        if (visibleIds == null) {
            return summaries;
        }

        int n = freeDungeons.size();
        Set<Long> stage3BypassIds = (n > 6)
                ? freeDungeons.subList(6, Math.min(9, n)).stream().map(Donjon::getId).collect(Collectors.toSet())
                : Collections.emptySet();

        Set<Long> completedIds = user != null && user.getCompletedDungeons() != null ? user.getCompletedDungeons() : Collections.emptySet();
        Set<Long> tier2Ids = freeDungeons.subList(0, Math.min(6, n)).stream().map(Donjon::getId).collect(Collectors.toSet());
        boolean inStage3 = completedIds.containsAll(tier2Ids);

        List<DonjonSummaryDTO> result = new ArrayList<>();
        for (DonjonSummaryDTO s : summaries) {
            boolean isSecret = s.getRequiredSecret() != null && !s.getRequiredSecret().trim().isEmpty();
            if (isSecret) {
                result.add(s);
            } else if (visibleIds.contains(s.getId())) {
                s.setBypassLevelRequirement(inStage3 && stage3BypassIds.contains(s.getId()));
                result.add(s);
            }
        }
        return result;
    }

    public List<Donjon> getSortedFreeDungeons() {
        return donjonRepository.findAllByOrderByDisplayOrderAsc().stream()
                .filter(d -> d.getRequiredSecret() == null || d.getRequiredSecret().trim().isEmpty())
                .sorted(Comparator.comparingInt(Donjon::getDisplayOrder).thenComparing(Donjon::getId))
                .toList();
    }
}
