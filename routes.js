// // Project: Relay - Book Review Application
// // Developer: Muhammad Taqi Rahmani
// // GitHub: https://github.com/MuhammadTaqiRahmani/User-Authentication-System

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Request } = require('tedious');
const crypto = require('crypto');
const connection = require('./db');
const { TYPES } = require('tedious'); // Ensure you have this import at the top of your file
const router = express.Router();
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Append the current timestamp to the file name
  }
});
const upload = multer({ storage: storage });

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

// Function to check for uppercase letters in an email
function containsUpperCase(str) {
  return /[A-Z]/.test(str);
}

// Routes
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

router.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'signin.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

router.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

router.post('/signup', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Check if the email contains uppercase letters
  if (containsUpperCase(email)) {
    console.log('Email contains uppercase letters');
    return res.status(400).send('Invalid email: Capital letters are not allowed');
  }

  // Extract domain from email
  const emailDomain = email.split('@')[1];
  console.log(`Signup attempt - Email: ${email}, Domain: ${emailDomain}`);

  // Check if the email domain is in the list of valid services
  if (!validEmailServices.includes(emailDomain)) {
    console.log('Invalid email service');
    return res.status(400).send('Invalid email: Email service is not supported');
  }

  // Check password length
  if (password.length < minPasswordLength) {
    console.log('Password too short');
    return res.status(400).send('Invalid password: Password must be at least 8 characters long');
  }

  // Hash the password using SHA-256
  const hashedPassword = hashPassword(password);
  console.log(`Hashed password: ${hashedPassword}`);

  const checkEmailQuery = `SELECT COUNT(*) AS count FROM Users WHERE Email = '${email}'`;
  console.log(`Query to check email existence: ${checkEmailQuery}`);

  const checkRequest = new Request(checkEmailQuery, (err) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).send('Server error. Please try again later.');
    }
  });

  let emailExists = false;

  checkRequest.on('row', columns => {
    console.log('Processing row:');
    columns.forEach(column => {
      console.log(`Column: ${column.metadata.colName}, Value: ${column.value}`);
      if (column.value > 0) {
        emailExists = true;
      }
    });
  });

  checkRequest.on('requestCompleted', () => {
    console.log(`Email exists: ${emailExists}`);
    if (emailExists) {
      console.log('Email already registered.');
      res.status(400).send('This email is already registered.');
    } else {
      const insertQuery = `INSERT INTO Users (Email, Password) VALUES ('${email}', '${hashedPassword}')`;
      console.log(`Query to insert new user: ${insertQuery}`);

      const insertRequest = new Request(insertQuery, (err) => {
        if (err) {
          if (err.code === 'EREQUEST' && err.number === 2627) { // Unique constraint violation
            console.error('Email already exists:', err);
            res.status(400).send('This email is already registered.');
          } else {
            console.error('Error inserting data:', err);
            res.status(500).send('Error saving data.');
          }
        } else {
          console.log('User registered successfully.');
          res.status(200).send('User registered successfully.');
        }
      });

      connection.execSql(insertRequest);
    }
  });

  connection.execSql(checkRequest);
});

