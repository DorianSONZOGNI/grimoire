const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/combat.js';
let txt = fs.readFileSync(p, 'utf8');

// For monsterType
const typeTitlesOld = `'VAMPIRE': 'Vampire :`;
const typeTitlesNew = `'VAMPIRE': 'Vampire :',
                'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un débuff de résistance magique (-5 res pendant 3 tours).',
                // _VAMPIRE_`;

if (!txt.includes('ECTOPLASME')) {
    txt = txt.replace(/'VAMPIRE': 'Vampire : [^']+'\s*\};/g, `$&`.replace('};', `, 'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un débuff de résistance magique (-5 res pendant 3 tours).' };`));

    txt = txt.replace(/'VAMPIRE': 'bloodtype' \}\[c\.monsterType\]/g, `'VAMPIRE': 'bloodtype', 'ECTOPLASME': 'candle' }[c.monsterType]`);

    txt = txt.replace(/'VAMPIRE': 'Vampire' \}\[c\.monsterType\]/g, `'VAMPIRE': 'Vampire', 'ECTOPLASME': 'Ectoplasme' }[c.monsterType]`);

    // For behavior
    txt = txt.replace(/'INSENSIBLE': "Insensible : [^"]+"\s*\};/g, `$&`.replace('};', `, 'TRANSCENDANT': "Transcendant : Il attaque toutes les cibles adverse à la fois." };`));

    txt = txt.replace(/'INSENSIBLE': 'shield' \}\[c\.behavior\]/g, `'INSENSIBLE': 'shield', 'TRANSCENDANT': 'grid_view' }[c.behavior]`);

    txt = txt.replace(/'INSENSIBLE': 'Insensible' \}\[c\.behavior\]/g, `'INSENSIBLE': 'Insensible', 'TRANSCENDANT': 'Transcendant' }[c.behavior]`);
    
    fs.writeFileSync(p, txt, 'utf8');
    console.log("combat.js updated.");
} else {
    console.log("Already updated");
}
