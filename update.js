const fs = require('fs');
const file = 'c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/WebSpellCreationController.java';
let content = fs.readFileSync(file, 'utf8');

const passifsMap = {
    'Voie de la Raison': "Lancer un sort de Raison confère <strong style=\"color: #facc15;\">+1 Vitesse</strong> au tour suivant (max <span style=\"color: #facc15;\">10 cumuls</span>, perdus si aucun n'est lancé).<br>De plus, le score de <strong style=\"color: #ef4444;\">Critique</strong> est augmenté d'un montant égal au <span style=\"font-weight: bold; color: #10b981;\">double de la Vitesse</span>.",
    'Voie de la Sûreté': "Accumule des <strong style=\"color: #3b82f6;\">points de Sûreté</strong> (10/tour et 20% du mana dépensé).<br>À <strong style=\"color: #6366f1;\">100 points</strong>, octroie <strong style=\"color: #ef4444;\">+15% de Critique</strong>, ou <strong style=\"color: #ef4444;\">+25%</strong> si le palier est atteint passivement en début de tour.",
    'Voie de Trahison': "Une fois par tour, vos <strong style=\"color: #ef4444;\">attaques physiques</strong> infligent des dégâts bruts bonus <strong style=\"color: #10b981;\">qui vous soignent</strong> :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li><strong style=\"color: #facc15;\">+10%</strong> de base</li><li><strong style=\"color: #facc15;\">+15%</strong> si la cible a moins de 50% PV</li><li><strong style=\"color: #facc15;\">+10%</strong> si elle a un malus</li></ul>",
    'Voie de la Consolidation': "Octroie <strong style=\"color: #3b82f6;\">+5% d'Armure</strong> par défaut. Lancer un sort remplace ce bonus selon son niveau :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li>Nv1: <strong style=\"color: #facc15;\">+1 Vitesse</strong></li><li>Nv2: <strong style=\"color: #3b82f6;\">+10% Armure</strong></li><li>Nv3: <strong style=\"color: #a855f7;\">+10% Résistance Magique</strong></li><li>Nv4: Coût des sorts <strong style=\"color: #10b981;\">-20%</strong></li><li>Nv5: <strong style=\"color: #eab308;\">+8% Armure et Résistance</strong></li></ul>",
    'Voie de la Conviction': "Régénère <strong style=\"color: #3b82f6;\">25 points de mana</strong> par tour (<span style=\"color: #3b82f6;\">+4</span> par niveau de Voie).<br>Augmente le <strong style=\"color: #3b82f6;\">mana maximum de 20</strong> par niveau au-delà du premier.",
    'Voie de la Création': "Modifie le <strong style=\"color: #facc15;\">1er sort du tour</strong> :<ul style=\"margin-top: 4px; margin-bottom: 4px; padding-left: 20px;\"><li>Un sort Instantané devient <strong style=\"color: #10b981;\">gratuit</strong></li><li>Un sort Banal devient <strong style=\"color: #facc15;\">Instantané</strong></li><li>Un sort Canalisé octroie un <strong style=\"color: #3b82f6;\">bouclier</strong> égal au mana dépensé</li></ul>",
    'Voie de la Destruction': "Accumule de la <strong style=\"color: #ef4444;\">Chaleur</strong> en lançant des sorts.<br>Lorsque la chaleur atteint <strong style=\"color: #ef4444;\">100</strong>, le prochain sort lancé est entièrement <strong style=\"color: #10b981;\">gratuit</strong>.",
    'Voie de la Violence': "Lancer un sort octroie des cumuls : l'<strong style=\"color: #facc15;\">Inspiration</strong> donne <strong style=\"color: #ef4444;\">+2 Critique</strong>/cumul (max 5), l'<strong style=\"color: #a855f7;\">Expiration</strong> donne <strong style=\"color: #ef4444;\">+2 Puissance</strong>/cumul (max 10). Lancer une catégorie réinitialise l'autre. Stacks perdus si aucun sort n'est lancé au tour précédent."
};

