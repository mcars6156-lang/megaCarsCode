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
        'cars':      t('admin.section.cars'),
        'users':     t('admin.section.users'),
        'sales':     t('admin.section.sales'),
        'expenses':  t('admin.menu.expenses'),
        'settings':  t('admin.section.settings')
    };
    document.getElementById('adminPageTitle').textContent = titles[sectionId] || t('admin.section.dashboard');

    if (sectionId === 'dashboard') loadAdminDashboard();
    if (sectionId === 'cars')      loadAdminCars();
    if (sectionId === 'users')     loadAdminUsers();
    if (sectionId === 'sales')     loadAdminSalesReports();
    if (sectionId === 'expenses')  { loadExpenses(); initExpenseDate(); }
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
        document.getElementById('statsUsers').textContent   = stats.totalUsers ?? 0;
        document.getElementById('statsCars').textContent    = stats.totalCars ?? 0;
        document.getElementById('statsSales').textContent   = stats.totalSales ?? 0;
        document.getElementById('statsRevenue').textContent = '$' + (stats.totalRevenue ?? 0).toLocaleString();
    } catch (error) { console.error('Error loading dashboard:', error); }
}

// ── Expenses ──────────────────────────────────────────────

function getExchangeRate() {
    return parseFloat(document.getElementById('exchangeRate')?.value) || 1490;
}

function updateExpUSD() {
    const iqd  = parseFloat(document.getElementById('expAmountIQD')?.value) || 0;
    const rate = getExchangeRate();
    const usd  = (iqd / rate).toFixed(2);
    const el   = document.getElementById('expUSDPreview');
    if (el) el.textContent = `= $${Number(usd).toLocaleString()}`;
}

