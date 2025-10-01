//  js/relay.js


(() => {
  const BASE_URL = `${window.location.protocol}//${window.location.host}`;
  //const API_BASE_RELAYS = 'http://localhost:4000/api/relays';

  async function fetchRelays() {
    try {
      const res = await fetch(API_BASE_RELAYS);
      if (!res.ok) throw new Error('Failed to fetch relays');
      const relays = await res.json();

      const tbody = document.getElementById('relayTableBody');
      tbody.innerHTML = '';

      relays.forEach(relay => {
        const tr = document.createElement('tr');
        const statusText = relay.relay_status ? 'ON' : 'OFF';
        const statusClass = relay.relay_status ? 'status-on' : 'status-off';

        tr.innerHTML = `
          <td>${relay.relay_uid}</td>
          <td>${relay.device_uid}</td>
          <td>${relay.gpio_pin}</td>
          <td class="${statusClass}">${statusText}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error fetching relays:', err);
    }
  }

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
         // console.log('Received update - refreshing relay data');
          fetchRelays();
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
    fetchRelays();
    setupWebSocket();
  });
  
})();
