document.addEventListener('DOMContentLoaded', () => {
    
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    const isLoggedIn = getCookie('Esta_iniciado_sesion');
    const encodedName = getCookie('Nombre');

    if (isLoggedIn !== 'si' || !encodedName) {
        window.location.href = 'index.html';
        return; 
    }

    const username = decodeURIComponent(encodedName);
    document.getElementById('user-name').textContent = username;
    document.getElementById('user-avatar').src = `https://mc-heads.net/avatar/${username}/100`;

    const dashboardView = document.getElementById('dashboard-view');
    const unauthorizedView = document.getElementById('unauthorized-view');
    const instancesGrid = document.getElementById('instances-grid');
    
    let currentInstancesData = ""; 

    async function fetchDatabase() {
        try {
            const cacheBuster = new Date().getTime();
            
            const [accountsRes, instancesRes] = await Promise.all([
                fetch(`accounts.json?t=${cacheBuster}`),
                fetch(`instances.json?t=${cacheBuster}`)
            ]);

            if (!accountsRes.ok || !instancesRes.ok) throw new Error("Archivos no encontrados");

            const accounts = await accountsRes.json();
            const instancesDB = await instancesRes.json();
            
            const account = accounts.find(acc => acc.username === username);

            if (!account || account.banned || !account.instances || account.instances.length === 0) {
                showUnauthorized();
                return;
            }

            showDashboard();

            const newData = JSON.stringify(account.instances);
            if (newData !== currentInstancesData) {
                currentInstancesData = newData;
                renderInstances(account.instances, instancesDB);
            }

        } catch (error) {
            console.error("Error consultando la base de datos:", error);
            showUnauthorized();
        }
    }

    function showUnauthorized() {
        dashboardView.classList.add('hidden');
        unauthorizedView.classList.remove('hidden');
    }

    function showDashboard() {
        unauthorizedView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    }

    function renderInstances(userInstances, instancesDB) {
        instancesGrid.innerHTML = '';

        userInstances.forEach(instanceId => {
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
                instancesGrid.appendChild(card);
            }
        });
    }

    fetchDatabase();
    setInterval(fetchDatabase, 2000);

    function executeLogout() {
        document.cookie = "Esta_iniciado_sesion=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "Nombre=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = 'index.html';
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        executeLogout();
    });

    document.getElementById('unauth-logout-btn').addEventListener('click', () => {
        executeLogout();
    });
});
