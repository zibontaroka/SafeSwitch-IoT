// js/revoke.js

const BASE_URL = `${window.location.protocol}//${window.location.host}`;
//const BASE_URL = 'http://localhost:4000';
let currentControl = null;
let currentAction = null; // 'revoke' or 'toggle'

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Load zones and feeders
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert("Please login first.");
    window.location.href = "/lineman/login_lineman.html";
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/control/revoke/active`, {
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load');

    const controlsTbody = document.getElementById('controls');
    controlsTbody.innerHTML = '';

    const zones = data.zones || [];
    const feeders = data.feeders || [];

    zones.forEach(z => renderRow(z, 'zone'));
    feeders.forEach(f => renderRow(f, 'feeder'));

  } catch (err) {
    console.error("Error loading handovers", err);
    document.getElementById('controls').innerHTML = `<tr><td colspan="4" style="color:red;">${err.message}</td></tr>`;
  }
});

function renderRow(item, type) {
  const controlsTbody = document.getElementById('controls');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${type.toUpperCase()} - ${item.name}</td>
    <td class="${item.status ? 'status-on' : 'status-off'}">${item.status ? 'Active' : 'Inactive'}</td>
    <td>
      <button class="btn-primary" onclick="confirmAction(${item.id}, '${type}', ${!item.status}, 'toggle')">
        ${item.status ? 'Turn Off' : 'Turn On'}
      </button>
    </td>
    <td>
      <button class="btn-secondary" onclick="confirmAction(${item.id}, '${type}', null, 'revoke')">Return Control</button>
    </td>
  `;
  controlsTbody.appendChild(tr);
}

function confirmAction(id, type, toggleStatus = null, actionType) {
  currentControl = { id, type, toggleStatus };
  currentAction = actionType;
  document.getElementById('pinModal').classList.remove('hidden');
  document.getElementById('pinInput').value = '';
  const errorEl = document.getElementById('pinError');
  errorEl.textContent = '';
  errorEl.style.display = 'none'; // Hide initially
}

function closeModal() {
  document.getElementById('pinModal').classList.add('hidden');
  document.getElementById('pinInput').value = '';
  const errorEl = document.getElementById('pinError');
  errorEl.textContent = '';
  errorEl.style.display = 'none';
}

document.getElementById('confirmRevoke').addEventListener('click', async () => {
  const pin = document.getElementById('pinInput').value.trim();
  const errorEl = document.getElementById('pinError');

  // Clear previous error
  errorEl.textContent = '';
  errorEl.style.display = 'none';

  if (!pin || pin.length !== 4) {
    errorEl.textContent = 'PIN must be exactly 4 digits';
    errorEl.style.display = 'block';
    return;
  }

  try {
    // Step 1: Verify PIN
    const verifyRes = await fetch(`${BASE_URL}/api/pin/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pin })
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success) {
      errorEl.textContent = verifyData.message || 'Invalid PIN';
      errorEl.style.display = 'block';
      return;
    }

    // Step 2: Do action
    if (!currentControl || !currentAction) {
      errorEl.textContent = 'Invalid action';
      errorEl.style.display = 'block';
      return;
    }

    let endpoint = '';
    let method = 'POST';
    let payload = {};

    if (currentAction === 'toggle') {
      const route = currentControl.type === 'zone' ? 'zones' : 'feeders';
      endpoint = `/api/control/${route}/${currentControl.id}/toggle`;
      payload = { status: currentControl.toggleStatus };
    } else if (currentAction === 'revoke') {
      endpoint = `/api/control/revoke`;
      payload = {
        id: currentControl.id,
        type: currentControl.type,
        pin
      };
    }

    const actionRes = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const actionData = await actionRes.json();

    if (!actionRes.ok || !actionData.success) {
      errorEl.textContent = actionData.message || 'Action failed';
      errorEl.style.display = 'block';
      return;
    }

    // Success, reload page or update UI accordingly
    location.reload();

  } catch (err) {
    console.error("Error confirming action", err);
    errorEl.textContent = 'Network error';
    errorEl.style.display = 'block';
  }
});

// Keep this for "Change PIN" modal open
function openPinModal() {
  document.getElementById('changePinModal').classList.remove('hidden');
}
