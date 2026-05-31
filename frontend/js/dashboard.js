function ensureAuth() {
    const user = localStorage.getItem('user');
    if (!user) { window.location.href = 'login.html'; return null; }
    return JSON.parse(user);
}

let currentUser = ensureAuth();
let currentInventoryView = localStorage.getItem('invView') || 'table';

// ── Navigation ────────────────────────────────────────────

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function showSection(sectionId, e) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sectionId)?.classList.remove('hidden');
    (e?.target ?? e)?.closest?.('.menu-item')?.classList.add('active');

    const titles = {
        'dashboard':    t('dash.section.dashboard'),
        'cars':         t('dash.section.cars'),
        'my-sales':     t('dash.section.purchases'),
        'installments': t('dash.section.installments'),
        'sell-car':     t('dash.section.sellCar'),
        'settings':     t('dash.section.settings')
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || t('dash.section.dashboard');

    if (sectionId === 'dashboard')    loadDashboard();
    if (sectionId === 'cars')         loadCars();
    if (sectionId === 'my-sales')     loadSales();
    if (sectionId === 'installments') loadInstallments();
    if (sectionId === 'settings')     loadSettings();
}

// ── Welcome banner ────────────────────────────────────────

function updateWelcomeBanner() {
    const name = currentUser?.name || '';
    const greeting = t('dash.greeting');
    document.getElementById('welcomeGreeting').textContent = name ? `${greeting}, ${name}` : greeting;

    const now = new Date();
    const dayNames = {
        ar: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
        ku: ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'],
        en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    };
    const lang = getLang();
    const days = dayNames[lang] || dayNames.en;
    document.getElementById('welcomeDay').textContent = days[now.getDay()];
    document.getElementById('welcomeDate').textContent = now.toLocaleDateString(
        lang === 'ar' ? 'ar-IQ' : lang === 'ku' ? 'ku' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
    );
}

function updateUserName() {
    if (!currentUser) return;
    const name = currentUser.name || 'User';
    const el = document.getElementById('userName');
    if (el) el.textContent = name;
    const sidebarEl = document.getElementById('sidebarUserName');
    if (sidebarEl) sidebarEl.textContent = name;
}

// ── Dashboard stats ───────────────────────────────────────

