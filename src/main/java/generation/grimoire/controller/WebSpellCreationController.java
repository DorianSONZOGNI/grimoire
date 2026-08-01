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
import generation.grimoire.repository.pve.MutationRepository;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
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
    private final MutationRepository mutationRepository;

    public WebSpellCreationController(SpellService spellService,
            SpellRepository spellRepository,
            VoieRepository voieRepository,
            SpiritualiteRepository spiritualiteRepository,
            MutationRepository mutationRepository) {
        this.spellService = spellService;
        this.spellRepository = spellRepository;
        this.voieRepository = voieRepository;
        this.spiritualiteRepository = spiritualiteRepository;
        this.mutationRepository = mutationRepository;
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
                "Un style de combat mortel conçu pour exterminer ces adverssaires d'un simple claquement de doigts.");

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
                "Lancer un sort de Raison confère [c=speed]+1 Vitesse[/c] au tour suivant (max [c=warning]10 cumuls[/c], perdus si aucun n'est lancé).\nDe plus, le score de [c=crit]Critique[/c] est augmenté d'un montant égal au [c=speed]double de la Vitesse[/c].");
        passifsVoies.put("Voie de la Sûreté",
                "Accumule des [c=shield]points de Sûreté[/c] (10/tour et 20% du [c=mana]mana[/c] dépensé).\nÀ [c=warning]100 points[/c], octroie [c=crit]+15% de Critique[/c], ou [c=crit]+25%[/c] si le palier est atteint passivement en début de tour.");
        passifsVoies.put("Voie de Trahison",
                "Une fois par tour, vos [c=physic]attaques physiques[/c] infligent des dégâts bruts bonus [c=heal]qui vous soignent[/c] :\n[ul][li][c=brut]+10%[/c] de base[/li][li][c=brut]+15%[/c] si la cible a moins de 50% [c=pv]PV[/c][/li][li][c=brut]+10%[/c] si elle a un malus[/li][/ul]");
        passifsVoies.put("Voie de la Consolidation",
                "Octroie [c=armor]+5% d'Armure[/c] par défaut. Lancer un sort remplace ce bonus selon son niveau :\n[ul][li]Nv1: [c=speed]+1 Vitesse[/c][/li][li]Nv2: [c=armor]+10% Armure[/c][/li][li]Nv3: [c=resist]+10% Résistance Magique[/c][/li][li]Nv4: Coût des sorts [c=mana]-20%[/c][/li][li]Nv5: [c=armor]+8% Armure[/c] et [c=resist]Résistance[/c][/li][/ul]");
        passifsVoies.put("Voie de la Conviction",
                "Régénère [c=mana]25 points de mana[/c] par tour ([c=mana]+4[/c] par niveau de Voie).\nAugmente le [c=mana]mana maximum de 20[/c] par niveau au-delà du premier.");
        passifsVoies.put("Voie de la Création",
                "Chaque tour, le 1er sort lancé consomme un [c=heal]bourgeon[/c] s'il vous en reste en stock.\nVoici les effets du [c=heal]bourgeon[/c] pour chaque type de sort :\n[ul][li]Un sort Instantané devient [c=mana]gratuit[/c][/li][li]Un sort Banal devient [c=warning]Instantané[/c][/li][li]Un sort Canalisé octroie un [c=shield]bouclier[/c] (30% du [c=mana]mana[/c] dépensé)[/li][/ul]");
        passifsVoies.put("Voie de la Destruction",
                "Accumule de la [c=crit]Chaleur[/c] en lançant des sorts.\nLorsque la chaleur atteint [c=warning]100[/c], le prochain sort lancé est entièrement [c=mana]gratuit[/c].");
        passifsVoies.put("Voie de la Violence",
                "Lancer un sort octroie une charge d'[c=warning]Inspiration[/c] ou d'[c=power]Expiration[/c] selon le sort :\n[ul][li][c=warning]Inspiration[/c] : [c=crit]+2% Critique[/c] par cumul (max 5)[/li][li][c=power]Expiration[/c] : [c=power]+2 Puissance[/c] par cumul (max 10)[/li][/ul]Attention : Lancer un sort d'une affinité consomme tous les cumuls de l'autre. Les cumuls sont perdus si aucun sort de la Voie n'est lancé pendant le tour.");

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
                        "Les sorts de cette spiritualité ne peuvent être lancés que si vous possédez au moins [c=pv]20% de vos PV max[/c] ET [c=mana]20% de votre Mana max[/c].");
            } else if ("Ténèbres".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Sauf pour les sorts de base, le lancement nécessite d'avoir [c=pv]80% ou moins de vos PV max[/c] OU [c=mana]80% ou moins de votre Mana max[/c].");
            } else if ("Karma".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Gère une jauge affectée par l'alignement des sorts ([c=purple]Ténèbres[/c], [c=karma]Harmonie[/c], [c=warning]Lumière[/c]).\n[ul][li]À [c=warning]0[/c] ([c=karma]Harmonie[/c]) : octroie des bonus sur vos sorts.[/li][li]À [c=warning]+4 ou -4[/c] : verrouille la magie karmique (sauf sorts d'[c=karma]Harmonie[/c]) pendant [c=warning]6 tours[/c], mais confère un buff massif d'[c=armor]Illumination (+Armure/Résist)[/c] ou de [c=power]Corruption (+Dégâts)[/c].[/li][/ul]Astuce : On peut réduire ce timer en lançant des sorts d'[c=karma]Harmonie[/c].");
            }
            spiritualiteRepository.save(sp);
        }
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

        Long mutationId = dto.getMutationId();
        if (mutationId != null) {
            mutationRepository.findById(mutationId).ifPresent(spell::setMutation);
        } else {
            spell.setMutation(null);
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
        private Long mutationId;
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

}
