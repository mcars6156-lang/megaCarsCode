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
        'settings':     t('dash.section.settings'),
        'calculator':   t('calc.title'),
        'contracts':    t('contract.title')
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || t('dash.section.dashboard');

    if (sectionId === 'dashboard')    loadDashboard();
    if (sectionId === 'cars')         loadCars();
    if (sectionId === 'my-sales')     loadSales();
    if (sectionId === 'installments') loadInstallments();
    if (sectionId === 'settings')     loadSettings();
    if (sectionId === 'contracts')    loadContractCars();
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
        document.getElementById('editVin').value            = car.vin || '';
        document.getElementById('editDescription').value    = car.description || '';

        buildSelectOptions('editFuel',         FUEL_OPTS);
        buildSelectOptions('editTransmission',  TRANS_OPTS);
        buildSelectOptions('editBodyType',       BODY_OPTS);
        buildSelectOptions('editCondition',      COND_OPTS);
        buildSelectOptions('editStatus',         STAT_OPTS);

        document.getElementById('editFuel').value          = car.fuel         || 'petrol';
        document.getElementById('editTransmission').value  = car.transmission || 'automatic';
        document.getElementById('editBodyType').value      = car.bodyType     || 'sedan';
        document.getElementById('editCondition').value     = car.condition    || 'used';
        document.getElementById('editStatus').value        = car.status       || 'available';

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

// ── Installment Calculator ────────────────────────────────

