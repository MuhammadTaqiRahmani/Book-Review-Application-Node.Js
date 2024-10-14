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


// -----------------------------------


  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const checkUserQuery = `SELECT id FROM Users WHERE email = '${email}' AND password = '${password}'`; // Assuming password is not hashed (you should hash passwords)
    
    const request = new Request(checkUserQuery, (err) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).send({ success: false, message: 'Server error. Please try again later.' });
        }
    });

    let userId;

    request.on('row', columns => {
        userId = columns[0].value;
    });

    request.on('requestCompleted', () => {
        if (userId) {
            // Check if the user already has a profile
            const checkProfileQuery = `SELECT COUNT(*) AS count FROM Profiles WHERE id = '${userId}'`;

            const checkProfileRequest = new Request(checkProfileQuery, (err) => {
                if (err) {
                    console.error('Error checking profile existence:', err);
                    return res.status(500).send({ success: false, message: 'Server error. Please try again later.' });
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
                req.session.userId = userId;
                if (profileExists) {
                    // Redirect to main application page if profile exists
                    return res.redirect('/books');
                } else {
                    // Redirect to profile page if profile does not exist
                    return res.redirect('/profile');
                }
            });

            connection.execSql(checkProfileRequest);

        } else {
            return res.status(401).send({ success: false, message: 'Invalid login credentials.' });
        }
    });

    connection.execSql(request);
});
