//  js/devices.js


(() => {

  const BASE_URL = `${window.location.protocol}//${window.location.host}`;
  // const API_BASE_DEVICES = 'http://localhost:4000/api/devices';


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

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async function fetchDevices() {
    try {
      const res = await fetch(API_BASE_DEVICES);
      if (!res.ok) throw new Error('Failed to fetch devices');
      const devices = await res.json();

      const tbody = document.getElementById('deviceTableBody');
      tbody.innerHTML = '';

      devices.forEach(device => {
        const tr = document.createElement('tr');
        const statusText = device.status ? 'Active' : 'Inactive';
        const statusClass = device.status ? 'status-on' : 'status-off';

        tr.innerHTML = `
          <td>${device.device_uid}</td>
          <td class="${statusClass}">${statusText}</td>
          <td>${device.last_seen ? new Date(device.last_seen).toLocaleString() : 'N/A'}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetchDevices();
  });

  // WebSocket setup if you want real-time updates for devices as well
  let ws;
  function setupWebSocket() {
    ws = new WebSocket('ws://localhost:4001/ws');

    ws.onopen = () => {
      //console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'device_update' || msg.type === 'relay_update') {
         // console.log('Received update - refreshing device data');
          fetchDevices();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onclose = () => {
      //console.log('WebSocket disconnected, reconnecting in 3s...');
      setTimeout(setupWebSocket, 3000);
    };

    ws.onerror = err => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  }
  document.addEventListener('DOMContentLoaded', () => {
    setupWebSocket();
  });

})();
