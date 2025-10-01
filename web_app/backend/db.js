// backend/db.js

const { Pool } = require('pg');
const config = require('./config');
/*
console.log("📦 Database Config:");
console.log("  Host:", config.DB.host);
console.log("  Port:", config.DB.port);
console.log("  User:", config.DB.user);
console.log("  Password (type):", typeof config.DB.password);
console.log("  Password:", config.DB.password);
console.log("  Database:", config.DB.database);

*/

const pool = new Pool({
  host: config.DB.host,
  port: config.DB.port,
  user: config.DB.user,
  password: config.DB.password,
  database: config.DB.database,
});

module.exports = pool;
