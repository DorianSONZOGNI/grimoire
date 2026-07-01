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
    private final generation.grimoire.repository.PersonnageRepository personnageRepository;

    public WebSpellCreationController(SpellService spellService,
            SpellRepository spellRepository,
            VoieRepository voieRepository,
            SpiritualiteRepository spiritualiteRepository,
            generation.grimoire.repository.PersonnageRepository personnageRepository) {
        this.spellService = spellService;
        this.spellRepository = spellRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
        this.personnageRepository = personnageRepository;
    }

    private List<Personnage> sandboxAllies = new ArrayList<>();
    private List<Personnage> sandboxEnemies = new ArrayList<>();
    private int sandboxTurn = 1;
    private final java.util.List<String> sandboxLogs = new java.util.ArrayList<>();

    /** Raccourci : le héros est toujours allies[0] */
    private Personnage getSandboxHero() {
        return sandboxAllies.isEmpty() ? null : sandboxAllies.get(0);
    }

    /** Raccourci : le monstre principal est toujours enemies[0] */
    private Personnage getSandboxMonster() {
        return sandboxEnemies.isEmpty() ? null : sandboxEnemies.get(0);
    }

    private synchronized void initSandbox() {
        if (sandboxAllies.isEmpty()) {
            resetSandbox();
        }
    }

    private Personnage createDefaultAlly(String name) {
        Personnage p = new Personnage();
        p.setName(name);
        p.setTeamId("HERO_TEAM");
        p.setHealthMax(100);
        p.setHealthCurrent(100);
        p.setManaMax(50);
        p.setManaCurrent(50);
        p.setArmor(10);
        p.setResistance(10);
        return p;
    }

    private Personnage createDefaultEnemy(String name) {
        Personnage p = new Personnage();
        p.setName(name);
        p.setTeamId("MONSTER_TEAM");
        p.setHealthMax(200);
        p.setHealthCurrent(200);
        p.setArmor(5);
        p.setResistance(5);
        return p;
    }

    private synchronized void resetSandbox() {
        sandboxAllies.clear();
        sandboxEnemies.clear();

        Personnage hero = new Personnage();
        hero.setName("Héros");
        hero.setTeamId("HERO_TEAM");
        hero.setHealthMax(100);
        hero.setHealthCurrent(100);
        hero.setManaMax(100);
        hero.setManaCurrent(100);
        hero.setPower(25);
        hero.setStrength(10);
        hero.setArmor(10);
        hero.setResistance(10);
        hero.setVoieLevel(1);
        hero.setSpiritualiteLevel(1);
        sandboxAllies.add(hero);

        Personnage monster = new Personnage();
        monster.setName("Monstre");
        monster.setTeamId("MONSTER_TEAM");
        monster.setHealthMax(200);
        monster.setHealthCurrent(200);
        monster.setArmor(5);
        monster.setResistance(5);
        sandboxEnemies.add(monster);

        sandboxLogs.clear();
        sandboxLogs.add("⚔️ Banc d'essai initialisé. Héros et Monstre sont prêts.");
        sandboxTurn = 1;
    }

    @PostConstruct
    public void initStandardEntities() {
        // 1. Initialiser les descriptions classiques
        Map<String, String> descriptionsVoies = new HashMap<>();
        descriptionsVoies.put("Voie de la Raison",
                "Basé sur la vitesse et les coups critique.");
        descriptionsVoies.put("Voie de la Sûreté",
                "Défensive et sûre. Des buffs, de la santé et du débuff pour tout le monde.");
        descriptionsVoies.put("Voie de Trahison",
                "L'art d'exploiter les faiblesses ennemies et d'achever les cibles faciles.");
        descriptionsVoies.put("Voie de la Consolidation",
                "Protection et dégats physiques. Simple, efficasse, endurant.");
        descriptionsVoies.put("Voie de la Conviction",
                "Une magie inarrêtable , un flot continue de puissance et de résistance.");
        descriptionsVoies.put("Voie de la Création",
                "Imprévisible, adaptable, les longs combats ne lui font pas peur.");
        descriptionsVoies.put("Voie de la Destruction",
                "La destruction, c'est très parlant. Ici on envoie des boules de feu, des lasers, et autres joyeusetés.");
        descriptionsVoies.put("Voie de la Violence",
                "Un cible mortel fait pour exterminer des groupes entier d'un simple claquement de doigts.");

        // 2. Initialiser les rangs personnalisés par Voie (basé sur tes captures
        // d'écran)
        Map<String, Map<Integer, String>> rangsVoies = new HashMap<>();
        rangsVoies.put("Voie de la Raison", Map.of(1, "Air", 2, "Vibration", 3, "Vide", 4, "Déviation", 5, "Gravité"));
        rangsVoies.put("Voie de la Sûreté", Map.of(1, "Eau", 2, "Glace", 3, "Sang", 4, "Vapeur", 5, "Pression"));
        rangsVoies.put("Voie de Trahison", Map.of(1, "Neige", 2, "Acide", 3, "Poison", 4, "Corrosion", 5, "Friction"));
        rangsVoies.put("Voie de la Consolidation",
                Map.of(1, "Terre", 2, "Métal", 3, "Sable", 4, "Poussière", 5, "Atome"));
        rangsVoies.put("Voie de la Conviction", Map.of(1, "Lave", 2, "Cristaux", 3, "Verre", 4, "Fibre", 5, "Tension"));
        rangsVoies.put("Voie de la Création",
                Map.of(1, "Plante", 2, "Pétrole", 3, "Plastic", 4, "Caoutchou", 5, "Fil"));
        rangsVoies.put("Voie de la Destruction",
                Map.of(1, "Feu", 2, "Explosion", 3, "Éclair", 4, "Laser", 5, "Absorption"));
        rangsVoies.put("Voie de la Violence",
                Map.of(1, "Combustion", 2, "Gas", 3, "Oxygen", 4, "Dioxide", 5, "Fragmentation"));

        Map<String, String> passifsVoies = new HashMap<>();
        passifsVoies.put("Voie de la Raison",
                "Lancer un sort de Raison confère <strong style=\"color: #facc15;\">+1 Vitesse</strong> au tour suivant (max <span style=\"color: #facc15;\">10 cumuls</span>, perdus si aucun n'est lancé).<br>De plus, le score de <strong style=\"color: #ef4444;\">Critique</strong> est augmenté d'un montant égal au <span style=\"font-weight: bold; color: #10b981;\">double de la Vitesse</span>.");
        passifsVoies.put("Voie de la Sûreté",
                "Accumule des <strong style=\"color: #3b82f6;\">points de Sûreté</strong> (10/tour et 20% du mana dépensé).<br>À <strong style=\"color: #6366f1;\">100 points</strong>, octroie <strong style=\"color: #ef4444;\">+15% de Critique</strong>, ou <strong style=\"color: #ef4444;\">+25%</strong> si le palier est atteint passivement en début de tour.");
        passifsVoies.put("Voie de Trahison",
                "Une fois par tour, vos <strong style=\"color: #ef4444;\">attaques physiques</strong> infligent des dégâts bruts bonus <strong style=\"color: #10b981;\">qui vous soignent</strong> :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li><strong style=\"color: #facc15;\">+10%</strong> de base</li><li><strong style=\"color: #facc15;\">+15%</strong> si la cible a moins de 50% PV</li><li><strong style=\"color: #facc15;\">+10%</strong> si elle a un malus</li></ul>");
        passifsVoies.put("Voie de la Consolidation",
                "Octroie <strong style=\"color: #3b82f6;\">+5% d'Armure</strong> par défaut. Lancer un sort remplace ce bonus selon son niveau :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li>Nv1: <strong style=\"color: #facc15;\">+1 Vitesse</strong></li><li>Nv2: <strong style=\"color: #3b82f6;\">+10% Armure</strong></li><li>Nv3: <strong style=\"color: #a855f7;\">+10% Résistance Magique</strong></li><li>Nv4: Coût des sorts <strong style=\"color: #10b981;\">-20%</strong></li><li>Nv5: <strong style=\"color: #eab308;\">+8% Armure et Résistance</strong></li></ul>");
        passifsVoies.put("Voie de la Conviction",
                "Régénère <strong style=\"color: #3b82f6;\">25 points de mana</strong> par tour (<span style=\"color: #3b82f6;\">+4</span> par niveau de Voie).<br>Augmente le <strong style=\"color: #3b82f6;\">mana maximum de 20</strong> par niveau au-delà du premier.");
        passifsVoies.put("Voie de la Création",
                "Modifie le <strong style=\"color: #facc15;\">1er sort du tour</strong> :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li>Un sort Instantané devient <strong style=\"color: #10b981;\">gratuit</strong></li><li>Un sort Banal devient <strong style=\"color: #facc15;\">Instantané</strong></li><li>Un sort Canalisé octroie un <strong style=\"color: #3b82f6;\">bouclier</strong> égal au mana dépensé</li></ul>");
        passifsVoies.put("Voie de la Destruction",
                "Accumule de la <strong style=\"color: #ef4444;\">Chaleur</strong> en lançant des sorts.<br>Lorsque la chaleur atteint <strong style=\"color: #ef4444;\">100</strong>, le prochain sort lancé est entièrement <strong style=\"color: #10b981;\">gratuit</strong>.");
        passifsVoies.put("Voie de la Violence",
                "Le lancement d'un sort octroie des effets d'<strong style=\"color: #facc15;\">Inspiration</strong> ou d'<strong style=\"color: #a855f7;\">Expiration</strong> supplémentaires.");

        String[] voies = { "Voie de la Raison", "Voie de la Sûreté", "Voie de Trahison", "Voie de la Consolidation",
                "Voie de la Conviction", "Voie de la Création", "Voie de la Destruction", "Voie de la Violence" };

        for (String v : voies) {
            java.util.Optional<Voie> optVoie = voieRepository.findByNom(v);
            Voie voie;
            if (optVoie.isEmpty()) {
                voie = new Voie();
                voie.setNom(v);
            } else {
                voie = optVoie.get();
            }

            // Assigner la description personnalisée
            voie.setDescription(descriptionsVoies.getOrDefault(v, "Voie classique du grimoire."));

            // Assigner les rangs personnalisés
            if (rangsVoies.containsKey(v)) {
                voie.getRankNames().putAll(rangsVoies.get(v));
            }

            // Assigner le passif
            if (passifsVoies.containsKey(v)) {
                voie.setPassiveDescription(passifsVoies.get(v));
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
            }
            voieRepository.save(voie);
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
            esprit.setDescription("Axée sur le renforcement et les ressources.");
            EspritPassiveEffect ee = new EspritPassiveEffect();
            ee.setSpiritualite(esprit);
            esprit.setPassiveEffects(List.of(ee));
            spiritualiteRepository.save(esprit);
        }
        if (spiritualiteRepository.findByNom("Ténèbres").isEmpty()) {
            Spiritualite tenebres = new Spiritualite();
            tenebres.setNom("Ténèbres");
            tenebres.setDescription("Axée sur la puissance brute les buffs et les débuffs");
            TenebrePassiveEffect te = new TenebrePassiveEffect();
            te.setSpiritualite(tenebres);
            tenebres.setPassiveEffects(List.of(te));
            spiritualiteRepository.save(tenebres);
        }
        if (spiritualiteRepository.findByNom("Karma").isEmpty()) {
            Spiritualite karma = new Spiritualite();
            karma.setNom("Karma");
            karma.setDescription("Polyvalent mix entre dégats, protection et soutien.");
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
                sp.getRankNames().put(2, "Harmonie");
                sp.getRankNames().put(3, "Jugement");
                spiritualiteRepository.save(sp);
            }
        });

        // Set passiveDescription for spiritualites
        for (Spiritualite sp : spiritualiteRepository.findAll()) {
            if ("Esprit".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Les sorts de cette spiritualité ne peuvent être lancés que si vous possédez au moins <strong style=\"color: #10b981;\">20% de vos PV max</strong> <span style=\"font-weight: bold; color: #f59e0b;\">ET</span> <strong style=\"color: #3b82f6;\">20% de votre Mana max</strong>.");
            } else if ("Ténèbres".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Sauf pour les sorts de <i>'base'</i>, le lancement nécessite d'avoir <strong style=\"color: #ef4444;\">80% ou moins de vos PV max</strong> <span style=\"font-weight: bold; color: #f59e0b;\">OU</span> <strong style=\"color: #3b82f6;\">80% ou moins de votre Mana max</strong>.");
            } else if ("Karma".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Gère une jauge affectée par l'alignement des sorts (<em>Ténèbres, Harmonie, Lumière</em>).<ul style=\"margin-top: 6px; margin-bottom: 6px; padding-left: 20px;\"><li>À <strong style=\"color: #8b5cf6;\">0 (Harmonie)</strong> : octroie des bonus sur vos sorts.</li><li>À <strong style=\"color: #ef4444;\">+4</strong> ou <strong style=\"color: #ef4444;\">-4</strong> : verrouille la magie karmique (sauf sorts d'Harmonie) pendant <strong style=\"color: #fb923c;\">6 tours</strong>, mais confère un buff massif d'<strong style=\"color: #eab308;\">Illumination</strong> (+Armure/Résist) ou de <strong style=\"color: #a855f7;\">Corruption</strong> (+Dégâts).</li></ul><span style=\"color: #94a3b8; font-size: 0.9em;\">💡 Astuce : On peut réduire ce timer en lançant des sorts d'Harmonie.</span>");
            }
            spiritualiteRepository.save(sp);
        }
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
        hero.setStrength(10);
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
                    spellService.tickChanneling(hero, monstre, null, hero, java.util.List.of(hero),
                            java.util.List.of(monstre));
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

    private CombatantState buildCombatantState(Personnage p, int index) {
        CombatantState cs = new CombatantState();
        cs.setIndex(index);
        cs.setName(p.getName());
        cs.setHpMax(p.getHealthMax());
        cs.setHpCurrent(p.getHealthCurrent());
        cs.setManaMax(p.getManaMax());
        cs.setManaCurrent(p.getManaCurrent());
        cs.setShieldTotal(p.getTotalShield());

        java.util.List<ShieldState> shields = new java.util.ArrayList<>();
        if (p.getActiveShields() != null) {
            for (ActiveShield s : p.getActiveShields()) {
                shields.add(new ShieldState(s.getAmount(), s.getDuration(), s.getSourceName()));
            }
        }
        cs.setShields(shields);

        java.util.List<BuffState> buffs = new java.util.ArrayList<>();
        if (p.getActiveBuffs() != null) {
            for (BuffDebuffEffect b : p.getActiveBuffs()) {
                String source = b.getSpell() != null ? b.getSpell().getNom()
                        : (b.getSourceName() != null ? b.getSourceName() : "Effet");
                buffs.add(new BuffState(b.getStatAffected().name(), b.getModifier(), b.getFlatValue(),
                        b.getDuration(), source));
            }
        }
        cs.setBuffs(buffs);

        cs.setHeat(p.getPassiveState("destruction_heat", 0));
        cs.setSurete(p.getPassiveState("surete_points", 0));

        // Trahison
        cs.setHasTrahison(p.getVoie() != null && "Voie de Trahison".equals(p.getVoie().getNom()));
        cs.setTrahisonBaseAvailable(p.getPassiveState("trahison_used_this_turn", 0) == 0);
        cs.setTrahisonLowHpAvailable(p.getPassiveState("trahison_low_hp_used_this_turn", 0) == 0);
        cs.setTrahisonDebuffAvailable(p.getPassiveState("trahison_debuff_used_this_turn", 0) == 0);

        // Crit dérivé (Raison)
        Integer critDerived = null;
        if (p.getVoie() != null && "Voie de la Raison".equals(p.getVoie().getNom())) {
            int effectiveSpeed = p.getSpeed() + p.getStatFlatBonus(generation.grimoire.enumeration.StatType.SPEED);
            critDerived = effectiveSpeed * 2;
        }
        cs.setCritDerived(critDerived);

        // Consolidation
        cs.setHasConsolidation(p.getVoie() != null && "Voie de la Consolidation".equals(p.getVoie().getNom()));
        cs.setConsolidationLevel(p.getPassiveState("consolidation_active_level", 0));

        // Violence
        cs.setHasViolence(p.getVoie() != null && "Voie de la Violence".equals(p.getVoie().getNom()));
        cs.setViolenceInspiration(p.getPassiveState("violence_inspiration", 0));
        cs.setViolenceExpiration(p.getPassiveState("violence_expiration", 0));

        // Karma
        cs.setHasKarma(p.getSpiritualite() != null && p.getSpiritualite().getNom() != null
                && p.getSpiritualite().getNom().toLowerCase().contains("karma"));
        cs.setKarmaGauge(p.getPassiveState("karma_gauge", 0));
        cs.setKarmaLocked(p.getPassiveState("karma_locked", 0) == 1);
        cs.setKarmaLockedDuration(p.getPassiveState("karma_locked_duration", 0));
        cs.setKarmaHarmony(p.getPassiveState("karma_harmony", 0) == 1);

        // Stats
        cs.setPower(p.getEffectiveStat(generation.grimoire.enumeration.StatType.POWER));
        cs.setStrength(p.getEffectiveStat(generation.grimoire.enumeration.StatType.STRENGTH));
        cs.setArmor(p.getEffectiveStat(generation.grimoire.enumeration.StatType.ARMURE));
        cs.setResistance(p.getEffectiveStat(generation.grimoire.enumeration.StatType.RESISTANCE));
        cs.setSpeed(p.getEffectiveStat(generation.grimoire.enumeration.StatType.SPEED));
        cs.setCrit(p.getEffectiveStat(generation.grimoire.enumeration.StatType.CRIT));

        cs.setBasePower(p.getPower());
        cs.setBaseStrength(p.getStrength());
        cs.setBaseArmor(p.getArmor());
        cs.setBaseResistance(p.getResistance());
        cs.setBaseSpeed(p.getSpeed());
        cs.setBaseCrit(p.getCrit());

        // Voie & Spiritualité info
        cs.setVoieId(p.getVoie() != null ? p.getVoie().getId() : null);
        cs.setVoieName(p.getVoie() != null ? p.getVoie().getNom() : null);
        cs.setVoieLevel(p.getVoieLevel());
        cs.setSpiritualiteId(p.getSpiritualite() != null ? p.getSpiritualite().getId() : null);
        cs.setSpiritualiteName(p.getSpiritualite() != null ? p.getSpiritualite().getNom() : null);
        cs.setSpiritualiteLevel(p.getSpiritualiteLevel());

        return cs;
    }

    private Personnage clonePersonnageForSandbox(Personnage dbP, String teamPrefix, int index) {
        Personnage clone = new Personnage();
        clone.setId(dbP.getId());
        clone.setName(dbP.getName());
        clone.setTeamId(teamPrefix + "_" + index);

        clone.setHealthMax(dbP.getBaseHealthMax());
        clone.setManaMax(dbP.getBaseManaMax());

        clone.setPower(dbP.getPower());
        clone.setStrength(dbP.getStrength());
        clone.setArmor(dbP.getArmor());
        clone.setResistance(dbP.getResistance());
        clone.setCrit(dbP.getCrit());
        clone.setSpeed(dbP.getSpeed());

        clone.setVoie(dbP.getVoie());
        clone.setVoieLevel(dbP.getVoieLevel());
        clone.setSpiritualite(dbP.getSpiritualite());
        clone.setSpiritualiteLevel(dbP.getSpiritualiteLevel());

        if (dbP.getEquipments() != null) {
            clone.setEquipments(new java.util.ArrayList<>(dbP.getEquipments()));
        }

        clone.setHealthCurrent(dbP.getHealthMax());
        clone.setManaCurrent(dbP.getManaMax());

        return clone;
    }

    private SandboxStateDto buildSandboxStateResponse() {
        initSandbox();

        SandboxStateDto res = new SandboxStateDto();
        res.setTurnCount(sandboxTurn);

        java.util.List<CombatantState> allies = new java.util.ArrayList<>();
        for (int i = 0; i < sandboxAllies.size(); i++) {
            allies.add(buildCombatantState(sandboxAllies.get(i), i));
        }
        res.setAllies(allies);

        java.util.List<CombatantState> enemies = new java.util.ArrayList<>();
        for (int i = 0; i < sandboxEnemies.size(); i++) {
            enemies.add(buildCombatantState(sandboxEnemies.get(i), i));
        }
        res.setEnemies(enemies);

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

    @PostMapping("/sandbox/set-hero")
    public ResponseEntity<SandboxStateDto> setHero(@RequestParam(required = false) Long personnageId) {
        initSandbox();
        if (personnageId != null && personnageRepository.existsById(personnageId)) {
            Personnage dbHero = personnageRepository.findById(personnageId).orElseThrow();
            Personnage clone = clonePersonnageForSandbox(dbHero, "ALLY", 0);
            sandboxAllies.set(0, clone);
            sandboxLogs.add("👑 " + clone.getName() + " est maintenant le Héros principal.");
        } else {
            Personnage defaultHero = createDefaultAlly("Lanceur (Héros)");
            sandboxAllies.set(0, defaultHero);
            sandboxLogs.add("👑 Le Héros principal a été réinitialisé.");
        }
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/add-ally")
    public ResponseEntity<SandboxStateDto> addAlly(@RequestParam(required = false) Long personnageId) {
        initSandbox();
        if (sandboxAllies.size() >= 4) {
            sandboxLogs.add("⚠️ Maximum de 4 alliés atteint.");
            return ResponseEntity.ok(buildSandboxStateResponse());
        }
        int num = sandboxAllies.size();
        Personnage ally;
        if (personnageId != null && personnageRepository.existsById(personnageId)) {
            Personnage dbP = personnageRepository.findById(personnageId).orElseThrow();
            ally = clonePersonnageForSandbox(dbP, "ALLY", num);
        } else {
            ally = createDefaultAlly("Allié " + num);
        }
        sandboxAllies.add(ally);
        sandboxLogs.add("➕ " + ally.getName() + " a rejoint l'équipe alliée.");
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/add-enemy")
    public ResponseEntity<SandboxStateDto> addEnemy(@RequestParam(required = false) Long personnageId) {
        initSandbox();
        if (sandboxEnemies.size() >= 4) {
            sandboxLogs.add("⚠️ Maximum de 4 ennemis atteint.");
            return ResponseEntity.ok(buildSandboxStateResponse());
        }
        int num = sandboxEnemies.size();
        Personnage enemy;
        if (personnageId != null && personnageRepository.existsById(personnageId)) {
            Personnage dbP = personnageRepository.findById(personnageId).orElseThrow();
            enemy = clonePersonnageForSandbox(dbP, "ENEMY", num);
        } else {
            enemy = createDefaultEnemy("Ennemi " + (num + 1));
        }
        sandboxEnemies.add(enemy);
        sandboxLogs.add("➕ " + enemy.getName() + " a rejoint l'équipe ennemie.");
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/remove-combatant")
    public ResponseEntity<SandboxStateDto> removeCombatant(
            @RequestParam String team,
            @RequestParam int index) {
        initSandbox();
        if ("ALLY".equalsIgnoreCase(team)) {
            if (index == 0) {
                sandboxLogs.add("⚠️ Le Héros ne peut pas être retiré.");
            } else if (index > 0 && index < sandboxAllies.size()) {
                String name = sandboxAllies.get(index).getName();
                sandboxAllies.remove(index);
                sandboxLogs.add("➖ " + name + " a quitté l'équipe alliée.");
            }
        } else if ("ENEMY".equalsIgnoreCase(team)) {
            if (sandboxEnemies.size() <= 1) {
                sandboxLogs.add("⚠️ Il faut au moins un ennemi.");
            } else if (index >= 0 && index < sandboxEnemies.size()) {
                String name = sandboxEnemies.get(index).getName();
                sandboxEnemies.remove(index);
                sandboxLogs.add("➖ " + name + " a quitté l'équipe ennemie.");
            }
        }
        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/configure")
    public ResponseEntity<SandboxStateDto> configureSandbox(@RequestBody ConfigureHeroDto dto) {
        initSandbox();
        Personnage sandboxHero = getSandboxHero();

        // Appliquer la voie
        Long voieId = dto.getVoieId();
        if (voieId != null) {
            voieRepository.findById(voieId).ifPresent(sandboxHero::setVoie);
        } else {
            sandboxHero.setVoie(null);
        }
        sandboxHero.setVoieLevel(Math.max(1, Math.min(5, dto.getVoieLevel())));

        // Appliquer la spiritualité
        Long spiritualiteId = dto.getSpiritualiteId();
        if (spiritualiteId != null) {
            spiritualiteRepository.findById(spiritualiteId).ifPresent(sandboxHero::setSpiritualite);
        } else {
            sandboxHero.setSpiritualite(null);
        }
        sandboxHero.setSpiritualiteLevel(Math.max(1, Math.min(3, dto.getSpiritualiteLevel())));

        // Appliquer les stats de base
        sandboxHero.setHealthMax(Math.max(1, dto.getHealthMax()));
        sandboxHero.setHealthCurrent(Math.min(sandboxHero.getHealthMax(), Math.max(1, dto.getHealthMax())));
        sandboxHero.setManaMax(Math.max(0, dto.getManaMax()));
        sandboxHero.setManaCurrent(Math.min(sandboxHero.getManaMax(), Math.max(0, dto.getManaMax())));
        sandboxHero.setPower(Math.max(0, dto.getPower()));
        sandboxHero.setStrength(Math.max(0, dto.getStrength()));
        sandboxHero.setArmor(Math.max(0, dto.getArmor()));
        sandboxHero.setResistance(Math.max(0, dto.getResistance()));
        sandboxHero.setSpeed(Math.max(0, dto.getSpeed()));
        sandboxHero.setCrit(Math.max(0, Math.min(100, dto.getCrit())));

        // Réinitialiser les passives states puisque la configuration a changé
        sandboxHero.getPassiveStates().clear();

        sandboxLogs.add("⚙️ Configuration du héros mise à jour.");

        return ResponseEntity.ok(buildSandboxStateResponse());
    }

    @PostMapping("/sandbox/cast/{spellId}")
    public ResponseEntity<SandboxStateDto> castSandboxSpell(
            @PathVariable @org.springframework.lang.NonNull Long spellId,
            @RequestParam(required = false) Integer choiceKey,
            @RequestParam(required = false, defaultValue = "0") int targetEnemyIndex,
            @RequestParam(required = false, defaultValue = "0") int targetAllyIndex) {
        initSandbox();
        java.util.Optional<Spell> opt = spellRepository.findById(spellId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Spell spell = opt.get();

        Personnage caster = getSandboxHero();
        Personnage target = (targetEnemyIndex >= 0 && targetEnemyIndex < sandboxEnemies.size())
                ? sandboxEnemies.get(targetEnemyIndex)
                : getSandboxMonster();
        Personnage ally = (targetAllyIndex >= 0 && targetAllyIndex < sandboxAllies.size())
                ? sandboxAllies.get(targetAllyIndex)
                : caster;

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream originalOut = System.out;
        try {
            java.io.PrintStream ps = new java.io.PrintStream(baos, true, java.nio.charset.StandardCharsets.UTF_8);
            System.setOut(ps);

            System.out.println("\n🧙‍♂️ --- Action : " + caster.getName() + " lance " + spell.getNom() + " (Lvl "
                    + spell.getNiveau() + ") ---");
            spellService.castSpellGroup(spell, caster, target, ally, sandboxAllies, sandboxEnemies, choiceKey);

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

            Personnage hero = getSandboxHero();
            // Résoudre les canalisations actives du héros
            if (hero.getRemainingChannelingTurns() > 0) {
                Personnage channelingTarget = hero.getChannelingTarget();
                if (channelingTarget == null)
                    channelingTarget = getSandboxMonster();
                spellService.tickChanneling(hero, channelingTarget, hero.getChannelingChoiceKey(), hero, sandboxAllies,
                        sandboxEnemies);
            }

            // Déclencher le début du tour suivant pour TOUS les personnages
            for (Personnage p : sandboxAllies) {
                spellService.startTurn(p);
            }
            for (Personnage p : sandboxEnemies) {
                spellService.startTurn(p);
            }

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
        spell.setInspiration(dto.isInspiration());

        if (dto.getKarmaAlignment() != null) {
            spell.setKarmaAlignment(dto.getKarmaAlignment());
        } else {
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
                }

                if (effect != null) {
                    effect.setEffectTarget(
                            eDto.getEffectTarget() != null ? eDto.getEffectTarget() : EffectTarget.TARGET);
                    effect.setRequiredChoiceKey(eDto.getRequiredChoiceKey());
                    effect.setDetachedSoulRequirement(
                            eDto.getDetachedSoulRequirement() != null ? eDto.getDetachedSoulRequirement()
                                    : generation.grimoire.enumeration.DetachedSoulRequirement.NOT_AFFECTED);
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
        private boolean inspiration;
        private generation.grimoire.enumeration.KarmaAlignment karmaAlignment;
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
        private generation.grimoire.enumeration.DetachedSoulRequirement detachedSoulRequirement;
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
        private java.util.List<CombatantState> allies;
        private java.util.List<CombatantState> enemies;
        private String rawLogs;
    }

    @Data
    public static class CombatantState {
        private int index;
        private String name;
        private int hpMax, hpCurrent;
        private int manaMax, manaCurrent;
        private int shieldTotal;
        private java.util.List<ShieldState> shields;
        private java.util.List<BuffState> buffs;
        private int heat;
        private int surete;
        private Integer critDerived;
        // Trahison
        private boolean hasTrahison, trahisonBaseAvailable, trahisonLowHpAvailable, trahisonDebuffAvailable;
        // Consolidation
        private boolean hasConsolidation;
        private int consolidationLevel;
        // Violence
        private boolean hasViolence;
        private int violenceInspiration, violenceExpiration;
        // Karma
        private boolean hasKarma;
        private int karmaGauge;
        private boolean karmaLocked, karmaHarmony;
        private int karmaLockedDuration;
        // Stats effectives
        private int power, strength, armor, resistance, speed, crit;
        // Stats de base
        private int basePower, baseStrength, baseArmor, baseResistance, baseSpeed, baseCrit;
        // Voie & Spiritualité
        private Long voieId;
        private String voieName;
        private int voieLevel;
        private Long spiritualiteId;
        private String spiritualiteName;
        private int spiritualiteLevel;
    }

    @Data
    public static class ConfigureHeroDto {
        private Long voieId;
        private int voieLevel = 1;
        private Long spiritualiteId;
        private int spiritualiteLevel = 1;
        private int healthMax = 100;
        private int manaMax = 100;
        private int power = 25;
        private int strength = 10;
        private int armor = 10;
        private int resistance = 10;
        private int speed = 0;
        private int crit = 0;
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
