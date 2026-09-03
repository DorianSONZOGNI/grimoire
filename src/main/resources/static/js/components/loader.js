class AppLoader extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const message = this.getAttribute('message') || 'Chargement...';
        
        this.innerHTML = `
            <div class="flex-center flex-col gap-2 p-8 text-center text-muted">
                <span class="material-symbols-outlined animate-spin text-purple" style="font-size: 2rem;">autorenew</span>
                <span class="text-sm font-medium">${message}</span>
            </div>
        `;
    }
}

customElements.define('app-loader', AppLoader);
