document.addEventListener('DOMContentLoaded', async () => {
    function checkMobileRestriction() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isPhone = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i.test(ua) || window.innerWidth < 768;
        const blocker = document.getElementById('mobile-blocker');
        if (isPhone) {
            if (blocker) blocker.classList.add('active');
            return true;
        }
        if (blocker) blocker.classList.remove('active');
        return false;
    }

    if (checkMobileRestriction()) return;
    window.addEventListener('resize', checkMobileRestriction);

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
    document.getElementById('user-avatar-dock').src = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/100`;

    document.getElementById('back-to-dash').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    function showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const iconName = type === 'error' ? 'error_outline' : 'check_circle';

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <span class="material-icons toast-icon">${iconName}</span>
            </div>
            <div class="toast-progress"><div class="toast-progress-bar"></div></div>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5300);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const currentInstanceId = urlParams.get('id');

    if (!currentInstanceId) {
        window.location.href = 'dashboard.html';
        return;
    }

    async function loadAccountsWithSandbox(cacheBuster) {
        const accountsRes = await fetch(`data/accounts.json?t=${cacheBuster}`, { cache: 'no-store' });
        let accounts = await accountsRes.json();
        try {
            const sandbox = JSON.parse(localStorage.getItem('zyrisland_accounts_sandbox') || 'null');
            if (Array.isArray(sandbox) && sandbox.length > 0) {
                accounts = sandbox;
            }
        } catch (_) {}
        return accounts;
    }

    try {
        const cacheBuster = Date.now();
        const [accounts, instancesRes] = await Promise.all([
            loadAccountsWithSandbox(cacheBuster),
            fetch(`data/instances.json?t=${cacheBuster}`, { cache: 'no-store' })
        ]);

        const instancesDB = await instancesRes.json();
        const account = accounts.find(acc => acc.username.toLowerCase() === username.toLowerCase());

        if (!account || account.banned || !account.instances.includes(currentInstanceId)) {
            window.location.href = 'dashboard.html';
            return;
        }

        const currentInstance = instancesDB[currentInstanceId];
        if (!currentInstance) {
            window.location.href = 'dashboard.html';
            return;
        }

        document.title = `${currentInstance.name} | ZyrAkaTV™ App`;
        document.getElementById('bg-layer').style.backgroundImage = `url('${currentInstance.background}')`;

        document.getElementById('inst-tag').textContent = currentInstance.tag || 'INSTANCIA OFICIAL';
        document.getElementById('inst-hero-title').textContent = currentInstance.name;
        document.getElementById('inst-hero-desc').textContent = currentInstance.description || 'Paquete oficial configurado para ZyrIsland.';
        document.getElementById('inst-version').textContent = currentInstance.version || 'Java 1.21.1';
        document.getElementById('inst-mods').textContent = `${currentInstance.modsCount || 30} Módulos`;
        document.getElementById('inst-ip').textContent = currentInstance.ip || 'play.zyrisland.net';

        document.getElementById('copy-inst-ip-btn').addEventListener('click', async () => {
            const ip = currentInstance.ip || 'play.zyrisland.net';
            try {
                await navigator.clipboard.writeText(ip);
                showToast('success', 'IP COPIADA', `Dirección ${ip} lista para pegar en Minecraft.`);
            } catch (_) {}
        });

        document.getElementById('dp-title').textContent = currentInstance.name;
        document.getElementById('dp-image').src = currentInstance.icon;

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
                        window.location.href = `instance.html?id=${encodeURIComponent(id)}`;
                    });
                }
                dockContainer.appendChild(img);
            }
        });

        setInterval(async () => {
            try {
                const freshAccounts = await loadAccountsWithSandbox(Date.now());
                const freshAcc = freshAccounts.find(a => a.username.toLowerCase() === username.toLowerCase());
                if (!freshAcc || freshAcc.banned || !freshAcc.instances.includes(currentInstanceId)) {
                    window.location.href = 'dashboard.html';
                }
            } catch (_) {}
        }, 3000);

        const playBtn = document.getElementById('play-btn');
        const playContainer = document.getElementById('play-container');
        const progressUI = document.getElementById('progress-ui');
        const heroInfo = document.getElementById('instance-hero-info');

        const statusText = document.getElementById('status-text');
        const stepCounter = document.getElementById('dp-step-counter');
        const bar1 = document.getElementById('dp-bar-1');
        const bar2 = document.getElementById('dp-bar-2');
        const timerText = document.getElementById('dp-timer');

        const secuencias = [
            'Requesting files and libraries...',
            'Downloading archivos...',
            'Downloading ZyrIsland libraries...',
            'Downloading Minecraft assets...',
            'Compressing archivos...',
            'Verifying files...',
            'Sending HTTPS...'
        ];

        let timerInterval;
        let timerSeconds = 0;

        function updateTimer() {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            timerText.textContent = `${mins}:${secs}`;
        }

        function simulateNaturalDownload(duration, callback) {
            const startTime = Date.now();
            bar2.style.width = '0%';
            bar2.style.transition = 'width 0.2s ease-out';

            function nextTick() {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    bar2.style.width = '100%';
                    callback();
                    return;
                }

                const realProgress = (elapsed / duration) * 100;
                const noise = (Math.random() * 20) - 5;
                const displayProgress = Math.min(96, Math.max(0, realProgress + noise));
                bar2.style.width = `${displayProgress}%`;

                const randomDelay = Math.floor(Math.random() * 350) + 50;
                setTimeout(nextTick, randomDelay);
            }

            setTimeout(nextTick, 50);
        }

        playBtn.addEventListener('click', () => {
            playContainer.classList.add('hidden');
            heroInfo.classList.add('hidden');
            progressUI.classList.remove('hidden');

            let index = 0;
            timerSeconds = 0;
            timerText.textContent = '00:00';
            timerInterval = setInterval(updateTimer, 1000);

            function procesarSiguiente() {
                if (index < secuencias.length) {
                    statusText.textContent = secuencias[index];
                    stepCounter.textContent = `${index + 1} / ${secuencias.length}`;

                    const porcentajeGlobal = (index / secuencias.length) * 100;
                    bar1.style.transition = 'width 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
                    bar1.style.width = `${porcentajeGlobal}%`;

                    const tiempoTotalPaso = Math.floor(Math.random() * 3200) + 1200;

                    simulateNaturalDownload(tiempoTotalPaso, () => {
                        index++;
                        setTimeout(procesarSiguiente, 450);
                    });
                } else {
                    clearInterval(timerInterval);
                    bar1.style.width = '100%';
                    statusText.textContent = '¡Descarga completada con exito!';
                    showToast('success', 'PAQUETE LISTO', `Iniciando descarga de ${currentInstance.name}...`);

                    setTimeout(() => {
                        window.location.href = currentInstance.fileUrl;

                        setTimeout(() => {
                            progressUI.classList.add('hidden');
                            playContainer.classList.remove('hidden');
                            heroInfo.classList.remove('hidden');
                            bar1.style.width = '0%';
                            bar2.style.width = '0%';
                        }, 2000);
                    }, 900);
                }
            }

            procesarSiguiente();
        });

    } catch (error) {
        console.error(error);
        window.location.href = 'dashboard.html';
    }
});
