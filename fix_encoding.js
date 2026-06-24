const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/combat.js';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace("dÃƒÂ©buff", "d\u00e9buff");
txt = txt.replace("rÃƒÂ©sistance", "r\u00e9sistance");
txt = txt.replace("ÃƒÂ  la fois", "\u00e0 la fois");

// Also let's fix any occurrences of 'dÃ©buff' just in case
txt = txt.replace(/dÃ©buff/g, "d\u00e9buff");
txt = txt.replace(/rÃ©sistance/g, "r\u00e9sistance");
txt = txt.replace(/Ã  la fois/g, "\u00e0 la fois");

fs.writeFileSync(p, txt, 'utf8');
console.log("combat.js text fixed.");
