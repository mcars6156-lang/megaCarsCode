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
    const total = parseFloat(document.getElementById('calcTotalPrice')?.value) || 0;
    const down  = parseFloat(document.getElementById('calcDownPayment')?.value) || 0;
    const el    = document.getElementById('calcResult');
    if (!el) return;
    if (!total || !down || down >= total) {
        el.innerHTML = `<p style="color:var(--text-muted);padding:16px 0">${t('calc.hint')}</p>`;
        return;
    }
    const remaining = total - down;
    const options   = [250, 300, 350, 400, 450, 500];
    el.innerHTML = `
        <table>
            <thead><tr>
                <th>${t('calc.months')}</th>
                <th>${t('calc.monthly')}</th>
                <th>${t('calc.remaining')}</th>
                <th>${t('calc.downPayment')}</th>
                <th>${t('calc.total')}</th>
            </tr></thead>
            <tbody>${options.map(m => {
                const months = Math.ceil(remaining / m);
                const tot    = down + (m * months);
                return `<tr>
                    <td><strong>${months}</strong></td>
                    <td>$${m.toLocaleString()}</td>
                    <td>$${remaining.toLocaleString()}</td>
                    <td>$${down.toLocaleString()}</td>
                    <td><strong>$${tot.toLocaleString()}</strong></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
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
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:15px;direction:rtl;font-size:13px}.page{max-width:780px;margin:0 auto;border:2px solid #333;padding:20px}.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:12px}.hdr-side{font-size:12px;line-height:1.8}.hdr-center{text-align:center}.hdr-center img{width:65px;height:65px;object-fit:contain;border-radius:50%}.meta{display:flex;justify-content:space-between;margin-bottom:10px}.ct{text-align:center;font-size:20px;font-weight:bold;border:2px solid #333;padding:8px;margin:12px 0}.stitle{background:#eee;border:1px solid #999;padding:6px 10px;font-weight:bold;margin:10px 0 0}table{width:100%;border-collapse:collapse}td{border:1px solid #bbb;padding:5px 8px}.lbl{background:#f8f8f8;font-weight:bold;width:35%}.terms{border:1px solid #bbb;padding:10px;font-size:12px}.terms ol{margin:0;padding-right:18px}.terms li{margin-bottom:3px}.sigs{display:flex;justify-content:space-between;margin-top:35px}.sig{text-align:center;width:40%}.sig-line{border-top:1px solid #333;padding-top:5px;margin-top:50px}.pbtn{text-align:center;margin-bottom:15px}.pbtn button{padding:10px 30px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:15px}@media print{.pbtn{display:none}}</style>
</head><body>
<div class="pbtn"><button onclick="window.print()">🖨️ طباعة / Print</button></div>
<div class="page">
  <div class="hdr">
    <div class="hdr-side"><strong>Mega Cars Show</strong><br>For All Types of Cars Trading<br>Tel: 0751 121 1511<br>0774 088 6657</div>
    <div class="hdr-center"><img src="/images/logo-small.png" alt="Mega Cars"><br><strong style="font-size:14px">Mega Cars</strong><br><span style="font-size:11px">لبيع وشراء السيارات</span></div>
    <div class="hdr-side" style="text-align:right"><strong>معرض ميگا كارس</strong><br>دهوك - پيشانگه هين ترومبيلا<br>تيرمنال معرض رقم 27</div>
  </div>
  <div class="meta"><span>تاريخ العقد: <strong>${fd(g('contractDate'))}</strong></span><span>رقم العقد: <strong>${g('contractNo')||'----'}</strong></span></div>
  <div class="ct">عقد بيع وشراء سيارة</div>
  <div class="stitle">بيانات المتعاقدين</div>
  <table><tr>
    <td style="width:50%;vertical-align:top;border:none;padding:0"><table>
      <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center">الطرف الأول (البائع)</td></tr>
      <tr><td class="lbl">الاسم:</td><td>${g('sellerName')}</td></tr>
      <tr><td class="lbl">رقم الهوية:</td><td>${g('sellerId')}</td></tr>
      <tr><td class="lbl">المهنة:</td><td>${g('sellerOcc')}</td></tr>
      <tr><td class="lbl">رقم الهاتف:</td><td>${g('sellerPhone')}</td></tr>
      <tr><td class="lbl">السكن:</td><td>${g('sellerCity')}</td></tr>
    </table></td>
    <td style="width:50%;vertical-align:top;border:none;padding:0"><table>
      <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center">الطرف الثاني (المشتري)</td></tr>
      <tr><td class="lbl">الاسم:</td><td>${g('buyerName')}</td></tr>
      <tr><td class="lbl">رقم الهوية:</td><td>${g('buyerId')}</td></tr>
      <tr><td class="lbl">المهنة:</td><td>${g('buyerOcc')}</td></tr>
      <tr><td class="lbl">رقم الهاتف:</td><td>${g('buyerPhone')}</td></tr>
      <tr><td class="lbl">السكن:</td><td>${g('buyerCity')}</td></tr>
    </table></td>
  </tr></table>
  <div class="stitle">بيانات السيارة والمبالغ</div>
  <table>
    <tr><td><strong>النوع:</strong> ${g('contractBrand')}</td><td><strong>الموديل:</strong> ${g('contractYear')}</td><td><strong>اللون:</strong> ${g('contractColor')}</td></tr>
    <tr><td><strong>رقم المحرك:</strong> ${g('contractEngineNo')}</td><td colspan="2"><strong>رقم الشاسي:</strong> ${g('contractVin')}</td></tr>
    <tr><td><strong>السعر الكلي:</strong> $${Number(g('contractTotal')).toLocaleString()}</td><td><strong>المبلغ المسدد:</strong> $${Number(g('contractDown')).toLocaleString()}</td><td><strong>المبلغ المتبقي:</strong> $${Number(g('contractRemaining')).toLocaleString()}</td></tr>
    <tr><td><strong>مبلغ القسط:</strong> $${Number(g('contractMonthly')).toLocaleString()}/شهر</td><td><strong>عدد الأشهر:</strong> ${g('contractMonths')} شهر</td><td><strong>أول قسط:</strong> ${fd(g('contractFirstDate'))}</td></tr>
  </table>
  <div class="stitle">الشروط والملاحظات</div>
  <div class="terms"><ol>
    <li>يتم دفع مقدمة العقد بالدولار عند توقيع الاتفاق.</li>
    <li>يتم تسديد باقي المبلغ على شكل أقساط شهرية بالدولار حسب الاتفاق بين الطرفين.</li>
    <li>ينظم هذا العقد من قبل المعرض ويكون موثقاً بين البائع والمشتري.</li>
    <li>يتم تسليم وصل أمانة من قبل المشتري لصالح المعرض كضمان.</li>
    <li>يلتزم المعرض بإعطاء وصل قبض شهري للمشتري عند كل دفعة.</li>
    <li>يتم منح وكالة قيادة للمشتري لاستخدام السيارة لحين إتمام السداد.</li>
    <li>لا يحق للمشتري بيع أو التنازل عن السيارة إلا بعد تسديد كامل المبلغ المتفق عليه.</li>
    <li>لا يجوز استيفاء أي أتعاب أو رسوم إضافية عند نقل ملكية السيارة بعد إتمام السداد الكامل.</li>
    <li>يدفع المشتري مبلغ (100) دولار للمعرض عند توقيع العقد + أتعاب الناشر.</li>
    <li>ويكون موعد دفع الأقساط من اليوم الأول إلى اليوم الخامس من كل شهر حصراً.</li>
    ${g('contractNotes') ? `<li>${g('contractNotes')}</li>` : ''}
  </ol></div>
  <div class="sigs">
    <div class="sig"><div class="sig-line">توقيع الطرف الأول (البائع)</div></div>
    <div class="sig"><div class="sig-line">توقيع الطرف الثاني (المشتري)</div></div>
  </div>
</div></body></html>`;
    const w = window.open('', '_blank', 'width=900,height=750,scrollbars=yes');
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
