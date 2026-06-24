const fs = require('fs');

function replaceFile(path, replacements) {
    let txt = fs.readFileSync(path, 'utf8');
    for (const [from, to] of replacements) {
        txt = txt.split(from).join(to);
    }
    fs.writeFileSync(path, txt, 'utf8');
}

const htmlPath = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/pve-admin.html';
replaceFile(htmlPath, [
    ["onclick=\"selectMonsterType('ECTOPLASME', 'Ectoplasme', 'ghost', '#a855f7')\"", "onclick=\"selectMonsterType('ECTOPLASME', 'Ectoplasme', 'candle', '#a855f7')\""],
    [">ghost</span>Ectoplasme", ">candle</span>Ectoplasme"],
    ["onclick=\"selectMonsterBehavior('TRANSCENDANT', 'Transcendant', 'all_inclusive', '#fbbf24')\"", "onclick=\"selectMonsterBehavior('TRANSCENDANT', 'Transcendant', 'grid_view', '#fbbf24')\""],
    [">all_inclusive</span>Transcendant", ">grid_view</span>Transcendant"]
]);

const jsPath = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/pve-admin.js';
replaceFile(jsPath, [
    ["'ECTOPLASME': 'ghost'", "'ECTOPLASME': 'candle'"],
    ["'ECTOPLASME': { l: 'Ectoplasme', i: 'ghost', c: '#a855f7' }", "'ECTOPLASME': { l: 'Ectoplasme', i: 'candle', c: '#a855f7' }"],
    ["'TRANSCENDANT': 'all_inclusive'", "'TRANSCENDANT': 'grid_view'"],
    ["'TRANSCENDANT': { l: 'Transcendant', i: 'all_inclusive', c: '#fbbf24' }", "'TRANSCENDANT': { l: 'Transcendant', i: 'grid_view', c: '#fbbf24' }"]
]);

console.log("Icons updated.");
