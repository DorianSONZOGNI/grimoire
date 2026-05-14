package generation.grimoire.controller;

import generation.grimoire.entity.Spell;
import generation.grimoire.entity.SpellEffect;
import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.spell.type.effect.*;
import generation.grimoire.entity.spiritualite.passif.specific.EspritPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.KarmaPassiveEffect;
import generation.grimoire.entity.spiritualite.passif.specific.TenebrePassiveEffect;
import generation.grimoire.enumeration.*;
import generation.grimoire.repository.SpellRepository;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import generation.grimoire.service.SpellService;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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

    public WebSpellCreationController(SpellService spellService,
            SpellRepository spellRepository,
            VoieRepository voieRepository,
            SpiritualiteRepository spiritualiteRepository) {
        this.spellService = spellService;
        this.spellRepository = spellRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
    }

    @PostConstruct
    public void initStandardEntities() {
        // Initialiser les Voies classiques si absentes
        String[] voies = { "Voie de la Raison", "Voie de la Sûreté", "Voie de Trahison", "Voie de la Consolidation",
                "Voie de la Conviction", "Voie de la Création", "Voie de la Destruction", "Voie de la Violence" };
        for (String v : voies) {
            if (voieRepository.findByNom(v).isEmpty()) {
                Voie voie = new Voie();
                voie.setNom(v);
                voie.setDescription("Voie classique du grimoire.");
                voieRepository.save(voie);
            }
        }

        // Initialiser les Spiritualités si absentes
        // Renommer l'ancienne entrée "Lumière" en "Esprit" si présente
        spiritualiteRepository.findByNom("Lumière").ifPresent(ancien -> {
            ancien.setNom("Esprit");
            spiritualiteRepository.save(ancien);
        });

        if (spiritualiteRepository.findByNom("Esprit").isEmpty()) {
            Spiritualite esprit = new Spiritualite();
            esprit.setNom("Esprit");
            esprit.setDescription("Spiritualité axée sur l'esprit, la protection et la ressource.");
            EspritPassiveEffect ee = new EspritPassiveEffect();
            ee.setSpiritualite(esprit);
            esprit.setPassiveEffects(List.of(ee));
            spiritualiteRepository.save(esprit);
        }
        if (spiritualiteRepository.findByNom("Ténèbres").isEmpty()) {
            Spiritualite tenebres = new Spiritualite();
            tenebres.setNom("Ténèbres");
            tenebres.setDescription("Spiritualité axée sur la puissance brute sous condition.");
            TenebrePassiveEffect te = new TenebrePassiveEffect();
            te.setSpiritualite(tenebres);
            tenebres.setPassiveEffects(List.of(te));
            spiritualiteRepository.save(tenebres);
        }
        if (spiritualiteRepository.findByNom("Karma").isEmpty()) {
            Spiritualite karma = new Spiritualite();
            karma.setNom("Karma");
            karma.setDescription("Spiritualité cyclique.");
            KarmaPassiveEffect ke = new KarmaPassiveEffect();
            ke.setSpiritualite(karma);
            karma.setPassiveEffects(List.of(ke));
            spiritualiteRepository.save(karma);
        }

        // Mettre à jour les noms de rangs pour les spiritualités si non définis
        spiritualiteRepository.findByNom("Esprit").ifPresent(sp -> {
            if (sp.getRankNames().isEmpty()) {
                sp.getRankNames().put(1, "Méditation");
                sp.getRankNames().put(2, "Illumination");
                sp.getRankNames().put(3, "Élévation");
                spiritualiteRepository.save(sp);
            }
        });

        spiritualiteRepository.findByNom("Ténèbres").ifPresent(sp -> {
            if (sp.getRankNames().isEmpty()) {
                sp.getRankNames().put(1, "Ombrage");
                sp.getRankNames().put(2, "Corruption");
                sp.getRankNames().put(3, "Nécromancie");
                spiritualiteRepository.save(sp);
            }
        });

        spiritualiteRepository.findByNom("Karma").ifPresent(sp -> {
            if (sp.getRankNames().isEmpty()) {
                sp.getRankNames().put(1, "Équilibre");
                sp.getRankNames().put(2, "Justesse");
                sp.getRankNames().put(3, "Plénitude");
                spiritualiteRepository.save(sp);
            }
        });

        // Définir des noms de rangs par défaut pour les Voies classiques
        voieRepository.findAll().forEach(v -> {
            if (v.getRankNames().isEmpty()) {
                v.getRankNames().put(1, "Novice");
                v.getRankNames().put(2, "Adepte");
                v.getRankNames().put(3, "Disciple");
                v.getRankNames().put(4, "Maître");
                v.getRankNames().put(5, "Transcendant");
                voieRepository.save(v);
            }
        });
    }

    @GetMapping("/meta")
    public ResponseEntity<Map<String, Object>> getCreationMeta() {
        Map<String, Object> meta = new HashMap<>();
        meta.put("voies", voieRepository.findAll());
        meta.put("spiritualites", spiritualiteRepository.findAll());
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
                Map.of("type", "BUFF_DEBUFF", "label", "Buff / Débuff"),
                Map.of("type", "DOT", "label", "Dégâts sur la durée (DoT)"),
                Map.of("type", "HOT", "label", "Soins sur la durée (HoT)"),
                Map.of("type", "PURGE", "label", "Purge (Dissiper Bonus/Malus)"));
        meta.put("effectTypes", effectTypes);

        return ResponseEntity.ok(meta);
    }

    @GetMapping
    public ResponseEntity<List<Spell>> getAllCreatedSpells() {
        return ResponseEntity.ok(spellRepository.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteSpell(@PathVariable Long id) {
        if (spellRepository.existsById(id)) {
            spellRepository.deleteById(id);
            return ResponseEntity.ok("Sort supprimé avec succès.");
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/try/{id}")
    public ResponseEntity<SimulationResultDto> trySpell(@PathVariable Long id) {
        java.util.Optional<Spell> opt = spellRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Spell spell = opt.get();
        SimulationResultDto res = new SimulationResultDto();
        res.setSpellName(spell.getNom());

        generation.grimoire.entity.personnage.Personnage hero = new generation.grimoire.entity.personnage.Personnage();
        hero.setName("Héros");
        hero.setTeamId("HERO_TEAM");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        hero.setPower(25);
        hero.setArmor(10);
        hero.setResistance(10);
        hero.setVoie(spell.getVoie());
        hero.setSpiritualite(spell.getSpiritualite());

        generation.grimoire.entity.personnage.Personnage monstre = new generation.grimoire.entity.personnage.Personnage();
        monstre.setName("Monstre");
        monstre.setTeamId("MONSTER_TEAM");
        monstre.setHealthMax(200);
        monstre.setHealthCurrent(200);
        monstre.setArmor(5);
        monstre.setResistance(5);

        res.setCasterHpBefore(hero.getHealthCurrent());
        res.setCasterHpMax(hero.getHealthMax());
        res.setCasterManaBefore(hero.getManaCurrent());
        res.setCasterManaMax(hero.getManaMax());
        res.setTargetHpBefore(monstre.getHealthCurrent());
        res.setTargetHpMax(monstre.getHealthMax());

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        try {
            java.io.PrintStream ps = new java.io.PrintStream(baos, true, java.nio.charset.StandardCharsets.UTF_8);
            System.setOut(ps);

            System.out.println("⚔️ --- Lancement de : " + spell.getNom() + " ---");
            spellService.castSpell(spell, hero, monstre, null);
            ps.flush();
        } catch (Exception e) {
            System.out.println("❌ Erreur de simulation : " + e.getMessage());
        } finally {
            System.setOut(originalOut);
        }

        res.setCasterHpAfter(hero.getHealthCurrent());
        res.setCasterManaAfter(hero.getManaCurrent());
        res.setTargetHpAfter(monstre.getHealthCurrent());
        res.setRawLogs(baos.toString(java.nio.charset.StandardCharsets.UTF_8));

        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<String> createSpellPayload(@RequestBody SpellCreationDto dto) {
        Spell spell;
        boolean isUpdate = false;
        if (dto.getId() != null && spellRepository.existsById(dto.getId())) {
            spell = spellRepository.findById(dto.getId()).get();
            spell.getEffects().clear();
            isUpdate = true;
        } else {
            spell = new Spell();
        }
        spell.setNom(dto.getNom());
        spell.setNiveau(dto.getNiveau());
        spell.setDescription(dto.getDescription());
        spell.setManaCost(dto.getManaCost());
        spell.setPercentManaCost(dto.getPercentManaCost());
        if (dto.getPercentManaCostSource() != null)
            spell.setPercentManaCostSource(dto.getPercentManaCostSource());
        spell.setHealCost(dto.getHealCost());
        spell.setPercentHealCost(dto.getPercentHealCost());
        if (dto.getPercentHealCostSource() != null)
            spell.setPercentHealCostSource(dto.getPercentHealCostSource());
        if (dto.getCastingType() != null)
            spell.setCastingType(dto.getCastingType());

        if (dto.getVoieId() != null) {
            voieRepository.findById(dto.getVoieId()).ifPresent(spell::setVoie);
        } else {
            spell.setVoie(null);
        }
        if (dto.getSpiritualiteId() != null) {
            spiritualiteRepository.findById(dto.getSpiritualiteId()).ifPresent(spell::setSpiritualite);
        } else {
            spell.setSpiritualite(null);
        }

        if (dto.getEffects() != null) {
            for (EffectCreationDto eDto : dto.getEffects()) {
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
                    case "BUFF_DEBUFF":
                        BuffDebuffEffect bde = new BuffDebuffEffect();
                        bde.setStatAffected(eDto.getStatAffected() != null ? eDto.getStatAffected() : StatType.ARMURE);
                        bde.setFlatValue(eDto.getFlatValue());
                        bde.setModifier(eDto.getModifier());
                        bde.setDuration(eDto.getDuration());
                        bde.setModifierSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = bde;
                        break;
                    case "DOT":
                        DamageOverTimeEffect dot = new DamageOverTimeEffect();
                        dot.setPercentageDamagePerTick(eDto.getPercentage());
                        dot.setFixedDamagePerTick(eDto.getDamage());
                        dot.setDuration(eDto.getDuration());
                        dot.setDamageType(eDto.getDamageType() != null ? eDto.getDamageType() : DamageType.MAGIC);
                        dot.setDamageSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = dot;
                        break;
                    case "HOT":
                        HealOverTimeEffect hot = new HealOverTimeEffect();
                        hot.setPercentageHealPerTick(eDto.getPercentage());
                        hot.setFixedHealPerTick(eDto.getHealAmount());
                        hot.setDuration(eDto.getDuration());
                        effect = hot;
                        break;
                    case "PURGE":
                        effect = new generation.grimoire.entity.spell.type.effect.PurgeEffect();
                        break;
                }

                if (effect != null) {
                    if (eDto.getEffectTarget() != null) {
                        effect.setEffectTarget(eDto.getEffectTarget());
                    } else {
                        effect.setEffectTarget(EffectTarget.TARGET);
                    }
                    if (eDto.getTargetExpression() != null && !eDto.getTargetExpression().trim().isEmpty()) {
                        effect.setTargetExpression(eDto.getTargetExpression().trim());
                    }
                    spell.addEffect(effect);
                }
            }
        }

        spellService.saveSpell(spell);
        String actionStr = isUpdate ? "mis à jour" : "créé";
        return ResponseEntity
                .ok("Sort '" + spell.getNom() + "' " + actionStr + " avec succès avec " + spell.getEffects().size()
                        + " effets !");
    }

    @Data
    public static class SpellCreationDto {
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
        private Long voieId;
        private Long spiritualiteId;
        private List<EffectCreationDto> effects = new ArrayList<>();
    }

    @Data
    public static class EffectCreationDto {
        private String effectType; // FIXED_DAMAGE, PERCENTAGE_DAMAGE, FIXED_HEAL, PERCENTAGE_HEAL, BUFF_DEBUFF,
                                   // DOT, HOT
        private EffectTarget effectTarget = EffectTarget.TARGET;
        private String targetExpression;
        private int damage;
        private int healAmount;
        private double percentage;
        private int flatValue;
        private double modifier;
        private int duration;
        private DamageType damageType;
        private StatType statAffected;
        private Source source;
    }

    @Data
    public static class SimulationResultDto {
        private String spellName;
        private int casterHpBefore;
        private int casterHpAfter;
        private int casterHpMax;
        private int casterManaBefore;
        private int casterManaAfter;
        private int casterManaMax;
        private int targetHpBefore;
        private int targetHpAfter;
        private int targetHpMax;
        private String rawLogs;
    }
}
