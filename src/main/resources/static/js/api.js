// ===================================================================
// api.js — Couche réseau (Interactions avec le backend Spring)
// ===================================================================

export async function apiFetchMeta() {
    const res = await fetch('/api/spells-editor/meta');
    if (!res.ok) throw new Error("Erreur lors du chargement des métadonnées");
    return await res.json();
}

export async function apiLoadSpells() {
    const res = await fetch('/api/spells-editor');
    if (!res.ok) throw new Error("Erreur lors du chargement des sorts");
    return await res.json();
}

export async function apiSubmitSpell(payload) {
    const res = await fetch('/api/spells-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Erreur lors de l'enregistrement du sort");
    return await res.text();
}

export async function apiDeleteSpell(id) {
    const res = await fetch(`/api/spells-editor/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Erreur lors de la suppression du sort");
    return await res.text();
}

// ===================================================================
// API Banc d'Essai (Sandbox)
// ===================================================================

export async function apiFetchSandboxState() {
    const res = await fetch('/api/spells-editor/sandbox/state');
    if (!res.ok) throw new Error("Erreur lors du chargement de l'état du banc d'essai");
    return await res.json();
}

export async function apiConfigureSandboxHero(config) {
    const res = await fetch('/api/spells-editor/sandbox/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error("Erreur lors de la configuration du héros");
    return await res.json();
}

export async function apiCastSandboxSpell(spellId) {
    const res = await fetch(`/api/spells-editor/sandbox/cast/${spellId}`, { method: 'POST' });
    if (!res.ok) throw new Error("Erreur lors du lancement du sort");
    return await res.json();
}

export async function apiPassSandboxTurn() {
    const res = await fetch('/api/spells-editor/sandbox/pass', { method: 'POST' });
    if (!res.ok) throw new Error("Erreur lors du passage de tour");
    return await res.json();
}

export async function apiResetSandbox() {
    const res = await fetch('/api/spells-editor/sandbox/reset', { method: 'POST' });
    if (!res.ok) throw new Error("Erreur lors de la réinitialisation du banc d'essai");
    return await res.json();
}
