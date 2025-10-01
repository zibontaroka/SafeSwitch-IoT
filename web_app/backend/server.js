// backend/server.js

const config = require('./config');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = config.PORT;

// Middleware Setup
app.use(cors({
  origin: config.CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
  secret: config.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' }
}));


// 📁 Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/pages', express.static(path.join(__dirname, '../pages')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/viewer', express.static(path.join(__dirname, '../viewer')));
app.use('/operator', express.static(path.join(__dirname, '../operator')));
app.use('/lineman', express.static(path.join(__dirname, '../lineman')));
app.use(express.static(path.join(__dirname, '..'))); // Serve root-level assets

// ✅ Import Routers
const devicesRouter = require('./routes/api');
const zonesRouter = require('./routes/zones');
const feedersRouter = require('./routes/feeders');
const relaysRouter = require('./routes/relays');
const authRoutes = require('./routes/auth');
const usersRouter = require('./routes/users');
const controlZonesRouter = require('./routes/control_zones');
const controlFeedersRouter = require('./routes/control_feeders');
const pinRouter = require('./routes/pin');
const revokeRoutes = require('./routes/revoke');
const publicZoneRouter = require('./routes/public_zones');
const dashboardRouter = require('./routes/dashboard');
const profileRouter = require('./routes/profile');



// 📡 API Routes
app.use('/api/devices', devicesRouter);
app.use('/api/relays', relaysRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/feeders', feedersRouter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRouter);
app.use('/api/pin', pinRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);

// 🔁 Control-related Routers
app.use('/api/control/feeders', controlFeedersRouter);
app.use('/api/control/zones', controlZonesRouter);
app.use('/api/control/revoke', revokeRoutes);

app.use('/api/public/zones', publicZoneRouter);

// 🏠 Serve Main Index File
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 🚫 Fallback 404
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

// 🚀 Start Backend Server
app.listen(PORT, () => {
    console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
