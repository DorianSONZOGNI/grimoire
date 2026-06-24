const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/combat.js';
let txt = fs.readFileSync(p, 'utf8');

// Use array splitting and mapping for precise line insertion
let lines = txt.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("'VAMPIRE': 'Vampire : Se soigne") && !lines[i].includes("ECTOPLASME")) {
        lines[i] = lines[i] + ",\n                'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un dÃ©buff de rÃ©sistance magique (-5 res pendant 3 tours).'";
    }
    
    if (lines[i].includes("'INSENSIBLE': \"Insensible : Ses attaques") && !lines[i].includes("TRANSCENDANT")) {
        lines[i] = lines[i] + ",\n                'TRANSCENDANT': \"Transcendant : Il attaque toutes les cibles adverse Ã  la fois.\"";
    }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log("combat.js titles properly injected.");
