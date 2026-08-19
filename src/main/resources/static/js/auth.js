// Auth scripts for login and register pages
window.initAppMeta = async function () {
    const { initMeta } = await import('./constants.js');
    return initMeta();
};

let accessToken = null;

window.setAccessToken = function (token) {
    accessToken = token;
};

window.globalFetch = async function (url, options = {}) {
    if (!options.headers) options.headers = {};
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        let res = await fetch(url, options);

        if (res.status === 401 && !url.includes('/api/auth/refresh') && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
            // Attempt to refresh
            try {
                const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    accessToken = data.token;
                    // Retry original request
                    options.headers['Authorization'] = `Bearer ${accessToken}`;
                    res = await fetch(url, options);
                } else {
                    if (!url.includes('/api/auth/me')) {
                        window.location.href = '/login.html';
                        await new Promise(() => {}); // Halt execution
                    }
                    throw new Error('Session expirée');
                }
            } catch (e) {
                if (!url.includes('/api/auth/me')) {
                    window.location.href = '/login.html';
                    await new Promise(() => {}); // Halt execution
                }
                throw new Error('Session expirée');
            }
        } else if (res.status === 403) {
            if (!url.includes('/api/auth/me')) {
                window.location.href = '/login.html';
                await new Promise(() => {}); // Halt execution
            }
            throw new Error('Accès refusé');
        }

        if (!res.ok) {
            if (res.status === 401 && !url.includes('/api/auth/me')) {
                window.location.href = '/login.html';
                await new Promise(() => {});
            }
            let errorMsg = "Erreur serveur";
            try {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    errorMsg = data.message || data.error || text || errorMsg;
                } catch (e) {
                    errorMsg = text || errorMsg;
                }
            } catch (e2) { }
            throw new Error(errorMsg);
        }
        return res;
    } catch (error) {
        if (typeof showNotif !== 'undefined') {
            showNotif(error.message, true);
        } else if (typeof alert !== 'undefined') {
            if (window.ui) ui.showNotif(error.message, true);
            else console.error(error.message);
        }
        throw error;
    }
};

window.formatRichText = function (text) {
    if (!text) return '';
    return text
        .replace(/\[c=(.*?)\](.*?)\[\/c\]/g, '<strong class="text-$1">$2</strong>')
        .replace(/\[ul\](.*?)\[\/ul\]/gs, '<ul class="list-disc mt-1 mb-1 pl-5">$1</ul>')
        .replace(/\[li\](.*?)\[\/li\]/g, '<li>$1</li>')
        .replace(/\n/g, '<br>');
};

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('authError');
            errorDiv.style.display = 'none';

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    errorDiv.innerText = data.message || "Erreur de connexion";
                    errorDiv.style.display = 'block';
                } else {
                    if (data.token) {
                        window.setAccessToken(data.token);
                    }
                    localStorage.setItem('isLikelyLoggedIn', 'true');
                    window.location.href = '/';
                }
            } catch (err) {
                errorDiv.innerText = "Erreur de communication avec le serveur";
                errorDiv.style.display = 'block';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('authError');
            const successDiv = document.getElementById('authSuccess');
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                errorDiv.innerText = "Les mots de passe ne correspondent pas";
                errorDiv.style.display = 'block';
                return;
            }

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    errorDiv.innerText = data.message || "Erreur lors de l'inscription";
                    errorDiv.style.display = 'block';
                } else {
                    if (data.token) {
                        window.setAccessToken(data.token);
                    }
                    localStorage.setItem('isLikelyLoggedIn', 'true');
                    successDiv.innerText = data.message || "Inscription réussie ! Redirection...";
                    successDiv.style.display = 'block';
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                }
            } catch (err) {
                errorDiv.innerText = "Erreur de communication avec le serveur";
                errorDiv.style.display = 'block';
            }
        });
    }

    const authNavContainer = document.getElementById('authNavContainer');
    if (authNavContainer) {
        checkAuthStatus();
    }
});

