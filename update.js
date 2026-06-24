const fs = require('fs');
const file = 'c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/controller/WebSpellCreationController.java';
let content = fs.readFileSync(file, 'utf8');

const passifsMap = {
    'Voie de la Raison': 'Si un sort de Raison est lancé, les sorts de type Inspiration et Expiration coûtent 10% de PV/Mana en moins pour ce tour.',
    'Voie de la Sûreté': 'Augmente passivement l\\'armure et la résistance en fonction du mana dépensé.',
    'Voie de Trahison': 'Les attaques infligent plus de dégâts mais consument des PV selon la cible.',
    'Voie de la Consolidation': 'Booste les statistiques de base du personnage après le lancement d\\'un sort.',
    'Voie de la Conviction': 'Les soins et dégâts sont ajustés en fonction de la conviction.',
    'Voie de la Création': 'Permet aux sorts de type Banal d\\'être lancés de manière instantanée.',
    'Voie de la Destruction': 'Ajuste la puissance des sorts et leur coût en combat.',
    'Voie de la Violence': 'Le lancement d\\'un sort octroie des effets d\\'Inspiration ou d\\'Expiration supplémentaires.'
};

const passifsSpiritMap = {
    'Esprit': 'Régénération de mana augmentée.',
    'Ténèbres': 'Résistance accrue aux attaques magiques ténébreuses.',
    'Karma': 'Renvoie une portion des dégâts reçus aux attaquants.'
};

let mapStr = 'Map<String, String> voiePassifs = new HashMap<>();\n';
for (const [k, v] of Object.entries(passifsMap)) {
    mapStr += '        voiePassifs.put(\"' + k + '\", \"' + v.replace(/\\'/g, \"\\\\'\") + '\");\n';
}

const mapSpiritStr = Object.entries(passifsSpiritMap).map(([k, v]) => if (\"\".equals(sp.getNom())) { sp.setPassiveDescription(\"\"); }).join(' else ');


// Insert the update logic into initStandardEntities
const methodStart = content.indexOf('public void initStandardEntities() {');
const forStart = content.indexOf('for (String v : voies) {', methodStart);
const injection = 
        
        for (String v : voies) {
;
content = content.replace('for (String v : voies) {', injection);

const saveVoieStr = 'voieRepository.save(voie);';
// we replace save(voie) calls to set the passiveDescription first
content = content.replace(/voieRepository\\.save\\(voie\\);/g, 
                  if (voiePassifs.containsKey(v)) {
                      voie.setPassiveDescription(voiePassifs.get(v));
                  }
                  voieRepository.save(voie);
);

// For Spiritualites
const spiritUpdates = 
        for (Spiritualite sp : spiritualiteRepository.findAll()) {
            
            spiritualiteRepository.save(sp);
        }
;

// Insert at the end of initStandardEntities
const putCastingTypes = content.indexOf('meta.put(\"castingTypes\"');
const metaGetCreationMeta = content.indexOf('public ResponseEntity<Map<String, Object>> getCreationMeta() {');

// insert before getCreationMeta
const endOfInit = content.lastIndexOf('}', metaGetCreationMeta) - 1;
content = content.substring(0, endOfInit) + spiritUpdates + content.substring(endOfInit);

fs.writeFileSync(file, content, 'utf8');