function calculateInstallments() {
    const total = parseFloat(document.getElementById('calcTotalPrice')?.value) || 0;
    const down  = parseFloat(document.getElementById('calcDownPayment')?.value) || 0;
    const el    = document.getElementById('calcResult');
    if (!el) return;

    if (!total || !down || down >= total) {
        el.innerHTML = `<p class="calc-hint">${t('calc.hint')}</p>`;
        return;
    }

    const remaining = total - down;
    const options   = [250, 300, 350, 400, 450, 500];

    el.innerHTML = `
        <table class="inv-table">
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
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>عقد رقم ${g('contractNo')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;margin:0;padding:15px;direction:rtl;font-size:13px}
  .page{max-width:780px;margin:0 auto;border:2px solid #333;padding:20px}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:12px}
  .hdr-side{font-size:12px;line-height:1.8}
  .hdr-center{text-align:center}
  .hdr-center img{width:65px;height:65px;object-fit:contain;border-radius:50%}
  .meta{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px}
  .ct{text-align:center;font-size:20px;font-weight:bold;border:2px solid #333;padding:8px;margin:12px 0}
  .stitle{background:#eee;border:1px solid #999;padding:6px 10px;font-weight:bold;margin:10px 0 0}
  table{width:100%;border-collapse:collapse}
  td{border:1px solid #bbb;padding:5px 8px}
  .lbl{background:#f8f8f8;font-weight:bold;width:35%}
  .terms{border:1px solid #bbb;padding:10px;font-size:12px}
  .terms ol{margin:0;padding-right:18px}
  .terms li{margin-bottom:3px}
  .sigs{display:flex;justify-content:space-between;margin-top:35px}
  .sig{text-align:center;width:40%}
  .sig-line{border-top:1px solid #333;padding-top:5px;margin-top:50px}
  .pbtn{text-align:center;margin-bottom:15px}
  .pbtn button{padding:10px 30px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:15px}
  @media print{.pbtn{display:none}}
</style>
</head>
<body>
<div class="pbtn"><button onclick="window.print()">🖨️ طباعة / Print</button></div>
<div class="page">
  <div class="hdr">
    <div class="hdr-side">
      <strong>Mega Cars Show</strong><br>
      For All Types of Cars Trading<br>
      Tel: 0751 121 1511<br>0774 088 6657
    </div>
    <div class="hdr-center">
      <img src="/images/logo-small.png" alt="Mega Cars"><br>
      <strong style="font-size:14px">Mega Cars</strong><br>
      <span style="font-size:11px">لبيع وشراء السيارات</span>
    </div>
    <div class="hdr-side" style="text-align:right">
      <strong>معرض ميگا كارس</strong><br>
      دهوك - پيشانگه هين ترومبيلا<br>
      تيرمنال معرض رقم 27
    </div>
  </div>
  <div class="meta">
    <span>تاريخ العقد: <strong>${fd(g('contractDate'))}</strong></span>
    <span>رقم العقد: <strong>${g('contractNo') || '----'}</strong></span>
  </div>
  <div class="ct">عقد بيع وشراء سيارة</div>
  <div class="stitle">بيانات المتعاقدين</div>
  <table><tr>
    <td style="width:50%;vertical-align:top;border:none;padding:0">
      <table>
        <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center">الطرف الأول (البائع)</td></tr>
        <tr><td class="lbl">الاسم:</td><td>${g('sellerName')}</td></tr>
        <tr><td class="lbl">رقم الهوية:</td><td>${g('sellerId')}</td></tr>
        <tr><td class="lbl">المهنة:</td><td>${g('sellerOcc')}</td></tr>
        <tr><td class="lbl">رقم الهاتف:</td><td>${g('sellerPhone')}</td></tr>
        <tr><td class="lbl">السكن:</td><td>${g('sellerCity')}</td></tr>
      </table>
    </td>
    <td style="width:50%;vertical-align:top;border:none;padding:0">
      <table>
        <tr><td colspan="2" style="background:#ddd;font-weight:bold;text-align:center">الطرف الثاني (المشتري)</td></tr>
        <tr><td class="lbl">الاسم:</td><td>${g('buyerName')}</td></tr>
        <tr><td class="lbl">رقم الهوية:</td><td>${g('buyerId')}</td></tr>
        <tr><td class="lbl">المهنة:</td><td>${g('buyerOcc')}</td></tr>
        <tr><td class="lbl">رقم الهاتف:</td><td>${g('buyerPhone')}</td></tr>
        <tr><td class="lbl">السكن:</td><td>${g('buyerCity')}</td></tr>
      </table>
    </td>
  </tr></table>
  <div class="stitle">بيانات السيارة والمبالغ</div>
  <table>
    <tr>
      <td><strong>النوع:</strong> ${g('contractBrand')}</td>
      <td><strong>الموديل:</strong> ${g('contractYear')}</td>
      <td><strong>اللون:</strong> ${g('contractColor')}</td>
    </tr>
    <tr>
      <td><strong>رقم المحرك:</strong> ${g('contractEngineNo')}</td>
      <td colspan="2"><strong>رقم الشاسي:</strong> ${g('contractVin')}</td>
    </tr>
    <tr>
      <td><strong>السعر الكلي:</strong> $${Number(g('contractTotal')).toLocaleString()}</td>
      <td><strong>المبلغ المسدد:</strong> $${Number(g('contractDown')).toLocaleString()}</td>
      <td><strong>المبلغ المتبقي:</strong> $${Number(g('contractRemaining')).toLocaleString()}</td>
    </tr>
    <tr>
      <td><strong>مبلغ القسط:</strong> $${Number(g('contractMonthly')).toLocaleString()}/شهر</td>
      <td><strong>عدد الأشهر:</strong> ${g('contractMonths')} شهر</td>
      <td><strong>أول قسط:</strong> ${fd(g('contractFirstDate'))}</td>
    </tr>
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
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=750,scrollbars=yes');
    w.document.write(html);
    w.document.close();
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

    // Contract defaults
    const today = new Date().toISOString().split('T')[0];
    const el = document.getElementById('contractDate');
    if (el) el.value = today;
    const firstDate = new Date(); firstDate.setMonth(firstDate.getMonth() + 1); firstDate.setDate(1);
    const elFirst = document.getElementById('contractFirstDate');
    if (elFirst) elFirst.value = firstDate.toISOString().split('T')[0];
    if (currentUser) {
        const sn = document.getElementById('sellerName'); if (sn) sn.value = currentUser.name || '';
        const sp = document.getElementById('sellerPhone'); if (sp) sp.value = currentUser.phone || '';
    }

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

// ── Contract car picker ───────────────────────────────────

async function loadContractCars() {
    try {
        const res  = await fetch(`${API_BASE_URL}/cars`);
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
        const res = await fetch(`${API_BASE_URL}/cars/${carId}`);
        const car = await res.json();
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('contractBrand',  car.brand);
        set('contractYear',   `${car.year} ${car.model}`);
        set('contractColor',  car.color);
        set('contractVin',    car.vin);
        set('contractPlate',  car.plateNumber);
        set('contractTotal',  car.price);
        updateContractRemaining();
    } catch (e) { console.error(e); }
}

// ── Mobile menu ───────────────────────────────────────────

function toggleMobileMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.querySelector('.sidebar-backdrop')?.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    if (window.innerWidth > 767) return;
    if (e.target.closest('.menu-item')) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar?.classList.contains('open')) toggleMobileMenu();
    }
});
