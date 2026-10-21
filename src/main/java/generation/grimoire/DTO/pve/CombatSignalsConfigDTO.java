package generation.grimoire.dto.pve;

import generation.grimoire.enumeration.CombatSignalAction;
import java.util.List;

public record CombatSignalsConfigDTO(
    List<CombatSignalAction> mobActions,
    List<CombatSignalAction> heroActions,
    List<CombatSignalAction> emoteActions
) {}
