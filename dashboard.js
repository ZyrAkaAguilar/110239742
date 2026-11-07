document.addEventListener('DOMContentLoaded', async () => {
    
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function showToast(type, title, message, callback) {
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
            if (callback) callback();
        }, 5000);
    }

    const isLoggedIn = getCookie('Esta_iniciado_sesion');
    const encodedName = getCookie('Nombre');

    if (isLoggedIn !== 'si' || !encodedName) {
        window.location.href = 'index.html';
        return; 
    }

    const username = decodeURIComponent(encodedName);
    document.getElementById('user-name').textContent = username;
    
    const avatarImg = document.getElementById('user-avatar');
    avatarImg.src = `https://mc-heads.net/avatar/${username}/100`;

    try {
        const [accountsRes, instancesRes] = await Promise.all([
            fetch('accounts.json'),
            fetch('instances.json')
        ]);

        if (!accountsRes.ok || !instancesRes.ok) {
            throw new Error("No se pudieron cargar las bases de datos.");
        }
        
        const accounts = await accountsRes.json();
        const instancesDB = await instancesRes.json();
        
        const account = accounts.find(acc => acc.username === username);
        const container = document.getElementById('instances-grid');

        if (account && account.instances && account.instances.length > 0) {
            account.instances.forEach(instanceId => {
                const instanceDetails = instancesDB[instanceId];

                if (instanceDetails) {
                    const card = document.createElement('div');
                    card.className = 'instance-card';
                    
                    card.addEventListener('click', () => {
                        window.location.href = instanceDetails.downloadLink;
                    });
                    
                    card.innerHTML = `
                        <img src="${instanceDetails.background}" alt="${instanceDetails.name}" class="instance-card-img">
                        <div class="instance-card-title">${instanceDetails.name}</div>
                    `;
                    
                    container.appendChild(card);
                }
            });
        } else {
            container.innerHTML = '<p style="color: #aaa; margin-left: 10px;">No tienes instancias asignadas.</p>';
        }

    } catch (error) {
        console.error(error);
        showToast('error', 'ERROR', 'Fallo al cargar la base de datos de instancias.');
    }

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        logoutBtn.style.pointerEvents = "none";
        logoutBtn.style.opacity = "0.5";

        showToast('success', '¡Cierre de sesión!', 'Se cerró sesión correctamente. Redirigiendo...', () => {
            document.cookie = "Esta_iniciado_sesion=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "Nombre=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            window.location.href = 'index.html';
        });
    });
});
