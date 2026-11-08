document.addEventListener('DOMContentLoaded', () => {

    if (document.cookie.includes("Esta_iniciado_sesion=si")) {
        window.location.href = "dashboard.html";
        return;
    }

    const showLoginBtn = document.getElementById('show-login-btn');
    const submitLoginBtn = document.getElementById('submit-login-btn');
    const initialView = document.getElementById('initial-view');
    const formView = document.getElementById('form-view');

    showLoginBtn.addEventListener('click', () => {
        initialView.classList.add('hidden-smooth');
        setTimeout(() => {
            initialView.style.position = "absolute";
            formView.style.position = "relative";
            formView.classList.remove('hidden-smooth');
        }, 100);
    });

    function showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconName = type === 'error' ? 'close' : 'check_circle';
        
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
        
        setTimeout(() => {
            toast.remove();
        }, 5300);
    }

    submitLoginBtn.addEventListener('click', () => {
        const username = document.getElementById('username-input').value.trim();
        const password = document.getElementById('password-input').value.trim();

        if (!username || !password) {
            showToast('error', 'ERROR', 'Faltan campos por completar.');
            return;
        }

        submitLoginBtn.classList.add('loading');
        submitLoginBtn.textContent = "Entrando...";

        const delay = Math.floor(Math.random() * 3000) + 1000; 

        setTimeout(async () => {
            try {
                const cacheBuster = new Date().getTime();
                const response = await fetch(`accounts.json?t=${cacheBuster}`);
        
                if (!response.ok) throw new Error("Database error");

                const accounts = await response.json();

                const account = accounts.find(acc => acc.username === username);

                submitLoginBtn.classList.remove('loading');
                submitLoginBtn.textContent = "Acceder";

                if (!account || account.password !== password) {
                    showToast('error', 'ERROR', 'Cuenta inexistente o credenciales incorrectas.');
                    return;
                }

                if (account.banned) {
                    showToast('error', 'ERROR', 'Tu cuenta ha sido suspendida permanentemente.');
                    return;
                }

                showToast('success', '¡Inicio de sesion con exito!', 'Se comprobo su cuenta, entrando...');
                
                formView.classList.add('hidden-smooth');

                setTimeout(() => {
                    const d = new Date();
                    d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
                    const expires = "expires=" + d.toUTCString();
                    
                    document.cookie = `Esta_iniciado_sesion=si; ${expires}; path=/`;
                    document.cookie = `Nombre=${encodeURIComponent(account.username)}; ${expires}; path=/`;
                    
                    window.location.href = "dashboard.html";
                }, 5000);

            } catch (error) {
                console.error("Error:", error);
                submitLoginBtn.classList.remove('loading');
                submitLoginBtn.textContent = "Acceder";
                showToast('error', 'ERROR', 'No se pudo conectar con la base de datos.');
            }
        }, delay);
    });
});
