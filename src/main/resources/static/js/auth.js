// Auth scripts for login and register pages

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
                    // Success, redirect to index
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

    // Check auth status for navbar
    const authNavContainer = document.getElementById('authNavContainer');
    if (authNavContainer) {
        checkAuthStatus();
    }
});

window.checkAuthStatus = async function checkAuthStatus() {
    const container = document.getElementById('authNavContainer');
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data;
            window.isAdmin = data.roles && data.roles.some(r => r.authority === 'ADMIN' || r.authority === 'ROLE_ADMIN');
            window.dispatchEvent(new Event('authLoaded'));
            container.innerHTML = `
                <a href="/secrets.html" style="display: flex; align-items: center; gap: 0.3rem; color: #10b981; font-weight: 500; font-size: 0.85rem; text-decoration: none; padding: 0.2rem 0.5rem; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" onmouseout="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">account_circle</span>
                    ${data.username}
                </a>
                <div style="display: flex; align-items: center; gap: 0.2rem; color: #f59e0b; font-weight: 600; font-size: 0.85rem; margin-left: 0.5rem;" title="Monnaie">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">monetization_on</span>
                    ${data.monnaie !== undefined ? (data.monnaie % 1 === 0 ? data.monnaie : data.monnaie.toFixed(1)) : '0'}
                </div>
                <button onclick="logout()" style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; font-family: 'Outfit'; font-size: 0.8rem; margin-left: 0.5rem; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">logout</span>
                </button>
            `;
        } else {
            window.currentUser = null;
            window.isAdmin = false;
            window.dispatchEvent(new Event('authLoaded'));
            container.innerHTML = `
                <a href="/login.html" style="color: #3b82f6; text-decoration: none; font-weight: 500; font-size: 0.85rem; padding: 0.3rem 0.6rem; border-radius: 6px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); transition: all 0.2s;">
                    Se connecter
                </a>
                <a href="/register.html" style="color: #10b981; text-decoration: none; font-weight: 500; font-size: 0.85rem; padding: 0.3rem 0.6rem; border-radius: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); transition: all 0.2s;">
                    S'inscrire
                </a>
            `;
        }
    } catch (e) {
        container.innerHTML = `<span style="font-size: 0.8rem; color: #ef4444;">Erreur auth</span>`;
    }
}

window.logout = async function() {
    try {
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
    if (adminShop) adminShop.style.display = window.isAdmin ? 'inline-flex' : 'none';
    if (adminPvE) adminPvE.style.display = window.isAdmin ? 'inline-flex' : 'none';
    if (adminAlchemy) adminAlchemy.style.display = window.isAdmin ? 'inline-flex' : 'none';
});