async function loadExpenses() {
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE_URL}/expenses`, { headers: { 'Authorization': `Bearer ${token}` } });
        const expenses = await res.json();

        const totalIQD = expenses.reduce((s, e) => s + (e.amountIQD || 0), 0);
        const totalUSD = expenses.reduce((s, e) => s + (e.amountUSD || 0), 0);

        const totalsEl = document.getElementById('expenseTotals');
        if (totalsEl) totalsEl.innerHTML = `
            <div class="exp-total-item">
                <span>${t('exp.totalIQD')}</span>
                <strong>${totalIQD.toLocaleString()} IQD</strong>
            </div>
            <div class="exp-total-item">
                <span>${t('exp.totalUSD')}</span>
                <strong>$${totalUSD.toLocaleString()}</strong>
            </div>
            <div class="exp-total-item">
                <span>${t('exp.count')}</span>
                <strong>${expenses.length}</strong>
            </div>`;

        const listEl = document.getElementById('expensesList');
        if (!listEl) return;
        if (!expenses.length) { listEl.innerHTML = `<p style="color:var(--text-muted);padding:20px">–</p>`; return; }

        listEl.innerHTML = `<table>
            <thead><tr>
                <th>${t('exp.date')}</th>
                <th>${t('exp.desc')}</th>
                <th>${t('exp.category')}</th>
                <th>${t('exp.amountIQD')}</th>
                <th>${t('exp.amountUSD')}</th>
                <th>${t('exp.payment')}</th>
                <th></th>
            </tr></thead>
            <tbody>${expenses.map(e => `
                <tr>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td><strong>${e.description}</strong></td>
                    <td><span class="status-badge pending">${e.category}</span></td>
                    <td>${(e.amountIQD || 0).toLocaleString()} IQD</td>
                    <td><strong>$${(e.amountUSD || 0).toLocaleString()}</strong></td>
                    <td>${e.paymentMethod?.replace('_', ' ') || '–'}</td>
                    <td><button class="btn btn-danger btn-small" onclick="deleteExpense('${e._id}')">
                        <i class="fas fa-trash"></i>
                    </button></td>
                </tr>`).join('')}
            </tbody></table>`;
    } catch (err) { console.error('Error loading expenses:', err); }
}

async function addExpense() {
    const desc   = document.getElementById('expDesc')?.value.trim();
    const amtIQD = parseFloat(document.getElementById('expAmountIQD')?.value) || 0;
    const rate   = getExchangeRate();
    const payment = document.getElementById('expPayment')?.value || 'cash_iqd';

    if (!desc) { alert(t('exp.descRequired')); return; }
    if (!amtIQD) { alert(t('exp.amountRequired')); return; }

    let amountIQD = 0, amountUSD = 0;
    if (payment === 'cash_usd') {
        amountUSD = amtIQD;
        amountIQD = Math.round(amtIQD * rate);
    } else {
        amountIQD = amtIQD;
        amountUSD = parseFloat((amtIQD / rate).toFixed(2));
    }

    const data = {
        description:   desc,
        category:      document.getElementById('expCategory')?.value || 'other',
        date:          document.getElementById('expDate')?.value || new Date().toISOString(),
        amountIQD,
        amountUSD,
        exchangeRate:  rate,
        paymentMethod: payment
    };

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('expDesc').value      = '';
            document.getElementById('expAmountIQD').value = '';
            document.getElementById('expUSDPreview').textContent = '= $0';
            loadExpenses();
        } else { const e = await res.json(); alert(e.message || t('exp.addFailed')); }
    } catch (err) { console.error(err); alert(t('exp.addFailed')); }
}

async function deleteExpense(id) {
    if (!confirm(t('exp.deleteConfirm'))) return;
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadExpenses();
    } catch (err) { console.error(err); }
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
                            <button class="btn btn-secondary btn-small" onclick="openAdminEditCar('${car._id}')">${t('admin.cars.edit')}</button>
                            <button class="btn btn-danger btn-small" onclick="deleteCar('${car._id}')">${t('admin.cars.delete')}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (error) { console.error('Error loading cars:', error); }
}

async function openAdminEditCar(carId) {
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE_URL}/cars/${carId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const car   = await res.json();

        document.getElementById('adminEditCarId').value          = car._id;
        document.getElementById('adminEditBrand').value          = car.brand        || '';
        document.getElementById('adminEditModel').value          = car.model        || '';
        document.getElementById('adminEditYear').value           = car.year         || '';
        document.getElementById('adminEditCostPrice').value      = car.costPrice    || '';
        document.getElementById('adminEditPrice').value          = car.price        || '';
        document.getElementById('adminEditMileage').value        = car.mileage      || '';
        document.getElementById('adminEditColor').value          = car.color        || '';
        document.getElementById('adminEditFuel').value           = car.fuel         || 'petrol';
        document.getElementById('adminEditTransmission').value   = car.transmission || 'automatic';
        document.getElementById('adminEditBodyType').value       = car.bodyType     || 'sedan';
        document.getElementById('adminEditCondition').value      = car.condition    || 'used';
        document.getElementById('adminEditStatus').value         = car.status       || 'available';
        document.getElementById('adminEditVin').value            = car.vin          || '';
        document.getElementById('adminEditDescription').value    = car.description  || '';

        document.getElementById('adminEditCarModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (err) { console.error('Error fetching car:', err); }
}

function closeAdminEditCar() {
    document.getElementById('adminEditCarModal').classList.add('hidden');
    document.body.style.overflow = '';
}

async function saveAdminEditCar() {
    const id = document.getElementById('adminEditCarId').value;
    const data = {
        brand:        document.getElementById('adminEditBrand').value,
        model:        document.getElementById('adminEditModel').value,
        year:         parseInt(document.getElementById('adminEditYear').value),
        costPrice:    parseFloat(document.getElementById('adminEditCostPrice').value) || 0,
        price:        parseFloat(document.getElementById('adminEditPrice').value),
        mileage:      parseInt(document.getElementById('adminEditMileage').value),
        color:        document.getElementById('adminEditColor').value,
        fuel:         document.getElementById('adminEditFuel').value,
        transmission: document.getElementById('adminEditTransmission').value,
        bodyType:     document.getElementById('adminEditBodyType').value,
        condition:    document.getElementById('adminEditCondition').value,
        status:       document.getElementById('adminEditStatus').value,
        vin:          document.getElementById('adminEditVin').value,
        description:  document.getElementById('adminEditDescription').value,
    };
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE_URL}/cars/${id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body:    JSON.stringify(data)
        });
        if (res.ok) {
            alert(t('inv.carUpdated'));
            closeAdminEditCar();
            loadAdminCars();
        } else {
            const err = await res.json();
            alert(err.message || t('inv.carUpdateFailed'));
        }
    } catch (err) { console.error(err); alert(t('inv.carUpdateFailed')); }
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
                            <button class="btn btn-secondary btn-small" onclick="openAdminEditUser('${user._id}','${user.name}','${user.email}','${user.phone||''}','${user.city||''}','${user.role}')">${t('admin.users.edit')}</button>
                            <button class="btn btn-danger btn-small" onclick="deleteUser('${user._id}')">${t('admin.users.delete')}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (error) { console.error('Error loading users:', error); }
}

function openAdminEditUser(id, name, email, phone, city, role) {
    document.getElementById('adminEditUserId').value    = id;
    document.getElementById('adminEditUserName').value  = name;
    document.getElementById('adminEditUserEmail').value = email;
    document.getElementById('adminEditUserPhone').value = phone;
    document.getElementById('adminEditUserCity').value  = city;
    document.getElementById('adminEditUserRole').value  = role;
    document.getElementById('adminEditUserModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAdminEditUser() {
    document.getElementById('adminEditUserModal').classList.add('hidden');
    document.body.style.overflow = '';
}

async function saveAdminEditUser() {
    const id = document.getElementById('adminEditUserId').value;
    const data = {
        name:  document.getElementById('adminEditUserName').value,
        phone: document.getElementById('adminEditUserPhone').value,
        city:  document.getElementById('adminEditUserCity').value,
        role:  document.getElementById('adminEditUserRole').value,
    };
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE_URL}/users/${id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body:    JSON.stringify(data)
        });
        if (res.ok) { alert(t('alert.profileSaved')); closeAdminEditUser(); loadAdminUsers(); }
        else { const e = await res.json(); alert(e.message || 'Failed to update user'); }
    } catch (err) { console.error(err); }
}

async function loadAdminSalesReports() {
    try {
        const token   = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [finRes, salesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/reports/financial`, { headers }),
            fetch(`${API_BASE_URL}/admin/reports/sales`,     { headers })
        ]);
        const fin   = await finRes.json();
        const sales = await salesRes.json();
        const profitColor = (fin.netProfit || 0) >= 0 ? 'green' : 'red';

        document.getElementById('salesReport').innerHTML = `
            <div class="report-summary">
                <div class="report-stat">
                    <div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info"><h3>${t('report.cashTotal')}</h3>
                        <p>$${(fin.cashRev||0).toLocaleString()}</p>
                        <small>${fin.cashCount||0} ${t('report.deals')}</small></div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon blue"><i class="fas fa-credit-card"></i></div>
                    <div class="stat-info"><h3>${t('report.installTotal')}</h3>
                        <p>$${(fin.instRev||0).toLocaleString()}</p>
                        <small>${fin.instCount||0} ${t('report.deals')}</small></div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon amber"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-info"><h3>${t('report.revenue')}</h3>
                        <p>$${(fin.totalRev||0).toLocaleString()}</p>
                        <small>${fin.totalSales||0} ${t('report.totalDeals')}</small></div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon orange"><i class="fas fa-car"></i></div>
                    <div class="stat-info"><h3>${t('report.totalCost')}</h3>
                        <p>$${(fin.totalCost||0).toLocaleString()}</p>
                        <small>${t('report.carsCost')}</small></div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon red"><i class="fas fa-receipt"></i></div>
                    <div class="stat-info"><h3>${t('report.expenses')}</h3>
                        <p>$${(fin.totalExp||0).toLocaleString()}</p>
                        <small>${t('report.expensesLabel')}</small></div>
                </div>
                <div class="report-stat">
                    <div class="stat-icon ${profitColor}"><i class="fas fa-chart-bar"></i></div>
                    <div class="stat-info"><h3>${t('report.netProfit')}</h3>
                        <p style="color:var(--${profitColor==='green'?'success':'danger'})">$${(fin.netProfit||0).toLocaleString()}</p>
                        <small>${fin.profitPct||0}%</small></div>
                </div>
            </div>
            ${Array.isArray(sales) && sales.length ? `
            <table>
                <thead><tr>
                    <th>${t('admin.sales.car')}</th><th>${t('admin.sales.buyer')}</th>
                    <th>${t('report.totalCost')}</th><th>${t('admin.sales.price')}</th>
                    <th>${t('report.netProfit')}</th><th>${t('admin.sales.date')}</th>
                    <th>${t('admin.sales.payment')}</th><th>${t('admin.sales.status')}</th>
                </tr></thead>
                <tbody>${sales.map(s => {
                    const cost = s.car?.costPrice || 0;
                    const profit = (s.salePrice||0) - cost;
                    const pct = cost > 0 ? ((profit/cost)*100).toFixed(0)+'%' : '';
                    return `<tr>
                        <td><strong>${s.car?.brand||''} ${s.car?.model||''}</strong></td>
                        <td>${s.buyer?.name||'–'}</td>
                        <td>$${cost.toLocaleString()}</td>
                        <td><strong>$${(s.salePrice||0).toLocaleString()}</strong></td>
                        <td style="color:var(--${profit>=0?'success':'danger'})"><strong>$${profit.toLocaleString()} ${pct}</strong></td>
                        <td>${new Date(s.saleDate).toLocaleDateString()}</td>
                        <td>${s.paymentMethod||'–'}</td>
                        <td>${statusBadge(s.status)}</td>
                    </tr>`;}).join('')}
                </tbody></table>` : '<p style="color:var(--text-muted);padding:20px">–</p>'}`;
    } catch (error) { console.error('Error loading sales reports:', error); }
}

function initExpenseDate() {
    const el = document.getElementById('expDate');
    if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
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
