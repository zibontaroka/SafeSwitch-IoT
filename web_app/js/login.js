// js/login.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  if (!form) return;

  // Determine role from URL like login_manager.html
  const pathParts = window.location.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  const match = filename.match(/login_(.*?)\.html/);
  const role = match ? match[1] : null;

  if (!role) {
    console.error('Role could not be determined from URL filename.');
    return;
  }

  const errorEl = form.querySelector('.error-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = form.querySelector('input[name="identifier"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;

    if (!identifier || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(`/api/auth/login/${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.message || 'Login failed';
        errorEl.style.display = 'block';
        return;
      }

      // Save JWT & role in localStorage
      localStorage.setItem('token', data.token);
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      localStorage.setItem('role', payload.role);

      // Redirect path mapping based on role
      const roleRedirectMap = {
        manager: '/admin/manager_dashboard.html',
        operator: '/operator/operator_dashboard.html',
        lineman: '/lineman/lineman_dashboard.html',
        viewer: '/viewer/viewer_dashboard.html'
      };

      const roleName = payload.role.toLowerCase();
      const redirectPath = roleRedirectMap[roleName];

      if (redirectPath) {
        window.location.href = redirectPath;
      } else {
        console.error('Unknown role for redirection:', roleName);
        errorEl.textContent = 'Unauthorized role';
        errorEl.style.display = 'block';
      }

    } catch (err) {
      console.error('Login error:', err);
      errorEl.textContent = 'Something went wrong';
      errorEl.style.display = 'block';
    }
  });
});
