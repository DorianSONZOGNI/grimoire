export const state = {
    metaData: {},
    currentEffects: [],
    editingSpellId: null,
    loadedSpells: [],
    selectedFilterVoieId: null,
    selectedFilterSpiritId: null,
    grimoireDisplayMode: localStorage.getItem('grimoireDisplayMode') || 'scroll',
    sandboxSpellIds: []
};
