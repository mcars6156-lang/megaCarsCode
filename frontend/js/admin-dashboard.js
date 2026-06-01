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
        'dashboard':  t('admin.section.dashboard'),
        'cars':       t('admin.section.cars'),
        'users':      t('admin.section.users'),
        'sales':      t('admin.section.sales'),
        'expenses':   t('admin.menu.expenses'),
        'calculator': t('calc.title'),
        'contracts':  t('contract.title'),
        'reports':    t('reports.title'),
        'settings':   t('admin.section.settings')
    };
    document.getElementById('adminPageTitle').textContent = titles[sectionId] || t('admin.section.dashboard');

    if (sectionId === 'dashboard')  loadAdminDashboard();
    if (sectionId === 'cars')       loadAdminCars();
    if (sectionId === 'users')      loadAdminUsers();
    if (sectionId === 'sales')      loadAdminSalesReports();
    if (sectionId === 'expenses')   { loadExpenses(); initExpenseDate(); }
    if (sectionId === 'contracts')  initContractDefaults();
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
        _expensesData = Array.isArray(expenses) ? expenses : [];

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

// Rebuilds <select> options with translated text — fixes macOS native dropdown caching
function buildSelectOptions(selectId, opts) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = opts.map(([val, key]) => `<option value="${val}">${t(key)}</option>`).join('');
    if (current) sel.value = current;
}

const FUEL_OPTS  = [['petrol','dyn.fuel.petrol'],['diesel','dyn.fuel.diesel'],['hybrid','dyn.fuel.hybrid'],['electric','dyn.fuel.electric']];
const TRANS_OPTS = [['automatic','dyn.trans.automatic'],['manual','dyn.trans.manual']];
const BODY_OPTS  = [['sedan','dyn.body.sedan'],['suv','dyn.body.suv'],['hatchback','dyn.body.hatchback'],['coupe','dyn.body.coupe'],['pickup','dyn.body.pickup'],['van','dyn.body.van']];
const COND_OPTS  = [['used','dyn.cond.used'],['new','dyn.cond.new'],['certified','dyn.cond.certified']];
const STAT_OPTS  = [['available','dyn.available'],['sold','dyn.status.sold'],['pending','dyn.status.pending'],['in-service','dyn.status.inservice']];
const ROLE_OPTS  = [['user','dyn.role.user'],['admin','dyn.role.admin']];

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
        document.getElementById('adminEditVin').value            = car.vin          || '';
        document.getElementById('adminEditDescription').value    = car.description  || '';

        // Rebuild options with current language, then set values
        buildSelectOptions('adminEditFuel',         FUEL_OPTS);
        buildSelectOptions('adminEditTransmission',  TRANS_OPTS);
        buildSelectOptions('adminEditBodyType',       BODY_OPTS);
        buildSelectOptions('adminEditCondition',      COND_OPTS);
        buildSelectOptions('adminEditStatus',         STAT_OPTS);

        // Re-set values after rebuilding options
        document.getElementById('adminEditFuel').value          = car.fuel         || 'petrol';
        document.getElementById('adminEditTransmission').value  = car.transmission || 'automatic';
        document.getElementById('adminEditBodyType').value      = car.bodyType     || 'sedan';
        document.getElementById('adminEditCondition').value     = car.condition    || 'used';
        document.getElementById('adminEditStatus').value        = car.status       || 'available';

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
    buildSelectOptions('adminEditUserRole', ROLE_OPTS);
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
        _salesData = Array.isArray(sales) ? sales : [];
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

// ── Installment Calculator ────────────────────────────────

