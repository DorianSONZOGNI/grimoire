const fs = require('fs');
const p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/pve-admin.js';
let txt = fs.readFileSync(p, 'utf8');

// Replace MonsterType logic
txt = txt.replace(
    `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.' }`,
    `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.', 'ECTOPLASME': 'Ectoplasme : Applique un débuff de résistance magique (-5 res pendant 3 tours).' }`
);

txt = txt.replace(
    `'VAMPIRE': 'bloodtype' }`,
    `'VAMPIRE': 'bloodtype', 'ECTOPLASME': 'ghost' }`
);

txt = txt.replace(
    `'VAMPIRE': 'Vampire' }`,
    `'VAMPIRE': 'Vampire', 'ECTOPLASME': 'Ectoplasme' }`
);

txt = txt.replace(
    `if (mt === 'VAMPIRE')`,
    `if (mt === 'VAMPIRE') { tData = { l: 'Vampire', i: 'bloodtype', c: '#e11d48' }; }
            else if (mt === 'ECTOPLASME')`
);

txt = txt.replace(
    `else if (mt === 'ECTOPLASME') { tData = { l: 'Ectoplasme', i: 'ghost', c: '#a855f7' }; }`,
    `else if (mt === 'ECTOPLASME') { tData = { l: 'Ectoplasme', i: 'ghost', c: '#a855f7' }; }` // Noop, wait... Let's just find the exact text
);

// We need to also patch selectMonsterBehavior logic and the display for behavior.
txt = txt.replace(
    `'INSENSIBLE': 'Insensible : Ses attaques infligent des dégâts bruts (ignore l&apos;armure).' }`,
    `'INSENSIBLE': 'Insensible : Ses attaques infligent des dégâts bruts (ignore l&apos;armure).', 'TRANSCENDANT': 'Transcendant : Il attaque toutes les cibles adverse à la fois.' }`
);

txt = txt.replace(
    `'INSENSIBLE': 'shield' }`,
    `'INSENSIBLE': 'shield', 'TRANSCENDANT': 'all_inclusive' }`
);

txt = txt.replace(
    `'INSENSIBLE': 'Insensible' }`,
    `'INSENSIBLE': 'Insensible', 'TRANSCENDANT': 'Transcendant' }`
);

txt = txt.replace(
    `if (mb === 'INSENSIBLE') bData = { l: 'Insensible', i: 'shield', c: '#9ca3af' };`,
    `if (mb === 'INSENSIBLE') bData = { l: 'Insensible', i: 'shield', c: '#9ca3af' };
            else if (mb === 'TRANSCENDANT') bData = { l: 'Transcendant', i: 'all_inclusive', c: '#fbbf24' };`
);

fs.writeFileSync(p, txt, 'utf8');
console.log("Done JS");
