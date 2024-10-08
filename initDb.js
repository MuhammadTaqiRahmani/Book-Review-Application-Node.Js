// initDb.js

const { Request } = require('tedious');
const connection = require('./db');

// Function to create the Users table if it doesn't exist
function createTableIfNotExists(callback) {
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
      console.error('Error creating Users table:', err);
      return callback(err);
    }
    console.log('Users table is ready.');
    callback(); // Proceed to create Profiles table
  });

  connection.execSql(request);
}

// Function to create the Profiles table
function createProfilesTable(callback) {
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Profiles')
    BEGIN
      CREATE TABLE Profiles (
        id INT PRIMARY KEY,
        fullName NVARCHAR(100),
        dob DATE,
        country NVARCHAR(50),
        city NVARCHAR(50),
        address NVARCHAR(255),
        phoneNo NVARCHAR(15),
        bio NVARCHAR(MAX)
      );
    END
  `;

  const request = new Request(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating Profiles table:', err);
      return callback(err);
    }
    console.log('Profiles table checked/created successfully.');
    callback(); // Done with creating tables
  });

  connection.execSql(request);
}

// Export the functions
module.exports = {
  createTableIfNotExists,
  createProfilesTable,
};
