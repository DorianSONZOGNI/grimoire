package generation.grimoire.controller;

import generation.grimoire.dto.spell.SpellCreationRequestDTO;
import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.spell.type.effect.*;
import generation.grimoire.enumeration.*;
import generation.grimoire.mapper.SpellMapper;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import generation.grimoire.repository.pve.MutationRepository;
import generation.grimoire.service.SpellService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/spells-editor")
public class WebSpellCreationController {

    private final SpellService spellService;
    private final SpellRepository spellRepository;
    private final VoieRepository voieRepository;
    private final SpiritualiteRepository spiritualiteRepository;
    private final MutationRepository mutationRepository;
    private final SpellMapper spellMapper;


    public WebSpellCreationController(SpellService spellService,
            SpellRepository spellRepository,
            VoieRepository voieRepository,
            SpiritualiteRepository spiritualiteRepository,
            MutationRepository mutationRepository,
            SpellMapper spellMapper) {
        this.spellService = spellService;
        this.spellRepository = spellRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
        this.mutationRepository = mutationRepository;
        this.spellMapper = spellMapper;
    }

    @GetMapping("/meta")
    public ResponseEntity<Map<String, Object>> getCreationMeta() {
        Map<String, Object> meta = new HashMap<>();
        meta.put("voies", voieRepository.findAll());
        meta.put("spiritualites", spiritualiteRepository.findAll());
        meta.put("mutations", mutationRepository.findAll());
        meta.put("statTypes", StatType.values());
        meta.put("damageTypes", DamageType.values());
        meta.put("sources", Source.values());
        meta.put("effectTargets", EffectTarget.values());
        meta.put("castingTypes", SpellCastingType.values());

        List<Map<String, String>> effectTypes = List.of(
                Map.of("type", "FIXED_DAMAGE", "label", "Dégâts Fixes"),
                Map.of("type", "PERCENTAGE_DAMAGE", "label", "Dégâts en Pourcentage"),
                Map.of("type", "FIXED_HEAL", "label", "Soins Fixes"),
                Map.of("type", "PERCENTAGE_HEAL", "label", "Soins en Pourcentage"),
                Map.of("type", "FIXED_MANA", "label", "Régénération de Mana Fixe"),
                Map.of("type", "PERCENTAGE_MANA", "label", "Régénération de Mana en %"),
                Map.of("type", "BUFF_DEBUFF", "label", "Buff / Débuff"),
                Map.of("type", "DOT", "label", "Dégâts sur la durée (DoT)"),
                Map.of("type", "HOT", "label", "Soins sur la durée (HoT)"),
                Map.of("type", "MOT", "label", "Régénération de Mana continue (MoT)"),
                Map.of("type", "PURGE", "label", "Purge (Dissiper Bonus/Malus)"),
                Map.of("type", "SHIELD", "label", "Bouclier"));
        meta.put("effectTypes", effectTypes);

        return ResponseEntity.ok(meta);
    }

