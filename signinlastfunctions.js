// Function to check if a profile exists
function checkProfileExists(userId, callback) {
    const checkProfileQuery = `SELECT COUNT(*) AS count FROM Profiles WHERE id = '${userId}'`;
    
    const checkProfileRequest = new Request(checkProfileQuery, (err, rowCount) => {
      if (err) {
        console.error('Error checking profile existence:', err);
        return callback(err, null);
      }
    });
  
    let profileExists = false;
  
    checkProfileRequest.on('row', columns => {
      columns.forEach(column => {
        if (column.metadata.colName === 'count' && column.value > 0) {
          profileExists = true;
        }
      });
    });
  
    checkProfileRequest.on('requestCompleted', () => {
      callback(null, profileExists);
    });
  
    connection.execSql(checkProfileRequest);
  }
  
  // Function to handle user login
  function handleUserLogin(email, password, req, res) {
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
          req.session.userId = userId;
  
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session:', err);
              return res.status(500).send('Server error. Please try again later.');
            }
  
            // Check if the profile exists after session is saved
            checkProfileExists(userId, (err, profileExists) => {
              if (err) {
                return res.status(500).send('Server error. Please try again later.');
              }
  
              if (profileExists) {
                console.log('Profile exists, redirecting to /books');
                return res.redirect('/books');
              } else {
                console.log('No profile found, redirecting to /profile');
                return res.redirect('/profile');
              }
            });
          });
        } else {
          console.log('Password mismatch');
          return res.status(400).send('Invalid email or password');
        }
      }
    });
  
    connection.execSql(loginRequest);
  }
  
  // Signin route
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
  
    // Handle user login
    handleUserLogin(email, password, req, res);
  });
  
  
  