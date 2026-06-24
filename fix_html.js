const fs = require('fs');
const p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/pve-admin.html';
let txt = fs.readFileSync(p, 'utf8');

const targetType = `<div class="custom-option"
                                                onclick="selectMonsterType('VAMPIRE', 'Vampire', 'bloodtype', '#e11d48')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #e11d48;">bloodtype</span>Vampire
                                            </div>`;

const replaceType = targetType + `
                                            <div class="custom-option"
                                                onclick="selectMonsterType('ECTOPLASME', 'Ectoplasme', 'ghost', '#a855f7')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #a855f7;">ghost</span>Ectoplasme
                                            </div>`;

txt = txt.replace(targetType, replaceType);

const targetBehavior = `<div class="custom-option"
                                                onclick="selectMonsterBehavior('INSENSIBLE', 'Insensible', 'shield', '#9ca3af')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #9ca3af;">shield</span>Insensible
                                            </div>`;

const replaceBehavior = targetBehavior + `
                                            <div class="custom-option"
                                                onclick="selectMonsterBehavior('TRANSCENDANT', 'Transcendant', 'all_inclusive', '#fbbf24')">
                                                <span class="material-symbols-outlined cs-icon"
                                                    style="color: #fbbf24;">all_inclusive</span>Transcendant
                                            </div>`;

txt = txt.replace(targetBehavior, replaceBehavior);
fs.writeFileSync(p, txt, 'utf8');
console.log("Done HTML");
