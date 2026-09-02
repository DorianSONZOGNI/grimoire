package generation.grimoire.dto.spell;

import generation.grimoire.enumeration.SpellCastingType;
import generation.grimoire.enumeration.Source;
import generation.grimoire.enumeration.KarmaAlignment;
import generation.grimoire.enumeration.EffectTarget;
import generation.grimoire.enumeration.DamageType;
import generation.grimoire.enumeration.StatType;
import generation.grimoire.enumeration.DetachedSoulRequirement;
import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Data
public class SpellCreationRequestDTO {
    private Long id;
    private String nom;
    private int niveau = 1;
    private SpellCastingType castingType;
    private String description;
    private int manaCost;
    private int percentManaCost;
    private Source percentManaCostSource;
    private int healCost;
    private int percentHealCost;
    private Source percentHealCostSource;
    private int heatCost;
    private int percentHeatCost;
    private int seedCost;
    private int heatGenerated;
    private Long voieId;
    private Long spiritualiteId;
    private Long mutationId;
    private int channelingDuration;
    private boolean allowInstantDuringChanneling = true;
    private boolean inspiration;
    private KarmaAlignment karmaAlignment;
    private List<EffectCreationDTO> effects = new ArrayList<>();

    @Data
    public static class EffectCreationDTO {
        private String effectType;
        private EffectTarget effectTarget = EffectTarget.TARGET;
        private int damage;
        private int healAmount;
        private int manaAmount;
        private double percentage;
        private int flatValue;
        private double modifier;
        private int duration;
        private DamageType damageType;
        private StatType statAffected;
        private Source source;
        private Integer requiredChoiceKey;
        private DetachedSoulRequirement detachedSoulRequirement;
        private List<Integer> channelingTurns = new ArrayList<>();
    }
}
