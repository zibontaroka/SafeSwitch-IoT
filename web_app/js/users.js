// js/users.js

document.addEventListener('DOMContentLoaded', () => {
  const addUserBtn = document.getElementById('addUserBtn');
  const userModal = document.getElementById('userModal');
  const userForm = document.getElementById('userForm');
  const cancelUserBtn = document.getElementById('cancelUserBtn');
  const userTableBody = document.getElementById('userTableBody');
  const modalTitle = document.getElementById('modalTitle');


const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/admin/login_manager.html';
  return;
}

try {
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.role !== 'Manager') {
    window.location.href = '/unauthorized.html';
    return;
  }
  
  const username = payload.username;
  const usernameElement = document.getElementById('username');
  if (usernameElement) {
    usernameElement.textContent = username;
  }
} catch {
  window.location.href = '/admin/login_manager.html';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}



  // Open modal for Add User
  addUserBtn.addEventListener('click', () => {
    openAddModal();
  });

  // Close modal
  cancelUserBtn.addEventListener('click', () => {
    userModal.classList.add('hidden');
  });

  // Open Add User modal helper
  function openAddModal() {
    userForm.reset();
    userForm.userId.value = ''; // clear hidden id field
    modalTitle.textContent = 'Add New User';
    userModal.classList.remove('hidden');
  }

  // Open Edit User modal helper
  function openEditModal(user) {
    modalTitle.textContent = 'Edit User';
    userModal.classList.remove('hidden');

    // Populate form fields
    userForm.userId.value = user.id;
    userForm.full_name.value = user.full_name || '';
    userForm.username.value = user.username || '';
    userForm.email.value = user.email || '';
    userForm.phone.value = user.phone || '';
    userForm.password.value = ''; // empty password means no change
    userForm.role.value = user.role_name || '';
    userForm.is_active.value = user.is_active ? 'true' : 'false';
  }

  // Submit user form to create or update user
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(userForm);
    const data = Object.fromEntries(formData.entries());

    // Convert is_active to boolean
    data.is_active = data.is_active === 'true';

    const isEdit = !!data.userId;

    try {
      const res = await fetch(isEdit ? `/api/users/${data.userId}` : '/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
        return;
      }

      userModal.classList.add('hidden');
      fetchUsers();

    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} user:`, err);
      alert('Something went wrong');
    }
  });

  // Fetch users and populate the table
  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!data.success) {
        alert('Failed to load users');
        return;
      }

      userTableBody.innerHTML = '';

      data.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.full_name || ''}</td>
          <td>${user.username}</td>
          <td>${user.phone}</td>
          <td>${user.email}</td>
          <td>${user.role_name}</td>
          <td class="${user.is_active ? 'status-on' : 'status-off'}">
            ${user.is_active ? 'Active' : 'Inactive'}
          </td>
          <td>
            <button class="btn-primary btn-edit" data-id="${user.id}">Edit</button>
          </td>
        `;
        userTableBody.appendChild(tr);
      });

      // Attach event listeners for Edit buttons
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const user = data.users.find(u => u.id == id);
          if (user) openEditModal(user);
        };
      });

    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  // Deactivate (soft-delete) user
  window.deactivateUser = async (id) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();

      if (result.success) {
        fetchUsers();
      } else {
        alert(result.message || 'Failed to deactivate user');
      }
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  // Initial load of users
  fetchUsers();
});
