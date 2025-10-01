// js/zones.js


const BASE_URL = `${window.location.protocol}//${window.location.host}`;
//const BASE_URL = 'http://localhost:4000';
const zoneTableBody = document.getElementById('zoneTableBody');
const addZoneBtn = document.getElementById('addZoneBtn');
const zoneModal = document.getElementById('zoneModal');
const zoneForm = document.getElementById('zoneForm');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const relaySelectContainer = document.getElementById('relaySelectContainer');
const addRelayBtn = document.getElementById('addRelayBtn');

let editingZoneId = null;
let cachedRelays = [];

// Auth check - only Operator
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


async function fetchFreeRelays() {
  try {
    const res = await fetch(`${BASE_URL}/api/relays/free`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch free relays');
    const data = await res.json();
    if (data.success) return data.relays;
    throw new Error('Failed to fetch free relays');
  } catch (err) {
    alert('Error loading free relays: ' + err.message);
    return [];
  }
}

function renderZones(zones) {
  zoneTableBody.innerHTML = '';
  zones.forEach(z => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.name}</td>
      <td class="${z.status ? 'status-on' : 'status-off'}">${z.status ? 'Active' : 'Inactive'}</td>
      <td>${z.relays.length ? z.relays.join(', ') : 'None'}</td>
      <td>
        <button class="btn-primary btn-edit" data-id="${z.id}">Edit</button>
        <button class="btn-secondary btn-delete" data-id="${z.id}">Delete</button>
      </td>
    `;
    zoneTableBody.appendChild(tr);
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => openEditModal(btn.dataset.id);
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => deleteZone(btn.dataset.id);
  });
}

function createRelayDropdown(relays, selected = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown-wrapper'; // keep consistent styling

  const select = document.createElement('select');
  select.name = 'relaySelect[]';
  select.required = true;
  select.className = 'input-select';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select Relay --';
  select.appendChild(defaultOption);

  relays.forEach(relay => {
    const option = document.createElement('option');
    option.value = relay.relay_uid;
    option.textContent = `${relay.relay_uid} (GPIO ${relay.gpio_pin})`;
    if (relay.relay_uid === selected) option.selected = true;
    select.appendChild(option);
  });

  wrapper.appendChild(select);

  // ✅ Always include a remove button
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '❌';
  removeBtn.className = 'btn-secondary remove-btn';
  removeBtn.onclick = () => wrapper.remove();
  wrapper.appendChild(removeBtn);

  relaySelectContainer.appendChild(wrapper);
}


addZoneBtn.onclick = async () => {
  editingZoneId = null;
  modalTitle.textContent = 'Add New Zone';
  zoneForm.reset();
  relaySelectContainer.innerHTML = '';

  cachedRelays = await fetchFreeRelays();
  createRelayDropdown(cachedRelays);

  zoneModal.classList.remove('hidden');
};

addRelayBtn.onclick = () => {
  createRelayDropdown(cachedRelays);
};

cancelBtn.onclick = () => {
  zoneModal.classList.add('hidden');
};

async function openEditModal(id) {
  editingZoneId = id;
  modalTitle.textContent = 'Edit Zone';
  zoneForm.reset();
  relaySelectContainer.innerHTML = '';

  try {
    const resZone = await fetch(`${BASE_URL}/api/zones/${id}`, { headers: getAuthHeaders() });
    if (!resZone.ok) throw new Error('Failed to fetch zone data');
    const dataZone = await resZone.json();
    if (!dataZone.success) throw new Error('Failed to fetch zone data');

    const zone = dataZone.zone;

    cachedRelays = await fetchFreeRelays();
    const zoneRelaysSet = new Set(zone.relays);

    // Combine zone relays + free relays for dropdown
    const combinedRelays = [...zone.relays.map(uid => {
      // For each assigned relay, find gpio_pin or fallback '?'
      const relayObj = cachedRelays.find(r => r.relay_uid === uid) || { relay_uid: uid, gpio_pin: '?' };
      return relayObj;
    }), ...cachedRelays.filter(r => !zoneRelaysSet.has(r.relay_uid))];

    zoneForm.zoneName.value = zone.name;
    relaySelectContainer.innerHTML = '';
    if (combinedRelays.length) {
      combinedRelays.forEach(relay => {
        createRelayDropdown(combinedRelays, zoneRelaysSet.has(relay.relay_uid) ? relay.relay_uid : '');
      });
    } else {
      createRelayDropdown(combinedRelays);
    }

    zoneModal.classList.remove('hidden');
  } catch (err) {
    alert('Error loading zone: ' + err.message);
  }
}

zoneForm.onsubmit = async e => {
  e.preventDefault();

  const name = zoneForm.zoneName.value.trim();
  const relays = Array.from(document.getElementsByName('relaySelect[]'))
    .map(sel => sel.value)
    .filter(v => v !== '');

  if (!name) return alert('Zone name is required');
  if (!relays.length) return alert('Please assign at least one relay');

  const payload = { name, relays, status: false };

  let url = `${BASE_URL}/api/zones`;
  let method = 'POST';

  if (editingZoneId) {
    url = `${BASE_URL}/api/zones/${editingZoneId}`;
    method = 'PUT';
  }

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save zone');
    const data = await res.json();

    if (data.success) {
      zoneModal.classList.add('hidden');
      await fetchZones();
    } else {
      alert('Failed to save zone: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error saving zone: ' + err.message);
  }
};

async function deleteZone(id) {
  if (!confirm('Delete this zone?')) return;
  try {
    const res = await fetch(`${BASE_URL}/api/zones/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete zone');
    const data = await res.json();
    if (data.success) await fetchZones();
    else alert('Failed to delete zone');
  } catch (err) {
    alert('Error deleting zone: ' + err.message);
  }
}

async function fetchZones() {
  try {
    const res = await fetch(`${BASE_URL}/api/zones`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load zones');
    const data = await res.json();
    if (data.success) renderZones(data.zones);
    else alert('Failed to load zones: ' + data.error);
  } catch (err) {
    alert('Error loading zones: ' + err.message);
  }
}


// Initial fetch and refresh every 5 seconds
fetchZones();
fetchRelaySummary();
setInterval(() => {
  fetchZones();
  fetchRelaySummary();
}, 5000);
