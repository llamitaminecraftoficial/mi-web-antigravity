/**
 * Lead Machine Pro - Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initDataHandlers();
});

// State
let currentView = 'overview';
let charts = {};
let map = null;

/**
 * Authentication
 */
function initAuth() {
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const errorMsg = document.getElementById('login-error');

    if (localStorage.getItem('admin_session') === 'active') {
        loginScreen.classList.add('hidden');
        dashboardLayout.classList.remove('hidden');
        loadDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = document.getElementById('admin-pass').value;

        if (pass === 'admin123') {
            localStorage.setItem('admin_session', 'active');
            loginScreen.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            loadDashboard();
        } else {
            errorMsg.style.display = 'block';
            setTimeout(() => errorMsg.style.display = 'none', 3000);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('admin_session');
        window.location.reload();
    });
}

/**
 * Navigation & View Management
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const views = document.querySelectorAll('.view-content');
    const titleHeader = document.getElementById('view-title');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const viewId = item.getAttribute('data-view');

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => v.classList.add('hidden'));
            const activeView = document.getElementById(`view-${viewId}`);
            if (activeView) activeView.classList.remove('hidden');

            titleHeader.textContent = item.querySelector('span').textContent;
            currentView = viewId;

            await refreshViewData(viewId);
        });
    });
}

async function refreshViewData(viewId) {
    switch (viewId) {
        case 'overview':
            await updateStatsGrid();
            await renderRecentLeads();
            break;
        case 'leads':
            await renderLeadsTable();
            break;
        case 'analytics':
            await renderDetailedAnalytics();
            setTimeout(initGeographicMap, 100); // Small delay for layout
            break;
        case 'landings':
            await renderLandingsView();
            break;
        case 'templates':
            renderTemplatesView();
            break;
    }
}

/**
 * Data Management
 */
async function loadDashboard() {
    await updateStatsGrid();
    await renderRecentLeads();
}

async function updateStatsGrid() {
    const stats = await window.DB.getStats();
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-today').textContent = stats.today;
}

async function renderRecentLeads() {
    const allLeads = await window.DB.getLeads();
    const leads = allLeads.slice(0, 5);
    const container = document.getElementById('recent-leads-list');

    if (!container) return;
    if (leads.length === 0) {
        container.innerHTML = '<p class="text-center" style="padding: 2rem; color: var(--text-muted);">Sin leads registrados.</p>';
        return;
    }

    container.innerHTML = leads.map(l => `
        <div class="mini-item">
            <div class="mini-item-info">
                <span class="name">${l.name}</span>
                <span class="time">${new Date(l.timestamp).toLocaleTimeString()}</span>
            </div>
            <span class="status-badge ${l.status.toLowerCase()}">${l.status}</span>
        </div>
    `).join('');
}

