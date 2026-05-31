function ensureAdminAuth() {
    const user = localStorage.getItem('user');
    if (!user) { window.location.href = 'login.html'; return null; }
    const userData = JSON.parse(user);
    if (userData.role !== 'admin') {
        alert(t('alert.adminRequired'));
        window.location.href = '../index.html';
        return null;
    }
    return userData;
}

let currentAdmin = ensureAdminAuth();

function showAdminSection(sectionId, e) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sectionId)?.classList.remove('hidden');
    (e?.target ?? e)?.closest?.('.admin-menu-item')?.classList.add('active');

    const titles = {
        'dashboard': t('admin.section.dashboard'),
        'cars': t('admin.section.cars'),
        'users': t('admin.section.users'),
        'sales': t('admin.section.sales'),
        'settings': t('admin.section.settings')
    };
    document.getElementById('adminPageTitle').textContent = titles[sectionId] || t('admin.section.dashboard');

    if (sectionId === 'dashboard') loadAdminDashboard();
    if (sectionId === 'cars') loadAdminCars();
    if (sectionId === 'users') loadAdminUsers();
    if (sectionId === 'sales') loadAdminSalesReports();
}

function updateAdminWelcome() {
    const name = currentAdmin?.name || 'Admin';
    const el = document.getElementById('adminSidebarName');
    if (el) el.textContent = name;

    const greeting = t('dash.greeting');
    const greetEl = document.getElementById('adminWelcomeGreeting');
    if (greetEl) greetEl.textContent = `${greeting}، ${name}`;

    const now = new Date();
    const dayNames = {
        ar: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
        ku: ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'],
        en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    };
    const lang = getLang();
    const days = dayNames[lang] || dayNames.en;
    const dayEl = document.getElementById('adminWelcomeDay');
    const dateEl = document.getElementById('adminWelcomeDate');
    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (dateEl) dateEl.textContent = now.toLocaleDateString(
        lang === 'ar' ? 'ar-IQ' : lang === 'ku' ? 'ku' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
    );
}

function statusBadge(status) {
    const labels = {
        available: t('dyn.available'),
        sold: t('dyn.status.completed'),
        pending: t('dyn.status.pending'),
        completed: t('dyn.status.completed'),
        active: t('dyn.status.active'),
        cancelled: t('dyn.status.cancelled'),
        admin: 'Admin', staff: 'Staff', user: t('dash.userRole')
    };
    const label = labels[status] || status;
    return `<span class="status-badge ${status}">${label}</span>`;
}

async function loadAdminDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();
        document.getElementById('statsUsers').textContent = stats.totalUsers ?? 0;
        document.getElementById('statsCars').textContent = stats.totalCars ?? 0;
        document.getElementById('statsSales').textContent = stats.totalSales ?? 0;
        document.getElementById('statsRevenue').textContent = '$' + (stats.totalRevenue ?? 0).toLocaleString();
    } catch (error) { console.error('Error loading dashboard:', error); }
}

function showAddCarForm() { document.getElementById('addCarForm').classList.remove('hidden'); }
function hideAddCarForm() { document.getElementById('addCarForm').classList.add('hidden'); }

