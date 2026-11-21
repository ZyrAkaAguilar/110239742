document.addEventListener('DOMContentLoaded', () => {
    function checkMobileRestriction() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isPhone = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i.test(ua) || window.innerWidth < 768;
        const blocker = document.getElementById('mobile-blocker');
        const wrapper = document.getElementById('desktop-app-wrapper');
        if (isPhone) {
            if (blocker) blocker.classList.add('active');
            if (wrapper) wrapper.style.display = 'none';
            return true;
        }
        if (blocker) blocker.classList.remove('active');
        if (wrapper) wrapper.style.display = 'flex';
        return false;
    }

    if (checkMobileRestriction()) return;
    window.addEventListener('resize', checkMobileRestriction);

    if (document.cookie.includes('Esta_iniciado_sesion=si')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const showLoginBtn = document.getElementById('show-login-btn');
    const submitLoginBtn = document.getElementById('submit-login-btn');
    const initialView = document.getElementById('initial-view');
    const formView = document.getElementById('form-view');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const avatarPreview = document.getElementById('login-avatar-preview');
    const ignLabel = document.getElementById('login-ign-label');
    const togglePassBtn = document.getElementById('toggle-password-btn');
    const loginCard = document.getElementById('login-card');

    showLoginBtn.addEventListener('click', () => {
        initialView.classList.add('hidden-smooth');
        setTimeout(() => {
            initialView.style.position = 'absolute';
            formView.style.position = 'flex';
            formView.style.position = 'relative';
            formView.classList.remove('hidden-smooth');
            usernameInput.focus();
        }, 120);
    });

    usernameInput.addEventListener('input', () => {
        const val = usernameInput.value.trim();
        ignLabel.textContent = val || 'Invitado';
        avatarPreview.src = `https://mc-heads.net/avatar/${encodeURIComponent(val || 'Steve')}/64`;
    });

    togglePassBtn.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePassBtn.innerHTML = `<span class="material-icons">${isPass ? 'visibility_off' : 'visibility'}</span>`;
    });

    function showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconName = type === 'error' ? 'error_outline' : type === 'warn' ? 'warning_amber' : 'check_circle';

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <span class="material-icons toast-icon">${iconName}</span>
            </div>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5300);
    }

    function triggerCardShake() {
        loginCard.classList.remove('shake');
        void loginCard.offsetWidth;
        loginCard.classList.add('shake');
    }

    formView.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            triggerCardShake();
            showToast('error', 'CAMPOS INCOMPLETOS', 'Ingresa tu usuario de Minecraft y contraseña.');
            return;
        }

        submitLoginBtn.classList.add('loading');
        submitLoginBtn.innerHTML = '<span class="material-icons icon">sync</span> Verificando...';

        const delay = Math.floor(Math.random() * 1400) + 700;

        setTimeout(async () => {
            try {
                const cacheBuster = Date.now();
                const response = await fetch(`data/accounts.json?t=${cacheBuster}`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Database error');

                let accounts = await response.json();

                // Aplicar cambios locales del sandbox staff si existen
                try {
                    const sandbox = JSON.parse(localStorage.getItem('zyrisland_accounts_sandbox') || 'null');
                    if (Array.isArray(sandbox) && sandbox.length > 0) {
                        accounts = sandbox;
                    }
                } catch (_) {}

                const account = accounts.find(acc => acc.username.toLowerCase() === username.toLowerCase());

                submitLoginBtn.classList.remove('loading');
                submitLoginBtn.innerHTML = '<span class="material-icons icon">login</span> Acceder al Panel';

                if (!account || account.password !== password) {
                    triggerCardShake();
                    showToast('error', 'ACCESO DENEGADO', 'Cuenta inexistente o credenciales incorrectas.');
                    return;
                }

                showToast('success', '¡BIENVENIDO!', `Identidad verificada para ${account.username}. Entrando...`);
                formView.classList.add('hidden-smooth');

                setTimeout(() => {
                    const d = new Date();
                    d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
                    const expires = 'expires=' + d.toUTCString();

                    document.cookie = `Esta_iniciado_sesion=si; ${expires}; path=/; SameSite=Lax`;
                    document.cookie = `Nombre=${encodeURIComponent(account.username)}; ${expires}; path=/; SameSite=Lax`;

                    window.location.href = 'dashboard.html';
                }, 1600);

            } catch (error) {
                console.error('Error:', error);
                submitLoginBtn.classList.remove('loading');
                submitLoginBtn.innerHTML = '<span class="material-icons icon">login</span> Acceder al Panel';
                showToast('error', 'ERROR DE CONEXIÓN', 'No se pudo conectar con data/accounts.json.');
            }
        }, delay);
    });
});
