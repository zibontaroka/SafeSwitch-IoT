document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin/login_manager.html'; // fallback
    return;
  }
  
  async function fetchDashboardStats() {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      if (data.success) {
        const safeSetText = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
          else console.warn(`Element with id '${id}' not found`);
        };

        safeSetText('totalRelays', data.total_relays);
        safeSetText('usedRelays', data.used_relays);
        safeSetText('freeRelays', data.free_relays);
        safeSetText('totalDevices', data.total_devices);
        safeSetText('activeDevices', data.active_devices);
        safeSetText('totalZones', data.total_zones);
        safeSetText('activeZones', data.active_zones);
        safeSetText('totalFeeders', data.total_feeders);
        safeSetText('activeFeeders', data.active_feeders);
      } else {
        console.error('Failed to load dashboard stats:', data.error);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }
//===================================== for zone status table ==============================================
  async function fetchZoneStatus() {
    try {
      const res = await fetch('/api/dashboard/zones-status', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (!res.ok) throw new Error('Failed to fetch zones');

      const data = await res.json();

      if (data.success) {
        const tbody = document.getElementById('zoneStatusTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.zones.forEach(z => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${z.name}</td>
            <td>${z.reason || ''}</td>
            <td class="${z.status ? 'status-on' : 'status-off'}">
              ${z.status ? 'Active' : 'Inactive'}
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (err) {
      console.error('Error fetching zone status:', err);
    }
  }

// =============================== for relay and device table =========================================

  async function fetchRelayStatus() {
    try {
      const res = await fetch('/api/dashboard/relays-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch relays');

      const data = await res.json();
      if (!data.success) throw new Error('Failed to load');

      const tableBody = document.getElementById('relayStatusTable');
      if (!tableBody) return;
      tableBody.innerHTML = '';

      Object.entries(data.devices).forEach(([deviceUID, info]) => {
        const tr = document.createElement('tr');

        // Device cell
        const deviceCell = document.createElement('td');
        deviceCell.textContent = deviceUID;
        deviceCell.className = info.device_status ? 'status-on' : 'status-off';
        tr.appendChild(deviceCell);

        // Relay cells
        info.relays.forEach(relay => {
          const td = document.createElement('td');
          if (relay) {
            td.textContent = relay.relay_uid;
            td.className = relay.status ? 'status-on' : 'status-off';
          } else {
            td.textContent = '—';
            td.className = 'status-off'; // optional fallback
          }
          tr.appendChild(td);
        });

        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error loading relay status:', err);
    }
  }

  // Initial calls
  fetchDashboardStats();
  fetchZoneStatus();
  fetchRelayStatus();

  // Periodic updates
  setInterval(fetchDashboardStats, 5000);
  setInterval(fetchZoneStatus, 5000);
  setInterval(fetchRelayStatus, 5000);
});