    @org.springframework.cache.annotation.Cacheable("allSpells")
    @GetMapping
    public ResponseEntity<List<Spell>> getAllCreatedSpells() {
        return ResponseEntity.ok(spellRepository.findAll());
    }

    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "allSpells", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spells", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellById", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellsByVariant", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellsByMutation", allEntries = true)
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteSpell(@PathVariable @org.springframework.lang.NonNull Long id) {
        if (spellRepository.existsById(id)) {
            spellRepository.deleteById(id);
            return ResponseEntity.ok("Sort supprimé avec succès.");
        }
        return ResponseEntity.notFound().build();
    }

    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "allSpells", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spells", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellById", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellsByVariant", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "spellsByMutation", allEntries = true)
    })
    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<String> createSpellPayload(@RequestBody SpellCreationRequestDTO dto) {
        Spell spell;
        boolean isUpdate = false;
        Long id = dto.getId();
        if (id != null && spellRepository.existsById(id)) {
            spell = spellRepository.findById(id).get();
            spell.getEffects().clear();
            
            // Map simple fields
            Spell temp = spellMapper.toEntity(dto);
            spell.setNom(temp.getNom());
            spell.setNiveau(temp.getNiveau());
            spell.setDescription(temp.getDescription());
            spell.setManaCost(temp.getManaCost());
            spell.setPercentManaCost(temp.getPercentManaCost());
            spell.setPercentManaCostSource(temp.getPercentManaCostSource());
            spell.setHealCost(temp.getHealCost());
            spell.setPercentHealCost(temp.getPercentHealCost());
            spell.setPercentHealCostSource(temp.getPercentHealCostSource());
            spell.setHeatCost(temp.getHeatCost());
            spell.setPercentHeatCost(temp.getPercentHeatCost());
            spell.setSeedCost(temp.getSeedCost());
            spell.setCastingType(temp.getCastingType());
            spell.setChannelingDuration(temp.getChannelingDuration());
            spell.setAllowInstantDuringChanneling(temp.isAllowInstantDuringChanneling());
            spell.setHeatGenerated(temp.getHeatGenerated());
            spell.setInspiration(temp.isInspiration());
            spell.setKarmaAlignment(temp.getKarmaAlignment());
            isUpdate = true;
        } else {
            spell = spellMapper.toEntity(dto);
        }
        
        if (spell.getKarmaAlignment() == null) {
            spell.setKarmaAlignment(generation.grimoire.enumeration.KarmaAlignment.NONE);
        }

        Long voieId = dto.getVoieId();
        if (voieId != null) {
            voieRepository.findById(voieId).ifPresent(spell::setVoie);
        } else {
            spell.setVoie(null);
        }

        // Mettre à jour la catégorie du sort si c'est la Voie de la Violence
        if (spell.getVoie() != null && "Voie de la Violence".equals(spell.getVoie().getNom())) {
            spell.setCategory(dto.isInspiration() ? SpellCategory.INSPIRATION : SpellCategory.EXPIRATION);
        } else {
            spell.setCategory(SpellCategory.NOTHING);
        }

        Long spiritualiteId = dto.getSpiritualiteId();
        if (spiritualiteId != null) {
            spiritualiteRepository.findById(spiritualiteId).ifPresent(spell::setSpiritualite);
        } else {
            spell.setSpiritualite(null);
        }

        Long mutationId = dto.getMutationId();
        if (mutationId != null) {
            mutationRepository.findById(mutationId).ifPresent(spell::setMutation);
        } else {
            spell.setMutation(null);
        }

        if (dto.getEffects() != null) {
            for (SpellCreationRequestDTO.EffectCreationDTO eDto : dto.getEffects()) {
                SpellEffect effect = null;
                switch (eDto.getEffectType()) {
                    case "FIXED_DAMAGE":
                        DamageFixedEffect dfe = new DamageFixedEffect();
                        dfe.setDamage(eDto.getDamage());
                        dfe.setDamageType(eDto.getDamageType() != null ? eDto.getDamageType() : DamageType.MAGIC);
                        effect = dfe;
                        break;
                    case "PERCENTAGE_DAMAGE":
                        DamagePercentageEffect dpe = new DamagePercentageEffect();
                        dpe.setPercentage(eDto.getPercentage());
                        dpe.setDamageSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        dpe.setDamageType(eDto.getDamageType() != null ? eDto.getDamageType() : DamageType.MAGIC);
                        effect = dpe;
                        break;
                    case "FIXED_HEAL":
                        HealFixedEffect hfe = new HealFixedEffect();
                        hfe.setHealAmount(eDto.getHealAmount());
                        effect = hfe;
                        break;
                    case "PERCENTAGE_HEAL":
                        HealPercentageEffect hpe = new HealPercentageEffect();
                        hpe.setPercentage(eDto.getPercentage());
                        hpe.setHealSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = hpe;
                        break;
                    case "FIXED_MANA":
                        ManaFixedEffect mfe = new ManaFixedEffect();
                        mfe.setManaAmount(eDto.getManaAmount());
                        effect = mfe;
                        break;
                    case "PERCENTAGE_MANA":
                        ManaPercentageEffect mpe = new ManaPercentageEffect();
                        mpe.setPercentage(eDto.getPercentage());
                        mpe.setManaSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = mpe;
                        break;
                    case "BUFF_DEBUFF":
                        BuffDebuffEffect bde = new BuffDebuffEffect();
                        bde.setStatAffected(eDto.getStatAffected());
                        bde.setFlatValue(eDto.getFlatValue());
                        bde.setModifier(eDto.getModifier());
                        bde.setDuration(eDto.getDuration());
                        bde.setModifierSource(eDto.getSource());
                        effect = bde;
                        break;
                    case "DOT":
                        DamageOverTimeEffect dot = new DamageOverTimeEffect();
                        dot.setFixedDamagePerTick(eDto.getDamage());
                        dot.setPercentageDamagePerTick(eDto.getPercentage());
                        dot.setDamageType(eDto.getDamageType() != null ? eDto.getDamageType() : DamageType.MAGIC);
                        dot.setDuration(eDto.getDuration());
                        dot.setDamageSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = dot;
                        break;
                    case "HOT":
                        HealOverTimeEffect hot = new HealOverTimeEffect();
                        hot.setFixedHealPerTick(eDto.getHealAmount());
                        hot.setPercentageHealPerTick(eDto.getPercentage());
                        hot.setDuration(eDto.getDuration());
                        hot.setHealSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = hot;
                        break;
                    case "MOT":
                        ManaOverTimeEffect mot = new ManaOverTimeEffect();
                        mot.setFixedManaPerTick(eDto.getManaAmount());
                        mot.setPercentageManaPerTick(eDto.getPercentage());
                        mot.setDuration(eDto.getDuration());
                        mot.setManaSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = mot;
                        break;
                    case "PURGE":
                        PurgeEffect purge = new PurgeEffect();
                        effect = purge;
                        break;
                    case "SHIELD":
                        ShieldEffect shield = new ShieldEffect();
                        shield.setFixedValue(eDto.getFlatValue());
                        shield.setPercentage(eDto.getPercentage());
                        shield.setDuration(eDto.getDuration());
                        shield.setShieldSource(
                                eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = shield;
                        break;
                    case "HEAT_FIXED":
                        generation.grimoire.entity.spell.type.effect.HeatFixedEffect heatFixed = new generation.grimoire.entity.spell.type.effect.HeatFixedEffect();
                        heatFixed.setAmount(eDto.getFlatValue());
                        effect = heatFixed;
                        break;
                    case "HEAT_PERCENTAGE":
                        generation.grimoire.entity.spell.type.effect.HeatPercentageEffect heatPercentage = new generation.grimoire.entity.spell.type.effect.HeatPercentageEffect();
                        heatPercentage.setPercentage(eDto.getPercentage());
                        heatPercentage
                                .setSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = heatPercentage;
                        break;
                    case "HEAT_OVER_TIME":
                        generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect hote = new generation.grimoire.entity.spell.type.effect.HeatOverTimeEffect();
                        hote.setFixedValue(eDto.getFlatValue());
                        hote.setPercentage(eDto.getPercentage());
                        hote.setDuration(eDto.getDuration());
                        hote.setSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = hote;
                        break;
                    case "BUD":
                        generation.grimoire.entity.spell.type.effect.BudEffect budEffect = new generation.grimoire.entity.spell.type.effect.BudEffect();
                        budEffect.setAmount(eDto.getFlatValue());
                        effect = budEffect;
                        break;
                }

                if (effect != null) {
                    effect.setEffectTarget(
                            eDto.getEffectTarget() != null ? eDto.getEffectTarget() : EffectTarget.TARGET);
                    effect.setRequiredChoiceKey(eDto.getRequiredChoiceKey());
                    effect.setDetachedSoulRequirement(
                            eDto.getDetachedSoulRequirement() != null ? eDto.getDetachedSoulRequirement()
                                    : generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED);
                    if (eDto.getChannelingTurns() != null) {
                        effect.setChannelingTurns(new java.util.LinkedHashSet<>(eDto.getChannelingTurns()));
                    }
                    spell.addEffect(effect);
                }
            }
        }

        spellService.saveSpell(spell);
        String actionStr = isUpdate ? "mis à jour" : "créé";
        return ResponseEntity.ok("Sort '" + spell.getNom() + "' " + actionStr + " avec succès avec " + spell.getEffects().size() + " effets !");
    }
}
