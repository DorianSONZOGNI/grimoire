const fs = require('fs');
const p = 'c:/Users/doria/Desktop/Project/grimoire/src/main/java/generation/grimoire/service/pve/CombatService.java';
let txt = fs.readFileSync(p, 'utf8');

const targetStr = `                            Personnage targetPlayer = resolveMonsterTarget(m, behavior, alivePlayers, session);`;
const replaceStr = `                            List<Personnage> targetPlayers = new java.util.ArrayList<>();
                            if (behavior == MonsterBehavior.TRANSCENDANT) {
                                targetPlayers.addAll(alivePlayers);
                            } else {
                                targetPlayers.add(resolveMonsterTarget(m, behavior, alivePlayers, session));
                            }

                            for (Personnage targetPlayer : targetPlayers) {`;
txt = txt.replace(targetStr, replaceStr);

let vampIdx = txt.indexOf("PV (Vampire).");
if (vampIdx > -1) {
    let vaincuIdx = txt.indexOf("vaincu...", vampIdx);
    let ifStart = txt.lastIndexOf("if (targetPlayer.getHealthCurrent()", vaincuIdx);

    let before = txt.substring(0, ifStart);
    let after = txt.substring(ifStart);

    let ecto = `                            // === PASSIF TYPE : ECTOPLASME ===
                            if (mType == MonsterType.ECTOPLASME) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(-5);
                                eff.setDuration(3);
                                targetPlayer.getActiveBuffs().add(eff);
                                session.addLog("👻 " + targetPlayer.getName() + " perd 5 Résistance Magique pour 3 tours ! (Ectoplasme)");
                            }

`;

    txt = before + ecto + after;

    let vaincuIdx2 = txt.indexOf("vaincu...", ifStart + ecto.length);
    let braceIdx = txt.indexOf("}", vaincuIdx2) + 1;

    let beforeBrace = txt.substring(0, braceIdx);
    let afterBrace = txt.substring(braceIdx);

    let closeLoop = `
                            } // End of targetPlayer loop`;

    txt = beforeBrace + closeLoop + afterBrace;
}

fs.writeFileSync(p, txt, 'utf8');
console.log("Done final safe script");
