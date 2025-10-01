//  js/index.js


// Prevent re-declaration if already defined
if (typeof token === 'undefined') {
  var token = localStorage.getItem('token');
}

// DOM elements
const sideMenu = document.querySelector('aside');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const darkMode = document.querySelector('.dark-mode');

// ✅ Toggle and save theme
async function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode-variables');
  darkMode.querySelector('span:nth-child(1)').classList.toggle('active');
  darkMode.querySelector('span:nth-child(2)').classList.toggle('active');

  const newTheme = isDark ? 'dark' : 'light';
  try {
    const res = await fetch('/api/profile/theme', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ theme: newTheme })
    });
    if (!res.ok) {
      const err = await res.json();
      console.warn('Theme update failed:', err.error || 'Unknown error');
    }
  } catch (err) {
    console.error('Theme save failed:', err);
  }
}

// ✅ Load and apply theme on page load
async function loadUserTheme() {
  try {
    const res = await fetch('/api/profile/theme', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!res.ok) {
      console.warn('Theme fetch failed:', res.status);
      return;
    }

    const data = await res.json();
    if (data.success && data.theme === 'dark') {
      document.body.classList.add('dark-mode-variables');
      darkMode.querySelector('span:nth-child(1)').classList.add('active');
      darkMode.querySelector('span:nth-child(2)').classList.remove('active');
    }
  } catch (err) {
    console.error('Theme fetch error:', err);
  }
}

// ✅ Event bindings
menuBtn?.addEventListener('click', () => sideMenu.style.display = 'block');
closeBtn?.addEventListener('click', () => sideMenu.style.display = 'none');
darkMode?.addEventListener('click', toggleTheme);

// ✅ Run on page load
document.addEventListener('DOMContentLoaded', () => {
  loadUserTheme();
});



document.addEventListener('DOMContentLoaded', () => {
  // Load user theme
  loadUserTheme();

  // Token and logout setup
  const token = localStorage.getItem('token');
  if (!token) return;

  let payload;
  try {
    payload = JSON.parse(atob(token.split('.')[1]));
  } catch {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
    return;
  }

  const usernameEl = document.getElementById('username');
  if (usernameEl && payload.username) {
    usernameEl.textContent = payload.username;
  }

  const roleLogoutMap = {
    'Manager': { btnId: 'logout-manager', redirect: '/admin/login_manager.html' },
    'Operator': { btnId: 'logout-operator', redirect: '/operator/login_operator.html' },
    'Viewer': { btnId: 'logout-viewer', redirect: '/viewer/login_viewer.html' },
    'Lineman': { btnId: 'logout-lineman', redirect: '/lineman/login_lineman.html' },
  };

  const roleData = roleLogoutMap[payload.role];
  if (roleData) {
    const logoutBtn = document.getElementById(roleData.btnId);
    if (logoutBtn) {
      logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = roleData.redirect;
      });
    }
  }
});
