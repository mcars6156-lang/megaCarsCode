var API_BASE_URL = '/api';

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: document.getElementById('password').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value
    };
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            window.location.href = result.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        } else {
            alert(result.message || t('alert.registrationFailed'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert(t('alert.registrationError'));
    }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            window.location.href = result.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        } else {
            alert(result.message || t('alert.loginFailed'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert(t('alert.loginError'));
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) return null;
    return JSON.parse(user);
}

function updateLoginButton() {
    const user = checkAuth();
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', updateLoginButton);
