document.addEventListener('DOMContentLoaded', () => {
    const showLoginBtn = document.getElementById('show-login-btn');
    const submitLoginBtn = document.getElementById('submit-login-btn');
    const initialView = document.getElementById('initial-view');
    const formView = document.getElementById('form-view');
    const errorMsg = document.getElementById('error-message');

    showLoginBtn.addEventListener('click', () => {
        initialView.classList.add('hidden');
        formView.classList.remove('hidden');
    });

    submitLoginBtn.addEventListener('click', async () => {
        const username = document.getElementById('username-input').value.trim();
        const password = document.getElementById('password-input').value.trim();

        errorMsg.classList.add('hidden');
        errorMsg.textContent = "";

        if (!username || !password) {
            showError("Ingresa tu nombre y contraseña.");
            return;
        }

        try {
            const response = await fetch('accounts.json');
            
            if (!response.ok) {
                throw new Error("No se pudo contactar con la base de datos.");
            }

            const accounts = await response.json();
            
            // Buscar coincidencia exacta
            const account = accounts.find(acc => acc.username === username);

            if (!account || account.password !== password) {
                showError("Cuenta inexistente o contraseña incorrecta.");
                return;
            }

            if (account.banned) {
                showError("Tu cuenta ha sido suspendida.");
                return;
            }

            const d = new Date();
            d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
            const expires = "expires=" + d.toUTCString();
            
            document.cookie = `Esta_iniciado_sesion=si; ${expires}; path=/`;
            document.cookie = `Nombre=${encodeURIComponent(account.username)}; ${expires}; path=/`;

            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Error de Login:", error);
            showError("Error al consultar accounts.json. ¿Estás usando un servidor local?");
        }
    });

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }
});
