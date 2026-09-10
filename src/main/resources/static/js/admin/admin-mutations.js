import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../pages/grimoire.js';


export async function loadMutations() {
    try {
        const res = await globalFetch('/api/admin/pve/mutations');
        if (res.ok) {
            pageState.allMutations = await res.json();
            if (pageState.allMutations) {
                pageState.allMutations.sort((a, b) => {
                    const nomA = (a.nom || '').toLowerCase();
                    const nomB = (b.nom || '').toLowerCase();
                    if (nomA < nomB) return -1;
                    if (nomA > nomB) return 1;
                    return (a.level || 0) - (b.level || 0);
                });
            }
            renderMutationsList();
            renderMutationsSelector();
        }
    } catch (e) { console.error('Erreur chargement mutations:', e); }
}

export function renderMutationsList() {
    const list = document.getElementById('mutationsList');
    if (!list) return;
    if (pageState.allMutations.length === 0) {
        list.innerHTML = `<div class="font-italic" style="text-align:center; padding: 2rem; color: #64748b;">Aucune mutation trouvée</div>`;
        return;
    }

    let html = '';
    pageState.allMutations.forEach(mut => {
        const mHex = mut.color || '#e879f9';
        const mIcon = mut.icon || 'pets';
        html += `
        <div class="list-item flex-between" style="border-left: 3px solid ${mHex}; align-items: center; padding: 0.8rem; background: rgba(15, 23, 42, 0.4); border-radius: 8px; margin-bottom: 0.5rem;">
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <div class="flex-center" style="gap: 0.5rem;">
                    <span class="material-symbols-outlined" style="color: ${mHex};">${mIcon}</span>
                    <span style="font-weight: 600; color: #f8fafc;">${mut.nom}</span>
                    <span class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 0.75rem;">Lvl ${mut.level}</span>
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1;">${mut.description}</div>
            </div>
            <div class="flex-shrink-0" style="display: flex; gap: 0.2rem;">
                <button type="button" class="btn-icon text-info p-1" onclick="editMutation(${mut.id})" title="Modifier">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="btn-icon text-error p-1" onclick="deleteMutation(${mut.id})" title="Supprimer">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

export function renderMutationsSelector() {
    const container = document.getElementById('mMutationsContainer');
    if (!container) return;
    if (pageState.allMutations.length === 0) {
        container.innerHTML = `<span class="text-sm font-italic text-muted" >Aucune mutation disponible. Créez-en une d'abord.</span>`;
        return;
    }

    let html = '';
    pageState.allMutations.forEach(mut => {
        const isSelected = pageState.selectedMutationIds.includes(mut.id);
        const mHex = mut.color || '#e879f9';
        const mIcon = mut.icon || 'pets';
        const bg = isSelected ? `rgba(232, 121, 249, 0.2)` : 'rgba(15, 23, 42, 0.6)';
        const border = isSelected ? `1px solid ${mHex}` : '1px solid rgba(255,255,255,0.1)';
        const opacity = isSelected ? '1' : '0.6';
        const shadow = isSelected ? `box-shadow: 0 0 8px rgba(232, 121, 249, 0.4);` : '';

        html += `
        <div onclick="toggleMutationSelection(${mut.id})" style="cursor: pointer; padding: 0.3rem 0.6rem; border-radius: 6px; background: ${bg}; border: ${border}; opacity: ${opacity}; ${shadow} display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" title="${mut.description}">
            <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${mHex};">${mIcon}</span>
            <span class="text-sm text-slate-50" >${mut.nom} <span class="opacity-70 text-xs" >(Niv. ${mut.level || 1})</span></span>
        </div>`;
    });
    container.innerHTML = html;
}