const passifsSpiritMap = {
    'Esprit': "Les sorts de cette spiritualité ne peuvent être lancés que si vous possédez au moins <strong style=\"color: #10b981;\">20% de vos PV max</strong> <span style=\"font-weight: bold; color: #f59e0b;\">ET</span> <strong style=\"color: #3b82f6;\">20% de votre Mana max</strong>.",
    'Ténèbres': "Sauf pour les sorts de <i>'base'</i>, le lancement nécessite d'avoir <strong style=\"color: #ef4444;\">80% ou moins de vos PV max</strong> <span style=\"font-weight: bold; color: #f59e0b;\">OU</span> <strong style=\"color: #3b82f6;\">80% ou moins de votre Mana max</strong>.",
    'Karma': "Gère une jauge affectée par l'alignement des sorts (<em>Ténèbres, Harmonie, Lumière</em>).<ul style=\"margin-top: 6px; margin-bottom: 6px; padding-left: 20px;\"><li>À <strong style=\"color: #8b5cf6;\">0 (Harmonie)</strong> : octroie des bonus sur vos sorts.</li><li>À <strong style=\"color: #ef4444;\">+4</strong> ou <strong style=\"color: #ef4444;\">-4</strong> : verrouille la magie karmique (sauf sorts d'Harmonie) pendant <strong style=\"color: #fb923c;\">6 tours</strong>, mais confère un buff massif d'<strong style=\"color: #eab308;\">Illumination</strong> (+Armure/Résist) ou de <strong style=\"color: #a855f7;\">Corruption</strong> (+Dégâts).</li></ul><span style=\"color: #94a3b8; font-size: 0.9em;\">💡 Astuce : On peut réduire ce timer en lançant des sorts d'Harmonie.</span>"
};

let mapStr = 'Map<String, String> voiePassifs = new HashMap<>();\n';
for (const [k, v] of Object.entries(passifsMap)) {
    mapStr += '        voiePassifs.put("' + k + '", "' + v.replace(/"/g, '\\"').replace(/'/g, "\\'") + '");\n';
}

// Fixed ts(1005): Wrapped the Java code in backticks and injected k and v
const mapSpiritStr = Object.entries(passifsSpiritMap)
    .map(([k, v]) => `if ("${k}".equals(sp.getNom())) { sp.setPassiveDescription("${v.replace(/"/g, '\\"').replace(/'/g, "\\'")}"); }`)
    .join(' else ');

// Insert the update logic into initStandardEntities
const methodStart = content.indexOf('public void initStandardEntities() {');
const forStart = content.indexOf('for (String v : voies) {', methodStart);

// Fixed ts(1434): Wrapped raw Java in backticks
const injection = `
        for (String v : voies) {
`;

content = content.replace('for (String v : voies) {', injection);

const saveVoieStr = 'voieRepository.save(voie);';

// Fixed ts(1434): Wrapped the replacement Java string in backticks
// Note: Escaped the regex backslashes for the replace target as well
content = content.replace(/voieRepository\.save\(voie\);/g, `
        if (voiePassifs.containsKey(v)) {
            voie.setPassiveDescription(voiePassifs.get(v));
        }
        voieRepository.save(voie);
`);

// For Spiritualites
// Fixed ts(1434): Wrapped raw Java in backticks.
// (I also assumed you wanted to inject mapSpiritStr inside this loop!)
const spiritUpdates = `
        for (Spiritualite sp : spiritualiteRepository.findAll()) {
            ${mapSpiritStr}
            spiritualiteRepository.save(sp);
        }
`;

// Insert at the end of initStandardEntities
const putCastingTypes = content.indexOf('meta.put(\"castingTypes\"');
const metaGetCreationMeta = content.indexOf('public ResponseEntity<Map<String, Object>> getCreationMeta() {');

// insert before getCreationMeta
const endOfInit = content.lastIndexOf('}', metaGetCreationMeta) - 1;
content = content.substring(0, endOfInit) + spiritUpdates + content.substring(endOfInit);

fs.writeFileSync(file, content, 'utf8');