async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [salesRes, installRes, carsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/sales`, { headers }),
            fetch(`${API_BASE_URL}/sales/installment/plans`, { headers }),
            fetch(`${API_BASE_URL}/cars?status=available`)
        ]);
        const sales = await salesRes.json();
        const installments = await installRes.json();
        const cars = await carsRes.json();
        document.getElementById('totalPurchases').textContent   = Array.isArray(sales) ? sales.length : 0;
        document.getElementById('activeInstallments').textContent = Array.isArray(installments) ? installments.filter(i => i.status === 'active').length : 0;
        document.getElementById('carsSold').textContent         = Array.isArray(cars) ? cars.length : 0;
    } catch (error) { console.error('Error loading dashboard:', error); }
}

// ── Status badge helper ───────────────────────────────────

function statusBadge(status) {
    const label = t(`dyn.status.${status}`) !== `dyn.status.${status}` ? t(`dyn.status.${status}`) : status;
    return `<span class="status-badge ${status}">${label}</span>`;
}

// ── Inventory ─────────────────────────────────────────────

async function loadCars() {
    try {
        const brand    = document.getElementById('searchBrand')?.value.trim() || '';
        const status   = document.getElementById('filterStatus')?.value || '';
        const fuel     = document.getElementById('filterFuel')?.value || '';
        const minPrice = document.getElementById('filterMinPrice')?.value || '';
        const maxPrice = document.getElementById('filterMaxPrice')?.value || '';

        const params = new URLSearchParams();
        if (brand)    params.set('brand', brand);
        if (status)   params.set('status', status);
        if (fuel)     params.set('fuel', fuel);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);

        const res = await fetch(`${API_BASE_URL}/cars?${params}`);
        const cars = await res.json();
        if (!Array.isArray(cars)) return;

        updateInventorySummary(cars);

        const countEl = document.getElementById('invResultCount');
        if (countEl) countEl.textContent = `${cars.length} ${t('inv.results')}`;

        if (currentInventoryView === 'grid') renderCarsGrid(cars);
        else renderCarsTable(cars);
    } catch (err) { console.error('Error loading cars:', err); }
}

function updateInventorySummary(cars) {
    const c = { total: cars.length, available: 0, sold: 0, pending: 0 };
    cars.forEach(car => {
        if (car.status === 'available') c.available++;
        else if (car.status === 'sold') c.sold++;
        else if (car.status === 'pending') c.pending++;
    });
    document.getElementById('invCountTotal').textContent    = c.total;
    document.getElementById('invCountAvailable').textContent = c.available;
    document.getElementById('invCountSold').textContent     = c.sold;
    document.getElementById('invCountPending').textContent  = c.pending;
}

function filterByStatus(status) {
    const sel = document.getElementById('filterStatus');
    if (sel) sel.value = status;
    // highlight active count
    document.querySelectorAll('.inv-count').forEach(el => el.classList.remove('active'));
    const map = { '': 'invFilterAll', available: 'invFilterAvail', sold: 'invFilterSold', pending: 'invFilterPending' };
    document.getElementById(map[status] || 'invFilterAll')?.classList.add('active');
    loadCars();
}

function setView(type) {
    currentInventoryView = type;
    localStorage.setItem('invView', type);
    document.getElementById('btnTableView')?.classList.toggle('active-view', type === 'table');
    document.getElementById('btnGridView')?.classList.toggle('active-view', type === 'grid');
    loadCars();
}

function renderCarsTable(cars) {
    const wrap = document.getElementById('carsTable');
    const grid = document.getElementById('carsList');
    wrap?.classList.remove('hidden');
    grid?.classList.add('hidden');

    if (!cars.length) {
        wrap.innerHTML = `<div class="empty-state"><i class="fas fa-car"></i><p>${t('inv.noCars')}</p></div>`;
        return;
    }

    wrap.innerHTML = `
        <table class="inv-table">
            <thead><tr>
                <th></th>
                <th>${t('inv.brandModel')}</th>
                <th>${t('dyn.year')}</th>
                <th>${t('dyn.price')}</th>
                <th>${t('dyn.mileage')}</th>
                <th>${t('inv.fuel')}</th>
                <th>${t('inv.transmission')}</th>
                <th>${t('dyn.status')}</th>
                <th>${t('inv.actions')}</th>
            </tr></thead>
            <tbody>
                ${cars.map(car => `
                <tr>
                    <td><div class="car-thumb"><i class="fas fa-car"></i></div></td>
                    <td>
                        <div class="car-name">${car.brand} ${car.model}</div>
                        <div class="car-sub">${[car.color, car.condition, car.bodyType].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>${car.year}</td>
                    <td><strong>$${car.price.toLocaleString()}</strong></td>
                    <td>${car.mileage != null ? car.mileage.toLocaleString() + ' km' : '–'}</td>
                    <td>${car.fuel || '–'}</td>
                    <td>${car.transmission || '–'}</td>
                    <td>${statusBadge(car.status)}</td>
                    <td>
                        <div class="td-actions">
                            <button class="btn btn-secondary btn-small" onclick="openEditModal('${car._id}')">
                                <i class="fas fa-edit"></i> ${t('inv.edit')}
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteCarInventory('${car._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function renderCarsGrid(cars) {
    const wrap = document.getElementById('carsTable');
    const grid = document.getElementById('carsList');
    wrap?.classList.add('hidden');
    grid?.classList.remove('hidden');

    if (!cars.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-car"></i><p>${t('inv.noCars')}</p></div>`;
        return;
    }

    grid.innerHTML = cars.map(car => `
        <div class="car-item">
            <div class="car-image">
                <i class="fas fa-car"></i>
                <span class="car-badge">${t('dyn.available')}</span>
            </div>
            <div class="car-content">
                <div class="car-title">${car.brand} ${car.model}</div>
                <div class="car-price">$${car.price.toLocaleString()}</div>
                <div class="car-specs">
                    <span class="spec-chip"><i class="fas fa-calendar"></i> ${car.year}</span>
                    <span class="spec-chip"><i class="fas fa-tachometer-alt"></i> ${car.mileage?.toLocaleString()} km</span>
                    <span class="spec-chip"><i class="fas fa-gas-pump"></i> ${car.fuel || '–'}</span>
                    ${car.color ? `<span class="spec-chip"><i class="fas fa-circle"></i> ${car.color}</span>` : ''}
                </div>
                <div style="display:flex;gap:8px;margin-top:12px">
                    <button class="btn btn-secondary btn-small" onclick="openEditModal('${car._id}')">
                        <i class="fas fa-edit"></i> ${t('inv.edit')}
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCarInventory('${car._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`).join('');
}

// ── Edit modal ────────────────────────────────────────────

async function openEditModal(carId) {
    try {
        const res = await fetch(`${API_BASE_URL}/cars/${carId}`);
        const car = await res.json();

        document.getElementById('editCarId').value          = car._id;
        document.getElementById('editBrand').value          = car.brand || '';
        document.getElementById('editModel').value          = car.model || '';
        document.getElementById('editYear').value           = car.year || '';
        document.getElementById('editPrice').value          = car.price || '';
        document.getElementById('editMileage').value        = car.mileage || '';
        document.getElementById('editColor').value          = car.color || '';
        document.getElementById('editFuel').value           = car.fuel || 'petrol';
        document.getElementById('editTransmission').value   = car.transmission || 'automatic';
        document.getElementById('editBodyType').value       = car.bodyType || 'sedan';
        document.getElementById('editCondition').value      = car.condition || 'used';
        document.getElementById('editStatus').value         = car.status || 'available';
        document.getElementById('editVin').value            = car.vin || '';
        document.getElementById('editDescription').value   = car.description || '';

        document.getElementById('editCarModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (err) { console.error('Error fetching car:', err); }
}

function closeEditModal() {
    document.getElementById('editCarModal').classList.add('hidden');
    document.body.style.overflow = '';
}

async function saveEditCar() {
    const id = document.getElementById('editCarId').value;
    const data = {
        brand:        document.getElementById('editBrand').value,
        model:        document.getElementById('editModel').value,
        year:         parseInt(document.getElementById('editYear').value),
        price:        parseFloat(document.getElementById('editPrice').value),
        mileage:      parseInt(document.getElementById('editMileage').value),
        color:        document.getElementById('editColor').value,
        fuel:         document.getElementById('editFuel').value,
        transmission: document.getElementById('editTransmission').value,
        bodyType:     document.getElementById('editBodyType').value,
        condition:    document.getElementById('editCondition').value,
        status:       document.getElementById('editStatus').value,
        vin:          document.getElementById('editVin').value,
        description:  document.getElementById('editDescription').value,
    };
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/cars/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert(t('inv.carUpdated'));
            closeEditModal();
            loadCars();
        } else {
            const err = await res.json();
            alert(err.message || t('inv.carUpdateFailed'));
        }
    } catch (err) { console.error('Error updating car:', err); alert(t('inv.carUpdateFailed')); }
}

async function deleteCarInventory(carId) {
    if (!confirm(t('alert.deleteCarConfirm'))) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/cars/${carId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) { alert(t('alert.carDeleted')); loadCars(); }
        else alert(t('alert.carDeleteFailed'));
    } catch (err) { console.error('Error deleting car:', err); alert(t('alert.carDeleteFailed')); }
}

