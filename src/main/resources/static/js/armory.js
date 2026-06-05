// ===== Armory Page JavaScript =====

let voies = [];
let spiritualites = [];
let personnages = [];
let editingId = null;

// ===== API =====

async function fetchMeta() {
    try {
        const res = await fetch('/api/spells-editor/meta');
        const data = await res.json();
        voies = data.voies || [];
        spiritualites = data.spiritualites || [];
        populateSelects();
    } catch (e) {
        console.error('Erreur chargement meta:', e);
    }
}

async function loadPersonnages() {
    try {
        const res = await fetch('/api/personnages');
        personnages = await res.json();
        renderPersonnages();
    } catch (e) {
        console.error('Erreur chargement personnages:', e);
    }
}

async function submitPersonnage() {
    const name = document.getElementById('charName').value.trim();
    if (!name) {
        showNotif('Le nom est obligatoire.', true);
        return;
    }

    const dto = {
        id: editingId,
        name: name,
        healthMax: parseInt(document.getElementById('charHp').value) || 100,
        manaMax: parseInt(document.getElementById('charMana').value) || 100,
        power: parseInt(document.getElementById('charPower').value) || 0,
        strength: parseInt(document.getElementById('charStrength').value) || 0,
        armor: parseInt(document.getElementById('charArmor').value) || 0,
        resistance: parseInt(document.getElementById('charResistance').value) || 0,
        speed: parseInt(document.getElementById('charSpeed').value) || 0,
        crit: parseInt(document.getElementById('charCrit').value) || 0,
        voieId: document.getElementById('charVoie').value || null,
        voieLevel: parseInt(document.getElementById('charVoieLevel').value) || 1,
        spiritualiteId: document.getElementById('charSpirit').value || null,
        spiritualiteLevel: parseInt(document.getElementById('charSpiritLevel').value) || 1,
    };

    // Convert empty string to null for IDs
    if (dto.voieId === '') dto.voieId = null;
    if (dto.spiritualiteId === '') dto.spiritualiteId = null;
    if (dto.voieId) dto.voieId = parseInt(dto.voieId);
    if (dto.spiritualiteId) dto.spiritualiteId = parseInt(dto.spiritualiteId);

    try {
        const res = await fetch('/api/personnages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        const data = await res.json();
        showNotif(data.message || 'Personnage sauvegardé !');
        resetForm();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de la sauvegarde.', true);
        console.error(e);
    }
}

async function deletePersonnage(id) {
    if (!confirm('Supprimer ce personnage ?')) return;
    try {
        await fetch(`/api/personnages/${id}`, { method: 'DELETE' });
        showNotif('Personnage supprimé.');
        if (editingId === id) resetForm();
        await loadPersonnages();
    } catch (e) {
        showNotif('Erreur lors de la suppression.', true);
    }
}

// ===== UI =====

function populateSelects() {
    const voieSelect = document.getElementById('charVoie');
    const spiritSelect = document.getElementById('charSpirit');

    voieSelect.innerHTML = '<option value="">— Aucune —</option>';
    voies.forEach(v => {
        voieSelect.innerHTML += `<option value="${v.id}">${v.nom}</option>`;
    });

    spiritSelect.innerHTML = '<option value="">— Aucune —</option>';
    spiritualites.forEach(s => {
        spiritSelect.innerHTML += `<option value="${s.id}">${s.nom}</option>`;
    });
}

function renderPersonnages() {
    const container = document.getElementById('personnagesList');
    if (!container) return;

    if (personnages.length === 0) {
        container.innerHTML = `
            <div class="armory-empty-state">
                <span class="material-symbols-outlined">person_off</span>
                Aucun personnage créé. Forgez votre premier héros !
            </div>`;
        return;
    }

    container.innerHTML = personnages.map(p => {
        let badges = '';
        if (p.voie) {
            badges += `<span class="char-badge char-badge-voie">
                <span class="material-symbols-outlined" style="font-size: 0.8rem;">route</span>
                ${p.voie.nom} Lvl ${p.voieLevel}
            </span>`;
        }
        if (p.spiritualite) {
            badges += `<span class="char-badge char-badge-spirit">
                <span class="material-symbols-outlined" style="font-size: 0.8rem;">psychology</span>
                ${p.spiritualite.nom} Lvl ${p.spiritualiteLevel}
            </span>`;
        }
        if (!p.voie && !p.spiritualite) {
            badges = `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">Aucune affiliation</span>`;
        }

        return `
            <div class="char-card">
                <div class="char-card-header">
                    <div class="char-card-name">
                        <span class="material-symbols-outlined">person</span>
                        ${p.name}
                    </div>
                    <div class="char-card-actions">
                        <button class="char-btn-edit" onclick="editPersonnage(${p.id})" title="Éditer">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">edit</span> Éditer
                        </button>
                        <button class="char-btn-delete" onclick="deletePersonnage(${p.id})" title="Supprimer">
                            <span class="material-symbols-outlined" style="font-size: 0.95rem;">delete</span>
                        </button>
                    </div>
                </div>
                <div class="char-card-badges">${badges}</div>
                <div class="char-card-stats">
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #ec4899;">favorite</span>${p.healthMax} PV</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #38bdf8;">water_drop</span>${p.manaMax} Mana</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #a855f7;">auto_awesome</span>${p.power} Pui</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #f43f5e;">fitness_center</span>${p.strength} For</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #3b82f6;">shield</span>${p.armor} Arm</span>
                    <span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #10b981;">shield</span>${p.resistance} Rés</span>
                    ${p.speed > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #f59e0b;">bolt</span>${p.speed} Vit</span>` : ''}
                    ${p.crit > 0 ? `<span class="char-stat-chip"><span class="material-symbols-outlined" style="color: #ef4444;">gps_fixed</span>${p.crit}% Crit</span>` : ''}
                </div>
            </div>`;
    }).join('');
}

function editPersonnage(id) {
    const p = personnages.find(c => c.id === id);
    if (!p) return;

    editingId = p.id;
    document.getElementById('charName').value = p.name || '';
    document.getElementById('charHp').value = p.healthMax || 100;
    document.getElementById('charMana').value = p.manaMax || 100;
    document.getElementById('charPower').value = p.power || 0;
    document.getElementById('charStrength').value = p.strength || 0;
    document.getElementById('charArmor').value = p.armor || 0;
    document.getElementById('charResistance').value = p.resistance || 0;
    document.getElementById('charSpeed').value = p.speed || 0;
    document.getElementById('charCrit').value = p.crit || 0;
    document.getElementById('charVoie').value = p.voie ? p.voie.id : '';
    document.getElementById('charVoieLevel').value = p.voieLevel || 1;
    document.getElementById('charSpirit').value = p.spiritualite ? p.spiritualite.id : '';
    document.getElementById('charSpiritLevel').value = p.spiritualiteLevel || 1;

    document.getElementById('formTitle').innerHTML = `
        <span class="material-symbols-outlined">edit</span>
        Modifier : ${p.name}`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">save</span>
        Mettre à jour`;
    document.getElementById('cancelBtn').style.display = 'inline-flex';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editingId = null;
    document.getElementById('charName').value = '';
    document.getElementById('charHp').value = 100;
    document.getElementById('charMana').value = 100;
    document.getElementById('charPower').value = 25;
    document.getElementById('charStrength').value = 10;
    document.getElementById('charArmor').value = 10;
    document.getElementById('charResistance').value = 10;
    document.getElementById('charSpeed').value = 0;
    document.getElementById('charCrit').value = 0;
    document.getElementById('charVoie').value = '';
    document.getElementById('charVoieLevel').value = 1;
    document.getElementById('charSpirit').value = '';
    document.getElementById('charSpiritLevel').value = 1;

    document.getElementById('formTitle').innerHTML = `
        <span class="material-symbols-outlined">person_add</span>
        Créer un Personnage`;
    document.getElementById('submitBtn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">person_add</span>
        Forger le Personnage`;
    document.getElementById('cancelBtn').style.display = 'none';
}

function showNotif(message, isError = false) {
    const notif = document.getElementById('armoryNotif');
    notif.textContent = message;
    notif.classList.remove('error');
    if (isError) notif.classList.add('error');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// ===== Init =====

window.addEventListener('DOMContentLoaded', async () => {
    await fetchMeta();
    await loadPersonnages();
});