window.checkAuthStatus = async function checkAuthStatus() {
    const container = document.getElementById('authNavContainer');

    if (localStorage.getItem('isLikelyLoggedIn') !== 'true') {
        window.currentUser = null;
        window.isAdmin = false;
        window.dispatchEvent(new Event('authLoaded'));
        container.innerHTML = `
            <a class="font-medium text-info no-underline text-sm px-2 py-1 rounded bg-info-glass transition-all" href="/login.html">
                Se connecter
            </a>
            <a class="font-medium text-success no-underline text-sm px-2 py-1 rounded bg-success-glass transition-all" href="/register.html">
                S'inscrire
            </a>
        `;
        return;
    }

    try {
        const res = await globalFetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data;
            window.isAdmin = data.roles && data.roles.some(r => r.authority === 'ADMIN' || r.authority === 'ROLE_ADMIN');
            window.dispatchEvent(new Event('authLoaded'));
            container.innerHTML = `
                <a class="flex-center-gap font-medium text-success no-underline text-sm px-2 py-1 rounded transition-all" href="/secrets.html" onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" onmouseout="this.style.background='transparent'">
                    <span class="material-symbols-outlined text-lg">account_circle</span>
                    ${data.username}
                </a>
                <div class="flex-center font-bold text-amber text-sm ml-2" title="Monnaie" style="gap: 0.2rem;">
                    <span class="material-symbols-outlined text-lg">monetization_on</span>
                    ${data.monnaie !== undefined ? +Number(data.monnaie).toFixed(1) : '0'}
                </div>
                <button class="flex-center text-xs text-error rounded px-2 py-1 cursor-pointer font-family-inherit ml-2 transition-all" onclick="logout()" style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <span class="material-symbols-outlined icon-sm">logout</span>
                </button>
            `;
        } else {
            localStorage.removeItem('isLikelyLoggedIn');
            window.currentUser = null;
            window.isAdmin = false;
            window.dispatchEvent(new Event('authLoaded'));
            container.innerHTML = `
                <a class="font-medium text-info no-underline text-sm px-2 py-1 rounded bg-info-glass transition-all" href="/login.html">
                    Se connecter
                </a>
                <a class="font-medium text-success no-underline text-sm px-2 py-1 rounded bg-success-glass transition-all" href="/register.html">
                    S'inscrire
                </a>
            `;
        }
    } catch (e) {
        localStorage.removeItem('isLikelyLoggedIn');
        window.currentUser = null;
        window.isAdmin = false;
        window.dispatchEvent(new Event('authLoaded'));
        container.innerHTML = `
            <a class="font-medium text-info no-underline text-sm px-2 py-1 rounded bg-info-glass transition-all" href="/login.html">
                Se connecter
            </a>
            <a class="font-medium text-success no-underline text-sm px-2 py-1 rounded bg-success-glass transition-all" href="/register.html">
                S'inscrire
            </a>
        `;
    }
}

window.logout = async function () {
    try {
        localStorage.removeItem('isLikelyLoggedIn');
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        window.location.reload();
    } catch (e) {
        console.error("Logout failed", e);
    }
};

window.addEventListener('authLoaded', () => {
    const adminShop = document.getElementById('adminShopLink');
    const adminPvE = document.getElementById('adminPvELink');
    const adminAlchemy = document.getElementById('adminAlchemyLink');
    const filterMutationAdminContainer = document.getElementById('filterMutationAdminContainer');

    if (adminShop) adminShop.style.display = window.isAdmin ? 'inline-flex' : 'none';
    if (adminPvE) adminPvE.style.display = window.isAdmin ? 'inline-flex' : 'none';
    if (adminAlchemy) adminAlchemy.style.display = window.isAdmin ? 'inline-flex' : 'none';
    if (filterMutationAdminContainer) filterMutationAdminContainer.style.display = window.isAdmin ? 'block' : 'none';

    // Feature locks
    const hasVault = window.currentUser && window.currentUser.unlockedVault;
    const hasAlchemy = window.currentUser && window.currentUser.unlockedAlchemy;
    const hasShop = window.currentUser && window.currentUser.unlockedShop;

    document.querySelectorAll('.nav-vault').forEach(el => applyFeatureLock(el, hasVault, 'Coffres', 50, 'vault', '/vault.html'));
    document.querySelectorAll('.nav-alchemy').forEach(el => applyFeatureLock(el, hasAlchemy, 'Alchimie', 150, 'alchemy', '/alchemy.html'));
    document.querySelectorAll('.nav-shop').forEach(el => applyFeatureLock(el, hasShop, 'Boutique', 75, 'shop', '/shop.html'));
});

function applyFeatureLock(el, isUnlocked, featureName, cost, featureId, originalHref) {
    el.href = originalHref;

    if (isUnlocked) {
        el.style.opacity = '1';
        el.style.cursor = 'pointer';
        el.removeAttribute('onclick');
        const lockIcon = el.querySelector('.feature-lock-icon');
        if (lockIcon) lockIcon.remove();
    } else {
        el.style.opacity = '0.7';
        el.style.cursor = 'not-allowed';
        el.setAttribute('onclick', `event.preventDefault(); promptUnlockFeature('${featureId}', '${featureName}', ${cost})`);

        if (!el.querySelector('.feature-lock-icon')) {
            el.insertAdjacentHTML('beforeend', '<span class="material-symbols-outlined feature-lock-icon text-sm text-error ml-auto">lock</span>');
        }
    }
}

