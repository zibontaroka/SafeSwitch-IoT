(() => {
  
  const BASE_URL = `${window.location.protocol}//${window.location.host}`;

  //const API_BASE = 'http://localhost:4000/api/feeders';

  // Check token & role on page load
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/operator/login_operator.html';
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'Operator') {
      window.location.href = '/unauthorized.html';
      return;
    }
  } catch {
    window.location.href = '/operator/login_operator.html';
    return;
  }

  // Elements
  const feedersTableBody = document.getElementById('feedersTableBody');
  const feederModal = document.getElementById('feederModal');
  const feederForm = document.getElementById('feederForm');
  const modalTitle = document.getElementById('modalTitle');
  const feederNameInput = document.getElementById('feederName');
  const zoneSelectContainer = document.getElementById('zoneSelectContainer');
  const relaySelectContainer = document.getElementById('relaySelectContainer');
  const addFeederBtn = document.getElementById('addFeederBtn');
  const addZoneBtn = document.getElementById('addZoneBtn');
  const addRelayBtn = document.getElementById('addRelayBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  let editingFeederId = null;

  // Helper for headers with auth
  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Fetch feeders and render
  async function fetchFeeders() {
    try {
      const res = await fetch(API_BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch feeders');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch feeders');
      renderFeeders(data.feeders);
    } catch (err) {
      console.error('Error loading feeders:', err);
      feedersTableBody.innerHTML = `<tr><td colspan="5">Failed to load feeders</td></tr>`;
    }
  }

  function renderFeeders(feeders) {
    feedersTableBody.innerHTML = '';
    if (feeders.length === 0) {
      feedersTableBody.innerHTML = `<tr><td colspan="5">No feeders found.</td></tr>`;
      return;
    }
    feeders.forEach(f => {
      const tr = document.createElement('tr');
      const statusText = f.status ? 'Active' : 'Inactive';
      const zonesText = f.zones.map(z => z.name).join(', ') || 'None';
      const relaysText = f.relays ? f.relays.join(', ') : 'None';
      tr.innerHTML = `
        <td>${f.feeder_name}</td>
        <td>${statusText}</td>
        <td>${zonesText}</td>
        <td>${relaysText}</td>
        <td>
          <button class="btn-primary edit-btn" data-id="${f.feeder_id}">Edit</button>
          <button class="btn-secondary cancelBtn" data-id="${f.feeder_id}">Delete</button>
        </td>
      `;
      feedersTableBody.appendChild(tr);
    });
  }

  // Fetch zones for dropdowns
  async function fetchZones() {
    try {
      const res = await fetch('http://localhost:4000/api/zones', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch zones');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch zones');
      return data.zones;
    } catch (err) {
      console.error('Error fetching zones:', err);
      return [];
    }
  }

  // Fetch free relays for dropdowns
  async function fetchFreeRelays() {
    try {
      const res = await fetch('http://localhost:4000/api/feeders/free', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch relays');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch relays');
      return data.relays;
    } catch (err) {
      console.error('Error fetching relays:', err);
      return [];
    }
  }

  // Populate zone select elements
  function createZoneSelect(selectedId = null) {
    const select = document.createElement('select');
    select.name = 'zones[]';
    select.required = false;
    select.innerHTML = `<option value="">Select Zone</option>`;
    zonesList.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = z.name;
      if (selectedId && selectedId === z.id) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }

  // Populate relay select elements
  function createRelaySelect(selectedUid = null) {
    const select = document.createElement('select');
    select.name = 'relays[]';
    select.required = false;
    select.innerHTML = `<option value="">Select Relay</option>`;
    relaysList.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.relay_uid;
      opt.textContent = `${r.relay_uid} (GPIO ${r.gpio_pin})`;
      if (selectedUid && selectedUid === r.relay_uid) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }

  // Add zone select input
function addZoneSelect(selectedId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown-wrapper';

  const select = createZoneSelect(selectedId);
  wrapper.appendChild(select);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '❌';
  removeBtn.className = 'btn-secondary remove-btn';
  removeBtn.onclick = () => wrapper.remove();
  wrapper.appendChild(removeBtn);

  zoneSelectContainer.appendChild(wrapper);
}

function addRelaySelect(selectedUid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown-wrapper';

  const select = createRelaySelect(selectedUid);
  wrapper.appendChild(select);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '❌';
  removeBtn.className = 'btn-secondary remove-btn';
  removeBtn.onclick = () => wrapper.remove();
  wrapper.appendChild(removeBtn);

  relaySelectContainer.appendChild(wrapper);
}


  // Show modal for Add or Edit
  async function openModal(editId = null) {
    editingFeederId = editId;
    modalTitle.textContent = editId ? 'Edit Feeder' : 'Add Feeder';
    feederForm.reset();
    zoneSelectContainer.innerHTML = '';
    relaySelectContainer.innerHTML = '';

    zonesList = await fetchZones();
    relaysList = await fetchFreeRelays();

    if (editId) {
      // Fetch feeder info to populate form
      try {
        const res = await fetch(`${API_BASE}/${editId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch feeder data');
        const data = await res.json();
        if (!data.success) throw new Error('Failed to fetch feeder data');

        feederNameInput.value = data.feeder.name;

        // zones
        if (data.feeder.zones && data.feeder.zones.length > 0) {
          data.feeder.zones.forEach(z => addZoneSelect(z.id));
        } else {
          addZoneSelect();
        }
        // relays
        if (data.feeder.relays && data.feeder.relays.length > 0) {
          data.feeder.relays.forEach(r => addRelaySelect(r));
        } else {
          addRelaySelect();
        }
      } catch (err) {
        alert('Failed to load feeder data');
        console.error(err);
      }
    } else {
      addZoneSelect();
      addRelaySelect();
    }

    feederModal.classList.remove('hidden');
  }

  // Close modal
  function closeModal() {
    feederModal.classList.add('hidden');
    editingFeederId = null;
  }

  // Submit handler
  feederForm.onsubmit = async (e) => {
    e.preventDefault();

    const name = feederNameInput.value.trim();

    // collect zones from selects
    const zones = Array.from(zoneSelectContainer.querySelectorAll('select[name="zones[]"]'))
      .map(s => parseInt(s.value))
      .filter(v => !isNaN(v));

    // collect relays from selects
    const relays = Array.from(relaySelectContainer.querySelectorAll('select[name="relays[]"]'))
      .map(s => s.value)
      .filter(v => v);

    if (!name) {
      alert('Feeder name is required');
      return;
    }

    const payload = { name, zones, relays };

    try {
      let res;
      if (editingFeederId) {
        res = await fetch(`${API_BASE}/${editingFeederId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(API_BASE, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        alert('Failed to save feeder: ' + (errData.error || 'Unknown error'));
        return;
      }

      closeModal();
      fetchFeeders();

    } catch (err) {
      console.error('Error saving feeder:', err);
      alert('Error saving feeder');
    }
  };

  // Delete feeder
  feedersTableBody.onclick = async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure to delete this feeder?')) {
        try {
          const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error('Failed to delete feeder');
          fetchFeeders();
        } catch (err) {
          alert('Error deleting feeder');
          console.error(err);
        }
      }
    } else if (e.target.classList.contains('edit-btn')) {
      const id = e.target.getAttribute('data-id');
      openModal(id);
    }
  };

  // Add zone / relay buttons
  addZoneBtn.onclick = () => addZoneSelect();
  addRelayBtn.onclick = () => addRelaySelect();
  cancelBtn.onclick = () => closeModal();
  addFeederBtn.onclick = () => openModal(); 

  // Initial fetch on page load
  let zonesList = [];
  let relaysList = [];
  document.addEventListener('DOMContentLoaded', () => {
    fetchFeeders();
  });
})();