// // Project: Relay - Book Review Application
// Developer: Muhammad Taqi Rahmani
// GitHub: https://github.com/MuhammadTaqiRahmani/User-Authentication-System

// db.js
const { Connection } = require('tedious');
require('dotenv').config();

// Configuration for database connection
const config = {
  server: process.env.DB_SERVER,
  authentication: {
    type: 'ntlm',
    options: {
      domain: '',
      userName: process.env.USER_NAME,
      password: process.env.PASSWORD,
    }
  },
  options: {
    encrypt: true,
    database: process.env.DB_DATABASE,
    trustServerCertificate: true,
  }
};

const connection = new Connection(config);

connection.on('connect', err => {
  if (err) {
    console.error('Connection failed:', err);
  } else {
    console.log('Connected to the database.');
    connection.emit('connected');
  }
});

connection.connect();

module.exports = connection;
