import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';


export async function loadMonsters() {
    try {
        const res = await globalFetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            pageState.allMonsters = sortMonstersBySecret(monsters);
            renderMonstersList();
        }
    } catch (e) {
        console.error(e);
    }
}

export async function editMonster(id) {
    try {
        const res = await globalFetch('/api/admin/pve/monsters');
        if (res.ok) {
            const monsters = await res.json();
            const m = monsters.find(x => x.id === id);
            if (!m) return;

            pageState.editingMonsterId = id;
            document.getElementById('mName').value = m.name;
            document.getElementById('mDesc').value = m.description || '';
            const lvl = m.level || 1;
            document.getElementById('mLevel').value = lvl;
            const lvlTrigger = document.getElementById('mLevelTrigger');
            let color = '#94a3b8';
            if (lvl === 2) color = '#10b981';
            if (lvl === 3) color = '#3b82f6';
            if (lvl === 4) color = '#a855f7';
            if (lvl === 5) color = '#f59e0b';
            if (lvlTrigger) lvlTrigger.innerHTML = `<span class="material-symbols-outlined cs-icon" style="color: ${color}; font-size: 1.1rem;">star</span> <span class="flex-1 text-center" >${lvl}</span>`;

            document.getElementById('mHp').value = m.healthMax;
            document.getElementById('mRegenHp').value = m.regenHp || 0;
            document.getElementById('mStartHpPct').value = m.startHpPct !== undefined && m.startHpPct !== 0 ? m.startHpPct : 100;
            document.getElementById('mMana').value = m.manaMax || 0;
            document.getElementById('mRegenMana').value = m.regenMana || 0;
            document.getElementById('mStartManaPct').value = m.startManaPct !== undefined && m.startManaPct !== 0 ? m.startManaPct : 100;
            document.getElementById('mStartShield').value = m.startShield || 0;
            document.getElementById('mStartShieldDuration').value = m.startShieldDuration || -1;
            document.getElementById('mSpeed').value = m.speed;
            document.getElementById('mCrit').value = m.crit || 0;
            document.getElementById('mStrength').value = m.strength;
            document.getElementById('mPower').value = m.power;
            document.getElementById('mArmor').value = m.armor;
            document.getElementById('mResist').value = m.resistance;
            document.getElementById('mGold').value = m.rewardGold;
            document.getElementById('mXp').value = m.rewardExp;
            document.getElementById('mNativeSecret').value = m.nativeSecret || '';
            pageState.selectedMutationIds = m.mutations ? m.mutations.map(mu => mu.id) : [];
            renderMutationsSelector();

            const mtObj = m.monsterType || 'NORMAL';
            const mt = typeof mtObj === 'object' ? mtObj.name : mtObj;
            const mbObj = m.behavior || 'NORMAL';
            const mb = typeof mbObj === 'object' ? mbObj.name : mbObj;

            const tMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'DEMON': { l: 'Démon', i: 'rib_cage', c: '#ef4444' },
                'REPTILE': { l: 'Reptile', i: 'grass', c: '#10b981' },
                'MORT_VIVANT': { l: 'Mort-vivant', i: 'skull', c: '#94a3b8' },
                'HYBRIDE': { l: 'Hybride', i: 'network_node', c: '#3b82f6' },
                'VAMPIRE': { l: 'Vampire', i: 'bloodtype', c: '#e11d48' },
                'ECTOPLASME': { l: 'Ectoplasme', i: 'candle', c: '#a855f7' }
            };
            const bMap = {
                'NORMAL': { l: 'Normal', i: 'check_box_outline_blank', c: '#94a3b8' },
                'PREDATEUR': { l: 'Prédateur', i: 'track_changes', c: '#f59e0b' },
                'CORRUPTEUR': { l: 'Corrupteur', i: 'allergy', c: '#8b5cf6' },
                'LEADER': { l: 'Leader', i: 'crown', c: '#fcd34d' },
                'ASSASSIN': { l: 'Assassin', i: 'gps_fixed', c: '#ef4444' },
                'BRUTAL': { l: 'Brutal', i: 'shield', c: '#9ca3af' },
                'TRANSCENDANT': { l: 'Transcendant', i: 'grid_view', c: '#fbbf24' }
            };

            const tData = tMap[mt] || tMap['NORMAL'];
            const bData = bMap[mb] || bMap['NORMAL'];

            window.selectMonsterType(mt, tData.l, tData.i, tData.c);
            window.selectMonsterBehavior(mb, bData.l, bData.i, bData.c);

            document.getElementById('btnSubmitMonster').textContent = "Modifier le monstre";
            document.getElementById('btnCancelMonster').classList.remove('hidden');
            document.getElementById('monsterFormPanel').classList.add('editing-glow');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
    }
}

export async function deleteMonster(id) {
    const confirmed = await window.showModal({
        title: 'Suppression',
        body: 'Voulez-vous vraiment supprimer ce monstre ?',
        icon: 'warning',
        confirmText: 'Supprimer'
    });
    if (!confirmed) return;
    try {
        const res = await globalFetch('/api/admin/pve/monsters/' + id, { method: 'DELETE' });
        if (res.ok) {
            loadMonsters();
            loadDungeons();
        }
    } catch (e) {
        console.error(e);
    }
}