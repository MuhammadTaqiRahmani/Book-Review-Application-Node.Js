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

function checkUserProfileExists(userId, callback) {
  const request = new sql.Request();
  const query = `SELECT COUNT(*) AS count FROM Profiles WHERE userId = @userId`;
  request.input('userId', sql.Int, userId);
  
  request.query(query, (err, result) => {
      if (err) {
          console.error('Error checking profile existence:', err);
          callback(err, null);
          return;
      }

      const profileExists = result.recordset[0].count > 0;
      callback(null, profileExists);
  });
}


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
        
        // Call the function to check if the profile exists
        checkUserProfileExists(userId, (err, profileExists) => {
          if (err) {
            return res.status(500).send('Server error. Please try again later.');
          }
          
          // Redirect based on profile existence
          if (profileExists) {
            return res.redirect('/books'); // Redirect to /books if profile exists
          } else {
            return res.redirect('/profile'); // Redirect to /profile if profile doesn't exist
          }
        });
        
      } else {
        console.log('Password mismatch');
        return res.status(400).send('Invalid email or password');
      }
    }
  });

  connection.execSql(loginRequest);
});


function checkProfileExists(userId) {
  return new Promise((resolve, reject) => {
    const checkProfileQuery = `SELECT COUNT(*) AS count FROM Profiles WHERE id = @userId`;
    const request = new Request(checkProfileQuery, (err) => {
      if (err) {
        return reject(err);
      }
    });

    request.addParameter('userId', TYPES.NVarChar, userId);

    let profileExists = false;
    request.on('row', columns => {
      profileExists = columns[0].value > 0;
    });

    request.on('requestCompleted', () => resolve(profileExists));

    connection.execSql(request);
  });
}

