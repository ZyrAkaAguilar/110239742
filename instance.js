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

    // --- 2. DETECTAR INSTANCIA ACTUAL ---
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

        
        document.title = `${currentInstance.name}`;

        document.getElementById('bg-layer').style.backgroundImage = `url('${currentInstance.background}')`;

        document.getElementById('dp-title').textContent = currentInstance.name;
        document.getElementById('dp-image').src = currentInstance.background;

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
        const bar1 = document.getElementById('dp-bar-1');
        const bar2 = document.getElementById('dp-bar-2');
        const timerText = document.getElementById('dp-timer');

        const secuencias = [
            "Solicitando archivos...",
            "Descargando archivos...",
            "Descargando ZyrIsland Services...",
            "Descargando Minecraft Assets...",
            "Comprimiendo archivos...",
            "Verificando instalacion...",
            "Enviando descarga al cliente..."
        ];

        let timerInterval;
        let timerSeconds = 0;

        function updateTimer() {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            timerText.textContent = `${mins}:${secs}`;
        }

        playBtn.addEventListener('click', () => {
            playContainer.classList.add('hidden');
            progressUI.classList.remove('hidden');

            let index = 0;
            timerSeconds = 0;
            timerText.textContent = "00:00";
            
            timerInterval = setInterval(updateTimer, 1000);

            function procesarSiguiente() {
                if (index < secuencias.length) {
                    statusText.textContent = secuencias[index];
                    
                    const porcentajeGlobal = (index / secuencias.length) * 100;
                    bar1.style.transition = 'width 0.5s ease';
                    bar1.style.width = `${porcentajeGlobal}%`;

                    const tiempoAleatorio = Math.floor(Math.random() * 8000) + 1000;

                    bar2.style.transition = 'none';
                    bar2.style.width = '0%';
                    
                    setTimeout(() => {
                        bar2.style.transition = `width ${tiempoAleatorio}ms linear`;
                        bar2.style.width = '100%';
                    }, 50);

                    index++;
                    setTimeout(procesarSiguiente, tiempoAleatorio);
                } else {
                    clearInterval(timerInterval);
                    bar1.style.width = '100%';
                    statusText.textContent = "¡Descarga completada!";
                    
                    setTimeout(() => {
                        window.location.href = currentInstance.fileUrl;
                        
                        setTimeout(() => {
                            progressUI.classList.add('hidden');
                            playContainer.classList.remove('hidden');
                            bar1.style.width = '0%';
                            bar2.style.width = '0%';
                        }, 2000);
                    }, 1000);
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
