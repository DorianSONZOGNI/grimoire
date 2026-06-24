const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/combat.js';
let txt = fs.readFileSync(p, 'utf8');

// For monsterType
const typeTitlesOld = `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.'
            };`;
const typeTitlesNew = `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.',
                'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un débuff de résistance magique (-5 res pendant 3 tours).'
            };`;
txt = txt.replace(typeTitlesOld, typeTitlesNew);

const tIconOld = `'VAMPIRE': 'bloodtype' }[c.monsterType]`;
const tIconNew = `'VAMPIRE': 'bloodtype', 'ECTOPLASME': 'candle' }[c.monsterType]`;
txt = txt.replace(tIconOld, tIconNew);

const tLabelOld = `'VAMPIRE': 'Vampire' }[c.monsterType]`;
const tLabelNew = `'VAMPIRE': 'Vampire', 'ECTOPLASME': 'Ectoplasme' }[c.monsterType]`;
txt = txt.replace(tLabelOld, tLabelNew);

// For behavior
const behaviorTitlesOld = `'INSENSIBLE': "Insensible : Ses attaques infligent des dégâts bruts (ignore l'armure)."
            };`;
const behaviorTitlesNew = `'INSENSIBLE': "Insensible : Ses attaques infligent des dégâts bruts (ignore l'armure).",
                'TRANSCENDANT': "Transcendant : Il attaque toutes les cibles adverse à la fois."
            };`;
txt = txt.replace(behaviorTitlesOld, behaviorTitlesNew);

const bIconOld = `'INSENSIBLE': 'shield' }[c.behavior]`;
const bIconNew = `'INSENSIBLE': 'shield', 'TRANSCENDANT': 'grid_view' }[c.behavior]`;
txt = txt.replace(bIconOld, bIconNew);

const bLabelOld = `'INSENSIBLE': 'Insensible' }[c.behavior]`;
const bLabelNew = `'INSENSIBLE': 'Insensible', 'TRANSCENDANT': 'Transcendant' }[c.behavior]`;
txt = txt.replace(bLabelOld, bLabelNew);

// In the screenshot, ECTOPLASME had a red border, probably because its type was missing, wait no.
// Wait! `tIcon` and `bIcon` might be the only missing pieces, but the color!
// In combat.js: 
// `background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);` for ALL monster types!
// Wait! It seems `combat.js` uses a static color for the badge for all types?
// Let's check `combat.js` again.
// Yes, `monsterBadgesHtml += \`<span ... style="... background: rgba(239, 68, 68, 0.15); color: #ef4444; ..."\>`
// And for behavior: `background: rgba(139, 92, 246, 0.15); color: #8b5cf6; ...`
// So colors in `combat.js` are fixed to red for type and purple for behavior. The problem was just the uppercase and missing icon.

fs.writeFileSync(p, txt, 'utf8');
console.log("combat.js updated.");