function updateProfile(userId, profileData) {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE Profiles SET
      fullName = @fullName, dob = @dob, country = @country, city = @city,
      address = @address, phoneNo = @phoneNo, bio = @bio
      WHERE id = @userId
    `;

    const request = new Request(updateQuery, (err) => {
      if (err) return reject(err);
      resolve();
    });

    request.addParameter('fullName', TYPES.NVarChar, profileData.fullName);
    request.addParameter('dob', TYPES.NVarChar, profileData.dob);
    request.addParameter('country', TYPES.NVarChar, profileData.country);
    request.addParameter('city', TYPES.NVarChar, profileData.city);
    request.addParameter('address', TYPES.NVarChar, profileData.address);
    request.addParameter('phoneNo', TYPES.NVarChar, profileData.phoneNo);
    request.addParameter('bio', TYPES.NVarChar, profileData.bio);
    request.addParameter('userId', TYPES.NVarChar, userId);

    connection.execSql(request);
  });
}

function insertProfile(userId, profileData) {
  return new Promise((resolve, reject) => {
    const insertQuery = `
      INSERT INTO Profiles (id, fullName, dob, country, city, address, phoneNo, bio)
      VALUES (@userId, @fullName, @dob, @country, @city, @address, @phoneNo, @bio)
    `;

    const request = new Request(insertQuery, (err) => {
      if (err) return reject(err);
      resolve();
    });

    request.addParameter('fullName', TYPES.NVarChar, profileData.fullName);
    request.addParameter('dob', TYPES.NVarChar, profileData.dob);
    request.addParameter('country', TYPES.NVarChar, profileData.country);
    request.addParameter('city', TYPES.NVarChar, profileData.city);
    request.addParameter('address', TYPES.NVarChar, profileData.address);
    request.addParameter('phoneNo', TYPES.NVarChar, profileData.phoneNo);
    request.addParameter('bio', TYPES.NVarChar, profileData.bio);
    request.addParameter('userId', TYPES.NVarChar, userId);

    connection.execSql(request);
  });
}

router.post('/profile', async (req, res) => {
  try {
    const { fullName, dob, country, city, address, phoneNo, bio } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(400).send({ success: false, message: 'User not signed in.' });
    }

    const profileExists = await checkProfileExists(userId);

    if (profileExists) {
      await updateProfile(userId, { fullName, dob, country, city, address, phoneNo, bio });
      console.log('Profile updated successfully.');
    } else {
      await insertProfile(userId, { fullName, dob, country, city, address, phoneNo, bio });
      console.log('Profile saved successfully.');
    }

    return res.redirect('/books');

  } catch (err) {
    console.error('Error saving/updating profile data:', err);
    return res.status(500).send({ success: false, message: 'Server error. Please try again later.' });
  }
});



const isbnFilePath = path.join(__dirname, 'isbn.json');

// List of books with their titles and authors
const books = [
  { title: "Brand Guideline", author: "Joseph", isbn: "ISBN-001",date: "19 Dec, 2023", imagePath: "https://img.freepik.com/free-vector/flat-design-brand-manual-brochure_23-2149896309.jpg?t=st=1728385600~exp=1728389200~hmac=febde2f1169654d4a66d52123ea7536bb59af9b3ae10633f7d2bf758998ff36a&w=826" },
  { title: "Create your own business", author: "John", isbn: "ISBN-002",date: "12 Nov, 2023", imagePath: "https://img.freepik.com/free-vector/business-book-cover-template_23-2148716902.jpg" },
  { title: "Create your own business", author: "Alex", isbn: "ISBN-003",date: "20 Feb, 2024", imagePath: "https://img.freepik.com/free-vector/minimalist-book-cover-template_23-2148899519.jpg?t=st=1728385650~exp=1728389250~hmac=22684355349b00cf8e76a05989a3796eda64571b2f2073729088a6f53d6558a8&w=826" },
  { title: "Tribute to the fallen", author: "Vegus", isbn: "ISBN-004",date: "04 Jan, 2023", imagePath: "https://img.freepik.com/free-psd/memorial-day-flyer-template-concept_23-2148559526.jpg?t=st=1728386106~exp=1728389706~hmac=30a0d62f05a7deb9ead24b52131efce3baceeba1a93980c8f61a6e1eabed4c61&w=826" },
  { title: "Mathematics", author: "Merlin", isbn: "ISBN-005",date: "20 Dec, 2023", imagePath: "https://img.freepik.com/premium-photo/book-with-word-math-written-it_1032785-22604.jpg?w=826" },
  { title: "Heroes in Battle", author: "John", isbn: "ISBN-006",date: "02 Mar, 2024", imagePath: "https://img.freepik.com/free-vector/movie-poster-template-design_742173-20510.jpg?t=st=1728386187~exp=1728389787~hmac=b51c45c9663c1cbcaf2b98447918f3974aa9614174098f33bfe38a7f93bc0322&w=826" },
  { title: "The success grower", author: "Merlin", isbn: "ISBN-007",date: "19 Dec, 2023", imagePath: "https://img.freepik.com/premium-vector/creative-annual-book-cover-design-template-your-business_691378-275.jpg?w=826" },
  { title: "You are my conference", author: "Alex", isbn: "ISBN-008",date: "12 Apr, 2023", imagePath: "https://img.freepik.com/free-vector/gradient-church-flyer-with-photo_23-2148963574.jpg?t=st=1728396629~exp=1728400229~hmac=56933e6f039a765459b86b4b65eb130baf4a4c362a69504a49d9e9f87e1cd029&w=826" },
  { title: "Achieve financial freedom", author: "Vegus", isbn: "ISBN-009",date: "13 May, 2024", imagePath: "https://img.freepik.com/premium-photo/achieve-financial-freedom-with-expert-guidance_639785-199568.jpg?w=826" },
  { title: "Nature", author: "Alex", isbn: "ISBN-010",date: "12 Feb, 2024", imagePath: "https://img.freepik.com/free-vector/nature-flyer_23-2148020965.jpg?t=st=1728397420~exp=1728401020~hmac=59763274be56123270e5b45fd144b9595fc3c4b8e63ba9614d339fb992a59670&w=826" },
  { title: "Science for you", author: "Merlin", isbn: "ISBN-011",date: "11 Nov, 2023", imagePath: "https://img.freepik.com/free-psd/science-festival-template-design_23-2150651055.jpg?t=st=1728396994~exp=1728400594~hmac=1f67facf18bbcd49169b56a6a223c80f080dff1a9dec9927eb4c762b22610c8f&w=826" },
  { title: "Halloween", author: "John", isbn: "ISBN-012",date: "11 Dec, 2023", imagePath: "https://img.freepik.com/free-vector/spooky-halloween-party-poster-with-flat-design_23-2147918149.jpg?t=st=1728396952~exp=1728400552~hmac=7b30f196ca1b34f5b341683f2ebf16179b417117737b7dd35c7708132118b4b6&w=826" },
  { title: "National day of Science", author: "Howard", isbn: "ISBN-013",date: "20 Nov, 2023", imagePath: "https://img.freepik.com/free-vector/flat-national-science-day-vertical-poster-template_23-2149259348.jpg?t=st=1728397727~exp=1728401327~hmac=664052745a2dddc21480f24e2d973ae325d833c2453179e0e43597af40351308&w=826" },
  { title: "Halloween Warrior", author: "Mike", isbn: "ISBN-014",date: "19 Mar, 2023", imagePath: "https://img.freepik.com/free-vector/halloween-party-brochure-night-forest_23-2147570860.jpg?t=st=1728396930~exp=1728400530~hmac=13de87f07811c80a682a213be9f3d15b2f50d81894d02ace8033589fbe0c438c&w=826" },
  { title: "Simplifying the Science", author: "Merlin", isbn: "ISBN-015",date: "09 Feb, 2023", imagePath: "https://img.freepik.com/free-psd/science-festival-template-design_23-2150651069.jpg?t=st=1728397388~exp=1728400988~hmac=c25783ec97b253b68b6ced4c84898305e1a44474854fb4d55452837c73ecceeb&w=826" },
  { title: "Saluting our heroes", author: "John", isbn: "ISBN-016",date: "19 Oct, 2023", imagePath: "https://img.freepik.com/free-psd/veteran-s-day-celebration-poster-template_23-2150849863.jpg?t=st=1728397942~exp=1728401542~hmac=4ef90cf307d2076032931138ba942c6a8ae2eecc92a7351686e89aefacffacf7&w=826" },
  { title: "Eternal Soldiers", author: "John", isbn: "ISBN-017",date: "24 Dec, 2023", imagePath: "https://img.freepik.com/free-vector/movie-poster-template-design_742173-20776.jpg?t=st=1728397848~exp=1728401448~hmac=d18c2cf099db213b1979903bb0a687e582ef63c2357bb03ae7fd340e478469b4&w=826" },
  { title: "Meta Human", author: "Alex", isbn: "ISBN-018",date: "16 Aug, 2023", imagePath: "https://img.freepik.com/premium-photo/book-with-womans-face-it-that-says-human-human_1032785-15927.jpg?w=826" },
  { title: "Cursed residence", author: "John", isbn: "ISBN-019",date: "03 Apr 2024", imagePath: "https://img.freepik.com/free-vector/realistic-horror-movie-poster-template_23-2149621949.jpg?t=st=1728398271~exp=1728401871~hmac=73cf3d3bab2d36d32c9f3a0be101faeb00739f815cf19dd96f94128cc1c297fb&w=826" },
  { title: "Spookie night", author: "John", isbn: "ISBN-020",date: "14 Apr, 2023", imagePath: "https://img.freepik.com/free-psd/grungy-happy-halloween-poster-template_23-2149660372.jpg?t=st=1728397889~exp=1728401489~hmac=9ab2f297422e72706ab3d09bbdf78a966008910783f184fe2527ef554124fd4c&w=826" },
  { title: "New Technology", author: "Joseph", isbn: "ISBN-021",date: "18 June, 2023", imagePath: "https://img.freepik.com/premium-vector/modern-vector-technology-flyer-template_589744-739.jpg?w=826" }
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
    isbn: generateISBN(),
    date: book.date,
    imagePath: book.imagePath,
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

      // Optionally display the book's date
      const datePlaceholder = `<p id="book-date">Date here</p>`;
      const dateHtml = `<p id="book-date">Published on: ${book.date}</p>`;
      htmlContent = htmlContent.replace(datePlaceholder, dateHtml);

      // Replace the image placeholder
      const imagePlaceholder = `<img src="image-path-here" alt="image" class="w-full transition group-hover:rotate-6 group-hover:scale-125">`;
      const imageHtml = `<img src="${book.imagePath}" alt="image" class="w-full transition group-hover:rotate-6 group-hover:scale-125">`;
      htmlContent = htmlContent.replace(imagePlaceholder, imageHtml);

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
