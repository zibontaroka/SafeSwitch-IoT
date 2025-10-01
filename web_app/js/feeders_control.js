// js/feeders_control.js

document.addEventListener('DOMContentLoaded', () => {
  
  const BASE_URL = `${window.location.protocol}//${window.location.host}`;
  //const BASE_URL = 'http://localhost:4000';

  const feederTableBody = document.getElementById('feederTableBody');
  const handoverModal = document.getElementById('handoverModal');
  const modalFeederName = document.getElementById('modalFeederName');
  const linemanSelect = document.getElementById('linemanSelect');
  const confirmHandoverBtn = document.getElementById('confirmHandoverBtn');
  const cancelHandoverBtn = document.getElementById('cancelHandoverBtn');

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/operator/login_operator.html';
  } else {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'Operator') {
        window.location.href = '/unauthorized.html';
      }
    } catch {
      window.location.href = '/operator/login_operator.html';
    }
  }

  // ✅ FIXED: define as a function, then CALL it when needed
  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  let feeders = [];

  async function fetchFeeders() {
    try {
      const res = await fetch(`${BASE_URL}/api/control/feeders/with-control`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      feeders = data.feeders || [];
      renderFeeders();
    } catch (err) {
      alert('Error loading feeders: ' + err.message);
    }
  }

  function renderFeeders() {
    feederTableBody.innerHTML = '';

    if (feeders.length === 0) {
      feederTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No feeders found</td></tr>`;
      return;
    }

    feeders.forEach(f => {
      const isHandover = f.control_active;
      const linemanName = f.lineman_name || 'N/A';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.name}</td>
        <td class="${f.status ? 'status-on' : 'status-off'}">${f.status ? 'Active' : 'Inactive'}</td>
        <td>${isHandover ? 'Handed to ' + linemanName : 'Operator'}</td>
        <td>
          <button
            class="btn-primary toggle-btn ${isHandover ? 'disabled-btn soft-blink' : ''}"
            data-id="${f.id}" data-status="${f.status}"
            ${isHandover ? 'disabled' : ''}>
            ${f.status ? 'Turn Off' : 'Turn On'}
          </button>
        </td>
        <td>
          <button
            class="btn-secondary handover-btn ${isHandover ? 'disabled-btn soft-blink' : ''}"
            data-id="${f.id}" data-name="${f.name}"
            ${isHandover ? 'disabled' : ''}>
            Handover
          </button>
        </td>
      `;
      feederTableBody.appendChild(tr);
    });

    attachToggleListeners();
    attachHandoverListeners();
  }

  function attachToggleListeners() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      if (!btn.disabled) {
        btn.onclick = async () => {
          const feederId = btn.dataset.id;
          const newStatus = btn.dataset.status === 'true' ? false : true;

          try {
            const res = await fetch(`${BASE_URL}/api/control/feeders/${feederId}/toggle`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Toggle request failed');
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Toggle failed');
            await fetchFeeders();
          } catch (err) {
            alert('Toggle error: ' + err.message);
          }
        };
      }
    });
  }

  function attachHandoverListeners() {
    document.querySelectorAll('.handover-btn').forEach(btn => {
      if (!btn.disabled) {
        btn.onclick = async () => {
          const feederId = btn.dataset.id;
          modalFeederName.textContent = btn.dataset.name;
          handoverModal.dataset.feederId = feederId;

          try {
            const res = await fetch(`${BASE_URL}/api/users/linemen`, {
              headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch linemen');
            const data = await res.json();
            if (!data.success || !Array.isArray(data.linemen)) throw new Error('No linemen found');

            linemanSelect.innerHTML = data.linemen.map(user =>
              `<option value="${user.id}">${user.full_name}</option>`
            ).join('');
            handoverModal.classList.remove('hidden');
          } catch (err) {
            alert('Error loading linemen: ' + err.message);
          }
        };
      }
    });
  }

  confirmHandoverBtn.onclick = async () => {
    const feederId = handoverModal.dataset.feederId;
    const linemanId = linemanSelect.value;
    if (!linemanId) return alert('Please select a lineman');

    try {
      const res = await fetch(`${BASE_URL}/api/control/feeders/handover`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ feeder_id: feederId, lineman_id: linemanId })
      });
      if (!res.ok) throw new Error('Handover request failed');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Handover failed');
      handoverModal.classList.add('hidden');
      await fetchFeeders();
    } catch (err) {
      alert('Handover error: ' + err.message);
    }
  };

  cancelHandoverBtn.onclick = () => {
    handoverModal.classList.add('hidden');
  };

  // Initial load + polling
  fetchFeeders();
  setInterval(fetchFeeders, 5000);
});