async function renderLeadsTable() {
    const leads = await window.DB.getLeads();
    const tableBody = document.getElementById('leads-table-body');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('lead-search').value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    const filtered = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm) || l.email.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === '' || l.status === statusFilter;

        let matchesDate = true;
        const leadDate = l.timestamp.split('T')[0];
        if (dateFrom && leadDate < dateFrom) matchesDate = false;
        if (dateTo && leadDate > dateTo) matchesDate = false;

        return matchesSearch && matchesStatus && matchesDate;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 4rem; color: var(--text-muted);">No se encontraron resultados.</td></tr>';
        return;
    }

    tableBody.innerHTML = filtered.map(l => `
        <tr>
            <td><strong>${l.name}</strong></td>
            <td>${l.email}</td>
            <td>${l.phone || 'N/A'}</td>
            <td>${l.service || 'N/A'}</td>
            <td>${new Date(l.timestamp).toLocaleDateString()}</td>
            <td><span class="status-badge ${l.status.toLowerCase()}">${l.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="showLeadDetail('${l.id}')">Detalle</button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

/**
 * Detailed 3D-Look Analytics
 */
async function initMainChart() {
    const canvas = document.getElementById('leadsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stats = await window.DB.getStats();

    const days = Object.keys(stats.byDay).sort().slice(-7);
    const values = days.map(d => stats.byDay[d]);

    // Create 3D-effect gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    if (charts.leads) charts.leads.destroy();

    charts.leads = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.length ? days : ['Sin datos'],
            datasets: [{
                label: 'Leads',
                data: values.length ? values : [0],
                borderColor: '#6366f1',
                borderWidth: 5,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 3,
                pointRadius: 6,
                backgroundColor: gradient,
                fill: true,
                tension: 0.45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1e293b', titleFont: { size: 14 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function renderDetailedAnalytics() {
    const stats = await window.DB.getStats();

    // 3D Doughnut with shadow simulation
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        if (charts.status) charts.status.destroy();
        charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.byStatus),
                datasets: [{
                    data: Object.values(stats.byStatus),
                    backgroundColor: ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e'],
                    hoverOffset: 15,
                    borderWidth: 4,
                    borderColor: 'transparent',
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#f3f4f6', padding: 20, usePointStyle: true } }
                }
            }
        });
    }
}

async function initGeographicMap() {
    const mapContainer = document.getElementById('lead-map');
    if (!mapContainer) return;

    if (map) {
        map.remove();
        map = null;
    }

    // Initialize Leaflet map
    map = L.map('lead-map').setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const leads = await window.DB.getLeads();

    // Mock city coordinates if not present
    const cityCoords = {
        'Madrid': [40.4168, -3.7038],
        'Barcelona': [41.3851, 2.1734],
        'Mexico City': [19.4326, -99.1332],
        'Buenos Aires': [-34.6037, -58.3816],
        'Miami': [25.7617, -80.1918],
        'Bogotá': [4.7110, -74.0721],
        'Santiago': [-33.4489, -70.6693]
    };

    const cities = Object.keys(cityCoords);

    leads.forEach(l => {
        // Assign a random city if lead doesn't have one (for demo)
        const city = l.city || cities[Math.floor(Math.random() * cities.length)];
        const coords = cityCoords[city];

        if (coords) {
            L.circleMarker(coords, {
                radius: 8,
                fillColor: "#6366f1",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map)
                .bindPopup(`<b>${l.name}</b><br>${city}<br>Status: ${l.status}`);
        }
    });
}



/**
 * Message Templates Management
 */
function renderTemplatesView() {
    const container = document.getElementById('templates-list');
    if (!container) return;

    const templates = getTemplates();

    if (templates.length === 0) {
        container.innerHTML = '<div class="glass-card text-center" style="grid-column: 1/-1; padding: 4rem; color: var(--text-muted);">No hay plantillas creadas todavía.</div>';
        return;
    }

    container.innerHTML = templates.map(t => `
        <div class="template-card glass-card">
            <div class="tpl-head">
                <span class="type-badge ${t.type.toLowerCase()}">${t.type}</span>
                <h4>${t.name}</h4>
            </div>
            <div class="tpl-body">
                <p>${t.body.substring(0, 100)}${t.body.length > 100 ? '...' : ''}</p>
            </div>
            <div class="tpl-actions">
                <button class="btn btn-secondary btn-sm" onclick="editTemplate('${t.id}')">Editar</button>
                <button class="btn btn-secondary btn-sm text-danger" onclick="deleteTemplate('${t.id}')">Borrar</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function getTemplates() {
    return JSON.parse(localStorage.getItem('lm_templates') || '[]');
}

window.showTemplateModal = function (id = null) {
    const modal = document.getElementById('template-modal');
    const title = document.getElementById('template-modal-title');
    const nameInput = document.getElementById('tpl-name');
    const typeInput = document.getElementById('tpl-type');
    const bodyInput = document.getElementById('tpl-body');
    const saveBtn = document.getElementById('save-template-btn');

    if (id) {
        const templates = getTemplates();
        const tpl = templates.find(t => t.id === id);
        title.textContent = 'Editar Plantilla';
        nameInput.value = tpl.name;
        typeInput.value = tpl.type;
        bodyInput.value = tpl.body;
        saveBtn.onclick = () => saveTemplate(id);
    } else {
        title.textContent = 'Nueva Plantilla';
        nameInput.value = '';
        typeInput.value = 'WhatsApp';
        bodyInput.value = '';
        saveBtn.onclick = () => saveTemplate();
    }

    modal.classList.remove('hidden');
};

window.closeTemplateModal = function () {
    document.getElementById('template-modal').classList.add('hidden');
};

function saveTemplate(id = null) {
    const name = document.getElementById('tpl-name').value;
    const type = document.getElementById('tpl-type').value;
    const body = document.getElementById('tpl-body').value;

    if (!name || !body) return alert('Nombre y cuerpo son obligatorios');

    let templates = getTemplates();
    if (id) {
        const idx = templates.findIndex(t => t.id === id);
        templates[idx] = { id, name, type, body };
    } else {
        templates.push({ id: 'tpl_' + Date.now(), name, type, body });
    }

    localStorage.setItem('lm_templates', JSON.stringify(templates));
    closeTemplateModal();
    renderTemplatesView();
}

window.deleteTemplate = function (id) {
    if (!confirm('¿Seguro que quieres borrar esta plantilla?')) return;
    let templates = getTemplates();
    templates = templates.filter(t => t.id !== id);
    localStorage.setItem('lm_templates', JSON.stringify(templates));
    renderTemplatesView();
};

window.editTemplate = function (id) {
    showTemplateModal(id);
};
async function renderLandingsView() {
    const container = document.querySelector('.landing-grid');
    if (!container) return;

    const leads = await window.DB.getLeads();
    const stats = await window.DB.getStats();

    container.innerHTML = `
        <div class="landing-card glass-card">
            <div class="landing-head">
                <div class="badge active">Activa</div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <i data-lucide="monitor" style="color: var(--accent);"></i>
                    <h3>Landing Principal Elite</h3>
                </div>
            </div>
            <div class="landing-stats-full">
                <div class="l-item"><span>Total Leads</span><strong>${leads.length}</strong></div>
                <div class="l-item"><span>Conversión</span><strong>18.5%</strong></div>
                <div class="l-item"><span>Status</span><strong style="color: #10b981;">Online</strong></div>
            </div>
            <div class="landing-footer-actions">
                <button class="btn btn-primary btn-sm btn-block" onclick="window.open('index.html', '_blank')">Ver Landing</button>
                <button class="btn btn-secondary btn-sm btn-block">Configurar Tracking</button>
            </div>
        </div>

        <div class="landing-card glass-card empty">
            <div class="add-landing-inner">
                <i data-lucide="plus-circle" size="48"></i>
                <p>Crear Nueva Campaña / Landing</p>
                <button class="btn btn-secondary btn-sm">Añadir Fuente</button>
            </div>
        </div>
    `;
    lucide.createIcons();
}

/**
 * Core Handlers
 */
function initDataHandlers() {
    document.getElementById('refresh-data')?.addEventListener('click', async () => {
        await refreshViewData(currentView);
    });

    document.getElementById('lead-search')?.addEventListener('input', renderLeadsTable);
    document.getElementById('filter-status')?.addEventListener('change', renderLeadsTable);
    document.getElementById('filter-date-from')?.addEventListener('change', renderLeadsTable);
    document.getElementById('filter-date-to')?.addEventListener('change', renderLeadsTable);

    document.getElementById('export-csv')?.addEventListener('click', async () => {
        const leads = await window.DB.getLeads();
        const searchTerm = (document.getElementById('lead-search').value || '').toLowerCase();
        const statusFilter = document.getElementById('filter-status').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;

        const filtered = leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchTerm) || l.email.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === '' || l.status === statusFilter;
            let matchesDate = true;
            const leadDate = l.timestamp.split('T')[0];
            if (dateFrom && leadDate < dateFrom) matchesDate = false;
            if (dateTo && leadDate > dateTo) matchesDate = false;
            return matchesSearch && matchesStatus && matchesDate;
        });

        if (!filtered.length) return alert('No hay datos para exportar con los filtros actuales.');

        let csv = 'Name,Email,Phone,Business,Service,Source,Status,Date\n';
        filtered.forEach(l => {
            csv += `"${l.name}","${l.email}","${l.phone || ''}","${l.business || ''}","${l.service || ''}","${l.source || ''}","${l.status}","${l.timestamp}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_leads_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });

    const modal = document.getElementById('lead-modal');
    // Global click to close
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    // Close template modal on outside click
    const tModal = document.getElementById('template-modal');
    tModal?.addEventListener('click', (e) => { if (e.target === tModal) tModal.classList.add('hidden'); });
}

window.closeLeadModal = function () {
    document.getElementById('lead-modal').classList.add('hidden');
};

window.showLeadDetail = async function (id) {
    const allLeads = await window.DB.getLeads();
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;

    const content = document.getElementById('modal-content');
    content.innerHTML = `
        <div class="modal-detail-header">
            <h2>${lead.name}</h2>
            <span class="status-badge ${lead.status.toLowerCase()}">${lead.status}</span>
        </div>
        <div class="detail-grid">
            <div class="detail-item"><label>Email</label><p>${lead.email}</p></div>
            <div class="detail-item"><label>Teléfono</label><p>${lead.phone || 'N/A'}</p></div>
            <div class="detail-item"><label>Empresa</label><p>${lead.business || 'N/A'}</p></div>
            <div class="detail-item"><label>Servicio</label><p>${lead.service || 'N/A'}</p></div>
        </div>
        <div class="detail-message">
            <label>Mensaje Captado:</label>
            <p>${lead.message || 'Sin mensaje adicional.'}</p>
        </div>
        <div class="detail-templates">
            <label>Aplicar Plantilla:</label>
            <div class="tpl-select-row">
                <select id="apply-tpl-select" class="btn-secondary">
                    <option value="">Selecciona una plantilla...</option>
                    ${getTemplates().map(t => `<option value="${t.id}">[${t.type}] ${t.name}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-secondary" onclick="applyTemplateToLead('${lead.id}')">Vista Previa</button>
            </div>
            <div id="tpl-preview-area" class="hidden">
                <textarea id="tpl-preview-body" rows="4" class="preview-text"></textarea>
                <div class="preview-actions">
                    <button class="btn btn-primary btn-sm" id="btn-send-tpl">Cargar y Lanzar</button>
                </div>
            </div>
        </div>
        <div class="detail-actions">
            <!-- Contact Actions -->
            <a id="wa-link-${lead.id}" href="https://wa.me/${(lead.phone || '').replace(/\D/g, '')}?text=Hola%20${lead.name},%20me%20pongo%20en%20contacto%20contigo%20desde%20la%20plataforma%20de%20gesti%C3%B3n%20de%20Lead%20Machine%20Pro." target="_blank" class="btn btn-primary btn-wa">
                <i data-lucide="message-circle"></i> WhatsApp
            </a>
            <a id="mail-link-${lead.id}" href="mailto:${lead.email}" class="btn btn-primary btn-email">
                <i data-lucide="mail"></i> Email
            </a>
            
            <!-- Status Update Actions -->
            <div class="status-actions-group">
                <button class="btn btn-secondary" onclick="updateLeadCurrentStatus('${lead.id}', 'Nuevo')">Marcar Nuevo</button>
                <button class="btn btn-secondary" onclick="updateLeadCurrentStatus('${lead.id}', 'Contactado')">Marcar Contactado</button>
                <button class="btn btn-secondary" onclick="updateLeadCurrentStatus('${lead.id}', 'Pendiente')">Marcar Pendiente</button>
                <button class="btn btn-secondary btn-success" onclick="updateLeadCurrentStatus('${lead.id}', 'Cerrado')">Cerrar Venta</button>
            </div>
        </div>
    `;
    document.getElementById('lead-modal').classList.remove('hidden');
    lucide.createIcons();
};

window.updateLeadCurrentStatus = async function (id, status) {
    await window.DB.updateLead(id, { status });
    document.getElementById('lead-modal').classList.add('hidden');
    await refreshViewData(currentView);
};

window.applyTemplateToLead = async function (leadId) {
    const tplId = document.getElementById('apply-tpl-select').value;
    if (!tplId) return;

    const allLeads = await window.DB.getLeads();
    const lead = allLeads.find(l => l.id === leadId);
    const templates = getTemplates();
    const tpl = templates.find(t => t.id === tplId);

    // Replace variables
    let body = tpl.body
        .replace(/{name}/g, lead.name)
        .replace(/{email}/g, lead.email)
        .replace(/{phone}/g, lead.phone || '')
        .replace(/{service}/g, lead.service || '');

    const previewArea = document.getElementById('tpl-preview-area');
    const previewText = document.getElementById('tpl-preview-body');
    const sendBtn = document.getElementById('btn-send-tpl');

    previewArea.classList.remove('hidden');
    previewText.value = body;

    sendBtn.onclick = () => {
        const finalBody = encodeURIComponent(previewText.value);
        if (tpl.type === 'WhatsApp') {
            const phone = (lead.phone || '').replace(/\s/g, '');
            window.open(`https://wa.me/${phone}?text=${finalBody}`, '_blank');
        } else {
            window.open(`mailto:${lead.email}?body=${finalBody}`, '_blank');
        }
    };
};