function calculateInstallments() {
    const cost    = parseFloat(document.getElementById('calcCostPrice')?.value)  || 0;
    const down    = parseFloat(document.getElementById('calcDownPayment')?.value) || 0;
    const monthly = parseFloat(document.getElementById('calcMonthly')?.value)     || 0;
    const el      = document.getElementById('calcResult');
    if (!el) return;
    if (!cost || !down || !monthly || down >= cost) {
        el.innerHTML = `<p style="color:var(--text-muted);padding:16px 0">${t('calc.hint')}</p>`;
        return;
    }

    // Excel formula:
    // الباقي من فلوسي = سعر الشراء - مقدمة
    // الباقي = كل شهر × كم شهر
    // سعر البيع = مقدمة + الباقي
    // الأرباح = سعر البيع - سعر الشراء
    // نسبة الأرباح % = الأرباح / الباقي من فلوسي × 100
    const dealerRemaining = cost - down;
    const monthOptions = [6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
    const th = (txt, yellow) => `<th style="padding:9px 12px;background:${yellow?'#fbbf24':'var(--page-bg)'};border-bottom:2px solid var(--border);text-align:center;font-size:12px">${txt}</th>`;
    const td = (txt, bold, color) => `<td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:center;${bold?'font-weight:bold':''}${color?';color:'+color:''}">${txt}</td>`;

    el.innerHTML = `
        <div style="margin-top:12px;padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:13px;display:flex;gap:24px;flex-wrap:wrap">
            <span><strong data-i18n="calc.costPrice">سعر الشراء:</strong> $${cost.toLocaleString()}</span>
            <span><strong data-i18n="calc.downPayment">المقدمة:</strong> $${down.toLocaleString()}</span>
            <span><strong>الباقي من فلوسي:</strong> $${dealerRemaining.toLocaleString()}</span>
            <span><strong data-i18n="calc.monthly">كل شهر:</strong> $${monthly.toLocaleString()}</span>
        </div>
        <div style="overflow-x:auto;margin-top:12px">
        <table style="width:100%;border-collapse:collapse">
            <thead><tr>
                ${th('كم شهر',false)}
                ${th('الباقي من فلوسي',false)}
                ${th('الباقي',false)}
                ${th('سعر البيع',false)}
                ${th('الأرباح',false)}
                ${th('نسبة الأرباح %',true)}
            </tr></thead>
            <tbody>${monthOptions.map((months, i) => {
                const installTotal = monthly * months;           // الباقي
                const salePrice    = down + installTotal;        // سعر البيع
                const profit       = salePrice - cost;           // الأرباح
                const profitPct    = ((profit / dealerRemaining) * 100).toFixed(2); // نسبة الأرباح %
                const isGood       = parseFloat(profitPct) >= 40;
                const bg           = i%2===0 ? 'var(--card-bg)' : 'var(--bg-secondary)';
                return `<tr style="background:${bg}">
                    ${td(months, true)}
                    ${td('$'+dealerRemaining.toLocaleString(), false)}
                    ${td('$'+installTotal.toLocaleString(), false)}
                    ${td('$'+salePrice.toLocaleString(), true)}
                    ${td('$'+profit.toLocaleString(), true, profit>0?'var(--success)':'var(--danger)')}
                    ${td(profitPct+'%', true, isGood?'var(--success)':'var(--warning)')}
                </tr>`;
            }).join('')}</tbody>
        </table></div>`;
}

// ── Sale Contract ─────────────────────────────────────────

function initContractDefaults() {
    const today = new Date().toISOString().split('T')[0];
    const cd = document.getElementById('contractDate');
    if (cd && !cd.value) cd.value = today;
    const fd = new Date(); fd.setMonth(fd.getMonth() + 1); fd.setDate(1);
    const cf = document.getElementById('contractFirstDate');
    if (cf && !cf.value) cf.value = fd.toISOString().split('T')[0];
    if (currentAdmin) {
        const sn = document.getElementById('sellerName'); if (sn && !sn.value) sn.value = currentAdmin.name || '';
        const sp = document.getElementById('sellerPhone'); if (sp && !sp.value) sp.value = currentAdmin.phone || '';
    }
    loadContractCars();
}

function updateContractRemaining() {
    const total = parseFloat(document.getElementById('contractTotal')?.value) || 0;
    const down  = parseFloat(document.getElementById('contractDown')?.value)  || 0;
    const rem   = total - down;
    const el    = document.getElementById('contractRemaining');
    if (el) el.value = rem > 0 ? rem : '';
    updateContractMonths();
}

function updateContractMonths() {
    const rem     = parseFloat(document.getElementById('contractRemaining')?.value) || 0;
    const monthly = parseFloat(document.getElementById('contractMonthly')?.value)   || 0;
    const el      = document.getElementById('contractMonths');
    if (el && rem && monthly) el.value = Math.ceil(rem / monthly);
}

function printContract() {
    const g  = id => document.getElementById(id)?.value || '';
    const fd = d  => d ? new Date(d).toLocaleDateString('ar-IQ') : '............';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>عقد رقم ${g('contractNo')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;margin:0;padding:12px;direction:rtl;font-size:12px}
  .page{max-width:800px;margin:0 auto;border:2px solid #333;padding:16px}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #333;padding-bottom:10px;margin-bottom:8px}
  .hdr-side{font-size:11px;line-height:1.9}
  .hdr-center{text-align:center}
  .hdr-center img{width:60px;height:60px;object-fit:contain;border-radius:50%}
  .meta-row{display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:6px}
  .ct{text-align:center;font-size:17px;font-weight:bold;border:2px solid #333;padding:6px;margin:8px 0;background:#f5f5f5}
  table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #bbb;padding:4px 7px;font-size:11.5px}
  .sec{background:#222;color:#fff;font-weight:bold;padding:5px 10px;margin:8px 0 0;font-size:12px}
  .party-tbl td{border:1px solid #bbb;padding:4px 8px}
  .lbl{background:#f0f0f0;font-weight:bold;width:38%}
  .car-num{background:#fff3cd;font-weight:bold;text-align:center;width:28px}
  .terms{border:1px solid #bbb;padding:8px;font-size:11px;margin-top:0}
  .terms ol{margin:0;padding-right:16px}
  .terms li{margin-bottom:3px}
  .sigs{display:flex;justify-content:space-between;margin-top:28px}
  .sig{text-align:center;width:30%}
  .sig-line{border-top:1px solid #333;padding-top:4px;margin-top:45px;font-size:11px}
  .pbtn{text-align:center;margin-bottom:12px}
  .pbtn button{padding:10px 28px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}
  @media print{.pbtn{display:none}}
</style>
</head><body>
<div class="pbtn"><button onclick="window.print()">🖨️ طباعة / Print</button></div>
<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-side">
      <strong>Mega Cars Show</strong><br>
      For All Types of Cars Trading<br>
      📞 0751 121 1511<br>📞 0774 088 6657
    </div>
    <div class="hdr-center">
      <img src="/images/logo-small.png" alt=""><br>
      <strong style="font-size:13px">Mega Cars</strong><br>
      <span style="font-size:10px">لبيع وشراء السيارات</span>
    </div>
    <div class="hdr-side" style="text-align:right">
      <strong>پیشانگەها — معرض ميگا كارس</strong><br>
      دهوك - ترمينال همى جورين ترومبيلا<br>
      معرض رقم 27
    </div>
  </div>

  <div class="meta-row">
    <span>No. <strong>${g('contractNo')||'----'}</strong></span>
    <span>ميژوو / تاريخ العقد: <strong>${fd(g('contractDate'))}</strong></span>
  </div>

  <div class="ct">عقد بيع وشراء سيارة — گرێبەستی فرۆشتنی ئۆتۆمبێل</div>

  <!-- Parties -->
  <div class="sec">بيانات المتعاقدين — زانیاری لایەکان</div>
  <table class="party-tbl">
    <tr>
      <td style="width:50%;vertical-align:top">
        <table style="width:100%;border-collapse:collapse">
          <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center;padding:4px">الطرف الأول — البائع / فرۆشەر</td></tr>
          <tr><td class="lbl">ناف ونیشان / الاسم:</td><td>${g('sellerName')}</td></tr>
          <tr><td class="lbl">رقم الهوية:</td><td>${g('sellerId')}</td></tr>
          <tr><td class="lbl">المهنة | ت.إصدار:</td><td>${g('sellerOcc')}${g('sellerIdDate') ? ' | ' + fd(g('sellerIdDate')) : ''}</td></tr>
          <tr><td class="lbl">موبایل / الهاتف:</td><td>${g('sellerPhone')}</td></tr>
          <tr><td class="lbl">مسکن / السكن:</td><td>${g('sellerCity')}</td></tr>
        </table>
      </td>
      <td style="width:50%;vertical-align:top">
        <table style="width:100%;border-collapse:collapse">
          <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center;padding:4px">الطرف الثاني — المشتري / کڕیار</td></tr>
          <tr><td class="lbl">ناف ونیشان / الاسم:</td><td>${g('buyerName')}</td></tr>
          <tr><td class="lbl">رقم الهوية:</td><td>${g('buyerId')}</td></tr>
          <tr><td class="lbl">المهنة | ت.إصدار:</td><td>${g('buyerOcc')}${g('buyerIdDate') ? ' | ' + fd(g('buyerIdDate')) : ''}</td></tr>
          <tr><td class="lbl">موبایل 1:</td><td>${g('buyerPhone')}</td></tr>
          ${g('buyerPhone2') ? `<tr><td class="lbl">موبایل 2:</td><td>${g('buyerPhone2')}</td></tr>` : ''}
          <tr><td class="lbl">مسکن / السكن:</td><td>${g('buyerCity')}</td></tr>
        </table>
      </td>
    </tr>
    ${g('insuranceOwner') ? `<tr><td colspan="2"><strong>سەنەوەی بناڤق / اسم صاحب السنوية:</strong> ${g('insuranceOwner')}</td></tr>` : ''}
  </table>

  <!-- Car Details — Numbered like physical contract -->
  <div class="sec">فرۆت لایی نیگی — بيانات السيارة والمبالغ</div>
  <table>
    <tr>
      <td class="car-num">1</td>
      <td><strong>ژمارا ترومیبل / رقم السيارة:</strong> ${g('contractPlate')}</td>
      <td class="car-num">2</td>
      <td><strong>جورى ترومیبل / نوع السيارة:</strong> ${g('contractBrand')}</td>
    </tr>
    <tr>
      <td class="car-num">3</td>
      <td><strong>مودیلا ترومیبل / الموديل:</strong> ${g('contractYear')}</td>
      <td class="car-num">4</td>
      <td><strong>رنگن ترومیبل / اللون:</strong> ${g('contractColor')}</td>
    </tr>
    <tr>
      <td class="car-num">5</td>
      <td><strong>نمرا شاصی / رقم الشاصي:</strong> ${g('contractVin')}</td>
      <td class="car-num">6</td>
      <td><strong>نمرا ماكينة / رقم المحرك:</strong> ${g('contractEngineNo')}</td>
    </tr>
  </table>

  <!-- Financial -->
  <table style="margin-top:4px">
    <tr>
      <td><strong>كوژمه ديبيتە / المبلغ الكلي:</strong> <strong>$${Number(g('contractTotal')).toLocaleString()}</strong></td>
      <td><strong>بن كەهشتى / الواصل (المقدمة):</strong> <strong>$${Number(g('contractDown')).toLocaleString()}</strong></td>
      <td><strong>بن ماین / المتبقي:</strong> <strong>$${Number(g('contractRemaining')).toLocaleString()}</strong></td>
    </tr>
  </table>

  ${(g('witnessName') || g('guarantorName')) ? `
  <table style="margin-top:4px">
    <tr>
      <td><strong>الشاهد:</strong> ${g('witnessName')} &nbsp; ${g('witnessPhone')}</td>
      <td><strong>الكفيل:</strong> ${g('guarantorName')} &nbsp; ${g('guarantorPhone')}</td>
    </tr>
  </table>` : ''}

  <!-- Terms — Dynamic with actual values -->
  <div class="sec">الشروط والملاحظات — تبیبین (ملاحظات)</div>
  <div class="terms"><ol>
    <li>يتم دفع مقدمة العقد بالدولار عند توقيع الاتفاق.</li>
    <li>يتم تسديد المبلغ المتبقي على شكل أقساط شهرية مقدار كل قسط <strong>(${g('contractMonthly') || '...'}) دولار أمريكي</strong>، على أن يبدأ سداد أول قسط بتاريخ <strong>${fd(g('contractFirstDate'))}</strong>، ويكون موعد دفع الأقساط من اليوم الأول إلى اليوم الخامس من كل شهر حصراً وبدون أي إحراج أو عذر وشكراً.</li>
    <li>لا يحق للمشتري بيع أو التنازل عن السيارة إلا بعد تسديد كامل المبلغ المتفق عليه.</li>
    <li>يتم منح وكالة قيادة للمشتري لاستخدام السيارة لحين إتمام السداد.</li>
    <li>المعرض غير مسؤول عن عدم تحويل ملكية السيارة بعد مرور شهر من تاريخ العقد.</li>
    <li>البائع مسؤول عن الغرامات والحجوزات من تاريخ العقد.</li>
    <li>السيارة بعد الترائي والفحص الميكانيكي والهيكلي فحم وفهم.</li>
    <li>لا يجوز استيفاء أي أتعاب أو رسوم إضافية عند نقل الملكية بعد إتمام السداد الكامل.</li>
    ${g('contractNotes') ? `<li>${g('contractNotes')}</li>` : ''}
  </ol></div>

  <!-- 3 Signatures matching physical contract -->
  <div class="sigs">
    <div class="sig"><div class="sig-line">المشتري<br>کڕیار</div></div>
    <div class="sig"><div class="sig-line">ريڤبەری (المدير)<br>الإدارة</div></div>
    <div class="sig"><div class="sig-line">البائع<br>فرۆشەر</div></div>
  </div>

</div></body></html>`;
    const w = window.open('', '_blank', 'width=900,height=800,scrollbars=yes');
    w.document.write(html);
    w.document.close();
}

// ── CSV Export ────────────────────────────────────────────

let _salesData    = [];
let _expensesData = [];

function exportToCSV(rows, filename) {
    const csv  = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function exportSalesCSV() {
    if (!_salesData.length) { alert('No sales data to export. Open Sales Reports first.'); return; }
    const headers = ['Car', 'Buyer', 'Cost Price ($)', 'Sale Price ($)', 'Profit ($)', 'Profit %', 'Date', 'Payment', 'Status'];
    const rows = _salesData.map(s => {
        const cost   = s.car?.costPrice || 0;
        const profit = (s.salePrice || 0) - cost;
        const pct    = cost > 0 ? ((profit / cost) * 100).toFixed(1) + '%' : '';
        return [
            `${s.car?.brand || ''} ${s.car?.model || ''}`.trim(),
            s.buyer?.name || '',
            cost,
            s.salePrice || 0,
            profit,
            pct,
            new Date(s.saleDate).toLocaleDateString(),
            s.paymentMethod || '',
            s.status || ''
        ];
    });
    exportToCSV([headers, ...rows], `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
}

function exportExpensesCSV() {
    if (!_expensesData.length) { alert('No expenses to export. Open Expenses first.'); return; }
    const headers = ['Date', 'Description', 'Category', 'Amount IQD', 'Amount USD', 'Exchange Rate', 'Payment Method'];
    const rows = _expensesData.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.description || '',
        e.category    || '',
        e.amountIQD   || 0,
        e.amountUSD   || 0,
        e.exchangeRate || 1490,
        e.paymentMethod || ''
    ]);
    exportToCSV([headers, ...rows], `expenses-${new Date().toISOString().split('T')[0]}.csv`);
}

// ── Contract car picker ───────────────────────────────────

async function loadContractCars() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch(`${API_BASE_URL}/cars`, { headers: { 'Authorization': `Bearer ${token}` } });
        const cars = await res.json();
        const sel  = document.getElementById('contractCarSelect');
        if (!sel || !Array.isArray(cars)) return;
        sel.innerHTML = `<option value="">${t('contract.pickCar')}</option>` +
            cars.map(c => `<option value="${c._id}">${c.brand} ${c.model} ${c.year}  –  $${c.price.toLocaleString()}  [${c.status}]</option>`).join('');
    } catch (e) { console.error(e); }
}

async function fillContractFromCar(carId) {
    if (!carId) return;
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch(`${API_BASE_URL}/cars/${carId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const car  = await res.json();

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('contractBrand',   car.brand);
        set('contractYear',    `${car.year} ${car.model}`);
        set('contractColor',   car.color);
        set('contractVin',     car.vin);
        set('contractPlate',   car.plateNumber);
        set('contractTotal',   car.price);
        updateContractRemaining();
    } catch (e) { console.error(e); }
}

// ── Payment Schedule (matches Excel installment template) ─

function printPaymentSchedule() {
    const g  = id => document.getElementById(id)?.value || '';
    const down    = parseFloat(g('contractDown'))    || 0;
    const monthly = parseFloat(g('contractMonthly')) || 0;
    const months  = parseInt(g('contractMonths'))    || 0;
    const firstDateStr = g('contractFirstDate');

    if (!down || !monthly || !months || !firstDateStr) {
        alert('Please fill: down payment, monthly amount, number of months, and first payment date');
        return;
    }

    const firstDate = new Date(firstDateStr);
    const rows = [];
    for (let i = 0; i < months; i++) {
        const d = new Date(firstDate);
        d.setMonth(d.getMonth() + i);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        rows.push({ num: i + 1, amount: monthly, date: `${dd}/${mm}/${yyyy}` });
    }
    const total = monthly * months;

    // Color groups like Excel (cyan/green/blue/orange every ~7 rows)
    const rowColor = i => {
        if (i < 7)  return '#7dd3fc';   // cyan
        if (i < 15) return '#bbf7d0';   // green
        if (i < 31) return '#bfdbfe';   // blue
        return '#fed7aa';                // orange
    };

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>جدول الأقساط - عقد ${g('contractNo')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;margin:0;padding:15px;direction:rtl;font-size:13px;background:#fff}
  .page{max-width:900px;margin:0 auto}
  .hdr{display:flex;justify-content:space-between;align-items:center;border:2px solid #333;padding:10px;margin-bottom:12px;border-radius:6px}
  .hdr-side{font-size:11px;line-height:1.8}
  .hdr-center{text-align:center}
  .hdr-center img{width:55px;height:55px;object-fit:contain;border-radius:50%}
  .contract-info{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;font-weight:bold}
  .layout{display:flex;gap:14px;align-items:flex-start}
  .schedule{flex:0 0 340px}
  .terms{flex:1;font-size:11.5px;line-height:1.7}
  table.sched{width:100%;border-collapse:collapse}
  table.sched th,table.sched td{border:1px solid #333;padding:4px 8px;text-align:center;font-size:12px}
  table.sched thead th{background:#fde047;font-weight:bold;font-size:13px}
  .down-row td{background:#fde047;font-weight:bold}
  .total-row td{background:#fcd34d;font-weight:bold;font-size:14px}
  .terms-box{border:1px solid #999;padding:10px;border-radius:4px}
  .terms-box ol{margin:0;padding-right:18px}
  .terms-box li{margin-bottom:5px}
  .terms-title{background:#fbbf24;border:1px solid #999;padding:5px 10px;font-weight:bold;text-align:center;margin-bottom:8px;border-radius:4px}
  .pbtn{text-align:center;margin-bottom:15px}
  .pbtn button{padding:10px 30px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px}
  @media print{.pbtn{display:none}}
</style>
</head><body>
<div class="pbtn"><button onclick="window.print()">🖨️ طباعة / Print Schedule</button></div>
<div class="page">
  <div class="hdr">
    <div class="hdr-side">
      <strong>Mega Cars Show</strong><br>
      For All Types of Cars Trading<br>
      📞 0751 121 1511 / 0774 088 6657
    </div>
    <div class="hdr-center">
      <img src="/images/logo-small.png" alt=""><br>
      <strong>Mega Cars</strong><br>
      <span style="font-size:10px">لبيع وشراء السيارات</span>
    </div>
    <div class="hdr-side" style="text-align:right">
      <strong>معرض ميگا كارس</strong><br>
      دهوك - ترمينال معرض رقم 27
    </div>
  </div>

  <div class="contract-info">
    <span>اسم المشتري: <strong>${g('buyerName')}</strong></span>
    <span>السيارة: <strong>${g('contractBrand')} ${g('contractYear')}</strong></span>
    <span>عقد رقم: <strong>${g('contractNo') || '----'}</strong></span>
  </div>

  <div class="layout">
    <div class="schedule">
      <table class="sched">
        <thead><tr>
          <th>ت</th>
          <th>${down.toLocaleString()}</th>
          <th>مقدمة</th>
        </tr></thead>
        <tbody>
          ${rows.map((r,i) => `
            <tr style="background:${rowColor(i)}">
              <td>${r.num}</td>
              <td>${r.amount.toLocaleString()}</td>
              <td>${r.date}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td>${(down + total).toLocaleString()}</td>
            <td colspan="2">المجموع دولار</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="terms">
      <div class="terms-title">عقد بيع سيارة بالتقسيط</div>
      <div class="terms-box">
        <ol>
          <li>يتم دفع مقدمة العقد بالدولار عند توقيع الاتفاق.</li>
          <li>يتم تسديد باقي المبلغ على شكل أقساط شهرية بالدولار حسب الاتفاق بين الطرفين.</li>
          <li>ينظم هذا العقد من قبل المعرض ويكون موثقاً بين البائع والمشتري.</li>
          <li>يتم تسليم وصل أمانة من قبل المشتري لصالح المعرض كضمان.</li>
          <li>يلتزم المعرض بإعطاء وصل قبض شهري للمشتري عند كل دفعة.</li>
          <li>يتم منح وكالة قيادة للمشتري لاستخدام السيارة لحين إتمام السداد.</li>
          <li>لا يحق للمشتري بيع أو التنازل عن السيارة إلا بعد تسديد كامل المبلغ المتفق عليه.</li>
          <li>لا يجوز استيفاء أي أتعاب أو رسوم إضافية عند نقل ملكية السيارة بعد إتمام السداد الكامل.</li>
          <li>يدفع (المشتري) مبلغ (100) دولار للمعرض عند توقيع العقد + $100 أتعاب الناشر.</li>
          <li>جواز سفر يبقة بالمعرض 6 اشهر (السيارة مرقم دهوك كامل).</li>
          <li>يتم تسديد المبلغ المتبقي على شكل أقساط شهرية مقدار كل قسط <strong>(${monthly}) دولار</strong>.</li>
          <li>على أن يبدأ سداد أول قسط بتاريخ <strong>${rows[0]?.date}</strong>.</li>
          <li>ويكون موعد دفع الأقساط من اليوم الأول إلى اليوم الخامس من كل شهر حصراً.</li>
          ${g('contractNotes') ? `<li>${g('contractNotes')}</li>` : ''}
        </ol>
      </div>
    </div>
  </div>
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    w.document.write(html);
    w.document.close();
}

// ── Customization / Settings ─────────────────────────────

const THEME_PRESETS = {
    default: { primary:'#3b82f6', sidebar:'#1e293b', success:'#10b981', danger:'#ef4444', warning:'#f59e0b', pageBg:'#f1f5f9' },
    emerald: { primary:'#10b981', sidebar:'#064e3b', success:'#22c55e', danger:'#dc2626', warning:'#f59e0b', pageBg:'#ecfdf5' },
    crimson: { primary:'#dc2626', sidebar:'#450a0a', success:'#16a34a', danger:'#991b1b', warning:'#ea580c', pageBg:'#fef2f2' },
    gold:    { primary:'#eab308', sidebar:'#422006', success:'#16a34a', danger:'#dc2626', warning:'#f59e0b', pageBg:'#fefce8' },
    purple:  { primary:'#8b5cf6', sidebar:'#2e1065', success:'#10b981', danger:'#ef4444', warning:'#f59e0b', pageBg:'#faf5ff' },
    dark:    { primary:'#60a5fa', sidebar:'#0f172a', success:'#10b981', danger:'#ef4444', warning:'#f59e0b', pageBg:'#1e293b' },
};

function showSettingsTab(name, e) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.add('hidden'));
    e?.currentTarget?.classList.add('active');
    const map = { company:'settingsCompany', appearance:'settingsAppearance', typography:'settingsTypography', layout:'settingsLayout', finance:'settingsFinance' };
    document.getElementById(map[name])?.classList.remove('hidden');
}

function applyThemePreset(name) {
    const t = THEME_PRESETS[name]; if (!t) return;
    document.getElementById('setPrimaryColor').value = t.primary;
    document.getElementById('setSidebarColor').value = t.sidebar;
    document.getElementById('setSuccessColor').value = t.success;
    document.getElementById('setDangerColor').value  = t.danger;
    document.getElementById('setWarningColor').value = t.warning;
    document.getElementById('setPageBg').value       = t.pageBg;
    applyCustomization();
}

function applyCustomization() {
    const root = document.documentElement.style;
    const get = (id, fallback) => document.getElementById(id)?.value || fallback;

    // Colors
    root.setProperty('--primary',    get('setPrimaryColor', '#3b82f6'));
    root.setProperty('--sidebar-bg', get('setSidebarColor', '#1e293b'));
    root.setProperty('--success',    get('setSuccessColor', '#10b981'));
    root.setProperty('--danger',     get('setDangerColor',  '#ef4444'));
    root.setProperty('--warning',    get('setWarningColor', '#f59e0b'));
    root.setProperty('--page-bg',    get('setPageBg',       '#f1f5f9'));

    // Typography
    const fontSize    = get('setFontSize',    '14');
    const fontFamily  = get('setFontFamily',  'Arial, sans-serif');
    const fontWeight  = get('setFontWeight',  '400');
    const headingSize = get('setHeadingSize', '18');
    document.body.style.fontSize   = fontSize + 'px';
    document.body.style.fontFamily = fontFamily;
    document.body.style.fontWeight = fontWeight;
    root.setProperty('--heading-size', headingSize + 'px');
    document.querySelectorAll('h1,h2,h3,h4,h5').forEach(h => h.style.fontSize = headingSize + 'px');

    // Layout
    root.setProperty('--sidebar-w', get('setSidebarWidth', '260') + 'px');
    root.setProperty('--radius',    get('setRadius', '12') + 'px');
    root.setProperty('--radius-sm', Math.max(0, parseInt(get('setRadius','12'))-4) + 'px');

    // Shadow
    const shadowMap = {
        none:   ['none','none'],
        light:  ['0 1px 2px rgba(0,0,0,.04)','0 2px 8px rgba(0,0,0,.04)'],
        medium: ['0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)','0 4px 6px rgba(0,0,0,.07), 0 10px 30px rgba(0,0,0,.12)'],
        strong: ['0 4px 10px rgba(0,0,0,.15)','0 12px 40px rgba(0,0,0,.25)']
    };
    const [sh, shLg] = shadowMap[get('setShadow','medium')] || shadowMap.medium;
    root.setProperty('--shadow', sh);
    root.setProperty('--shadow-lg', shLg);

    // Density (paddings)
    const densityMap = { compact: '8px 12px', comfortable: '12px 18px', spacious: '18px 24px' };
    root.setProperty('--density-padding', densityMap[get('setDensity','comfortable')] || densityMap.comfortable);
}

function saveAllSettings() {
    const ids = ['setPrimaryColor','setSidebarColor','setSuccessColor','setDangerColor','setWarningColor','setPageBg',
                 'setFontSize','setFontFamily','setFontWeight','setHeadingSize',
                 'setSidebarWidth','setRadius','setShadow','setDensity',
                 'setCompanyName','setCompanyLocation','setCompanyPhone1','setCompanyPhone2','setCompanyEmail','setCompanyTaxId',
                 'setDefaultExchangeRate','setDefaultCurrency','setContractFee','setPublisherFee','setDateFormat'];
    const settings = {};
    ids.forEach(id => { const el = document.getElementById(id); if (el) settings[id] = el.value; });
    localStorage.setItem('megaCarsSettings', JSON.stringify(settings));
    applyCustomization();
    alert(t('alert.settingsSaved'));
}

function loadSavedSettings() {
    const raw = localStorage.getItem('megaCarsSettings');
    if (!raw) { applyCustomization(); return; }
    try {
        const settings = JSON.parse(raw);
        Object.entries(settings).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
        // Update visible range labels
        ['fontSize','headingSize','sidebarWidth','radius'].forEach(name => {
            const id = 'set' + name.charAt(0).toUpperCase() + name.slice(1);
            const labelId = name + 'Label';
            const el = document.getElementById(id);
            const label = document.getElementById(labelId);
            if (el && label) label.textContent = el.value;
        });
        applyCustomization();
    } catch (e) { console.error('Failed to load settings:', e); }
}

function resetCustomization() {
    if (!confirm('Reset all customizations to default?')) return;
    localStorage.removeItem('megaCarsSettings');
    location.reload();
}

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', loadSavedSettings);

// ── Reports Center ────────────────────────────────────────

function clearReportFilter() {
    document.getElementById('reportDateFrom').value = '';
    document.getElementById('reportDateTo').value = '';
}

function getDateRange() {
    return {
        from: document.getElementById('reportDateFrom')?.value || '',
        to:   document.getElementById('reportDateTo')?.value   || ''
    };
}

function withinRange(dateStr, range) {
    if (!range.from && !range.to) return true;
    const d = new Date(dateStr).getTime();
    if (range.from && d < new Date(range.from).getTime()) return false;
    if (range.to   && d > new Date(range.to).getTime() + 86400000) return false;
    return true;
}

async function fetchAllCars() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/cars`, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
}
async function fetchAllSales() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/admin/reports/sales`, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
}
async function fetchAllExpenses() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/expenses`, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
}
async function fetchAllUsers() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
}

// ── Inventory Report ──

async function viewInventoryReport() {
    const cars = await fetchAllCars();
    const totalCost  = cars.reduce((s, c) => s + (c.costPrice || 0), 0);
    const totalValue = cars.reduce((s, c) => s + (c.price || 0), 0);
    const available  = cars.filter(c => c.status === 'available').length;
    const sold       = cars.filter(c => c.status === 'sold').length;

    document.getElementById('reportViewer').classList.remove('hidden');
    document.getElementById('reportViewer').innerHTML = `
        <h3 class="report-section-title">${t('reports.inventory')}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="stat-icon blue"><i class="fas fa-car"></i></div><div class="stat-info"><h3>${t('admin.stat.cars')}</h3><p>${cars.length}</p></div></div>
            <div class="report-stat"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-info"><h3>${t('dyn.available')}</h3><p>${available}</p></div></div>
            <div class="report-stat"><div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div><div class="stat-info"><h3>${t('dyn.status.sold')}</h3><p>${sold}</p></div></div>
            <div class="report-stat"><div class="stat-icon amber"><i class="fas fa-dollar-sign"></i></div><div class="stat-info"><h3>${t('report.totalCost')}</h3><p>$${totalCost.toLocaleString()}</p></div></div>
            <div class="report-stat"><div class="stat-icon red"><i class="fas fa-tag"></i></div><div class="stat-info"><h3>${t('report.revenue')}</h3><p>$${totalValue.toLocaleString()}</p></div></div>
        </div>
        <table><thead><tr>
            <th>${t('admin.cars.brand')}</th><th>${t('admin.cars.model')}</th><th>${t('admin.cars.year')}</th>
            <th>${t('report.totalCost')}</th><th>${t('admin.cars.price')}</th>
            <th>${t('report.netProfit')}</th><th>${t('admin.cars.status')}</th>
        </tr></thead><tbody>${cars.map(c => {
            const profit = (c.price || 0) - (c.costPrice || 0);
            return `<tr>
                <td><strong>${c.brand}</strong></td><td>${c.model}</td><td>${c.year}</td>
                <td>$${(c.costPrice||0).toLocaleString()}</td>
                <td><strong>$${(c.price||0).toLocaleString()}</strong></td>
                <td style="color:var(--${profit>=0?'success':'danger'})"><strong>$${profit.toLocaleString()}</strong></td>
                <td>${statusBadge(c.status)}</td>
            </tr>`;
        }).join('')}</tbody></table>`;
}

async function printInventoryReport() {
    const cars = await fetchAllCars();
    const totalCost  = cars.reduce((s, c) => s + (c.costPrice || 0), 0);
    const totalValue = cars.reduce((s, c) => s + (c.price || 0), 0);
    openPrintWindow('Inventory Report — تقرير المخزون', `
        <div class="kpi-row">
            <div class="kpi"><strong>${cars.length}</strong><span>Total Cars</span></div>
            <div class="kpi"><strong>${cars.filter(c=>c.status==='available').length}</strong><span>Available</span></div>
            <div class="kpi"><strong>${cars.filter(c=>c.status==='sold').length}</strong><span>Sold</span></div>
            <div class="kpi"><strong>$${totalCost.toLocaleString()}</strong><span>Total Cost</span></div>
            <div class="kpi"><strong>$${totalValue.toLocaleString()}</strong><span>Total Value</span></div>
        </div>
        <table>
            <thead><tr><th>#</th><th>Brand</th><th>Model</th><th>Year</th><th>Cost ($)</th><th>Sale ($)</th><th>Profit ($)</th><th>Status</th></tr></thead>
            <tbody>${cars.map((c,i) => {
                const profit = (c.price||0) - (c.costPrice||0);
                return `<tr><td>${i+1}</td><td><strong>${c.brand}</strong></td><td>${c.model}</td><td>${c.year}</td><td>${(c.costPrice||0).toLocaleString()}</td><td>${(c.price||0).toLocaleString()}</td><td>${profit.toLocaleString()}</td><td>${c.status}</td></tr>`;
            }).join('')}</tbody>
        </table>`);
}

async function exportInventoryCSV() {
    const cars = await fetchAllCars();
    const headers = ['Brand','Model','Year','Color','Fuel','Transmission','Mileage','Cost Price ($)','Sale Price ($)','Profit ($)','VIN','Status'];
    const rows = cars.map(c => {
        const profit = (c.price||0) - (c.costPrice||0);
        return [c.brand, c.model, c.year, c.color||'', c.fuel||'', c.transmission||'', c.mileage||0, c.costPrice||0, c.price||0, profit, c.vin||'', c.status||''];
    });
    exportToCSV([headers, ...rows], `inventory-${new Date().toISOString().split('T')[0]}.csv`);
}

// ── Sales Report ──

async function viewSalesReport() {
    const sales = await fetchAllSales();
    const range = getDateRange();
    const filtered = sales.filter(s => withinRange(s.saleDate, range));
    const cashTypes = ['cash','check','bank_transfer'];
    const cash = filtered.filter(s => cashTypes.includes(s.paymentMethod));
    const inst = filtered.filter(s => s.paymentMethod === 'installment');
    const cashRev = cash.reduce((sum,s) => sum + (s.salePrice||0), 0);
    const instRev = inst.reduce((sum,s) => sum + (s.salePrice||0), 0);
    const totalRev = cashRev + instRev;
    const totalCost = filtered.reduce((sum,s) => sum + (s.car?.costPrice||0), 0);
    const profit = totalRev - totalCost;
    _salesData = filtered;

    document.getElementById('reportViewer').classList.remove('hidden');
    document.getElementById('reportViewer').innerHTML = `
        <h3 class="report-section-title">${t('reports.sales')} ${range.from||range.to ? `(${range.from||'…'} → ${range.to||'…'})` : ''}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div><div class="stat-info"><h3>${t('report.cashTotal')}</h3><p>$${cashRev.toLocaleString()}</p><small>${cash.length} ${t('report.deals')}</small></div></div>
            <div class="report-stat"><div class="stat-icon blue"><i class="fas fa-credit-card"></i></div><div class="stat-info"><h3>${t('report.installTotal')}</h3><p>$${instRev.toLocaleString()}</p><small>${inst.length} ${t('report.deals')}</small></div></div>
            <div class="report-stat"><div class="stat-icon amber"><i class="fas fa-chart-line"></i></div><div class="stat-info"><h3>${t('report.revenue')}</h3><p>$${totalRev.toLocaleString()}</p></div></div>
            <div class="report-stat"><div class="stat-icon ${profit>=0?'green':'red'}"><i class="fas fa-chart-bar"></i></div><div class="stat-info"><h3>${t('report.netProfit')}</h3><p>$${profit.toLocaleString()}</p></div></div>
        </div>
        <table><thead><tr>
            <th>${t('admin.sales.date')}</th><th>${t('admin.sales.car')}</th>
            <th>${t('admin.sales.buyer')}</th><th>${t('admin.sales.payment')}</th>
            <th>${t('admin.sales.price')}</th><th>${t('report.netProfit')}</th>
        </tr></thead><tbody>${filtered.map(s => {
            const p = (s.salePrice||0) - (s.car?.costPrice||0);
            return `<tr>
                <td>${new Date(s.saleDate).toLocaleDateString()}</td>
                <td><strong>${s.car?.brand||''} ${s.car?.model||''}</strong></td>
                <td>${s.buyer?.name||'–'}</td>
                <td>${s.paymentMethod||'–'}</td>
                <td><strong>$${(s.salePrice||0).toLocaleString()}</strong></td>
                <td style="color:var(--${p>=0?'success':'danger'})">$${p.toLocaleString()}</td>
            </tr>`;
        }).join('')}</tbody></table>`;
}

async function printSalesReport() {
    const sales = await fetchAllSales();
    const range = getDateRange();
    const filtered = sales.filter(s => withinRange(s.saleDate, range));
    const cashTypes = ['cash','check','bank_transfer'];
    const cashRev = filtered.filter(s => cashTypes.includes(s.paymentMethod)).reduce((sum,s) => sum + (s.salePrice||0), 0);
    const instRev = filtered.filter(s => s.paymentMethod === 'installment').reduce((sum,s) => sum + (s.salePrice||0), 0);
    const totalRev = cashRev + instRev;
    const totalCost = filtered.reduce((sum,s) => sum + (s.car?.costPrice||0), 0);
    const profit = totalRev - totalCost;
    const period = range.from||range.to ? `${range.from||'all'} → ${range.to||'now'}` : 'All Time';

    openPrintWindow(`Sales Report — تقرير المبيعات (${period})`, `
        <div class="kpi-row">
            <div class="kpi"><strong>$${cashRev.toLocaleString()}</strong><span>Cash Sales</span></div>
            <div class="kpi"><strong>$${instRev.toLocaleString()}</strong><span>Installment Sales</span></div>
            <div class="kpi"><strong>$${totalRev.toLocaleString()}</strong><span>Total Revenue</span></div>
            <div class="kpi"><strong>$${totalCost.toLocaleString()}</strong><span>Total Cost</span></div>
            <div class="kpi"><strong style="color:${profit>=0?'#16a34a':'#dc2626'}">$${profit.toLocaleString()}</strong><span>Net Profit</span></div>
        </div>
        <table>
            <thead><tr><th>#</th><th>Date</th><th>Car</th><th>Buyer</th><th>Payment</th><th>Cost ($)</th><th>Sale ($)</th><th>Profit ($)</th></tr></thead>
            <tbody>${filtered.map((s,i) => {
                const cost = s.car?.costPrice||0;
                const p = (s.salePrice||0) - cost;
                return `<tr><td>${i+1}</td><td>${new Date(s.saleDate).toLocaleDateString()}</td><td>${s.car?.brand||''} ${s.car?.model||''}</td><td>${s.buyer?.name||'–'}</td><td>${s.paymentMethod||''}</td><td>${cost.toLocaleString()}</td><td>${(s.salePrice||0).toLocaleString()}</td><td>${p.toLocaleString()}</td></tr>`;
            }).join('')}</tbody>
        </table>`);
}

// ── Expenses Report ──

async function viewExpensesReport() {
    const exp = await fetchAllExpenses();
    const range = getDateRange();
    const filtered = exp.filter(e => withinRange(e.date, range));
    const totalIQD = filtered.reduce((s,e) => s + (e.amountIQD||0), 0);
    const totalUSD = filtered.reduce((s,e) => s + (e.amountUSD||0), 0);
    _expensesData = filtered;

    // Group by category
    const byCategory = {};
    filtered.forEach(e => {
        byCategory[e.category] = byCategory[e.category] || { count: 0, usd: 0 };
        byCategory[e.category].count++;
        byCategory[e.category].usd += (e.amountUSD || 0);
    });

    document.getElementById('reportViewer').classList.remove('hidden');
    document.getElementById('reportViewer').innerHTML = `
        <h3 class="report-section-title">${t('reports.expenses')} ${range.from||range.to ? `(${range.from||'…'} → ${range.to||'…'})` : ''}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="stat-icon red"><i class="fas fa-receipt"></i></div><div class="stat-info"><h3>${t('exp.totalUSD')}</h3><p>$${totalUSD.toLocaleString()}</p></div></div>
            <div class="report-stat"><div class="stat-icon orange"><i class="fas fa-money-bill"></i></div><div class="stat-info"><h3>${t('exp.totalIQD')}</h3><p>${totalIQD.toLocaleString()}</p></div></div>
            <div class="report-stat"><div class="stat-icon blue"><i class="fas fa-list"></i></div><div class="stat-info"><h3>${t('exp.count')}</h3><p>${filtered.length}</p></div></div>
        </div>
        <h4 style="margin:20px 0 10px">${t('reports.byCategory')}</h4>
        <table><thead><tr><th>${t('exp.category')}</th><th>${t('exp.count')}</th><th>${t('exp.totalUSD')}</th></tr></thead>
            <tbody>${Object.entries(byCategory).map(([cat, data]) => `
                <tr><td><strong>${cat}</strong></td><td>${data.count}</td><td>$${data.usd.toLocaleString()}</td></tr>`).join('')}
            </tbody>
        </table>
        <h4 style="margin:20px 0 10px">${t('reports.allExpenses')}</h4>
        <table><thead><tr>
            <th>${t('exp.date')}</th><th>${t('exp.desc')}</th><th>${t('exp.category')}</th>
            <th>${t('exp.amountIQD')}</th><th>${t('exp.amountUSD')}</th>
        </tr></thead><tbody>${filtered.map(e => `
            <tr>
                <td>${new Date(e.date).toLocaleDateString()}</td>
                <td>${e.description}</td>
                <td>${e.category}</td>
                <td>${(e.amountIQD||0).toLocaleString()}</td>
                <td><strong>$${(e.amountUSD||0).toLocaleString()}</strong></td>
            </tr>`).join('')}</tbody></table>`;
}

async function printExpensesReport() {
    const exp = await fetchAllExpenses();
    const range = getDateRange();
    const filtered = exp.filter(e => withinRange(e.date, range));
    const totalIQD = filtered.reduce((s,e) => s + (e.amountIQD||0), 0);
    const totalUSD = filtered.reduce((s,e) => s + (e.amountUSD||0), 0);
    const byCategory = {};
    filtered.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + (e.amountUSD || 0);
    });
    const period = range.from||range.to ? `${range.from||'all'} → ${range.to||'now'}` : 'All Time';

    openPrintWindow(`Expenses Report — تقرير المصاريف (${period})`, `
        <div class="kpi-row">
            <div class="kpi"><strong>${filtered.length}</strong><span>Entries</span></div>
            <div class="kpi"><strong>${totalIQD.toLocaleString()} IQD</strong><span>Total IQD</span></div>
            <div class="kpi"><strong>$${totalUSD.toLocaleString()}</strong><span>Total USD</span></div>
        </div>
        <h3 style="margin:14px 0 8px">By Category</h3>
        <table>
            <thead><tr><th>Category</th><th>Amount ($)</th></tr></thead>
            <tbody>${Object.entries(byCategory).map(([cat, amt]) => `<tr><td><strong>${cat}</strong></td><td>${amt.toLocaleString()}</td></tr>`).join('')}</tbody>
        </table>
        <h3 style="margin:14px 0 8px">All Expenses</h3>
        <table>
            <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>IQD</th><th>USD</th><th>Payment</th></tr></thead>
            <tbody>${filtered.map((e,i) => `<tr><td>${i+1}</td><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.description}</td><td>${e.category}</td><td>${(e.amountIQD||0).toLocaleString()}</td><td>${(e.amountUSD||0).toLocaleString()}</td><td>${e.paymentMethod||''}</td></tr>`).join('')}</tbody>
        </table>`);
}

// ── Customers Report ──

async function viewCustomersReport() {
    const [users, sales] = await Promise.all([fetchAllUsers(), fetchAllSales()]);
    const customers = users.filter(u => u.role !== 'admin');
    const purchasesByUser = {};
    sales.forEach(s => {
        const id = s.buyer?._id;
        if (!id) return;
        purchasesByUser[id] = purchasesByUser[id] || { count: 0, total: 0 };
        purchasesByUser[id].count++;
        purchasesByUser[id].total += (s.salePrice || 0);
    });

    document.getElementById('reportViewer').classList.remove('hidden');
    document.getElementById('reportViewer').innerHTML = `
        <h3 class="report-section-title">${t('reports.customers')}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${t('admin.stat.users')}</h3><p>${customers.length}</p></div></div>
            <div class="report-stat"><div class="stat-icon green"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><h3>${t('admin.stat.sales')}</h3><p>${sales.length}</p></div></div>
        </div>
        <table><thead><tr>
            <th>${t('admin.users.name')}</th><th>${t('admin.users.phone')}</th>
            <th>${t('admin.users.city')}</th><th>Purchases</th><th>Total Spent</th>
        </tr></thead><tbody>${customers.map(u => {
            const stats = purchasesByUser[u._id] || { count: 0, total: 0 };
            return `<tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.phone||'–'}</td>
                <td>${u.city||'–'}</td>
                <td>${stats.count}</td>
                <td><strong>$${stats.total.toLocaleString()}</strong></td>
            </tr>`;
        }).join('')}</tbody></table>`;
}

async function printCustomersReport() {
    const [users, sales] = await Promise.all([fetchAllUsers(), fetchAllSales()]);
    const customers = users.filter(u => u.role !== 'admin');
    const purchasesByUser = {};
    sales.forEach(s => {
        const id = s.buyer?._id;
        if (!id) return;
        purchasesByUser[id] = purchasesByUser[id] || { count: 0, total: 0 };
        purchasesByUser[id].count++;
        purchasesByUser[id].total += (s.salePrice || 0);
    });

    openPrintWindow('Customers Report — تقرير العملاء', `
        <div class="kpi-row">
            <div class="kpi"><strong>${customers.length}</strong><span>Total Customers</span></div>
            <div class="kpi"><strong>${sales.length}</strong><span>Total Sales</span></div>
        </div>
        <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Purchases</th><th>Total Spent ($)</th></tr></thead>
            <tbody>${customers.map((u,i) => {
                const stats = purchasesByUser[u._id] || { count: 0, total: 0 };
                return `<tr><td>${i+1}</td><td><strong>${u.name}</strong></td><td>${u.email||''}</td><td>${u.phone||''}</td><td>${u.city||''}</td><td>${stats.count}</td><td>${stats.total.toLocaleString()}</td></tr>`;
            }).join('')}</tbody>
        </table>`);
}

async function exportCustomersCSV() {
    const [users, sales] = await Promise.all([fetchAllUsers(), fetchAllSales()]);
    const customers = users.filter(u => u.role !== 'admin');
    const purchasesByUser = {};
    sales.forEach(s => {
        const id = s.buyer?._id;
        if (!id) return;
        purchasesByUser[id] = purchasesByUser[id] || { count: 0, total: 0 };
        purchasesByUser[id].count++;
        purchasesByUser[id].total += (s.salePrice || 0);
    });
    const headers = ['Name','Email','Phone','City','Address','Role','Purchases','Total Spent ($)'];
    const rows = customers.map(u => {
        const stats = purchasesByUser[u._id] || { count: 0, total: 0 };
        return [u.name, u.email||'', u.phone||'', u.city||'', u.address||'', u.role, stats.count, stats.total];
    });
    exportToCSV([headers, ...rows], `customers-${new Date().toISOString().split('T')[0]}.csv`);
}

// ── Shared Print Window ──

function openPrintWindow(title, body) {
    const lang = getLang();
    const dir = (lang === 'ar' || lang === 'ku') ? 'rtl' : 'ltr';
    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}"><head><meta charset="UTF-8"><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:12px}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #333;padding-bottom:10px;margin-bottom:14px}
  .hdr-side{font-size:11px;line-height:1.7}
  .hdr-center{text-align:center}
  .hdr-center img{width:55px;height:55px;border-radius:50%;object-fit:contain}
  h2{margin:0 0 14px;text-align:center;border:2px solid #333;padding:8px;background:#f5f5f5}
  h3{margin:14px 0 6px;color:#1e40af}
  .kpi-row{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
  .kpi{flex:1;min-width:120px;background:#f8f9fa;border:1px solid #ccc;border-radius:6px;padding:10px;text-align:center}
  .kpi strong{display:block;font-size:18px;color:#1e40af}
  .kpi span{font-size:11px;color:#666}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #ccc;padding:5px 8px;text-align:${dir==='rtl'?'right':'left'};font-size:11px}
  th{background:#1e293b;color:#fff;font-weight:bold}
  tr:nth-child(even){background:#f8f9fa}
  .footer{margin-top:25px;text-align:center;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:10px}
  .pbtn{text-align:center;margin-bottom:15px}
  .pbtn button{padding:10px 30px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}
  @media print{.pbtn{display:none}}
</style></head><body>
<div class="pbtn"><button onclick="window.print()">🖨️ Print / طباعة</button></div>
<div class="hdr">
    <div class="hdr-side"><strong>Mega Cars Show</strong><br>For All Types of Cars Trading<br>📞 0751 121 1511</div>
    <div class="hdr-center"><img src="/images/logo-small.png" alt=""><br><strong>Mega Cars</strong></div>
    <div class="hdr-side" style="text-align:right"><strong>معرض ميگا كارس</strong><br>دهوك - معرض رقم 27<br>${new Date().toLocaleDateString()}</div>
</div>
<h2>${title}</h2>
${body}
<div class="footer">Generated on ${new Date().toLocaleString()} — Mega Cars Dealership Management System</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    w.document.write(html);
    w.document.close();
}

// ── Mobile menu ───────────────────────────────────────────

function toggleMobileMenu() {
    document.getElementById('adminSidebar')?.classList.toggle('open');
    document.querySelector('.sidebar-backdrop')?.classList.toggle('active');
}

// Close mobile menu when navigation item clicked
document.addEventListener('click', (e) => {
    if (window.innerWidth > 767) return;
    if (e.target.closest('.admin-menu-item')) {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar?.classList.contains('open')) toggleMobileMenu();
    }
});