router.post('/signin', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Extract domain from email
  const emailDomain = email.split('@')[1];
  console.log(`Signin attempt - Email: ${email}, Domain: ${emailDomain}`);

  // Check if the email domain is in the list of valid services
  if (!validEmailServices.includes(emailDomain)) {
    console.log('Invalid email service');
    return res.status(400).send('Invalid email: Email service is not supported');
  }

  const checkLoginQuery = `SELECT id, Password FROM Users WHERE Email = '${email}'`;
  console.log('Query:', checkLoginQuery);

  const loginRequest = new Request(checkLoginQuery, (err, rowCount) => {
    if (err) {
      console.error('Error checking login:', err);
      return res.status(500).send('Server error. Please try again later.');
    }

    if (rowCount === 0) {
      console.log('No matching email found');
      return res.status(400).send('Invalid email or password');
    }
  });

  let storedHashedPassword = null;
  let userId = null;

  loginRequest.on('row', columns => {
    columns.forEach(column => {
      if (column.metadata.colName === 'Password') {
        storedHashedPassword = column.value;
        console.log(`Retrieved stored hashed password: ${storedHashedPassword}`);
      } else if (column.metadata.colName === 'id') {
        userId = column.value;
        console.log(`Retrieved user ID: ${userId}`);
      }
    });
  });

  loginRequest.on('requestCompleted', () => {
    if (storedHashedPassword) {
      const hashedPassword = hashPassword(password);
      if (hashedPassword === storedHashedPassword) {
        console.log('Signin successful');
        req.session.userId = userId;  // Store user ID in the session
        return res.redirect('/profile');  // Redirect to profile page
      } else {
        console.log('Password mismatch');
        return res.status(400).send('Invalid email or password');
      }
    }
  });

  connection.execSql(loginRequest);
});

router.post('/profile', (req, res) => {
  const { fullName, dob, country, city, address, phoneNo, bio } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(400).send({ success: false, message: 'User not signed in.' });
  }

  // Check if the user already has a profile
  const checkProfileQuery = `SELECT COUNT(*) AS count FROM Profiles WHERE id = '${userId}'`;

  const checkRequest = new Request(checkProfileQuery, (err) => {
    if (err) {
      console.error('Error checking profile existence:', err);
      return res.status(500).send({ success: false, message: 'Server error. Please try again later.' });
    }
  });

  let profileExists = false;

  checkRequest.on('row', columns => {
    columns.forEach(column => {
      if (column.metadata.colName === 'count' && column.value > 0) {
        profileExists = true;
      }
    });
  });

  checkRequest.on('requestCompleted', () => {
    if (profileExists) {
      // Update profile
      const updateProfileQuery = `
        UPDATE Profiles 
        SET fullName = '${fullName}', dob = '${dob}', country = '${country}', city = '${city}', 
            address = '${address}', phoneNo = '${phoneNo}', bio = '${bio}'
        WHERE id = '${userId}'
      `;
      const updateRequest = new Request(updateProfileQuery, (err) => {
        if (err) {
          console.error('Error updating profile data:', err);
          return res.status(500).send({ success: false, message: 'Error updating profile data.' });
        } else {
          console.log('Profile updated successfully.');
          return res.redirect('/books');  // Redirect to /books after profile update
        }
      });
      connection.execSql(updateRequest);

    } else {
      // Insert profile
      const insertProfileQuery = `
        INSERT INTO Profiles (id, fullName, dob, country, city, address, phoneNo, bio)
        VALUES ('${userId}', '${fullName}', '${dob}', '${country}', '${city}', '${address}', '${phoneNo}', '${bio}')
      `;
      const insertRequest = new Request(insertProfileQuery, (err) => {
        if (err) {
          console.error('Error inserting profile data:', err);
          return res.status(500).send({ success: false, message: 'Error saving profile data.' });
        } else {
          console.log('Profile saved successfully.');
          return res.redirect('/books');  // Redirect to /books after profile creation
        }
      });
      connection.execSql(insertRequest);
    }
  });

  connection.execSql(checkRequest);
});

const isbnFilePath = path.join(__dirname, 'isbn.json');

// List of books with their titles and authors
const books = [
  { title: "Brand Guideline", author: "Joseph" },
  { title: "Create your own business", author: "John" },
  { title: "Create your own business", author: "Alex" },
  { title: "Tribute to the fallen", author: "Vegus" },
  { title: "Mathematics", author: "Merlin" },
  { title: "Heroes in Battle", author: "John" },
  { title: "The success grower", author: "Merlin" },
  { title: "You are my conference", author: "Alex" },
  { title: "Achieve financial freedom", author: "Vegus" },
  { title: "Nature", author: "Alex" },
  { title: "Science for you", author: "Merlin" },
  { title: "Halloween", author: "John" },
  { title: "National day of Science", author: "Howard" },
  { title: "Halloween Warrior", author: "Mike" },
  { title: "Simplifying the Science", author: "Merlin" },
  { title: "Saluting our heroes", author: "John" },
  { title: "Eternal Soldiers", author: "John" },
  { title: "Meta Human", author: "Alex" },
  { title: "Cursed residence", author: "John" },
  { title: "Spookie night", author: "John" },
  { title: "New Technology", author: "Joseph" }
];

