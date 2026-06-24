const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/combat.js';
let txt = fs.readFileSync(p, 'utf8');

const tSearch = "'VAMPIRE': 'Vampire : Se soigne de 20% des dÃ©gÃ¢ts infligÃ©s.'\r\n            };";
const tReplace = "'VAMPIRE': 'Vampire : Se soigne de 20% des dÃ©gÃ¢ts infligÃ©s.',\r\n                'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un dÃ©buff de rÃ©sistance magique (-5 res pendant 3 tours).'\r\n            };";
txt = txt.replace(tSearch, tReplace);

const tSearch2 = "'VAMPIRE': 'Vampire : Se soigne de 20% des dÃ©gÃ¢ts infligÃ©s.'\n            };";
const tReplace2 = "'VAMPIRE': 'Vampire : Se soigne de 20% des dÃ©gÃ¢ts infligÃ©s.',\n                'ECTOPLASME': 'Ectoplasme : Ces attaques appliquent un dÃ©buff de rÃ©sistance magique (-5 res pendant 3 tours).'\n            };";
txt = txt.replace(tSearch2, tReplace2);

const bSearch = "'INSENSIBLE': \"Insensible : Ses attaques infligent des dÃ©gÃ¢ts bruts (ignore l'armure).\"\r\n            };";
const bReplace = "'INSENSIBLE': \"Insensible : Ses attaques infligent des dÃ©gÃ¢ts bruts (ignore l'armure).\",\r\n                'TRANSCENDANT': \"Transcendant : Il attaque toutes les cibles adverse Ã  la fois.\"\r\n            };";
txt = txt.replace(bSearch, bReplace);

const bSearch2 = "'INSENSIBLE': \"Insensible : Ses attaques infligent des dÃ©gÃ¢ts bruts (ignore l'armure).\"\n            };";
const bReplace2 = "'INSENSIBLE': \"Insensible : Ses attaques infligent des dÃ©gÃ¢ts bruts (ignore l'armure).\",\n                'TRANSCENDANT': \"Transcendant : Il attaque toutes les cibles adverse Ã  la fois.\"\n            };";
txt = txt.replace(bSearch2, bReplace2);

fs.writeFileSync(p, txt, 'utf8');
console.log("combat.js type and behavior titles updated.");
