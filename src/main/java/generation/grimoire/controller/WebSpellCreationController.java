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
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.service.SpellService;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.AllArgsConstructor;
import generation.grimoire.entity.personnage.Personnage;
import generation.grimoire.entity.personnage.ActiveShield;
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

    private Personnage sandboxHero;
    private Personnage sandboxMonster;
    private int sandboxTurn = 1;
    private final java.util.List<String> sandboxLogs = new java.util.ArrayList<>();

    private synchronized void initSandbox() {
        if (sandboxHero == null) {
            resetSandbox();
        }
    }

    private synchronized void resetSandbox() {
        sandboxHero = new Personnage();
        sandboxHero.setName("Héros");
        sandboxHero.setTeamId("HERO_TEAM");
        sandboxHero.setHealthMax(100);
        sandboxHero.setHealthCurrent(100);
        sandboxHero.setManaMax(100);
        sandboxHero.setManaCurrent(100);
        sandboxHero.setPower(25);
        sandboxHero.setArmor(10);
        sandboxHero.setResistance(10);

        sandboxMonster = new Personnage();
        sandboxMonster.setName("Monstre");
        sandboxMonster.setTeamId("MONSTER_TEAM");
        sandboxMonster.setHealthMax(200);
        sandboxMonster.setHealthCurrent(200);
        sandboxMonster.setArmor(5);
        sandboxMonster.setResistance(5);

        sandboxLogs.clear();
        sandboxLogs.add("⚔️ Banc d'essai initialisé. Héros et Monstre sont prêts.");
        sandboxTurn = 1;
    }

    @PostConstruct
    public void initStandardEntities() {
        // Initialiser les Voies classiques si absentes, et y associer leurs passifs respectifs
        String[] voies = { "Voie de la Raison", "Voie de la Sûreté", "Voie de Trahison", "Voie de la Consolidation",
                "Voie de la Conviction", "Voie de la Création", "Voie de la Destruction", "Voie de la Violence" };
        for (String v : voies) {
            java.util.Optional<Voie> optVoie = voieRepository.findByNom(v);
            Voie voie;
            boolean isNew = false;
            if (optVoie.isEmpty()) {
                voie = new Voie();
                voie.setNom(v);
                voie.setDescription("Voie classique du grimoire.");
                isNew = true;
            } else {
                voie = optVoie.get();
            }

            if (voie.getPassiveEffects() == null || voie.getPassiveEffects().isEmpty()) {
                VoiePassiveEffect passif = null;
                switch (v) {
                    case "Voie de la Raison":
                        passif = new generation.grimoire.entity.voie.passif.specific.RaisonPassiveEffect();
                        break;
                    case "Voie de la Sûreté":
                        passif = new generation.grimoire.entity.voie.passif.specific.SuretePassiveEffect();
                        break;
                    case "Voie de Trahison":
                        passif = new generation.grimoire.entity.voie.passif.specific.TrahisonPassiveEffect();
                        break;
                    case "Voie de la Consolidation":
                        passif = new generation.grimoire.entity.voie.passif.specific.ConsolidationPassiveEffect();
                        break;
                    case "Voie de la Conviction":
                        passif = new generation.grimoire.entity.voie.passif.specific.ConvictionPassiveEffect();
                        break;
                    case "Voie de la Création":
                        passif = new generation.grimoire.entity.voie.passif.specific.CreationPassiveEffect();
                        break;
                    case "Voie de la Destruction":
                        passif = new generation.grimoire.entity.voie.passif.specific.DestructionPassiveEffect();
                        break;
                    case "Voie de la Violence":
                        passif = new generation.grimoire.entity.voie.passif.specific.ViolencePassiveEffect();
                        break;
                }
                if (passif != null) {
                    passif.setVoie(voie);
                    voie.setPassiveEffects(List.of(passif));
                }
                voieRepository.save(voie);
            } else if (isNew) {
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

    @GetMapping
    public ResponseEntity<List<Spell>> getAllCreatedSpells() {
        return ResponseEntity.ok(spellRepository.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteSpell(@PathVariable @org.springframework.lang.NonNull Long id) {
        if (spellRepository.existsById(id)) {
            spellRepository.deleteById(id);
            return ResponseEntity.ok("Sort supprimé avec succès.");
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/try/{id}")
    public ResponseEntity<SimulationResultDto> trySpell(@PathVariable @org.springframework.lang.NonNull Long id) {
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

            // Simuler le déroulement des tours restants de la canalisation
            if (spell.getCastingType() == generation.grimoire.enumeration.SpellCastingType.CANALISE) {
                int duration = spell.getChannelingDuration();
                for (int t = 2; t <= duration; t++) {
                    System.out.println("\n--- TOUR DE CANALISATION " + t + " ---");
                    spellService.startTurn(hero);
                    spellService.tickChanneling(hero, monstre, null);
                }
            }
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

    private SandboxStateDto buildSandboxStateResponse() {
        initSandbox();

        SandboxStateDto res = new SandboxStateDto();
        res.setTurnCount(sandboxTurn);
        res.setHeroName(sandboxHero.getName());
        res.setHeroHpMax(sandboxHero.getHealthMax());
        res.setHeroHpCurrent(sandboxHero.getHealthCurrent());
        res.setHeroManaMax(sandboxHero.getManaMax());
        res.setHeroManaCurrent(sandboxHero.getManaCurrent());
        res.setHeroShieldTotal(sandboxHero.getTotalShield());
        
        java.util.List<ShieldState> heroShields = new java.util.ArrayList<>();
        if (sandboxHero.getActiveShields() != null) {
            for (ActiveShield s : sandboxHero.getActiveShields()) {
                heroShields.add(new ShieldState(s.getAmount(), s.getDuration(), s.getSourceName()));
            }
        }
        res.setHeroShields(heroShields);

        java.util.List<BuffState> heroBuffs = new java.util.ArrayList<>();
        if (sandboxHero.getActiveBuffs() != null) {
            for (BuffDebuffEffect b : sandboxHero.getActiveBuffs()) {
                String source = b.getSpell() != null ? b.getSpell().getNom() : (b.getSourceName() != null ? b.getSourceName() : "Effet");
                heroBuffs.add(new BuffState(b.getStatAffected().name(), b.getModifier(), b.getFlatValue(), b.getDuration(), source));
            }
        }
        res.setHeroBuffs(heroBuffs);

        res.setMonsterName(sandboxMonster.getName());
        res.setMonsterHpMax(sandboxMonster.getHealthMax());
        res.setMonsterHpCurrent(sandboxMonster.getHealthCurrent());
        res.setMonsterShieldTotal(sandboxMonster.getTotalShield());

        java.util.List<ShieldState> monsterShields = new java.util.ArrayList<>();
        if (sandboxMonster.getActiveShields() != null) {
            for (ActiveShield s : sandboxMonster.getActiveShields()) {
                monsterShields.add(new ShieldState(s.getAmount(), s.getDuration(), s.getSourceName()));
            }
        }
        res.setMonsterShields(monsterShields);

        java.util.List<BuffState> monsterBuffs = new java.util.ArrayList<>();
        if (sandboxMonster.getActiveBuffs() != null) {
            for (BuffDebuffEffect b : sandboxMonster.getActiveBuffs()) {
                String source = b.getSpell() != null ? b.getSpell().getNom() : (b.getSourceName() != null ? b.getSourceName() : "Effet");
                monsterBuffs.add(new BuffState(b.getStatAffected().name(), b.getModifier(), b.getFlatValue(), b.getDuration(), source));
            }
        }
        res.setMonsterBuffs(monsterBuffs);

        res.setHeroHeat(sandboxHero.getPassiveState("destruction_heat", 0));
        res.setMonsterHeat(sandboxMonster.getPassiveState("destruction_heat", 0));

        res.setHeroSurete(sandboxHero.getPassiveState("surete_points", 0));
        res.setMonsterSurete(sandboxMonster.getPassiveState("surete_points", 0));

        // Calculer le critère dérivé de la Raison
        Integer heroCritDerived = null;
        if (sandboxHero.getVoie() != null && "Voie de la Raison".equals(sandboxHero.getVoie().getNom())) {
            int effectiveSpeed = sandboxHero.getSpeed() + sandboxHero.getStatFlatBonus(generation.grimoire.enumeration.StatType.SPEED);
            heroCritDerived = effectiveSpeed * 2;
        }
        res.setHeroCritDerived(heroCritDerived);

        Integer monsterCritDerived = null;
        if (sandboxMonster.getVoie() != null && "Voie de la Raison".equals(sandboxMonster.getVoie().getNom())) {
            int effectiveSpeed = sandboxMonster.getSpeed() + sandboxMonster.getStatFlatBonus(generation.grimoire.enumeration.StatType.SPEED);
            monsterCritDerived = effectiveSpeed * 2;
        }
        res.setMonsterCritDerived(monsterCritDerived);

        res.setRawLogs(String.join("\n", sandboxLogs));
        return res;
    }

    @GetMapping("/sandbox/state")
    public ResponseEntity<SandboxStateDto> getSandboxState() {
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/reset")
    public ResponseEntity<SandboxStateDto> resetSandboxEndpoint() {
        resetSandbox();
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/cast/{spellId}")
    public ResponseEntity<SandboxStateDto> castSandboxSpell(@PathVariable @org.springframework.lang.NonNull Long spellId, @RequestParam(required = false) Integer choiceKey) {
        initSandbox();
        java.util.Optional<Spell> opt = spellRepository.findById(spellId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Spell spell = opt.get();

        // Mettre à jour dynamiquement la voie et la spiritualité du héros pour correspondre au sort
        sandboxHero.setVoie(spell.getVoie());
        sandboxHero.setSpiritualite(spell.getSpiritualite());

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        try {
            java.io.PrintStream ps = new java.io.PrintStream(baos, true, java.nio.charset.StandardCharsets.UTF_8);
            System.setOut(ps);

            System.out.println("\n🧙‍♂️ --- Action : " + sandboxHero.getName() + " lance " + spell.getNom() + " (Lvl " + spell.getNiveau() + ") ---");
            spellService.castSpell(spell, sandboxHero, sandboxMonster, choiceKey);
            
            ps.flush();
        } catch (Exception e) {
            System.out.println("❌ Erreur lors du lancer : " + e.getMessage());
        } finally {
            System.setOut(originalOut);
        }

        String castLog = baos.toString(java.nio.charset.StandardCharsets.UTF_8);
        sandboxLogs.add(castLog);

        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/pass-turn")
    public ResponseEntity<SandboxStateDto> sandboxPassTurn() {
        initSandbox();

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        try {
            java.io.PrintStream ps = new java.io.PrintStream(baos, true, java.nio.charset.StandardCharsets.UTF_8);
            System.setOut(ps);

            System.out.println("\n🌀 --- FIN DU TOUR " + sandboxTurn + " ---");
            
            // Résoudre les canalisations actives du héros
            if (sandboxHero.getRemainingChannelingTurns() > 0) {
                spellService.tickChanneling(sandboxHero, sandboxMonster, sandboxHero.getChannelingChoiceKey());
            }

            // Déclencher le début du tour suivant pour le héros et le monstre (inclut les passifs, DoTs, HoTs, etc.)
            spellService.startTurn(sandboxHero);
            spellService.startTurn(sandboxMonster);

            sandboxTurn++;
            System.out.println("✨ Début du tour " + sandboxTurn + ". Prêt pour les actions.");

            ps.flush();
        } catch (Exception e) {
            System.out.println("❌ Erreur lors de la fin de tour : " + e.getMessage());
        } finally {
            System.setOut(originalOut);
        }

        String passTurnLog = baos.toString(java.nio.charset.StandardCharsets.UTF_8);
        sandboxLogs.add(passTurnLog);

        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping
    public ResponseEntity<String> createSpellPayload(@RequestBody SpellCreationDto dto) {
        Spell spell;
        boolean isUpdate = false;
        Long id = dto.getId();
        if (id != null && spellRepository.existsById(id)) {
            spell = spellRepository.findById(id).get();
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
        spell.setHeatCost(dto.getHeatCost());
        spell.setPercentHeatCost(dto.getPercentHeatCost());
        if (dto.getCastingType() != null)
            spell.setCastingType(dto.getCastingType());
        spell.setChannelingDuration(dto.getChannelingDuration());
        spell.setAllowInstantDuringChanneling(dto.isAllowInstantDuringChanneling());
        spell.setHeatGenerated(dto.getHeatGenerated());

        Long voieId = dto.getVoieId();
        if (voieId != null) {
            voieRepository.findById(voieId).ifPresent(spell::setVoie);
        } else {
            spell.setVoie(null);
        }
        Long spiritualiteId = dto.getSpiritualiteId();
        if (spiritualiteId != null) {
            spiritualiteRepository.findById(spiritualiteId).ifPresent(spell::setSpiritualite);
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
                        bde.setModifierSource(eDto.getSource());
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
                        hot.setHealSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = hot;
                        break;
                    case "FIXED_MANA":
                        ManaFixedEffect mfe = new ManaFixedEffect();
                        mfe.setManaAmount(eDto.getManaAmount());
                        effect = mfe;
                        break;
                    case "PERCENTAGE_MANA":
                        ManaPercentageEffect mpe = new ManaPercentageEffect();
                        mpe.setPercentage(eDto.getPercentage());
                        mpe.setManaSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_MANA_MAX);
                        effect = mpe;
                        break;
                    case "MOT":
                        ManaOverTimeEffect mot = new ManaOverTimeEffect();
                        mot.setPercentageManaPerTick(eDto.getPercentage());
                        mot.setFixedManaPerTick(eDto.getManaAmount());
                        mot.setDuration(eDto.getDuration());
                        mot.setManaSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_MANA_MAX);
                        effect = mot;
                        break;
                    case "PURGE":
                        effect = new generation.grimoire.entity.spell.type.effect.PurgeEffect();
                        break;
                    case "SHIELD":
                        generation.grimoire.entity.spell.type.effect.ShieldEffect se = new generation.grimoire.entity.spell.type.effect.ShieldEffect();
                        se.setFixedValue(eDto.getFlatValue());
                        se.setPercentage(eDto.getPercentage());
                        se.setDuration(eDto.getDuration());
                        se.setShieldSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
                        effect = se;
                        break;
                    case "HEAT_FIXED":
                        generation.grimoire.entity.spell.type.effect.HeatFixedEffect heatFixed = new generation.grimoire.entity.spell.type.effect.HeatFixedEffect();
                        heatFixed.setAmount(eDto.getFlatValue());
                        effect = heatFixed;
                        break;
                    case "HEAT_PERCENTAGE":
                        generation.grimoire.entity.spell.type.effect.HeatPercentageEffect heatPercentage = new generation.grimoire.entity.spell.type.effect.HeatPercentageEffect();
                        heatPercentage.setPercentage(eDto.getPercentage());
                        heatPercentage.setSource(eDto.getSource() != null ? eDto.getSource() : Source.TARGET_HEALTH_MAX);
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
                }

                if (effect != null) {
                    effect.setEffectTarget(eDto.getEffectTarget() != null ? eDto.getEffectTarget() : EffectTarget.TARGET);
                    effect.setRequiredChoiceKey(eDto.getRequiredChoiceKey());
                    if (eDto.getChannelingTurns() != null) {
                        effect.setChannelingTurns(new java.util.ArrayList<>(eDto.getChannelingTurns()));
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
        private int heatCost;
        private int percentHeatCost;
        private int heatGenerated;
        private Long voieId;
        private Long spiritualiteId;
        private int channelingDuration;
        private boolean allowInstantDuringChanneling = true;
        private List<EffectCreationDto> effects = new ArrayList<>();
    }

    @Data
    public static class EffectCreationDto {
        private String effectType; // FIXED_DAMAGE, PERCENTAGE_DAMAGE, FIXED_HEAL, PERCENTAGE_HEAL, BUFF_DEBUFF,
                                   // DOT, HOT
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
        private List<Integer> channelingTurns = new ArrayList<>();
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

    @Data
    public static class SandboxStateDto {
        private int turnCount;
        private String heroName;
        private int heroHpMax;
        private int heroHpCurrent;
        private int heroManaMax;
        private int heroManaCurrent;
        private int heroShieldTotal;
        private int heroHeat;
        private Integer heroCritDerived;
        private int heroSurete;
        private java.util.List<ShieldState> heroShields;
        private java.util.List<BuffState> heroBuffs;

        private String monsterName;
        private int monsterHpMax;
        private int monsterHpCurrent;
        private int monsterShieldTotal;
        private int monsterHeat;
        private Integer monsterCritDerived;
        private int monsterSurete;
        private java.util.List<ShieldState> monsterShields;
        private java.util.List<BuffState> monsterBuffs;

        private String rawLogs;
    }

    @Data
    @AllArgsConstructor
    public static class ShieldState {
        private int amount;
        private int duration;
        private String sourceName;
    }

    @Data
    @AllArgsConstructor
    public static class BuffState {
        private String statAffected;
        private double modifier;
        private int flatValue;
        private int duration;
        private String sourceName;
    }
}
