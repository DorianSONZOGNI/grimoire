package generation.grimoire.dto.pve;

import generation.grimoire.enumeration.CombatSignalAction;

public record CombatSignalRequest(
    CombatSignalAction action,
    Integer targetIndex,
    String targetName
) {}
