document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('user-name').textContent = username;
    document.getElementById('user-avatar').src = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/100`;

    const SANDBOX_KEY = 'zyrisland_accounts_sandbox';
    const dashboardView = document.getElementById('dashboard-view');
    const unauthorizedView = document.getElementById('unauthorized-view');
    const bannedView = document.getElementById('banned-view');
    const instancesGrid = document.getElementById('instances-grid');
    const searchInput = document.getElementById('instance-search-input');

    let allAccountsCache = [];
    let instancesDBCache = {};
    let currentAccountCache = null;
    let activeSection = 'instances';
    let lastStateFingerprint = '';
    let banCountdownInterval = null;

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
            <div class="toast-progress"><div class="toast-progress-bar"></div></div>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5300);
    }

    const sidebar = document.getElementById('sidebar');
    document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    function switchSection(section) {
        activeSection = section;
        document.querySelectorAll('.menu-item[data-nav]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === section);
        });

        document.getElementById('tab-instances').classList.toggle('hidden', section !== 'instances');
        document.getElementById('tab-warns').classList.toggle('hidden', section !== 'warns');
        document.getElementById('tab-staff').classList.toggle('hidden', section !== 'staff');

        const headerLabels = {
            instances: 'INSTANCES',
            warns: 'DISCIPLINE LOG',
            staff: 'ADMINISTRATION'
        };
        document.getElementById('header-section-label').textContent = headerLabels[section] || 'INSTANCES';
        document.getElementById('search-box-wrapper').style.visibility = section === 'instances' ? 'visible' : 'hidden';

        if (section === 'staff') {
            renderAdminPanel();
        }
    }

    document.querySelectorAll('.menu-item[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.nav));
    });

    document.getElementById('open-warns-shortcut').addEventListener('click', () => switchSection('warns'));

    searchInput.addEventListener('input', () => {
        if (currentAccountCache) {
            renderInstances(currentAccountCache.instances || [], instancesDBCache, searchInput.value.trim().toLowerCase());
        }
    });

    async function fetchDatabase() {
        if (checkMobileRestriction()) return;

        try {
            const cacheBuster = Date.now();
            const [accountsRes, instancesRes] = await Promise.all([
                fetch(`data/accounts.json?t=${cacheBuster}`, { cache: 'no-store' }),
                fetch(`data/instances.json?t=${cacheBuster}`, { cache: 'no-store' })
            ]);

            if (!accountsRes.ok || !instancesRes.ok) throw new Error('Archivos no encontrados');

            let accounts = await accountsRes.json();
            const instancesDB = await instancesRes.json();

            try {
                const sandbox = JSON.parse(localStorage.getItem(SANDBOX_KEY) || 'null');
                if (Array.isArray(sandbox) && sandbox.length > 0) {
                    accounts = sandbox;
                }
            } catch (_) {}

            allAccountsCache = accounts;
            instancesDBCache = instancesDB;

            const account = accounts.find(acc => acc.username.toLowerCase() === username.toLowerCase());
            if (!account) {
                showUnauthorized();
                return;
            }

            currentAccountCache = account;

            if (account.banned === true) {
                showBanned(account);
                return;
            }

            if (!account.instances || account.instances.length === 0) {
                showUnauthorized();
                return;
            }

            showDashboard(account, instancesDB);

        } catch (error) {
            console.error('Error consultando la base de datos:', error);
            showUnauthorized();
        }
    }

    function showBanned(account) {
        const fingerprint = `BAN_${JSON.stringify(account.banInfo || {})}`;
        if (lastStateFingerprint === fingerprint) return;
        lastStateFingerprint = fingerprint;
        clearInterval(banCountdownInterval);

        dashboardView.classList.add('hidden');
        unauthorizedView.classList.add('hidden');
        bannedView.classList.remove('hidden');

        const info = account.banInfo || {};
        const isPerm = info.type === 'permban';

        document.getElementById('ban-username-display').textContent = account.username;
        document.getElementById('ban-shield-icon').textContent = isPerm ? 'block' : 'hourglass_bottom';
        document.getElementById('ban-type-label').textContent = isPerm ? 'EXPULSIÓN PERMANENTE (PERM-BAN)' : 'SUSPENSIÓN TEMPORAL (TEMP-BAN)';
        document.getElementById('ban-reason-text').textContent = info.reason || 'Tu cuenta ha sido suspendida por incumplimiento de las normas de ZyrIsland.';
        document.getElementById('ban-case-id').textContent = info.caseId || 'BAN-2026-001';
        document.getElementById('ban-staff-name').textContent = info.staff || 'Administración';
        document.getElementById('ban-date-text').textContent = info.date || 'Vigente';

        const countdownEl = document.getElementById('ban-countdown-timer');
        if (!isPerm && info.expiresAt) {
            const endTs = new Date(info.expiresAt).getTime();
            const tick = () => {
                const diff = endTs - Date.now();
                if (diff <= 0) {
                    countdownEl.textContent = 'SUSPENSIÓN EXPIRADA';
                    clearInterval(banCountdownInterval);
                    return;
                }
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                countdownEl.textContent = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
            };
            tick();
            banCountdownInterval = setInterval(tick, 1000);
        } else {
            countdownEl.textContent = 'PERMANENTE';
            countdownEl.style.fontSize = '1.1rem';
        }
    }

    function showUnauthorized() {
        const fingerprint = 'UNAUTHORIZED';
        if (lastStateFingerprint === fingerprint) return;
        lastStateFingerprint = fingerprint;
        clearInterval(banCountdownInterval);

        dashboardView.classList.add('hidden');
        bannedView.classList.add('hidden');
        unauthorizedView.classList.remove('hidden');
    }

    function showDashboard(account, instancesDB) {
        bannedView.classList.add('hidden');
        unauthorizedView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        clearInterval(banCountdownInterval);

        const isAdmin = account.role === 'admin' || account.role === 'staff';
        document.getElementById('user-role-badge').textContent = account.badge || (isAdmin ? 'STAFF • ZYRISLAND' : 'MIEMBRO VERIFICADO');
        document.getElementById('nav-staff-btn').classList.toggle('hidden', !isAdmin);

        const activeWarns = (account.warns || []).filter(w => w.active !== false);
        const maxWarns = account.maxWarns || 3;
        const count = activeWarns.length;

        document.getElementById('sidebar-warn-pill').textContent = `${count}/${maxWarns}`;
        document.getElementById('strike-counter-text').textContent = `${count} / ${maxWarns} WARNS`;

        const lvl = Math.min(3, count);
        for (let i = 1; i <= 3; i++) {
            const seg = document.getElementById(`strike-seg-${i}`);
            seg.className = 'strike-seg' + (i <= lvl ? ` lvl-${lvl}` : '');
        }

        const descMap = [
            'Historial limpio • Sin advertencias',
            'Precaucion • 1 advertencia registrada',
            'Riesgo alto • A 1 warn de suspensión',
            'Limite alcanzado • Revision disciplinaria'
        ];
        document.getElementById('strike-status-desc').textContent = descMap[lvl];

        const fingerprint = `DASH_${JSON.stringify(account)}_${JSON.stringify(instancesDB)}`;
        if (fingerprint !== lastStateFingerprint) {
            lastStateFingerprint = fingerprint;
            renderInstances(account.instances, instancesDB, searchInput.value.trim().toLowerCase());
            renderWarnsList(account.warns || []);
            if (isAdmin && activeSection === 'staff') {
                renderAdminPanel();
            }
        }
    }

    function renderInstances(userInstances, instancesDB, query = '') {
        instancesGrid.innerHTML = '';

        userInstances.forEach(instanceId => {
            const inst = instancesDB[instanceId];
            if (!inst) return;
            if (query && !inst.name.toLowerCase().includes(query) && !(inst.tag || '').toLowerCase().includes(query)) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'instance-card';

            card.addEventListener('click', () => {
                window.location.href = inst.downloadLink || `instance.html?id=${encodeURIComponent(instanceId)}`;
            });

            const isOnline = inst.status !== 'maintenance';
            card.innerHTML = `
                <div class="instance-cover-wrap">
                    <img src="${inst.background}" alt="${inst.name}" class="instance-card-img">
                    <div class="instance-cover-gradient"></div>
                    <div class="instance-cover-badges">
                        <span class="instance-tag-badge">${inst.tag || 'EVENTO'}</span>
                        <span class="instance-status-badge ${isOnline ? 'online' : 'maintenance'}">
                            ● ${isOnline ? 'Disponible' : 'En Pruebas'}
                        </span>
                    </div>
                </div>
                <div class="instance-card-body">
                    <div>
                        <h3 class="instance-card-title">${inst.name}</h3>
                        <p class="instance-card-desc">${inst.description || 'Haz clic para acceder a los archivos oficiales de esta instancia.'}</p>
                    </div>
                    <div class="instance-card-footer">
                        <span>${inst.version || 'Java 1.21.1'}</span>
                        <span class="instance-go-cta">Abrir <span class="material-icons" style="font-size: 1rem;">arrow_forward</span></span>
                    </div>
                </div>
            `;
            instancesGrid.appendChild(card);
        });
    }

    function renderWarnsList(warns) {
        const container = document.getElementById('warns-list-container');
        if (!warns || warns.length === 0) {
            container.innerHTML = `
                <div class="clean-history-box">
                    <span class="material-icons">verified</span>
                    <h3>¡Expediente Impecable!</h3>
                    <p>No tienes advertencias registradas en tu cuenta de ZyrIsland.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = warns.map(w => `
            <div class="warn-item-card ${w.severity || 'leve'}">
                <div>
                    <h4>
                        <span>${w.id || 'WRN-2026'}</span>
                        <span class="sev-badge">Severidad ${w.severity || 'Leve'}</span>
                    </h4>
                    <p>${w.reason}</p>
                    <small>Emitida por <strong>${w.staff || 'Staff'}</strong> • Fecha: <strong>${w.date || 'N/A'}</strong></small>
                </div>
                <a href="https://discord.gg/DVBdqXgsGu" target="_blank" rel="noopener" class="outline-pill-btn">
                    <span class="material-icons">forum</span> Consultar
                </a>
            </div>
        `).join('');
    }

    function renderAdminPanel() {
        const userSelect = document.getElementById('admin-user-select');
        const prevSelected = userSelect.value;

        userSelect.innerHTML = allAccountsCache.map(acc => `
            <option value="${acc.username}">${acc.username} — ${acc.banned ? '🚫 BANEADO' : `${(acc.warns || []).length} warns`}</option>
        `).join('');

        if (prevSelected && allAccountsCache.some(a => a.username === prevSelected)) {
            userSelect.value = prevSelected;
        }

        const updateCheckboxes = () => {
            const target = allAccountsCache.find(a => a.username === userSelect.value);
            const box = document.getElementById('admin-instances-checkboxes');
            const instKeys = Object.keys(instancesDBCache);
            box.innerHTML = instKeys.map(key => {
                const checked = target && Array.isArray(target.instances) && target.instances.includes(key) ? 'checked' : '';
                return `
                    <label class="inst-check-pill">
                        <input type="checkbox" value="${key}" ${checked}>
                        <span>${instancesDBCache[key].name} (${key})</span>
                    </label>
                `;
            }).join('');

            box.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', () => {
                    const updated = JSON.parse(JSON.stringify(allAccountsCache));
                    const u = updated.find(a => a.username === userSelect.value);
                    if (!u) return;
                    const selectedIds = Array.from(box.querySelectorAll('input:checked')).map(i => i.value);
                    u.instances = selectedIds;
                    persistSandboxAccounts(updated);
                    showToast('success', 'INSTANCIAS ACTUALIZADAS', `Permisos actualizados para ${u.username}.`);
                });
            });
        };

        userSelect.onchange = updateCheckboxes;
        updateCheckboxes();
        document.getElementById('admin-json-preview').textContent = JSON.stringify(allAccountsCache, null, 2);
    }

    function persistSandboxAccounts(updatedList) {
        localStorage.setItem(SANDBOX_KEY, JSON.stringify(updatedList));
        allAccountsCache = updatedList;
        lastStateFingerprint = '';
        fetchDatabase();
    }

    function applyDisciplineAction(type) {
        const targetName = document.getElementById('admin-user-select').value;
        const severity = document.getElementById('admin-warn-severity').value;
        const hours = Math.max(1, Number(document.getElementById('admin-tempban-hours').value || 24));
        const reason = document.getElementById('admin-reason-input').value.trim() || 'Sanción disciplinaria aplicada por el equipo Staff.';

        const updated = JSON.parse(JSON.stringify(allAccountsCache));
        const target = updated.find(a => a.username === targetName);
        if (!target) return;

        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

        if (type === 'warn') {
            target.warns = target.warns || [];
            target.warns.push({
                id: `WRN-2026-${Math.floor(100 + Math.random() * 899)}`,
                reason,
                severity,
                date: nowStr,
                staff: username,
                active: true
            });
            const maxW = target.maxWarns || 3;
            if (target.warns.length >= maxW) {
                target.banned = true;
                target.banInfo = {
                    type: 'tempban',
                    caseId: `BAN-2026-${Math.floor(100 + Math.random() * 899)}`,
                    reason: `Acumulación automática de ${target.warns.length}/${maxW} warns. Último: ${reason}`,
                    staff: username,
                    date: nowStr,
                    expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
                    appealable: true
                };
                showToast('error', 'AUTO-TEMPBAN ACTIVADO', `${target.username} alcanzó ${maxW} warns y fue suspendido.`);
            } else {
                showToast('warn', 'WARN APLICADO', `${target.username} ahora tiene ${target.warns.length}/${maxW} advertencias.`);
            }
        } else if (type === 'tempban') {
            target.banned = true;
            target.banInfo = {
                type: 'tempban',
                caseId: `BAN-2026-${Math.floor(100 + Math.random() * 899)}`,
                reason,
                staff: username,
                date: nowStr,
                expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
                appealable: true
            };
            showToast('error', 'TEMP-BAN APLICADO', `${target.username} suspendido por ${hours} horas.`);
        } else if (type === 'permban') {
            target.banned = true;
            target.banInfo = {
                type: 'permban',
                caseId: `BAN-2026-${Math.floor(100 + Math.random() * 899)}`,
                reason,
                staff: username,
                date: nowStr,
                expiresAt: null,
                appealable: false
            };
            showToast('error', 'PERM-BAN APLICADO', `${target.username} ha sido vetado permanentemente.`);
        } else if (type === 'pardon') {
            target.banned = false;
            target.warns = [];
            target.banInfo = {
                type: null,
                caseId: null,
                reason: '',
                staff: '',
                date: '',
                expiresAt: null,
                appealable: false
            };
            if (!target.instances || target.instances.length === 0) {
                target.instances = ['zyrisland'];
            }
            showToast('success', 'HISTORIAL LIMPIADO', `Se retiraron las sanciones de ${target.username}.`);
        }

        persistSandboxAccounts(updated);
    }

    document.getElementById('btn-admin-warn').addEventListener('click', () => applyDisciplineAction('warn'));
    document.getElementById('btn-admin-tempban').addEventListener('click', () => applyDisciplineAction('tempban'));
    document.getElementById('btn-admin-permban').addEventListener('click', () => applyDisciplineAction('permban'));
    document.getElementById('btn-admin-pardon').addEventListener('click', () => applyDisciplineAction('pardon'));

    document.getElementById('btn-admin-create-user').addEventListener('click', () => {
        const newU = document.getElementById('new-acc-user').value.trim();
        const newP = document.getElementById('new-acc-pass').value.trim();
        if (!newU || !newP) {
            showToast('error', 'DATOS INCOMPLETOS', 'Escribe el usuario IGN y la contraseña.');
            return;
        }
        if (allAccountsCache.some(a => a.username.toLowerCase() === newU.toLowerCase())) {
            showToast('error', 'USUARIO DUPLICADO', 'Ya existe una cuenta con ese nombre.');
            return;
        }

        const updated = JSON.parse(JSON.stringify(allAccountsCache));
        updated.push({
            username: newU,
            password: newP,
            role: 'player',
            badge: 'Miembro Verificado',
            discord: '',
            banned: false,
            maxWarns: 3,
            banInfo: { type: null, caseId: null, reason: '', staff: '', date: '', expiresAt: null, appealable: false },
            warns: [],
            instances: ['zyrisland']
        });

        document.getElementById('new-acc-user').value = '';
        document.getElementById('new-acc-pass').value = '';
        persistSandboxAccounts(updated);
        showToast('success', 'CUENTA CREADA', `Se añadió ${newU} con acceso a ZyrIsland.`);
    });

    document.getElementById('reset-sandbox-btn').addEventListener('click', () => {
        localStorage.removeItem(SANDBOX_KEY);
        lastStateFingerprint = '';
        showToast('success', 'JSON RESTAURADO', 'Se cargaron los datos originales de data/accounts.json.');
        fetchDatabase();
    });

    document.getElementById('btn-copy-accounts-json').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(allAccountsCache, null, 2));
            showToast('success', 'JSON COPIADO', 'Pega el contenido en data/accounts.json en tu repositorio.');
        } catch (_) {}
    });

    document.getElementById('btn-download-accounts-json').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(allAccountsCache, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'accounts.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    fetchDatabase();
    setInterval(fetchDatabase, 2000);

    function executeLogout() {
        document.cookie = 'Esta_iniciado_sesion=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'Nombre=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = 'index.html';
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        executeLogout();
    });

    document.getElementById('unauth-logout-btn').addEventListener('click', executeLogout);
    document.getElementById('ban-logout-btn').addEventListener('click', executeLogout);
});