function injectUnlockModal() {
    if (document.getElementById('globalUnlockOverlay')) return;

    const style = document.createElement('style');
    style.innerHTML = `
        .global-unlock-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .global-unlock-overlay.active {
            opacity: 1;
            pointer-events: all;
        }
        .global-unlock-modal {
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 20px;
            padding: 2.5rem;
            max-width: 420px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(245, 158, 11, 0.1);
            transform: scale(0.85) translateY(20px);
            transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .global-unlock-overlay.active .global-unlock-modal {
            transform: scale(1) translateY(0);
        }
        .global-unlock-modal-icon {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
            border: 2px solid rgba(245, 158, 11, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            animation: unlock-pulse 2s ease-in-out infinite;
        }
        .global-unlock-modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            color: #f8fafc;
            margin-bottom: 0.8rem;
        }
        .global-unlock-modal-desc {
            font-size: 0.95rem;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 1.5rem;
        }
        .global-unlock-modal-cost {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
            padding: 0.6rem 1.2rem;
            border-radius: 12px;
            font-size: 1.2rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            margin-bottom: 2rem;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .global-unlock-modal-actions {
            display: flex;
            gap: 1rem;
        }
        .global-unlock-btn-cancel {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f8fafc;
            padding: 0.8rem;
            border-radius: 12px;
            font-weight: 600;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .global-unlock-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }
        .global-unlock-btn-confirm {
            flex: 1;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: none;
            color: #0f172a;
            padding: 0.8rem;
            border-radius: 12px;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
        }
        .global-unlock-btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }
        @keyframes unlock-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
            50% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); }
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'global-unlock-overlay';
    overlay.id = 'globalUnlockOverlay';
    overlay.innerHTML = `
        <div class="global-unlock-modal">
            <div class="global-unlock-modal-icon">
                <span class="material-symbols-outlined text-amber" style="font-size: 2.2rem;" id="globalUnlockIcon">lock_open</span>
            </div>
            <div class="global-unlock-modal-title" id="globalUnlockTitle">Débloquer ?</div>
            <div class="global-unlock-modal-desc">Ce dévérouillage est <strong class="text-white">définitif</strong> pour votre compte. Vous n'aurez plus jamais à payer ce coût.</div>
            <div class="global-unlock-modal-cost">
                <span class="material-symbols-outlined" style="font-size: 1.3rem;">monetization_on</span>
                <span id="globalUnlockCost">0</span> Or
            </div>
            <div class="global-unlock-modal-actions">
                <button class="global-unlock-btn-cancel" id="globalUnlockCancel">Annuler</button>
                <button class="global-unlock-btn-confirm" id="globalUnlockConfirm">
                    <span class="material-symbols-outlined text-lg">lock_open</span>
                    Débloquer
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.promptUnlockFeature = function (featureId, featureName, cost) {
    if (!window.currentUser) {
        if (typeof showNotif !== 'undefined') showNotif("Veuillez vous connecter pour débloquer cette fonctionnalité.", true);
        else ui.showNotif("Veuillez vous connecter pour débloquer cette fonctionnalité.", true);
        return;
    }

    injectUnlockModal();

    const overlay = document.getElementById('globalUnlockOverlay');
    document.getElementById('globalUnlockTitle').textContent = `Débloquer ${featureName} ?`;
    document.getElementById('globalUnlockCost').textContent = cost;

    if (featureId === 'vault') {
        document.getElementById('globalUnlockIcon').textContent = 'money_bag';
    } else if (featureId === 'alchemy') {
        document.getElementById('globalUnlockIcon').textContent = 'science';
    } else {
        document.getElementById('globalUnlockIcon').textContent = 'lock_open';
    }

    overlay.classList.add('active');

    const confirmBtn = document.getElementById('globalUnlockConfirm');
    const cancelBtn = document.getElementById('globalUnlockCancel');

    const cleanup = () => {
        overlay.classList.remove('active');
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    cancelBtn.addEventListener('click', cleanup);

    document.getElementById('globalUnlockConfirm').addEventListener('click', async function () {
        const btn = this;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span>';
        btn.disabled = true;

        try {
            await window.globalFetch('/api/auth/unlock/' + featureId, {
                method: 'POST',
                credentials: 'same-origin'
            });
            window.location.reload();
        } catch (error) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            cleanup();
        }
    });
};