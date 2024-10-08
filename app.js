// // Project: Relay - User Authentication System
// // Developer: Muhammad Taqi Rahmani
// // GitHub: https://github.com/MuhammadTaqiRahmani/User-Authentication-System

const express = require('express');
const session = require('express-session');
const path = require('path');
const routes = require('./routes');  // Assuming this is your routes file

const app = express();

// Session middleware
app.use(session({
    secret: '4f6e5d6f51f93e0a9b7a2bc17e4b6f19e2f08a8d8ef3a6c6f3f7e2e7f6a8b9c4',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Body parser middleware to handle form submissions
app.use(express.urlencoded({ extended: true }));

// Static files middleware
app.use(express.static(path.join(__dirname)));

// Use the routes
app.use('/', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
});


