// app.js

const express = require('express');
const session = require('express-session');
const path = require('path');
const routes = require('./routes');
const { createTableIfNotExists, createProfilesTable } = require('./initDb');  // Import initDb
const connection = require('./db');  // Import the database connection

const app = express();

// Session middleware
app.use(session({
    secret: '4f6e5d6f51f93e0a9b7a2bc17e4b6f19e2f08a8d8ef3a6c6f3f7e2e7f6a8b9c4',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Body parser middleware to handle form submissions
app.use(express.urlencoded({ extended: true }));

// Static files middleware
app.use(express.static(path.join(__dirname)));

// Establish a connection and create the tables
connection.on('connect', (err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to the database.');
        // First create the Users table, then the Profiles table
        createTableIfNotExists((err) => {
            if (err) return console.error('Failed to create Users table.');
            createProfilesTable((err) => {
                if (err) return console.error('Failed to create Profiles table.');
            });
        });
    }
});

// Use the routes
app.use('/', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
