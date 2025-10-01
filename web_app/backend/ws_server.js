// ws_server.js

const config = require('./config');
const WebSocket = require('ws');
const http = require('http');
const db = require('./db');

const PORT = config.WS_PORT;
const HEARTBEAT_INTERVAL = 3000; 
const SECRET_KEY = config.SECRET_KEY;
const connectedClients = {};

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/ws' });

// rest of your WebSocket server code...

server.listen(PORT, () => {
  console.log(`✅ WebSocket server running at ws://localhost:${PORT}/ws`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ WebSocket port ${PORT} is already in use. Please free the port and restart.`);
  } else {
    console.error('❌ WebSocket server error:', err);
  }
});


function heartbeat() {
  this.isAlive = true;
}

async function createRelaysForDevice(device_uid) {
  try {
    const gpioPins = [4, 5, 16, 14, 12, 13, 15];
    const queries = [];

    for (let i = 0; i < gpioPins.length; i++) {
      const relay_uid = `${device_uid}-${i + 1}`;
      const gpio_pin = gpioPins[i];

      queries.push(db.query(
        `INSERT INTO relays (relay_uid, device_uid, gpio_pin, relay_status, updated_at, created_at)
         VALUES ($1, $2, $3, false, NOW(), NOW())
         ON CONFLICT (relay_uid) DO NOTHING`,
        [relay_uid, device_uid, gpio_pin]
      ).catch(err => {
        console.error(`❌ Error inserting relay ${relay_uid}:`, err);
      }));
    }

    await Promise.all(queries);
   // console.log(`✅ Relays ensured for device ${device_uid}`);
  } catch (err) {
   // console.error(`❌ Error in createRelaysForDevice(${device_uid}):`, err);
  }
}

function broadcastDeviceUpdate() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'device_update' }));
    }
  });
 // console.log(`📢 Broadcasted device update to all clients`);
}

// Send relay_command to device to physically update relay state
function sendRelayCommandToDevice(device_uid, relay_uid, status) {
  const ws = connectedClients[device_uid];
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = {
      type: 'relay_command',
      relay_uid,
      status
    };
    ws.send(JSON.stringify(msg));
   // console.log(`📤 Sent relay_command to device ${device_uid} → ${relay_uid}: ${status}`);
  } else {
    console.warn(`⚠️ Device ${device_uid} not connected; cannot send relay_command`);
  }
}


wss.on('connection', (ws) => {
  //console.log('🔌 New WebSocket connection established');
  let device_uid = null;
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', async (message) => {
    try {
      const msg = JSON.parse(message.toString('utf8'));

      if (msg.type === 'auth') {
        if (msg.secret !== SECRET_KEY || !msg.device_code) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid auth' }));
          ws.close();
          return;
        }

        device_uid = msg.device_code;
        //console.log(`🔐 Auth requested by device: ${device_uid}`);

        const result = await db.query('SELECT * FROM devices WHERE device_uid = $1', [device_uid]);

        if (result.rows.length === 0) {
          await db.query(
            `INSERT INTO devices (device_uid, status, last_seen, created_at, updated_at) 
             VALUES ($1, true, NOW(), NOW(), NOW())`,
            [device_uid]
          );
         // console.log(`🆕 New device inserted: ${device_uid}`);
        } else {
          await db.query(
            `UPDATE devices 
             SET status = true, last_seen = NOW(), updated_at = NOW() 
             WHERE device_uid = $1`,
            [device_uid]
          );
         // console.log(`♻️ Existing device updated: ${device_uid}`);
        }

        await createRelaysForDevice(device_uid);

        connectedClients[device_uid] = ws;
        ws.send(JSON.stringify({ type: 'auth_ok', message: '✅ Authenticated' }));

        broadcastDeviceUpdate();
      } 
      
      else if (msg.type === 'relay_update') {
        if (!msg.relay_uid || typeof msg.status !== 'boolean') {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid relay update' }));
          return;
        }

        //console.log(`📥 Relay Update Received → UID: ${msg.relay_uid}, Status: ${msg.status}`);

        await db.query(
          `UPDATE relays 
           SET relay_status = $1, updated_at = NOW() 
           WHERE relay_uid = $2`,
          [msg.status, msg.relay_uid]
        );

       // console.log(`✅ Relay ${msg.relay_uid} updated in database`);

        broadcastDeviceUpdate();

        // Notify the device to update relay physical state
        notifyDeviceRelayUpdate(msg.relay_uid);
      } 
      
      else if (msg.type === 'relay_status_report' && Array.isArray(msg.states)) {
        if (!device_uid) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

       // console.log(`📥 Received relay_status_report from ${device_uid}`);

        const updates = msg.states.map(({ relay_uid, status }) => {
          if (typeof relay_uid !== 'string' || typeof status !== 'boolean') return null;

          return db.query(
            `UPDATE relays SET relay_status = $1, updated_at = NOW() WHERE relay_uid = $2`,
            [status, relay_uid]
          ).then(() => {
            //console.log(`✅ Synced ${relay_uid} → ${status}`);
          }).catch(err => {
            console.error(`❌ Failed to update ${relay_uid}:`, err);
          });
        }).filter(Boolean);

        await Promise.all(updates);
        broadcastDeviceUpdate();
      }
    } catch (err) {
      console.error('❌ Message processing error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', async () => {
    if (device_uid) {
      try {
        await db.query(
          `UPDATE devices 
           SET status = false, last_seen = NOW(), updated_at = NOW() 
           WHERE device_uid = $1`,
          [device_uid]
        );
        delete connectedClients[device_uid];
       // console.log(`❌ Device disconnected: ${device_uid}`);
        broadcastDeviceUpdate();
      } catch (err) {
        console.error('❌ Close handler error:', err);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
  });
});

setInterval(() => {
  wss.clients.forEach(async (ws) => {
    if (!ws.isAlive) {
      const uid = Object.keys(connectedClients).find(k => connectedClients[k] === ws);
      if (uid) {
        try {
          await db.query(
            `UPDATE devices 
             SET status = false, last_seen = NOW(), updated_at = NOW() 
             WHERE device_uid = $1`,
            [uid]
          );
          delete connectedClients[uid];
         // console.log(`💔 Heartbeat timeout → device marked offline: ${uid}`);
          broadcastDeviceUpdate();
        } catch (err) {
          console.error('❌ Heartbeat DB update error:', err);
        }
        return ws.terminate();
      }
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, HEARTBEAT_INTERVAL);


// ✅ Unified notify function (relay_uid or zone_id based)
const notifyDeviceRelayUpdate = async (identifier) => {
  try {
    let relays = [];

    if (typeof identifier === 'string' && identifier.includes('-')) {
      // Relay UID mode
      const res = await db.query(
        `SELECT device_uid, relay_uid, relay_status FROM relays WHERE relay_uid = $1`,
        [identifier]
      );
      relays = res.rows;
    } else if (typeof identifier === 'number') {
      // Zone ID mode
      const res = await db.query(
        `SELECT device_uid, relay_uid, relay_status FROM relays WHERE zone_id = $1`,
        [identifier]
      );
      relays = res.rows;
    } else {
      console.warn('⚠️ Invalid identifier passed to notifyDeviceRelayUpdate');
      return;
    }

    relays.forEach(({ device_uid, relay_uid, relay_status }) => {
      const ws = connectedClients[device_uid];
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'relay_command',
          relay_uid,
          status: relay_status
        }));
       // console.log(`📤 Sent relay update → ${relay_uid}: ${relay_status}`);
      } else {
        console.warn(`⚠️ Device ${device_uid} not connected; relay ${relay_uid} update skipped`);
      }
    });

  } catch (err) {
    console.error('❌ notifyDeviceRelayUpdate error:', err);
  }
};

module.exports = { 
  notifyDeviceRelayUpdate 
};
