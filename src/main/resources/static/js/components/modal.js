class AppModal extends HTMLElement {
    constructor() {
        super();
        this.resolveConfirm = null;
    }

    connectedCallback() {
        if (!this.rendered) {
            this.render();
            this.rendered = true;
        }
    }

    render() {
        this.innerHTML = `
        <style>
            .app-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(8px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            .app-modal-overlay.show {
                opacity: 1;
                pointer-events: all;
            }
            .app-modal-content {
                background: rgba(30, 41, 59, 0.95);
                border: 1px solid rgba(239, 68, 68, 0.4);
                border-radius: 16px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                transform: translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            }
            .app-modal-overlay.show .app-modal-content {
                transform: translateY(0) scale(1);
            }
            .app-modal-icon {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.2rem auto;
                font-size: 2rem;
                border: 2px solid rgba(239, 68, 68, 0.2);
            }
            .app-modal-title {
                font-size: 1.2rem;
                font-weight: 600;
                font-family: 'Outfit', sans-serif;
                color: #fff;
                margin-bottom: 0.8rem;
            }
            .app-modal-text {
                font-size: 0.9rem;
                color: #94a3b8;
                margin-bottom: 1.5rem;
                line-height: 1.5;
            }
            .app-modal-actions {
                display: flex;
                gap: 1rem;
            }
            .app-modal-cancel {
                flex: 1;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #fff;
                padding: 0.6rem;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .app-modal-cancel:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .app-modal-confirm {
                flex: 1;
                background: #ef4444;
                border: none;
                color: #fff;
                padding: 0.6rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
            .app-modal-confirm:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
            }
        </style>
        <div class="app-modal-overlay" id="appModalOverlay">
            <div class="app-modal-content">
                <div class="app-modal-icon" id="appModalIconContainer">
                    <span class="material-symbols-outlined" style="font-size: 2rem;" id="appModalIcon">warning</span>
                </div>
                <div class="app-modal-title" id="appModalTitle">Titre</div>
                <div class="app-modal-text" id="appModalText">Texte</div>
                <div class="app-modal-actions">
                    <button class="app-modal-cancel" id="appModalCancelBtn">Annuler</button>
                    <button class="app-modal-confirm" id="appModalConfirmBtn">Confirmer</button>
                </div>
            </div>
        </div>
        `;

        this.overlay = this.querySelector('#appModalOverlay');
        this.titleEl = this.querySelector('#appModalTitle');
        this.textEl = this.querySelector('#appModalText');
        this.iconEl = this.querySelector('#appModalIcon');
        this.iconContainer = this.querySelector('#appModalIconContainer');
        this.cancelBtn = this.querySelector('#appModalCancelBtn');
        this.confirmBtn = this.querySelector('#appModalConfirmBtn');
        this.contentEl = this.querySelector('.app-modal-content');

        this.cancelBtn.addEventListener('click', () => this.hide(false));
        this.confirmBtn.addEventListener('click', () => this.hide(true));
    }

    /**
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.body
     * @param {string} [options.icon='warning']
     * @param {string} [options.confirmText='Confirmer']
     * @param {string} [options.cancelText='Annuler']
     * @param {Function} [options.onConfirm]
     * @param {string} [options.theme='danger'] - 'danger', 'success', 'info'
     */
    show(options) {
        if (!this.rendered) this.render();
        this.titleEl.innerText = options.title || 'Confirmation';
        this.textEl.innerHTML = options.body || '';
        this.iconEl.innerText = options.icon || 'warning';
        this.confirmBtn.innerText = options.confirmText || 'Confirmer';
        this.cancelBtn.innerText = options.cancelText || 'Annuler';
        
        if (options.hideCancel) {
            this.cancelBtn.style.display = 'none';
        } else {
            this.cancelBtn.style.display = 'block';
        }
        
        this.onConfirmCallback = options.onConfirm || null;

        // Apply theme colors
        const theme = options.theme || 'danger';
        let color = '#ef4444';
        let bgOpacity = 'rgba(239, 68, 68, 0.1)';
        let borderOpacity = 'rgba(239, 68, 68, 0.2)';
        
        if (theme === 'success') {
            color = '#10b981';
            bgOpacity = 'rgba(16, 185, 129, 0.1)';
            borderOpacity = 'rgba(16, 185, 129, 0.2)';
            this.confirmBtn.style.background = '#10b981';
            this.confirmBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            this.contentEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else if (theme === 'info') {
            color = '#3b82f6';
            bgOpacity = 'rgba(59, 130, 246, 0.1)';
            borderOpacity = 'rgba(59, 130, 246, 0.2)';
            this.confirmBtn.style.background = '#3b82f6';
            this.confirmBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            this.contentEl.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        } else {
            // Default danger
            this.confirmBtn.style.background = '#ef4444';
            this.confirmBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            this.contentEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }

        this.iconContainer.style.color = color;
        this.iconContainer.style.background = bgOpacity;
        this.iconContainer.style.borderColor = borderOpacity;

        this.overlay.classList.add('show');

        return new Promise((resolve) => {
            this.resolveConfirm = resolve;
        });
    }

    async hide(confirmed) {
        this.overlay.classList.remove('show');
        if (confirmed && this.onConfirmCallback) {
            await this.onConfirmCallback();
        }
        if (this.resolveConfirm) {
            this.resolveConfirm(confirmed);
            this.resolveConfirm = null;
        }
    }
}

customElements.define('app-modal', AppModal);