// ── Sales records ─────────────────────────────────────────

async function loadSales() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/sales`, { headers: { 'Authorization': `Bearer ${token}` } });
        const sales = await res.json();
        if (!Array.isArray(sales) || !sales.length) {
            document.getElementById('salesList').innerHTML =
                `<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>–</p></div>`;
            return;
        }
        document.getElementById('salesList').innerHTML = sales.map(sale => `
            <div class="list-item">
                <div class="list-item-icon"><i class="fas fa-car"></i></div>
                <div class="list-item-info">
                    <div class="list-item-title">${sale.car?.brand || ''} ${sale.car?.model || ''}</div>
                    <div class="list-item-details">
                        ${t('dyn.price')}: $${sale.salePrice?.toLocaleString()} &nbsp;|&nbsp;
                        ${t('dyn.date')}: ${new Date(sale.saleDate).toLocaleDateString()}
                    </div>
                </div>
                <div class="list-item-actions">
                    ${statusBadge(sale.status)}
                    <button class="btn btn-secondary btn-small">${t('dyn.viewDetails')}</button>
                </div>
            </div>`).join('');
    } catch (err) { console.error('Error loading sales:', err); }
}

// ── Installments ──────────────────────────────────────────

async function loadInstallments() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/sales/installment/plans`, { headers: { 'Authorization': `Bearer ${token}` } });
        const plans = await res.json();
        if (!Array.isArray(plans) || !plans.length) {
            document.getElementById('installmentsList').innerHTML =
                `<div class="empty-state"><i class="fas fa-credit-card"></i><p>–</p></div>`;
            return;
        }
        document.getElementById('installmentsList').innerHTML = plans.map(plan => `
            <div class="list-item">
                <div class="list-item-icon"><i class="fas fa-credit-card"></i></div>
                <div class="list-item-info">
                    <div class="list-item-title">${plan.car?.brand || ''} ${plan.car?.model || ''} — ${t('dyn.installmentPlan')}</div>
                    <div class="list-item-details">
                        ${t('dyn.total')}: $${plan.totalAmount?.toLocaleString()} &nbsp;|&nbsp;
                        ${t('dyn.remaining')}: $${plan.remainingAmount?.toLocaleString()} &nbsp;|&nbsp;
                        ${t('dyn.installments')}: ${plan.numberOfInstallments}
                    </div>
                </div>
                <div class="list-item-actions">
                    ${statusBadge(plan.status)}
                    <button class="btn btn-secondary btn-small" onclick="viewInstallmentDetails('${plan._id}')">${t('dyn.viewDetails')}</button>
                </div>
            </div>`).join('');
    } catch (err) { console.error('Error loading installments:', err); }
}

