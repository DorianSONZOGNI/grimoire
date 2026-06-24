const fs = require('fs');
const p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/pve-admin.js';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
    `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.' }`,
    `'VAMPIRE': 'Vampire : Se soigne de 20% des dégâts infligés.', 'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un débuff de résistance magique (-5 res pendant 3 tours).' }`
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
    `'VAMPIRE': { l: 'Vampire', i: 'bloodtype', c: '#e11d48' }`,
    `'VAMPIRE': { l: 'Vampire', i: 'bloodtype', c: '#e11d48' },
                'ECTOPLASME': { l: 'Ectoplasme', i: 'ghost', c: '#a855f7' }`
);

txt = txt.replace(
    `'INSENSIBLE': { l: 'Insensible', i: 'shield', c: '#9ca3af' }`,
    `'INSENSIBLE': { l: 'Insensible', i: 'shield', c: '#9ca3af' },
                'TRANSCENDANT': { l: 'Transcendant', i: 'all_inclusive', c: '#fbbf24' }`
);

fs.writeFileSync(p, txt, 'utf8');
console.log("Done");
