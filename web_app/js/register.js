document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const data = {
    username: f.username.value.trim(),
    email: f.email.value.trim(),
    password: f.password.value.trim()
  };
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    alert('Registered. Now login.');
    window.location.href = '/admin/manager-login.html';
  } catch (err) {
    document.querySelector('.error').innerText = err.message;
  }
});
