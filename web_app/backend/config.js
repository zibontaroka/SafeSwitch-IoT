require('dotenv').config({ path: './.env' });

const config = {
  PORT: parseInt(process.env.PORT) || 3000,
  WS_PORT: parseInt(process.env.WS_PORT) || 3010,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:4000',

  SECRET_KEY: process.env.SECRET_KEY || 'default-secret',
  JWT_SECRET: process.env.JWT_SECRET || 'default-jwt',

  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'powergrid',
  }
};

module.exports = config;
