package generation.grimoire.service;

import generation.grimoire.entity.Spiritualite;
import generation.grimoire.entity.Voie;
import generation.grimoire.entity.voie.passif.VoiePassiveEffect;
import generation.grimoire.entity.voie.passif.specific.*;
import generation.grimoire.repository.SpiritualiteRepository;
import generation.grimoire.repository.VoieRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service responsable de l'initialisation des données de référence (Voies,
 * Spiritualités).
 * Déclenché après le démarrage complet de l'application pour éviter tout
 * problème
 * de dépendance cyclique ou de schema non-initialisé.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataInitializerService {

    private final VoieRepository voieRepository;
    private final SpiritualiteRepository spiritualiteRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initStandardEntities() {
        log.info("Initialisation des entités de référence (Voies, Spiritualités)...");

        // 1. Descriptions des Voies
        Map<String, String> descriptionsVoies = new HashMap<>();
        descriptionsVoies.put("Voie de la Raison", "Basé sur la vitesse et les coups critique.");
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

        // 2. Rangs personnalisés par Voie
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

        // 3. Descriptions de passifs
        Map<String, String> passifsVoies = new HashMap<>();
        passifsVoies.put("Voie de la Raison",
                "Lancer un sort de Raison confère [c=speed]+1 Vitesse[/c] au tour suivant (max [c=warning]10 cumuls[/c], perdus si aucun n'est lancé).\nDe plus, le score de [c=crit]Critique[/c] est augmenté d'un montant égal au [c=speed]double de la Vitesse[/c].\n \nÀ chaque niveau, vous gagnez : [c=pv]+6 PV[/c], [c=mana]+6 Mana[/c] et [c=speed]+1 Vitesse[/c].");
        passifsVoies.put("Voie de la Sûreté",
                "Accumule des [c=shield]points de Sûreté[/c] (10/tour et 35% du [c=mana]mana[/c] dépensé).\nÀ [c=warning]100 points[/c], octroie [c=crit]+15% de Critique[/c], ou [c=crit]+25%[/c] si le palier est atteint passivement en début de tour.\n \nÀ chaque niveau, vous gagnez : [c=mana]+12 Mana[/c], [c=resist]+1 Résistance[/c] et [c=mana]+2 Régen Mana[/c].");
        passifsVoies.put("Voie de Trahison",
                "Une fois par tour, vos [c=physic]attaques physiques[/c] infligent des dégâts bruts bonus [c=heal]qui vous soignent[/c] :\n[ul][li][c=brut]+10%[/c] de base[/li][li][c=brut]+20%[/c] si la cible a moins de 50% [c=pv]PV[/c][/li][li][c=brut]+15%[/c] si elle a un malus[/li][/ul]\n \nÀ chaque niveau, vous gagnez : [c=physic]+1 Force[/c], [c=speed]+1 Vitesse[/c] et [c=crit]+2 Critique[/c].");
        passifsVoies.put("Voie de la Consolidation",
                "Octroie [c=armor]+5% d'Armure[/c] par défaut. Lancer un sort remplace ce bonus selon son niveau :\n[ul][li]Nv1: [c=speed]+2 Vitesse[/c][/li][li]Nv2: [c=armor]+15% Armure[/c][/li][li]Nv3: [c=resist]+15% Résistance Magique[/c][/li][li]Nv4: Coût des sorts [c=mana]-25%[/c][/li][li]Nv5: [c=armor]+10% Armure[/c] et [c=resist]Résistance[/c][/li][/ul]\n \nÀ chaque niveau, vous gagnez : [c=pv]+5 PV[/c], [c=armor]+2 Armure[/c] et [c=resist]+2 Résistance[/c].");
        passifsVoies.put("Voie de la Conviction",
                "La Conviction est une force brute inarrêtable dénuée de mécanique complexe, se reposant entièrement sur des statistiques écrasantes.\nDès le niveau 1, elle offre une [c=mana]Régénération de Mana[/c] colossale (25/tour), en contrepartie, ces sorts coûtent plus cher.\n \nÀ chaque niveau, vous gagnez : [c=power]+1 Puissance[/c], [c=resist]+2 Résistance[/c], [c=pv]+7 PV[/c], [c=mana]+20 Mana[/c] et [c=mana]+4 Régen Mana[/c].");
        passifsVoies.put("Voie de la Création",
                "Chaque tour, le 1er sort lancé consomme un [c=heal]bourgeon[/c] s'il vous en reste en stock.\nVoici les effets du [c=heal]bourgeon[/c] pour chaque type de sort :\n[ul][li]Un sort Instantané devient [c=mana]gratuit[/c][/li][li]Un sort Banal devient [c=warning]Instantané[/c][/li][li]Un sort Canalisé octroie un [c=shield]bouclier[/c] (30% du [c=mana]mana[/c] dépensé)[/li][/ul]\n \nÀ chaque niveau, vous gagnez : [c=pv]+5 PV[/c], [c=armor]+1 Armure[/c] et [c=heal]+2 Régen PV[/c].");
        passifsVoies.put("Voie de la Destruction",
                "Accumule de la [c=crit]Chaleur[/c] en lançant des sorts.\nLorsque la chaleur atteint [c=warning]100[/c], le prochain sort lancé est entièrement [c=mana]gratuit[/c].\n \nÀ chaque niveau, vous gagnez : [c=mana]+8 Mana[/c], [c=power]+2 Puissance[/c] et [c=mana]+2 Régen Mana[/c].");
        passifsVoies.put("Voie de la Violence",
                "Lancer un sort octroie une charge d'[c=warning]Inspiration[/c] ou d'[c=power]Expiration[/c] selon le sort :\n[ul][li][c=warning]Inspiration[/c] : [c=crit]+2% Critique[/c] par cumul (max 5)[/li][li][c=power]Expiration[/c] : [c=power]+2 Puissance[/c] par cumul (max 10)[/li][/ul]Attention : Lancer un sort d'une affinité consomme tous les cumuls de l'autre. Les cumuls sont perdus si aucun sort de la Voie n'est lancé pendant le tour.\n \nÀ chaque niveau, vous gagnez : [c=mana]+8 Mana[/c], [c=power]+1 Puissance[/c] et [c=physic]+1 Force[/c].");

        String[] voies = {
                "Voie de la Raison", "Voie de la Sûreté", "Voie de Trahison", "Voie de la Consolidation",
                "Voie de la Conviction", "Voie de la Création", "Voie de la Destruction", "Voie de la Violence"
        };

        for (String v : voies) {
            Optional<Voie> optVoie = voieRepository.findByNom(v);
            Voie voie = optVoie.orElseGet(() -> {
                Voie newVoie = new Voie();
                newVoie.setNom(v);
                return newVoie;
            });

            voie.setDescription(descriptionsVoies.getOrDefault(v, "Voie classique du grimoire."));
            if (rangsVoies.containsKey(v)) {
                voie.getRankNames().putAll(rangsVoies.get(v));
            }
            if (passifsVoies.containsKey(v)) {
                voie.setPassiveDescription(passifsVoies.get(v));
            }

            if (voie.getPassiveEffects() == null || voie.getPassiveEffects().isEmpty()) {
                VoiePassiveEffect passif = switch (v) {
                    case "Voie de la Raison" -> new RaisonPassiveEffect();
                    case "Voie de la Sûreté" -> new SuretePassiveEffect();
                    case "Voie de Trahison" -> new TrahisonPassiveEffect();
                    case "Voie de la Consolidation" -> new ConsolidationPassiveEffect();
                    case "Voie de la Conviction" -> new ConvictionPassiveEffect();
                    case "Voie de la Création" -> new CreationPassiveEffect();
                    case "Voie de la Destruction" -> new DestructionPassiveEffect();
                    case "Voie de la Violence" -> new ViolencePassiveEffect();
                    default -> null;
                };
                if (passif != null) {
                    passif.setVoie(voie);
                    voie.setPassiveEffects(List.of(passif));
                }
            }
            voieRepository.save(voie);
        }

        // Rangs des spiritualités
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

        // Descriptions passives
        for (Spiritualite sp : spiritualiteRepository.findAll()) {
            if ("Esprit".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Les sorts de cette spiritualité ne peuvent être lancés que si vous possédez au moins [c=pv]20% de vos PV max[/c] ET [c=mana]20% de votre Mana max[/c].");
            } else if ("Ténèbres".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Sauf pour les sorts de base, le lancement nécessite d'avoir [c=pv]80% ou moins de vos PV max[/c] OU [c=mana]80% ou moins de votre Mana max[/c].");
            } else if ("Karma".equals(sp.getNom())) {
                sp.setPassiveDescription(
                        "Gère une jauge affectée par l'alignement des sorts ([c=purple]Ténèbres[/c], [c=karma]Harmonie[/c], [c=warning]Lumière[/c]).\n[ul][li]À [c=warning]0[/c] ([c=karma]Harmonie[/c]) : octroie des bonus sur vos sorts ([c=purple]10% dégats[/c], [c=karma]Régen 5% vie max et mana max[/c], [c=warning]-20% coût[/c]).[/li][li]À [c=warning]+4 ou -4[/c] : verrouille la magie karmique (sauf sorts d'[c=karma]Harmonie[/c]) pendant [c=warning]6 tours[/c], mais confère un buff massif d'[c=armor]Illumination (+Armure/Résist)[/c] ou de [c=power]Corruption (+Dégâts)[/c].[/li][/ul]Astuce : On peut réduire ce timer en lançant des sorts d'[c=karma]Harmonie[/c].");
            }
            spiritualiteRepository.save(sp);
        }

        log.info("Initialisation des entités de référence terminée.");
    }
}
