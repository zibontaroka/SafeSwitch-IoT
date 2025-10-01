//  zones_control.js (Frontend)

const BASE_URL = `${window.location.protocol}//${window.location.host}`;
//const BASE_URL = 'http://localhost:4000';
const zoneControlTableBody = document.getElementById('zoneControlTableBody');
const handoverModal = document.getElementById('handoverModal');
const handoverZoneId = document.getElementById('handoverZoneId');
const linemanSelect = document.getElementById('linemanSelect');
const confirmHandover = document.getElementById('confirmHandover');
const cancelHandoverBtn = document.getElementById('cancelHandoverBtn');

let zones = [];
let linemen = [];

// ✅ Prevent redeclaration across scripts
if (typeof token === 'undefined') {
  var token = localStorage.getItem('token');
}

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

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}


async function fetchZones() {
  try {
    const res = await fetch(`${BASE_URL}/api/control/zones/with-control`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    if (data.success && Array.isArray(data.zones)) {
      zones = data.zones;
      renderZones();
    } else {
      alert('Failed to load zones');
    }
  } catch (err) {
    alert('Error loading zones: ' + err.message);
  }
}

async function fetchLinemen() {
  try {
    const res = await fetch(`${BASE_URL}/api/users/linemen`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    if (data.success && Array.isArray(data.linemen)) {
      linemen = data.linemen;
      populateLinemanDropdown();
    } else {
      alert('Failed to load linemen');
    }
  } catch (err) {
    alert('Error loading linemen: ' + err.message);
  }
}

function renderZones() {
  zoneControlTableBody.innerHTML = '';
  zones.forEach(z => {
    const isHandover = z.control_active;
    const linemanName = z.lineman_name || 'N/A';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.name}</td>
      <td class="${z.status ? 'status-on' : 'status-off'}">${z.status ? 'Active' : 'Inactive'}</td>
      <td>${isHandover ? 'Handed to ' + linemanName : 'Operator'}</td>
      <td>
        <button class="btn-primary toggle-btn ${isHandover ? 'disabled-btn soft-blink' : ''}"
                data-id="${z.id}" data-status="${z.status}" ${isHandover ? 'disabled' : ''}>
          ${z.status ? 'Turn Off' : 'Turn On'}
        </button>
      </td>
      <td>
        <button class="btn-secondary handover-btn ${isHandover ? 'disabled-btn soft-blink' : ''}"
                data-id="${z.id}" ${isHandover ? 'disabled' : ''}>
          Handover
        </button>
      </td>`;
    zoneControlTableBody.appendChild(tr);
  });

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.onclick = () => toggleZone(btn.dataset.id, btn.dataset.status === 'true' ? false : true);
    }
  });
  document.querySelectorAll('.handover-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.onclick = () => openHandoverModal(btn.dataset.id);
    }
  });
}

async function toggleZone(id, newStatus) {
  try {
    const res = await fetch(`${BASE_URL}/api/control/zones/${id}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) fetchZones();
    else alert(data.message || 'Toggle failed');
  } catch (err) {
    alert('Error toggling zone: ' + err.message);
  }
}

async function openHandoverModal(zoneId) {
  handoverZoneId.value = zoneId;
  await fetchLinemen();
  handoverModal.classList.remove('hidden');
}

function populateLinemanDropdown() {
  linemanSelect.innerHTML = '';
  linemen.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.full_name;
    linemanSelect.appendChild(opt);
  });
}

confirmHandover.onclick = async () => {
  const zoneId = handoverZoneId.value;
  const linemanId = linemanSelect.value;
  if (!linemanId) return alert('Please select a lineman');
  try {
    const res = await fetch(`${BASE_URL}/api/control/zones/handover/zone`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ zone_id: zoneId, lineman_id: linemanId })
    });
    const data = await res.json();
    if (data.success) {
      handoverModal.classList.add('hidden');
      fetchZones();
    } else {
      alert(data.message || 'Handover failed');
    }
  } catch (err) {
    alert('Error during handover: ' + err.message);
  }
};

cancelHandoverBtn.onclick = () => {
  handoverModal.classList.add('hidden');
};

// Initial load + polling
fetchZones();
setInterval(fetchZones, 5000);
