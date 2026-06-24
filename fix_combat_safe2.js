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

let splitStr = `                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a Ã©tÃ© vaincu...");
                            }`;

let parts = txt.split(splitStr);
if (parts.length > 2) {
    // The second occurrence is the one inside the executeEnemyTurn loop.
    // Let's verify by replacing specifically the last one inside that block.
    // Actually, just find the index of "Vampire" and find the next occurrence of splitStr
    let vampIdx = txt.indexOf("PV (Vampire).");
    if (vampIdx > -1) {
        let insertIdx = txt.indexOf(splitStr, vampIdx);
        if (insertIdx > -1) {
            let before = txt.substring(0, insertIdx);
            let after = txt.substring(insertIdx + splitStr.length);
            
            let insertedText = `                            // === PASSIF TYPE : ECTOPLASME ===
                            if (mType == MonsterType.ECTOPLASME) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(-5);
                                eff.setDuration(3);
                                targetPlayer.getActiveBuffs().add(eff);
                                session.addLog("👻 " + targetPlayer.getName() + " perd 5 Résistance Magique pour 3 tours ! (Ectoplasme)");
                            }

` + splitStr + `
                            } // Fin de boucle for targetPlayer
`;
            txt = before + insertedText + after;
        }
    }
}

fs.writeFileSync(p, txt, 'utf8');
console.log("Done");
