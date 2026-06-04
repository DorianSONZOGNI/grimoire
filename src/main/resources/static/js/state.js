// ===================================================================
// state.js — État mutable partagé entre tous les modules
// ===================================================================
// On exporte un objet unique pour que les mutations soient partagées
// par référence entre tous les modules qui l'importent.

const state = {
    metaData: {},
    currentEffects: [],
    editingSpellId: null,
    loadedSpells: [],
    selectedFilterVoieId: null,
    selectedFilterSpiritId: null,
    grimoireDisplayMode: localStorage.getItem('grimoireDisplayMode') || 'scroll',
    sandboxSpellIds: [],
};

export default state;
