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

const endTargetStr = `                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a été vaincu...");
                            }
                        }
                    }
                } else {`;

const endReplaceStr = `                            // === PASSIF TYPE : ECTOPLASME ===
                            if (mType == MonsterType.ECTOPLASME) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(-5);
                                eff.setDuration(3);
                                targetPlayer.getActiveBuffs().add(eff);
                                session.addLog("👻 " + targetPlayer.getName() + " perd 5 Résistance Magique pour 3 tours ! (Ectoplasme)");
                            }

                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a été vaincu...");
                            }
                            } // End of targetPlayers loop
                        }
                    }
                } else {`;

txt = txt.replace(endTargetStr, endReplaceStr);
fs.writeFileSync(p, txt, 'utf8');
console.log("Done");
