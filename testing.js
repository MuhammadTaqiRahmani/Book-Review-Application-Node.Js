const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { Connection, Request } = require('tedious');
const crypto = require('crypto'); // Require crypto for hashing
require('dotenv').config(); // Load environment variables

const app = express();
const hostname = '127.0.0.1';
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

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
    createTableIfNotExists(); // Create table when the connection is established
  }
});

connection.connect();

// Function to create the Users table if it doesn't exist
function createTableIfNotExists() {
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      Email NVARCHAR(255) UNIQUE NOT NULL,
      Password NVARCHAR(255) NOT NULL
    )
  `;

  const request = new Request(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Users table is ready.');
    }
  });

  connection.execSql(request);
}

const validEmailServices = [
    'gmail.com',
    'hotmail.com',
    'yahoo.com',
    'outlook.com',
    'aol.com',
    'icloud.com'
];

// Minimum password length
const minPasswordLength = 8;

// Function to hash a password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});


app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
  fs.readFile(path.join(__dirname, '404.html'), 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('<h1>404 Not Found</h1>');
    } else {
      res.status(404).send(data);
    }
  });
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
