
import re

with open('C:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/pages/combat.js', 'r', encoding='utf-8') as f:
    c = f.read()

s = r'div\.innerHTML = generateFighterHtml\(pMonster, false, isBoss\);\s*container\.appendChild\(div\);\s*\}\);'
r = '''        const fId = 'hero-' + (pMonster.id || index);
        div.dataset.fighterId = fId;
        let forcedHp = null;
        let forcedMana = null;
        if (window.combatOldStats && window.combatOldStats[fId]) {
            forcedHp = window.combatOldStats[fId].hp;
            forcedMana = window.combatOldStats[fId].mana;
        }

        div.innerHTML = generateFighterHtml(pMonster, false, isBoss, forcedHp, forcedMana);
        container.appendChild(div);

        const hpBar = div.querySelector('.gauge-fill.hp');
        const hpTextEl = div.querySelector('.hp-text-val');
        const manaBar = div.querySelector('.gauge-fill.mana');
        const manaTextEl = div.querySelector('.mana-text-val');
        
        if (forcedHp !== null && forcedHp !== pMonster.healthCurrent) {
            const suffix = pMonster.shieldTotal > 0 ? ' (+' + pMonster.shieldTotal + ' ???)' : '';
            animateGaugeJS(hpBar, hpTextEl, forcedHp, pMonster.healthCurrent, pMonster.healthMax, 800, suffix);
        }
        if (forcedMana !== null && forcedMana !== pMonster.manaCurrent) {
            animateGaugeJS(manaBar, manaTextEl, forcedMana, pMonster.manaCurrent, pMonster.manaMax, 800);
        }
    });'''

c = re.sub(s, r, c)

with open('C:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/js/pages/combat.js', 'w', encoding='utf-8') as f:
    f.write(c)

