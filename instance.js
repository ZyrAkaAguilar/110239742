document.addEventListener('DOMContentLoaded', async () => {
    
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
    document.getElementById('user-avatar-dock').src = `https://mc-heads.net/avatar/${username}/100`;

    document.getElementById('back-to-dash').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    const urlParams = new URLSearchParams(window.location.search);
    const currentInstanceId = urlParams.get('id');

    if (!currentInstanceId) {
        window.location.href = 'dashboard.html';
        return;
    }

    try {
        const cacheBuster = new Date().getTime();
        const [accountsRes, instancesRes] = await Promise.all([
            fetch(`accounts.json?t=${cacheBuster}`),
            fetch(`instances.json?t=${cacheBuster}`)
        ]);

        const accounts = await accountsRes.json();
        const instancesDB = await instancesRes.json();
        const account = accounts.find(acc => acc.username === username);

        if (!account || account.banned || !account.instances.includes(currentInstanceId)) {
            window.location.href = 'dashboard.html';
            return;
        }

        const currentInstance = instancesDB[currentInstanceId];

        document.getElementById('bg-layer').style.backgroundImage = `url('${currentInstance.background}')`;

        const dockContainer = document.getElementById('dock-icons');
        account.instances.forEach(id => {
            const instData = instancesDB[id];
            if (instData) {
                const img = document.createElement('img');
                img.src = instData.icon;
                img.className = 'dock-icon';
                img.title = instData.name;
                
                if (id === currentInstanceId) {
                    img.classList.add('active');
                } else {
                    img.addEventListener('click', () => {
                        window.location.href = `instance.html?id=${id}`;
                    });
                }
                dockContainer.appendChild(img);
            }
        });

        const playBtn = document.getElementById('play-btn');
        const playContainer = document.getElementById('play-container');
        const progressUI = document.getElementById('progress-ui');
        const statusText = document.getElementById('status-text');
        const progressBar = document.getElementById('progress-bar-fill');

        const secuencias = [
            "Solicitando archivos...",
            "Descargando archivos...",
            "Descargando ZyrIsland Services...",
            "Descargando Minecraft Assets...",
            "Comprimiendo archivos...",
            "Verificando instalacion...",
            "Enviando descarga al cliente..."
        ];

        playBtn.addEventListener('click', () => {
            playContainer.classList.add('hidden');
            progressUI.classList.remove('hidden');

            let index = 0;

            function procesarSiguiente() {
                if (index < secuencias.length) {
                    statusText.textContent = secuencias[index];
                    const porcentaje = ((index + 1) / secuencias.length) * 100;
                    progressBar.style.width = `${porcentaje}%`;

                    const tiempoAleatorio = Math.floor(Math.random() * 8000) + 1000;
                    
                    index++;
                    setTimeout(procesarSiguiente, tiempoAleatorio);
                } else {
                    statusText.textContent = "¡Listo!";
                    setTimeout(() => {
                        window.location.href = currentInstance.fileUrl;
                        
                        setTimeout(() => {
                            progressUI.classList.add('hidden');
                            playContainer.classList.remove('hidden');
                            progressBar.style.width = '0%';
                        }, 2000);
                    }, 500);
                }
            }

            procesarSiguiente();
        });

    } catch (error) {
        console.error(error);
        alert("Error cargando la instancia.");
        window.location.href = 'dashboard.html';
    }
});
