// public_zones.js

const BASE_URL = `${window.location.protocol}//${window.location.host}`;
//const BASE_URL = 'http://localhost:4000';

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('publicZoneTableBody');

  try {
    const res = await fetch(`${BASE_URL}/api/public/zones`);
    const zones = await res.json();

    tableBody.innerHTML = '';

    zones.forEach(z => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${z.name}</td>
        <td class="${z.status ? 'status-on' : 'status-off'}">
          ${z.status ? 'ON' : 'OFF'}
        </td>
        <td>${z.reason}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading public zones:', err);
    tableBody.innerHTML = `<tr><td colspan="3">Failed to load</td></tr>`;
  }
});
