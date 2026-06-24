const fs = require('fs');
let p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/pve-admin.html';
let txt = fs.readFileSync(p, 'utf8');

if (!txt.includes('ECTOPLASME')) {
    let idx = txt.indexOf(`selectMonsterType('VAMPIRE'`);
    let insertIdx = txt.indexOf('</div>', idx) + 6;
    let before = txt.substring(0, insertIdx);
    let after = txt.substring(insertIdx);
    let insertStr = `
                                            <div class="custom-option"
                                                onclick="selectMonsterType('ECTOPLASME', 'Ectoplasme', 'ghost', '#a855f7')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #a855f7;">ghost</span>Ectoplasme
                                            </div>`;
    txt = before + insertStr + after;
}

if (!txt.includes('TRANSCENDANT')) {
    let idx = txt.indexOf(`selectMonsterBehavior('INSENSIBLE'`);
    let insertIdx = txt.indexOf('</div>', idx) + 6;
    let before = txt.substring(0, insertIdx);
    let after = txt.substring(insertIdx);
    let insertStr = `
                                            <div class="custom-option"
                                                onclick="selectMonsterBehavior('TRANSCENDANT', 'Transcendant', 'all_inclusive', '#fbbf24')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #fbbf24;">all_inclusive</span>Transcendant
                                            </div>`;
    txt = before + insertStr + after;
}

fs.writeFileSync(p, txt, 'utf8');
console.log("HTML Fixed");
