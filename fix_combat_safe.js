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

const vampStr = `// === PASSIF TYPE : VAMPIRE`;
const endReplaceStr = `// === PASSIF TYPE : ECTOPLASME ===
                            if (mType == MonsterType.ECTOPLASME) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(-5);
                                eff.setDuration(3);
                                targetPlayer.getActiveBuffs().add(eff);
                                session.addLog("👻 " + targetPlayer.getName() + " perd 5 Résistance pour 3 tours ! (Ectoplasme)");
                            }

                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a été vaincu...");
                            }
                            } // Fin de boucle for targetPlayer
                        }
                    }
                } else {
                    session.addLog(m.getBase().getName() + " a succombé à ses blessures avant de pouvoir attaquer !");`;

// We'll replace everything from // === PASSIF TYPE : VAMPIRE to the end of that block up to 'a succombé'.
// Let's use regex or a more precise replacement.

const vampRegex = /\/\/ === PASSIF TYPE : VAMPIRE[^\}]+Vampire\)\."\);\s+\}\s+if \(targetPlayer\.getHealthCurrent\(\) <= 0\) \{\s+System\.out\.println\(targetPlayer\.getName\(\) \+ " a Ã©tÃ© vaincu\.\.\."\);\s+\}\s+\}\s+\}\s+\} else \{\s+session\.addLog\(m\.getBase\(\)\.getName\(\) \+ " a succombÃ© Ã  ses blessures avant de pouvoir attaquer !"\);/g;

// To avoid encoding issues, let's just split.
let parts = txt.split('if (targetPlayer.getHealthCurrent() <= 0) {');
// The second occurrence is the one we want to append ECTOPLASME to. Wait, no.

// Let's use a simple string replace.
const oldVamp = `                            // === PASSIF TYPE : VAMPIRE â€” 20% vol de vie ===
                            if (mType == MonsterType.VAMPIRE) {
                                int healAmount = (int) Math.ceil(monsterDmg * 0.20);
                                int newHp = Math.min(m.getBase().getHealthMax(),
                                        m.getAsPersonnage().getHealthCurrent() + healAmount);
                                m.getAsPersonnage().setHealthCurrent(newHp);
                                session.addLog("\\uD83E\\uDDDB " + m.getBase().getName() + " vole " + healAmount
                                        + " PV (Vampire).");
                            }`;

const newVamp = `                            // === PASSIF TYPE : VAMPIRE â€” 20% vol de vie ===
                            if (mType == MonsterType.VAMPIRE) {
                                int healAmount = (int) Math.ceil(monsterDmg * 0.20);
                                int newHp = Math.min(m.getBase().getHealthMax(),
                                        m.getAsPersonnage().getHealthCurrent() + healAmount);
                                m.getAsPersonnage().setHealthCurrent(newHp);
                                session.addLog("\\uD83E\\uDDDB " + m.getBase().getName() + " vole " + healAmount
                                        + " PV (Vampire).");
                            }

                            // === PASSIF TYPE : ECTOPLASME ===
                            if (mType == MonsterType.ECTOPLASME) {
                                generation.grimoire.entity.spell.type.effect.BuffDebuffEffect eff = new generation.grimoire.entity.spell.type.effect.BuffDebuffEffect();
                                eff.setStatAffected(generation.grimoire.enumeration.StatType.RESISTANCE);
                                eff.setFlatValue(-5);
                                eff.setDuration(3);
                                targetPlayer.getActiveBuffs().add(eff);
                                session.addLog("👻 " + targetPlayer.getName() + " perd 5 Résistance pour 3 tours ! (Ectoplasme)");
                            }`;
txt = txt.replace(oldVamp, newVamp);

// Now close the for loop right before '} else {'
// It looks like this in original file:
/*
                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a Ã©tÃ© vaincu...");
                            }
                        }
                    }
                } else {
*/

const oldEnd = `                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a Ã©tÃ© vaincu...");
                            }
                        }
                    }
                } else {`;
const newEnd = `                            if (targetPlayer.getHealthCurrent() <= 0) {
                                System.out.println(targetPlayer.getName() + " a Ã©tÃ© vaincu...");
                            }
                            } // End loop targetPlayer
                        }
                    }
                } else {`;
txt = txt.replace(oldEnd, newEnd);

fs.writeFileSync(p, txt, 'utf8');
console.log("Done");
