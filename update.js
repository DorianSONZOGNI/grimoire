const fs = require('fs');
const file = 'c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/WebSpellCreationController.java';
let content = fs.readFileSync(file, 'utf8');

const passifsMap = {
    'Voie de la Raison': "Lancer un sort de Raison confère +1 Vitesse au tour suivant (max 10 cumuls, perdus si aucun n'est lancé). De plus, le score de Critique est augmenté d'un montant égal au double de la Vitesse.",
    'Voie de la Sûreté': "Accumule des points de Sûreté (10/tour et 20% du mana dépensé). À 100 points, octroie +15% de Critique, ou +25% si le palier est atteint passivement en début de tour.",
    'Voie de Trahison': "Une fois par tour, vos attaques physiques infligent des dégâts bruts bonus qui vous soignent : +10% de base, +15% si la cible a moins de 50% PV, et +10% si elle a un malus.",
    'Voie de la Consolidation': "Octroie +5% d'Armure par défaut. Lancer un sort remplace ce bonus selon son niveau (Nv1: +1 Vitesse, Nv2: +10% Armure, Nv3: +10% Résistance Magique, Nv4: Coût des sorts -20%, Nv5: +8% Armure et Résistance).",
    'Voie de la Conviction': "Régénère 25 points de mana par tour (+4 par niveau de Voie) et augmente le mana maximum de 20 par niveau au-delà du premier.",
    'Voie de la Création': "Modifie le 1er sort du tour : un sort Instantané devient gratuit, un sort Banal devient Instantané, et un sort Canalisé octroie un bouclier égal au mana dépensé.",
    'Voie de la Destruction': "Accumule de la 'Chaleur' en lançant des sorts. Lorsque la chaleur atteint 100, le prochain sort lancé est entièrement gratuit.",
    'Voie de la Violence': "Lancer un sort octroie des cumuls : l'Inspiration donne +2 Critique/cumul (max 5), l'Expiration donne +2 Puissance/cumul (max 10). Lancer une catégorie réinitialise l'autre. Stacks perdus si aucun sort n'est lancé au tour précédent."
};

const passifsSpiritMap = {
    'Esprit': "Les sorts de cette spiritualité ne peuvent être lancés que si vous possédez au moins 20% de vos PV max ET 20% de votre Mana max.",
    'Ténèbres': "Sauf pour les sorts de 'base', le lancement nécessite d'avoir 80% ou moins de vos PV max OU 80% ou moins de votre Mana max.",
    'Karma': "Gère une jauge affectée par l'alignement des sorts (Ténèbre, Harmonie, Lumière). À 0 (Harmonie), octroie des bonus sur vos sorts. À +4 ou -4, verrouille la magie karmique sauf les sorts d'Harmonie pendant 6 tours mais confère un buff massif d'Illumination (+Armure/Résist) ou de Corruption (+Dégâts). On peut réduire le timer de tour en lançant des sorts d'harmonie."
};

let mapStr = 'Map<String, String> voiePassifs = new HashMap<>();\n';
for (const [k, v] of Object.entries(passifsMap)) {
    mapStr += '        voiePassifs.put("' + k + '", "' + v.replace(/'/g, "\\'") + '");\n';
}

// Fixed ts(1005): Wrapped the Java code in backticks and injected k and v
const mapSpiritStr = Object.entries(passifsSpiritMap)
    .map(([k, v]) => `if ("${k}".equals(sp.getNom())) { sp.setPassiveDescription("${v.replace(/'/g, "\\'")}"); }`)
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