// Function to generate a random ISBN
function generateISBN() {
  return Math.floor(Math.random() * 10000000000000).toString();
}

// Function to generate new ISBN data for all books and save to the JSON file
function generateAndSaveISBNs() {
  const bookIsbns = books.map(book => ({
    title: book.title,
    author: book.author,
    isbn: generateISBN()
  }));

  // Save the generated ISBNs to the file
  fs.writeFileSync(isbnFilePath, JSON.stringify({ books: bookIsbns }, null, 2));

  return bookIsbns;
}

// Function to load ISBNs from JSON file or regenerate if the file is empty or invalid
function loadOrGenerateISBNs() {
  let bookIsbns = [];

  if (fs.existsSync(isbnFilePath)) {
    // If the file exists, try to read and parse the ISBNs
    try {
      const data = fs.readFileSync(isbnFilePath, 'utf8');

      if (data) {
        const parsedData = JSON.parse(data);
        
        // If the parsed data is valid and contains books, return it
        if (parsedData && Array.isArray(parsedData.books)) {
          return parsedData.books;
        } else {
          throw new Error('Invalid JSON structure');
        }
      } else {
        // If the file is empty, throw an error to regenerate the data
        throw new Error('Empty JSON file');
      }
    } catch (error) {
      console.error("Error reading or parsing isbn.json:", error.message);
      // Generate new ISBNs if reading or parsing fails
      return generateAndSaveISBNs();
    }
  } else {
    // If the file doesn't exist, generate a new ISBN for each book
    return generateAndSaveISBNs();
  }
}

// Route to serve the books page with title, author, and ISBN injected
router.get('/books', (req, res) => {
  try {
    const books = loadOrGenerateISBNs(); // Load or generate ISBNs

    // Read the HTML file
    let htmlContent = fs.readFileSync(path.join(__dirname, 'books.html'), 'utf8');

    // Replace placeholders in the HTML with actual book data
    books.forEach((book) => {
      // Replace title and author placeholders with <title> ~ <author> format
      const titleAuthorPlaceholder = `<span id="book-title-author">title ~ author</span>`;
      const titleAuthorHtml = `<span id="book-title-author">${book.title} ~ ${book.author}</span>`;
      htmlContent = htmlContent.replace(titleAuthorPlaceholder, titleAuthorHtml);

      // Replace the ISBN placeholder
      const isbnPlaceholder = `<p id="isbn" class="isbn">isbn here</p>`;
      const isbnHtml = `<p id="isbn" class="isbn">${book.isbn}</p>`;
      htmlContent = htmlContent.replace(isbnPlaceholder, isbnHtml);
    });

    // Send the updated HTML content
    res.send(htmlContent);

  } catch (error) {
    console.error("Error handling the books route:", error.message);
    res.status(500).send('An error occurred while processing the books page.');
  }
});



router.get('/search', (req, res) => {
  const query = req.query.query.toLowerCase().trim();

  // Load ISBNs from the JSON file
  const books = loadOrGenerateISBNs();

  // Filter books based on the query (title, author, or ISBN)
  const results = books.filter(book => 
    book.title.toLowerCase().includes(query) ||
    book.author.toLowerCase().includes(query) ||
    book.isbn.includes(query)
  );

  // Respond with filtered results
  res.json(results);
});


router.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
  if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, filePath: filePath });
});



router.use((req, res) => {
  fs.readFile(path.join(__dirname, '404.html'), 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('<h1>404 Not Found</h1>');
    } else {
      res.status(404).send(data);
    }
  });
});

module.exports = router;
