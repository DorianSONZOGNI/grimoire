package generation.grimoire.controller.pve;

import generation.grimoire.dto.pve.DungeonGlobalStatDto;
import generation.grimoire.dto.pve.DungeonRunStatDto;
import generation.grimoire.dto.pve.DungeonStatsResponse;
import generation.grimoire.entity.pve.DungeonRunStat;
import generation.grimoire.enumeration.DungeonOutcome;
import generation.grimoire.repository.pve.DungeonRunStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pve/admin/stats")
@RequiredArgsConstructor
public class DungeonStatController {

    private final DungeonRunStatRepository repository;

    @GetMapping("/dungeons")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public DungeonStatsResponse getDungeonStats() {
        List<DungeonRunStat> stats = repository.findAll();
        
        List<DungeonRunStatDto> runDtos = new ArrayList<>();
        Map<String, DungeonGlobalStatDto> globalStats = new HashMap<>();

        for (DungeonRunStat stat : stats) {
            // Convert to DTO
            DungeonRunStatDto dto = new DungeonRunStatDto(
                    stat.getId(),
                    stat.getDungeonId(),
                    stat.getDungeonName(),
                    stat.getOutcome(),
                    stat.getVoieName(),
                    stat.getSpiritualiteName(),
                    stat.getHeroLevel(),
                    stat.isMulti(),
                    stat.getRunNumber(),
                    stat.isDead(),
                    stat.getTimestamp()
            );
            runDtos.add(dto);

            // Compute global stats
            String key = stat.getDungeonId() + "_" + stat.getDungeonName();
            DungeonGlobalStatDto globalDto = globalStats.computeIfAbsent(key, k -> {
                DungeonGlobalStatDto newDto = new DungeonGlobalStatDto();
                newDto.setDungeonName(stat.getDungeonName());
                newDto.setClassPopularity(new HashMap<>());
                newDto.setSpiritualitePopularity(new HashMap<>());
                return newDto;
            });

            globalDto.setTotalRuns(globalDto.getTotalRuns() + 1);
            if (stat.getOutcome() == DungeonOutcome.VICTORY) globalDto.setTotalVictories(globalDto.getTotalVictories() + 1);
            else if (stat.getOutcome() == DungeonOutcome.DEFEAT) globalDto.setTotalDefeats(globalDto.getTotalDefeats() + 1);
            else if (stat.getOutcome() == DungeonOutcome.FLEE) globalDto.setTotalFlees(globalDto.getTotalFlees() + 1);
            else if (stat.getOutcome() == DungeonOutcome.TIMEOUT) globalDto.setTotalTimeouts(globalDto.getTotalTimeouts() + 1);
            
            if (stat.isDead()) globalDto.setTotalDeaths(globalDto.getTotalDeaths() + 1);

            if (stat.getVoieName() != null) {
                globalDto.getClassPopularity().merge(stat.getVoieName(), 1L, (a, b) -> a + b);
            }
            if (stat.getSpiritualiteName() != null) {
                globalDto.getSpiritualitePopularity().merge(stat.getSpiritualiteName(), 1L, (a, b) -> a + b);
            }
        }

        return new DungeonStatsResponse(runDtos, globalStats);
    }
}