async function loadAdminCars() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/cars`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cars = await response.json();
        if (!Array.isArray(cars) || cars.length === 0) {
            document.getElementById('carsList').innerHTML = `<p style="color:var(--text-muted);padding:20px">${t('admin.cars.title')}: –</p>`;
            return;
        }
        document.getElementById('carsList').innerHTML = `
            <table>
                <thead><tr>
                    <th>${t('admin.cars.brand')}</th>
                    <th>${t('admin.cars.model')}</th>
                    <th>${t('admin.cars.year')}</th>
                    <th>${t('admin.cars.price')}</th>
                    <th>${t('admin.cars.mileage')}</th>
                    <th>${t('admin.cars.fuel')}</th>
                    <th>${t('admin.cars.status')}</th>
                    <th>${t('admin.cars.actions')}</th>
                </tr></thead>
                <tbody>${cars.map(car => `
                    <tr>
                        <td><strong>${car.brand}</strong></td>
                        <td>${car.model}</td>
                        <td>${car.year}</td>
                        <td><strong>$${car.price.toLocaleString()}</strong></td>
                        <td>${car.mileage?.toLocaleString() || '–'} km</td>
                        <td>${car.fuel || '–'}</td>
                        <td>${statusBadge(car.status)}</td>
                        <td>
                            <button class="btn btn-secondary btn-small">${t('admin.cars.edit')}</button>
                            <button class="btn btn-danger btn-small" onclick="deleteCar('${car._id}')">${t('admin.cars.delete')}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (error) { console.error('Error loading cars:', error); }
}

async function loadAdminUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        if (!Array.isArray(users) || users.length === 0) {
            document.getElementById('usersList').innerHTML = `<p style="color:var(--text-muted);padding:20px">–</p>`;
            return;
        }
        document.getElementById('usersList').innerHTML = `
            <table>
                <thead><tr>
                    <th>${t('admin.users.name')}</th>
                    <th>${t('admin.users.email')}</th>
                    <th>${t('admin.users.phone')}</th>
                    <th>${t('admin.users.role')}</th>
                    <th>${t('admin.users.city')}</th>
                    <th>${t('admin.users.actions')}</th>
                </tr></thead>
                <tbody>${users.map(user => `
                    <tr>
                        <td><strong>${user.name}</strong></td>
                        <td>${user.email}</td>
                        <td>${user.phone || '–'}</td>
                        <td>${statusBadge(user.role)}</td>
                        <td>${user.city || '–'}</td>
                        <td>
                            <button class="btn btn-secondary btn-small">${t('admin.users.edit')}</button>
                            <button class="btn btn-danger btn-small" onclick="deleteUser('${user._id}')">${t('admin.users.delete')}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (error) { console.error('Error loading users:', error); }
}

async function loadAdminSalesReports() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/reports/sales`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const sales = await response.json();
        if (!Array.isArray(sales) || sales.length === 0) {
            document.getElementById('salesReport').innerHTML = `<p style="color:var(--text-muted);padding:20px">–</p>`;
            return;
        }

        const cashTypes  = ['cash', 'check', 'bank_transfer'];
        const cashSales  = sales.filter(s => cashTypes.includes(s.paymentMethod));
        const instSales  = sales.filter(s => s.paymentMethod === 'installment');
        const cashTotal  = cashSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
        const instTotal  = instSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
        const totalRev   = cashTotal + instTotal;

        document.getElementById('salesReport').innerHTML = `
            <div class="report-summary">
                <div class="report-stat">
                    <div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <h3>${t('report.cashTotal')}</h3>
                        <p>$${cashTotal.toLocaleString()}</p>
                        <small>${cashSales.length} ${t('report.deals')}</small>
                    </div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon blue"><i class="fas fa-credit-card"></i></div>
                    <div class="stat-info">
                        <h3>${t('report.installTotal')}</h3>
                        <p>$${instTotal.toLocaleString()}</p>
                        <small>${instSales.length} ${t('report.deals')}</small>
                    </div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon amber"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-info">
                        <h3>${t('report.revenue')}</h3>
                        <p>$${totalRev.toLocaleString()}</p>
                        <small>${sales.length} ${t('report.totalDeals')}</small>
                    </div>
                </div>
            </div>
            <table>
                <thead><tr>
                    <th>${t('admin.sales.car')}</th>
                    <th>${t('admin.sales.buyer')}</th>
                    <th>${t('admin.sales.price')}</th>
                    <th>${t('admin.sales.date')}</th>
                    <th>${t('admin.sales.payment')}</th>
                    <th>${t('admin.sales.status')}</th>
                    <th>${t('admin.sales.actions')}</th>
                </tr></thead>
                <tbody>${sales.map(sale => `
                    <tr>
                        <td><strong>${sale.car?.brand || ''} ${sale.car?.model || ''}</strong></td>
                        <td>${sale.buyer?.name || '–'}</td>
                        <td><strong>$${sale.salePrice?.toLocaleString()}</strong></td>
                        <td>${new Date(sale.saleDate).toLocaleDateString()}</td>
                        <td>${sale.paymentMethod || '–'}</td>
                        <td>${statusBadge(sale.status)}</td>
                        <td><button class="btn btn-secondary btn-small">${t('admin.sales.view')}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (error) { console.error('Error loading sales reports:', error); }
}

async function deleteCar(carId) {
    if (!confirm(t('alert.deleteCarConfirm'))) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/cars/${carId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) { alert(t('alert.carDeleted')); loadAdminCars(); }
        else alert(t('alert.carDeleteFailed'));
    } catch (error) { console.error('Error deleting car:', error); alert(t('alert.carDeleteFailed')); }
}

async function deleteUser(userId) {
    if (!confirm(t('alert.deleteUserConfirm'))) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) { alert(t('alert.userDeleted')); loadAdminUsers(); }
        else alert(t('alert.userDeleteFailed'));
    } catch (error) { console.error('Error deleting user:', error); alert(t('alert.userDeleteFailed')); }
}

document.addEventListener('DOMContentLoaded', () => {
    updateAdminWelcome();
    loadAdminDashboard();

    document.getElementById('addCarForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.year = parseInt(data.year);
        data.price = parseFloat(data.price);
        data.mileage = parseInt(data.mileage);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                alert(t('alert.carAdded'));
                e.target.reset();
                hideAddCarForm();
                loadAdminCars();
            } else {
                const err = await response.json();
                alert(err.message || t('alert.carAddFailed'));
            }
        } catch (error) { console.error('Error adding car:', error); alert(t('alert.carAddFailed')); }
    });

    document.getElementById('systemSettingsForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert(t('alert.settingsSaved'));
    });
});