// ── Settings ──────────────────────────────────────────────

function loadSettings() {
    if (!currentUser) return;
    document.getElementById('profileName').value    = currentUser.name || '';
    document.getElementById('profileEmail').value   = currentUser.email || '';
    document.getElementById('profilePhone').value   = currentUser.phone || '';
    document.getElementById('profileAddress').value = currentUser.address || '';
    document.getElementById('fontSizeSlider').value = currentUser.customization?.fontSize || 14;
    document.getElementById('fontSizeValue').textContent = (currentUser.customization?.fontSize || 14) + 'px';
    document.getElementById('themeSelect').value    = currentUser.customization?.theme || 'light';
    document.getElementById('languageSelect').value = getLang();
}

async function saveSettings() {
    try {
        const fontSize = document.getElementById('fontSizeSlider').value;
        const theme    = document.getElementById('themeSelect').value;
        const language = document.getElementById('languageSelect').value;
        const token    = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/customization/settings/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ fontSize: parseInt(fontSize), theme, language, sidebarCollapsed: false })
        });
        if (res.ok) {
            document.body.style.fontSize = fontSize + 'px';
            setLang(language);
            alert(t('alert.settingsSaved'));
            window.location.reload();
        }
    } catch (err) { console.error('Error saving settings:', err); alert(t('alert.settingsFailed')); }
}

async function saveProfile() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/users/profile/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                name:    document.getElementById('profileName').value,
                phone:   document.getElementById('profilePhone').value,
                address: document.getElementById('profileAddress').value
            })
        });
        if (res.ok) alert(t('alert.profileSaved'));
    } catch (err) { console.error('Error saving profile:', err); }
}

function updateFontSize() {
    const size = document.getElementById('fontSizeSlider').value;
    document.getElementById('fontSizeValue').textContent = size + 'px';
    document.body.style.fontSize = size + 'px';
}

function updateTheme() {
    document.body.classList.toggle('dark-theme', document.getElementById('themeSelect').value === 'dark');
}

function viewInstallmentDetails(planId) { alert(`${t('dyn.viewDetails')}: ${planId}`); }

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    updateUserName();
    updateWelcomeBanner();
    loadDashboard();

    // Close modal when clicking outside
    document.getElementById('editCarModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeEditModal();
    });

    // Add car form
    document.getElementById('sellCarForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.year     = parseInt(data.year);
        data.price    = parseFloat(data.price);
        data.mileage  = parseInt(data.mileage);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/cars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert(t('alert.carAdded'));
                e.target.reset();
                showSection('cars');
            } else {
                const err = await res.json();
                alert(err.message || t('alert.carAddFailed'));
            }
        } catch (err) { console.error('Error adding car:', err); alert(t('alert.carAddFailed')); }
    });
});
