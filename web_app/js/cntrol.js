
// js/control.js



document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("relayTableBody");
  tbody.innerHTML = "";

  try {
    const res = await fetch("/api/relays");
    const relays = await res.json();

    // Group by device
    const grouped = {};
    relays.forEach(r => {
      if (!grouped[r.device_uid]) grouped[r.device_uid] = [];
      grouped[r.device_uid].push(r);
    });

    // Render 1 row per device
    for (const [device_uid, deviceRelays] of Object.entries(grouped)) {
      const row = document.createElement("tr");

      // Device ID column
      const tdDevice = document.createElement("td");
      tdDevice.textContent = device_uid;
      row.appendChild(tdDevice);

      // Sort by relay number (e.g., D-1, D-2...)
      deviceRelays.sort((a, b) => {
        const aNum = parseInt(a.relay_uid.split("-").pop());
        const bNum = parseInt(b.relay_uid.split("-").pop());
        return aNum - bNum;
      });

      // Create 7 buttons
      for (let i = 0; i < 7; i++) {
        const td = document.createElement("td");
        const relay = deviceRelays[i];

        if (relay) {
          const btn = document.createElement("button");
          btn.textContent = relay.relay_uid;
          btn.className = `relay-btn ${relay.relay_status ? "on" : "off"}`;
          btn.onclick = async () => {
            const updated = !relay.relay_status;
            const res = await fetch(`/api/relays/${relay.relay_uid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ relay_status: updated }),
            });
            if (res.ok) {
              relay.relay_status = updated;
              btn.className = `relay-btn ${updated ? "on" : "off"}`;
            }
          };
          td.appendChild(btn);
        } else {
          td.textContent = "-";
        }

        row.appendChild(td);
      }

      tbody.appendChild(row);
    }

  } catch (err) {
    console.error("Error loading relays:", err);
  }
});
