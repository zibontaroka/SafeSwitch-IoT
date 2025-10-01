document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/viewer/login_viewer.html';
    return;
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.role !== 'Viewer') {
    window.location.href = '/viewer/login_viewer.html';
    return;
  }

  const userEl = document.getElementById('username');
  if (userEl) userEl.textContent = payload.username;

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/viewer/login_viewer.html';
  });
});
